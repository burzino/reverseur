# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Reverseur is a "reverse word" guessing game, shipped as a PWA. Player A records a word, Player B listens to it reversed and imitates it, and the app reverses B's recording. Answer in Italian. All UI text is Italian.

## Where things live

- `PROMPT.md` is the original spec (Italian) and the source of truth for behaviour.
- `STATO.md` records work status by wave, decisions, open points, and agent notes. The orchestrator and every agent update it.
- `docs/INTERFACES.md` is the contract between modules, including the DOM contract (`data-fase`, `data-action`, `data-role`, `data-state`) that the E2E test relies on.
- `docs/DECISIONS.md` records trade-offs, such as Svelte instead of vanilla, the workbox service worker, and the mic constraints.
- `mockups/` holds static HTML layout explorations (v1, `v2/`, `v3/`) with PNG screenshots. They are not part of the build.

## Stack and commands (run from `web/`)

The stack is Svelte 5 (runes), TypeScript strict, Vite, vite-plugin-pwa, Vitest, and Playwright, the same as github.com/burzino/agenteur. Node 24.

```bash
npm ci
npm run dev              # dev server
npm test                 # Vitest (unit, node env)
npm run check            # svelte-check
npm run build            # check + vite build -> dist/ (base /reverseur/)
npm run test:e2e         # Playwright: builds, runs vite preview on :4173/reverseur/, fake mic from tests/fixtures/word.wav
npx playwright test tests/e2e/flusso.spec.ts                    # the one E2E spec
npx vitest run src/audio/audio.test.ts                          # one unit file
BASE_PATH=/ npm run build                                       # build for a domain served from root
```

Playwright's `webServer` rebuilds `web/dist` before every run, so two concurrent E2E runs clobber each other (transient `sw.js` served as text/html). E2E is deliberately one smoke test of the full round (`tests/e2e/flusso.spec.ts`) on one Chromium project (WebKit has no fake-mic flag). The user wants tests kept minimal: cover logic with unit tests rather than adding specs.

## Architecture

- `web/src/audio/` contains `audio.ts` and `recorder.ts`. `audio.ts` holds the one shared `AudioContext`. Its pure functions on `Float32Array` (reverse, trim, normalize, fades, WAV) are tested in Node. `recorder.ts` wraps getUserMedia and MediaRecorder.
- The round is a sequence of phases (`fase`: `provaA → passaAB → provaB → esito`, plus `provaB → passaBA → provaA` when B gives the phone back). Allowed transitions and their side effects live in `TRANSIZIONI` / `vai()` in `sessione.ts`; docs/DECISIONS.md D4 explains why.
- `web/src/ui/` is layered: `sessione.ts` is the pure session store (`createStore({ storage })`, unit-tested), `state.svelte.ts` wraps it in runes (`$state.raw`), and `gioco.svelte.ts` orchestrates gestures (record, play, phase changes, reveal, 10 s auto-stop, a counter that discards results of cancelled recordings). `App.svelte` renders one screen per phase: `Prova` (A or B), `Passaggio`, `Esito` in `ui/componenti/`. UI strings are in `testi.ts`; `tema.css` holds design tokens copied from Agenteur; `.giocatore-a`/`.giocatore-b` in `pulsanti.css` set the player accent. `holdButton.ts` is the long-press guard plus the `use:hold` action; only "Rivela" uses it (`RIVELA_MS` = 600).
- In test mode (`?test`), `window.__reverseurSpy.started` records every started `AudioBufferSourceNode`, and `window.__reverseur.store` exposes the store.

## Platform quirks to preserve

- Call `audio.ensureRunning()` synchronously at the start of every gesture handler, before any `await` (don't await it either). iOS requires it. The hold buttons call it on `pointerdown`/`keydown`, because `onConfirm` fires from a timer.
- Call `track.stop()` after every recording. Otherwise iOS keeps routing audio to the earpiece.
- Pick the MIME type in this order: `audio/webm;codecs=opus`, `audio/mp4`, `audio/ogg`.
- No backend, analytics, or network requests. Audio never leaves the device.

## Deploy

GitHub Pages is deployed through Actions (`.github/workflows/pages.yml`) with base `/reverseur/`, on pushes to `main` touching `web/**`; the deploy waits for the E2E suite. `test.yml` runs check + unit + E2E on pushes to `main` and on PRs. Because of the user's custom domain, the live URL is https://burzi.eu/reverseur/. Commits use Conventional Commits in English.
