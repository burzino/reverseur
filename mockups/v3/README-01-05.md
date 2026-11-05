# Mockup v3 · concetti 01–05

Cinque interfacce nuove, diverse da v1 (la plancia a due slot) e da v2 (i cinque flussi guidati), e diverse anche tra loro. Ogni file HTML è autonomo e funziona senza rete: usa il Roboto Flex locale (`../../web/node_modules/@fontsource-variable/roboto-flex/…`) e SVG inline. Il PNG accanto è lo screenshot a pagina intera. Ogni file contiene:

- il razionale (concetto, flusso, perché il layout è ottimale) e una riga di metriche (tap per round, dimensioni dei bersagli);
- cinque telefoni 390×844 chiari, uno per ciascun momento: (a) inizio round, (b) A registra con timer e VU, (c) B ascolta al contrario e imita, (d) indovina e rivela con la pressione lunga a metà corsa, (e) esito e punteggio;
- almeno una schermata scura, la verifica a 360×640 e la vista orizzontale o desktop;
- quattro o cinque schede: mappa del pollice, movimento, colore e accessibilità (con i contrasti), impatto sull'implementazione.

Nei file aperti nel browser il VU e i timer si animano. In 02 (disco scuro) e 04 (pannello desktop) la pressione lunga funziona davvero. Nei PNG le animazioni sono ferme e la pressione è mostrata al 62%.

Durate della pressione: «Ascolta originale» resta a 200 ms (`HOLD_TO_PLAY_MS`), la **rivelazione** è a 600 ms come in v2. Ogni gesto che rivela la risposta resta sopra il minimo di 200 ms.

---

## 01 · Tocco: superficie unica a gesti
**Idea.** Non ci sono pulsanti: **tutto lo schermo è il comando**. Tieni premuto ovunque = registra (lo sfondo diventa rosso e si riempie dal basso con il tempo, 10 s = schermo pieno). Scorri ← = al contrario (lo schermo diventa lime). Scorri → = originale. Tieni e trascina ↑ su un binario fino al lucchetto = rivela. Il menu si apre tirando giù dall'alto. Lo stile è osso e inchiostro, lime per «al contrario», rosso per «rec», e titoli in Roboto Flex largo.

**Flusso.** Tieni (A) → scorri ← (B ascolta; da questo momento l'originale di A si chiude) → tieni (B imita) → scorri ← (imitazione al contrario) → tieni e trascina ↑ (rivela) → scorri → indovinata / ← mancata.

**Gesti per round: 6**, nessun tap mirato. Il bersaglio è 390×794 px.

- **Pro:** è il più veloce dopo il primo round, e si gioca senza guardare con tutte e due le mani. Ha il riscontro più forte (il colore a tutto schermo). Gli indizi sui bordi insegnano i gesti, poi si riducono a frecce.
- **Contro:** i gesti si imparano, non si vedono: il primo round va guidato. Gli scorrimenti possono confliggere con il gesto «indietro» del sistema dai bordi, quindi servono 24 px di margine. Per gli screen reader serve un'alternativa (il menu con pulsanti veri), e `role="application"` va gestito con cura.
- **Impatto:** un riconoscitore di gesti (`pointerdown`/`move`/`up` con soglie di 300 ms per tenere, 60 px per scorrere, 70% per la rivelazione) sopra il flusso a fasi di v2. Poche componenti, ma i test E2E diventano più complessi: servono gesti simulati con `page.mouse`.

## 02 · Tavolo: faccia a faccia, telefono sul tavolo
**Idea.** Il telefono sta sul tavolo tra i due giocatori. La metà di A (verde acqua) è ruotata di 180° e guarda A, la metà di B (zafferano) guarda B. Ognuno ha **solo i propri comandi**, vicino al proprio bordo. Il turno si vede dalla metà accesa (colore pieno), mentre l'altra è pallida e dice cosa sta succedendo («Tappati le orecchie», «Non suggerire!»). Al centro, sulla «rete», c'è il **disco di rivelazione** condiviso (Ø 116 px), con punteggio ed etichette leggibili da entrambi i lati. In orizzontale le metà vanno ai lati lunghi, ruotate di ±90°.

**Flusso.** A: Registra → Fine. B: Al contrario (quante volte vuole) → Imita → stop → imitazione al contrario. Uno dei due tiene premuto il disco (600 ms) e l'originale suona per tutti e due. **Giudica A**, che conosce la parola, con Giusta/Sbagliata nella sua metà. Poi i ruoli si scambiano e i posti restano.

**Tap per round: 6**, più il giudizio. Non c'è nessuna schermata «passa il telefono».

- **Pro:** toglie il passaggio di mano, che è il momento più lento e confuso del flusso a turni. È sociale: ci si guarda in faccia. Il giudizio lo dà chi sa la risposta, quindi è onesto. I bersagli sono da 96 px.
- **Contro:** funziona solo con il telefono appoggiato. Con un solo altoparlante l'originale è chiuso anche per A. Lo schermo è diviso, quindi ogni metà ha circa 340 px di altezza (260 a 360×640), e i testi devono stare corti. La barra di stato in alto si sovrappone alla metà di A: meglio lo schermo intero dove possibile.
- **Impatto:** stesso flusso a fasi, con una vista `VistaTavolo` (due `Meta`, di cui una con `rotate(180deg)`, e una `Rete`). Va scelta una volta all'avvio (Tavolo o Mano). Servono `screen.orientation.lock` e Wake Lock. L'ordine del DOM per lo screen reader va gestito: prima la metà accesa.

## 03 · Ghiera: radiale, giradischi
**Idea.** Un solo comando rotondo (Ø 350 px) in basso, sotto un display LCD ambra che mostra lo stato. Il **centro** è REC/STOP («imita», «rifai», «round 4»). Il **settore sinistro** (160°, arancio) suona al contrario e il disco centrale **gira all'indietro**. Il **settore destro** è l'originale, chiuso per B. Mentre registri l'anello diventa il contatore dei 10 s, con 60 tacche. Per rivelare si porta una manopola col lucchetto lungo il settore destro fino a ▲ (120°, come la combinazione di una cassaforte). Alla fine i settori diventano ✕ mancata e ✓ indovinata. Lo stile è industriale: scocca grigio caldo, plastica, arancio.

**Flusso.** Centro (A rec) → centro (stop) → ◀◀ (B) → centro (imita) → centro (stop) → ◀◀ (imitazione) → manopola fino a ▲ → ✓/✕ → centro (round 4).

**Tocchi per round: 6** essenziali, più l'ascolto e il verdetto. Settori larghi 64 px, centro Ø 100.

- **Pro:** l'identità più forte e la metafora più chiara (il disco che gira all'indietro *spiega* il gioco). Ogni funzione ha sempre lo stesso posto. Lo spoiler è un movimento rotatorio, impossibile da fare per sbaglio, e mostra il progresso in modo naturale. In orizzontale e su desktop funziona molto bene (display a sinistra, ghiera a destra).
- **Contro:** il settore sinistro è nella zona di allungo per il pollice destro: serve l'opzione per mancini. I testi curvi sono piccoli (11,5 px maiuscolo, ripetuti nella legenda). Il trascinamento circolare è meno immediato di un tap e va accompagnato da un'etichetta.
- **Impatto:** un componente `Ghiera.svelte` (archi SVG calcolati, `atan2` sul `pointermove`, soglia di 20 px tra tap e trascinamento). La rotazione del disco si fa in CSS (`animation-direction: reverse`). Lo scorrimento manuale dell'audio è opzionale (fase 2).

## 04 · Cassetto: bottom sheet a tre altezze
**Idea.** **Sopra si guarda, sotto si tocca.** La **tela** in alto è colorata per fase (blu = A, rosso = registro, magenta = B, nero = indovina, verde = esito) e mostra solo contenuto: timer gigante, onda, «Indovinata!». Il **cassetto** in basso contiene tutti i comandi e si apre da solo all'altezza giusta: **basso** (solo STOP), **medio** (la fase: primario e secondari) e **alto** (partita, storico con riascolto, impostazioni, nuova partita). Su desktop diventa un pannello laterale di 400 px.

**Flusso.** Registra → Stop → (◀◀ Parola di A) → Imita → Stop → (◀◀ Imitazione) → barra «Tieni premuto per rivelare» → Indovinata (preselezionata) / Mancata → «Round 4 →».

**Tap per round: 5** essenziali (registra, stop, imita, stop, rivela). Gli ascolti sono opzionali e l'esito è preselezionato. Primario da 88 px a tutta larghezza, secondari da 60–64 px.

- **Pro:** è il più vicino alle convenzioni (bottom sheet), quindi non c'è niente da imparare. Il primario è sempre in fondo, nella zona verde. Le funzioni rare sono a un trascinamento di distanza ma non ingombrano. Dà il miglior risultato su desktop. È il concetto più facile da implementare.
- **Contro:** è il meno «stravolto» visivamente: l'identità la porta il colore della tela. Il trascinamento del cassetto può confliggere con lo scroll interno della vista alta: lì c'è poco contenuto, ma va tenuto senza scroll. Il cassetto basso riduce l'altezza visibile solo durante la registrazione, ed è voluto.
- **Impatto:** `Cassetto.svelte` (pointer events, snap con molla, ↑/↓ da tastiera) e una `Tela` per fase, sopra il flusso a fasi di v2. `holdButton` resta invariato, con una barra di riempimento a testo invertito.

## 05 · Uno: ultra-minimale tipografico
**Idea.** **Un pulsante e una parola.** In alto una sola parola in Roboto Flex compresso al massimo (wdth 28, peso 900), adattata alla larghezza della riga: «A, PARLA.», «PARLA.», «B, ASCOLTA.», «IMITA.», «COS'È?», «5—2». In basso **un unico pulsante** di 346×410 px che cambia etichetta e colore: giallo = registra, rosso = stop (con timer e VU dentro), nero = ascolta (con il riempimento dell'avanzamento), blu = rivela (si riempie dal basso mentre tieni premuto), verde = avanti. Il pulsante si divide in SÌ/NO solo per il verdetto. Tutto il resto (riascolta, originale, rifai, regole, nuova partita) sta in **un solo menu**, che si apre tenendo premuta la parola in alto.

**Flusso.** REGISTRA → STOP → ◀◀ ASCOLTA → IMITA → STOP (l'imitazione al contrario parte da sola) → RIVELA (tieni premuto 600 ms) → SÌ/NO → AVANTI.

**Tap per round: 7**, tutti nello **stesso punto**: il pollice non si sposta di un pixel.

- **Pro:** zero carico cognitivo e zero movimento. Lo stato si legge da 2 metri. È il più accessibile (un pulsante grande, con l'etichetta in `aria-live`) e ha l'interfaccia più piccola da scrivere: una tabella `fase → {etichetta, colore, azione}`. Con 360×640 e l'orizzontale non ha problemi.
- **Contro:** chi vuole riascoltare deve aprire il menu (pressione lunga sulla parola), che si scopre meno facilmente: c'è un indizio nel primo round. Il ritmo «un tap alla volta» può sembrare lento ai giocatori esperti. La tipografia compressa estrema funziona solo con parole brevi, quindi le stringhe di `i18n` vanno scritte apposta.
- **Impatto:** è il più basso di tutti. Un componente `Uno.svelte` (pulsante con stati), una funzione di adattamento del testo (`wdth` e dimensione calcolati sulla larghezza) e un menu a scheda. Il flusso a fasi di v2 si mappa uno a uno sugli stati, e l'autoplay dopo lo stop di B è una transizione in più.

---

## Classifica (dei miei cinque)

1. **05 · Uno.** È l'ottimizzazione del layout portata all'estremo: un bersaglio enorme e fisso, lo stato leggibile da lontano, il costo di implementazione più basso e un'identità forte. È la base migliore da cui partire.
2. **03 · Ghiera.** È la più memorabile e quella che spiega meglio il gioco (il disco che gira all'indietro). La rivelazione «a combinazione» è la migliore delle cinque. Costa di più e chiede l'opzione per mancini.
3. **02 · Tavolo.** È l'idea più nuova come *modalità di gioco*: elimina il passaggio di mano e fa giudicare A. Consiglio di offrirla come seconda modalità accanto a 05 o 04, non come unica interfaccia.
4. **04 · Cassetto.** È la più sicura e la più convenzionale: ottima su desktop e facile da costruire, ma meno sorprendente.
5. **01 · Tocco.** È la più veloce per chi la conosce e la più spettacolare, ma i gesti nascosti, l'accessibilità e i conflitti con i gesti di sistema la rendono rischiosa come interfaccia principale. Il riempimento rosso a tutto schermo durante la registrazione si può comunque riusare in 05.

**Combinazione consigliata:** 05 come interfaccia principale, con la manopola di rivelazione di 03 al posto della pressione lunga se si vuole più suspense, e 02 come «modalità tavolo» opzionale.
