// Audio engine: pure sample-level functions (Node-testable) plus thin
// AudioBuffer / AudioContext wrappers (browser only).
// No browser globals are touched at import time.

export type Channels = Float32Array[];

export interface TrimOptions {
  /** RMS window length in ms (default 10). */
  windowMs?: number;
  /** Margin kept before the first and after the last loud window, in ms (default 50). */
  marginMs?: number;
  /** RMS threshold in linear units; derived from the signal when omitted. */
  threshold?: number;
  /**
   * Consecutive windows that must be above threshold to count as voice
   * (default 3, i.e. ~30 ms): an isolated click (e.g. the tap that stops the
   * recording) is not voice and gets trimmed away.
   */
  minWindows?: number;
}

export interface TrimBounds {
  /** First kept sample index. */
  start: number;
  /** Exclusive end sample index. */
  end: number;
}

export interface TrimAnalysis extends TrimBounds {
  /** false when no run of minWindows windows is above threshold (silence / faint noise / clicks only). */
  voiced: boolean;
}

export interface ProcessInfo {
  /** Same as findTrimBounds found voice: false means "troppo basso / niente voce". */
  voiced: boolean;
  /** Gain actually applied by normalization, in dB (0 for silent input). */
  gainDb: number;
}

export interface ProcessResult extends ProcessInfo {
  buffer: AudioBuffer;
}

export interface ProcessSamplesResult extends ProcessInfo {
  channels: Channels;
}

export interface PlayOptions {
  onEnded?: () => void;
  meta?: object;
}

export interface SpyEntry {
  meta: object | undefined;
  duration: number;
  at: number;
}

export interface ReverseurSpy {
  started: SpyEntry[];
}

declare global {
  // eslint-disable-next-line no-var
  var __reverseurSpy: ReverseurSpy | undefined;
  // eslint-disable-next-line no-var
  var webkitAudioContext: typeof AudioContext | undefined;
}

// ---------------------------------------------------------------------------
// Pure functions on Float32Array
// ---------------------------------------------------------------------------

/** Returns a new, reversed copy of the samples. */
export function reverseSamples(samples: Float32Array): Float32Array {
  const n = samples.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = samples[n - 1 - i];
  return out;
}

/**
 * Finds the [start, end) sample range containing voice, with a margin kept on
 * both sides, and tells whether any voice was found. RMS is measured over
 * consecutive windows of `windowMs`, combining all channels (mean of squares
 * across channels). Voice = a run of at least `minWindows` (default 3)
 * consecutive windows above threshold; voice starts at the first such run and
 * ends at the last one, so isolated clicks before/after are cut.
 *
 * Default threshold is robust against a constant noise floor:
 *   max(0.01, 0.1 * sustainedMax, min(2 * noiseFloor, 0.25 * sustainedMax))
 * where noiseFloor is the 10th-percentile window RMS and sustainedMax is the
 * highest RMS held for `minWindows` consecutive windows (so a loud click does
 * not raise the threshold above a quiet voice). The noise-floor term is capped
 * so that a recording that is speech from start to end is not over-trimmed.
 * If no voice is found (pure silence / faint noise / clicks only) the whole
 * buffer is kept: { start: 0, end: length, voiced: false }.
 */
export function analyzeTrim(channels: Channels, sampleRate: number, opts: TrimOptions = {}): TrimAnalysis {
  const { windowMs = 10, marginMs = 50 } = opts;
  const length = channels.length ? channels[0].length : 0;
  if (length === 0 || !(sampleRate > 0)) return { start: 0, end: length, voiced: false };

  const win = Math.max(1, Math.round((sampleRate * windowMs) / 1000));
  const margin = Math.max(0, Math.round((sampleRate * marginMs) / 1000));
  const nWin = Math.ceil(length / win);
  const rms = new Float64Array(nWin);

  for (let w = 0; w < nWin; w++) {
    const s = w * win;
    const e = Math.min(length, s + win);
    let sum = 0;
    for (const ch of channels) {
      for (let i = s; i < e; i++) sum += ch[i] * ch[i];
    }
    rms[w] = Math.sqrt(sum / ((e - s) * channels.length));
  }

  // A buffer shorter than minWindows windows can still be voice.
  const minRun = Math.max(1, Math.min(Math.round(opts.minWindows ?? 3), nWin));

  let threshold = opts.threshold;
  if (threshold === undefined) {
    // Highest level sustained for minRun consecutive windows.
    let sustainedMax = 0;
    for (let w = 0; w + minRun <= nWin; w++) {
      let m = Infinity;
      for (let k = w; k < w + minRun; k++) if (rms[k] < m) m = rms[k];
      if (m > sustainedMax) sustainedMax = m;
    }
    const sorted = Array.from(rms).sort((a, b) => a - b);
    const noiseFloor = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
    threshold = Math.max(0.01, 0.1 * sustainedMax, Math.min(2 * noiseFloor, 0.25 * sustainedMax));
  }

  let first = -1;
  let last = -1;
  let runStart = -1;
  for (let w = 0; w <= nWin; w++) {
    const loud = w < nWin && rms[w] >= threshold && rms[w] > 0;
    if (loud) {
      if (runStart < 0) runStart = w;
    } else if (runStart >= 0) {
      if (w - runStart >= minRun) {
        if (first < 0) first = runStart;
        last = w - 1;
      }
      runStart = -1;
    }
  }
  if (first < 0) return { start: 0, end: length, voiced: false };

  const start = Math.max(0, first * win - margin);
  const end = Math.min(length, (last + 1) * win + margin);
  return { start, end, voiced: true };
}

/** [start, end) of the voice plus margins (see analyzeTrim); whole buffer if no voice. */
export function findTrimBounds(channels: Channels, sampleRate: number, opts: TrimOptions = {}): TrimBounds {
  const { start, end } = analyzeTrim(channels, sampleRate, opts);
  return { start, end };
}

/** Slices every channel to the bounds found by findTrimBounds (new arrays). */
export function trimSamples(channels: Channels, sampleRate: number, opts?: TrimOptions): Channels {
  const { start, end } = findTrimBounds(channels, sampleRate, opts);
  return channels.map((ch) => ch.slice(start, end));
}

/** Maximum absolute sample value across all channels. */
export function peakOf(channels: Channels): number {
  let peak = 0;
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i++) {
      const a = Math.abs(ch[i]);
      if (a > peak) peak = a;
    }
  }
  return peak;
}

/** Below this peak (-80 dBFS) the input is treated as silent and not amplified. */
export const SILENT_PEAK = 1e-4;

/** Maximum normalization gain used by process() when voice was found (+24 dB). */
export const MAX_GAIN_DB = 24;
/** Maximum normalization gain used by process() when no voice was found (+12 dB): noise stays quiet. */
export const UNVOICED_MAX_GAIN_DB = 12;

/** Gain in dB that normalizeSamples applies (0 for silent input). */
export function normalizeGainDb(channels: Channels, targetDb = -1, maxGainDb = Infinity): number {
  const peak = peakOf(channels);
  if (peak < SILENT_PEAK) return 0;
  return Math.min(targetDb - 20 * Math.log10(peak), maxGainDb);
}

/**
 * New arrays scaled so that the peak equals targetDb dBFS, but never by more
 * than maxGainDb (default: unlimited). Silent input is copied unchanged.
 */
export function normalizeSamples(channels: Channels, targetDb = -1, maxGainDb = Infinity): Channels {
  const gainDb = normalizeGainDb(channels, targetDb, maxGainDb);
  if (gainDb === 0) return channels.map((ch) => ch.slice());
  const gain = Math.pow(10, gainDb / 20);
  return channels.map((ch) => {
    const out = new Float32Array(ch.length);
    for (let i = 0; i < ch.length; i++) out[i] = ch[i] * gain;
    return out;
  });
}

/**
 * Whole pipeline on samples: trim (voice detection) → normalize to −1 dBFS
 * with a capped gain (MAX_GAIN_DB, or UNVOICED_MAX_GAIN_DB when no voice was
 * found, so a "silent" recording with hiss is not blown up) → 5 ms fades.
 */
export function processSamples(channels: Channels, sampleRate: number): ProcessSamplesResult {
  const t = analyzeTrim(channels, sampleRate);
  let chans: Channels = channels.map((ch) => ch.slice(t.start, t.end));
  const cap = t.voiced ? MAX_GAIN_DB : UNVOICED_MAX_GAIN_DB;
  const gainDb = normalizeGainDb(chans, -1, cap);
  chans = normalizeSamples(chans, -1, cap);
  chans = applyFades(chans, sampleRate, 5);
  return { channels: chans, voiced: t.voiced, gainDb };
}

/** New arrays with a linear fade-in and fade-out of fadeMs (shortened for very short input). */
export function applyFades(channels: Channels, sampleRate: number, fadeMs = 5): Channels {
  return channels.map((ch) => {
    const out = ch.slice();
    const n = out.length;
    const len = Math.min(Math.round((sampleRate * fadeMs) / 1000), Math.floor(n / 2));
    for (let i = 0; i < len; i++) {
      const g = i / len;
      out[i] *= g;
      out[n - 1 - i] *= g;
    }
    return out;
  });
}

/** Encodes channels as an interleaved 16-bit PCM WAV file. */
export function encodeWavSamples(channels: Channels, sampleRate: number): ArrayBuffer {
  const numCh = Math.max(1, channels.length);
  const frames = channels.length ? channels[0].length : 0;
  const blockAlign = numCh * 2;
  const dataSize = frames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buffer);
  const str = (off: number, s: string): void => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  str(0, "RIFF");
  v.setUint32(4, 36 + dataSize, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true); // fmt chunk size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, numCh, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * blockAlign, true);
  v.setUint16(32, blockAlign, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, dataSize, true);
  let off = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < numCh; c++) {
      const ch = channels[c] as Float32Array | undefined;
      const s = Math.max(-1, Math.min(1, (ch ? ch[i] : 0) || 0));
      v.setInt16(off, s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff), true);
      off += 2;
    }
  }
  return buffer;
}

// ---------------------------------------------------------------------------
// AudioContext / AudioBuffer wrappers (browser only)
// ---------------------------------------------------------------------------

interface Current {
  source: AudioBufferSourceNode;
  finish: () => void;
}

let ctx: AudioContext | null = null;
let current: Current | null = null;
let spyEnabled = false;

/** Lazily creates the ONE shared AudioContext (webkitAudioContext fallback). */
export function getContext(): AudioContext {
  if (!ctx) {
    const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Ctor) throw new Error("Web Audio API not supported");
    ctx = new Ctor();
  }
  return ctx;
}

/** getContext() + resume(). Must be called inside a user gesture (iOS). */
export async function ensureRunning(): Promise<void> {
  const c = getContext();
  if (c.state !== "running") {
    try {
      await c.resume();
    } catch {
      /* ignore: will retry on the next gesture */
    }
  }
}

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as ArrayBuffer);
    fr.onerror = () => reject(fr.error);
    fr.readAsArrayBuffer(blob);
  });
}

/** Decodes a Blob into an AudioBuffer (callback form for old Safari, copied input). */
export async function decode(blob: Blob): Promise<AudioBuffer> {
  const c = getContext();
  const ab = await blobToArrayBuffer(blob);
  const copy = ab.slice(0); // decodeAudioData detaches its input
  return new Promise<AudioBuffer>((resolve, reject) => {
    let settled = false;
    const ok = (buf: AudioBuffer): void => {
      if (!settled) {
        settled = true;
        resolve(buf);
      }
    };
    const fail = (err?: unknown): void => {
      if (!settled) {
        settled = true;
        reject(err ?? new Error("decodeAudioData failed"));
      }
    };
    try {
      const p = c.decodeAudioData(copy, ok, fail) as Promise<AudioBuffer> | undefined;
      if (p && typeof p.then === "function") p.then(ok, fail);
    } catch (err) {
      fail(err);
    }
  });
}

function channelsOf(buf: AudioBuffer): Channels {
  const out: Channels = [];
  for (let c = 0; c < buf.numberOfChannels; c++) out.push(buf.getChannelData(c));
  return out;
}

function bufferFrom(channels: Channels, sampleRate: number): AudioBuffer {
  const c = getContext();
  // createBuffer requires length >= 1.
  const len = Math.max(1, channels.length ? channels[0].length : 0);
  const buf = c.createBuffer(Math.max(1, channels.length), len, sampleRate);
  channels.forEach((ch, i) => {
    buf.getChannelData(i).set(ch.length > len ? ch.subarray(0, len) : ch);
  });
  return buf;
}

export function reverse(buf: AudioBuffer): AudioBuffer {
  return bufferFrom(channelsOf(buf).map(reverseSamples), buf.sampleRate);
}

export function trimSilence(buf: AudioBuffer): AudioBuffer {
  return bufferFrom(trimSamples(channelsOf(buf), buf.sampleRate), buf.sampleRate);
}

export function normalize(buf: AudioBuffer): AudioBuffer {
  return bufferFrom(normalizeSamples(channelsOf(buf), -1), buf.sampleRate);
}

/**
 * trimSilence → normalize (gain capped, see processSamples) → 5 ms fades,
 * plus whether voice was found and the gain applied. `voiced: false` lets the
 * UI say the recording is too quiet.
 */
export function processWithInfo(buf: AudioBuffer): ProcessResult {
  const r = processSamples(channelsOf(buf), buf.sampleRate);
  return { buffer: bufferFrom(r.channels, buf.sampleRate), voiced: r.voiced, gainDb: r.gainDb };
}

/** trimSilence → normalize → 5 ms fades, in a single new AudioBuffer (= processWithInfo(buf).buffer). */
export function process(buf: AudioBuffer): AudioBuffer {
  return processWithInfo(buf).buffer;
}

/**
 * Plays a buffer, stopping anything already playing. Returns stopFn.
 * onEnded fires exactly once (natural end, stopFn, stopAll, or a newer play()).
 */
export function play(buf: AudioBuffer, opts: PlayOptions = {}): () => void {
  const { onEnded, meta } = opts;
  stopAll();
  const c = getContext();
  const source = c.createBufferSource();
  source.buffer = buf;
  source.connect(c.destination);

  let done = false;
  const finish = (): void => {
    if (done) return;
    done = true;
    source.onended = null;
    try {
      source.disconnect();
    } catch {
      /* already disconnected */
    }
    if (current === entry) current = null;
    if (onEnded) {
      try {
        onEnded();
      } catch (err) {
        console.error(err);
      }
    }
  };
  const entry: Current = { source, finish };
  source.onended = finish;
  current = entry;
  source.start();

  if (spyEnabled && globalThis.__reverseurSpy) {
    globalThis.__reverseurSpy.started.push({
      meta,
      duration: buf.duration,
      at: performance.now(),
    });
  }

  return function stop(): void {
    if (done) return;
    try {
      source.stop();
    } catch {
      /* not started / already stopped */
    }
    finish();
  };
}

export function stopAll(): void {
  const entry = current;
  if (!entry) return;
  try {
    entry.source.stop();
  } catch {
    /* ignore */
  }
  entry.finish();
}

export function isPlaying(): boolean {
  return current !== null;
}

export function toWavBlob(buf: AudioBuffer): Blob {
  return new Blob([encodeWavSamples(channelsOf(buf), buf.sampleRate)], { type: "audio/wav" });
}

/** Installs window.__reverseurSpy = { started: [] } (test mode only). */
export function enableTestSpy(): void {
  spyEnabled = true;
  if (!globalThis.__reverseurSpy) globalThis.__reverseurSpy = { started: [] };
}
