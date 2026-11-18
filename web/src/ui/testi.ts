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
    "A registra una parola segreta, la riascolta e la rifà finché è chiara. B intanto si tappa le orecchie.",
    "A passa il telefono a B.",
    "B ascolta la parola di A al contrario e registra la sua imitazione, suono per suono.",
    "Allo stop l'imitazione di B suona al contrario: se è buona, salta fuori la parola. B può riascoltare e rifare quante volte vuole.",
    "B prova a indovinare, poi tiene premuto «Rivela» per sentire l'originale di A. Segnate se è stata indovinata.",
  ],

  // Intestazione: round e punteggio
  round: "Round {n}",
  punteggioBreve: "Indovinate {g} su {n}",
  punteggioRiga: "Indovinate {g} · Mancate {m}",
  punteggio: "Punteggio",

  // Prova di A
  toccaA: "Tocca ad A",
  provaATitolo: "Di' una parola segreta",
  provaAAiuto: "B si tappa le orecchie. Riascoltala e rifalla finché è chiara.",
  laTuaParola: "La tua parola",
  comeLaSentiraB: "Come la sentirà B",
  passaAB: "Fatto: passa a B",

  // Passaggi di mano
  passaABTitolo: "Passa il telefono a B",
  passaABAiuto: "B sentirà la parola solo al contrario: l'originale resta nascosto fino alla fine.",
  sonoB: "Sono B, ascolto",
  rifaiParolaA: "A: rifai la parola",
  passaBATitolo: "Ridai il telefono ad A",
  passaBAAiuto: "A può riascoltare la parola e registrarla di nuovo, più scandita. Poi la ripassa a B.",
  sonoA: "Sono A",

  // Prova di B
  toccaB: "Tocca a B",
  provaBTitolo: "Imita, poi indovina",
  provaBAiuto: "Ascolta la parola al contrario e rifai i suoni che senti. Riprova quante volte vuoi.",
  parolaAContrario: "Parola di A, al contrario",
  imitazioneContrario: "La tua imitazione, al contrario",
  imitazioneVuota: "Registra per sentirla",
  imita: "Imita",
  ridaiAdA: "Ridai il telefono ad A",
  ridaiDomanda: "Le prove di B verranno cancellate. Ridare il telefono ad A?",
  ridaiConferma: "Sì, ridai ad A",

  // Registrazione
  registra: "Registra",
  rifai: "Rifai",
  elaboro: "Elaboro…",
  attendoMicrofono: "Attendo il microfono…",
  toccaPerFermare: "Tocca per fermare",
  timer: "{trascorso} / {massimo}",
  ascolti: "{n}×",
  livelloMicrofono: "Livello del microfono",
  registrazioneNonRiuscita: "Registrazione non riuscita o troppo breve. Riprova.",
  registrazioneDebole: "Registrazione troppo debole: riprova più vicino al microfono.",
  registrazioneInterrotta:
    "La registrazione si è interrotta: il microfono si è fermato (scollegato o preso da un'altra app). Riprova.",

  // Rivela
  rivela: "Rivela",
  rivelaSotto: "Tieni premuto per sentire l'originale",
  tieniPremuto: "Tieni premuto",
  rivelaAiuto: "Tieni premuto per ascoltare l'originale di A: svela la soluzione.",

  // Esito
  esitoTitolo: "Era questa!",
  esitoAiuto: "Confronta l'originale di A con l'imitazione di B al contrario.",
  originaleA: "Originale di A",
  imitazioneBContrario: "Imitazione di B, al contrario",
  comeEAndata: "Com'è andata?",
  indovinata: "Indovinata",
  mancata: "Mancata",
  prossimoRound: "Round {n}: tocca ad A",
  scaricaWav: "Scarica WAV",
  scaricaParola: "Parola",
  scaricaImitazione: "Imitazione",

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
