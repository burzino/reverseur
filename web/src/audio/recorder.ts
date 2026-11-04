// Microphone recording: getUserMedia + MediaRecorder → Blob, with a VU level
// callback. No browser globals are touched at import time.

import { getContext } from "./audio";

export const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg"] as const;

export type RecorderErrorCode = "denied" | "notfound" | "unsupported" | "busy" | "unknown";

export const MIC_CONSTRAINTS: Readonly<MediaTrackConstraints> = Object.freeze({
  echoCancellation: false,
  noiseSuppression: true,
  autoGainControl: true,
});

/** Alternative used with `?mic=alt` for a manual A/B comparison (see DECISIONS.md). */
export const MIC_CONSTRAINTS_ALT: Readonly<MediaTrackConstraints> = Object.freeze({
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
});

export class RecorderError extends Error {
  readonly code: RecorderErrorCode;

  constructor(code: RecorderErrorCode, message?: string, cause?: unknown) {
    super(message ?? code);
    this.name = "RecorderError";
    this.code = code;
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

function defaultIsSupported(t: string): boolean {
  const MR = globalThis.MediaRecorder as typeof MediaRecorder | undefined;
  if (!MR || typeof MR.isTypeSupported !== "function") return false;
  try {
    return MR.isTypeSupported(t);
  } catch {
    return false;
  }
}

/** First supported MIME type in preference order, "" if none (the browser then chooses). */
export function pickMimeType(isSupported: (t: string) => boolean = defaultIsSupported): string {
  for (const t of MIME_CANDIDATES) {
    try {
      if (isSupported(t)) return t;
    } catch {
      /* treat as unsupported */
    }
  }
  return "";
}

/** Constraints for this page load (reads `?mic=alt` lazily). */
export function currentConstraints(search?: string): MediaTrackConstraints {
  try {
    const q = search ?? (globalThis.location ? globalThis.location.search : "");
    if (new URLSearchParams(q).get("mic") === "alt") return { ...MIC_CONSTRAINTS_ALT };
  } catch {
    /* ignore */
  }
  return { ...MIC_CONSTRAINTS };
}

/** Maps getUserMedia / MediaRecorder failures to a RecorderError. */
export function mapError(err: unknown): RecorderError {
  if (err instanceof RecorderError) return err;
  const name = (err as { name?: string } | null)?.name;
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") {
    return new RecorderError("denied", "Microphone permission denied", err);
  }
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") {
    return new RecorderError("notfound", "No usable microphone", err);
  }
  const message = (err as { message?: string } | null)?.message;
  return new RecorderError("unknown", message || "Recording failed", err);
}

// --- session state ---------------------------------------------------------

interface Session {
  stream: MediaStream;
  recorder: MediaRecorder;
  chunks: Blob[];
  mimeType: string;
  analyser: AnalyserNode | null;
  source: MediaStreamAudioSourceNode | null;
  raf: number | ReturnType<typeof setTimeout> | null;
}

let session: Session | null = null;
let starting = false;
let cancelWhileStarting = false;
const levelListeners = new Set<(level: number) => void>();

function emitLevel(level: number): void {
  for (const cb of levelListeners) {
    try {
      cb(level);
    } catch (err) {
      console.error(err);
    }
  }
}

function stopTracks(stream: MediaStream | null): void {
  if (!stream) return;
  for (const t of stream.getTracks()) {
    try {
      t.stop();
    } catch {
      /* ignore */
    }
  }
}

const hasRaf = (): boolean => typeof globalThis.requestAnimationFrame === "function";

function startMeter(s: Session): void {
  try {
    const ctx = getContext();
    const source = ctx.createMediaStreamSource(s.stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser); // NOT connected to destination (no feedback)
    s.source = source;
    s.analyser = analyser;
    const data = new Float32Array(analyser.fftSize);
    const bytes = new Uint8Array(analyser.fftSize);
    const schedule = (fn: () => void) => (hasRaf() ? requestAnimationFrame(fn) : setTimeout(fn, 16));
    const tick = (): void => {
      if (session !== s || !s.analyser) return;
      if (typeof analyser.getFloatTimeDomainData === "function") {
        analyser.getFloatTimeDomainData(data);
      } else {
        // very old Safari: byte data centred on 128
        analyser.getByteTimeDomainData(bytes);
        for (let i = 0; i < bytes.length; i++) data[i] = (bytes[i] - 128) / 128;
      }
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      emitLevel(levelFromRms(Math.sqrt(sum / data.length)));
      s.raf = schedule(tick);
    };
    s.raf = schedule(tick);
  } catch (err) {
    // The VU meter is cosmetic: never fail the recording because of it.
    console.warn("Level meter unavailable", err);
  }
}

/** Maps RMS to 0..1 with gain so normal speech (RMS ~0.05–0.2) reads well. */
export function levelFromRms(rms: number): number {
  if (!(rms > 0)) return 0;
  return Math.min(1, Math.sqrt(rms * 4));
}

function stopMeter(s: Session): void {
  if (s.raf != null) {
    if (hasRaf() && typeof s.raf === "number") cancelAnimationFrame(s.raf);
    clearTimeout(s.raf as ReturnType<typeof setTimeout>);
    s.raf = null;
  }
  try {
    s.source?.disconnect();
  } catch {
    /* ignore */
  }
  try {
    s.analyser?.disconnect();
  } catch {
    /* ignore */
  }
  s.source = null;
  s.analyser = null;
  emitLevel(0);
}

function teardown(s: Session): void {
  stopMeter(s);
  stopTracks(s.stream);
  if (session === s) session = null;
}

// --- public API ------------------------------------------------------------

export function isRecording(): boolean {
  return session !== null || starting;
}

/** getUserMedia({ audio: MIC_CONSTRAINTS }) then MediaRecorder.start(). Rejects with RecorderError. */
export async function start(): Promise<void> {
  if (session || starting) throw new RecorderError("busy", "Already recording");
  const md = (globalThis.navigator as Navigator | undefined)?.mediaDevices;
  if (!md || typeof md.getUserMedia !== "function" || typeof globalThis.MediaRecorder !== "function") {
    throw new RecorderError("unsupported", "Recording not supported in this browser");
  }
  starting = true;
  cancelWhileStarting = false;
  let stream: MediaStream | null = null;
  try {
    stream = await md.getUserMedia({ audio: currentConstraints() });
    if (cancelWhileStarting) {
      // cancel() was called while the permission prompt was open.
      stopTracks(stream);
      return;
    }
    const mimeType = pickMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const s: Session = {
      stream,
      recorder,
      chunks: [],
      mimeType: mimeType || recorder.mimeType || "",
      analyser: null,
      source: null,
      raf: null,
    };
    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) s.chunks.push(e.data);
    };
    recorder.onerror = () => {
      // Unexpected recorder failure: release the microphone.
      teardown(s);
    };
    session = s;
    recorder.start(100); // timeslice so Safari delivers data
    startMeter(s);
  } catch (err) {
    stopTracks(stream);
    if (session && session.stream === stream) teardown(session);
    throw mapError(err);
  } finally {
    starting = false;
  }
}

/** Stops the recorder, ALWAYS stops every track, resolves the Blob. */
export function stop(): Promise<Blob> {
  const s = session;
  if (!s) return Promise.reject(new RecorderError("unknown", "Not recording"));
  return new Promise<Blob>((resolve, reject) => {
    const { recorder } = s;
    const finish = (): void => {
      teardown(s);
      const type = s.mimeType || recorder.mimeType || s.chunks[0]?.type || "";
      const blob = new Blob(s.chunks, type ? { type } : undefined);
      if (blob.size === 0) reject(new RecorderError("unknown", "Empty recording"));
      else resolve(blob);
    };
    if (recorder.state === "inactive") {
      finish();
      return;
    }
    recorder.onstop = finish;
    try {
      recorder.stop();
    } catch (err) {
      teardown(s);
      reject(mapError(err));
    }
  });
}

/** Like stop() but discards data; safe to call when idle. */
export function cancel(): void {
  if (starting) cancelWhileStarting = true;
  const s = session;
  if (!s) return;
  s.chunks = [];
  s.recorder.ondataavailable = null;
  s.recorder.onstop = null;
  try {
    if (s.recorder.state !== "inactive") s.recorder.stop();
  } catch {
    /* ignore */
  }
  teardown(s);
}

/** Subscribe to level updates (0..1, ~every animation frame) while recording. Returns unsubscribe. */
export function onLevel(cb: (level: number) => void): () => void {
  levelListeners.add(cb);
  return () => {
    levelListeners.delete(cb);
  };
}
