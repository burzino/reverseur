# Decisioni e trade-off

## D1 · Svelte 5 + TypeScript + Vite invece di JavaScript vanilla senza build (2026-11-04)

`PROMPT.md` chiedeva HTML/CSS/JS vanilla senza build step e vietava framework e bundler senza una motivazione scritta. L'utente ha chiesto esplicitamente di usare lo stesso stack degli altri progetti pubblicati su burzi.eu (Agenteur, Imposteur): Svelte 5, TypeScript, Vite, vite-plugin-pwa e Vitest.

Motivi:
- Un solo stack per tutti i progetti personali: stessi comandi, stesso design (token di `tema.css`), stessa pipeline di deploy (`pages.yml` con `npm ci → test → build → upload-pages-artifact`).
- Il controllo dei tipi (`svelte-check`) intercetta subito gli errori di integrazione tra moduli scritti da agenti diversi.
- Il build costa poco: GitHub Pages pubblica `web/dist`, prodotto dalle Actions.

Cosa resta invariato rispetto al prompt:
- Nessuna dipendenza runtime che faccia richieste di rete. Il font Roboto Flex è incluso nel bundle (`@fontsource-variable`), non arriva da Google Fonts.
- Le interfacce dei moduli (`docs/INTERFACES.md`) e le funzioni pure su `Float32Array`, testate in Node.
- I percorsi sono relativi alla base `/reverseur/` (`base` di Vite).

## D2 · Service worker generato da vite-plugin-pwa (2026-11-04)

Il prompt prevedeva un `service-worker.js` scritto a mano, cache-first e con versionamento. Workbox in modalità `generateSW` precarica tutti gli asset del build con hash di revisione, serve cache-first e pulisce le cache vecchie (`cleanupOutdatedCaches`). Il risultato è equivalente al requisito, con meno codice da mantenere, ed è la stessa scelta di Agenteur.

## D3 · Vincoli del microfono

Le due combinazioni a confronto:
- A, predefinita: `echoCancellation: false`, `noiseSuppression: true`, `autoGainControl: true`.
- B: `echoCancellation: true`, `noiseSuppression: true`, `autoGainControl: true`, attivabile con `?mic=alt`.

Scelta: A. Nel gioco nessun altro audio suona durante la registrazione, perché la riproduzione viene fermata prima di registrare, quindi la cancellazione dell'eco non ha nulla da cancellare. Su Chrome e Safari, però, l'AEC applica un gating che taglia attacchi e code delle parole, cioè proprio i transitori che contano quando si inverte l'audio. AGC e soppressione del rumore restano attivi: livellano le due voci, che poi vengono comunque normalizzate a −1 dBFS, e tolgono il fruscio di fondo che, invertito, diventa più evidente.

Limite onesto: in questa sessione di sviluppo non è stato possibile ascoltare le due varianti su dispositivi reali. Il parametro `?mic=alt` serve proprio per confrontarle a orecchio sul telefono. Se B suona meglio, si cambia il default in `recorder.ts`.

## D4 · Plancia di pad con guida (2026-11-18)

La prima schermata, con due slot da sei pulsanti, obbligava a capire le regole prima di giocare. Una prima alternativa a fasi (una schermata per passo, mockup v2 «Staffetta») è stata provata e scartata dall'utente perché poco intuitiva. La scelta finale è la v3 09 «Pad», migliorata:
- **Plancia 3×3 sempre uguale**: righe A, B e partita; colonne Registra, Al contrario e Originale. È la «schermata unica con due sezioni» di `PROMPT.md`, in forma di drum machine.
- **Guida**: il display dice a parole cosa fare, e il prossimo pad da premere ha il bordo tratteggiato che pulsa (`guida.ts`, funzione pura e testata).
- **Ciclo libero per B**: ◀◀ A, Imita/Rifai e ◀◀ B sono sempre lì. Allo stop, l'imitazione al contrario parte da sola.
- **A rifà la parola nello stesso round**: «Rifai» su A è sempre disponibile fino alla rivelazione. Se B ha già imitato, chiede conferma, perché l'imitazione della parola vecchia si cancella.
- **Originale di A**: finché B non ha imitato, è l'ascolto di controllo di A (pressione lunga di 200 ms contro i tocchi per sbaglio). Dopo diventa «Svela»: pad scuro con lucchetto, 600 ms di pressione per vedere il riempimento, e segna la rivelazione.
- «Rifai» non chiede conferma negli altri casi: sostituisce la prova, e se la registrazione fallisce resta quella precedente.
- Test: la suite E2E è un solo test di fumo del round completo, su un solo progetto Chromium, per non appesantire lo sviluppo. Store, guida, audio e registratore sono coperti dai test unitari.
