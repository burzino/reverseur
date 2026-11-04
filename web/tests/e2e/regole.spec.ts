// Game rules on the real app (./?test): disabled buttons, hold guard on the
// buttons that reveal the answer, one sound at a time, inline confirms,
// auto-stop, silence trimming, denied microphone.
import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  openApp, slot, action, spySince, spyCount, storeState, rawDuration,
  recordSlot, press, pressAndLeave, probe,
} from "./helpers";

test.describe("empty slots", () => {
  test("play buttons are disabled until the slot has a recording", async ({ page }) => {
    await openApp(page);
    for (const id of ["A", "B"] as const) {
      for (const name of ["play-reversed", "play-original"]) {
        await expect(action(page, id, name)).toBeDisabled();
      }
      await expect(action(page, id, "record")).toBeEnabled();
    }
    // Pressing a disabled play button does nothing.
    await press(page, action(page, "A", "play-original"), 300);
    await action(page, "B", "play-reversed").click({ force: true });
    expect(await spyCount(page)).toBe(0);

    await recordSlot(page, "A");
    await expect(action(page, "A", "play-reversed")).toBeEnabled();
    await expect(action(page, "A", "play-original")).toBeEnabled();
    await expect(action(page, "B", "play-reversed")).toBeDisabled();
    await expect(action(page, "B", "play-original")).toBeDisabled();
  });
});

test.describe("with A recorded", () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await recordSlot(page, "A");
  });

  // A tap is only meaningful if the page really processed the release before
  // HOLD_TO_PLAY_MS; a runner stall (heavy parallel load) can stretch it. Such
  // attempts are discarded and redone on a fresh page, at most 3 times.
  async function shortTap(page: Page, target: () => Locator): Promise<number> {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await openApp(page);
        await recordSlot(page, "A");
      }
      const n = await spyCount(page);
      const read = await probe(target());
      await press(page, target(), 50);
      const timing = await read();
      if (timing.upAt > 0 && timing.upAt < 190) return n;
      test.info().annotations.push({ type: "timing", description: `tap discarded ${JSON.stringify(timing)}` });
    }
    throw new Error("no 50 ms tap with valid timing in 3 attempts");
  }

  test("50 ms tap on A 'Ascolta originale' does not play and shows the hold hint", async ({ page }) => {
    test.setTimeout(60_000);
    const hint = slot(page, "A").locator("[data-role=hold-hint]");
    await expect(hint).not.toHaveText(/Tieni premuto/);
    const n = await shortTap(page, () => action(page, "A", "play-original"));
    await expect(hint).toBeVisible();
    await expect(hint).toHaveText(/Tieni premuto/);
    await page.waitForTimeout(400); // longer than HOLD_TO_PLAY_MS: nothing may start late
    expect(await spySince(page, n)).toEqual([]);
    await expect(slot(page, "A")).toHaveAttribute("data-state", "ready");
  });

  test("50 ms tap on Rivela does not play or reveal and shows the hold hint", async ({ page }) => {
    test.setTimeout(60_000);
    const n = await shortTap(page, () => page.locator("#reveal"));
    await expect(page.locator("#reveal")).toHaveClass(/is-shake/);
    // Hint next to #reveal (the live region sibling of the button, not its static sub-label).
    const hint = page.locator(":has(> #reveal) > [aria-live=polite]");
    await expect(hint).toBeVisible();
    await expect(hint).toHaveText(/Tieni premuto/);
    await page.waitForTimeout(400);
    expect(await spySince(page, n)).toEqual([]);
    await expect(page.locator("#app")).toHaveAttribute("data-revealed", "false");
    await expect(page.locator("#score")).toBeHidden();
  });

  test("250 ms press on A 'Ascolta originale' plays the original", async ({ page }) => {
    const n = await spyCount(page);
    await press(page, action(page, "A", "play-original"), 250);
    await expect.poll(() => spySince(page, n)).toEqual([{ slot: "A", mode: "original" }]);
    await expect(slot(page, "A")).toHaveAttribute("data-state", "playing");
    await expect(action(page, "A", "play-original")).toHaveAttribute("aria-pressed", "true");
    // Playing the original of A does not count as a reveal.
    await expect(page.locator("#app")).toHaveAttribute("data-revealed", "false");
    await expect(slot(page, "A")).toHaveAttribute("data-state", "ready", { timeout: 5_000 });
  });

  test("250 ms press leaving the button at 100 ms does nothing (A original and Rivela)", async ({ page }) => {
    test.setTimeout(60_000);
    for (const which of ["A", "reveal"] as const) {
      const target = () => (which === "A" ? action(page, "A", "play-original") : page.locator("#reveal"));
      // The pointer must really have left before HOLD_TO_PLAY_MS and been released after it,
      // otherwise the attempt says nothing about the rule (test runner stalled under load):
      // such attempts are discarded and redone on a fresh page, at most 3 times.
      let checked = false;
      for (let attempt = 0; attempt < 3 && !checked; attempt++) {
        if (attempt > 0) {
          await openApp(page);
          await recordSlot(page, "A");
        }
        const n = await spyCount(page);
        const read = await probe(target());
        await pressAndLeave(page, target(), 100, 250);
        await page.waitForTimeout(400);
        const timing = await read();
        if (timing.leftAt <= 0 || timing.leftAt >= 190 || timing.upAt < 200) {
          test.info().annotations.push({ type: "timing", description: `${which}: discarded ${JSON.stringify(timing)}` });
          continue;
        }
        checked = true;
        expect(await spySince(page, n), `${which}: nothing may play (${JSON.stringify(timing)})`).toEqual([]);
      }
      expect(checked, `${which}: no attempt with valid timing`).toBe(true);
    }
    await expect(slot(page, "A")).toHaveAttribute("data-state", "ready");
    await expect(page.locator("#app")).toHaveAttribute("data-revealed", "false");
  });

  test("pressing the same play button again stops playback", async ({ page }) => {
    const A = slot(page, "A");
    // Reversed: plain tap starts, plain tap stops.
    let n = await spyCount(page);
    await action(page, "A", "play-reversed").click();
    await expect(A).toHaveAttribute("data-state", "playing");
    await action(page, "A", "play-reversed").click();
    await expect(A).toHaveAttribute("data-state", "ready");
    await expect(action(page, "A", "play-reversed")).not.toHaveAttribute("aria-pressed", "true");
    expect(await spySince(page, n)).toEqual([{ slot: "A", mode: "reversed" }]); // stop starts nothing
    expect((await storeState(page)).playing).toBeNull();

    // Original of A: long press starts, a simple tap stops (bypass while playing).
    n = await spyCount(page);
    await press(page, action(page, "A", "play-original"), 250);
    await expect(A).toHaveAttribute("data-state", "playing");
    await press(page, action(page, "A", "play-original"), 30);
    await expect(A).toHaveAttribute("data-state", "ready");
    await page.waitForTimeout(300);
    expect(await spySince(page, n)).toEqual([{ slot: "A", mode: "original" }]);
    expect((await storeState(page)).playing).toBeNull();
  });

  test("re-record asks for inline confirmation; cancel keeps the old recording", async ({ page }) => {
    const A = slot(page, "A");
    const before = await storeState(page);
    const confirm = A.locator("[data-role=rerecord-confirm]");
    await expect(confirm).toBeHidden();
    await action(page, "A", "record").click();
    await expect(confirm).toBeVisible();
    await expect(A).toHaveAttribute("data-state", "ready"); // not recording yet
    await A.locator("[data-action=cancel-rerecord]").click();
    await expect(confirm).toBeHidden();
    await expect(A).toHaveAttribute("data-state", "ready");
    const after = await storeState(page);
    expect(after.A).toEqual(before.A);
    await expect(action(page, "A", "play-reversed")).toBeEnabled();

    // Confirm really starts a new recording.
    await action(page, "A", "record").click();
    await A.locator("[data-action=confirm-rerecord]").click();
    await expect(A).toHaveAttribute("data-state", "recording");
    await page.waitForTimeout(1200);
    await action(page, "A", "record").click();
    await expect(A).toHaveAttribute("data-state", "ready", { timeout: 10_000 });
  });
});

test.describe("with A and B recorded", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(45_000);
    await openApp(page);
    await recordSlot(page, "A");
    await recordSlot(page, "B");
  });

  test("a new play stops the previous one (only one sound at a time)", async ({ page }) => {
    const A = slot(page, "A");
    const B = slot(page, "B");
    const n = await spyCount(page);
    await action(page, "A", "play-reversed").click();
    await expect(A).toHaveAttribute("data-state", "playing");
    await action(page, "B", "play-reversed").click();
    await expect(B).toHaveAttribute("data-state", "playing");
    await expect(A).toHaveAttribute("data-state", "ready");
    expect((await storeState(page)).playing).toEqual({ slot: "B", mode: "reversed" });
    await action(page, "B", "play-original").click(); // B original: plain tap
    await expect(B).toHaveAttribute("data-state", "playing");
    expect((await storeState(page)).playing).toEqual({ slot: "B", mode: "original" });
    await expect(action(page, "B", "play-reversed")).not.toHaveAttribute("aria-pressed", "true");
    await expect(action(page, "B", "play-original")).toHaveAttribute("aria-pressed", "true");
    expect(await spySince(page, n)).toEqual([
      { slot: "A", mode: "reversed" },
      { slot: "B", mode: "reversed" },
      { slot: "B", mode: "original" },
    ]);
    await expect(B).toHaveAttribute("data-state", "ready", { timeout: 5_000 });
    await expect(page.locator("#slot-A[data-state=playing], #slot-B[data-state=playing]")).toHaveCount(0);
  });

  test("'Nuova' asks for inline confirmation and resets both slots", async ({ page }) => {
    const confirm = page.locator("#new-game-confirm");
    await expect(confirm).toBeHidden();
    await page.locator("#new-game").click();
    await expect(confirm).toBeVisible();
    await confirm.locator("[data-action=cancel-new]").click();
    await expect(confirm).toBeHidden();
    await expect(slot(page, "A")).toHaveAttribute("data-state", "ready");
    await expect(slot(page, "B")).toHaveAttribute("data-state", "ready");

    await page.locator("#new-game").click();
    await confirm.locator("[data-action=confirm-new]").click();
    await expect(confirm).toBeHidden();
    await expect(slot(page, "A")).toHaveAttribute("data-state", "empty");
    await expect(slot(page, "B")).toHaveAttribute("data-state", "empty");
    for (const id of ["A", "B"] as const) {
      await expect(action(page, id, "play-reversed")).toBeDisabled();
      await expect(action(page, id, "play-original")).toBeDisabled();
    }
    const s = await storeState(page);
    expect(s.A.blobSize).toBeNull();
    expect(s.B.blobSize).toBeNull();
    expect(s.revealed).toBe(false);
    await expect(page.locator("#app")).toHaveAttribute("data-revealed", "false");
  });
});

test("recording stops by itself after 10 s", async ({ page }) => {
  test.setTimeout(60_000);
  await openApp(page);
  const A = slot(page, "A");
  await action(page, "A", "record").click();
  await expect(A).toHaveAttribute("data-state", "recording");
  const t0 = Date.now();
  await page.waitForTimeout(9_000); // real time: MediaRecorder runs on the real clock
  await expect(A).toHaveAttribute("data-state", "recording");
  await expect(A).toHaveAttribute("data-state", "ready", { timeout: 6_000 });
  const elapsed = (Date.now() - t0) / 1000;
  expect(elapsed).toBeLessThan(13);
  const raw = await rawDuration(page, "A");
  expect(raw).toBeGreaterThan(9);
  expect(raw).toBeLessThan(11);
});

test("processed recording is shorter than the raw one (silence trimmed)", async ({ page }) => {
  test.setTimeout(60_000);
  // Fixture: 0.4 s silence + ~0.83 s voice + 0.4 s silence, looped by the fake
  // device. Where the loop is when MediaRecorder starts is not under our control,
  // so the raw Blob is analysed independently (10 ms RMS windows) to know how
  // much edge silence it really has. Attempts whose raw audio has less than
  // 0.3 s of edge silence (voice at both ends) cannot show trimming and are redone.
  for (let attempt = 0; attempt < 3; attempt++) {
    await openApp(page);
    await recordSlot(page, "A", 2000);
    const s = await storeState(page);
    const raw = await rawEdges(page, "A");
    if (raw.lead + raw.trail < 0.3) {
      test.info().annotations.push({ type: "alignment", description: `discarded ${JSON.stringify(raw)}` });
      continue;
    }
    const voiced = raw.duration - raw.lead - raw.trail;
    expect(raw.duration).toBeGreaterThan(1.5);
    expect(voiced).toBeGreaterThan(0.5); // the fixture's voice is in the raw recording
    expect(s.A.duration).toBeLessThan(raw.duration - 0.2); // silence removed
    // Trimmed to the voice plus the 50 ms margins (generous tolerance for the app's own threshold).
    expect(s.A.duration).toBeGreaterThan(voiced - 0.15);
    expect(s.A.duration).toBeLessThan(voiced + 0.1 + 0.15);
    expect(s.A.originalDuration).toBeCloseTo(s.A.duration, 2);
    expect(s.A.reversedDuration).toBeCloseTo(s.A.duration, 2);
    return;
  }
  throw new Error("raw recording had voice at both ends in 3 attempts");
});

/** Decodes the slot's raw Blob and measures leading/trailing silence (s). */
function rawEdges(page: Page, id: "A" | "B") {
  return page.evaluate(async (sid) => {
    const store = (window as any).__reverseur.store;
    const blob: Blob = store.getState().slots[sid].blob;
    const ctx = new OfflineAudioContext(1, 1, 48000);
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const x = buf.getChannelData(0);
    const w = Math.round(buf.sampleRate * 0.01);
    const rms: number[] = [];
    for (let i = 0; i + w <= x.length; i += w) {
      let acc = 0;
      for (let j = i; j < i + w; j++) acc += x[j] * x[j];
      rms.push(Math.sqrt(acc / w));
    }
    const thr = Math.max(0.01, 0.1 * Math.max(...rms));
    const first = rms.findIndex((v) => v >= thr);
    const last = rms.length - 1 - [...rms].reverse().findIndex((v) => v >= thr);
    return {
      duration: buf.duration,
      lead: first < 0 ? buf.duration : first * 0.01,
      trail: first < 0 ? 0 : buf.duration - (last + 1) * 0.01,
    };
  }, id);
}

test("denied microphone shows #mic-error", async ({ page }) => {
  await page.addInitScript(() => {
    const md = navigator.mediaDevices;
    md.getUserMedia = () => Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
  });
  await openApp(page);
  await expect(page.locator("#mic-error")).toBeHidden();
  await action(page, "A", "record").click();
  await expect(page.locator("#mic-error")).toBeVisible();
  await expect(slot(page, "A")).toHaveAttribute("data-state", "empty");
  await expect(action(page, "A", "play-reversed")).toBeDisabled();
});
