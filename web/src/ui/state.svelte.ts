// Wrapper reattivo (runes) attorno allo store puro di sessione.ts: e' l'unica istanza dell'app.
import { createStore, type KeyValueStorage, type State } from "./sessione";

function localStorageSicuro(): KeyValueStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // accesso bloccato (cookie disattivati, iframe sandbox)
  }
}

export const store = createStore({ storage: localStorageSicuro() });

class Sessione {
  /** Stato corrente: sostituito per intero a ogni modifica (lo store e' immutabile). */
  stato = $state.raw<State>(store.getState());

  constructor() {
    store.subscribe((s) => {
      this.stato = s;
    });
  }
}

export const sessione = new Sessione();
