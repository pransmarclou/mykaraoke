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
  const titles = ["Arthur Nery - Binni (Karaoke/Acoustic Instrumental Version)", "Playback Fixture Beta"];
  const guestContext = await browser.newContext();
  const audienceContext = await browser.newContext();
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
    await expect(guest).toHaveURL(new RegExp(`/room/${code}$`), { timeout: 15_000 });
    await expect(guest.getByTestId("phone-host-badge")).toBeVisible();
    const unready = await guest.evaluate(async (roomCode) => {
      const response = await fetch(`/api/rooms/${roomCode}/playback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", requestKey: crypto.randomUUID() }) });
      return response.status;
    }, code);
    expect(unready).toBe(409);

    const tv = await tvContext.newPage();
    await tv.route("https://www.youtube.com/iframe_api", (route) => route.fulfill({ status: 200, contentType: "application/javascript", body: fakeYouTubeApi }));
    await tv.goto(`/tv/${code}`);
    await expect(tv.getByRole("heading", { name: "Pair this display" })).toBeVisible();
    await page.getByRole("button", { name: "Generate TV pairing code" }).click();
    const pairCode = (await page.getByTestId("tv-pair-code").textContent())!;
    await tv.getByRole("textbox", { name: "TV pairing code" }).fill(pairCode);
    await tv.getByRole("button", { name: "Pair this display" }).click();
    await expect(tv.getByRole("heading", { name: "Waiting for songs…" })).toBeVisible();
    await expect(tv.getByTestId("tv-waiting-card")).toHaveClass(/bg-\[\#0b0d16\]\/35/);
    await expect(tv.getByRole("img", { name: `QR code to join room ${code}` })).toBeVisible();
    await expect(tv.getByRole("button", { name: "Enter fullscreen" })).toBeVisible();
    await expect(tv.getByRole("tab", { name: "Up next" })).toHaveAttribute("aria-selected", "true");
    await expect(tv.getByTestId("tv-join-card")).toContainText(code);
    await expect(tv.getByTestId("tv-stage-banner")).toHaveAccessibleName(`Welcome to MyKaraoke. Scan the QR code or enter room ${code} on your phone to join and add songs.`);
    if (await tv.evaluate(() => window.matchMedia("(min-width: 768px)").matches)) {
      const headerRows = await tv.getByTestId("tv-stage-header").evaluate((header) => {
        const logo = header.querySelector<HTMLElement>("[data-testid='tv-stage-logo']")?.getBoundingClientRect();
        const banner = header.querySelector<HTMLElement>("[data-testid='tv-stage-banner']")?.getBoundingClientRect();
        const controls = header.querySelector<HTMLElement>("[data-testid='tv-stage-controls']")?.getBoundingClientRect();
        return logo && banner && controls
          ? [logo.top, banner.top, controls.top]
          : [];
      });
      expect(headerRows).toHaveLength(3);
      expect(Math.max(...headerRows) - Math.min(...headerRows)).toBeLessThan(24);
    }
    await tv.getByRole("tab", { name: "Scores" }).click();
    await expect(tv.getByText("No scores yet.")).toBeVisible();
    await tv.getByRole("tab", { name: "Search" }).click();
    const tvSearchPanel = tv.getByRole("tabpanel");
    await tvSearchPanel.getByRole("searchbox", { name: "Search songs or artists" }).fill(query);
    await tvSearchPanel.getByRole("button", { name: "Search", exact: true }).click();
    await expect(tv.getByTestId("tv-search-results")).toContainText(titles[0]);
    await expect(tv.getByTestId("tv-search-results").getByRole("button", { name: /Add .* from a joined phone/ }).first()).toBeDisabled();
    await tv.getByRole("tab", { name: "Up next" }).click();
    await tv.keyboard.press("ArrowRight");
    await expect(tv.getByRole("button", { name: "Enter fullscreen" })).toBeFocused();
    const tvCookie = (await tvContext.cookies()).find((cookie) => cookie.name === "mk_tv_session");
    expect(tvCookie?.httpOnly).toBe(true);
    expect(await tv.evaluate(() => document.cookie.includes("mk_tv_session"))).toBe(false);

    const audience = await audienceContext.newPage();
    await audience.goto(`/join?code=${code}`);
    await audience.getByRole("textbox", { name: "Your display name" }).fill("Sam");
    await audience.getByRole("button", { name: "Join room" }).click();
    await expect(audience).toHaveURL(new RegExp(`/room/${code}$`), { timeout: 15_000 });
    await expect(guest.getByTestId("party-notification").filter({ hasText: "Sam joined the room." })).toBeVisible();
    await expect(tv.getByTestId("party-notification").filter({ hasText: "Sam joined the room." })).toBeVisible();

    await guest.getByRole("searchbox", { name: "Search YouTube karaoke" }).fill(query);
    await expect(guest.getByTestId("search-results").getByText(titles[0])).toBeVisible();
    await guest.getByTestId("search-results").getByRole("button", { name: "Add" }).first().click();
    await expect(guest.getByText(`${titles[0]} is starting on the TV.`)).toBeVisible();
    await expect(page.getByTestId("party-notification").filter({ hasText: `Alex added ${titles[0]}. It is starting now.` })).toBeVisible();
    await expect(tv.getByTestId("party-notification").filter({ hasText: `Alex added ${titles[0]}. It is starting now.` })).toBeVisible();
    await expect(tv.getByRole("heading", { name: titles[0] })).toBeVisible({ timeout: 10_000 });
    await guest.getByTestId("search-results").getByRole("button", { name: "Add" }).nth(1).click();
    await expect(page.getByTestId("queue-item")).toHaveCount(1);
    await expect(tv.getByTestId("tv-song-start-notice")).toContainText(`Now starting${titles[0]} · Alex`);
    await expect(tv.getByRole("img", { name: `Compact QR code to join room ${code}` })).toBeVisible();
    await expect(tv.getByTestId("tv-queue-item")).toHaveCount(1);
    await expect(tv.getByTestId("tv-queue")).toContainText(titles[1]);
    const titleSize = await tv.getByTestId("tv-now-playing-title").evaluate((title) => Number.parseFloat(getComputedStyle(title).fontSize));
    expect(titleSize).toBeLessThanOrEqual(32);
    if (await tv.evaluate(() => window.matchMedia("(min-width: 1280px)").matches)) {
      const columnBottoms = await tv.evaluate(() => {
        const stage = document.querySelector<HTMLElement>("[data-testid='tv-stage-column']")?.getBoundingClientRect();
        const rail = document.querySelector<HTMLElement>("[data-testid='tv-utility-rail']")?.getBoundingClientRect();
        return stage && rail ? [stage.bottom, rail.bottom] : [];
      });
      expect(columnBottoms).toHaveLength(2);
      expect(Math.abs(columnBottoms[0] - columnBottoms[1])).toBeLessThan(2);
    }
    const tvWidths = await tv.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(tvWidths.document).toBeLessThanOrEqual(tvWidths.viewport + 1);
    await expect(tv.getByTestId("singer-countdown")).toBeVisible();
    await expect(tv.getByRole("button", { name: "Singer getting ready" })).toBeDisabled();
    await expect(tv.getByTestId("tv-player").locator("iframe")).toBeVisible();
    await expect(tv.getByRole("button", { name: "Start video" })).toBeVisible({ timeout: 10_000 });
    await tv.keyboard.press("ArrowRight");
    await expect(tv.getByRole("button", { name: "Start video" })).toBeFocused();
    await tv.keyboard.press("Enter");
    await expect(page.getByText("Player: playing")).toBeVisible({ timeout: 10_000 });
    await guest.getByRole("tab", { name: "Stage" }).click();
    await expect(guest.getByText("Player: playing")).toBeVisible({ timeout: 10_000 });
    await expect(guest.getByText(`Singer: Alex`)).toBeVisible();
    await expect(page.getByTestId("remote-mic-host")).toContainText("Singer phone microphone");
    await expect(guest.getByTestId("remote-mic-guest").getByRole("button", { name: "Enable my microphone" })).toBeVisible();
    await guest.getByRole("button", { name: "Send Applause" }).click();
    await expect(guest.getByRole("status").filter({ hasText: "Applause sent to the TV" })).toBeVisible();
    await expect(tv.getByLabel("Party reactions")).toContainText("Alex", { timeout: 10_000 });

    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(tv.getByText("Player state: paused")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(tv.getByText("Player state: playing")).toBeVisible({ timeout: 10_000 });
    await tv.evaluate(() => (window as unknown as Window & { __testPlayerEnd: () => void }).__testPlayerEnd());
    await expect(tv.getByRole("heading", { name: titles[1] })).toBeVisible({ timeout: 10_000 });
    await expect(tv.getByTestId("tv-song-start-notice")).toContainText(`Now starting${titles[1]} · Alex`);
    await expect(page.getByText(titles[1]).first()).toBeVisible({ timeout: 10_000 });
    await tv.reload();
    await expect(tv.getByRole("heading", { name: titles[1] })).toBeVisible();
    await expect(tv.getByTestId("tv-player").locator("iframe")).toBeVisible();
    await tv.evaluate(() => (window as unknown as Window & { __testPlayerError: (code: number) => void }).__testPlayerError(150));
    await expect(tv.getByText("Player state: error")).toBeVisible();
    await expect(tv.getByRole("alert").filter({ hasText: "YouTube could not play" })).toContainText("error 150");
    await page.getByRole("button", { name: "Skip current" }).click();
    await expect(tv.getByRole("heading", { name: "Waiting for songs…" })).toBeVisible({ timeout: 10_000 });
  } finally {
    await guestContext.close();
    await audienceContext.close();
    await tvContext.close();
    if (roomId) await db.query("delete from public.rooms where id = $1", [roomId]);
    await db.query("delete from public.song_search_results where query = $1", [query]);
    await db.query("delete from public.song_search_cache where query = $1", [query]);
    await db.end();
  }
});

test("landing Start session provisions this browser as the TV without pairing", async ({ page }) => {
  const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  let roomId: string | undefined;
  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Start session" }).click();
    await expect(page).toHaveURL(/\/tv\/[A-HJ-NP-Z2-9]{6}$/u, { timeout: 15_000 });
    const code = new URL(page.url()).pathname.split("/").pop()!;
    const room = await db.query<{ id: string }>("select id from public.rooms where code = $1", [code]);
    roomId = room.rows[0]?.id;
    await expect(page.getByRole("heading", { name: "Waiting for songs…" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pair this display" })).toHaveCount(0);
    const tvCookie = (await page.context().cookies()).find((cookie) => cookie.name === "mk_tv_session");
    expect(tvCookie?.httpOnly).toBe(true);
  } finally {
    if (roomId) await db.query("delete from public.rooms where id = $1", [roomId]);
    await db.end();
  }
});

test("two guests and a TV recover from reloads and network loss, then stop when the host closes the room", async ({ page, browser }) => {
  test.setTimeout(240_000);
  const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const query = `lifecycle fixture ${randomUUID().slice(0, 8)}`;
  const generation = randomUUID();
  const guestAContext = await browser.newContext();
  const guestBContext = await browser.newContext();
  const tvContext = await browser.newContext();
  let roomId: string | undefined;
  try {
    await db.query("insert into public.song_search_cache (query, generation) values ($1, $2)", [query, generation]);
    await db.query(
      `insert into public.song_search_results (query, youtube_id, title, channel_title, duration_seconds, generation)
       values ($1, 'gBcDeFgHi03', 'Lifecycle Fixture Song', 'Fixture channel', 180, $2)`,
      [query, generation],
    );
    await page.goto("/host");
    await page.getByRole("button", { name: "Create a room" }).click();
    const code = (await page.getByTestId("room-code").textContent())!;
    roomId = (await db.query<{ id: string }>("select id from public.rooms where code = $1", [code])).rows[0].id;
    const searchStatus = await page.evaluate(async ({ roomCode, term }) => (await fetch(`/api/rooms/${roomCode}/search?q=${encodeURIComponent(term)}`)).status, { roomCode: code, term: query });
    expect(searchStatus).toBe(200);
    const guests = [await guestAContext.newPage(), await guestBContext.newPage()];
    for (const [index, guest] of guests.entries()) {
      await guest.goto(`/join?code=${code}`);
      await guest.getByRole("textbox", { name: "Your display name" }).fill(index === 0 ? "Alex" : "Sam");
      await guest.getByRole("button", { name: "Join room" }).click();
      await expect(guest).toHaveURL(new RegExp(`/room/${code}$`), { timeout: 15_000 });
    }
    await expect(page.getByTestId("participant")).toHaveCount(2);
    const tv = await tvContext.newPage();
    await tv.route("https://www.youtube.com/iframe_api", (route) => route.fulfill({ status: 200, contentType: "application/javascript", body: fakeYouTubeApi }));
    await tv.goto(`/tv/${code}`);
    await page.getByRole("button", { name: "Generate TV pairing code" }).click();
    const pairCode = (await page.getByTestId("tv-pair-code").textContent())!;
    await tv.getByRole("textbox", { name: "TV pairing code" }).fill(pairCode);
    await tv.getByRole("button", { name: "Pair this display" }).click();
    await expect(tv.getByRole("heading", { name: "Waiting for songs…" })).toBeVisible();
    await guests[0].getByRole("searchbox", { name: "Search YouTube karaoke" }).fill(query);
    await expect(guests[0].getByText("Lifecycle Fixture Song")).toBeVisible();
    await guests[0].getByRole("button", { name: "Add" }).click();
    await expect(guests[0].getByText("Lifecycle Fixture Song is starting on the TV.")).toBeVisible({ timeout: 30_000 });
    await expect(guests[1].getByTestId("queue-item")).toHaveCount(0);
    await expect(tv.getByRole("heading", { name: "Lifecycle Fixture Song" })).toBeVisible();
    await expect(guests[0].getByTestId("remote-mic-guest")).toBeVisible();
    await expect(guests[1].getByTestId("remote-mic-guest")).toHaveCount(0);
    await tv.getByRole("button", { name: "Start video" }).click();
    await expect(page.getByText("Player: playing")).toBeVisible();

    await guestAContext.setOffline(true);
    await expect(guests[0].getByText("Connection interrupted. Reconnecting…", { exact: true })).toBeVisible({ timeout: 15_000 });
    await guestAContext.setOffline(false);
    await expect(guests[0].getByText("Connection interrupted. Reconnecting…", { exact: true })).toHaveCount(0, { timeout: 15_000 });
    await page.reload();
    await expect(page.getByTestId("room-code")).toHaveText(code);
    await guests[0].reload();
    await expect(guests[0].getByTestId("participant")).toHaveCount(2);
    await guests[1].reload();
    await expect(guests[1].getByText("Lifecycle Fixture Song").first()).toBeVisible();
    await tv.reload();
    await expect(tv.getByTestId("tv-player").locator("iframe")).toBeVisible();

    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "End room" }).click();
    await expect(page.getByRole("button", { name: "Create a room" })).toBeVisible();
    await expect(tv.getByRole("alert").filter({ hasText: "Playback has stopped" })).toBeVisible({ timeout: 10_000 });
    await expect(tv.getByTestId("tv-player")).toHaveCount(0);
    for (const guest of guests) {
      await expect(guest.getByRole("alert").filter({ hasText: "This room ended or your access expired" }).first()).toBeVisible({ timeout: 10_000 });
      await expect(guest.getByRole("searchbox", { name: "Search YouTube karaoke" })).toHaveCount(0);
    }
  } finally {
    await guestAContext.close();
    await guestBContext.close();
    await tvContext.close();
    if (roomId) await db.query("delete from public.rooms where id = $1", [roomId]);
    await db.query("delete from public.song_search_results where query = $1", [query]);
    await db.query("delete from public.song_search_cache where query = $1", [query]);
    await db.end();
  }
});
