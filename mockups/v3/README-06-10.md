# Mockup v3 · concetti 06–10

Ogni file HTML è autonomo e non usa la rete. Il font è il Roboto Flex di `web/node_modules`, caricato con un percorso relativo; le icone e le illustrazioni sono SVG inline. Il PNG accanto a ogni HTML è lo screenshot a pagina intera, fatto con `?shot`, che ferma le animazioni.

Ogni file contiene:

- il razionale: concetto, flusso, perché il layout è ottimale, e una riga di metriche (tocchi per round, dimensione dei bersagli, scroll);
- i momenti chiave in 390×844 chiaro: (a) inizio round, (b) A registra con timer e VU, (c) B ascolta al contrario e imita, (d) indovina e svela con la pressione al 62%, (e) esito e punteggio;
- la rivelazione in tema scuro, dove la pressione lunga funziona davvero (mouse, dito o Spazio; se si rilascia prima: shake e «Tieni premuto»);
- la verifica a 360×640, l'orizzontale o il desktop quando il concetto ne ha bisogno, una mappa del pollice e le schede su movimento, colore e tipo.

Regole comuni:

- «Ascolta originale» resta a 200 ms (`HOLD_TO_PLAY_MS`). Il gesto finale di rivelazione è a **600 ms**, come in v2, perché a 200 ms il riempimento non si fa in tempo a vedere.
- **Il conteggio dei tocchi** si riferisce a un round senza ripetizioni. Una sola registrazione e un solo ascolto per giocatore, la rivelazione e l'esito contano come tocchi.
- **L'imitazione al contrario parte da sola** quando B ferma la registrazione, in tutti e cinque i concetti.

---

## 06 · Vocali
**Idea.** Il round è una chat di messaggi vocali. A scrive a sinistra (viola), B a destra (verde), e l'app risponde in ambra con i suoni al contrario, citando il vocale di partenza. Il vocale di A arriva **sigillato**: è un fumetto che non si suona, si sblocca soltanto. Il microfono, da 76 px, sta fisso in basso a destra nel compositore, uguale per A e per B.

**Flusso.** Biglietto «Round 3» → A tocca il microfono: il compositore mostra timer, VU e anello dei 10 s, e il fumetto cresce mentre A parla → ■ invia → arriva il fumetto ambra «al contrario» e B lo ascolta → B registra → l'app risponde con «Imitazione al contrario» e la fa partire → fumetto nero «Tieni premuto per svelare» → biglietto esito con Indovinata/Mancata e punteggio → il compositore propone «Round 4 · ora registra B».

**Tocchi per round: 7.**

**Pro.** Non ha bisogno di spiegazioni, perché tutti sanno usare i vocali. Il presente è sempre in basso, vicino al pollice, e la storia del round resta leggibile sopra. Il fumetto attivo si allarga e occupa lo spazio libero, quindi non ci sono zone vuote. La striscia R1/R2/R3 mostra la partita a colpo d'occhio.

**Contro.** È una metafora "prestata": rischia di sembrare un clone di un'app di messaggi. Il thread cambia altezza a ogni passo, quindi le posizioni non sono sempre le stesse, tranne quella del microfono. Il gesto walkie-talkie (tenere premuto per registrare) va reso compatibile con il tap–tap della specifica.

**Impatto.** Bisogna aggiungere uno store `fase` (lo stesso di v2) e una lista di "messaggi" derivata dallo stato, per esempio `Fumetto.svelte` con le varianti a, b, rv, sigillato e eroe, più `Compositore.svelte`. Serve la funzione pura `picchi(buffer, n)` per le onde. L'audio non cambia.

## 07 · Tracce
**Idea.** Un piccolo DAW. Le quattro registrazioni del gioco sono **quattro tracce** impilate su un'unica scala del tempo: A originale, A al contrario, B imitazione, B al contrario. Si tocca una traccia per sentirla. Il trasporto in basso ha un solo tasto grande da 88 px che cambia ruolo: REC, Stop, Svela, Esito. La traccia di A resta **sfocata** e si mette a fuoco mentre il dito tiene premuto Svela.

**Flusso.** Traccia A armata (bordo rosso) → REC: onda dal vivo con la testina, timer e VU nel display del trasporto → Stop: la traccia A si sigilla e la 2 si riempie da sola → B tocca la traccia 2, poi REC sulla 3 → Stop: la 4 si allarga e suona → «Tieni premuto: svela la traccia A» → ✓/✗ e «Round 4».

**Tocchi per round: 7.**

**Pro.** Lo stato dell'intero round è visibile insieme: tracce piene, vuote, armate, in riproduzione o sigillate. La scala comune mostra subito se l'imitazione ha la lunghezza giusta, e il righello fa lo zoom da solo (0–10 s, poi 0–3 s). L'ordine delle tracce segue la frequenza d'uso: la 4, la più ascoltata, sta sopra il trasporto; la A, che non si tocca, sta in cima. Le righe sono elastiche: la traccia attiva prende 1,6–2,2fr e nessuna traccia scende sotto i 104 px. In orizzontale funziona benissimo.

**Contro.** È il più "tecnico" e il meno da festa. Chi non conosce i software audio deve capire che si tocca la traccia. Serve disciplina tipografica (etichette strette maiuscole) per non sembrare uno strumento professionale.

**Impatto.** Basta lo stato attuale (slot A e B) con le tracce derivate, più `fase` per il trasporto. Servono i componenti `Traccia.svelte` (onda, testina, sfocatura legata a `--p`), `Trasporto.svelte` e `Righello.svelte`, più `picchi()` e la posizione della testina da `AudioContext.currentTime`. È il concetto più vicino alla specifica originale (schermata unica, tutto visibile), quindi in `docs/DECISIONS.md` va motivato meno.

## 08 · Duello
**Idea.** Pensato per il telefono in orizzontale o per un portatile alla festa. Ci sono **due metà speculari**: A a sinistra (arancio) e B a destra (blu). In mezzo c'è una colonna scura neutra con il round, il punteggio, i passi e **Svela**. In orizzontale si tiene con due pollici: ognuno copre la sua metà, e i comandi principali stanno verso i bordi esterni. Il centro è la zona che nessun pollice raggiunge per caso. Con la **modalità Tavolo** (telefono appoggiato tra due persone una di fronte all'altra) la metà di B ruota di 180°.

**Flusso.** A: tile REC grande, mentre B vede «Copriti le orecchie» → A registra (tile rossa con timer e VU) → la metà di A si sigilla e in quella di B si accendono ◀◀ e REC affiancati, con REC sul bordo esterno → B registra → la sua tile diventa «Imitazione al contrario» → Svela al centro si riempie dal basso con il gradiente A→B → al centro ✓/✗, punteggio e «Round 4».

**Tocchi per round: 7, senza nessun passaggio di telefono.**

**Pro.** Le tile sono enormi (130–280 px). La simmetria fa imparare il gioco una volta sola. È l'unico concetto pensato davvero per orizzontale e desktop, con scorciatoie da tastiera: Q, O, P e Spazio tenuto. In verticale degrada in modo pulito: A in alto, la fascia centrale con Svela, e B, che gioca di più, nella metà bassa sotto il pollice.

**Contro.** In verticale perde parte del suo senso, perché la metà di A è quasi inutile dopo la registrazione. A 640×360 i testi delle tile vanno ridotti all'osso. La modalità Tavolo con il testo capovolto al centro va provata con persone vere.

**Impatto.** Bisogna aggiungere `fase` e un layout a tre colonne con container query (orizzontale, verticale, desktop). Serve un componente `Meta.svelte` riusato per A e per B con `specchiata`, più `ColonnaCentrale.svelte`. Le scorciatoie da tastiera vanno in `main`. L'opzione Tavolo è una preferenza in `localStorage`.

## 09 · Pad
**Idea.** Una drum machine per la voce. In basso c'è una griglia **3×3 di pad** da 114×128 px; in alto un display scuro di sola lettura (messaggio, timer, VU, onda). **Righe = giocatori**: A lilla, B menta, partita gialla. **Colonne = azioni**: ● REC, ◀◀ Al contrario, ▶ Originale. È la plancia della specifica (due slot × tre azioni) nella sua forma più fisica. Il pad ▶ A è **nero con il lucchetto** e si riempie dal basso mentre lo tieni premuto. Il prossimo pad da premere ha un bordo tratteggiato che pulsa.

**Flusso.** ● REC A (tratteggiato) → pad rosso, timer grande e VU nel display → ◀◀ A (con il contatore degli ascolti) → ● REC B → allo stop si accende da solo ◀◀ B, il pad centrale → tieni premuto il pad nero → ✓ Presa o ✗ Mancata → ↻ Round 4.

**Tocchi per round: 7.**

**Pro.** Le 9 azioni sono sempre visibili nello stesso posto, quindi la memoria muscolare si forma al secondo round. L'ascolto chiave (◀◀ B) è il pad centrale, il punto più naturale per il pollice. Sono i bersagli più grandi possibili con 9 azioni. È il più divertente da "suonare", con riempimento, alone e mini VU dentro i pad. In orizzontale la griglia va sotto il pollice destro e il display a sinistra.

**Contro.** Il pad nero è sempre lì, in vista, anche se protetto dalla pressione lunga. Lo spoiler è protetto ma non irraggiungibile, come nella specifica originale. All'inizio 9 pad sono molti, e senza la guida tratteggiata non si sa da dove cominciare.

**Impatto.** Lo stato attuale degli slot basta, più `fase` per la guida e lo stato di ogni pad (`spento/pronto/prossimo/suona/sigillato`), derivato in modo puro e testabile. Servono i componenti `Pad.svelte` e `Display.svelte`. È il concetto che cambia meno l'architettura.

## 10 · Storie
**Idea.** Il round è una **storia a sei schede** a tutto schermo, come quelle dei social, con una barra a segmenti in alto. Ogni scheda ha un colore pieno (lilla, corallo, menta, azzurro, giallo, verde), un titolo poster in Roboto Flex 900 stretto e una sola illustrazione gigante. Lo schermo è diviso in tre zone: sinistra 25% = indietro, destra 25% = avanti, centro = azione. Durante la registrazione **tutto lo schermo è Stop** e il segmento della barra diventa il timer dei 10 s. La scheda 5 si svela **tenendo premuto ovunque**: un "liquido" scuro sale dal basso e inverte i colori.

**Flusso.** 1 Round (chi fa cosa) → 2 A parla (tocca ovunque per fermare) → 3 B ascolta al contrario (grande disco ◀◀ con anello di avanzamento) → 4 B imita (microfono specchiato) → 5 Indovina, tenendo premuto ovunque per 600 ms (un tocco breve riascolta) → 6 Esito con Presa/Mancata, punteggio e «Round 4».

**Tocchi per round: 7.**

**Pro.** Ha i bersagli più grandi di tutti: metà schermo o tutto lo schermo. Un passo per volta, quindi niente da cercare. Il colore della scheda dice il passo anche da lontano. Lo spoiler è irraggiungibile fino alla scheda 5. Il gesto è già noto a chiunque usi i social. Su desktop la scheda sta al centro, con quelle vicine in anteprima, le frecce e la tastiera.

**Contro.** Riascoltare liberamente (A al contrario durante l'indovina) richiede di tornare indietro di una scheda. Le zone di tocco sono invisibili, quindi la pill in basso deve ripetere l'azione "avanti". Lo stile poster va curato in ogni lingua, perché i titoli in maiuscolo stretto si allungano in inglese.

**Impatto.** Bisogna aggiungere `fase` e una mappa scheda→fase. Servono i componenti `Storia.svelte` (zone di tocco, segmenti, transizione a cubo), una scheda per fase e `Liquido.svelte` (due livelli, quello invertito ritagliato con `clip-path` legato a `--p` di `holdButton`). Le illustrazioni sono SVG statici. È il concetto con più stringhe nuove in `testi.ts`.

---

## Classifica (06–10)

1. **09 · Pad**: il miglior rapporto tra ottimizzazione e rischio. Le 9 azioni sono sempre nello stesso posto, l'ascolto chiave sta al centro del pollice e i bersagli sono enormi. Si implementa sull'architettura attuale quasi senza toccare lo stato.
2. **10 · Storie**: il più radicale e il più facile per chi non ha mai giocato. Il bersaglio è lo schermo e lo spoiler è irraggiungibile. Costa di più (sei schede e stringhe) e rende più faticoso il riascolto libero.
3. **07 · Tracce**: il più leggibile e "intelligente", perché tutto lo stato del round è visibile e confrontabile sulla stessa scala. È il più fedele alla schermata unica della specifica, ma ha un tono da strumento, non da festa.
4. **08 · Duello**: imbattibile in orizzontale e su desktop, senza passaggi di mano. In verticale, cioè nell'uso più comune, è meno forte degli altri.
5. **06 · Vocali**: immediato perché copia una grammatica nota, ma è il meno originale e il layout cambia a ogni passo, tranne il microfono.

**Consiglio la 09 · Pad come base**, prendendo dalla 10 il «tieni premuto ovunque» con il riempimento a liquido sulla scheda finale, e dalla 07 la scala comune delle onde nel display.
