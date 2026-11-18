import { describe, expect, it } from "vitest";
import { guida, originaleASvela } from "./guida";
import { createStore } from "./sessione";

const buf = { duration: 1 } as unknown as AudioBuffer;
const ready = { status: "ready" as const, original: buf, reversed: buf, duration: 1 };

describe("guida", () => {
  it("accompagna il round un pad alla volta", () => {
    const store = createStore();
    const passo = (ascolti = 0) => guida(store.getState(), ascolti).prossimi;
    expect(passo()).toEqual(["registraA"]);
    store.setSlot("A", ready);
    expect(passo()).toEqual(["contrarioA"]);
    expect(passo(1)).toEqual(["registraB"]);
    store.setSlot("B", ready);
    expect(passo(1)).toEqual(["originaleA"]);
    store.setRevealed(true);
    expect(passo(1)).toEqual(["presa", "mancata"]);
    store.judge("guessed");
    expect(passo(1)).toEqual(["nuovoRound"]);
  });

  it("l'originale di A svela solo dopo che B ha imitato e prima della rivelazione", () => {
    const store = createStore();
    store.setSlot("A", ready);
    expect(originaleASvela(store.getState())).toBe(false);
    store.setSlot("B", ready);
    expect(originaleASvela(store.getState())).toBe(true);
    store.setRevealed(true);
    expect(originaleASvela(store.getState())).toBe(false);
  });
});
