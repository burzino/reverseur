/*
 * holdButton.ts — long-press guard ("hold to confirm") for buttons that must
 * not fire on an accidental tap (Player A "Ascolta originale", "Rivela").
 *
 * CSS contract (what this module sets on the element; style it in CSS):
 *   .is-holding        present while a press is in progress (pointer or key).
 *   --hold-progress    custom property on the element, 0 → 1 during the hold
 *                      (updated every animation frame; removed when the hold
 *                      ends). Use it for a ring/bar, e.g.
 *                        .hold::after { transform: scaleX(var(--hold-progress, 0)); }
 *                        or conic-gradient(... calc(var(--hold-progress, 0) * 360deg) ...)
 *   .is-shake          added for ~400 ms after an early release (reason
 *                      'early' only). Define a ~300–400 ms shake keyframe on it
 *                      and respect prefers-reduced-motion.
 *   The element itself should have: touch-action: manipulation;
 *   user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
 *   (contextmenu / selectstart / dragstart are also prevented here in JS).
 *
 * Behaviour summary: see docs/INTERFACES.md ("holdButton").
 * The native `click` on the element is always swallowed (capture phase on the
 * element, stopImmediatePropagation): never put onclick on a hold button, use
 * onConfirm. `bypass()` returning true turns a plain tap/click/Enter into an
 * immediate confirm (used to stop playback with a simple tap).
 *
 * Svelte usage:  <button use:hold={{ onConfirm, onCancel, bypass }}>
 *
 * No browser globals are touched at import time.
 */
import type { ActionReturn } from 'svelte/action';

export const HOLD_TO_PLAY_MS = 200;

export type HoldCancelReason = 'early' | 'leave' | 'cancel' | 'blur';

export interface HoldOptions {
  ms?: number;
  onConfirm: (ev: Event) => void;
  onCancel?: (info: { reason: HoldCancelReason }) => void;
  bypass?: () => boolean;
}

const SHAKE_MS = 400;
const VIBRATE_MS = 15;
const KEYS = new Set([' ', 'Spacebar', 'Enter']);

type Press =
  | { kind: 'pointer'; id: number; ev: Event }
  | { kind: 'key'; key: string; ev: Event };

function isDisabled(el: HTMLElement): boolean {
  return (
    !!(el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true'
  );
}

function vibrate(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(VIBRATE_MS);
    }
  } catch {
    /* unsupported or blocked: ignore */
  }
}

export function holdButton(
  el: HTMLElement,
  { ms = HOLD_TO_PLAY_MS, onConfirm, onCancel, bypass }: HoldOptions,
): () => void {
  const doc = el.ownerDocument;
  const win = doc.defaultView ?? window;

  let active: Press | null = null;
  let done = false; // active press already confirmed (waiting for release)
  let timer = 0;
  let raf = 0;
  let startedAt = 0;
  let shakeTimer = 0;
  let bypassTapPending = false; // pointerdown happened while bypass() was true
  let destroyed = false;

  const wantsBypass = (): boolean => {
    try {
      return typeof bypass === 'function' && !!bypass();
    } catch {
      return false;
    }
  };

  const setProgress = (p: number): void => {
    el.style.setProperty('--hold-progress', String(p));
  };

  function tick(): void {
    raf = 0;
    if (!active || done) return;
    const p = Math.min(1, (win.performance.now() - startedAt) / ms);
    setProgress(p);
    if (p < 1) raf = win.requestAnimationFrame(tick);
  }

  function clearTimers(): void {
    if (timer) {
      win.clearTimeout(timer);
      timer = 0;
    }
    if (raf) {
      win.cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function resetVisuals(): void {
    el.classList.remove('is-holding');
    el.style.removeProperty('--hold-progress');
  }

  function releaseCapture(): void {
    if (active?.kind !== 'pointer') return;
    try {
      if (el.hasPointerCapture(active.id)) el.releasePointerCapture(active.id);
    } catch {
      /* ignore */
    }
  }

  function shake(): void {
    if (shakeTimer) win.clearTimeout(shakeTimer);
    el.classList.remove('is-shake');
    void el.offsetWidth; // restart the CSS animation on rapid repeats
    el.classList.add('is-shake');
    shakeTimer = win.setTimeout(() => {
      shakeTimer = 0;
      el.classList.remove('is-shake');
    }, SHAKE_MS);
  }

  function start(press: Press): void {
    clearTimers(); // never stack timers, even on rapid repeats
    active = press;
    done = false;
    startedAt = win.performance.now();
    el.classList.remove('is-shake');
    el.classList.add('is-holding');
    setProgress(0);
    raf = win.requestAnimationFrame(tick);
    timer = win.setTimeout(complete, ms);
  }

  function complete(): void {
    timer = 0;
    if (!active || done) return;
    if (isDisabled(el)) {
      end(); // became disabled mid-hold: drop silently
      return;
    }
    const ev = active.ev;
    done = true;
    if (raf) {
      win.cancelAnimationFrame(raf);
      raf = 0;
    }
    resetVisuals();
    vibrate();
    onConfirm(ev);
  }

  // End the current press without notifying (after confirm or on teardown).
  function end(): void {
    clearTimers();
    releaseCapture();
    active = null;
    done = false;
    resetVisuals();
  }

  function cancel(reason: HoldCancelReason): void {
    if (!active) return;
    const wasDone = done;
    end();
    if (wasDone) return; // already confirmed: releasing is not a cancel
    if (reason === 'early') shake();
    onCancel?.({ reason });
  }

  function confirmNow(ev: Event): void {
    if (isDisabled(el)) return;
    vibrate();
    onConfirm(ev);
  }

  // ---- pointer ----------------------------------------------------------
  const isOurs = (e: PointerEvent): boolean =>
    active?.kind === 'pointer' && e.pointerId === active.id;

  function onPointerDown(e: PointerEvent): void {
    if (active) return; // multi-touch / second pointer
    if (!e.isPrimary || e.button !== 0) return;
    if (isDisabled(el)) return;
    if (wantsBypass()) {
      bypassTapPending = true; // confirmed by the following click
      return;
    }
    bypassTapPending = false;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic or already-gone pointer */
    }
    start({ kind: 'pointer', id: e.pointerId, ev: e });
  }

  function onPointerUp(e: PointerEvent): void {
    if (isOurs(e)) cancel('early');
  }

  function onPointerCancel(e: PointerEvent): void {
    if (isOurs(e)) cancel('cancel');
    bypassTapPending = false;
  }

  function onPointerMove(e: PointerEvent): void {
    if (!isOurs(e) || done) return;
    const r = el.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
      cancel('leave');
    }
  }

  function onPointerLeave(e: PointerEvent): void {
    // Normally suppressed by pointer capture; fires if capture failed/was lost.
    if (isOurs(e) && !done) cancel('leave');
  }

  function onLostCapture(e: PointerEvent): void {
    // Capture lost while pressed without up/cancel (e.g. element re-rendered).
    if (isOurs(e) && !done) cancel('cancel');
  }

  // ---- keyboard ---------------------------------------------------------
  function onKeyDown(e: KeyboardEvent): void {
    if (!KEYS.has(e.key)) return;
    if (isDisabled(el)) return;
    e.preventDefault(); // no native click from Enter/Space
    if (e.repeat || active) return;
    if (wantsBypass()) {
      confirmNow(e);
      return;
    }
    start({ kind: 'key', key: e.key, ev: e });
  }

  function onKeyUp(e: KeyboardEvent): void {
    if (!KEYS.has(e.key)) return;
    e.preventDefault(); // Space keyup would otherwise synthesize a click
    if (active?.kind === 'key' && active.key === e.key) cancel('early');
  }

  function onElBlur(): void {
    if (active?.kind === 'key') cancel('blur');
  }

  // ---- click / misc -----------------------------------------------------
  function onClick(e: MouseEvent): void {
    e.preventDefault();
    e.stopImmediatePropagation();
    const tap = bypassTapPending;
    bypassTapPending = false;
    if (isDisabled(el)) return;
    // Pointer tap that started in bypass mode, or a non-pointer click
    // (detail 0: assistive tech / programmatic) while bypass is on.
    if (tap || (e.detail === 0 && !active && wantsBypass())) confirmNow(e);
  }

  const prevent = (e: Event): void => e.preventDefault();
  const onWinBlur = (): void => cancel('blur');
  const onVisibility = (): void => {
    if (doc.visibilityState === 'hidden') cancel('blur');
  };

  const elListeners: Array<[string, (e: never) => void]> = [
    ['pointerdown', onPointerDown],
    ['pointerup', onPointerUp],
    ['pointercancel', onPointerCancel],
    ['pointermove', onPointerMove],
    ['pointerleave', onPointerLeave],
    ['lostpointercapture', onLostCapture],
    ['keydown', onKeyDown],
    ['keyup', onKeyUp],
    ['blur', onElBlur],
    ['contextmenu', prevent],
    ['selectstart', prevent],
    ['dragstart', prevent],
  ];
  for (const [type, fn] of elListeners) el.addEventListener(type, fn as EventListener);
  el.addEventListener('click', onClick, true);
  win.addEventListener('blur', onWinBlur);
  doc.addEventListener('visibilitychange', onVisibility);

  return function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    end();
    if (shakeTimer) {
      win.clearTimeout(shakeTimer);
      shakeTimer = 0;
    }
    el.classList.remove('is-shake');
    for (const [type, fn] of elListeners) el.removeEventListener(type, fn as EventListener);
    el.removeEventListener('click', onClick, true);
    win.removeEventListener('blur', onWinBlur);
    doc.removeEventListener('visibilitychange', onVisibility);
  };
}

/**
 * Svelte action: `<button use:hold={{ onConfirm, onCancel, bypass, ms }}>`.
 * Callbacks are read through a proxy, so `update()` swaps them without
 * re-binding listeners; a change of `ms` re-creates the guard.
 */
export function hold(
  node: HTMLElement,
  opts: HoldOptions,
): ActionReturn<HoldOptions> {
  let current = opts;
  const make = (): (() => void) =>
    holdButton(node, {
      ms: current.ms ?? HOLD_TO_PLAY_MS,
      onConfirm: (ev) => current.onConfirm(ev),
      onCancel: (info) => current.onCancel?.(info),
      bypass: () => current.bypass?.() ?? false,
    });
  let destroyGuard = make();
  return {
    update(next: HoldOptions) {
      const msChanged = (next.ms ?? HOLD_TO_PLAY_MS) !== (current.ms ?? HOLD_TO_PLAY_MS);
      current = next;
      if (msChanged) {
        destroyGuard();
        destroyGuard = make();
      }
    },
    destroy() {
      destroyGuard();
    },
  };
}
