import { Pool } from "pg";
import { expect, test } from "@playwright/test";

test("host theme changes synchronize to guest and paired TV browsers", async ({
  page,
  browser,
}) => {
  const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const guestContext = await browser.newContext();
  const tvContext = await browser.newContext();
  let roomId: string | undefined;
  try {
    await page.goto("/host");
    await page.getByRole("button", { name: "Create a room" }).click();
    const code = (await page.getByTestId("room-code").textContent())!;
    roomId = (
      await db.query<{ id: string }>(
        "select id from public.rooms where code = $1",
        [code],
      )
    ).rows[0].id;

    const guest = await guestContext.newPage();
    await guest.goto(`/join?code=${code}`);
    await guest.getByRole("textbox", { name: "Your display name" }).fill("Theme Guest");
    await guest.getByRole("button", { name: "Join room" }).click();
    await expect(guest).toHaveURL(new RegExp(`/room/${code}$`));

    const tv = await tvContext.newPage();
    await tv.goto(`/tv/${code}`);
    await page.getByRole("button", { name: "Generate TV pairing code" }).click();
    await tv
      .getByRole("textbox", { name: "TV pairing code" })
      .fill((await page.getByTestId("tv-pair-code").textContent())!);
    await tv.getByRole("button", { name: "Pair this display" }).click();
    await expect(tv.getByText("Waiting for the next song")).toBeVisible();

    await page.getByRole("button", { name: "Use Electric Blue party theme" }).click();
    for (const surface of [page, guest, tv]) {
      await expect(surface.locator("html")).toHaveAttribute(
        "data-party-theme",
        "electric-blue",
        { timeout: 10_000 },
      );
    }
    await expect(guest.getByText("The host selected Electric Blue.")).toBeVisible();

    await guest.reload();
    await tv.reload();
    await expect(guest.locator("html")).toHaveAttribute(
      "data-party-theme",
      "electric-blue",
      { timeout: 10_000 },
    );
    await expect(tv.locator("html")).toHaveAttribute(
      "data-party-theme",
      "electric-blue",
      { timeout: 10_000 },
    );

    const guestStatus = await guest.evaluate(
      async (roomCode) =>
        (
          await fetch(`/api/rooms/${roomCode}/settings/theme`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ themeId: "velvet-gold" }),
          })
        ).status,
      code,
    );
    expect(guestStatus).toBe(403);
  } finally {
    await guestContext.close();
    await tvContext.close();
    if (roomId) await db.query("delete from public.rooms where id = $1", [roomId]);
    await db.end();
  }
});
