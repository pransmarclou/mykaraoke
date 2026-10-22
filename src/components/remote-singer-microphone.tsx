"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { parseRemoteMicSignalEvent, type RemoteMicCandidate, type RemoteMicSignalEvent, type RemoteMicSignalRequest } from "@/lib/microphone/remote-rules";
import type { PlaybackSong } from "@/lib/playback/state";

type ChannelState = "connecting" | "ready" | "unavailable";
type MicState = "idle" | "requesting" | "connecting" | "live" | "error";
type RealtimeConfig = { enabled: boolean; url?: string; key?: string; microphoneTopic?: string; iceServers?: RTCIceServer[] };

async function responseError(response: Response): Promise<string> {
  try { return ((await response.json()) as { error?: string }).error ?? "Please try again."; }
  catch { return "Please try again."; }
}

function serializeCandidate(candidate: RTCIceCandidate): RemoteMicCandidate {
  const value = candidate.toJSON();
  return {
    candidate: value.candidate ?? "",
    sdpMid: value.sdpMid ?? null,
    sdpMLineIndex: value.sdpMLineIndex ?? null,
    usernameFragment: value.usernameFragment ?? null,
  };
}

export function RemoteSingerMicrophone({ code, role, guestId, song }: {
  code: string;
  role: "host" | "guest";
  guestId: string;
  song: PlaybackSong;
}) {
  const [channelState, setChannelState] = useState<ChannelState>("connecting");
  const [micState, setMicState] = useState<MicState>("idle");
  const [message, setMessage] = useState("");
  const [selfMuted, setSelfMuted] = useState(false);
  const [hostMuted, setHostMuted] = useState(true);
  const [remoteStreamReady, setRemoteStreamReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<string | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingSessionRef = useRef<string | null>(null);
  const offerRetryRef = useRef<number | null>(null);
  const iceServersRef = useRef<RTCIceServer[]>([]);
  const selfMutedRef = useRef(false);
  const hostMutedRef = useRef(true);
  const activeRef = useRef(true);
  const signalHandlerRef = useRef<(event: RemoteMicSignalEvent) => void>(() => undefined);

  async function postSignal(signal: RemoteMicSignalRequest): Promise<void> {
    const response = await fetch(`/api/rooms/${code}/microphone/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signal),
    });
    if (!response.ok) throw new Error(await responseError(response));
  }

  function closePeer(stopLocalStream: boolean) {
    if (offerRetryRef.current !== null) {
      window.clearInterval(offerRetryRef.current);
      offerRetryRef.current = null;
    }
    const peer = peerRef.current;
    peerRef.current = null;
    if (peer) {
      peer.onicecandidate = null;
      peer.ontrack = null;
      peer.onconnectionstatechange = null;
      peer.close();
    }
    if (stopLocalStream) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    const audio = audioRef.current;
    if (audio) audio.srcObject = null;
    pendingCandidatesRef.current = [];
    pendingSessionRef.current = null;
  }

  async function flushPendingCandidates(peer: RTCPeerConnection) {
    const candidates = pendingCandidatesRef.current.splice(0);
    for (const candidate of candidates) await peer.addIceCandidate(candidate);
  }

  async function addOrQueueCandidate(event: Extract<RemoteMicSignalEvent, { kind: "candidate" }>) {
    if (pendingSessionRef.current && pendingSessionRef.current !== event.sessionId) pendingCandidatesRef.current = [];
    pendingSessionRef.current = event.sessionId;
    const peer = peerRef.current;
    if (!peer || sessionRef.current !== event.sessionId || !peer.remoteDescription) {
      pendingCandidatesRef.current.push(event.candidate);
      return;
    }
    await peer.addIceCandidate(event.candidate);
  }

  function applyGuestTrackState() {
    const enabled = !selfMutedRef.current && !hostMutedRef.current;
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = enabled; });
  }

  useEffect(() => {
    activeRef.current = true;
    let realtimeClient: SupabaseClient | undefined;
    let realtimeChannel: RealtimeChannel | undefined;
    let retryTimer: number | undefined;
    let retryCount = 0;
    let connecting = false;

    function scheduleRetry() {
      if (!activeRef.current || retryTimer !== undefined) return;
      setChannelState("connecting");
      const delay = Math.min(15_000, 1_000 * 2 ** Math.min(retryCount++, 4));
      retryTimer = window.setTimeout(() => { retryTimer = undefined; void subscribe(); }, delay);
    }

    async function subscribe() {
      if (!activeRef.current || connecting || realtimeChannel) return;
      connecting = true;
      try {
        const response = await fetch(`/api/rooms/${code}/queue/realtime`, { cache: "no-store" });
        if (!response.ok) throw new Error("Microphone connection is unavailable.");
        const config = await response.json() as RealtimeConfig;
        if (!activeRef.current) return;
        if (!config.enabled || !config.url || !config.key || !config.microphoneTopic) {
          setChannelState("unavailable");
          setMessage("Live microphone signaling is not configured for this room.");
          return;
        }
        iceServersRef.current = config.iceServers ?? [];
        const client = createClient(config.url, config.key, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: `mk-mic-${code}-${crypto.randomUUID()}` },
        });
        await client.realtime.setAuth(config.key);
        if (!activeRef.current) { void client.realtime.disconnect(); return; }
        const channel = client.channel(config.microphoneTopic, { config: { private: true } })
          .on("broadcast", { event: "microphone_signal" }, ({ payload }) => {
            const event = parseRemoteMicSignalEvent(payload);
            if (event && event.itemId === song.id && event.guestId === guestId && event.from !== role) signalHandlerRef.current(event);
          })
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              retryCount = 0;
              setChannelState("ready");
            } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status) && realtimeChannel === channel) {
              realtimeChannel = undefined;
              realtimeClient = undefined;
              setChannelState("unavailable");
              void client.removeChannel(channel);
              void client.realtime.disconnect();
              scheduleRetry();
            }
          });
        realtimeClient = client;
        realtimeChannel = channel;
      } catch {
        if (activeRef.current) {
          setChannelState("unavailable");
          setMessage("Microphone connection was interrupted. Reconnecting…");
          scheduleRetry();
        }
      } finally {
        connecting = false;
      }
    }

    void subscribe();
    return () => {
      activeRef.current = false;
      if (retryTimer) window.clearTimeout(retryTimer);
      const client = realtimeClient;
      const channel = realtimeChannel;
      if (client && channel) {
        void client.removeChannel(channel);
        void client.realtime.disconnect();
      }
      closePeer(true);
    };
    // The component is keyed by song and guest in PlaybackDashboard, so this
    // subscription owns exactly one ephemeral microphone session.
  }, [code, guestId, role, song.id]);

  useEffect(() => {
    signalHandlerRef.current = (event) => {
      void (async () => {
        try {
          if (role === "guest") {
            if (event.sessionId !== sessionRef.current) return;
            if (event.kind === "answer") {
              const peer = peerRef.current;
              if (!peer) return;
              if (peer.remoteDescription?.type === "answer") return;
              await peer.setRemoteDescription(event.description);
              if (offerRetryRef.current !== null) {
                window.clearInterval(offerRetryRef.current);
                offerRetryRef.current = null;
              }
              await flushPendingCandidates(peer);
              setMicState(peer.connectionState === "connected" ? "live" : "connecting");
            } else if (event.kind === "candidate") {
              await addOrQueueCandidate(event);
            } else if (event.kind === "host-mute") {
              hostMutedRef.current = event.muted;
              setHostMuted(event.muted);
              applyGuestTrackState();
              setMessage(event.muted ? "The host muted your microphone." : "The host unmuted your microphone.");
            }
            return;
          }

          if (event.kind === "guest-stop") {
            if (event.sessionId !== sessionRef.current) return;
            closePeer(false);
            sessionRef.current = null;
            hostMutedRef.current = true;
            setHostMuted(true);
            setRemoteStreamReady(false);
            setMicState("idle");
            setMessage(`${song.singerName} stopped sharing their microphone.`);
            return;
          }
          if (event.kind === "candidate") {
            await addOrQueueCandidate(event);
            return;
          }
          if (event.kind !== "offer") return;

          const existingAnswer = sessionRef.current === event.sessionId ? peerRef.current?.localDescription : null;
          if (existingAnswer?.type === "answer" && existingAnswer.sdp) {
            await postSignal({ kind: "answer", itemId: song.id, sessionId: event.sessionId, guestId, description: { type: "answer", sdp: existingAnswer.sdp } });
            await postSignal({ kind: "host-mute", itemId: song.id, sessionId: event.sessionId, guestId, muted: hostMutedRef.current });
            return;
          }

          const queuedCandidates = pendingSessionRef.current === event.sessionId ? [...pendingCandidatesRef.current] : [];
          closePeer(false);
          pendingCandidatesRef.current = queuedCandidates;
          pendingSessionRef.current = event.sessionId;
          sessionRef.current = event.sessionId;
          hostMutedRef.current = true;
          setHostMuted(true);
          setRemoteStreamReady(false);
          setMicState("connecting");
          setMessage(`${song.singerName} enabled their phone microphone. Connecting…`);

          const peer = new RTCPeerConnection({ iceServers: iceServersRef.current });
          peerRef.current = peer;
          peer.onicecandidate = ({ candidate }) => {
            if (!candidate || sessionRef.current !== event.sessionId) return;
            void postSignal({ kind: "candidate", itemId: song.id, sessionId: event.sessionId, guestId, candidate: serializeCandidate(candidate) }).catch(() => setMessage("The microphone connection is unstable. Retrying may help."));
          };
          peer.ontrack = ({ streams }) => {
            const stream = streams[0];
            if (!stream || !audioRef.current) return;
            audioRef.current.srcObject = stream;
            audioRef.current.muted = hostMutedRef.current;
            setRemoteStreamReady(true);
            setMicState("live");
            setMessage("Singer microphone connected. It is muted until you choose to hear it.");
            void audioRef.current.play().catch(() => setMessage("Singer microphone connected. Use Unmute to start the audio."));
          };
          peer.onconnectionstatechange = () => {
            if (!activeRef.current || peerRef.current !== peer) return;
            if (peer.connectionState === "connected") setMicState("live");
            else if (["failed", "disconnected", "closed"].includes(peer.connectionState)) {
              setMicState(peer.connectionState === "closed" ? "idle" : "error");
              if (peer.connectionState !== "closed") setMessage("The singer microphone disconnected. Ask them to stop and enable it again.");
            }
          };
          await peer.setRemoteDescription(event.description);
          await flushPendingCandidates(peer);
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          await postSignal({ kind: "answer", itemId: song.id, sessionId: event.sessionId, guestId, description: { type: "answer", sdp: answer.sdp ?? "" } });
          await postSignal({ kind: "host-mute", itemId: song.id, sessionId: event.sessionId, guestId, muted: true });
        } catch (error) {
          if (!activeRef.current) return;
          setMicState("error");
          setMessage(error instanceof Error ? error.message : "The microphone connection failed.");
        }
      })();
    };
  });

  async function enableGuestMicrophone() {
    if (role !== "guest" || channelState !== "ready" || micState === "requesting" || micState === "connecting" || micState === "live") return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      setMicState("error");
      setMessage("This browser cannot share a microphone here. Use a current browser over HTTPS.");
      return;
    }
    setMicState("requesting");
    setMessage("Choose Allow when your browser asks for microphone access.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (!activeRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      closePeer(true);
      streamRef.current = stream;
      selfMutedRef.current = false;
      hostMutedRef.current = true;
      setSelfMuted(false);
      setHostMuted(true);
      applyGuestTrackState();
      const sessionId = crypto.randomUUID();
      sessionRef.current = sessionId;
      const peer = new RTCPeerConnection({ iceServers: iceServersRef.current });
      peerRef.current = peer;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      peer.onicecandidate = ({ candidate }) => {
        if (!candidate || sessionRef.current !== sessionId) return;
        void postSignal({ kind: "candidate", itemId: song.id, sessionId, candidate: serializeCandidate(candidate) }).catch(() => setMessage("The microphone connection is unstable. Stop and try again if it does not connect."));
      };
      peer.onconnectionstatechange = () => {
        if (!activeRef.current || peerRef.current !== peer) return;
        if (peer.connectionState === "connected") {
          setMicState("live");
          setMessage(hostMutedRef.current ? "Connected. Waiting for the host to unmute your microphone." : "Your microphone is live on the host device.");
        } else if (["failed", "disconnected"].includes(peer.connectionState)) {
          setMicState("error");
          setMessage("The microphone disconnected. Stop it, then try again.");
        }
      };
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await postSignal({ kind: "offer", itemId: song.id, sessionId, description: { type: "offer", sdp: offer.sdp ?? "" } });
      let offerRetries = 0;
      offerRetryRef.current = window.setInterval(() => {
        const activePeer = peerRef.current;
        const local = activePeer?.localDescription;
        if (!activePeer || sessionRef.current !== sessionId || activePeer.remoteDescription || !local?.sdp) return;
        offerRetries += 1;
        if (offerRetries > 5) {
          closePeer(true);
          sessionRef.current = null;
          setMicState("error");
          setMessage("The host did not connect. Make sure the host page is open, then try again.");
          return;
        }
        void postSignal({ kind: "offer", itemId: song.id, sessionId, description: { type: "offer", sdp: local.sdp } }).catch(() => undefined);
      }, 3_000);
      setMicState("connecting");
      setMessage("Microphone enabled. Waiting for the host device to connect and unmute it.");
    } catch (error) {
      closePeer(true);
      sessionRef.current = null;
      setMicState("error");
      setMessage(error instanceof DOMException && error.name === "NotAllowedError" ? "Microphone access was not allowed. Enable it in your browser settings and try again." : error instanceof Error ? error.message : "Could not enable this microphone.");
    }
  }

  function toggleGuestMute() {
    if (role !== "guest" || !streamRef.current) return;
    const next = !selfMutedRef.current;
    selfMutedRef.current = next;
    setSelfMuted(next);
    applyGuestTrackState();
    setMessage(next ? "Your microphone is muted." : hostMutedRef.current ? "Your microphone is ready, but the host still has it muted." : "Your microphone is live on the host device.");
  }

  async function stopGuestMicrophone() {
    if (role !== "guest") return;
    const sessionId = sessionRef.current;
    if (sessionId) void postSignal({ kind: "guest-stop", itemId: song.id, sessionId }).catch(() => undefined);
    closePeer(true);
    sessionRef.current = null;
    selfMutedRef.current = false;
    hostMutedRef.current = true;
    setSelfMuted(false);
    setHostMuted(true);
    setMicState("idle");
    setMessage("Microphone sharing stopped.");
  }

  async function toggleHostMute() {
    if (role !== "host" || !sessionRef.current || !remoteStreamReady) return;
    const next = !hostMutedRef.current;
    const audio = audioRef.current;
    if (audio) {
      audio.muted = next;
      if (!next) await audio.play().catch(() => undefined);
    }
    hostMutedRef.current = next;
    setHostMuted(next);
    setMessage(next ? `You muted ${song.singerName}'s microphone.` : `You unmuted ${song.singerName}'s microphone.`);
    try {
      await postSignal({ kind: "host-mute", itemId: song.id, sessionId: sessionRef.current, guestId, muted: next });
    } catch (error) {
      setMessage(`${next ? "Muted" : "Unmuted"} on this host, but the singer phone did not receive the update. ${error instanceof Error ? error.message : ""}`.trim());
    }
  }

  return (
    <div className="mt-5 rounded-xl border border-[#ff8a55]/25 bg-[#ff8a55]/8 p-4" data-testid={`remote-mic-${role}`}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#ff8a55]/15 text-[#ffad69]">
          {role === "host" ? <Volume2 className="size-5" aria-hidden="true" /> : <Mic className="size-5" aria-hidden="true" />}
        </span>
        <div>
          <p className="text-sm font-black text-white">{role === "host" ? "Singer phone microphone" : "Your singer microphone"}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {role === "host"
              ? `${song.singerName} added this song. Their phone microphone starts muted on this host.`
              : "You added the current song, so you can send your voice directly to the host device. Audio is not recorded or stored."}
          </p>
        </div>
      </div>

      {role === "guest" ? <div className="mt-4 flex flex-wrap gap-2">
        {micState === "idle" || micState === "error" ? <button type="button" className="queue-action" disabled={channelState !== "ready"} onClick={() => void enableGuestMicrophone()}><Mic className="size-4" aria-hidden="true" />Enable my microphone</button> : <>
          <button type="button" className="queue-action" onClick={toggleGuestMute}>{selfMuted ? <Mic className="size-4" aria-hidden="true" /> : <MicOff className="size-4" aria-hidden="true" />}{selfMuted ? "Unmute my mic" : "Mute my mic"}</button>
          <button type="button" className="queue-action" onClick={() => void stopGuestMicrophone()}>Stop microphone</button>
        </>}
      </div> : <div className="mt-4">
        <button type="button" className="queue-action" disabled={!remoteStreamReady || micState === "error"} onClick={() => void toggleHostMute()}>
          {hostMuted ? <Volume2 className="size-4" aria-hidden="true" /> : <VolumeX className="size-4" aria-hidden="true" />}
          {hostMuted ? "Unmute singer mic" : "Mute singer mic"}
        </button>
        <audio ref={audioRef} autoPlay playsInline aria-label={`${song.singerName} phone microphone`} />
      </div>}

      <p role="status" className="mt-3 text-xs text-[#ffc16f]">
        {message || (channelState === "connecting" ? "Connecting secure room signaling…" : role === "host" ? `Waiting for ${song.singerName} to enable their microphone.` : "Microphone is off until you enable it.")}
      </p>
    </div>
  );
}
