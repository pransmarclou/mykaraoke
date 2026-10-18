import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect, test } from "@playwright/test";

test("guest finds a server-cached YouTube fixture, queues songs, and host changes shared order", async ({ page, browser }) => {
  const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const query = `fixture ${randomUUID().slice(0, 8)}`;
  const generation = randomUUID();
  const titles = ["Fixture Karaoke Alpha", "Fixture Karaoke Beta"];
  const thumbnail = Buffer.from("R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", "base64");
  let roomId: string | undefined;
  const guestContext = await browser.newContext();
  const outsiderContext = await browser.newContext();
  try {
    await page.route("https://i.ytimg.com/vi/**/mqdefault.jpg", (route) => route.fulfill({ status: 200, contentType: "image/gif", body: thumbnail }));
    await db.query("insert into public.song_search_cache (query, generation) values ($1, $2)", [query, generation]);
    for (let index = 0; index < titles.length; index += 1) {
      await db.query(
        `insert into public.song_search_results (query, youtube_id, title, channel_title, duration_seconds, generation)
         values ($1,$2,$3,$4,$5,$6)`, [query, index === 0 ? "cBcDeFgHi01" : "cBcDeFgHi02", titles[index], "Test fixture channel", 180, generation]);
    }
    await page.goto("/host");
    await page.getByRole("button", { name: "Create a room" }).click();
    const code = (await page.getByTestId("room-code").textContent())!;
    const room = await db.query<{ id: string }>("select id from public.rooms where code = $1", [code]);
    roomId = room.rows[0].id;
    const guest = await guestContext.newPage();
    await guest.route("https://i.ytimg.com/vi/**/mqdefault.jpg", (route) => route.fulfill({ status: 200, contentType: "image/gif", body: thumbnail }));
    await guest.goto(`/join?code=${code}`);
    await guest.getByRole("textbox", { name: "Your display name" }).fill("Alex");
    await guest.getByRole("button", { name: "Join room" }).click();
    await expect(guest).toHaveURL(new RegExp(`/room/${code}$`));
    const realtimeEnabled = await guest.evaluate(async (roomCode) => {
      const response = await fetch(`/api/rooms/${roomCode}/queue/realtime`);
      return ((await response.json()) as { enabled?: boolean }).enabled;
    }, code);
    expect(realtimeEnabled).toBe(true);
    await guest.getByRole("searchbox", { name: "Search YouTube karaoke" }).fill(query);
    await expect(guest.getByTestId("search-results").getByText(titles[0])).toBeVisible();
    await expect(guest.getByTestId("search-results").locator("img").first()).toHaveAttribute("src", "https://i.ytimg.com/vi/cBcDeFgHi01/mqdefault.jpg");
    await expect.poll(() => guest.getByTestId("search-results").locator("img").first().evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await guest.getByTestId("search-results").getByRole("button", { name: "Add" }).first().click();
    await expect(guest.getByTestId("queue-item")).toHaveCount(1);
    await expect(page.getByTestId("queue-item")).toHaveCount(1, { timeout: 10_000 });
    await expect(page.getByTestId("queue-item").first().locator("img")).toHaveAttribute("src", "https://i.ytimg.com/vi/cBcDeFgHi01/mqdefault.jpg");
    await guest.getByTestId("search-results").getByRole("button", { name: "Add" }).nth(1).click();
    await expect(page.getByTestId("queue-item")).toHaveCount(2, { timeout: 10_000 });
    await page.getByRole("button", { name: `Move ${titles[1]} up` }).click();
    await expect(page.getByTestId("queue-item").first()).toContainText(titles[1]);
    await expect(guest.getByTestId("queue-item").first()).toContainText(titles[1], { timeout: 10_000 });
    const unauthorized = await guest.evaluate(async ({ roomCode, itemId }: { roomCode: string; itemId: string }) => {
      const response = await fetch(`/api/rooms/${roomCode}/queue/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove", expectedVersion: 3 }) });
      return response.status;
    }, { roomCode: code, itemId: (await db.query<{ id: string }>("select id from public.queue_items where room_id = $1 order by created_at limit 1", [roomId])).rows[0].id });
    expect(unauthorized).toBe(403);
    const outsider = await outsiderContext.newPage();
    await outsider.goto("/join");
    const outsiderSearch = await outsider.evaluate(async ({ roomCode, q }) => (await fetch(`/api/rooms/${roomCode}/search?q=${encodeURIComponent(q)}`)).status, { roomCode: code, q: query });
    expect(outsiderSearch).toBe(403);
  } finally {
    await guestContext.close();
    await outsiderContext.close();
    if (roomId) await db.query("delete from public.rooms where id = $1", [roomId]);
    await db.query("delete from public.song_search_results where query = $1", [query]);
    await db.query("delete from public.song_search_cache where query = $1", [query]);
    await db.end();
  }
});
