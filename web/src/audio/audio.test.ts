import { describe, expect, it } from "vitest";
import {
  applyFades,
  encodeWavSamples,
  findTrimBounds,
  normalizeSamples,
  peakOf,
  reverseSamples,
  trimSamples,
} from "./audio";

const SR = 48000;
const ms = (m: number): number => Math.round((SR * m) / 1000);
const dB = (x: number): number => 20 * Math.log10(x);
const WIN = ms(10);

interface SignalOpts {
  preMs?: number;
  toneMs?: number;
  postMs?: number;
  amp?: number;
  noise?: number;
  seed?: number;
}

/** silence(preMs) + sine(toneMs, amp) + silence(postMs), with an optional noise floor. */
function makeSignal({ preMs = 300, toneMs = 400, postMs = 500, amp = 0.5, noise = 0, seed = 1 }: SignalOpts = {}) {
  const n = ms(preMs) + ms(toneMs) + ms(postMs);
  const out = new Float32Array(n);
  let r = seed;
  const rand = (): number => {
    r = (r * 1103515245 + 12345) & 0x7fffffff;
    return r / 0x7fffffff - 0.5;
  };
  for (let i = 0; i < n; i++) {
    out[i] = noise ? rand() * 2 * noise : 0;
    if (i >= ms(preMs) && i < ms(preMs) + ms(toneMs)) out[i] += amp * Math.sin((2 * Math.PI * 220 * i) / SR);
  }
  return out;
}

describe("reverseSamples", () => {
  it("reversing twice returns the original", () => {
    const x = new Float32Array(1001).map((_, i) => Math.sin(i * 0.37) * (i % 7) * 0.1);
    const once = reverseSamples(x);
    expect(once).not.toBe(x);
    expect(once[0]).toBe(x[x.length - 1]);
    expect(reverseSamples(once)).toEqual(x);
  });

  it("handles empty input", () => {
    expect(reverseSamples(new Float32Array(0))).toHaveLength(0);
  });
});

describe("findTrimBounds / trimSamples", () => {
  it("removes leading/trailing silence and keeps the 50 ms margin", () => {
    const x = makeSignal({ preMs: 300, toneMs: 400, postMs: 500 });
    const { start, end } = findTrimBounds([x], SR);
    expect(Math.abs(start - (ms(300) - ms(50)))).toBeLessThanOrEqual(WIN);
    expect(Math.abs(end - (ms(700) + ms(50)))).toBeLessThanOrEqual(WIN);
    // the margin is really kept: the tone and 50 ms around it are never cut
    expect(start).toBeLessThanOrEqual(ms(250));
    expect(end).toBeGreaterThanOrEqual(ms(750));
  });

  it("is robust to a noise floor", () => {
    const x = makeSignal({ amp: 0.4, noise: 0.008 });
    const { start, end } = findTrimBounds([x], SR);
    expect(Math.abs(start - (ms(300) - ms(50)))).toBeLessThanOrEqual(WIN);
    expect(Math.abs(end - (ms(700) + ms(50)))).toBeLessThanOrEqual(WIN);
  });

  it("does not over-trim a recording that is sound from start to end", () => {
    const x = makeSignal({ preMs: 0, toneMs: 500, postMs: 0, amp: 0.3 });
    expect(findTrimBounds([x], SR)).toEqual({ start: 0, end: x.length });
  });

  it("clamps the margin at the buffer edges", () => {
    const x = makeSignal({ preMs: 20, toneMs: 200, postMs: 10 });
    expect(findTrimBounds([x], SR)).toEqual({ start: 0, end: x.length });
  });

  it("keeps everything for silent, faint-noise or empty input", () => {
    const silent = new Float32Array(ms(500));
    expect(findTrimBounds([silent], SR)).toEqual({ start: 0, end: silent.length });
    expect(findTrimBounds([new Float32Array(0)], SR)).toEqual({ start: 0, end: 0 });
    expect(findTrimBounds([], SR)).toEqual({ start: 0, end: 0 });
    const faint = makeSignal({ preMs: 0, toneMs: 0, postMs: 500, noise: 0.002 });
    expect(findTrimBounds([faint], SR)).toEqual({ start: 0, end: faint.length });
    expect(trimSamples([silent], SR)[0]).toHaveLength(silent.length);
  });

  it("honours an explicit threshold and combines channels", () => {
    const left = makeSignal({ preMs: 300, toneMs: 100, postMs: 600 });
    const right = makeSignal({ preMs: 600, toneMs: 100, postMs: 300 });
    const { start, end } = findTrimBounds([left, right], SR, { threshold: 0.05 });
    expect(Math.abs(start - (ms(300) - ms(50)))).toBeLessThanOrEqual(WIN);
    expect(Math.abs(end - (ms(700) + ms(50)))).toBeLessThanOrEqual(WIN);
  });

  it("trimSamples slices all channels to the same bounds", () => {
    const a = makeSignal();
    const b = makeSignal({ amp: 0.2 });
    const [ta, tb] = trimSamples([a, b], SR);
    const { start, end } = findTrimBounds([a, b], SR);
    expect(ta).toHaveLength(end - start);
    expect(tb).toHaveLength(end - start);
    expect(ta.length).toBeLessThan(a.length);
    expect(ta[0]).toBe(a[start]);
  });
});

describe("peakOf / normalizeSamples", () => {
  it("peakOf returns the max absolute value", () => {
    expect(peakOf([new Float32Array([0.1, -0.75, 0.5])])).toBeCloseTo(0.75, 6);
    expect(peakOf([])).toBe(0);
  });

  it("sets the peak to -1 dBFS ± 0.1 dB", () => {
    for (const amp of [0.05, 0.3, 0.99, 1.5]) {
      const y = normalizeSamples([makeSignal({ amp })]);
      expect(Math.abs(dB(peakOf(y)) + 1)).toBeLessThan(0.1);
    }
  });

  it("uses the global peak across channels and preserves balance", () => {
    const l = makeSignal({ amp: 0.2 });
    const r = makeSignal({ amp: 0.1 });
    const [nl, nr] = normalizeSamples([l, r]);
    expect(Math.abs(dB(peakOf([nl, nr])) + 1)).toBeLessThan(0.1);
    expect(peakOf([nl]) / peakOf([nr])).toBeCloseTo(peakOf([l]) / peakOf([r]), 3);
  });

  it("supports a custom target and does not mutate the input", () => {
    const x = makeSignal({ amp: 0.5 });
    const copy = x.slice();
    const y = normalizeSamples([x], -6);
    expect(Math.abs(dB(peakOf(y)) + 6)).toBeLessThan(0.1);
    expect(x).toEqual(copy);
  });

  it("leaves silent input unchanged (no NaN, no division by zero)", () => {
    const [out] = normalizeSamples([new Float32Array(100)]);
    expect(out).toHaveLength(100);
    expect(peakOf([out])).toBe(0);
    expect(out.every((v) => Number.isFinite(v))).toBe(true);
    expect(normalizeSamples([new Float32Array(0)])[0]).toHaveLength(0);
  });
});

describe("applyFades", () => {
  it("zeroes the edges and leaves the middle untouched", () => {
    const x = new Float32Array(ms(100)).fill(0.8);
    const [y] = applyFades([x], SR, 5);
    const fade = ms(5);
    expect(Math.abs(y[0])).toBeLessThan(1e-6);
    expect(Math.abs(y[y.length - 1])).toBeLessThan(1e-6);
    expect(y[fade / 2]).toBeCloseTo(0.4, 3);
    for (let i = fade; i < y.length - fade; i++) expect(y[i]).toBe(x[i]);
    expect(x[0]).toBe(x[1]); // input not mutated
  });

  it("handles buffers shorter than two fades, one sample, and empty ones", () => {
    const [y] = applyFades([new Float32Array(10).fill(1)], SR, 5);
    expect(y).toHaveLength(10);
    expect(y[0]).toBe(0);
    expect(y[9]).toBe(0);
    expect(y.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(applyFades([new Float32Array(0)], SR)[0]).toHaveLength(0);
    expect(Array.from(applyFades([new Float32Array([0.5])], SR)[0])).toEqual([0.5]);
  });
});

describe("encodeWavSamples", () => {
  it("writes a correct 16-bit PCM header and interleaved data", () => {
    const l = new Float32Array([0, 1, -1, 0.5]);
    const r = new Float32Array([0, -0.5, 2, -2]); // out-of-range values are clipped
    const buf = encodeWavSamples([l, r], 44100);
    const v = new DataView(buf);
    const str = (o: number, n: number): string => String.fromCharCode(...new Uint8Array(buf, o, n));
    expect(buf.byteLength).toBe(44 + 4 * 2 * 2);
    expect(str(0, 4)).toBe("RIFF");
    expect(v.getUint32(4, true)).toBe(buf.byteLength - 8);
    expect(str(8, 4)).toBe("WAVE");
    expect(str(12, 4)).toBe("fmt ");
    expect(v.getUint32(16, true)).toBe(16);
    expect(v.getUint16(20, true)).toBe(1);
    expect(v.getUint16(22, true)).toBe(2);
    expect(v.getUint32(24, true)).toBe(44100);
    expect(v.getUint32(28, true)).toBe(44100 * 4);
    expect(v.getUint16(32, true)).toBe(4);
    expect(v.getUint16(34, true)).toBe(16);
    expect(str(36, 4)).toBe("data");
    expect(v.getUint32(40, true)).toBe(16);
    expect(v.getInt16(44 + 2 * 2, true)).toBe(32767); // l[1]
    expect(v.getInt16(44 + 3 * 2, true)).toBe(-16384); // r[1]
    expect(v.getInt16(44 + 4 * 2, true)).toBe(-32768); // l[2]
    expect(v.getInt16(44 + 5 * 2, true)).toBe(32767); // r[2] clipped
  });

  it("handles mono and empty input", () => {
    const mono = encodeWavSamples([new Float32Array(3)], 16000);
    expect(mono.byteLength).toBe(44 + 6);
    expect(new DataView(mono).getUint16(22, true)).toBe(1);
    const empty = encodeWavSamples([new Float32Array(0)], 16000);
    expect(empty.byteLength).toBe(44);
    expect(new DataView(empty).getUint32(40, true)).toBe(0);
  });
});

describe("pipeline", () => {
  it("trim → normalize → fade on a noisy, quiet recording", () => {
    const x = makeSignal({ amp: 0.1, noise: 0.005 });
    let ch = trimSamples([x], SR);
    ch = normalizeSamples(ch);
    ch = applyFades(ch, SR);
    expect(ch[0].length).toBeLessThan(x.length);
    expect(ch[0].length).toBeGreaterThanOrEqual(ms(400));
    expect(dB(peakOf(ch))).toBeLessThanOrEqual(-0.9);
    expect(Math.abs(ch[0][0])).toBeLessThan(1e-6);
  });
});
