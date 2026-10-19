"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { AudioLines, Headphones, Mic2, MicOff, RefreshCw, ShieldCheck, Volume2, VolumeX } from "lucide-react";
import {
  MICROPHONE_LIMITS,
  clampMicrophoneParameter,
  detectMicrophoneCapability,
  microphoneErrorEvent,
  microphoneTransition,
  type MicrophoneCapability,
} from "@/lib/microphone/rules";

type AudioContextWithSink = AudioContext & { setSinkId?: (sinkId: string) => Promise<void> };

interface AudioGraph {
  context: AudioContextWithSink;
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  input: GainNode;
  analyser: AnalyserNode;
  compressor: DynamicsCompressorNode;
  dry: GainNode;
  reverb: ConvolverNode;
  wet: GainNode;
  output: GainNode;
  track: MediaStreamTrack;
  trackEnded: () => void;
}

const initialCapability: MicrophoneCapability = {
  secureContext: true,
  mediaDevices: true,
  audioContext: true,
  outputSelection: false,
  supported: true,
  reason: null,
};

function createReverbImpulse(context: AudioContext) {
  const durationSeconds = 1.2;
  const frameCount = Math.floor(context.sampleRate * durationSeconds);
  const impulse = context.createBuffer(2, frameCount, context.sampleRate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const samples = impulse.getChannelData(channel);
    for (let frame = 0; frame < frameCount; frame += 1) {
      const decay = Math.pow(1 - frame / frameCount, 2.6);
      samples[frame] = (Math.random() * 2 - 1) * decay;
    }
  }
  return impulse;
}

function deviceLabel(device: MediaDeviceInfo, index: number) {
  return device.label || `Microphone ${index + 1}`;
}

export function MicrophoneStudio() {
  const [status, dispatch] = useReducer(microphoneTransition, "idle");
  const [capability, setCapability] = useState(initialCapability);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [inputGain, setInputGain] = useState(1);
  const [outputVolume, setOutputVolume] = useState(0.8);
  const [reverbMix, setReverbMix] = useState(0.18);
  const [compression, setCompression] = useState(false);
  const [muted, setMuted] = useState(false);
  const [level, setLevel] = useState(0);
  const [detail, setDetail] = useState("");
  const graphRef = useRef<AudioGraph | null>(null);
  const monitoringRef = useRef(false);

  const applyOutput = useCallback((graph: AudioGraph | null, nextMuted = muted, nextVolume = outputVolume) => {
    if (!graph) return;
    graph.output.gain.value = monitoringRef.current && !nextMuted
      ? clampMicrophoneParameter(nextVolume, MICROPHONE_LIMITS.outputVolume.min, MICROPHONE_LIMITS.outputVolume.max)
      : 0;
  }, [muted, outputVolume]);

  const disposeGraph = useCallback(async () => {
    const graph = graphRef.current;
    graphRef.current = null;
    monitoringRef.current = false;
    if (!graph) return;
    graph.track.removeEventListener("ended", graph.trackEnded);
    graph.stream.getTracks().forEach((track) => track.stop());
    graph.source.disconnect();
    graph.output.disconnect();
    if (graph.context.state !== "closed") await graph.context.close();
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const inputs = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "audioinput");
    setDevices(inputs);
    return inputs;
  }, []);

  const startCapture = useCallback(async (deviceId?: string) => {
    setDetail("");
    dispatch("request");
    await disposeGraph();
    let pendingStream: MediaStream | null = null;
    let pendingContext: AudioContextWithSink | null = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        video: false,
      });
      pendingStream = stream;
      const track = stream.getAudioTracks()[0];
      if (!track) {
        stream.getTracks().forEach((item) => item.stop());
        dispatch("missing");
        return;
      }

      const AudioContextConstructor = window.AudioContext;
      const context = new AudioContextConstructor() as AudioContextWithSink;
      pendingContext = context;
      const source = context.createMediaStreamSource(stream);
      const input = context.createGain();
      const analyser = context.createAnalyser();
      const compressor = context.createDynamicsCompressor();
      const dry = context.createGain();
      const reverb = context.createConvolver();
      const wet = context.createGain();
      const output = context.createGain();
      analyser.fftSize = 1024;
      input.gain.value = inputGain;
      compressor.threshold.value = compression ? -24 : 0;
      compressor.ratio.value = compression ? 4 : 1;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      reverb.buffer = createReverbImpulse(context);
      dry.gain.value = 1 - reverbMix;
      wet.gain.value = reverbMix;
      output.gain.value = 0;

      source.connect(input);
      input.connect(analyser);
      analyser.connect(compressor);
      compressor.connect(dry);
      compressor.connect(reverb);
      dry.connect(output);
      reverb.connect(wet);
      wet.connect(output);
      output.connect(context.destination);

      const trackEnded = () => {
        monitoringRef.current = false;
        setLevel(0);
        setDetail("The selected microphone stopped or was unplugged. Reconnect it, then try again.");
        dispatch("disconnect");
      };
      track.addEventListener("ended", trackEnded);
      const graph: AudioGraph = { context, stream, source, input, analyser, compressor, dry, reverb, wet, output, track, trackEnded };
      graphRef.current = graph;
      pendingStream = null;
      pendingContext = null;
      context.onstatechange = () => {
        if (context.state === "suspended" && monitoringRef.current) {
          applyOutput(graph, muted, outputVolume);
          dispatch("suspend");
        }
      };

      const availableDevices = await refreshDevices();
      const activeDevice = track.getSettings().deviceId || deviceId || availableDevices[0]?.deviceId || "";
      setSelectedDevice(activeDevice);
      dispatch("grant");
    } catch (error) {
      pendingStream?.getTracks().forEach((track) => track.stop());
      if (pendingContext && pendingContext.state !== "closed") await pendingContext.close();
      const name = error instanceof DOMException || error instanceof Error ? error.name : "UnknownError";
      dispatch(microphoneErrorEvent(name));
      setDetail(name === "NotReadableError"
        ? "The microphone is busy in another app or could not be opened. Close the other app and retry."
        : "Microphone setup could not be completed. Check browser and system audio settings, then retry.");
    }
  }, [applyOutput, compression, disposeGraph, inputGain, muted, outputVolume, refreshDevices, reverbMix]);

  useEffect(() => {
    const audioContext = typeof window !== "undefined" && typeof window.AudioContext === "function";
    const outputSelection = audioContext && "setSinkId" in window.AudioContext.prototype;
    const next = detectMicrophoneCapability({
      secureContext: window.isSecureContext,
      mediaDevices: Boolean(navigator.mediaDevices),
      audioContext,
      outputSelection,
    });
    // Capability values only exist after the Client Component reaches the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCapability(next);
    if (!next.supported) dispatch("unsupported");
  }, []);

  useEffect(() => {
    if (!navigator.mediaDevices) return;
    const onDeviceChange = async () => {
      const available = await refreshDevices();
      const graph = graphRef.current;
      const activeId = graph?.track.getSettings().deviceId;
      if (graph && activeId && !available.some((device) => device.deviceId === activeId)) {
        graph.track.dispatchEvent(new Event("ended"));
      }
    };
    navigator.mediaDevices.addEventListener("devicechange", onDeviceChange);
    return () => navigator.mediaDevices.removeEventListener("devicechange", onDeviceChange);
  }, [refreshDevices]);

  useEffect(() => () => { void disposeGraph(); }, [disposeGraph]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !["ready", "monitoring", "suspended"].includes(status)) return;
    const samples = new Float32Array(graph.analyser.fftSize);
    let frame = 0;
    let lastUpdate = 0;
    const readLevel = (time: number) => {
      graph.analyser.getFloatTimeDomainData(samples);
      if (time - lastUpdate >= 80) {
        let sum = 0;
        for (const sample of samples) sum += sample * sample;
        setLevel(Math.min(1, Math.sqrt(sum / samples.length) * 4));
        lastUpdate = time;
      }
      frame = requestAnimationFrame(readLevel);
    };
    frame = requestAnimationFrame(readLevel);
    return () => cancelAnimationFrame(frame);
  }, [status]);

  function updateInputGain(value: number) {
    const next = clampMicrophoneParameter(value, MICROPHONE_LIMITS.inputGain.min, MICROPHONE_LIMITS.inputGain.max);
    setInputGain(next);
    if (graphRef.current) graphRef.current.input.gain.value = next;
  }

  function updateOutputVolume(value: number) {
    const next = clampMicrophoneParameter(value, MICROPHONE_LIMITS.outputVolume.min, MICROPHONE_LIMITS.outputVolume.max);
    setOutputVolume(next);
    applyOutput(graphRef.current, muted, next);
  }

  function updateReverb(value: number) {
    const next = clampMicrophoneParameter(value, MICROPHONE_LIMITS.reverbMix.min, MICROPHONE_LIMITS.reverbMix.max);
    setReverbMix(next);
    if (graphRef.current) {
      graphRef.current.dry.gain.value = 1 - next;
      graphRef.current.wet.gain.value = next;
    }
  }

  function updateCompression(enabled: boolean) {
    setCompression(enabled);
    if (graphRef.current) {
      graphRef.current.compressor.threshold.value = enabled ? -24 : 0;
      graphRef.current.compressor.ratio.value = enabled ? 4 : 1;
    }
  }

  async function toggleMonitoring() {
    const graph = graphRef.current;
    if (!graph) return;
    if (monitoringRef.current) {
      monitoringRef.current = false;
      applyOutput(graph);
      dispatch("stop-monitor");
      return;
    }
    await graph.context.resume();
    if (graph.context.state !== "running") {
      dispatch("suspend");
      return;
    }
    monitoringRef.current = true;
    applyOutput(graph);
    dispatch("monitor");
  }

  async function resumeMonitoring() {
    const graph = graphRef.current;
    if (!graph) return;
    monitoringRef.current = true;
    await graph.context.resume();
    if (graph.context.state === "running") {
      applyOutput(graph);
      dispatch("resume");
    }
  }

  const active = ["ready", "monitoring", "suspended"].includes(status);
  const statusLabel = {
    idle: "Not connected",
    requesting: "Waiting for permission",
    ready: "Mic ready · monitor off",
    monitoring: "Monitoring locally",
    denied: "Permission denied",
    "no-device": "No microphone found",
    disconnected: "Microphone disconnected",
    suspended: "Audio paused by browser",
    error: "Microphone unavailable",
    unsupported: "Unsupported here",
  }[status];

  return (
    <section className="feature-panel rounded-[1.75rem] p-6 sm:p-8" aria-labelledby="microphone-studio-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-[#ffad69]"><Mic2 className="size-5" aria-hidden="true" /></span>
          <div><h2 id="microphone-studio-title" className="text-xl font-black tracking-tight">Microphone Studio</h2><p className="text-sm text-muted-foreground">Local voice monitoring, separate from YouTube playback</p></div>
        </div>
        <span data-testid="microphone-status" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-[#ffc16f]">{statusLabel}</span>
      </div>

      <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#ffad69]" aria-hidden="true" />Your microphone audio stays in this browser. MyKaraoke does not upload or record it.</p>

      {status === "unsupported" ? <p role="alert" className="mt-5 text-sm leading-6 text-[#ffb0a2]">{capability.reason === "insecure" ? "Microphone access requires HTTPS or localhost." : capability.reason === "media-devices" ? "This browser does not expose microphone capture." : "This browser does not support the Web Audio features used by Microphone Studio."}</p> : null}
      {status === "denied" ? <p role="alert" className="mt-5 text-sm leading-6 text-[#ffb0a2]">Microphone permission was denied. Allow microphone access in this site&apos;s browser settings, then retry.</p> : null}
      {status === "no-device" ? <p role="alert" className="mt-5 text-sm leading-6 text-[#ffb0a2]">No browser-visible microphone was found. Connect or enable an input, then retry.</p> : null}
      {status === "disconnected" ? <p role="alert" className="mt-5 text-sm leading-6 text-[#ffb0a2]">{detail || "The selected microphone disconnected."}</p> : null}
      {status === "error" ? <p role="alert" className="mt-5 text-sm leading-6 text-[#ffb0a2]">{detail}</p> : null}

      {!active && status !== "unsupported" ? <button type="button" disabled={status === "requesting"} onClick={() => void startCapture(selectedDevice || undefined)} className="queue-action mt-5"><RefreshCw className={`size-4 ${status === "requesting" ? "animate-spin" : ""}`} aria-hidden="true" />{status === "idle" ? "Enable microphone" : status === "requesting" ? "Requesting permission…" : "Retry microphone"}</button> : null}

      {active ? <div className="mt-6 space-y-6">
        <div>
          <label htmlFor="microphone-input" className="text-sm font-bold text-white">Input device</label>
          <select id="microphone-input" value={selectedDevice} onChange={(event) => { const value = event.target.value; setSelectedDevice(value); void startCapture(value); }} className="mt-2 h-11 w-full rounded-xl border border-white/15 bg-[#17141f] px-3 text-sm text-white">
            {devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{deviceLabel(device, index)}</option>)}
          </select>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">USB and audio-interface inputs appear here only when your browser and operating system expose them.</p>
        </div>

        <div>
          <div className="flex items-center justify-between gap-4 text-sm"><span className="font-bold text-white">Input level</span><span className="text-muted-foreground">{Math.round(level * 100)}%</span></div>
          <div role="meter" aria-label="Microphone input level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)} className="mt-2 h-3 overflow-hidden rounded-full bg-black/35"><div data-testid="microphone-meter-fill" className="h-full rounded-full bg-gradient-to-r from-[#ffc247] via-[#ff6c44] to-[#f80077] transition-[width] duration-75" style={{ width: `${Math.max(2, level * 100)}%` }} /></div>
        </div>

        <label className="block text-sm font-bold text-white">Microphone gain · {Math.round(inputGain * 100)}%<input aria-label="Microphone gain" type="range" min="0" max="200" step="1" value={Math.round(inputGain * 100)} onChange={(event) => updateInputGain(Number(event.target.value) / 100)} className="mt-2 w-full accent-[#ff4d86]" /></label>
        <label className="block text-sm font-bold text-white">Monitor volume · {Math.round(outputVolume * 100)}%<input aria-label="Monitor volume" type="range" min="0" max="100" step="1" value={Math.round(outputVolume * 100)} onChange={(event) => updateOutputVolume(Number(event.target.value) / 100)} className="mt-2 w-full accent-[#ff4d86]" /></label>
        <label className="block text-sm font-bold text-white">Room reverb · {Math.round(reverbMix * 100)}%<input aria-label="Room reverb" type="range" min="0" max="60" step="1" value={Math.round(reverbMix * 100)} onChange={(event) => updateReverb(Number(event.target.value) / 100)} className="mt-2 w-full accent-[#ff4d86]" /></label>
        <label className="flex items-start gap-3 text-sm leading-6 text-white"><input type="checkbox" checked={compression} onChange={(event) => updateCompression(event.target.checked)} className="mt-1 size-4 accent-[#ff4d86]" /><span><strong>Voice compression</strong><span className="block text-xs text-muted-foreground">Softens loud peaks; it does not normalize YouTube audio.</span></span></label>

        <div className="rounded-xl border border-[#ffad69]/20 bg-[#ffad69]/5 p-4">
          <p className="flex items-start gap-2 text-sm font-bold text-[#ffd09b]"><Headphones className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Use headphones before starting the monitor.</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Speakers can create loud feedback. Wireless audio may add delay; judge latency on the actual device because MyKaraoke does not infer it from a device name.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {status === "suspended" ? <button type="button" onClick={() => void resumeMonitoring()} className="queue-action"><AudioLines className="size-4" aria-hidden="true" />Resume audio</button> : <button type="button" onClick={() => void toggleMonitoring()} className="queue-action">{status === "monitoring" ? <VolumeX className="size-4" aria-hidden="true" /> : <Volume2 className="size-4" aria-hidden="true" />}{status === "monitoring" ? "Stop monitoring" : "Start monitoring"}</button>}
            <button type="button" aria-pressed={muted} onClick={() => { const next = !muted; setMuted(next); applyOutput(graphRef.current, next, outputVolume); }} className="queue-action">{muted ? <MicOff className="size-4" aria-hidden="true" /> : <Mic2 className="size-4" aria-hidden="true" />}{muted ? "Unmute mic" : "Mute mic"}</button>
          </div>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">Output follows the system default. {capability.outputSelection ? "This browser reports output-routing support, but per-device routing is not enabled in this phase." : "This browser does not expose per-device output selection here."}</p>
      </div> : null}
    </section>
  );
}
