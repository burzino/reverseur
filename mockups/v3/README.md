# Mockup v3: 10 concetti

Dieci direzioni diverse sia dalla v1 (plancia a due slot) sia dalla v2 (percorsi guidati a turni), con un'attenzione particolare all'ergonomia del layout: tocchi per round, posizione del pollice, dimensione dei bersagli, assenza di scroll. Ogni concetto ha un file `.html` da aprire nel browser, animato e con la pressione prolungata funzionante, e un `.png`. Le note complete dei due designer sono in `README-01-05.md` e `README-06-10.md`.

In tutti i concetti Rivela richiede una pressione di 600 ms, mentre "Ascolta originale" resta a 200 ms.

| # | Concetto | Idea | Tocchi per round |
|---|---|---|---|
| 01 | Tocco | Tutto lo schermo è il comando: si tiene premuto per registrare e si scorre per ascoltare | 6 gesti |
| 02 | Tavolo | Telefono appoggiato sul tavolo, schermo diviso in due metà ruotate di 180° | 6 |
| 03 | Ghiera | Una grande manopola con display LCD, il disco gira al contrario | 6 |
| 04 | Cassetto | Contenuto in alto e comandi in un pannello in basso a tre altezze | 5 |
| 05 | Uno | Una parola gigante e un unico pulsante fisso che cambia colore a ogni passo | 7, sempre nello stesso punto |
| 06 | Vocali | Il round è una chat di messaggi vocali, con il microfono fisso in basso | 7 |
| 07 | Tracce | Quattro tracce su una scala temporale comune e un tasto di trasporto unico | 7 |
| 08 | Duello | Pensato per l'orizzontale e il desktop: due metà speculari e la rivelazione al centro | 7 |
| 09 | Pad | Una griglia 3×3 di pad come una drum machine, sotto un display | 7, nessun menu |
| 10 | Storie | Schede a tutto schermo come le storie, con una barra di avanzamento | 7 |

## Classifica dell'orchestratore

1. **09 Pad.** È il miglior equilibrio tra ergonomia, chiarezza e costo. Le 9 azioni restano sempre visibili e sempre nello stesso posto, ogni pad misura 114×128 px e l'ascolto chiave (◀◀ B) sta al centro sotto il pollice. È anche il più vicino all'architettura attuale, con due slot per tre azioni, quindi i test E2E cambiano poco.
2. **05 Uno.** È il più radicale e il più pulito: il pollice non si muove mai e lo stato si legge da due metri. Il prezzo è che si perde il riascolto libero, che finisce nel menu.
3. **03 Ghiera.** Ha l'identità più forte, e il disco che gira al contrario spiega il gioco senza parole.
4. **10 Storie.** È il più facile per chi gioca la prima volta e rende lo spoiler impossibile.
5. **02 Tavolo.** Funziona molto bene come modalità opzionale, perché nessuno deve passare il telefono.

Combinazioni possibili: la griglia di 09 con la rivelazione "a liquido" di 10, oppure il pulsante unico di 05 con la manopola di 03 per rivelare.
