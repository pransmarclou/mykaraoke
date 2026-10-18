import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("landing page routes to the two entry experiences", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Your songs\.Your stage\.Your party\./,
  );
  await expect(page.getByText("Rooms and joining are live. Song search and playback are next.")).toBeVisible();

  await page.getByRole("link", { name: "Explore hosting" }).click();
  await expect(page).toHaveURL(/\/host$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Set the stage for everyone.");
  await expect(page.getByRole("button", { name: "Create a room" })).toBeEnabled();

  await page.getByRole("link", { name: "Explore joining" }).click();
  await expect(page).toHaveURL(/\/join$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your next song starts here.");
  await expect(page.getByRole("textbox", { name: "Room code" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Join room" })).toBeEnabled();
});

test("main navigation and recovery pages stay usable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "How it works" }).first().click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect(page.getByRole("heading", { name: "A whole party, one shared rhythm." })).toBeVisible();

  await page.goto("/a-page-that-does-not-exist");
  await expect(page.getByRole("heading", { name: "No song at this address." })).toBeVisible();
  await page.getByRole("link", { name: "Return home" }).click();
  await expect(page).toHaveURL("/");
});

test("entry surfaces have no horizontal overflow", async ({ page }) => {
  for (const path of ["/", "/host", "/join"]) {
    await page.goto(path);
    const widths = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(widths.document, `${path} overflows horizontally`).toBeLessThanOrEqual(
      widths.viewport + 1,
    );
  }
});

test("shell has no detectable WCAG A/AA violations", async ({ page }) => {
  for (const path of ["/", "/host", "/join"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, `${path} accessibility violations`).toEqual([]);
  }
});

test("owner branding loads on landing and host pages", async ({ page }) => {
  for (const path of ["/", "/host"]) {
    await page.goto(path);
    const brand = page.getByRole("link", { name: "MyKaraoke home" });
    await expect(brand.locator('img[src*="microphone-logo"]')).toBeVisible();
    await expect(brand.locator('img[src*="mykaraoke-wordmark"]')).toBeVisible();
    await expect
      .poll(() => brand.locator("img").evaluateAll((images) => images.every((image) => (image as HTMLImageElement).naturalWidth > 0)))
      .toBe(true);
    await expect(page.locator('.entry-logo, .stage-logo')).toBeVisible();
    expect(await page.locator("body").evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--primary").trim())).toBe("#d92362");
  }
});
