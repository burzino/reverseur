# Reverseur - Stato

File di stato condiviso. L'orchestratore e ogni agente lo aggiornano a fine lavoro (solo la propria sezione e la riga della propria ondata). Fonte di verità dei requisiti: `PROMPT.md`; contratto tra moduli: `docs/INTERFACES.md`; trade-off: `docs/DECISIONS.md`.

## Decisioni (2026-11-04)
- Stack come Agenteur (`github.com/burzino/agenteur`), su richiesta dell'utente: Svelte 5 + TypeScript + Vite + vite-plugin-pwa, Vitest, app in `web/`. Sostituisce il vincolo "vanilla senza build step" di PROMPT.md (motivato in `docs/DECISIONS.md`).
- Service worker e manifest generati da vite-plugin-pwa (workbox, precache) invece di `service-worker.js` scritto a mano.
- E2E con Playwright su build di produzione (`vite build` + `vite preview`) sotto `/reverseur/`, microfono finto da `web/tests/fixtures/word.wav`.
- Hosting: GitHub Pages via Actions, base `/reverseur/`. Il dominio utente `burzi.eu` (CNAME di burzino.github.io) fa sì che l'URL finale sia `https://burzi.eu/reverseur/`.
- Interfacce dei moduli (audio, recorder, holdButton, state) e contratto DOM in `docs/INTERFACES.md`: invariati dal passaggio a Svelte, cambiano solo i percorsi (`web/src/audio/*.ts`, `web/src/ui/holdButton.ts`).

## Ondate
0. [fatto] Scaffold: repo git, `web/` (package.json, vite/vitest/playwright config, tsconfig), fixture `word.wav` (1,63 s, 0,4 s di silenzio ai lati), `docs/INTERFACES.md`.
1. [in corso, parallelo] Agente Audio Engine: `web/src/audio/audio.ts`, `recorder.ts` + test Vitest.
1. [in corso, parallelo] Agente Hold Guard: `web/src/ui/holdButton.ts` (+ azione Svelte `hold`) + E2E `web/tests/e2e/hold.spec.ts`.
1. [da avviare, parallelo] Agente UI/UX: schermata Svelte, stato, testi, tema (fermato alla prima versione vanilla, si riparte in Svelte).
2. [da fare] Agente PWA/Offline: icone, manifest, verifica offline/installabilità.
2. [da fare] Agente QA: flusso E2E completo, spy `AudioBufferSourceNode`, workflow `test.yml`.
3. [da fare] Agente Code Reviewer.
3. [da fare] Deploy: repo `burzino/reverseur`, Pages, link su `burzino.github.io` (PR).

## Punti aperti
- `gh` installato ma non autenticato: l'utente deve eseguire `gh auth login`.
- Scelta dei vincoli del microfono: non è possibile un ascolto comparativo in questa sessione; `?mic=alt` permette il confronto manuale (vedi DECISIONS.md).

## Note degli agenti
(Ogni agente aggiunge qui una sezione `### <Agente>`: cosa ha fatto, cosa no, rischi aperti, ambiguità e letture scelte.)
