// E2E tests for src/ui/holdButton.ts. They do not depend on the Svelte app:
// the module is transpiled with esbuild and injected into a minimal page.
import { test, expect, type Page } from "@playwright/test";
import { transform } from "esbuild";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../../src/ui/holdButton.ts", import.meta.url));

const HARNESS_HTML = `<!doctype html>
<html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: system-ui, sans-serif; margin: 16px; }
  button { display: block; width: 240px; height: 80px; margin: 0 0 24px;
    touch-action: manipulation; user-select: none; -webkit-touch-callout: none; }
</style></head>
<body>
  <button id="hold" type="button">Tieni premuto</button>
  <button id="bypass" type="button">Bypass</button>
  <button id="disabled" type="button" disabled>Disabled</button>
  <button id="aria" type="button" aria-disabled="true">Aria disabled</button>
  <button id="action" type="button">Svelte action</button>
</body></html>`;

const HARNESS_JS = `
const log = {};
window.__hold = log;
window.HOLD_TO_PLAY_MS = HOLD_TO_PLAY_MS;
window.__destroy = {};
const track = (id) => {
  const el = document.getElementById(id);
  log[id] = { confirm: 0, cancel: [], clicks: 0, downs: 0 };
  // A foreign click listener: must never run (holdButton swallows click).
  el.addEventListener('click', () => { log[id].clicks++; });
  el.addEventListener('pointerdown', () => { log[id].downs++; });
  return el;
};
for (const id of ['hold', 'bypass', 'disabled', 'aria']) {
  const el = track(id);
  window.__destroy[id] = holdButton(el, {
    onConfirm: () => { log[id].confirm++; },
    onCancel: ({ reason }) => { log[id].cancel.push(reason); },
    bypass: id === 'bypass' ? () => true : undefined,
  });
}
// Svelte action: starts without bypass; update() flips it on.
const actionEl = track('action');
const mk = (bypassOn, tag) => ({
  onConfirm: () => { log.action.confirm++; log.action.last = tag; },
  onCancel: ({ reason }) => { log.action.cancel.push(reason); },
  bypass: () => bypassOn,
});
window.__action = hold(actionEl, mk(false, 'v1'));
window.__actionNext = () => window.__action.update(mk(true, 'v2'));
window.__ready = true;
`;

let moduleCode = "";

test.beforeAll(async () => {
  const ts = await readFile(SRC, "utf8");
  const out = await transform(ts, { loader: "ts", format: "esm", target: "es2022" });
  // `import type` is erased by esbuild; the leftover `export` keywords are
  // harmless inside an inline module script.
  moduleCode = out.code + "\n" + HARNESS_JS;
});

test.beforeEach(async ({ page }) => {
  await page.setContent(HARNESS_HTML);
  await page.addScriptTag({ type: "module", content: moduleCode });
  await page.waitForFunction(() => (window as any).__ready === true);
});

type Stats = { confirm: number; cancel: string[]; clicks: number; downs: number; last?: string };

const stats = (page: Page, id = "hold"): Promise<Stats> =>
  page.evaluate((i) => structuredClone((window as any).__hold[i]), id);

async function center(page: Page, sel: string) {
  const box = (await page.locator(sel).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

async function press(page: Page, sel: string, holdMs: number) {
  const { x, y } = await center(page, sel);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(holdMs);
  await page.mouse.up();
}

// Real touch input through CDP (Chromium only).
async function touch(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  return (type: "touchStart" | "touchEnd" | "touchMove", touchPoints: { x: number; y: number; id: number }[]) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
}

// Synthetic PointerEvents, for what real input can't easily produce (pointercancel).
type FireArgs = { s: string; t: string; i: { pointerId?: number; isPrimary?: boolean } };

function firePointer(page: Page, sel: string, type: string, init: FireArgs["i"] = {}): Promise<void> {
  const args: FireArgs = { s: sel, t: type, i: init };
  return page.evaluate(({ s, t, i }: FireArgs) => {
    const el = document.querySelector(s)!;
    const r = el.getBoundingClientRect();
    el.dispatchEvent(
      new PointerEvent(t, {
        bubbles: true, cancelable: true, composed: true,
        pointerId: 7, pointerType: "touch", isPrimary: true,
        button: t === "pointermove" ? -1 : 0,
        clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
        ...i,
      }),
    );
  }, args);
}

test("HOLD_TO_PLAY_MS is 200", async ({ page }) => {
  expect(await page.evaluate(() => (window as any).HOLD_TO_PLAY_MS)).toBe(200);
});

test("50 ms tap does not confirm", async ({ page }) => {
  await press(page, "#hold", 50);
  await page.waitForTimeout(300);
  const s = await stats(page);
  expect(s.confirm).toBe(0);
  expect(s.cancel).toEqual(["early"]);
  expect(s.clicks).toBe(0); // native click swallowed
});

test("250 ms press confirms", async ({ page }) => {
  await press(page, "#hold", 250);
  await page.waitForTimeout(50);
  const s = await stats(page);
  expect(s.confirm).toBe(1);
  expect(s.cancel).toEqual([]);
  expect(s.clicks).toBe(0);
  await expect(page.locator("#hold")).not.toHaveClass(/is-holding/);
});

test("250 ms press leaving the button at 100 ms does not confirm", async ({ page }) => {
  const { x, y, box } = await center(page, "#hold");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(100);
  await page.mouse.move(x, box.y + box.height + 40, { steps: 3 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(100);
  const s = await stats(page);
  expect(s.confirm).toBe(0);
  expect(s.cancel).toEqual(["leave"]);
  await expect(page.locator("#hold")).not.toHaveClass(/is-shake/); // only 'early' shakes
});

test("is-holding and --hold-progress while held, is-shake after early release", async ({ page }) => {
  const el = page.locator("#hold");
  const { x, y } = await center(page, "#hold");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(100);
  await expect(el).toHaveClass(/is-holding/);
  const p = await el.evaluate((n) => parseFloat((n as HTMLElement).style.getPropertyValue("--hold-progress")));
  expect(p).toBeGreaterThan(0);
  expect(p).toBeLessThan(1);
  await page.mouse.up();
  await expect(el).toHaveClass(/is-shake/);
  await expect(el).not.toHaveClass(/is-holding/);
  await expect(el).not.toHaveClass(/is-shake/, { timeout: 1000 });
  expect((await stats(page)).confirm).toBe(0);
});

test("real touch: 50 ms touch does not confirm, 250 ms touch does", async ({ page }) => {
  const send = await touch(page);
  const { x, y } = await center(page, "#hold");
  await send("touchStart", [{ x, y, id: 1 }]);
  await page.waitForTimeout(50);
  await send("touchEnd", []);
  await page.waitForTimeout(300);
  expect((await stats(page)).confirm).toBe(0);

  await send("touchStart", [{ x, y, id: 2 }]);
  await page.waitForTimeout(250);
  await send("touchEnd", []);
  await page.waitForTimeout(50);
  const s = await stats(page);
  expect(s.confirm).toBe(1);
  expect(s.cancel).toEqual(["early"]);
});

test("second touch during a hold is ignored (multi-touch)", async ({ page }) => {
  const send = await touch(page);
  const { x, y } = await center(page, "#hold");
  await send("touchStart", [{ x, y, id: 1 }]);
  await page.waitForTimeout(50);
  await send("touchStart", [{ x, y, id: 1 }, { x: x + 30, y, id: 2 }]);
  await page.waitForTimeout(40);
  // CDP diffs against the previous point list: dropping id 2 releases it.
  await send("touchMove", [{ x, y, id: 1 }]); // second finger lifts early
  await page.waitForTimeout(160);
  await send("touchEnd", []);
  await page.waitForTimeout(50);
  const s = await stats(page);
  expect(s.downs).toBe(2); // the second finger really reached the button
  expect(s.confirm).toBe(1);
  expect(s.cancel).toEqual([]);
});

test("synthetic non-primary pointer is ignored", async ({ page }) => {
  await firePointer(page, "#hold", "pointerdown", { pointerId: 1 });
  await page.waitForTimeout(30);
  await firePointer(page, "#hold", "pointerdown", { pointerId: 2, isPrimary: false });
  await firePointer(page, "#hold", "pointerup", { pointerId: 2, isPrimary: false });
  await page.waitForTimeout(250);
  await firePointer(page, "#hold", "pointerup", { pointerId: 1 });
  const s = await stats(page);
  expect(s.confirm).toBe(1);
  expect(s.cancel).toEqual([]);
});

test("pointercancel (scroll) does not confirm and does not shake", async ({ page }) => {
  await firePointer(page, "#hold", "pointerdown");
  await page.waitForTimeout(80);
  await firePointer(page, "#hold", "pointercancel");
  await page.waitForTimeout(250);
  const s = await stats(page);
  expect(s.confirm).toBe(0);
  expect(s.cancel).toEqual(["cancel"]);
  await expect(page.locator("#hold")).not.toHaveClass(/is-shake|is-holding/);
});

test("window blur during hold cancels with reason blur", async ({ page }) => {
  const { x, y } = await center(page, "#hold");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(60);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(250);
  await page.mouse.up();
  const s = await stats(page);
  expect(s.confirm).toBe(0);
  expect(s.cancel).toEqual(["blur"]);
});

test("keyboard: Space held 50 ms does not confirm, 250 ms does", async ({ page }) => {
  await page.focus("#hold");
  await page.keyboard.down(" ");
  await page.waitForTimeout(50);
  await page.keyboard.up(" ");
  await page.waitForTimeout(300);
  let s = await stats(page);
  expect(s.confirm).toBe(0);
  expect(s.cancel).toEqual(["early"]);

  await page.keyboard.down(" ");
  await page.waitForTimeout(250);
  await page.keyboard.up(" ");
  await page.waitForTimeout(50);
  s = await stats(page);
  expect(s.confirm).toBe(1);
  expect(s.clicks).toBe(0);
});

test("keyboard: Enter held 250 ms with auto-repeat confirms once", async ({ page }) => {
  await page.focus("#hold");
  await page.keyboard.down("Enter");
  await page.waitForTimeout(100);
  await page.keyboard.down("Enter"); // auto-repeat (repeat: true)
  await page.waitForTimeout(150);
  await page.keyboard.up("Enter");
  await page.waitForTimeout(50);
  const s = await stats(page);
  expect(s.confirm).toBe(1);
  expect(s.cancel).toEqual([]);
  expect(s.clicks).toBe(0);
});

test("rapid repeated taps never confirm (no stacked timers)", async ({ page }) => {
  const { x, y } = await center(page, "#hold");
  await page.mouse.move(x, y);
  for (let i = 0; i < 8; i++) {
    await page.mouse.down();
    await page.waitForTimeout(30);
    await page.mouse.up();
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(400);
  const s = await stats(page);
  expect(s.confirm).toBe(0);
  expect(s.cancel).toHaveLength(8);
  expect(s.cancel.every((r) => r === "early")).toBe(true);
});

test("disabled and aria-disabled buttons do nothing", async ({ page }) => {
  for (const id of ["disabled", "aria"]) {
    await press(page, `#${id}`, 250);
    await page.waitForTimeout(50);
    const s = await stats(page, id);
    expect(s.confirm).toBe(0);
    expect(s.cancel).toEqual([]);
    expect(s.clicks).toBe(0);
    await expect(page.locator(`#${id}`)).not.toHaveClass(/is-holding|is-shake/);
  }
  await page.evaluate(() => (document.getElementById("aria") as HTMLElement).focus());
  await page.keyboard.down(" ");
  await page.waitForTimeout(250);
  await page.keyboard.up(" ");
  expect((await stats(page, "aria")).confirm).toBe(0);
});

test("bypass: a plain tap or Enter confirms immediately", async ({ page }) => {
  await press(page, "#bypass", 20);
  await page.waitForTimeout(30);
  let s = await stats(page, "bypass");
  expect(s.confirm).toBe(1);
  expect(s.cancel).toEqual([]);
  expect(s.clicks).toBe(0);

  await page.focus("#bypass");
  await page.keyboard.press("Enter");
  s = await stats(page, "bypass");
  expect(s.confirm).toBe(2);
});

test("contextmenu is prevented on the button", async ({ page }) => {
  const prevented = await page.evaluate(() => {
    const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    document.getElementById("hold")!.dispatchEvent(ev);
    return ev.defaultPrevented;
  });
  expect(prevented).toBe(true);
});

test("destroy() removes behaviour", async ({ page }) => {
  await page.evaluate(() => (window as any).__destroy.hold());
  await press(page, "#hold", 250);
  await page.waitForTimeout(50);
  const s = await stats(page);
  expect(s.confirm).toBe(0);
  expect(s.clicks).toBe(1); // native click no longer swallowed
});

test("Svelte action: hold works, update() swaps callbacks and bypass", async ({ page }) => {
  await press(page, "#action", 50);
  await press(page, "#action", 250);
  await page.waitForTimeout(50);
  let s = await stats(page, "action");
  expect(s.confirm).toBe(1);
  expect(s.last).toBe("v1");
  expect(s.cancel).toEqual(["early"]);

  await page.evaluate(() => (window as any).__actionNext());
  await press(page, "#action", 20); // bypass now on: a tap confirms
  await page.waitForTimeout(30);
  s = await stats(page, "action");
  expect(s.confirm).toBe(2);
  expect(s.last).toBe("v2");

  await page.evaluate(() => (window as any).__action.destroy());
  await press(page, "#action", 250);
  await page.waitForTimeout(50);
  expect((await stats(page, "action")).confirm).toBe(2);
});
