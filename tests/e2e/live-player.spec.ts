import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test.skip(process.env.LIVE_PLAYER_CHECK !== "1", "Opt-in live YouTube player smoke check; uses the configured API key and external embed.");

test("official YouTube sample plays on a paired display and the host skips it", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const tvContext = await browser.newContext();
  const query = `live player ${randomUUID().slice(0, 8)}`;
  let roomId: string | undefined;
  try {
    const generation = randomUUID();
    await db.query("insert into public.song_search_cache (query, generation) values ($1, $2)", [query, generation]);
    await db.query(`insert into public.song_search_results (query, youtube_id, title, channel_title, duration_seconds, generation)
      values ($1, 'M7lc1UVf-VE', 'YouTube IFrame API sample', 'YouTube Developers', 180, $2)`, [query, generation]);
    await page.goto("/host");
    await page.getByRole("button", { name: "Create a room" }).click();
    const code = (await page.getByTestId("room-code").textContent())!;
    roomId = (await db.query<{ id: string }>("select id from public.rooms where code = $1", [code])).rows[0].id;
    const tv = await tvContext.newPage();
    await tv.goto(`/tv/${code}`);
    await page.getByRole("button", { name: "Generate TV pairing code" }).click();
    await tv.getByRole("textbox", { name: "TV pairing code" }).fill((await page.getByTestId("tv-pair-code").textContent())!);
    await tv.getByRole("button", { name: "Pair this display" }).click();
    await expect(tv.getByText("Waiting for the next song")).toBeVisible();
    await page.getByRole("searchbox", { name: "Search YouTube karaoke" }).fill(query);
    await expect(page.getByTestId("search-results").getByRole("button", { name: "Add" }).first()).toBeVisible();
    await page.getByTestId("search-results").getByRole("button", { name: "Add" }).first().click();
    await expect(page.getByTestId("queue-item")).toHaveCount(1);
    await page.getByRole("button", { name: "Start next song" }).click();
    await expect(tv.getByTestId("tv-player").locator("iframe")).toBeVisible({ timeout: 20_000 });
    await tv.getByRole("button", { name: "Start video" }).click();
    await expect(tv.getByText("Player state: playing")).toBeVisible({ timeout: 30_000 });
    await tv.screenshot({ path: "test-results/phase6-live-tv.png" });
    await page.getByRole("button", { name: "Skip current" }).click();
    await expect(tv.getByText("Waiting for the next song")).toBeVisible({ timeout: 10_000 });
  } finally {
    await tvContext.close();
    if (roomId) await db.query("delete from public.rooms where id = $1", [roomId]);
    await db.query("delete from public.song_search_results where query = $1", [query]);
    await db.query("delete from public.song_search_cache where query = $1", [query]);
    await db.end();
  }
});
