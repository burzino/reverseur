# Mockup UX/UI degli slot

Cinque direzioni per sostituire i tre pulsanti a pillola impilati (40/40/20) che l'utente ha trovato brutti. Sono HTML statici: si aprono nel browser e non hanno bisogno di JS né di rete. I PNG accanto sono gli screenshot. Ogni file mostra 390×844 chiaro e scuro, 360×640 (lo schermo più piccolo) e lo slot A in registrazione, con timer e VU. Colori e testi vengono da `web/src/ui/tema.css` e `testi.ts`.

Le scelte comuni a tutti i mockup correggono la gerarchia attuale. Registra non è più la superficie più scura: è una piastrella neutra con il disco rosso, perché il rosso vuol dire "registra". Al contrario prende il colore pieno del giocatore, perché è l'ascolto chiave. Originale è secondario: contorno o tono leggero, con il lucchetto in A.

## 01 · Pad affiancati
Registra e Al contrario sono due pad quadrati affiancati, di pari peso, con l'icona sopra l'etichetta. Originale è una barra sottile a tutta larghezza sotto i pad.
- Pro: simmetrico, molto leggibile, bersagli grandi.
- Contro: è il più "standard". La barra Originale a tutta larghezza pesa ancora un po' troppo.

## 02 · Colonna Registra (consigliato)
Registra è una colonna alta a sinistra. A destra, sotto il pollice, ci sono Al contrario (grande) e Originale (piccolo). Le aree sono esattamente 40/40/20.
- Pro: ogni ruolo ha una forma diversa (colonna, piastrella, pillola). Il peso rispetta la richiesta alla lettera, gli ascolti sono a portata del pollice destro e la registrazione ha spazio per timer e VU. Regge bene anche a 360×640 e su desktop.
- Contro: Registra a sinistra è un po' più lontano dal pollice destro, ma si tocca meno spesso degli ascolti.

## 03 · Registratore
Registra è un grande tasto rotondo a destra, come un registratore, accanto a una piastrella Al contrario alta quanto lo spazio. Originale diventa una pillola compatta nella riga del titolo.
- Pro: ha il carattere più "di gioco" e la metafora è chiara. Lascia più spazio ai due controlli principali.
- Contro: la pillola Originale è visibilmente alta 44 px (l'area di tocco arriva a 56 px) e la riga del titolo è affollata a 360 px. Il cerchio lascia spazi vuoti sui telefoni alti.

## 04 · Pulsantiera connessa
Un solo gruppo di pulsanti connessi (Material 3 expressive), largo 40/40/20, con giunture sottili. Per ogni slot c'è una sola forma invece di tre pillole.
- Pro: è molto compatto e ordinato e ricorda un'apparecchiatura audio.
- Contro: la colonna Originale è stretta (etichetta da 12,5 px) e i segmenti alti risultano un po' "a colonne". A 360 px "Al contrario" è al limite.

## 05 · Onda al contrario
Al contrario è l'elemento principale: una piastrella a tutta larghezza con la forma d'onda e la durata, come un lettore. Sotto ci sono Registra (largo) e Originale (stretto).
- Pro: è il più espressivo e fa capire subito che cosa si ascolta.
- Contro: Registra pesa meno di Al contrario (circa 33/50/17, non 40/40/20). La forma d'onda va calcolata dall'audio reale, quindi richiede più codice.

## 06 · Pad con Originale in alto (richiesta dell'utente: 01 + pillola della 03)
Ci sono due pad affiancati di pari peso, Registra e Al contrario. Originale diventa una pillola compatta nella riga del titolo dello slot. I pad usano l'altezza liberata, ma la loro proporzione è limitata (al massimo 1:1,3, sul desktop 1:1,35), così non diventano colonne assurde. Lo spazio che avanza si divide sopra e sotto gli slot. Sul desktop gli slot e Rivela sono raggruppati al centro, senza buchi tra i due.
- **Nomi.** Lo slot A si chiama «Parola», lo slot B «Imitazione», e la pillola resta «Originale»: così la parola non compare due volte. Il vocabolario resta quello già usato dall'app, dalle regole e dai nomi accessibili («Ascolta al contrario» / «Ascolta originale»), e «Al contrario» / «Originale» resta una coppia chiara. Il badge mostra la lettera del giocatore (A/B) al posto di 1/2 e del testo «(Giocatore A)», che sparisce. Alternative valutate: pillola «Ascolta» (ambigua accanto ad «Al contrario»), «Normale» o «Al dritto» (chiari ma nuovi), titolo «Segreta» per A (simpatico ma meno neutro).
- **Riga del titolo a 360 px.** La riga contiene badge, titolo e stato, la pillola e Scarica. Per farla stare, ho tolto «(Giocatore A)» (lo dice il badge) e spostato la durata dentro il pad Al contrario («0,9 s»), così lo stato è una parola sola («Pronto», «Registro…», «Vuoto»). La pillola è alta 44 px a vista, ma ha un'area di tocco di 56 px grazie a un margine invisibile. Scarica è un'icona da 22 px con area di tocco di 56×56 che rientra nel margine dello slot. Le aree di tocco non si sovrappongono. Il lucchetto nella pillola indica la pressione lunga; con un tap breve compare il fumetto «Tieni premuto» sopra la pillola. Durante la pressione, un velo e una barra la riempiono da sinistra (riquadro in basso a destra).
- Pro: è pulito e simmetrico, e i due controlli principali hanno davvero lo stesso peso. Originale è visibilmente secondario, e lo slot è più basso e calmo.
- Contro: la riga del titolo è piena a 360 px, quindi i testi non possono allungarsi. Originale è più piccolo del 20% richiesto (circa 10%) e sta in alto, lontano dal pollice. Per l'originale di A va bene, perché si ascolta di rado ed è protetto.

## Raccomandazione
Consiglio la **02 · Colonna Registra**. È l'unica che rispetta alla lettera il 40/40/20 dando a ogni ruolo una forma diversa, così non si ripete il difetto delle tre pillole uguali. Mette gli ascolti sotto il pollice e funziona da 360×640 fino al desktop: nel file c'è anche una vista 1280×720 con gli slot affiancati che riempiono l'altezza. In alternativa, la 05 è la più bella da vedere, se si accetta che Registra pesi un po' meno.
