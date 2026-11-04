# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Reverseur is a "reverse word" guessing game, shipped as a PWA. Player A records a word, Player B listens to it reversed and imitates it, and the app reverses B's recording. Answer in Italian. All UI text is Italian.

## Where things live

- `PROMPT.md` is the original spec (Italian) and the source of truth for behaviour.
- `STATO.md` records work status by wave, decisions, open points, and agent notes. The orchestrator and every agent update it.
- `docs/INTERFACES.md` is the contract between modules, including the DOM contract (`data-action`, `data-role`, `data-state`) that E2E tests rely on.
- `docs/DECISIONS.md` records trade-offs, such as Svelte instead of vanilla, the workbox service worker, and the mic constraints.

## Stack and commands (run from `web/`)

The stack is Svelte 5 (runes), TypeScript strict, Vite, vite-plugin-pwa, Vitest, and Playwright, the same as github.com/burzino/agenteur.

```bash
npm install
npm test                 # Vitest (unit, node env)
npm run check            # svelte-check
npm run build            # check + vite build -> dist/ (base /reverseur/)
npm run test:e2e         # Playwright: builds, runs vite preview on :4173/reverseur/, fake mic from tests/fixtures/word.wav
npx playwright test tests/e2e/hold.spec.ts --project=chromium   # one spec
```

## Architecture

- `web/src/audio/` contains `audio.ts` and `recorder.ts`. `audio.ts` holds the one shared `AudioContext`. Its pure functions on `Float32Array` (reverse, trim, normalize, fades, WAV) are tested in Node. `recorder.ts` wraps getUserMedia and MediaRecorder.
- `web/src/ui/` holds the Svelte components and the session store. `holdButton.ts` is the 200 ms long-press guard (`HOLD_TO_PLAY_MS`) plus the `use:hold` action. It protects Player A's "Ascolta originale" and the "Rivela" button.
- In test mode (`?test`), `window.__reverseurSpy.started` records every started `AudioBufferSourceNode`, and `window.__reverseur.store` exposes the store.

## Platform quirks to preserve

- Call `audio.ensureRunning()` synchronously at the start of every gesture handler, before any `await`. iOS requires it.
- Call `track.stop()` after every recording. Otherwise iOS keeps routing audio to the earpiece.
- Pick the MIME type in this order: `audio/webm;codecs=opus`, `audio/mp4`, `audio/ogg`.
- No backend, analytics, or network requests. Audio never leaves the device.

## Deploy

GitHub Pages is deployed through Actions (`.github/workflows/pages.yml`) with base `/reverseur/`. Because of the user's custom domain, the live URL is https://burzi.eu/reverseur/. Commits use Conventional Commits in English.
