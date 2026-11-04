import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MIC_CONSTRAINTS,
  RecorderError,
  cancel,
  currentConstraints,
  isRecording,
  levelFromRms,
  mapError,
  onError,
  pickMimeType,
  start,
  stop,
} from "./recorder";

describe("pickMimeType", () => {
  it("prefers webm/opus, then mp4, then ogg", () => {
    expect(pickMimeType(() => true)).toBe("audio/webm;codecs=opus");
    expect(pickMimeType((t) => t !== "audio/webm;codecs=opus")).toBe("audio/mp4");
    expect(pickMimeType((t) => t === "audio/ogg")).toBe("audio/ogg");
    expect(pickMimeType((t) => t === "audio/ogg" || t === "audio/mp4")).toBe("audio/mp4");
    expect(pickMimeType(() => false)).toBe("");
  });

  it("queries candidates in order and tolerates a throwing check", () => {
    const seen: string[] = [];
    pickMimeType((t) => {
      seen.push(t);
      return false;
    });
    expect(seen).toEqual(["audio/webm;codecs=opus", "audio/mp4", "audio/ogg"]);
    expect(
      pickMimeType((t) => {
        if (t === "audio/webm;codecs=opus") throw new Error("boom");
        return true;
      }),
    ).toBe("audio/mp4");
  });

  it("default works without MediaRecorder / isTypeSupported (Node)", () => {
    expect(pickMimeType()).toBe("");
  });
});

describe("constraints and errors", () => {
  it("MIC_CONSTRAINTS match the spec, ?mic=alt enables echo cancellation", () => {
    expect({ ...MIC_CONSTRAINTS }).toEqual({ echoCancellation: false, noiseSuppression: true, autoGainControl: true });
    expect(currentConstraints("")).toEqual({ ...MIC_CONSTRAINTS });
    expect(currentConstraints("?mic=alt").echoCancellation).toBe(true);
  });

  it("maps getUserMedia errors to codes", () => {
    const e = (name: string) => Object.assign(new Error(name), { name });
    expect(mapError(e("NotAllowedError")).code).toBe("denied");
    expect(mapError(e("SecurityError")).code).toBe("denied");
    expect(mapError(e("NotFoundError")).code).toBe("notfound");
    expect(mapError(e("OverconstrainedError")).code).toBe("notfound");
    expect(mapError(e("Weird")).code).toBe("unknown");
    const busy = new RecorderError("busy");
    expect(mapError(busy)).toBe(busy);
  });

  it("levelFromRms is 0..1 and monotonic", () => {
    expect(levelFromRms(0)).toBe(0);
    expect(levelFromRms(0.05)).toBeGreaterThan(0.3);
    expect(levelFromRms(10)).toBe(1);
  });
});

// --- start/stop with fake browser APIs --------------------------------------

class FakeTrack {
  stopped = false;
  onended: (() => void) | null = null;
  stop(): void {
    this.stopped = true; // like the real API: our own stop() does not fire 'ended'
  }
  /** Simulates the mic being unplugged / an iOS interruption. */
  end(): void {
    this.stopped = true;
    this.onended?.();
  }
}

class FakeStream {
  tracks = [new FakeTrack()];
  getTracks(): FakeTrack[] {
    return this.tracks;
  }
}

class FakeRecorder {
  static instances: FakeRecorder[] = [];
  /** When true, stop() delivers data/onstop only on flush() (like a real async recorder). */
  static deferStop = false;
  state = "inactive";
  mimeType = "";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  timeslice?: number;
  constructor(_s: unknown, opts?: { mimeType?: string }) {
    this.mimeType = opts?.mimeType ?? "";
    FakeRecorder.instances.push(this);
  }
  start(timeslice?: number): void {
    this.state = "recording";
    this.timeslice = timeslice;
  }
  stop(): void {
    this.state = "inactive";
    if (!FakeRecorder.deferStop) this.flush();
  }
  flush(): void {
    this.ondataavailable?.({ data: new Blob(["abc"], { type: this.mimeType }) });
    this.onstop?.();
  }
}

const lastRecorder = (): FakeRecorder => FakeRecorder.instances[FakeRecorder.instances.length - 1];

function installFakes(getUserMedia: () => Promise<unknown>) {
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.spyOn(console, "warn").mockImplementation(() => {}); // no AudioContext in Node: meter disabled
}

describe("start/stop lifecycle (fakes)", () => {
  afterEach(() => {
    cancel();
    FakeRecorder.deferStop = false;
    FakeRecorder.instances = [];
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects with 'unsupported' when APIs are missing", async () => {
    expect(isRecording()).toBe(false);
    cancel(); // safe when idle
    await expect(start()).rejects.toMatchObject({ code: "unsupported" });
  });

  it("records, stops every track, resolves a Blob", async () => {
    const stream = new FakeStream();
    installFakes(async () => stream);
    await start();
    expect(isRecording()).toBe(true);
    await expect(start()).rejects.toMatchObject({ code: "busy" });
    const blob = await stop();
    expect(blob.size).toBe(3);
    expect(stream.tracks[0].stopped).toBe(true);
    expect(isRecording()).toBe(false);
  });

  it("maps permission denial to 'denied'", async () => {
    installFakes(async () => {
      throw Object.assign(new Error("no"), { name: "NotAllowedError" });
    });
    await expect(start()).rejects.toMatchObject({ code: "denied" });
    expect(isRecording()).toBe(false);
  });

  it("cancel() stops the tracks and discards data", async () => {
    const stream = new FakeStream();
    installFakes(async () => stream);
    await start();
    cancel();
    expect(stream.tracks[0].stopped).toBe(true);
    expect(isRecording()).toBe(false);
    await expect(stop()).rejects.toBeInstanceOf(RecorderError);
  });

  it("cancel() during the permission prompt releases the stream", async () => {
    const stream = new FakeStream();
    let release!: (s: FakeStream) => void;
    installFakes(() => new Promise((r) => (release = r)));
    const p = start();
    cancel();
    release(stream);
    await p;
    expect(stream.tracks[0].stopped).toBe(true);
    expect(isRecording()).toBe(false);
  });

  it("cancel() during the prompt fully resets: a new start() works, the stale stream is released later", async () => {
    const stale = new FakeStream();
    const fresh = new FakeStream();
    let release!: (s: FakeStream) => void;
    let calls = 0;
    installFakes(() => (++calls === 1 ? new Promise((r) => (release = r)) : Promise.resolve(fresh)));
    const p1 = start();
    expect(isRecording()).toBe(true);
    cancel();
    expect(isRecording()).toBe(false);
    await start(); // no 'busy'
    expect(isRecording()).toBe(true);
    release(stale);
    await expect(p1).resolves.toBeUndefined();
    expect(stale.tracks[0].stopped).toBe(true);
    expect(fresh.tracks[0].stopped).toBe(false);
    expect(isRecording()).toBe(true); // the new session is untouched
    expect((await stop()).size).toBe(3);
    expect(fresh.tracks[0].stopped).toBe(true);
  });

  it("a getUserMedia rejection after cancel() is swallowed", async () => {
    let fail!: (e: unknown) => void;
    installFakes(() => new Promise((_r, j) => (fail = j)));
    const p = start();
    cancel();
    fail(Object.assign(new Error("no"), { name: "NotAllowedError" }));
    await expect(p).resolves.toBeUndefined();
    expect(isRecording()).toBe(false);
  });

  it("cancel() between recorder.stop() and onstop settles stop() (rejects 'unknown')", async () => {
    const stream = new FakeStream();
    installFakes(async () => stream);
    await start();
    FakeRecorder.deferStop = true;
    const p = stop();
    expect(stop()).toBe(p); // repeated stop() shares the promise
    cancel();
    await expect(p).rejects.toMatchObject({ code: "unknown", message: "Recording cancelled" });
    expect(stream.tracks[0].stopped).toBe(true);
    expect(isRecording()).toBe(false);
    lastRecorder().flush(); // a late onstop is harmless (handlers detached)
  });
});

describe("onError (fakes)", () => {
  afterEach(() => {
    cancel();
    FakeRecorder.deferStop = false;
    FakeRecorder.instances = [];
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("MediaRecorder error: tears down, then notifies once", async () => {
    const stream = new FakeStream();
    installFakes(async () => stream);
    const seen: { code: string; stopped: boolean; recording: boolean }[] = [];
    const off = onError((err) =>
      seen.push({ code: err.code, stopped: stream.tracks[0].stopped, recording: isRecording() }),
    );
    await start();
    const rec = lastRecorder();
    rec.onerror?.();
    rec.onerror?.(); // handlers were detached: no second call
    stream.tracks[0].end();
    expect(seen).toEqual([{ code: "unknown", stopped: true, recording: false }]);
    await expect(stop()).rejects.toBeInstanceOf(RecorderError);
    off();
  });

  it("microphone track ended (unplugged / iOS interruption) notifies the UI", async () => {
    const stream = new FakeStream();
    installFakes(async () => stream);
    const cb = vi.fn();
    const off = onError(cb);
    await start();
    stream.tracks[0].end();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0]).toBeInstanceOf(RecorderError);
    expect(cb.mock.calls[0][0].message).toBe("Microphone track ended");
    expect(isRecording()).toBe(false);
    off();
    await start();
    stream.tracks[0].end();
    expect(cb).toHaveBeenCalledTimes(1); // unsubscribed
  });

  it("an error while stop() is pending rejects stop() instead of notifying", async () => {
    const stream = new FakeStream();
    installFakes(async () => stream);
    const cb = vi.fn();
    const off = onError(cb);
    await start();
    FakeRecorder.deferStop = true;
    const p = stop();
    lastRecorder().onerror?.();
    await expect(p).rejects.toMatchObject({ code: "unknown" });
    expect(cb).not.toHaveBeenCalled();
    expect(stream.tracks[0].stopped).toBe(true);
    off();
  });

  it("cancel() does not notify", async () => {
    installFakes(async () => new FakeStream());
    const cb = vi.fn();
    const off = onError(cb);
    await start();
    cancel();
    expect(cb).not.toHaveBeenCalled();
    off();
  });
});
