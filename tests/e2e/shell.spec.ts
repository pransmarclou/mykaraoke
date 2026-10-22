import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("landing page routes to the two entry experiences", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Your songs\.\s*Your stage\.\s*Your party\./,
  );
  await expect(page.getByRole("heading", { name: "Host a room" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Room code" })).toBeEnabled();
  await expect(page.getByRole("textbox", { name: "Your display name" })).toBeEnabled();
  await expect(page.getByText("Rooms, shared songs, TV playback, and local Microphone Studio are live.")).toBeVisible();

  await page.getByRole("link", { name: "Start a room" }).click();
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

test("unpaired TV actions support directional remote focus", async ({ page }) => {
  await page.goto("/tv/ABC234");
  const pairCode = page.getByRole("textbox", { name: "TV pairing code" });
  const pairButton = page.getByRole("button", { name: "Pair this display" });

  await expect(page.locator("html")).toHaveAttribute("data-tv-remote-ready", "true");
  await page.keyboard.press("ArrowDown");
  await expect(pairCode).toBeFocused();
  await pairCode.fill("ABCDEFGH");
  await page.keyboard.press("ArrowDown");
  await expect(pairButton).toBeFocused();
});

test("TV setup fits a 720p display and its waiting video supports byte ranges", async ({ page, request }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/tv/ABC234");

  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
  expect(dimensions.height).toBeLessThanOrEqual(dimensions.viewportHeight + 1);

  const response = await request.get("/media/tv-videoke-family-loop.mp4", {
    headers: { Range: "bytes=0-1023" },
  });
  expect(response.status()).toBe(206);
  expect(response.headers()["content-type"]).toContain("video/mp4");
  expect(response.headers()["accept-ranges"]).toBe("bytes");
  expect(response.headers()["content-range"]).toMatch(/^bytes 0-1023\/\d+$/u);
  expect((await response.body()).byteLength).toBe(1_024);
});

test("entry surfaces have no horizontal overflow", async ({ page }) => {
  for (const path of ["/", "/host", "/join", "/compatibility", "/tv/ABC234"]) {
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
  for (const path of ["/", "/host", "/join", "/compatibility", "/tv/ABC234"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, `${path} accessibility violations`).toEqual([]);
  }
});

test("compatibility page distinguishes browser detection from real-device evidence", async ({ page }) => {
  await page.goto("/compatibility");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Know what is ready before the party starts.");
  await expect(page.getByRole("heading", { name: "Browser capability check" })).toBeVisible();
  await expect(page.getByTestId("browser-readiness-checks").getByRole("listitem")).toHaveCount(4);
  await expect(page.getByText(/does not request microphone permission/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Evidence recorded" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Still to verify" })).toBeVisible();
});

test("page responses apply the web MVP security and privacy policy", async ({ request }) => {
  const response = await request.get("/compatibility");
  expect(response.ok()).toBe(true);

  const headers = response.headers();
  expect(headers["strict-transport-security"]).toBe("max-age=31536000");
  expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toBe(
    "camera=(), geolocation=(), microphone=(self), payment=(), usb=(), browsing-topics=()",
  );
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
    await expect(page.locator('main img[src*="microphone-logo"], main img[src*="mykaraoke-wordmark"]').first()).toBeVisible();
    expect(await page.locator("body").evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--primary").trim())).toBe("#d92362");
  }
});

test("party theme choice is accessible and persists in this browser", async ({ page }) => {
  await page.goto("/");

  const picker = page.getByRole("button", { name: /Party theme: Stage Glow/ });
  await expect(picker).toBeVisible();
  await picker.click();
  await expect(page.locator("html")).toHaveAttribute("data-party-theme", "electric-blue");
  await expect
    .poll(() => page.locator("html").evaluate((element) => getComputedStyle(element).getPropertyValue("--primary").trim()))
    .toBe("#0b7285");
  const electricResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(electricResults.violations).toEqual([]);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-party-theme", "electric-blue");
  await expect(page.getByRole("button", { name: /Party theme: Electric Blue/ })).toBeVisible();

  await page.getByRole("button", { name: /Party theme: Electric Blue/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-party-theme", "velvet-gold");
  const velvetResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(velvetResults.violations).toEqual([]);
});
