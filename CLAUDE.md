# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

The repository contains only `PROMPT.md`, a spec written in Italian for building **Reverseur**, a "reverse word" guessing game (PWA). No source code, `package.json`, tests, or git repo exist yet. Build, lint, and test commands are therefore not defined; once the project is scaffolded, add them here. `PROMPT.md` is the source of truth for requirements, and `docs/DECISIONS.md` (planned) records trade-offs.

## Hard constraints (from PROMPT.md)

- Vanilla HTML, CSS, and ES-module JavaScript with **no build step and no framework or bundler**. Any exception must be justified in `docs/DECISIONS.md`.
- No backend, analytics, or external network requests. Audio never leaves the device. Use no external dependencies at runtime.
- All paths must be **relative**: the app is served from `https://burzino.github.io/reverseur/`, not the domain root.
- Microphone via `getUserMedia` + `MediaRecorder`. Audio processing via Web Audio API (`decodeAudioData`, reverse each channel's `Float32Array`, trim silence, normalize peak to −1 dBFS, 5 ms fades).
- Must work offline (`service-worker.js`, cache-first) and be installable (`manifest.webmanifest`).
- UI text is Italian and lives in `i18n.js`.
- Commits use Conventional Commits in English.

## Planned architecture

The app is one screen with two slots (Player A's original, Player B's imitation). Each slot has record, play reversed, and play original actions. Module responsibilities:

- `recorder.js` produces a Blob and exposes a level callback for the VU-meter.
- `audio.js` holds the single shared `AudioContext`. It contains the pure functions `reverse`, `trimSilence`, and `normalize`, which operate on `Float32Array` so they can be unit-tested without a browser. It also handles play and stop, and only one sound plays at a time.
- `holdButton.js` is a reusable 200 ms long-press guard (`HOLD_TO_PLAY_MS`). It backs both "Listen to original" for Player A and the "Reveal" button, so the answer can't be triggered by an accidental tap.
- `state.js` is the session store (slot A, slot B, playing) with events. `main.js` wires it to the UI.

Interfaces that modules must respect are listed in the "Interfaces" section of `PROMPT.md`.

## Platform quirks to preserve

- Create or `resume()` the `AudioContext` inside a user gesture (iOS requirement).
- Call `track.stop()` after every recording. Otherwise iOS keeps routing audio to the earpiece.
- Pick the MIME type with `MediaRecorder.isTypeSupported` in order: `audio/webm;codecs=opus`, `audio/mp4`, `audio/ogg`.
- Microphone constraints: `echoCancellation: false`, `noiseSuppression: true`, `autoGainControl: true`. Compare the alternative and record the choice in `docs/DECISIONS.md`.

## Testing plan

Planned: unit tests for the pure audio functions, and Playwright E2E tests using Chromium with `--use-fake-device-for-media-stream` and `--use-file-for-fake-audio-capture` (fixture `tests/fixtures/word.wav`). E2E tests should check `data-state` on slots and use an exposed spy to confirm an `AudioBufferSourceNode` started. CI runs in `.github/workflows/test.yml`, and deploy runs from `pages.yml` on `main`.
