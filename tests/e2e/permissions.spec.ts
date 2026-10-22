import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect, test } from "@playwright/test";

const fakeYouTubeApi = `
window.YT = { Player: class {
  constructor(element, options) {
    this.options = options;
    this.frame = document.createElement('iframe');
    this.frame.title = 'YouTube player test fixture';
    element.replaceWith(this.frame);
    setTimeout(() => options.events.onReady(), 0);
  }
  playVideo() { this.options.events.onStateChange({ data: 1 }); }
  pauseVideo() { this.options.events.onStateChange({ data: 2 }); }
  destroy() { this.frame.remove(); }
} };
window.onYouTubeIframeAPIReady?.();`;

test("host turns a guest phone into a TV remote and can take it back", async ({ page, browser }) => {
  const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const query = `permission fixture ${randomUUID().slice(0, 8)}`;
  const generation = randomUUID();
  const title = "Permission Fixture Remote";
  const phoneHostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const tvContext = await browser.newContext();
  let roomId: string | undefined;
  try {
    await db.query("insert into public.song_search_cache (query, generation) values ($1, $2)", [query, generation]);
    await db.query(
      `insert into public.song_search_results (query, youtube_id, title, channel_title, duration_seconds, generation)
       values ($1,'rBcDeFgHi01',$2,'Fixture channel',180,$3)`,
      [query, title, generation]);

    await page.goto("/host");
    await page.getByRole("button", { name: "Create a room" }).click();
    const code = (await page.getByTestId("room-code").textContent())!;
    roomId = (await db.query<{ id: string }>("select id from public.rooms where code = $1", [code])).rows[0].id;

    const tv = await tvContext.newPage();
    await tv.route("https://www.youtube.com/iframe_api", (route) => route.fulfill({ status: 200, contentType: "application/javascript", body: fakeYouTubeApi }));
    await tv.goto(`/tv/${code}`);
    await page.getByRole("button", { name: "Generate TV pairing code" }).click();
    await tv.getByRole("textbox", { name: "TV pairing code" }).fill((await page.getByTestId("tv-pair-code").textContent())!);
    await tv.getByRole("button", { name: "Pair this display" }).click();
    await expect(tv.getByRole("heading", { name: "Waiting for songs…" })).toBeVisible();
    const waitingVideo = tv.getByTestId("tv-waiting-video");
    await expect(waitingVideo).toBeAttached();
    await expect(waitingVideo.locator("source")).toHaveAttribute("src", "/media/tv-videoke-family-loop.mp4");
    expect(await waitingVideo.evaluate((video: HTMLVideoElement) => ({ muted: video.muted, loop: video.loop, controls: video.controls }))).toEqual({ muted: true, loop: true, controls: false });

    const phoneHost = await phoneHostContext.newPage();
    await phoneHost.goto(`/join?code=${code}`);
    await phoneHost.getByRole("textbox", { name: "Your display name" }).fill("Party host");
    await phoneHost.getByRole("button", { name: "Join room" }).click();
    await expect(phoneHost.getByTestId("phone-host-badge")).toBeVisible({ timeout: 15_000 });
    await phoneHost.getByRole("tab", { name: "Host" }).click();

    const guest = await guestContext.newPage();
    await guest.goto(`/join?code=${code}`);
    await guest.getByRole("textbox", { name: "Your display name" }).fill("Remote");
    await guest.getByRole("button", { name: "Join room" }).click();
    await expect(guest).toHaveURL(new RegExp(`/room/${code}$`), { timeout: 15_000 });

    // Defaults: guests can add songs and react, but have no remote.
    await expect(guest.getByTestId("playback-remote")).toHaveCount(0);
    const remotePermission = phoneHost.getByRole("switch", { name: /Remote control/u });
    await expect(remotePermission).toHaveAttribute("aria-checked", "false");
    await guest.getByRole("searchbox", { name: "Search YouTube karaoke" }).fill(query);
    await guest.getByTestId("search-results").getByRole("button", { name: "Add" }).click();
    await expect(page.getByTestId("queue-item")).toHaveCount(1);

    await remotePermission.click();
    await expect(remotePermission).toHaveAttribute("aria-checked", "true");
    await guest.getByRole("tab", { name: "Stage" }).click();
    await expect(guest.getByText("Your phone is a remote for the TV")).toBeVisible({ timeout: 10_000 });
    await guest.getByTestId("playback-remote").getByRole("button", { name: "Start next song" }).click();
    await expect(tv.getByRole("heading", { name: title })).toBeVisible({ timeout: 10_000 });
    await tv.getByRole("button", { name: "Start video" }).click();
    await expect(guest.getByText("Player: playing")).toBeVisible({ timeout: 10_000 });
    await guest.getByTestId("playback-remote").getByRole("button", { name: "Pause", exact: true }).click();
    await expect(tv.getByText("Player state: paused")).toBeVisible({ timeout: 10_000 });

    await remotePermission.click();
    await expect(guest.getByTestId("playback-remote")).toHaveCount(0, { timeout: 10_000 });
    const status = await guest.evaluate(async (roomCode) => (await fetch(`/api/rooms/${roomCode}/playback`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resume", requestKey: crypto.randomUUID() }),
    })).status, code);
    expect(status).toBe(403);

    await phoneHost.getByRole("switch", { name: /Add songs/u }).click();
    await expect(guest.getByText("The host has paused song requests from guests.")).toBeVisible({ timeout: 10_000 });
    await expect(guest.getByRole("searchbox", { name: "Search YouTube karaoke" })).toHaveCount(0);

    const hostStatus = await guest.evaluate(async (roomCode) => (await fetch(`/api/rooms/${roomCode}/settings/guest-permissions`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playbackControl: true }),
    })).status, code);
    expect(hostStatus).toBe(403);
  } finally {
    await phoneHostContext.close();
    await guestContext.close();
    await tvContext.close();
    if (roomId) await db.query("delete from public.rooms where id = $1", [roomId]);
    await db.query("delete from public.song_search_results where query = $1", [query]);
    await db.query("delete from public.song_search_cache where query = $1", [query]);
    await db.end();
  }
});
