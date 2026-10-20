import { defineConfig, devices } from "@playwright/test";

const origin = process.env.MYKARAOKE_PRODUCTION_ORIGIN ?? "https://mykaraoke-virid.vercel.app";
const parsedOrigin = new URL(origin);

if (parsedOrigin.protocol !== "https:" || parsedOrigin.pathname !== "/") {
  throw new Error("MYKARAOKE_PRODUCTION_ORIGIN must be a plain HTTPS origin");
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "shell.spec.ts",
  fullyParallel: true,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 3,
  retries: 1,
  reporter: "list",
  use: {
    baseURL: parsedOrigin.origin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "desktop-firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "desktop-webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
    { name: "mobile-webkit", use: { ...devices["iPhone 15"] } },
    {
      name: "tv-viewport-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
});
