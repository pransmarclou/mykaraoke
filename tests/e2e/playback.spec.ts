import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect, test } from "@playwright/test";

const fakeYouTubeApi = `
window.YT = { Player: class {
  constructor(element, options) {
    this.options = options;
    this.frame = document.createElement('iframe');
    this.frame.title = 'YouTube player test fixture';
    this.frame.setAttribute('data-testid', 'fixture-youtube-iframe');
    this.frame.style.width = '100%';
    this.frame.style.height = '100%';
    element.replaceWith(this.frame);
    window.__testPlayerEnd = () => options.events.onStateChange({ data: 0 });
    window.__testPlayerError = (code) => options.events.onError({ data: code });
    setTimeout(() => options.events.onReady(), 0);
  }
  playVideo() { this.options.events.onStateChange({ data: 1 }); }
  pauseVideo() { this.options.events.onStateChange({ data: 2 }); }
  destroy() { this.frame.remove(); }
} };
window.onYouTubeIframeAPIReady?.();`;

test("host pairs a TV, guest queues songs, and the player advances after an end event", async ({ page, browser }) => {
  const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const query = `playback fixture ${randomUUID().slice(0, 8)}`;
  const generation = randomUUID();
  const titles = ["Playback Fixture Alpha", "Playback Fixture Beta"];
  const guestContext = await browser.newContext();
  const tvContext = await browser.newContext();
  let roomId: string | undefined;
  try {
    await db.query("insert into public.song_search_cache (query, generation) values ($1, $2)", [query, generation]);
    for (let index = 0; index < 2; index += 1) {
      await db.query(
        `insert into public.song_search_results (query, youtube_id, title, channel_title, duration_seconds, generation)
         values ($1,$2,$3,'Fixture channel',180,$4)`,
        [query, index === 0 ? "gBcDeFgHi01" : "gBcDeFgHi02", titles[index], generation]);
    }
    await page.goto("/host");
    await page.getByRole("button", { name: "Create a room" }).click();
    const code = (await page.getByTestId("room-code").textContent())!;
    roomId = (await db.query<{ id: string }>("select id from public.rooms where code = $1", [code])).rows[0].id;

    const guest = await guestContext.newPage();
    await guest.goto(`/join?code=${code}`);
    await guest.getByRole("textbox", { name: "Your display name" }).fill("Alex");
    await guest.getByRole("button", { name: "Join room" }).click();
    await expect(guest).toHaveURL(new RegExp(`/room/${code}$`));
    const forbidden = await guest.evaluate(async (roomCode) => {
      const response = await fetch(`/api/rooms/${roomCode}/playback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", requestKey: crypto.randomUUID() }) });
      return response.status;
    }, code);
    expect(forbidden).toBe(403);

    const tv = await tvContext.newPage();
    await tv.route("https://www.youtube.com/iframe_api", (route) => route.fulfill({ status: 200, contentType: "application/javascript", body: fakeYouTubeApi }));
    await tv.goto(`/tv/${code}`);
    await expect(tv.getByRole("heading", { name: "Pair this display" })).toBeVisible();
    await page.getByRole("button", { name: "Generate TV pairing code" }).click();
    const pairCode = (await page.getByTestId("tv-pair-code").textContent())!;
    await tv.getByRole("textbox", { name: "TV pairing code" }).fill(pairCode);
    await tv.getByRole("button", { name: "Pair this display" }).click();
    await expect(tv.getByText("Waiting for the next song")).toBeVisible();
    const tvCookie = (await tvContext.cookies()).find((cookie) => cookie.name === "mk_tv_session");
    expect(tvCookie?.httpOnly).toBe(true);
    expect(await tv.evaluate(() => document.cookie.includes("mk_tv_session"))).toBe(false);

    await guest.getByRole("searchbox", { name: "Search YouTube karaoke" }).fill(query);
    await expect(guest.getByTestId("search-results").getByText(titles[0])).toBeVisible();
    await guest.getByTestId("search-results").getByRole("button", { name: "Add" }).first().click();
    await guest.getByTestId("search-results").getByRole("button", { name: "Add" }).nth(1).click();
    await expect(page.getByTestId("queue-item")).toHaveCount(2);
    await page.getByRole("button", { name: "Start next song" }).click();
    await expect(tv.getByRole("heading", { name: titles[0] })).toBeVisible({ timeout: 10_000 });
    await expect(tv.getByTestId("tv-player").locator("iframe")).toBeVisible();
    await tv.getByRole("button", { name: "Start video" }).click();
    await expect(page.getByText("Player: playing")).toBeVisible({ timeout: 10_000 });
    await expect(guest.getByText("Player: playing")).toBeVisible({ timeout: 10_000 });
    await expect(guest.getByText(`Singer: Alex`)).toBeVisible();

    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(tv.getByText("Player state: paused")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(tv.getByText("Player state: playing")).toBeVisible({ timeout: 10_000 });
    await tv.evaluate(() => (window as unknown as Window & { __testPlayerEnd: () => void }).__testPlayerEnd());
    await expect(tv.getByRole("heading", { name: titles[1] })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(titles[1]).first()).toBeVisible({ timeout: 10_000 });
    await tv.reload();
    await expect(tv.getByRole("heading", { name: titles[1] })).toBeVisible();
    await expect(tv.getByTestId("tv-player").locator("iframe")).toBeVisible();
    await tv.evaluate(() => (window as unknown as Window & { __testPlayerError: (code: number) => void }).__testPlayerError(150));
    await expect(tv.getByText("Player state: error")).toBeVisible();
    await expect(tv.getByRole("alert").filter({ hasText: "YouTube could not play" })).toContainText("error 150");
    await page.getByRole("button", { name: "Skip current" }).click();
    await expect(tv.getByText("Waiting for the next song")).toBeVisible({ timeout: 10_000 });
  } finally {
    await guestContext.close();
    await tvContext.close();
    if (roomId) await db.query("delete from public.rooms where id = $1", [roomId]);
    await db.query("delete from public.song_search_results where query = $1", [query]);
    await db.query("delete from public.song_search_cache where query = $1", [query]);
    await db.end();
  }
});
