import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("host creates a real room, recovers after refresh, and cannot be impersonated with its code", async ({ page, browser }) => {
  await page.goto("/host");
  await page.getByRole("button", { name: "Create a room" }).click();
  const roomCode = page.getByTestId("room-code");
  await expect(roomCode).toHaveText(/^[A-HJ-NP-Z2-9]{6}$/);
  const code = (await roomCode.textContent())!;
  const hostCookie = (await page.context().cookies()).find((cookie) => cookie.name === "mk_host_session");
  expect(hostCookie?.httpOnly).toBe(true);
  expect(await page.evaluate(() => document.cookie.includes("mk_host_session"))).toBe(false);
  const duplicateCode = await page.evaluate(async () => {
    const response = await fetch("/api/rooms", { method: "POST" });
    return (await response.json()).code as string;
  });
  expect(duplicateCode).toBe(code);
  const inviteLink = page.getByRole("textbox", { name: "Invite link" });
  await expect(inviteLink).toHaveValue(`http://127.0.0.1:3100/join?code=${code}`);
  await expect(page.getByRole("img", { name: `QR code for room ${code} invite link` })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);

  await page.reload();
  await expect(roomCode).toHaveText(code);
  const crossOriginClose = await page.request.post(`/api/rooms/${code}/close`, { headers: { origin: "https://untrusted.example" } });
  expect(crossOriginClose.status()).toBe(403);
  await expect(roomCode).toHaveText(code);

  const outsiderContext = await browser.newContext();
  try {
    const outsider = await outsiderContext.newPage();
    await outsider.goto("/host");
    const unauthorizedStatus = await outsider.evaluate(async (room) => {
      const response = await fetch(`/api/rooms/${room}/close`, { method: "POST" });
      return response.status;
    }, code);
    expect(unauthorizedStatus).toBe(403);
    await expect(outsider.getByRole("button", { name: "Create a room" })).toBeVisible();
  } finally {
    await outsiderContext.close();
  }

  await page.goto(`/join?code=${code}`);
  await expect(page.getByRole("textbox", { name: "Room code" })).toHaveValue(code);
  await expect(page.getByRole("textbox", { name: "Room code" })).toBeEnabled();
  await page.getByRole("textbox", { name: "Your display name" }).fill("Host Preview");
  await page.getByRole("button", { name: "Join room" }).click();
  await expect(page).toHaveURL(new RegExp(`/room/${code}$`));
  await expect(page.getByTestId("participant")).toContainText("Host PreviewHere");
  const guestAccessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(guestAccessibility.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.goto("/host");
  await expect(roomCode).toHaveText(code);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "End room" }).click();
  await expect(page.getByRole("button", { name: "Create a room" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Create a room" })).toBeVisible();
});

test("host and two guests see the same roster, with refresh and brief offline recovery", async ({ page, browser }) => {
  await page.goto("/host");
  await page.getByRole("button", { name: "Create a room" }).click();
  const code = (await page.getByTestId("room-code").textContent())!;
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  try {
    const first = await firstContext.newPage();
    const second = await secondContext.newPage();
    for (const guest of [first, second]) {
      await guest.goto(`/join?code=${code}`);
      await expect(guest.getByRole("textbox", { name: "Room code" })).toHaveValue(code);
      await guest.getByRole("textbox", { name: "Your display name" }).fill("Alex");
      await guest.getByRole("button", { name: "Join room" }).click();
      await expect(guest).toHaveURL(new RegExp(`/room/${code}$`));
    }
    for (const surface of [page, first, second]) {
      await expect(surface.getByTestId("participant")).toHaveCount(2, { timeout: 15_000 });
      await expect(surface.getByTestId("participant").nth(0)).toContainText("Alex");
      await expect(surface.getByTestId("participant").nth(1)).toContainText("Alex (2)");
    }
    const guestCookie = (await firstContext.cookies()).find((cookie) => cookie.name === "mk_guest_session");
    expect(guestCookie?.httpOnly).toBe(true);
    expect(await first.evaluate(() => document.cookie.includes("mk_guest_session"))).toBe(false);

    await first.reload();
    await expect(first.getByRole("heading", { level: 1 })).toContainText("Welcome, Alex.");
    await expect(page.getByTestId("participant")).toHaveCount(2);

    await firstContext.setOffline(true);
    await expect(first.getByText("Connection interrupted. Reconnecting…")).toBeVisible({ timeout: 15_000 });
    await firstContext.setOffline(false);
    await expect(first.getByTestId("participant")).toHaveCount(2, { timeout: 15_000 });
    await expect(first.getByText("Connection interrupted. Reconnecting…")).toBeHidden();
    await expect(page.getByTestId("participant")).toHaveCount(2);

    await second.getByRole("button", { name: "Leave room" }).click();
    await expect(second).toHaveURL(/\/join$/);
    await expect(page.getByTestId("participant")).toHaveCount(1, { timeout: 15_000 });
  } finally {
    await firstContext.close();
    await secondContext.close();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "End room" }).click();
  }
});

test("join rejects bad names, unknown codes, and ended rooms with clear errors", async ({ page, browser }) => {
  await page.goto("/join");
  await page.getByRole("textbox", { name: "Room code" }).fill("ABC234");
  await page.getByRole("textbox", { name: "Your display name" }).fill("<script>");
  await page.getByRole("button", { name: "Join room" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("Use 2–24");
  await page.getByRole("textbox", { name: "Your display name" }).fill("Guest");
  await page.getByRole("button", { name: "Join room" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("No room has that code");

  const hostContext = await browser.newContext();
  try {
    const host = await hostContext.newPage();
    await host.goto("/host");
    await host.getByRole("button", { name: "Create a room" }).click();
    const code = (await host.getByTestId("room-code").textContent())!;
    host.once("dialog", (dialog) => dialog.accept());
    await host.getByRole("button", { name: "End room" }).click();
    await expect(host.getByRole("button", { name: "Create a room" })).toBeVisible();
    await page.getByRole("textbox", { name: "Room code" }).fill(code);
    await page.getByRole("button", { name: "Join room" }).click();
    await expect(page.locator("form [role=alert]")).toContainText("ended or expired");
  } finally {
    await hostContext.close();
  }
});
