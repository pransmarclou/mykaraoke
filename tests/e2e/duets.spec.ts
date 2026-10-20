import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect, test } from "@playwright/test";

test("a guest assigns a duet that appears on the host, guest, and paired TV", async ({ page, browser }) => {
  const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const guestContext = await browser.newContext();
  const tvContext = await browser.newContext();
  const query = `duet fixture ${randomUUID().slice(0, 8)}`;
  const generation = randomUUID();
  const title = "Duet Fixture Song";
  let roomId: string | undefined;
  try {
    await db.query("insert into public.song_search_cache (query, generation) values ($1, $2)", [query, generation]);
    await db.query(
      `insert into public.song_search_results (query, youtube_id, title, channel_title, duration_seconds, generation)
       values ($1,'uBcDeFgHi05',$2,'Fixture channel',180,$3)`,
      [query, title, generation],
    );
    await page.goto("/host");
    await page.getByRole("button", { name: "Create a room" }).click();
    const code = (await page.getByTestId("room-code").textContent())!;
    roomId = (await db.query<{ id: string }>("select id from public.rooms where code = $1", [code])).rows[0].id;

    const guest = await guestContext.newPage();
    await guest.goto(`/join?code=${code}`);
    await guest.getByRole("textbox", { name: "Your display name" }).fill("Alex");
    await guest.getByRole("button", { name: "Join room" }).click();
    await expect(guest).toHaveURL(new RegExp(`/room/${code}$`));
    await guest.getByRole("checkbox", { name: "Add a duet partner" }).check();
    await guest.getByRole("textbox", { name: "Duet partner name" }).fill("Sam");
    await guest.getByRole("searchbox", { name: "Search YouTube karaoke" }).fill(query);
    await expect(guest.getByTestId("search-results").getByText(title)).toBeVisible();
    await guest.getByTestId("search-results").getByRole("button", { name: "Add" }).click();
    await expect(guest.getByTestId("queue-item")).toContainText("Alex & Sam");
    await expect(page.getByTestId("queue-item")).toContainText("Alex & Sam");

    const tv = await tvContext.newPage();
    await tv.goto(`/tv/${code}`);
    await page.getByRole("button", { name: "Generate TV pairing code" }).click();
    await tv.getByRole("textbox", { name: "TV pairing code" }).fill((await page.getByTestId("tv-pair-code").textContent())!);
    await tv.getByRole("button", { name: "Pair this display" }).click();
    await expect(tv.getByText("Alex & Sam")).toBeVisible();
  } finally {
    await guestContext.close();
    await tvContext.close();
    if (roomId) await db.query("delete from public.rooms where id = $1", [roomId]);
    await db.query("delete from public.song_search_results where query = $1", [query]);
    await db.query("delete from public.song_search_cache where query = $1", [query]);
    await db.end();
  }
});
