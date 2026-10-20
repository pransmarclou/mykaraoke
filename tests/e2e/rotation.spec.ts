import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect, test } from "@playwright/test";

test("host enables fair singer rotation and manually overrides it", async ({ page, browser }) => {
  const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const guestContext = await browser.newContext();
  const query = `rotation fixture ${randomUUID().slice(0, 8)}`;
  const generation = randomUUID();
  const titles = ["Rotation Alex One", "Rotation Alex Two", "Rotation Sam One"];
  let roomId: string | undefined;
  try {
    await db.query("insert into public.song_search_cache (query, generation) values ($1, $2)", [query, generation]);
    for (let index = 0; index < titles.length; index += 1) {
      await db.query(
        `insert into public.song_search_results (query, youtube_id, title, channel_title, duration_seconds, generation)
         values ($1,$2,$3,'Fixture channel',180,$4)`,
        [query, `qBcDeFgHi0${index + 1}`, titles[index], generation],
      );
    }

    await page.goto("/host");
    await page.getByRole("button", { name: "Create a room" }).click();
    const code = (await page.getByTestId("room-code").textContent())!;
    roomId = (await db.query<{ id: string }>("select id from public.rooms where code = $1", [code])).rows[0].id;
    const guest = await guestContext.newPage();
    await guest.goto(`/join?code=${code}`);
    await guest.getByRole("textbox", { name: "Your display name" }).fill("Guest");
    await guest.getByRole("button", { name: "Join room" }).click();
    await expect(guest).toHaveURL(new RegExp(`/room/${code}$`));
    const guestStatus = await guest.evaluate(async (roomCode) => {
      const response = await fetch(`/api/rooms/${roomCode}/settings/rotation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true, expectedVersion: 0 }),
      });
      return response.status;
    }, code);
    expect(guestStatus).toBe(403);
    await page.getByRole("searchbox", { name: "Search YouTube karaoke" }).fill(query);
    await expect(page.getByTestId("search-results").getByText(titles[0])).toBeVisible();

    const singer = page.getByRole("textbox", { name: "Singer name" });
    await singer.fill("Alex");
    for (const title of titles.slice(0, 2)) {
      await page.getByTestId("search-results").getByRole("listitem").filter({ hasText: title }).getByRole("button", { name: "Add" }).click();
    }
    await singer.fill("Sam");
    await page.getByTestId("search-results").getByRole("listitem").filter({ hasText: titles[2] }).getByRole("button", { name: "Add" }).click();
    await expect(page.getByTestId("queue-item")).toHaveCount(3);

    await page.getByRole("button", { name: "Turn fair singer rotation on" }).click();
    await expect(page.getByRole("button", { name: "Turn fair singer rotation off" })).toBeVisible();
    await expect(page.getByTestId("queue-item").nth(0)).toContainText(titles[0]);
    await expect(page.getByTestId("queue-item").nth(1)).toContainText(titles[2]);
    await expect(page.getByTestId("queue-item").nth(2)).toContainText(titles[1]);

    await page.getByRole("button", { name: `Move ${titles[1]} up` }).click();
    await expect(page.getByRole("button", { name: "Turn fair singer rotation on" })).toBeVisible();
    await expect(page.getByText("Manual order saved. Fair rotation is now off.")).toBeVisible();
    await expect(page.getByTestId("queue-item").nth(1)).toContainText(titles[1]);
  } finally {
    await guestContext.close();
    if (roomId) await db.query("delete from public.rooms where id = $1", [roomId]);
    await db.query("delete from public.song_search_results where query = $1", [query]);
    await db.query("delete from public.song_search_cache where query = $1", [query]);
    await db.end();
  }
});
