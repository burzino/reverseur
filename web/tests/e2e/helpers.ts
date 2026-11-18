// Shared helpers for the E2E spec that drives the real app (./?test).
import { expect, type Page, type Locator } from "@playwright/test";

export type SlotId = "A" | "B";
export type Mode = "original" | "reversed";

export const main = (page: Page): Locator => page.locator("main");
export const act = (page: Page, name: string): Locator => main(page).locator(`[data-action=${name}]`);

/** Opens the app in test mode and waits for the spy and the store. */
export async function openApp(page: Page): Promise<void> {
  await page.goto("./?test");
  await expect(page.locator("#slot-A")).toHaveAttribute("data-state", "empty");
  await page.waitForFunction(() => !!(window as any).__reverseurSpy && !!(window as any).__reverseur?.store);
}

/** Sources started after index `from`, as {slot, mode}. */
export async function spySince(page: Page, from: number) {
  const started: { meta?: { slot?: SlotId; mode?: Mode } }[] = await page.evaluate(() =>
    structuredClone((window as any).__reverseurSpy.started),
  );
  return started.slice(from).map((e) => ({ slot: e.meta?.slot, mode: e.meta?.mode }));
}

export const spyCount = (page: Page): Promise<number> =>
  page.evaluate(() => (window as any).__reverseurSpy.started.length);

/** Tap the record pad of `id`, keep recording for `ms`, tap again, wait until the row is no longer recording. */
export async function record(page: Page, id: SlotId, ms = 1500): Promise<void> {
  const row = page.locator(`#slot-${id}`);
  const pad = act(page, `record-${id.toLowerCase()}`);
  await pad.click();
  await expect(row).toHaveAttribute("data-state", "recording");
  await page.waitForTimeout(ms); // recording length needs real time
  await pad.click();
  await expect(row).not.toHaveAttribute("data-state", "recording", { timeout: 10_000 });
}

/** Mouse press of `holdMs` in the centre of the element. */
export async function press(page: Page, target: Locator, holdMs: number): Promise<void> {
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(holdMs);
  await page.mouse.up();
}
