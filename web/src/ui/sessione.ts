// Store della sessione (docs/INTERFACES.md, "state"): logica pura, nessun accesso a
// window/document/localStorage all'import. Lo storage viene iniettato, cosi' Vitest lo
// prova in Node con uno storage finto. Il wrapper reattivo per Svelte e' in state.svelte.ts.

export type SlotId = "A" | "B";
export type SlotStatus = "empty" | "recording" | "ready" | "playing";
export type PlayMode = "original" | "reversed";
export type Verdict = "guessed" | "missed";

export interface SlotState {
  status: SlotStatus;
  blob: Blob | null;
  /** Audio elaborato (trim + normalizzazione + fade). */
  original: AudioBuffer | null;
  reversed: AudioBuffer | null;
  /** Secondi di audio elaborato. */
  duration: number;
}

export interface Playing {
  slot: SlotId;
  mode: PlayMode;
}

export interface Score {
  guessed: number;
  missed: number;
}

export interface State {
  slots: { A: SlotState; B: SlotState };
  playing: Playing | null;
  revealed: boolean;
  score: Score;
  /** Esito scelto per la partita corrente (estensione additiva del contratto): null finche' non si sceglie. */
  verdict: Verdict | null;
}

/** Sottoinsieme di `Storage` usato dallo store. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type Listener = (state: State, prev: State) => void;

export interface Store {
  getState(): State;
  setSlot(id: SlotId, patch: Partial<SlotState>): void;
  setPlaying(p: Playing | null): void;
  setRevealed(revealed: boolean): void;
  addScore(kind: Verdict, delta?: number): void;
  /** Sceglie l'esito della partita: aggiorna il punteggio una sola volta, cambiare idea sposta il punto. */
  judge(v: Verdict): void;
  /**
   * Nuovo giro con la stessa partita: toglie rivelazione ed esito, slot e punteggio restano.
   * Si chiama quando A registra una nuova parola (la soluzione non e' piu' nota).
   */
  newRound(): void;
  /** Azzera slot, riproduzione, rivelazione ed esito; il punteggio resta. */
  reset(): void;
  /** Azzera il punteggio salvato. */
  resetScore(): void;
  subscribe(fn: Listener): () => void;
}

export const SCORE_KEY = "reverseur.punteggio";

export function emptySlot(): SlotState {
  return { status: "empty", blob: null, original: null, reversed: null, duration: 0 };
}

function zeroScore(): Score {
  return { guessed: 0, missed: 0 };
}

function count(x: unknown): number {
  return typeof x === "number" && Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0;
}

/** Legge il punteggio salvato; qualunque anomalia (storage assente, JSON rotto) da' 0 a 0. */
export function loadScore(storage: KeyValueStorage | null | undefined, key = SCORE_KEY): Score {
  if (!storage) return zeroScore();
  try {
    const raw = storage.getItem(key);
    if (!raw) return zeroScore();
    const o = JSON.parse(raw) as Partial<Record<keyof Score, unknown>> | null;
    if (!o || typeof o !== "object") return zeroScore();
    return { guessed: count(o.guessed), missed: count(o.missed) };
  } catch {
    return zeroScore();
  }
}

function saveScore(storage: KeyValueStorage | null | undefined, key: string, score: Score): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(score));
  } catch {
    /* storage pieno o bloccato: il punteggio vale solo per questa sessione */
  }
}

/** Stato di uno slot quando non sta suonando: pronto se ha audio, altrimenti vuoto. */
function idleStatus(s: SlotState): SlotStatus {
  return s.original ? "ready" : "empty";
}

export interface StoreOptions {
  storage?: KeyValueStorage | null;
  key?: string;
  initial?: Partial<State>;
}

export function createStore(opts: StoreOptions = {}): Store {
  const { storage = null, key = SCORE_KEY } = opts;
  let state: State = {
    slots: { A: emptySlot(), B: emptySlot() },
    playing: null,
    revealed: false,
    verdict: null,
    ...opts.initial,
    score: opts.initial?.score ?? loadScore(storage, key),
  };
  const listeners = new Set<Listener>();

  function commit(next: State): void {
    const prev = state;
    state = next;
    for (const fn of [...listeners]) fn(state, prev);
  }

  /** Allinea lo status degli slot a `playing` (data-state="playing" mentre suona uno dei due audio). */
  function withPlaying(slots: State["slots"], playing: Playing | null): State["slots"] {
    const fix = (id: SlotId): SlotState => {
      const s = slots[id];
      if (s.status === "recording") return s;
      const want: SlotStatus = playing?.slot === id && s.original ? "playing" : idleStatus(s);
      return want === s.status ? s : { ...s, status: want };
    };
    return { A: fix("A"), B: fix("B") };
  }

  return {
    getState: () => state,

    setSlot(id, patch) {
      const slot = { ...state.slots[id], ...patch };
      let playing = state.playing;
      // Uno slot che registra o perde l'audio non puo' essere quello in riproduzione.
      if (playing?.slot === id && (slot.status === "recording" || !slot.original)) playing = null;
      const slots = withPlaying({ ...state.slots, [id]: slot }, playing);
      commit({ ...state, slots, playing });
    },

    setPlaying(p) {
      const playing = p && state.slots[p.slot].original && state.slots[p.slot].status !== "recording" ? { ...p } : null;
      commit({ ...state, playing, slots: withPlaying(state.slots, playing) });
    },

    setRevealed(revealed) {
      if (state.revealed === revealed) return;
      commit({ ...state, revealed });
    },

    addScore(kind, delta = 1) {
      const score = { ...state.score, [kind]: Math.max(0, state.score[kind] + delta) };
      saveScore(storage, key, score);
      commit({ ...state, score });
    },

    judge(v) {
      const before = state.verdict;
      if (before === v) return;
      const score = { ...state.score };
      if (before) score[before] = Math.max(0, score[before] - 1);
      score[v] += 1;
      saveScore(storage, key, score);
      commit({ ...state, score, verdict: v });
    },

    newRound() {
      if (!state.revealed && state.verdict === null) return;
      commit({ ...state, revealed: false, verdict: null });
    },

    reset() {
      commit({ ...state, slots: { A: emptySlot(), B: emptySlot() }, playing: null, revealed: false, verdict: null });
    },

    resetScore() {
      const score = zeroScore();
      saveScore(storage, key, score);
      commit({ ...state, score });
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}
