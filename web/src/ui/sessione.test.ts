import { describe, expect, it, vi } from "vitest";
import { createStore, loadScore, SCORE_KEY, type KeyValueStorage } from "./sessione";

function fakeStorage(init: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...init };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

// In Node non esiste AudioBuffer: per lo store basta un oggetto opaco.
const buf = { duration: 1.2 } as unknown as AudioBuffer;
const ready = { status: "ready" as const, original: buf, reversed: buf, duration: 1.2 };

describe("createStore", () => {
  it("parte con due slot vuoti, niente in riproduzione, non rivelato", () => {
    const s = createStore({ storage: fakeStorage() }).getState();
    expect(s.slots.A.status).toBe("empty");
    expect(s.slots.B.status).toBe("empty");
    expect(s.playing).toBeNull();
    expect(s.revealed).toBe(false);
    expect(s.score).toEqual({ guessed: 0, missed: 0 });
    expect(s.verdict).toBeNull();
  });

  it("setSlot unisce la patch e notifica stato e precedente", () => {
    const store = createStore();
    const fn = vi.fn();
    store.subscribe(fn);
    store.setSlot("A", { status: "recording" });
    expect(store.getState().slots.A.status).toBe("recording");
    expect(fn).toHaveBeenCalledTimes(1);
    const [now, prev] = fn.mock.calls[0];
    expect(now.slots.A.status).toBe("recording");
    expect(prev.slots.A.status).toBe("empty");
  });

  it("lo stato e' immutabile: il precedente non cambia", () => {
    const store = createStore();
    const before = store.getState();
    store.setSlot("B", ready);
    expect(before.slots.B.status).toBe("empty");
    expect(store.getState()).not.toBe(before);
  });

  it("setPlaying mette lo slot in 'playing' e lo riporta a 'ready' alla fine", () => {
    const store = createStore();
    store.setSlot("A", ready);
    store.setSlot("B", ready);
    store.setPlaying({ slot: "A", mode: "reversed" });
    expect(store.getState().slots.A.status).toBe("playing");
    expect(store.getState().slots.B.status).toBe("ready");
    store.setPlaying({ slot: "B", mode: "original" });
    expect(store.getState().slots.A.status).toBe("ready");
    expect(store.getState().slots.B.status).toBe("playing");
    store.setPlaying(null);
    expect(store.getState().slots.B.status).toBe("ready");
    expect(store.getState().playing).toBeNull();
  });

  it("setPlaying ignora uno slot senza audio", () => {
    const store = createStore();
    store.setPlaying({ slot: "A", mode: "original" });
    expect(store.getState().playing).toBeNull();
    expect(store.getState().slots.A.status).toBe("empty");
  });

  it("registrare sullo slot che suona interrompe la riproduzione nello stato", () => {
    const store = createStore();
    store.setSlot("A", ready);
    store.setPlaying({ slot: "A", mode: "original" });
    store.setSlot("A", { status: "recording" });
    expect(store.getState().playing).toBeNull();
    expect(store.getState().slots.A.status).toBe("recording");
  });

  it("uno slot in registrazione resta tale anche se l'altro suona", () => {
    const store = createStore();
    store.setSlot("A", ready);
    store.setSlot("B", { status: "recording" });
    store.setPlaying({ slot: "A", mode: "reversed" });
    expect(store.getState().slots.B.status).toBe("recording");
  });

  it("setRevealed non notifica se il valore non cambia", () => {
    const store = createStore();
    const fn = vi.fn();
    store.subscribe(fn);
    store.setRevealed(false);
    expect(fn).not.toHaveBeenCalled();
    store.setRevealed(true);
    expect(store.getState().revealed).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("reset azzera slot, riproduzione, rivelazione ed esito ma tiene il punteggio", () => {
    const storage = fakeStorage();
    const store = createStore({ storage });
    store.setSlot("A", ready);
    store.setPlaying({ slot: "A", mode: "reversed" });
    store.setRevealed(true);
    store.judge("guessed");
    store.reset();
    const s = store.getState();
    expect(s.slots.A.status).toBe("empty");
    expect(s.slots.A.original).toBeNull();
    expect(s.playing).toBeNull();
    expect(s.revealed).toBe(false);
    expect(s.verdict).toBeNull();
    expect(s.score).toEqual({ guessed: 1, missed: 0 });
  });

  it("newRound toglie rivelazione ed esito ma tiene slot e punteggio", () => {
    const storage = fakeStorage();
    const store = createStore({ storage });
    store.setSlot("A", ready);
    store.setSlot("B", ready);
    store.setRevealed(true);
    store.judge("guessed");
    store.newRound();
    const s = store.getState();
    expect(s.revealed).toBe(false);
    expect(s.verdict).toBeNull();
    expect(s.slots.A.status).toBe("ready");
    expect(s.slots.B.original).toBe(buf);
    expect(s.score).toEqual({ guessed: 1, missed: 0 });
    // Il giro nuovo si giudica da capo: il punto precedente resta, uno nuovo si aggiunge.
    store.judge("missed");
    expect(store.getState().score).toEqual({ guessed: 1, missed: 1 });
  });

  it("newRound non notifica se non c'e' niente da azzerare", () => {
    const store = createStore();
    const fn = vi.fn();
    store.subscribe(fn);
    store.newRound();
    expect(fn).not.toHaveBeenCalled();
  });

  it("unsubscribe smette di notificare", () => {
    const store = createStore();
    const fn = vi.fn();
    const off = store.subscribe(fn);
    off();
    store.setRevealed(true);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("punteggio", () => {
  it("addScore salva in localStorage sotto la chiave reverseur.punteggio", () => {
    const storage = fakeStorage();
    const store = createStore({ storage });
    store.addScore("guessed");
    store.addScore("missed");
    store.addScore("guessed");
    expect(store.getState().score).toEqual({ guessed: 2, missed: 1 });
    expect(JSON.parse(storage.data[SCORE_KEY])).toEqual({ guessed: 2, missed: 1 });
  });

  it("legge il punteggio salvato alla creazione", () => {
    const storage = fakeStorage({ [SCORE_KEY]: JSON.stringify({ guessed: 4, missed: 2 }) });
    expect(createStore({ storage }).getState().score).toEqual({ guessed: 4, missed: 2 });
  });

  it("judge conta una sola volta per partita e cambiare idea sposta il punto", () => {
    const store = createStore({ storage: fakeStorage() });
    store.judge("guessed");
    store.judge("guessed");
    expect(store.getState().score).toEqual({ guessed: 1, missed: 0 });
    store.judge("missed");
    expect(store.getState().score).toEqual({ guessed: 0, missed: 1 });
    expect(store.getState().verdict).toBe("missed");
  });

  it("resetScore azzera e salva", () => {
    const storage = fakeStorage({ [SCORE_KEY]: JSON.stringify({ guessed: 3, missed: 3 }) });
    const store = createStore({ storage });
    store.resetScore();
    expect(store.getState().score).toEqual({ guessed: 0, missed: 0 });
    expect(JSON.parse(storage.data[SCORE_KEY])).toEqual({ guessed: 0, missed: 0 });
  });

  it("valori salvati corrotti o storage che lancia danno 0 a 0 senza errori", () => {
    expect(loadScore(fakeStorage({ [SCORE_KEY]: "{non json" }))).toEqual({ guessed: 0, missed: 0 });
    expect(loadScore(fakeStorage({ [SCORE_KEY]: JSON.stringify({ guessed: -3, missed: "x" }) }))).toEqual({
      guessed: 0,
      missed: 0,
    });
    const throwing: KeyValueStorage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceeded");
      },
    };
    const store = createStore({ storage: throwing });
    expect(store.getState().score).toEqual({ guessed: 0, missed: 0 });
    expect(() => store.addScore("guessed")).not.toThrow();
    expect(store.getState().score.guessed).toBe(1);
  });

  it("senza storage funziona solo in memoria", () => {
    const store = createStore({ storage: null });
    store.addScore("missed");
    expect(store.getState().score).toEqual({ guessed: 0, missed: 1 });
  });
});
