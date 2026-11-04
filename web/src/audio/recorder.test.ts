import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MIC_CONSTRAINTS,
  RecorderError,
  cancel,
  currentConstraints,
  isRecording,
  levelFromRms,
  mapError,
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
  stop(): void {
    this.stopped = true;
  }
}

class FakeStream {
  tracks = [new FakeTrack()];
  getTracks(): FakeTrack[] {
    return this.tracks;
  }
}

class FakeRecorder {
  state = "inactive";
  mimeType = "";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  timeslice?: number;
  constructor(_s: unknown, opts?: { mimeType?: string }) {
    this.mimeType = opts?.mimeType ?? "";
  }
  start(timeslice?: number): void {
    this.state = "recording";
    this.timeslice = timeslice;
  }
  stop(): void {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["abc"], { type: this.mimeType }) });
    this.onstop?.();
  }
}

function installFakes(getUserMedia: () => Promise<unknown>) {
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.spyOn(console, "warn").mockImplementation(() => {}); // no AudioContext in Node: meter disabled
}

describe("start/stop lifecycle (fakes)", () => {
  afterEach(() => {
    cancel();
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
});
