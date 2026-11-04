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
    "Il Giocatore A registra una parola o una frase breve. Gli altri non devono sentirla.",
    "Il Giocatore B ascolta la registrazione di A al contrario.",
    "B registra la sua imitazione di quello che ha sentito, suono per suono.",
    "Si ascolta l'imitazione di B al contrario: se B è stato bravo, salta fuori la parola originale. B prova a indovinarla.",
    "Con «Rivela» si ascolta l'originale di A e si confronta. Segnate se è stata indovinata.",
  ],

  // Slot
  titoloSlotA: "Originale",
  giocatoreA: "Giocatore A",
  titoloSlotB: "Imitazione",
  giocatoreB: "Giocatore B",
  registra: "Registra",
  elaboro: "Elaboro…",
  attendoMicrofono: "Attendo il microfono…",
  ascoltaContrario: "Ascolta al contrario",
  ascoltaOriginale: "Ascolta originale",
  /** Etichette visibili brevi dei pulsanti di ascolto (il nome accessibile resta quello lungo). */
  contrarioBreve: "Al contrario",
  originaleBreve: "Originale",
  toccaPerFermare: "Tocca per fermare",
  scaricaWav: "Scarica WAV",
  scaricaDopoRivela: "Disponibile dopo «Rivela»",
  tieniPremuto: "Tieni premuto",
  tieniPremutoAiuto: "Tieni premuto per ascoltare: svela la soluzione.",
  riregistraDomanda: "Sovrascrivere la registrazione?",
  riregistraConferma: "Sì, registra di nuovo",

  // Stati dello slot
  statoVuoto: "Vuoto",
  statoRegistrazione: "In registrazione",
  statoPronto: "Pronto · {durata}",
  statoRiproduzioneContrario: "In riproduzione · al contrario",
  statoRiproduzioneOriginale: "In riproduzione · originale",
  timer: "{trascorso} / {massimo}",
  livelloMicrofono: "Livello del microfono",
  registrazioneNonRiuscita: "Registrazione non riuscita o troppo breve. Riprova.",
  registrazioneDebole: "Registrazione troppo debole: riprova più vicino al microfono.",
  registrazioneInterrotta:
    "La registrazione si è interrotta: il microfono si è fermato (scollegato o preso da un'altra app). Riprova.",

  // Rivela e punteggio
  rivela: "Rivela / confronta",
  rivelaAiuto: "Tieni premuto per ascoltare l'originale di A.",
  rivelaAncora: "Rivela di nuovo",
  rivelaDopo: "Tocca per riascoltare l'originale",
  comeEAndata: "Com'è andata?",
  indovinata: "Indovinata ✓",
  nonIndovinata: "Non indovinata ✗",
  punteggio: "Punteggio",
  punteggioRiga: "Indovinate {g} · Non indovinate {m}",
  /** Totale nell'intestazione: corto, deve stare in 360 px accanto a "?" e "Nuova". */
  punteggioBreve: "Indovinate {g} su {n}",
  azzeraPunteggio: "Azzera",

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
