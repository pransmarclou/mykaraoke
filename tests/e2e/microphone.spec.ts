import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function installMicrophoneMocks(page: Page, permission: "granted" | "denied") {
  await page.addInitScript(({ permissionState }) => {
    type TestWindow = Window & typeof globalThis & {
      __microphoneTest: { disconnect: () => void; suspend: () => void };
    };

    class FakeTrack extends EventTarget {
      kind = "audio";
      label = "Built-in microphone";
      enabled = true;
      muted = false;
      readyState = "live";
      constructor(private readonly deviceId: string) { super(); }
      getSettings() { return { deviceId: this.deviceId }; }
      stop() { this.readyState = "ended"; }
    }

    class FakeNode {
      connect(destination: unknown) { return destination; }
      disconnect() {}
    }

    class FakeAudioContext extends EventTarget {
      static latest: FakeAudioContext | null = null;
      state: AudioContextState = "running";
      sampleRate = 48_000;
      destination = new FakeNode();
      onstatechange: (() => void) | null = null;
      constructor() { super(); FakeAudioContext.latest = this; }
      createMediaStreamSource() { return new FakeNode(); }
      createGain() { return Object.assign(new FakeNode(), { gain: { value: 1 } }); }
      createAnalyser() {
        return Object.assign(new FakeNode(), {
          fftSize: 1024,
          getFloatTimeDomainData: (values: Float32Array) => values.fill(0.08),
        });
      }
      createDynamicsCompressor() {
        return Object.assign(new FakeNode(), {
          threshold: { value: 0 }, ratio: { value: 1 }, attack: { value: 0 }, release: { value: 0 },
        });
      }
      createConvolver() { return Object.assign(new FakeNode(), { buffer: null }); }
      createBuffer(channels: number, frames: number) {
        const data = Array.from({ length: channels }, () => new Float32Array(frames));
        return { numberOfChannels: channels, getChannelData: (channel: number) => data[channel] };
      }
      async resume() { this.state = "running"; this.onstatechange?.(); }
      async close() { this.state = "closed"; this.onstatechange?.(); }
      suspendForTest() { this.state = "suspended"; this.onstatechange?.(); }
    }

    const devices = [
      { deviceId: "built-in", groupId: "local", kind: "audioinput", label: "Built-in microphone", toJSON() { return this; } },
      { deviceId: "usb-interface", groupId: "usb", kind: "audioinput", label: "USB Audio Interface", toJSON() { return this; } },
    ];
    const mediaDevices = new EventTarget() as EventTarget & {
      getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
      enumerateDevices: () => Promise<MediaDeviceInfo[]>;
    };
    let activeTrack: FakeTrack | null = null;
    mediaDevices.enumerateDevices = async () => devices as unknown as MediaDeviceInfo[];
    mediaDevices.getUserMedia = async (constraints) => {
      if (permissionState === "denied") throw new DOMException("Permission denied", "NotAllowedError");
      const audio = typeof constraints.audio === "object" ? constraints.audio : undefined;
      const requested = audio?.deviceId;
      const deviceId = typeof requested === "object" && "exact" in requested ? String(requested.exact) : "built-in";
      activeTrack = new FakeTrack(deviceId);
      return {
        getAudioTracks: () => [activeTrack],
        getTracks: () => [activeTrack],
      } as unknown as MediaStream;
    };
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: mediaDevices });
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: FakeAudioContext,
    });
    (window as TestWindow).__microphoneTest = {
      disconnect: () => activeTrack?.dispatchEvent(new Event("ended")),
      suspend: () => FakeAudioContext.latest?.suspendForTest(),
    };
  }, { permissionState: permission });
}

async function createHostRoom(page: Page) {
  await page.goto("/host");
  await page.getByRole("button", { name: "Create a room" }).click();
  await expect(page.getByTestId("room-code")).toBeVisible();
}

test("host recovers from denied microphone permission", async ({ page }) => {
  await installMicrophoneMocks(page, "denied");
  await createHostRoom(page);
  await page.getByRole("button", { name: "Enable microphone" }).click();
  await expect(page.getByTestId("microphone-status")).toHaveText("Permission denied");
  await expect(page.getByRole("alert").filter({ hasText: "Microphone permission was denied" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry microphone" })).toBeEnabled();
});

test("host controls local monitoring and recovers after device loss", async ({ page }) => {
  await installMicrophoneMocks(page, "granted");
  await createHostRoom(page);
  await page.getByRole("button", { name: "Enable microphone" }).click();
  await expect(page.getByTestId("microphone-status")).toHaveText("Mic ready · monitor off");
  await expect(page.getByRole("combobox", { name: "Input device" })).toHaveValue("built-in");
  await expect.poll(async () => Number(await page.getByRole("meter", { name: "Microphone input level" }).getAttribute("aria-valuenow"))).toBeGreaterThan(0);

  await page.getByRole("combobox", { name: "Input device" }).selectOption({ label: "USB Audio Interface" });
  await expect(page.getByRole("combobox", { name: "Input device" })).toHaveValue("usb-interface");
  await page.getByRole("slider", { name: "Microphone gain" }).fill("125");
  await page.getByRole("slider", { name: "Room reverb" }).fill("30");
  await page.getByRole("checkbox", { name: /Voice compression/ }).check();
  await page.getByRole("button", { name: "Start monitoring" }).click();
  await expect(page.getByTestId("microphone-status")).toHaveText("Monitoring locally");

  await page.evaluate(() => (window as Window & typeof globalThis & { __microphoneTest: { suspend: () => void } }).__microphoneTest.suspend());
  await expect(page.getByTestId("microphone-status")).toHaveText("Audio paused by browser");
  await page.getByRole("button", { name: "Resume audio" }).click();
  await expect(page.getByTestId("microphone-status")).toHaveText("Monitoring locally");

  await page.evaluate(() => (window as Window & typeof globalThis & { __microphoneTest: { disconnect: () => void } }).__microphoneTest.disconnect());
  await expect(page.getByTestId("microphone-status")).toHaveText("Microphone disconnected");
  await expect(page.getByRole("alert").filter({ hasText: "stopped or was unplugged" })).toBeVisible();
  await page.getByRole("button", { name: "Retry microphone" }).click();
  await expect(page.getByTestId("microphone-status")).toHaveText("Mic ready · monitor off");

  const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});
