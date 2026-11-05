# Mockup v2: cinque interfacce rifatte da zero

Ogni file HTML è autonomo e funziona senza rete: usa solo il Roboto Flex installato in `web/node_modules`, caricato con un percorso relativo, e SVG inline. Ogni file contiene:

- in alto, il razionale (concetto, flusso, perché è meglio);
- una riga di 5 telefoni 390×844 in tema chiaro, uno per momento chiave: (a) inizio, (b) A registra, (c) B ascolta al contrario e imita, (d) indovina e rivela, (e) esito e punteggio;
- una seconda riga con la rivelazione in tema scuro, un'altra schermata scura o di passaggio, la verifica a 360×640 e due schede su movimento, colore e tipo.

Nei file aperti nel browser, il VU, i timer e le bobine si animano. **Nel telefono scuro della rivelazione la pressione lunga funziona davvero**: tieni premuto con mouse, dito o Spazio. Se rilasci prima, il pulsante fa lo shake e compare «Tieni premuto». Nei PNG le animazioni sono ferme e la pressione è mostrata a metà corsa, intorno al 60%.

## La scelta di fondo, comune a tutti e cinque

La plancia con due slot e sei pulsanti costringe chi gioca a capire le regole prima di cominciare, e lascia «Originale di A» a un dito da B. Tutti e cinque i concetti la sostituiscono con un **flusso guidato a turni**: una schermata per ogni passo, un'azione principale nella zona del pollice, e l'originale di A che non compare finché non si arriva alla rivelazione. Così lo spoiler non è solo protetto dalla pressione lunga: è irraggiungibile. Cambiano l'identità visiva e la metafora.

Durata della pressione: «Ascolta originale» resta a 200 ms (`HOLD_TO_PLAY_MS`). Per il gesto finale di rivelazione propongo **600 ms**, che resta sopra il minimo di 200: in 200 ms il riempimento non si fa in tempo a vedere, e il momento perde suspense. Il valore resta una costante configurabile.

---

## A · Staffetta (consigliato)
**Idea.** Il telefono è il testimone di una staffetta. Ogni passo occupa tutto lo schermo e il colore dice di chi è il turno: A è viola #4A2FD1, B è corallo #FF7A52. Una lettera gigante, A o B, compare in Roboto Flex stretto e nero. Una barra a 5 segmenti mostra a che punto è il round. Tra A e B c'è una schermata a tutto colore, «Passa il telefono a B».

**Flusso.** Inizio round (ruoli e punteggio) → A registra (timer grande, VU ad anello di tacche e arco che conta i 10 s attorno al tasto Stop) → Passa il telefono → B ascolta al contrario (scheda con onda e numero di ascolti) e registra l'imitazione → Indovina: grande riquadro «Imitazione al contrario», poi la barra «Tieni premuto per rivelare» che si riempie da sinistra, con un fumetto di aiuto → Esito: «Indovinata!», punteggio +1, i due audio da confrontare, scelta Indovinata/Mancata, «Round 4: ora registra B».

**Pro.** È il più chiaro e il più facile da imparare: non serve leggere le regole. Il colore per giocatore aiuta molto nel passaggio di mano. Ha un solo comando grande per schermata (76–132 px), sempre in basso. È anche il più vicino al sistema visivo attuale (viola e corallo dell'icona), quindi la migrazione costa poco. Regge bene a 360×640: la lettera si rimpicciolisce con una container query.

**Contro.** È meno "spettacolare" di Palco o Cassetta. Ha più schermate da mantenere, e chi vuole riascoltare liberamente deve usare i pulsanti secondari ("Rifai", riascolto nell'esito).

**Impatto sull'implementazione.** È spiegato più sotto, perché è la proposta consigliata.

## B · Cassetta
**Idea.** Un mangianastri skeuomorfo. Ogni round è una cassetta viola (il guscio è il colore del marchio): il lato A, lavanda, contiene la parola; il lato B, corallo, l'imitazione. Le bobine girano all'indietro con l'audio al contrario. C'è un VU ad ago su scala logaritmica reale, un contanastro a rulli e una pulsantiera fissa di tasti a pianoforte. Le istruzioni sono etichette Dymo, il punteggio è la scaletta scritta sulla copertina.

**Flusso.** Copertina con scaletta → lato A: REC giù, Stop → la cassetta si gira sul lato B: ◀◀ fa sentire A al contrario, REC registra B → indovina: ◀◀ suona B al contrario, ▶ Originale va tenuto premuto mentre la barra di 10 LED si accende → esito: nuova traccia in scaletta, ⏏ Espelli.

**Pro.** Ha l'identità più memorabile, e la metafora spiega l'inversione da sola. La pulsantiera sta sempre nello stesso posto, quindi la memoria muscolare si forma subito.

**Contro.** È lo stile più pesante da costruire e mantenere (SVG, ombre, stati dei tasti). Le etichette dei tasti sono piccole (11,5 px maiuscolo spaziato) e chi non ha mai visto un registratore può trovarlo meno immediato. Rischia di sembrare "vintage per vintage".

**Impatto.** Stesso flusso a fasi di A. In più servono i componenti `Cassetta.svelte` (SVG parametrico: lato, titolo, quantità di nastro), `VuAgo.svelte` (con inerzia di attacco e rilascio) e `Pulsantiera.svelte` (tasti con etichette per fase). Il codice audio non cambia.

## C · Specchio
**Idea.** Editoriale e sobrio: carta, inchiostro e un solo colore con un significato preciso, **viola = al contrario**. La forma d'onda è la protagonista: si disegna mentre parli sulla scala fissa da 10 s, e diventa viola e specchiata quando è invertita. Nella rivelazione l'onda dell'originale **si dispiega sotto il dito**: la percentuale della pressione corrisponde a quanta onda vedi.

**Flusso.** Home con cifre grandi → A registra (onda live con testina rossa e anello del tempo) → B: onda di A al contrario in alto e onda propria che cresce sotto → indovina: onda viola di B, poi tieni premuto il cerchio e l'onda di A si apre fino al 100% → esito: le due onde sovrapposte per il confronto.

**Pro.** È il concetto che spiega meglio *perché* il gioco funziona, e il feedback della pressione ha un significato. È elegante e senza tempo, con i contrasti migliori (viola 5,4:1 su carta, lavanda 7,9:1 sul nero).

**Contro.** È meno caldo e "da festa". Servono i picchi dell'onda calcolati dall'`AudioBuffer`, che però è un'operazione economica. Rischia di sembrare uno strumento più che un gioco.

**Impatto.** Flusso a fasi. Una funzione pura `picchi(buffer, n)` in `audio.ts`, testabile come `reverse` e `trimSilence`. Un componente `Onda.svelte` con le modalità `live`, `specchiata` e `dispiegata(p)`. Il VU attuale si sostituisce con l'onda live.

## D · Mazzo
**Idea.** Un gioco da tavolo illustrato in stile neo-brutalista: contorni spessi, ombre piene, sfondo giallo. A è un avatar pomodoro e B un avatar menta, la cui bocca segue il VU. Ogni round è una carta. Il segreto è una **carta coperta** da girare tenendo premuto: mentre il dito resta giù, la carta si solleva in prospettiva. Il punteggio è competitivo, per giocatore, in partite da 8 round.

**Flusso.** Tavolo con tabellone A contro B → carta rossa di A (registrazione) → carta menta di B (ascolto al contrario e imitazione) → carta coperta: tieni premuto per girarla → carta girata con il timbro «Indovinata! +1».

**Pro.** È il più caldo e adatto alle famiglie e ai bambini. Il round e il punteggio per giocatore danno alla partita un inizio e una fine. La carta coperta è la metafora più universale di "segreto".

**Contro.** Il punteggio competitivo è più di quanto chiede la specifica, che parla di indovinate/mancate. Lo stile illustrato richiede disciplina, altrimenti ogni nuova schermata rischia di sembrare "fuori stile". Il tema scuro va curato a parte (i contorni diventano color crema).

**Impatto.** Flusso a fasi, più due cose: `punteggio` per giocatore in `sessione.ts` (oggi è di coppia) e `rounds` configurabili. Servono i componenti `Carta.svelte` e `Avatar.svelte` (SVG con la bocca legata all'RMS).

## E · Palco
**Idea.** Un quiz televisivo. Un presentatore guida la partita con battute scritte ("A, al microfono!"). C'è un'insegna a lampadine, una spia ON AIR, un **applausometro** a 15 segmenti che fa da VU e un tabellone a cifre ribaltabili. La rivelazione è un **buzzer rosso** da 176 px: mentre lo tieni premuto, si accendono una alla volta le 20 lampadine attorno, sotto l'occhio di bue. Il tema scuro è la "prima serata".

**Flusso.** Sigla con podi → ON AIR con A al microfono → B e il "nastro misterioso" al contrario → il momento della verità: buzzer → tabellone e prossima manche.

**Pro.** È il più "da festa" e crea vera suspense. Il buzzer è il bersaglio più grande e più ovvio possibile, centrato nella zona del pollice. I testi del presentatore insegnano le regole.

**Contro.** I testi sono lunghi e da tradurre bene (i18n). L'estetica è molto caratterizzata e può stancare dopo molte partite. Le tende e i bagliori vanno contenuti su schermi piccoli.

**Impatto.** Flusso a fasi. Componenti `Buzzer.svelte` (holdButton con anello di lampadine al posto dell'anello di progresso), `Applausometro.svelte` e `Tabellone.svelte`. Molte nuove stringhe in `testi.ts`.

---

## Classifica e raccomandazione

1. **A · Staffetta**: la migliore base. Risolve il problema vero (capire il gioco e non spoilerare) con il minimo rischio, ed è coerente con il marchio.
2. **C · Specchio**: la più bella e la più "intelligente". Il dispiegarsi dell'onda nella rivelazione si può portare dentro A.
3. **E · Palco**: la più divertente. Il buzzer con le lampadine si potrebbe usare come rivelazione in A.
4. **D · Mazzo**: ottima per un pubblico familiare, ma aggiunge regole (punteggio per giocatore, 8 round).
5. **B · Cassetta**: l'identità più forte, ma la più costosa e la meno immediata.

**Consiglio la A · Staffetta**, eventualmente con l'onda che si dispiega di C nella schermata «Indovina». L'architettura a fasi è la stessa per tutti e cinque, quindi la scelta di stile si può anche rimandare: si implementa prima il flusso, poi la pelle.

## Impatto sull'architettura (A · Staffetta)

- **Stato.** In `sessione.ts` si aggiungono `fase` (`inizio → registraA → passa → ascoltaB → registraB → indovina → esito`), `round` e `chiRegistra` (i ruoli si scambiano a ogni round), più le transizioni pure, testabili come lo store attuale. Gli slot A e B restano come dati (registrazione, stato, numero di ascolti), ma non come interfaccia.
- **UI.** `App.svelte` mostra una schermata per fase. Al posto di `Slot.svelte` arrivano `SchermataInizio`, `SchermataRegistra` (usata da A e da B, con un tema per giocatore), `SchermataPassa`, `SchermataIndovina` e `SchermataEsito`. `PulsanteRegistra`, `VuMeter` (in una variante ad anello), `Punteggio`, `ConfermaInline` ed `ErroreMicrofono` si riusano.
- **Audio e hold.** `audio.ts`, `recorder.ts` e `holdButton.ts` restano invariati. «Rivela» usa `holdButton` con `ms: 600` (proposta) e una barra a riempimento. Durante il riascolto nell'esito, «Ascolta originale» resta a 200 ms.
- **Navigazione.** Ogni passo ha un'azione secondaria "Rifai" (riregistra con conferma inline). «Nuova partita» passa nel menu ⋯. Il pulsante Indietro del sistema torna al passo precedente senza perdere le registrazioni.
- **Testi e test.** Nuove stringhe in `testi.ts`. Gli E2E passano da `data-state` sugli slot a `data-fase` sulla schermata, più `data-state` sul tasto di registrazione. Lo spy su `AudioBufferSourceNode` resta valido.
- **Specifica.** `PROMPT.md` chiede una "schermata unica, due sezioni": la deviazione va motivata in `docs/DECISIONS.md` (spoiler irraggiungibile, una mano, nessuna regola da spiegare). Su desktop la colonna resta centrata, larga circa 480 px.
