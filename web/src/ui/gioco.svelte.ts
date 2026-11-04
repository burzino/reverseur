// Regia della partita: collega i gesti dell'interfaccia a recorder, audio e store.
// Regola iOS: ogni gestore di gesto chiama audio.ensureRunning() per PRIMA cosa, prima di qualunque await.
import type { Action } from "svelte/action";
import * as audio from "../audio/audio";
import * as recorder from "../audio/recorder";
import { RecorderError, type RecorderErrorCode } from "../audio/recorder";
import type { PlayMode, SlotId } from "./sessione";
import { store } from "./state.svelte";

/** Durata massima di una registrazione: poi si ferma da sola. */
export const MAX_RECORD_MS = 10_000;
/** Quanto resta visibile "Tieni premuto" dopo una pressione troppo breve. */
export const HINT_MS = 1600;
/**
 * Pagina nascosta durante la registrazione: sotto questa durata la registrazione si annulla
 * (sarebbe solo il rumore del tap), sopra si ferma e si tiene quello che c'e'.
 */
export const MIN_KEEP_MS = 300;

export type ErroreMicrofono = RecorderErrorCode;
/**
 * "breve": registrazione vuota o non decodificabile; "interrotta": il microfono si e' fermato da solo;
 * "debole": nessuna voce sopra la soglia (l'audio resta, solo un avviso).
 */
export type TipoErroreSlot = "breve" | "interrotta" | "debole";
/** Dopo quanto sparisce da solo l'avviso nello slot (e' sovrapposto all'intestazione dello slot). */
export const AVVISO_SLOT_MS = 6000;

interface Registrazione {
  slot: SlotId;
  /** ms trascorsi (aggiornati ~10 volte al secondo). */
  trascorso: number;
  /** Livello 0..1 per il VU-meter. */
  livello: number;
  /** In attesa del permesso del microfono (prima che parta davvero). */
  avvio: boolean;
  /** Registrazione finita, audio in elaborazione. */
  elaborazione: boolean;
}

/** Vero dopo il primo gesto che ha creato l'AudioContext: prima non lo si crea fuori da un gesto. */
let contestoCreato = false;

export function riattiva(): void {
  // Non e' await-ato: deve partire dentro il gesto, il resto puo' proseguire.
  try {
    audio.ensureRunning().catch(() => {
      /* Web Audio assente: lo segnalera' la registrazione */
    });
    contestoCreato = true;
  } catch {
    /* idem */
  }
}

const OPZIONI_SBLOCCO = { capture: true, passive: true } as const;
const EVENTI_SBLOCCO = ["pointerdown", "pointerup", "touchend", "keydown"] as const;

/**
 * Azione Svelte per i pulsanti hold: riprende l'AudioContext a ogni fase del gesto.
 * Su iOS/touch la user activation arriva con pointerup/touchend, non con pointerdown,
 * e la conferma del hold parte da un timer (fuori dal gesto).
 */
export const sbloccaAudio: Action<HTMLElement> = (node) => {
  for (const e of EVENTI_SBLOCCO) node.addEventListener(e, riattiva, OPZIONI_SBLOCCO);
  return {
    destroy() {
      for (const e of EVENTI_SBLOCCO) node.removeEventListener(e, riattiva, OPZIONI_SBLOCCO);
    },
  };
};

class Gioco {
  registrazione = $state<Registrazione | null>(null);
  erroreMicrofono = $state<ErroreMicrofono | null>(null);
  /** Errore di registrazione per slot (troppo breve, decodifica fallita, microfono interrotto). */
  erroreSlot = $state<{ slot: SlotId; tipo: TipoErroreSlot } | null>(null);
  confermaRiregistra = $state<SlotId | null>(null);
  confermaNuova = $state(false);
  /** Dove mostrare "Tieni premuto": il pulsante originale di A o Rivela. */
  suggerimento = $state<"A" | "rivela" | null>(null);

  #giro = 0; // incrementato da ogni avvio/annullamento: scarta i risultati di registrazioni superate
  #inizio = 0; // performance.now() all'avvio effettivo della registrazione
  #intervallo: ReturnType<typeof setInterval> | null = null;
  #stopAuto: ReturnType<typeof setTimeout> | null = null;
  #togliLivello: (() => void) | null = null;
  #timerSuggerimento: ReturnType<typeof setTimeout> | null = null;
  #token = 0; // riproduzione corrente
  #timerAvviso: ReturnType<typeof setTimeout> | null = null;

  #avvisoSlot(slot: SlotId, tipo: TipoErroreSlot): void {
    if (this.#timerAvviso) clearTimeout(this.#timerAvviso);
    this.erroreSlot = { slot, tipo };
    this.#timerAvviso = setTimeout(() => {
      this.erroreSlot = null;
      this.#timerAvviso = null;
    }, AVVISO_SLOT_MS);
  }

  // ---------- Ciclo di vita ----------

  /** Listener globali (pagina nascosta/visibile, errori del registratore). Restituisce lo scollegamento. */
  collega(): () => void {
    const visibilita = (): void => {
      if (document.visibilityState === "visible") {
        // Best effort: fuori da un gesto iOS puo' rifiutare, ci riprova il prossimo tap.
        if (contestoCreato) riattiva();
      } else {
        this.#paginaNascosta();
      }
    };
    document.addEventListener("visibilitychange", visibilita);
    const togliErrore = recorder.onError(() => this.#erroreRegistratore());
    return () => {
      document.removeEventListener("visibilitychange", visibilita);
      togliErrore();
    };
  }

  /** Pagina in background mentre si registra: si ferma (o si annulla se brevissima). */
  #paginaNascosta(): void {
    const r = this.registrazione;
    if (!r || r.avvio || r.elaborazione) return;
    if (performance.now() - this.#inizio < MIN_KEEP_MS) this.#annulla(r.slot);
    else void this.#ferma();
  }

  /** MediaRecorder in errore o traccia del microfono finita: lo slot torna com'era. */
  #erroreRegistratore(): void {
    const r = this.registrazione;
    // In avvio rifiuta start(), in elaborazione rifiuta stop(): li gestiscono #avvia e #ferma.
    if (!r || r.avvio || r.elaborazione) return;
    this.#annulla(r.slot);
    this.#avvisoSlot(r.slot, "interrotta");
  }

  /** Scarta la registrazione in corso; lo slot torna "ready" (audio precedente) o "empty". */
  #annulla(id: SlotId): void {
    this.#giro++;
    this.#pulisciTimer();
    recorder.cancel();
    const s = store.getState().slots[id];
    store.setSlot(id, { status: s.original ? "ready" : "empty" });
    this.registrazione = null;
  }

  // ---------- Registrazione ----------

  /** Tap su "Registra": avvia, ferma, oppure chiede conferma se lo slot ha gia' audio. */
  premiRegistra(id: SlotId): void {
    riattiva();
    const r = this.registrazione;
    if (r) {
      if (r.slot === id && !r.avvio && !r.elaborazione) void this.#ferma();
      return; // l'altro slot sta registrando: il pulsante e' comunque disabilitato
    }
    if (store.getState().slots[id].original) {
      this.confermaRiregistra = this.confermaRiregistra === id ? null : id;
      return;
    }
    void this.#avvia(id);
  }

  confermaRiregistrazione(id: SlotId): void {
    riattiva();
    this.confermaRiregistra = null;
    if (!this.registrazione) void this.#avvia(id);
  }

  annullaRiregistrazione(): void {
    this.confermaRiregistra = null;
  }

  async #avvia(id: SlotId): Promise<void> {
    this.#fermaRiproduzione();
    this.erroreMicrofono = null;
    this.erroreSlot = null;
    this.confermaRiregistra = null;
    const giro = ++this.#giro;
    this.registrazione = { slot: id, trascorso: 0, livello: 0, avvio: true, elaborazione: false };
    try {
      await recorder.start();
    } catch (e) {
      if (giro !== this.#giro) return;
      this.registrazione = null;
      this.erroreMicrofono = e instanceof RecorderError ? e.code : "unknown";
      return;
    }
    // Annullata (Nuova partita) mentre si aspettava il permesso.
    if (giro !== this.#giro || !recorder.isRecording()) {
      if (giro === this.#giro) this.registrazione = null;
      return;
    }
    // Permesso concesso mentre la pagina era gia' in background: non registrare di nascosto.
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      this.#annulla(id);
      return;
    }
    // Una nuova parola di A apre un giro nuovo: la soluzione non e' piu' nota.
    // B che registra di nuovo dopo Rivela non cambia nulla (l'originale e' gia' stato sentito).
    if (id === "A") store.newRound();
    store.setSlot(id, { status: "recording" });
    const inizio = performance.now();
    this.#inizio = inizio;
    this.registrazione = { slot: id, trascorso: 0, livello: 0, avvio: false, elaborazione: false };
    this.#togliLivello = recorder.onLevel((l) => {
      if (this.registrazione) this.registrazione.livello = l;
    });
    this.#intervallo = setInterval(() => {
      if (this.registrazione) this.registrazione.trascorso = Math.min(MAX_RECORD_MS, performance.now() - inizio);
    }, 100);
    this.#stopAuto = setTimeout(() => void this.#ferma(), MAX_RECORD_MS);
  }

  #pulisciTimer(): void {
    if (this.#intervallo) clearInterval(this.#intervallo);
    if (this.#stopAuto) clearTimeout(this.#stopAuto);
    this.#togliLivello?.();
    this.#intervallo = null;
    this.#stopAuto = null;
    this.#togliLivello = null;
  }

  async #ferma(): Promise<void> {
    const r = this.registrazione;
    if (!r || r.avvio || r.elaborazione) return;
    const giro = this.#giro;
    const id = r.slot;
    this.#pulisciTimer();
    r.elaborazione = true;
    r.livello = 0;
    try {
      const blob = await recorder.stop();
      const decodificato = await audio.decode(blob);
      const { buffer: original, voiced } = audio.processWithInfo(decodificato);
      const reversed = audio.reverse(original);
      if (giro !== this.#giro) return;
      if (id === "A") store.newRound();
      store.setSlot(id, { status: "ready", blob, original, reversed, duration: original.duration });
      if (!voiced) this.#avvisoSlot(id, "debole");
    } catch {
      if (giro !== this.#giro) return;
      // Resta l'audio precedente, se c'era.
      const s = store.getState().slots[id];
      store.setSlot(id, { status: s.original ? "ready" : "empty" });
      this.#avvisoSlot(id, "breve");
    } finally {
      if (giro === this.#giro) this.registrazione = null;
    }
  }

  // ---------- Riproduzione ----------

  #fermaRiproduzione(): void {
    this.#token++;
    audio.stopAll();
    store.setPlaying(null);
  }

  staSuonando(id: SlotId, mode: PlayMode): boolean {
    const p = store.getState().playing;
    return p !== null && p.slot === id && p.mode === mode;
  }

  /** Toggle: stesso pulsante ferma, un altro pulsante sostituisce l'audio in corso. */
  premiAscolta(id: SlotId, mode: PlayMode): void {
    // Contesto "suspended"/"interrupted" (iOS dopo background o chiamata): resume prima di play.
    riattiva();
    this.#nascondiSuggerimento();
    if (this.registrazione) return;
    if (this.staSuonando(id, mode)) {
      this.#fermaRiproduzione();
      return;
    }
    const slot = store.getState().slots[id];
    const buf = mode === "original" ? slot.original : slot.reversed;
    if (!buf) return;
    const token = ++this.#token;
    audio.play(buf, {
      meta: { slot: id, mode },
      onEnded: () => {
        if (token === this.#token) store.setPlaying(null);
      },
    });
    if (token === this.#token) store.setPlaying({ slot: id, mode });
  }

  /** Rivela: suona l'originale di A e segna la partita come rivelata (o ferma, se sta gia' suonando). */
  rivela(): void {
    riattiva();
    this.#nascondiSuggerimento();
    if (!store.getState().slots.A.original || this.registrazione) return;
    // Tap (bypass) mentre suona l'originale di A: ferma soltanto, non rivela.
    if (this.staSuonando("A", "original")) {
      this.#fermaRiproduzione();
      return;
    }
    store.setRevealed(true);
    this.premiAscolta("A", "original");
  }

  #nascondiSuggerimento(): void {
    if (this.#timerSuggerimento) clearTimeout(this.#timerSuggerimento);
    this.#timerSuggerimento = null;
    this.suggerimento = null;
  }

  /** Pressione lunga annullata: "Tieni premuto" solo se il dito si e' alzato troppo presto. */
  pressioneAnnullata(dove: "A" | "rivela", motivo: string): void {
    if (motivo !== "early") return;
    if (this.#timerSuggerimento) clearTimeout(this.#timerSuggerimento);
    this.suggerimento = dove;
    this.#timerSuggerimento = setTimeout(() => {
      this.suggerimento = null;
      this.#timerSuggerimento = null;
    }, HINT_MS);
  }

  // ---------- Esportazione ----------

  scarica(id: SlotId): void {
    const st = store.getState();
    const buf = st.slots[id].original;
    if (!buf || (id === "A" && !st.revealed)) return;
    const url = URL.createObjectURL(audio.toWavBlob(buf));
    const a = document.createElement("a");
    a.href = url;
    a.download = `reverseur-${id === "A" ? "originale" : "imitazione"}.wav`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  // ---------- Partita ----------

  premiNuova(): void {
    riattiva();
    this.confermaNuova = !this.confermaNuova;
  }

  annullaNuova(): void {
    this.confermaNuova = false;
  }

  nuovaPartita(): void {
    riattiva();
    this.#giro++;
    this.#pulisciTimer();
    recorder.cancel();
    this.#fermaRiproduzione();
    store.reset();
    this.registrazione = null;
    this.confermaNuova = false;
    this.confermaRiregistra = null;
    this.erroreMicrofono = null;
    this.erroreSlot = null;
    this.#nascondiSuggerimento();
  }

  chiudiErrore(): void {
    this.erroreMicrofono = null;
  }
}

export const gioco = new Gioco();
