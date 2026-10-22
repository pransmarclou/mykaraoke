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
    window.__testPlayerEnd = () => options.events.onStateChange({ data: 0 });
    setTimeout(() => options.events.onReady(), 0);
  }
  playVideo() { this.options.events.onStateChange({ data: 1 }); }
  pauseVideo() { this.options.events.onStateChange({ data: 2 }); }
  destroy() { this.frame.remove(); }
} };
window.onYouTubeIframeAPIReady?.();`;

test("host and guest rate a performance and the TV shows the leaderboard", async ({ page, browser }) => {
  const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const query = `score fixture ${randomUUID().slice(0, 8)}`;
  const generation = randomUUID();
  const title = "Score Fixture Song";
  const guestContext = await browser.newContext();
  const tvContext = await browser.newContext();
  let roomId: string | undefined;
  try {
    await db.query("insert into public.song_search_cache (query, generation) values ($1, $2)", [query, generation]);
    await db.query(
      `insert into public.song_search_results (query, youtube_id, title, channel_title, duration_seconds, generation)
       values ($1,'tBcDeFgHi01',$2,'Fixture channel',180,$3)`,
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

    const guest = await guestContext.newPage();
    await guest.goto(`/join?code=${code}`);
    await guest.getByRole("textbox", { name: "Your display name" }).fill("Fan");
    await guest.getByRole("button", { name: "Join room" }).click();
    await expect(guest).toHaveURL(new RegExp(`/room/${code}$`), { timeout: 15_000 });
    await expect(guest.getByText("Ratings open when the first song starts.")).toBeVisible();

    await page.getByRole("searchbox", { name: "Search YouTube karaoke" }).fill(query);
    await page.getByRole("textbox", { name: "Singer name" }).fill("Alex");
    await page.getByTestId("search-results").getByRole("button", { name: "Add" }).click();
    await expect(page.getByTestId("queue-item")).toHaveCount(1);
    await page.getByRole("button", { name: "Start next song" }).click();
    await expect(tv.getByRole("heading", { name: title })).toBeVisible({ timeout: 10_000 });

    await expect(guest.getByTestId("rating-target")).toContainText("Alex", { timeout: 10_000 });
    await guest.getByRole("button", { name: "Rate 4 stars" }).click();
    await expect(guest.getByText("You rated Alex 4 out of 5.")).toBeVisible();
    await expect(guest.getByRole("button", { name: "Rate 4 stars" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Rate 5 stars" }).click();
    await expect(page.getByTestId("rating-target")).toContainText("4.5 ★ from 2 ratings");
    await tv.getByRole("tab", { name: "Scores" }).click();
    await expect(tv.getByTestId("leaderboard")).toContainText("Alex", { timeout: 10_000 });
    await expect(tv.getByTestId("leaderboard")).toContainText("4.5 ★");
    await expect(tv.getByRole("button", { name: /Rate \d stars?/ })).toHaveCount(0);

    // After the song ends it remains rateable as the last performance.
    await tv.evaluate(() => (window as unknown as Window & { __testPlayerEnd: () => void }).__testPlayerEnd());
    await expect(guest.getByText("Rate the last performance")).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("guest-permissions").getByRole("switch", { name: "Guest rate performances" }).click();
    await expect(guest.getByText("The host has turned guest ratings off.")).toBeVisible({ timeout: 10_000 });
    await expect(guest.getByRole("button", { name: "Rate 3 stars" })).toHaveCount(0);
  } finally {
    await guestContext.close();
    await tvContext.close();
    if (roomId) await db.query("delete from public.rooms where id = $1", [roomId]);
    await db.query("delete from public.song_search_results where query = $1", [query]);
    await db.query("delete from public.song_search_cache where query = $1", [query]);
    await db.end();
  }
});
