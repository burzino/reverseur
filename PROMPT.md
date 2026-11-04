# Prompt: Reverseur, costruzione multi-agente

## Obiettivo

Crea da zero **Reverseur**, una web app (PWA) per giocare a "parola al contrario":

1. **Giocatore A** registra una parola o frase (l'originale).
2. **Giocatore B** ascolta la registrazione **al contrario**.
3. **Giocatore B** registra la sua imitazione di quello che ha sentito.
4. L'app riproduce **al contrario** la registrazione di B. Se B ha imitato bene, si dovrebbe sentire la parola originale e B prova a indovinarla.
5. Alla fine si ascolta l'originale di A per confrontare.

L'app deve essere **comoda e usabile**: pulsanti grandi, utilizzo con una mano sola su telefono, nessun account, nessun backend, funzionamento offline.

Pubblicazione:
- Repository pubblico nuovo: `https://github.com/burzino/reverseur`
- Hosting su GitHub Pages: `https://burzino.github.io/reverseur/`
- Aggiungi un link all'app nel sito personale `https://github.com/burzino/burzino.github.io`

---

## Scelte tecniche (vincolanti)

| Area | Scelta | Motivo |
|---|---|---|
| Stack | HTML + CSS + JavaScript vanilla (ES modules), **senza build step** | Va su GitHub Pages così com'è, zero dipendenze, facile da mantenere |
| Registrazione | `navigator.mediaDevices.getUserMedia` + `MediaRecorder` | Supportato da Chrome, Firefox e Safari iOS ≥ 14.3 |
| Elaborazione | Web Audio API: `decodeAudioData` → `AudioBuffer` → inversione dei campioni (`Float32Array.reverse()` su ogni canale) | Inversione esatta senza perdita, riproduzione istantanea |
| Riproduzione | `AudioBufferSourceNode` su un unico `AudioContext` condiviso | Bassa latenza, nessun elemento `<audio>` |
| Offline | `manifest.webmanifest` + `service-worker.js` (cache-first per gli asset statici) | Installabile su smartphone e utilizzabile senza rete |
| Test | Playwright con `--use-fake-device-for-media-stream` e `--use-file-for-fake-audio-capture` | Test E2E reali del microfono senza hardware |

È vietato introdurre framework (React, Vue, ecc.) o bundler senza una motivazione scritta in `docs/DECISIONS.md`.

---

## Requisiti funzionali

### Schermata unica, due sezioni

```
┌──────────────────────────────┐
│  REVERSEUR          [↻ Nuova]│
├──────────────────────────────┤
│  1 · ORIGINALE (Giocatore A) │
│  [● Registra]                │
│  [◀◀ Ascolta al contrario]   │
│  [▶ Ascolta originale]  🔒   │  ← tenere premuto 200 ms
├──────────────────────────────┤
│  2 · IMITAZIONE (Giocatore B)│
│  [● Registra]                │
│  [◀◀ Ascolta al contrario]   │  ← l'ascolto chiave per indovinare
│  [▶ Ascolta originale]       │
├──────────────────────────────┤
│  [👁 Rivela / confronta]      │
└──────────────────────────────┘
```

Entrambi i giocatori hanno gli stessi tre pulsanti nella stessa sessione:
- **Registra**: tap per avviare e tap per fermare. Mentre registra mostra un timer e un VU-meter. Si ferma da solo dopo 10 s. Ri-registrare sovrascrive dopo una conferma inline (niente `confirm()` nativo).
- **Ascolta al contrario**: riproduce la registrazione invertita. Un tap semplice basta, perché ascoltarla non svela nulla.
- **Ascolta originale**: riproduce la registrazione così com'è.

I pulsanti restano disabilitati finché la registrazione corrispondente non esiste. Premere un pulsante di riproduzione mentre qualcosa sta già suonando ferma l'audio in corso e fa partire quello nuovo. Premere di nuovo lo stesso pulsante ferma la riproduzione.

### Protezione dai tocchi accidentali (requisito critico)

**"Ascolta originale" del Giocatore A** svela la soluzione, quindi richiede una **pressione prolungata di almeno 200 ms**. La durata è configurabile in una costante `HOLD_TO_PLAY_MS = 200`.
- Implementazione con **Pointer Events** (`pointerdown`, `pointerup`, `pointercancel`, `pointerleave`) e `setPointerCapture`, così funziona uguale con mouse, touch e penna.
- Durante la pressione un anello o una barra di progresso si riempie. La riproduzione parte solo al termine dei 200 ms.
- Se il dito si alza prima, la pressione viene annullata con un piccolo shake del pulsante e una scritta "Tieni premuto".
- Se il dito esce dal pulsante o la pressione viene annullata da uno scroll, non succede nulla.
- Disabilita menu contestuale, selezione del testo e zoom al doppio tap sui pulsanti (`touch-action: manipulation`, `user-select: none`, `-webkit-touch-callout: none`, `contextmenu` preventDefault).
- Da tastiera: `Space`/`Enter` tenuti premuti per 200 ms producono lo stesso effetto.
- Vibrazione breve (`navigator.vibrate(15)`) alla conferma, dove supportata.
- Applica lo stesso guard anche al pulsante **"Rivela"**. Implementalo come componente riutilizzabile `holdButton(el, { ms, onConfirm })`.

### Qualità audio (fa la differenza nel gioco)

- **Trim automatico del silenzio** iniziale e finale (soglia RMS su finestre di ~10 ms, con margine di 50 ms). È fondamentale: un silenzio iniziale diventa un silenzio finale quando l'audio viene invertito e rovina il ritmo dell'imitazione.
- **Normalizzazione** del picco a −1 dBFS, così le due registrazioni hanno un volume confrontabile.
- Fade-in e fade-out di 5 ms per evitare click.
- Vincoli del microfono: `echoCancellation: false`, `noiseSuppression: true`, `autoGainControl: true`. Prova anche la combinazione alternativa e documenta in `docs/DECISIONS.md` quella che suona meglio.
- Scegli il `mimeType` con `MediaRecorder.isTypeSupported`, in ordine: `audio/webm;codecs=opus`, `audio/mp4`, `audio/ogg`.

### Sessione e UX

- **"Nuova partita"** (in alto) azzera entrambe le registrazioni, previa conferma inline.
- Il microfono viene chiesto solo al primo tocco su "Registra". Se il permesso viene negato, mostra un messaggio chiaro con istruzioni per riabilitarlo (Chrome/Safari).
- L'`AudioContext` viene creato o ripreso (`resume()`) dentro un gesto dell'utente, come richiesto da iOS.
- Su iOS lo stream va rilasciato (`track.stop()`) alla fine di ogni registrazione, altrimenti l'audio resta instradato sull'altoparlante della cornetta.
- Indicatori di stato chiari per ogni slot: *vuoto / in registrazione / pronto / in riproduzione*.
- Interfaccia in **italiano**, con i testi centralizzati in `i18n.js` per poter aggiungere l'inglese in seguito.
- Tema scuro e chiaro seguendo `prefers-color-scheme`. Contrasto WCAG AA. Area di tocco minima 56×56 px.
- Layout mobile-first a una colonna. Su desktop le due sezioni vanno affiancate.
- Opzionale, se c'è tempo: un pulsante "Scarica" per esportare le registrazioni in WAV e un punteggio locale salvato in `localStorage`.

---

## Struttura del repository

```
reverseur/
├── index.html
├── css/styles.css
├── js/
│   ├── main.js          # bootstrap, wiring UI ↔ stato
│   ├── state.js         # store della sessione (slot A, slot B, playing)
│   ├── recorder.js      # getUserMedia + MediaRecorder → Blob
│   ├── audio.js         # AudioContext, decode, reverse, trim, normalize, play/stop
│   ├── holdButton.js    # componente long-press 200 ms
│   └── i18n.js
├── icons/               # icone PWA 192/512 + maskable
├── manifest.webmanifest
├── service-worker.js
├── tests/
│   ├── unit/            # test delle funzioni pure di audio.js (reverse, trim, normalize)
│   ├── e2e/             # Playwright
│   └── fixtures/word.wav
├── docs/DECISIONS.md
├── README.md            # screenshot, come si gioca, link live
├── LICENSE              # MIT
└── .github/workflows/
    ├── test.yml         # unit + e2e a ogni push/PR
    └── pages.yml        # deploy su GitHub Pages da main
```

Tutti i percorsi devono essere **relativi**, perché l'app vive sotto `/reverseur/` e non alla radice del dominio.

---

## Agenti

Lavora con un **Orchestratore** che coordina gli agenti specializzati. Gli agenti indipendenti girano in parallelo. Ognuno consegna il proprio output e un breve report: cosa ha fatto, cosa non ha fatto, rischi aperti.

### 0. Orchestratore (agente principale)
- Legge questo prompt, crea lo scheletro del repo e definisce le **interfacce** tra i moduli prima di lanciare gli altri agenti:
  - `audio.js`: `decode(blob) → AudioBuffer`, `reverse(buf)`, `trimSilence(buf)`, `normalize(buf)`, `play(buf) → stopFn`, `stopAll()`
  - `recorder.js`: `start() → Promise<void>`, `stop() → Promise<Blob>`, `onLevel(cb)`
  - `holdButton.js`: `holdButton(el, { ms, onConfirm, onCancel })`
  - `state.js`: forma dello stato ed eventi
- Lancia gli agenti 1, 2 e 3 **in parallelo**, poi il 4 e il 5, infine il 6 e il 7.
- Integra i risultati, risolve i conflitti e decide sui trade-off (che finiscono in `docs/DECISIONS.md`).
- Non pubblica nulla su GitHub finché l'agente QA e il Reviewer non hanno dato esito positivo.

### 1. Agente Audio Engine
- Implementa `recorder.js` e `audio.js` secondo le interfacce.
- Scrive le funzioni pure (`reverse`, `trimSilence`, `normalize`, fade) in modo testabile senza browser, cioè su `Float32Array`.
- Gestisce le differenze tra browser: mimeType, sample rate, `resume()` su iOS, rilascio delle tracce.
- Scrive gli unit test: invertire due volte restituisce l'originale, il trim rimuove il silenzio e mantiene il margine, il picco dopo la normalizzazione è −1 dBFS ±0.1.

### 2. Agente UI/UX
- Implementa `index.html`, `styles.css`, `main.js`, `state.js` e `i18n.js` seguendo il layout sopra.
- Stati visivi dei pulsanti (disabilitato, pronto, in registrazione con pulsazione, in riproduzione), VU-meter, timer, conferme inline.
- Accessibilità: `aria-pressed`, `aria-live` per gli stati, focus visibile, navigazione da tastiera.
- Verifica il layout a 360 px, 390 px, 768 px e 1280 px di larghezza.

### 3. Agente Interazione (Hold Guard)
- Implementa `holdButton.js` con tutti i casi della sezione "Protezione dai tocchi accidentali".
- Casi limite: multi-touch, `pointercancel` durante lo scroll, finestra che perde il focus, pressione ripetuta rapida, tastiera.
- Test E2E dedicati: tap da 50 ms → **nessuna riproduzione**; pressione da 250 ms → riproduzione; pressione da 250 ms con uscita dal pulsante a 100 ms → nessuna riproduzione.

### 4. Agente PWA / Offline
- `manifest.webmanifest` (nome, `short_name`, colori, `display: standalone`, `start_url: "./"`, `scope: "./"`), icone generate in SVG/PNG, `service-worker.js` con versionamento della cache e pulizia delle cache vecchie.
- Verifica che l'app si installi e si apra offline. Obiettivo Lighthouse PWA/Best Practices ≥ 90.

### 5. Agente QA / Test
- Configura Playwright (Chromium con fake audio da `tests/fixtures/word.wav`, più WebKit dove possibile).
- Flusso E2E completo: registra A → ascolta al contrario A → registra B → ascolta al contrario B → rivela con long-press.
- Asserzioni sullo stato dell'app (ad esempio `data-state` sugli slot) e verifica che un `AudioBufferSourceNode` sia stato avviato (con uno spy esposto in modalità test).
- Workflow `.github/workflows/test.yml`. Riporta i test falliti con output reale, senza nasconderli.

### 6. Agente Code Reviewer
- Rivede l'intero diff alla ricerca di bug (memory leak degli stream, AudioContext multipli, race tra registrazione e riproduzione, percorsi assoluti che si rompono sotto `/reverseur/`), problemi di sicurezza (nessuna dipendenza esterna, nessun dato inviato in rete) e codice inutilmente complesso.
- Elenca i problemi in ordine di gravità. L'Orchestratore li corregge, oppure motiva perché non li corregge.

### 7. Agente Deploy / GitHub
Usa la CLI `gh`, già autenticata come `burzino`.
1. `gh repo create burzino/reverseur --public --description "Gioco della parola al contrario: registra, inverti, indovina." --source . --push`
2. Attiva GitHub Pages tramite GitHub Actions (`pages.yml`), oppure dal branch `main` alla radice. Verifica che `https://burzino.github.io/reverseur/` risponda 200 e che l'app funzioni (il microfono richiede HTTPS, che Pages fornisce).
3. Imposta topics (`game`, `audio`, `pwa`, `web-audio-api`) e homepage del repo verso l'URL live.
4. **Sito personale**: clona `burzino/burzino.github.io` e **leggi prima la struttura esistente** (HTML statico, Jekyll, `_data/*.yml`, elenco di progetti?). Aggiungi il link a Reverseur **imitando esattamente il formato delle voci già presenti** (stesso markup, stile e ordine), con nome, una riga di descrizione e link. Non toccare altro.
5. Per il sito personale crea un branch, fai il commit e apri una **PR** (oppure, se l'utente lo autorizza esplicitamente, un push diretto su `main`). Mostra il diff all'utente prima del merge.
6. Report finale: URL del repo, URL live, link alla PR o al commit del sito personale.

---

## Definition of Done

- [ ] Flusso completo giocabile su Android Chrome, iOS Safari e desktop Chrome/Firefox
- [ ] "Ascolta originale" (A) e "Rivela" non partono con un tap sotto i 200 ms (verificato da test)
- [ ] Silenzio rimosso e volume normalizzato, con un'inversione udibilmente pulita
- [ ] Funziona offline ed è installabile come PWA
- [ ] Unit ed E2E verdi in CI
- [ ] Live su `https://burzino.github.io/reverseur/`
- [ ] Link presente su `burzino.github.io` nello stesso stile delle altre voci
- [ ] README con istruzioni di gioco, screenshot e link live

## Regole di lavoro

- Niente backend, analytics o richieste di rete esterne: l'audio non lascia mai il dispositivo.
- Commit piccoli, con messaggi chiari in inglese (Conventional Commits).
- Se un requisito risulta tecnicamente impossibile su un browser (ad esempio iOS), documentalo in `docs/DECISIONS.md` e implementa il miglior fallback, senza saltarlo in silenzio.
- Chiedi conferma all'utente solo per azioni irreversibili o esterne non già autorizzate da questo prompt.
