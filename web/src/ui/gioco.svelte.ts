// Regia della partita: collega i gesti dell'interfaccia a recorder, audio e store.
// Regola iOS: ogni gestore di gesto chiama audio.ensureRunning() per PRIMA cosa, prima di qualunque await.
import * as audio from "../audio/audio";
import * as recorder from "../audio/recorder";
import { RecorderError, type RecorderErrorCode } from "../audio/recorder";
import type { PlayMode, SlotId } from "./sessione";
import { store } from "./state.svelte";

/** Durata massima di una registrazione: poi si ferma da sola. */
export const MAX_RECORD_MS = 10_000;
/** Quanto resta visibile "Tieni premuto" dopo una pressione troppo breve. */
export const HINT_MS = 1600;

export type ErroreMicrofono = RecorderErrorCode;

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

export function riattiva(): void {
  // Non e' await-ato: deve partire dentro il gesto, il resto puo' proseguire.
  try {
    void audio.ensureRunning();
  } catch {
    /* Web Audio assente: lo segnalera' la registrazione */
  }
}

class Gioco {
  registrazione = $state<Registrazione | null>(null);
  erroreMicrofono = $state<ErroreMicrofono | null>(null);
  /** Errore di elaborazione per slot (registrazione troppo breve, decodifica fallita). */
  erroreSlot = $state<SlotId | null>(null);
  confermaRiregistra = $state<SlotId | null>(null);
  confermaNuova = $state(false);
  /** Dove mostrare "Tieni premuto": il pulsante originale di A o Rivela. */
  suggerimento = $state<"A" | "rivela" | null>(null);

  #giro = 0; // incrementato da ogni avvio/annullamento: scarta i risultati di registrazioni superate
  #intervallo: ReturnType<typeof setInterval> | null = null;
  #stopAuto: ReturnType<typeof setTimeout> | null = null;
  #togliLivello: (() => void) | null = null;
  #timerSuggerimento: ReturnType<typeof setTimeout> | null = null;
  #token = 0; // riproduzione corrente

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
    store.setSlot(id, { status: "recording" });
    const inizio = performance.now();
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
      const original = audio.process(decodificato);
      const reversed = audio.reverse(original);
      if (giro !== this.#giro) return;
      store.setSlot(id, { status: "ready", blob, original, reversed, duration: original.duration });
    } catch {
      if (giro !== this.#giro) return;
      // Resta l'audio precedente, se c'era.
      const s = store.getState().slots[id];
      store.setSlot(id, { status: s.original ? "ready" : "empty" });
      this.erroreSlot = id;
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
    const giaSuona = this.staSuonando("A", "original");
    store.setRevealed(true);
    if (giaSuona) this.#fermaRiproduzione();
    else this.premiAscolta("A", "original");
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
    const buf = store.getState().slots[id].original;
    if (!buf) return;
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
