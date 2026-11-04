# Interfaces between modules (orchestrator contract)

Stack: Svelte 5 + TypeScript + Vite in `web/` (see STATO.md). Module locations:
`web/src/audio/audio.ts`, `web/src/audio/recorder.ts`, `web/src/ui/holdButton.ts`
(+ Svelte action `hold`), `web/src/ui/state.svelte.ts` (store), `web/src/ui/testi.ts`
(i18n). Sections below still say `js/*.js` / `main.js`: read them as these TS
modules and the Svelte components (`App.svelte`). No module except the UI
entry point may touch `window`/`document`/`navigator` at import time, so that
the pure functions can be unit-tested by Vitest in the node environment.

Constants:

| Constant | Module | Value |
|---|---|---|
| `HOLD_TO_PLAY_MS` | `holdButton.js` (exported) | `200` |
| `MAX_RECORD_MS` | `main.js` | `10000` |

---

## `js/audio.js`

### Pure functions (operate on `Float32Array`, no browser APIs, unit-tested in Node)

```js
reverseSamples(samples: Float32Array): Float32Array          // new array, reversed
findTrimBounds(channels: Float32Array[], sampleRate: number,
               opts?: { windowMs = 10, marginMs = 50, threshold?: number })
  : { start: number, end: number }   // sample indices, end exclusive.
                                     // threshold = RMS in linear units; default derived
                                     // (e.g. max(0.01, 0.1 * maxWindowRms)). If nothing is
                                     // above threshold returns { start: 0, end: length }.
trimSamples(channels, sampleRate, opts?) : Float32Array[]    // slices using findTrimBounds
peakOf(channels: Float32Array[]): number                     // max |x|
normalizeSamples(channels, targetDb = -1): Float32Array[]    // new arrays, peak = 10^(-1/20)
                                                             // silent input returned unchanged
applyFades(channels, sampleRate, fadeMs = 5): Float32Array[] // new arrays, linear fade in/out
encodeWavSamples(channels, sampleRate): ArrayBuffer          // 16-bit PCM WAV
```

### AudioBuffer wrappers (need an `AudioContext`, browser only)

```js
getContext(): AudioContext       // lazily creates the ONE shared context
ensureRunning(): Promise<void>   // getContext() + resume(); MUST be called inside a user gesture
decode(blob: Blob): Promise<AudioBuffer>
reverse(buf: AudioBuffer): AudioBuffer
trimSilence(buf: AudioBuffer): AudioBuffer
normalize(buf: AudioBuffer): AudioBuffer
process(buf: AudioBuffer): AudioBuffer      // trimSilence → normalize → fades (5 ms)
play(buf: AudioBuffer, opts?: { onEnded?: () => void, meta?: object }): () => void
     // Stops whatever is playing first (only one sound at a time), starts an
     // AudioBufferSourceNode, returns stopFn. onEnded fires once, both on natural
     // end and on stop (stopFn or stopAll or a newer play()).
stopAll(): void
isPlaying(): boolean
toWavBlob(buf: AudioBuffer): Blob           // 'audio/wav'
enableTestSpy(): void
     // Installs window.__reverseurSpy = { started: [] }. Every play() pushes
     // { meta, duration: buf.duration, at: performance.now() } right after
     // source.start(). Called by main.js only when the URL has ?test.
```

## `js/recorder.js`

```js
pickMimeType(isSupported = (t) => MediaRecorder.isTypeSupported(t)): string
     // first supported of 'audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg'; '' if none
start(): Promise<void>
     // getUserMedia({ audio: MIC_CONSTRAINTS }) then MediaRecorder.start().
     // Rejects with RecorderError.
stop(): Promise<Blob>
     // Stops recorder, ALWAYS calls track.stop() on every track (iOS earpiece bug),
     // disconnects the level analyser, resolves the Blob (type = chosen mimeType).
cancel(): void          // like stop() but discards data; safe to call when idle
isRecording(): boolean
onLevel(cb: (level: number) => void): () => void
     // level 0..1 (RMS-based, ~ every animation frame) while recording; returns unsubscribe
export class RecorderError extends Error { code: 'denied' | 'notfound' | 'unsupported' | 'busy' | 'unknown' }
export const MIC_CONSTRAINTS = { echoCancellation: false, noiseSuppression: true, autoGainControl: true }
     // if the URL has ?mic=alt, use { echoCancellation: true, noiseSuppression: true,
     // autoGainControl: true } instead (manual A/B comparison, see DECISIONS.md)
```
The analyser for the VU-meter uses the shared context from `audio.getContext()`.

## `js/holdButton.js`

```js
export const HOLD_TO_PLAY_MS = 200;
holdButton(el: HTMLElement, {
  ms = HOLD_TO_PLAY_MS,
  onConfirm: (ev) => void,
  onCancel?: ({ reason: 'early' | 'leave' | 'cancel' | 'blur' }) => void,
  bypass?: () => boolean,   // when true, a plain click/tap confirms immediately
                            // (used to STOP playback with a simple tap)
}): () => void              // destroy(): removes all listeners/timers
```
Behaviour: pointerdown (primary button, only first pointer — multi-touch ignored) →
`setPointerCapture`, `el.classList.add('is-holding')`, `--hold-progress` CSS custom
property animated 0→1 on `el` (via rAF), timer of `ms`. On completion:
`navigator.vibrate?.(15)`, remove `is-holding`, call `onConfirm`. Release before `ms` →
reason `early`: add class `is-shake` for ~400 ms and call `onCancel`. Pointer leaving the
element bounds → `leave`; `pointercancel` (scroll) → `cancel`; window blur /
`visibilitychange` → `blur`; only `early` shakes. Keyboard: Space/Enter keydown
(ignore `repeat`) starts, keyup before `ms` → `early`. Disabled elements
(`el.disabled` or `aria-disabled="true"`) are ignored. Prevents `contextmenu` and the
native `click` (so a disabled-by-hold element never fires click handlers).

## `js/state.js`

```js
// SlotState
{ status: 'empty' | 'recording' | 'ready' | 'playing',
  blob: Blob | null,
  original: AudioBuffer | null,   // processed (trimmed+normalized+faded)
  reversed: AudioBuffer | null,
  duration: number }              // seconds of processed audio
// State
{ slots: { A: SlotState, B: SlotState },
  playing: null | { slot: 'A' | 'B', mode: 'original' | 'reversed' },
  revealed: boolean,
  score: { guessed: number, missed: number } }   // persisted in localStorage 'reverseur.score'

createStore(initial?) → { getState(), setSlot(id, patch), setPlaying(p | null),
                          setRevealed(bool), addScore('guessed'|'missed'),
                          reset() /* clears slots, playing, revealed; keeps score */,
                          subscribe(fn: (state, prev) => void): () => void }
```
`state.js` must not import browser modules; localStorage access is wrapped in
try/catch and injected (`createStore({ storage })`) so it can be unit-tested.

## DOM contract (used by `main.js`, CSS, and Playwright)

```
#app                                  data-revealed="true|false"
button#new-game                       "↻ Nuova"
  #new-game-confirm (hidden)          inline confirm, contains
    button[data-action=confirm-new], button[data-action=cancel-new]
section.slot#slot-A[data-slot=A][data-state=empty|recording|ready|playing]
section.slot#slot-B[data-slot=B][data-state=...]
  inside each slot:
    button[data-action=record]                (aria-pressed while recording)
    button[data-action=play-reversed]         (aria-pressed while playing)
    button[data-action=play-original]         (aria-pressed while playing; in slot A it is a holdButton)
    button[data-action=download]              (optional WAV export)
    [data-role=timer]  [data-role=vu]  [data-role=status] (aria-live=polite)
    [data-role=rerecord-confirm] (hidden) with
       button[data-action=confirm-rerecord], button[data-action=cancel-rerecord]
    [data-role=hold-hint]                     "Tieni premuto" (slot A only)
button#reveal                         holdButton; plays A original, sets revealed
#score  with button[data-action=guessed], button[data-action=missed]   (visible after reveal)
#mic-error[role=alert] (hidden)       permission-denied help (Chrome / Safari)
```
`data-state="playing"` on a slot is set while either of its sounds is playing.
