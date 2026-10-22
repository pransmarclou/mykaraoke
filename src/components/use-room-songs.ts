"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createClient, type SupabaseClient, type RealtimeChannel } from "@supabase/supabase-js";
import {
  favoriteFromSong,
  parseSongFavorites,
  serializeSongFavorites,
  SONG_FAVORITES_STORAGE_KEY,
  toggleSongFavorite,
  type FavoriteSong,
} from "@/lib/songs/favorites";
import { DEFAULT_GUEST_PERMISSIONS, GUEST_PERMISSIONS, type GuestPermission } from "@/lib/permissions/rules";
import { parsePartyNotification, type PartyNotification } from "@/lib/rooms/notification-rules";
import type { QueueAddSnapshot, QueueSnapshot } from "@/lib/songs/queue";
import type { SongResult } from "@/lib/songs/youtube";
import { applyPartyTheme, restorePersonalPartyTheme } from "@/lib/themes/client";
import { DEFAULT_PARTY_THEME, getPartyTheme, type PartyThemeId } from "@/lib/themes/rules";

export type SearchState = { status: "idle" | "loading" | "results" | "empty" | "error"; songs: SongResult[]; message?: string };
const emptyQueue: QueueSnapshot = { version: 0, items: [], fairRotation: false, guestPermissions: DEFAULT_GUEST_PERMISSIONS, partyTheme: DEFAULT_PARTY_THEME };
const favoritesChangedEvent = "mykaraoke:favorites-changed";

function favoriteStorageSnapshot(): string | null {
  try { return window.localStorage.getItem(SONG_FAVORITES_STORAGE_KEY); }
  catch { return null; }
}
function emptyFavoriteStorageSnapshot(): null { return null; }
function subscribeToFavoriteStorage(notify: () => void) {
  const stored = (event: StorageEvent) => { if (event.key === null || event.key === SONG_FAVORITES_STORAGE_KEY) notify(); };
  window.addEventListener("storage", stored);
  window.addEventListener(favoritesChangedEvent, notify);
  return () => { window.removeEventListener("storage", stored); window.removeEventListener(favoritesChangedEvent, notify); };
}
export async function responseError(response: Response): Promise<string> {
  try { return ((await response.json()) as { error?: string }).error ?? "Please try again."; }
  catch { return "Please try again."; }
}


export function useRoomSongs({ code, role, singer, guestId }: { code: string; role: "host" | "guest"; singer: string; guestId?: string }) {
  const [queue, setQueue] = useState<QueueSnapshot>(emptyQueue);
  const [queueState, setQueueState] = useState<"loading" | "connected" | "reconnecting" | "ended">("loading");
  const [queueMessage, setQueueMessage] = useState("");
  const [query, setQuery] = useState("");
  const [singerName, setSingerName] = useState(singer);
  const [duetEnabled, setDuetEnabled] = useState(false);
  const [duetSingerName, setDuetSingerName] = useState("");
  const [searchState, setSearchState] = useState<SearchState>({ status: "idle", songs: [] });
  const favoriteStorage = useSyncExternalStore(subscribeToFavoriteStorage, favoriteStorageSnapshot, emptyFavoriteStorageSnapshot);
  const favorites = useMemo(() => parseSongFavorites(favoriteStorage), [favoriteStorage]);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const pendingAdds = useRef(new Map<string, string>());
  const notificationTimers = useRef(new Map<string, number>());
  const [partyNotifications, setPartyNotifications] = useState<PartyNotification[]>([]);
  const canAssignSingers = singerName.trim().length >= 2 && (!duetEnabled || duetSingerName.trim().length >= 2);
  const canAddSongs = role === "host" || queue.guestPermissions.addSongs;
  const canManageQueue = role === "host" || queue.guestPermissions.queueControl;

  useEffect(() => {
    if (queueState === "connected") applyPartyTheme(queue.partyTheme);
  }, [queue.partyTheme, queueState]);

  useEffect(() => () => restorePersonalPartyTheme(), []);

  useEffect(() => {
    let active = true;
    let terminal = false;
    let realtimeClient: SupabaseClient | undefined;
    let realtimeChannel: RealtimeChannel | undefined;
    let retryTimer: number | undefined;
    let retryCount = 0;
    let connecting = false;
    async function refresh() {
      if (terminal) return;
      try {
        const response = await fetch(`/api/rooms/${code}/queue`, { cache: "no-store" });
        if (!active) return;
        if ([403, 404, 410].includes(response.status)) { terminal = true; if (retryTimer) window.clearTimeout(retryTimer); const client = realtimeClient; const channel = realtimeChannel; if (client && channel) { void client.removeChannel(channel); void client.realtime.disconnect(); } setQueue(emptyQueue); setQueueState("ended"); setSearchState({ status: "idle", songs: [] }); return; }
        if (!response.ok) throw new Error("Queue unavailable");
        const snapshot = await response.json() as QueueSnapshot;
        if (active && !terminal) { setQueue((current) => snapshot.version >= current.version ? snapshot : current); setQueueState("connected"); }
      } catch { if (active && !terminal) setQueueState("reconnecting"); }
    }
    void refresh();
    function scheduleRealtimeRetry() {
      if (!active || terminal || retryTimer !== undefined) return;
      const delay = Math.min(30_000, 1_000 * 2 ** Math.min(retryCount++, 5));
      retryTimer = window.setTimeout(() => { retryTimer = undefined; void subscribe(); }, delay);
    }
    async function subscribe() {
      if (!active || terminal || connecting || realtimeChannel) return;
      connecting = true;
      try {
        const response = await fetch(`/api/rooms/${code}/queue/realtime`, { cache: "no-store" });
        if (!response.ok) throw new Error("Realtime config unavailable");
        if (!active || terminal) return;
        const config = await response.json() as { enabled: boolean; url?: string; key?: string; topic?: string };
        if (!active || !config.enabled || !config.url || !config.key || !config.topic) return;
        const client = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: `mk-queue-${code}-${crypto.randomUUID()}` } });
        await client.realtime.setAuth(config.key);
        if (!active || terminal) { void client.realtime.disconnect(); return; }
        const channel = client.channel(config.topic, { config: { private: true } })
          .on("broadcast", { event: "queue_changed" }, () => void refresh())
          .on("broadcast", { event: "party_notification" }, ({ payload }) => {
            const event = parsePartyNotification(payload);
            if (!event) return;
            const ownPhoneEvent = event.actorId !== null && event.actorId === guestId;
            const ownDesktopHostEvent = event.actorId === null && role === "host" && !guestId;
            if (ownPhoneEvent || ownDesktopHostEvent) return;
            setPartyNotifications((current) => current.some((item) => item.id === event.id) ? current : [...current.slice(-2), event]);
            const existing = notificationTimers.current.get(event.id);
            if (existing) window.clearTimeout(existing);
            notificationTimers.current.set(event.id, window.setTimeout(() => {
              notificationTimers.current.delete(event.id);
              setPartyNotifications((current) => current.filter((item) => item.id !== event.id));
            }, 4_500));
          })
          .subscribe((status) => {
            if (status === "SUBSCRIBED") { retryCount = 0; void refresh(); }
            else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status) && realtimeChannel === channel) {
              realtimeChannel = undefined;
              realtimeClient = undefined;
              void client.removeChannel(channel);
              void client.realtime.disconnect();
              scheduleRealtimeRetry();
            }
          });
        realtimeClient = client;
        realtimeChannel = channel;
      } catch { scheduleRealtimeRetry(); /* Snapshot polling remains the recovery path. */ }
      finally { connecting = false; }
    }
    void subscribe();
    const timer = window.setInterval(() => void refresh(), 3_000);
    const online = () => { void refresh(); if (!realtimeChannel) { if (retryTimer) window.clearTimeout(retryTimer); retryTimer = undefined; void subscribe(); } };
    window.addEventListener("online", online);
    const timers = notificationTimers.current;
    return () => { active = false; window.clearInterval(timer); if (retryTimer) window.clearTimeout(retryTimer); window.removeEventListener("online", online); for (const noticeTimer of timers.values()) window.clearTimeout(noticeTimer); timers.clear(); const client = realtimeClient; const channel = realtimeChannel; if (client && channel) { void client.removeChannel(channel); void client.realtime.disconnect(); } };
  }, [code, guestId, role]);

  useEffect(() => {
    const normalized = query.normalize("NFKC").replace(/\s+/gu, " ").trim();
    if (normalized.length < 2 || queueState === "ended") return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchState({ status: "loading", songs: [] });
      try {
        const response = await fetch(`/api/rooms/${code}/search?q=${encodeURIComponent(normalized)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) { setSearchState({ status: "error", songs: [], message: await responseError(response) }); return; }
        const { songs } = await response.json() as { songs: SongResult[] };
        setSearchState({ status: songs.length ? "results" : "empty", songs });
      } catch { if (!controller.signal.aborted) setSearchState({ status: "error", songs: [], message: "Search is unavailable. Check your connection and try again." }); }
    }, 500);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [code, query, queueState]);

  async function add(song: SongResult, workingKey = song.id) {
    if (queueState !== "connected") return;
    setQueueMessage("");
    setWorkingId(workingKey);
    const requestKey = pendingAdds.current.get(song.id) ?? crypto.randomUUID();
    pendingAdds.current.set(song.id, requestKey);
    try {
      const response = await fetch(`/api/rooms/${code}/queue`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchResultId: song.id, singerName, duetSingerName: duetEnabled ? duetSingerName : null, requestKey }),
      });
      if (!response.ok) { pendingAdds.current.delete(song.id); setQueueMessage(await responseError(response)); return; }
      const snapshot = await response.json() as QueueAddSnapshot;
      setQueue((current) => snapshot.version >= current.version ? snapshot : current);
      pendingAdds.current.delete(song.id);
      setQueueMessage(snapshot.autoStarted ? `${song.title} is starting on the TV.` : `${song.title} added to the queue.`);
    } catch { setQueueMessage("Could not add this song. Check your connection and retry."); }
    finally { setWorkingId(null); }
  }

  function toggleFavorite(song: SongResult | FavoriteSong) {
    const favorite = "id" in song ? favoriteFromSong(song) : song;
    const next = toggleSongFavorite(favorites, favorite);
    try {
      window.localStorage.setItem(SONG_FAVORITES_STORAGE_KEY, serializeSongFavorites(next));
      window.dispatchEvent(new Event(favoritesChangedEvent));
      setQueueMessage(next.some((item) => item.youtubeId === favorite.youtubeId) ? `${favorite.title} saved to this browser.` : `${favorite.title} removed from favorites.`);
    } catch {
      setQueueMessage("This browser could not save favorites. Check its storage settings and try again.");
    }
  }

  // Favorites and popular songs carry only stored metadata, so refresh them
  // through the search boundary to get a current, server-issued result ID.
  async function addByLookup(song: { youtubeId: string; title: string }, workingKey: string, unavailableMessage: string) {
    if (queueState !== "connected") return;
    setQueueMessage("");
    setWorkingId(workingKey);
    try {
      const response = await fetch(`/api/rooms/${code}/search?q=${encodeURIComponent(song.title.slice(0, 80))}`, { cache: "no-store" });
      if (!response.ok) { setQueueMessage(await responseError(response)); return; }
      const { songs } = await response.json() as { songs: SongResult[] };
      const current = songs.find((result) => result.youtubeId === song.youtubeId);
      if (!current) { setQueueMessage(unavailableMessage); return; }
      setWorkingId(null);
      await add(current, workingKey);
    } catch {
      setQueueMessage("Could not refresh this song. Check your connection and retry.");
    } finally {
      setWorkingId(null);
    }
  }

  function addFavorite(favorite: FavoriteSong) {
    return addByLookup(favorite, `favorite:${favorite.youtubeId}`, "This favorite is not currently available in YouTube search. Try searching for another version.");
  }

  async function change(id: string, action: "up" | "down" | "remove" | "skip") {
    if (queueState !== "connected") return;
    setQueueMessage(""); setWorkingId(id);
    try {
      const response = await fetch(`/api/rooms/${code}/queue/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, expectedVersion: queue.version }),
      });
      if (!response.ok) { setQueueMessage(await responseError(response)); if (response.status === 409) void fetch(`/api/rooms/${code}/queue`, { cache: "no-store" }).then(async (latest) => { if (latest.ok) { const snapshot = await latest.json() as QueueSnapshot; setQueue((current) => snapshot.version >= current.version ? snapshot : current); } }).catch(() => {}); return; }
      const snapshot = await response.json() as QueueSnapshot;
      setQueue((current) => snapshot.version >= current.version ? snapshot : current);
      setQueueMessage(action === "remove" ? "Song removed." : action === "skip" ? "Song skipped." : queue.fairRotation ? "Manual order saved. Fair rotation is now off." : "Queue order updated.");
    } catch { setQueueMessage("Could not update the queue. Check your connection and retry."); }
    finally { setWorkingId(null); }
  }

  async function toggleFairRotation() {
    if (role !== "host" || queueState !== "connected" || workingId !== null) return;
    setWorkingId("rotation");
    setQueueMessage("");
    try {
      const response = await fetch(`/api/rooms/${code}/settings/rotation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !queue.fairRotation, expectedVersion: queue.version }),
      });
      if (!response.ok) {
        setQueueMessage(await responseError(response));
        if (response.status === 409) {
          void fetch(`/api/rooms/${code}/queue`, { cache: "no-store" }).then(async (latest) => {
            if (latest.ok) {
              const snapshot = await latest.json() as QueueSnapshot;
              setQueue((current) => snapshot.version >= current.version ? snapshot : current);
            }
          }).catch(() => {});
        }
        return;
      }
      const snapshot = await response.json() as QueueSnapshot;
      setQueue((current) => snapshot.version >= current.version ? snapshot : current);
      setQueueMessage(snapshot.fairRotation ? "Fair rotation is on. Waiting songs were arranged by singer." : "Fair rotation is off. Existing queue order was preserved.");
    } catch {
      setQueueMessage("Could not update singer rotation. Check your connection and retry.");
    } finally {
      setWorkingId(null);
    }
  }

  async function toggleGuestPermission(permission: GuestPermission) {
    if (role !== "host" || queueState !== "connected" || workingId !== null) return;
    const enabled = !queue.guestPermissions[permission];
    const label = GUEST_PERMISSIONS.find((item) => item.id === permission)?.label ?? "Permission";
    setWorkingId(`permission:${permission}`);
    setQueueMessage("");
    try {
      const response = await fetch(`/api/rooms/${code}/settings/guest-permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [permission]: enabled }),
      });
      if (!response.ok) { setQueueMessage(await responseError(response)); return; }
      const { guestPermissions } = await response.json() as Pick<QueueSnapshot, "guestPermissions">;
      setQueue((current) => ({ ...current, guestPermissions }));
      setQueueMessage(`${label} for guests is ${enabled ? "on" : "off"}.`);
    } catch {
      setQueueMessage("Could not update guest permissions. Check your connection and retry.");
    } finally {
      setWorkingId(null);
    }
  }

  async function changePartyTheme(themeId: PartyThemeId) {
    if (role !== "host" || queueState !== "connected" || workingId !== null || themeId === queue.partyTheme) return;
    setWorkingId("theme");
    setQueueMessage("");
    try {
      const response = await fetch(`/api/rooms/${code}/settings/theme`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId }),
      });
      if (!response.ok) { setQueueMessage(await responseError(response)); return; }
      const updated = await response.json() as Pick<QueueSnapshot, "partyTheme" | "version">;
      setQueue((current) => updated.version >= current.version ? { ...current, ...updated } : current);
      applyPartyTheme(updated.partyTheme);
      setQueueMessage(`${getPartyTheme(updated.partyTheme).label} is now the room theme.`);
    } catch {
      setQueueMessage("Could not update the room theme. Check your connection and retry.");
    } finally {
      setWorkingId(null);
    }
  }

  return {
    queue, queueState, queueMessage, setQueueMessage, partyNotifications, query, setQuery, searchState, setSearchState,
    singerName, setSingerName, duetEnabled, setDuetEnabled, duetSingerName, setDuetSingerName,
    favorites, workingId, canAssignSingers, canAddSongs, canManageQueue,
    add, toggleFavorite, addFavorite, addByLookup, change, toggleFairRotation, toggleGuestPermission, changePartyTheme,
  };
}
