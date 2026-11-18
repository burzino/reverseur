// Tutti i testi dell'interfaccia (italiano). Chiavi camelCase; per aggiungere l'inglese basta
// un secondo oggetto con le stesse chiavi. I segnaposto {nome} si sostituiscono con `riempi`.

export const t = {
  // Intestazione
  titoloApp: "Reverseur",
  sottotitoloApp: "Il gioco della parola al contrario",
  nuova: "Nuova",
  nuovaEtichetta: "Nuova partita",
  nuovaDomanda: "Cancellare le registrazioni e ricominciare?",
  nuovaConferma: "Sì, ricomincia",
  annulla: "Annulla",

  // Come si gioca
  comeSiGioca: "Come si gioca",
  chiudi: "Chiudi",
  passi: [
    "La plancia ha una riga per giocatore: A (la parola) e B (l'imitazione). Il pad con il bordo che pulsa è il prossimo da premere.",
    "A preme ● Registra e dice una parola segreta, mentre B si tappa le orecchie. A può riascoltarla tenendo premuto ▶ Originale e rifarla quante volte vuole.",
    "A passa il telefono a B, che ascolta ◀◀ la parola di A al contrario.",
    "B preme ● Imita e rifà i suoni che ha sentito. Allo stop l'imitazione suona al contrario: se è buona, salta fuori la parola. B può riascoltare e rifare quante volte vuole.",
    "Quando B è pronto, tiene premuto ▶ Svela: si sente l'originale di A. Segnate Presa o Mancata e passate al round dopo.",
  ],

  // Display
  round: "Round {n}",
  punteggioRiga: "Prese {g} · Mancate {m}",
  punteggio: "Punteggio",
  timer: "{trascorso} / {massimo}",
  inRegistrazione: "Registra {chi}",
  inAscolto: "Suona: {cosa}",
  scaricaWav: "Scarica WAV",
  scaricaParola: "Parola",
  scaricaImitazione: "Imitazione",

  // Guida (titolo e riga sotto nel display)
  guidaRegistraA: "A, registra una parola segreta",
  guidaRegistraASotto: "B si tappa le orecchie. Per controllarla tieni premuto ▶ Originale; puoi rifarla quando vuoi.",
  guidaPassaB: "Passa il telefono a B",
  guidaPassaBSotto: "B, ascolta ◀◀ la parola di A al contrario.",
  guidaImita: "B, imita quello che hai sentito",
  guidaImitaSotto: "Premi ● Imita e rifai i suoni uno per uno. Riascolta ◀◀ A quante volte vuoi.",
  guidaIndovina: "Che parola senti?",
  guidaIndovinaSotto: "Riascolta ◀◀ B o riprova ● Rifai. Quando sei pronto, tieni premuto ▶ Svela.",
  guidaEsito: "Era questa! Indovinata?",
  guidaEsitoSotto: "Confronta ▶ l'originale di A con ◀◀ l'imitazione di B.",
  guidaPresa: "Presa!",
  guidaMancata: "Mancata, sarà per la prossima",
  guidaProssimo: "Prossimo round: tocca ad A registrare una parola nuova.",

  // Plancia: colonne, righe e pad
  colRegistra: "Registra",
  colContrario: "Al contrario",
  colOriginale: "Originale",
  rigaA: "A · parola",
  rigaB: "B · imitazione",
  registra: "Registra",
  imita: "Imita",
  rifai: "Rifai",
  stop: "Stop",
  attendo: "Attendo…",
  elaboro: "Elaboro…",
  contrario: "Al contrario",
  originale: "Originale",
  svela: "Svela",
  tieniPremuto: "Tieni premuto",
  presa: "Presa",
  mancata: "Mancata",
  prossimoRound: "Round {n}",
  ascolti: "{n}×",
  /** Nomi accessibili dei pad (il testo visibile e' breve). */
  ariaRegistraA: "A: registra la parola",
  ariaContrarioA: "Ascolta la parola di A al contrario",
  ariaOriginaleA: "Ascolta l'originale di A (tieni premuto)",
  ariaSvela: "Svela: ascolta l'originale di A (tieni premuto)",
  ariaRegistraB: "B: registra l'imitazione",
  ariaContrarioB: "Ascolta l'imitazione di B al contrario",
  ariaOriginaleB: "Ascolta l'imitazione di B",
  ariaPresa: "Parola indovinata",
  ariaMancata: "Parola non indovinata",
  ariaNuovoRound: "Prossimo round",
  svelaAiuto: "Tieni premuto: svela la soluzione e chiude il round.",
  originaleAiuto: "Tieni premuto per ascoltare.",
  rifaiADomanda: "Rifare la parola cancella l'imitazione di B. Continuare?",
  rifaiAConferma: "Sì, rifai",
  annullaBreve: "Annulla",
  livelloMicrofono: "Livello del microfono",
  registrazioneNonRiuscita: "Registrazione non riuscita o troppo breve. Riprova.",
  registrazioneDebole: "Registrazione troppo debole: riprova più vicino al microfono.",
  registrazioneInterrotta: "Il microfono si è fermato (scollegato o preso da un'altra app). Riprova.",

  // Errori del microfono
  erroreNegatoTitolo: "Il microfono è bloccato",
  erroreNegatoIntro: "Per registrare serve il permesso del microfono. Per riattivarlo:",
  erroreNegatoChrome:
    "Chrome (Android e computer): tocca il lucchetto o l'icona delle impostazioni sito accanto all'indirizzo → Microfono → Consenti, poi ricarica la pagina.",
  erroreNegatoSafari:
    "Safari su iPhone e iPad: tocca «aA» nella barra degli indirizzi → Impostazioni sito web → Microfono → Consenti. Oppure Impostazioni → Safari → Microfono.",
  erroreNegatoFine: "Poi tocca di nuovo «Registra».",
  erroreNonTrovatoTitolo: "Nessun microfono trovato",
  erroreNonTrovato: "Collega o attiva un microfono, poi tocca di nuovo «Registra».",
  erroreNonSupportatoTitolo: "Registrazione non disponibile",
  erroreNonSupportato:
    "Questo browser non permette di registrare qui. Apri l'app da un indirizzo https:// con un browser aggiornato (Chrome, Safari, Firefox).",
  erroreOccupatoTitolo: "Il microfono è occupato",
  erroreOccupato: "Un'altra app sta usando il microfono. Chiudila e tocca di nuovo «Registra».",
  erroreSconosciutoTitolo: "Non riesco a usare il microfono",
  erroreSconosciuto: "Riprova. Se il problema resta, ricarica la pagina.",
  hoCapito: "Ho capito",
} as const;

/** Sostituisce i segnaposto `{chiave}` con i valori dati. */
export function riempi(testo: string, valori: Record<string, string | number>): string {
  return testo.replace(/\{(\w+)\}/g, (m, k: string) => (k in valori ? String(valori[k]) : m));
}

/** Secondi in formato italiano, una cifra decimale: 3,2 s. */
export function secondi(s: number): string {
  return `${(Math.max(0, s)).toFixed(1).replace(".", ",")} s`;
}
