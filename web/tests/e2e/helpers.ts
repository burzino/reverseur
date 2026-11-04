// Shared helpers for the E2E specs that drive the real app (./?test).
import { expect, type Page, type Locator } from "@playwright/test";

export type SlotId = "A" | "B";
export type Mode = "original" | "reversed";
export type SpyEntry = { meta?: { slot?: SlotId; mode?: Mode }; duration: number; at: number };

export const slot = (page: Page, id: SlotId): Locator => page.locator(`#slot-${id}`);
export const action = (page: Page, id: SlotId, name: string): Locator =>
  slot(page, id).locator(`[data-action=${name}]`);

/** Opens the app in test mode and waits for the spy and the store. */
export async function openApp(page: Page): Promise<void> {
  await page.goto("./?test");
  await expect(slot(page, "A")).toHaveAttribute("data-state", "empty");
  await expect(slot(page, "B")).toHaveAttribute("data-state", "empty");
  await page.waitForFunction(
    () => !!(window as any).__reverseurSpy && !!(window as any).__reverseur?.store,
  );
}

export const spy = (page: Page): Promise<SpyEntry[]> =>
  page.evaluate(() => structuredClone((window as any).__reverseurSpy.started));

export const spyCount = async (page: Page): Promise<number> => (await spy(page)).length;

/** Spy entries pushed after index `from`, as {slot, mode}. */
export async function spySince(page: Page, from: number) {
  return (await spy(page)).slice(from).map((e) => ({ slot: e.meta?.slot, mode: e.meta?.mode }));
}

/** Plain JSON view of the store state (blobs/buffers reduced to sizes/durations). */
export function storeState(page: Page) {
  return page.evaluate(() => {
    const store = (window as any).__reverseur.store;
    const s = typeof store.getState === "function" ? store.getState() : store.state ?? store;
    const slotView = (x: any) => ({
      status: x?.status,
      duration: x?.duration,
      blobSize: x?.blob?.size ?? null,
      originalDuration: x?.original?.duration ?? null,
      reversedDuration: x?.reversed?.duration ?? null,
    });
    return {
      A: slotView(s.slots?.A),
      B: slotView(s.slots?.B),
      playing: s.playing ? { slot: s.playing.slot, mode: s.playing.mode } : null,
      revealed: !!s.revealed,
    };
  });
}

/** Decodes the slot's raw recorded Blob in the page and returns its duration (s). */
export function rawDuration(page: Page, id: SlotId): Promise<number> {
  return page.evaluate(async (sid) => {
    const store = (window as any).__reverseur.store;
    const s = typeof store.getState === "function" ? store.getState() : store.state ?? store;
    const blob: Blob = s.slots[sid].blob;
    const ctx = new OfflineAudioContext(1, 1, 48000);
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    return buf.duration;
  }, id);
}

/** Tap Registra, keep recording for `ms`, tap again, wait for `ready`. */
export async function recordSlot(page: Page, id: SlotId, ms = 1800): Promise<void> {
  const s = slot(page, id);
  await action(page, id, "record").click();
  await expect(s).toHaveAttribute("data-state", "recording");
  await page.waitForTimeout(ms); // recording length needs real time
  await action(page, id, "record").click();
  await expect(s).toHaveAttribute("data-state", "ready", { timeout: 10_000 });
}

/**
 * Installs an in-page probe on `target` that measures when the page actually
 * PROCESSED the events (performance.now() in the handlers, like holdButton's
 * own timer start): time from pointerdown to the first move outside the
 * element (`leftAt`) and to pointerup (`upAt`). Under heavy parallel load the wall-clock waits of
 * the test runner can stretch, so timing-sensitive tests check the real
 * timings the app saw instead of trusting `waitForTimeout`.
 */
export async function probe(target: Locator) {
  await target.evaluate((el) => {
    const p = { down: -1, leftAt: -1, upAt: -1 };
    (window as any).__probe = p;
    const opts = { capture: true };
    document.addEventListener("pointerdown", (e) => {
      if (e.target instanceof Node && el.contains(e.target)) p.down = performance.now();
    }, opts);
    document.addEventListener("pointermove", (e) => {
      if (p.down < 0 || p.leftAt >= 0) return;
      const r = el.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        p.leftAt = performance.now() - p.down;
    }, opts);
    document.addEventListener("pointerup", (e) => {
      if (p.down >= 0 && p.upAt < 0) p.upAt = performance.now() - p.down;
    }, opts);
  });
  return () => target.page().evaluate(() => structuredClone((window as any).__probe) as
    { down: number; leftAt: number; upAt: number });
}

/** Mouse press of `holdMs` in the centre of the element. */
export async function press(page: Page, target: Locator, holdMs: number): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(holdMs);
  await page.mouse.up();
}

/** Press, leave the element after `leaveAt` ms, release at `total` ms. */
export async function pressAndLeave(page: Page, target: Locator, leaveAt: number, total: number) {
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(leaveAt);
  // Move well outside the button (below or above, whichever is on screen).
  const vh = page.viewportSize()?.height ?? 800;
  const outY = box.y + box.height + 60 < vh ? box.y + box.height + 60 : Math.max(2, box.y - 60);
  await page.mouse.move(x, outY); // one event: keeps the leave close to `leaveAt`
  await page.waitForTimeout(Math.max(0, total - leaveAt));
  await page.mouse.up();
}
