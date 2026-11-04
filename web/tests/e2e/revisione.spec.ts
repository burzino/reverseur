// Regressions for the code-review findings fixed in the UI (STATO.md › Code Review › Correzioni UI).
import { test, expect, type Page } from "@playwright/test";
import { openApp, slot, action, spyCount, spySince, storeState, press, recordSlot } from "./helpers";

const app = (page: Page) => page.locator("#app");

/** Pretends the page went to the background (or came back) and fires visibilitychange. */
async function setHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((h) => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (h ? "hidden" : "visible") });
    Object.defineProperty(document, "hidden", { configurable: true, get: () => h });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

async function rerecord(page: Page, id: "A" | "B", ms = 1200): Promise<void> {
  const s = slot(page, id);
  await action(page, id, "record").click();
  await s.locator("[data-action=confirm-rerecord]").click();
  await expect(s).toHaveAttribute("data-state", "recording");
  await page.waitForTimeout(ms);
  await action(page, id, "record").click();
  await expect(s).toHaveAttribute("data-state", "ready", { timeout: 10_000 });
}

test.describe("revealed state across rounds", () => {
  test("re-recording A after Reveal starts a new hidden round", async ({ page }) => {
    await openApp(page);
    await recordSlot(page, "A");
    await recordSlot(page, "B");
    await press(page, page.locator("#reveal"), 300);
    await expect(app(page)).toHaveAttribute("data-revealed", "true");
    await expect(action(page, "A", "download")).toBeEnabled();

    await rerecord(page, "A");
    await expect(app(page)).toHaveAttribute("data-revealed", "false");
    expect((await storeState(page)).revealed).toBe(false);
    expect(await page.evaluate(() => (window as any).__reverseur.store.getState().verdict)).toBeNull();

    // A's original is protected again: a 50 ms tap plays nothing.
    const n = await spyCount(page);
    await press(page, action(page, "A", "play-original"), 50);
    await page.waitForTimeout(300);
    expect(await spyCount(page)).toBe(n);
    await expect(action(page, "A", "download")).toBeDisabled();
    // The score buttons are hidden until the next reveal.
    await expect(page.locator("#score [data-action=guessed]")).toBeHidden();
  });

  test("re-recording B after Reveal keeps the round revealed", async ({ page }) => {
    await openApp(page);
    await recordSlot(page, "A");
    await recordSlot(page, "B");
    await press(page, page.locator("#reveal"), 300);
    await expect(app(page)).toHaveAttribute("data-revealed", "true");
    await rerecord(page, "B");
    await expect(app(page)).toHaveAttribute("data-revealed", "true");
  });

  test("tapping Rivela while A's original plays only stops it", async ({ page }) => {
    await openApp(page);
    await recordSlot(page, "A");
    await press(page, action(page, "A", "play-original"), 300);
    await expect.poll(() => storeState(page).then((s) => s.playing)).toEqual({ slot: "A", mode: "original" });
    const n = await spyCount(page);
    await press(page, page.locator("#reveal"), 50);
    await expect.poll(() => storeState(page).then((s) => s.playing)).toBeNull();
    await expect(app(page)).toHaveAttribute("data-revealed", "false");
    expect(await spySince(page, n)).toEqual([]);
  });
});

test.describe("page hidden while recording", () => {
  test("stops and keeps the take when hidden after the minimum length", async ({ page }) => {
    await openApp(page);
    await action(page, "A", "record").click();
    await expect(slot(page, "A")).toHaveAttribute("data-state", "recording");
    await page.waitForTimeout(1200);
    await setHidden(page, true);
    await expect(slot(page, "A")).toHaveAttribute("data-state", "ready", { timeout: 10_000 });
    expect((await storeState(page)).A.originalDuration).toBeGreaterThan(0);
    await setHidden(page, false);
  });

  test("cancels a take shorter than 300 ms", async ({ page }) => {
    await openApp(page);
    await action(page, "A", "record").click();
    await expect(slot(page, "A")).toHaveAttribute("data-state", "recording");
    await setHidden(page, true);
    await expect(slot(page, "A")).toHaveAttribute("data-state", "empty");
    await expect(slot(page, "A").locator("[role=alert]")).toHaveCount(0);
    await setHidden(page, false);
    // The microphone is free again.
    await recordSlot(page, "A", 800);
  });
});

test.describe("recorder errors", () => {
  test("microphone track ending mid-take restores the slot and shows an error", async ({ page }) => {
    await page.addInitScript(() => {
      const md = navigator.mediaDevices;
      const orig = md.getUserMedia.bind(md);
      md.getUserMedia = async (c) => {
        const s = await orig(c);
        (window as any).__lastStream = s;
        return s;
      };
    });
    await openApp(page);
    await recordSlot(page, "A", 800);
    const before = (await storeState(page)).A.originalDuration;
    await action(page, "A", "record").click();
    await slot(page, "A").locator("[data-action=confirm-rerecord]").click();
    await expect(slot(page, "A")).toHaveAttribute("data-state", "recording");
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const t: MediaStreamTrack = (window as any).__lastStream.getAudioTracks()[0];
      t.stop();
      t.dispatchEvent(new Event("ended")); // stop() alone does not fire "ended"
    });
    await expect(slot(page, "A")).toHaveAttribute("data-state", "ready");
    await expect(slot(page, "A").locator("[role=alert]")).toContainText("interrotta");
    expect((await storeState(page)).A.originalDuration).toBe(before);
  });

  test("Nuova during the permission prompt, then Registra, records normally", async ({ page }) => {
    await page.addInitScript(() => {
      const md = navigator.mediaDevices;
      const orig = md.getUserMedia.bind(md);
      let first = true;
      md.getUserMedia = async (c) => {
        if (first) {
          first = false;
          await new Promise((r) => setTimeout(r, 1500)); // a slow permission prompt
        }
        return orig(c);
      };
    });
    await openApp(page);
    await action(page, "A", "record").click();
    await expect(action(page, "A", "record")).toHaveAttribute("aria-busy", "true");
    await page.locator("#new-game").click();
    await page.locator("[data-action=confirm-new]").click();
    await action(page, "A", "record").click();
    await expect(slot(page, "A")).toHaveAttribute("data-state", "recording", { timeout: 5000 });
    await expect(page.locator("#mic-error")).toBeHidden();
    await page.waitForTimeout(2000); // the first, cancelled start() resolves meanwhile
    await expect(slot(page, "A")).toHaveAttribute("data-state", "recording");
    await action(page, "A", "record").click();
    await expect(slot(page, "A")).toHaveAttribute("data-state", "ready", { timeout: 10_000 });
    await expect(page.locator("#mic-error")).toBeHidden();
  });
});

test.describe("focus after inline confirms", () => {
  test("closing the Nuova confirm returns focus to Nuova", async ({ page }) => {
    await openApp(page);
    await page.locator("#new-game").click();
    await expect(page.locator("[data-action=cancel-new]")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator("#new-game")).toBeFocused();

    await page.locator("#new-game").click();
    await page.locator("[data-action=confirm-new]").click();
    await expect(page.locator("#new-game")).toBeFocused();
  });

  test("closing the re-record confirm returns focus to Registra", async ({ page }) => {
    await openApp(page);
    await recordSlot(page, "A", 800);
    const rec = action(page, "A", "record");
    await rec.click();
    await slot(page, "A").locator("[data-action=cancel-rerecord]").click();
    await expect(rec).toBeFocused();

    await rec.click();
    await slot(page, "A").locator("[data-action=confirm-rerecord]").click();
    await expect(slot(page, "A")).toHaveAttribute("data-state", "recording");
    await expect(rec).toBeFocused();
    await rec.click();
    await expect(slot(page, "A")).toHaveAttribute("data-state", "ready", { timeout: 10_000 });
  });
});
