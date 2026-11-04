// Full game flow on the real app: record A → reversed A → record B →
// reversed B → reveal with a long press.
import { test, expect } from "@playwright/test";
import { openApp, slot, action, spy, spySince, spyCount, storeState, press } from "./helpers";

test("full flow: record A, reversed A, record B, reversed B, reveal", async ({ page }) => {
  test.setTimeout(60_000);
  await openApp(page);
  const A = slot(page, "A");
  const B = slot(page, "B");
  await expect(page.locator("#app")).toHaveAttribute("data-revealed", "false");
  await expect(page.locator("#score")).toBeHidden();

  // 1. Record A: recording (timer visible) → ready.
  await action(page, "A", "record").click();
  await expect(A).toHaveAttribute("data-state", "recording");
  await expect(action(page, "A", "record")).toHaveAttribute("aria-pressed", "true");
  await expect(A.locator("[data-role=timer]")).toBeVisible();
  await page.waitForTimeout(1800);
  await action(page, "A", "record").click();
  await expect(A).toHaveAttribute("data-state", "ready", { timeout: 10_000 });
  await expect(action(page, "A", "record")).not.toHaveAttribute("aria-pressed", "true");
  const afterA = await storeState(page);
  expect(afterA.A.status).toBe("ready");
  expect(afterA.A.duration).toBeGreaterThan(0.3);
  expect(afterA.A.duration).toBeLessThan(2.5);
  await expect(action(page, "A", "play-reversed")).toBeEnabled();

  // 2. Play A reversed: a source starts with meta {A, reversed}; playing → ready.
  let n = await spyCount(page);
  await action(page, "A", "play-reversed").click();
  await expect.poll(() => spySince(page, n)).toEqual([{ slot: "A", mode: "reversed" }]);
  await expect(A).toHaveAttribute("data-state", "playing");
  const entryA = (await spy(page))[n];
  expect(entryA.duration).toBeCloseTo(afterA.A.duration, 2);
  await expect(A).toHaveAttribute("data-state", "ready", { timeout: 5_000 });
  expect((await storeState(page)).playing).toBeNull();

  // 3. Record B.
  await action(page, "B", "record").click();
  await expect(B).toHaveAttribute("data-state", "recording");
  await expect(B.locator("[data-role=timer]")).toBeVisible();
  await page.waitForTimeout(1800);
  await action(page, "B", "record").click();
  await expect(B).toHaveAttribute("data-state", "ready", { timeout: 10_000 });
  await expect(A).toHaveAttribute("data-state", "ready");

  // 4. Play B reversed.
  n = await spyCount(page);
  await action(page, "B", "play-reversed").click();
  await expect.poll(() => spySince(page, n)).toEqual([{ slot: "B", mode: "reversed" }]);
  await expect(B).toHaveAttribute("data-state", "playing");
  await expect(B).toHaveAttribute("data-state", "ready", { timeout: 5_000 });

  // 5. Reveal with a long press: plays A original, sets revealed, shows score.
  n = await spyCount(page);
  await press(page, page.locator("#reveal"), 300);
  await expect.poll(() => spySince(page, n)).toEqual([{ slot: "A", mode: "original" }]);
  await expect(page.locator("#app")).toHaveAttribute("data-revealed", "true");
  await expect(page.locator("#score")).toBeVisible();
  expect((await storeState(page)).revealed).toBe(true);
  await expect(A).toHaveAttribute("data-state", "ready", { timeout: 5_000 });
});
