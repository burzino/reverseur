// Guida della plancia: dallo stato del round ricava il prossimo pad da premere (bordo che pulsa)
// e il messaggio del display. Logica pura, testata in guida.test.ts.
import type { State } from "./sessione";
import { t } from "./testi";

/** I nove pad: righe A, B e partita; colonne registra, al contrario, originale. */
export type Pad =
  | "registraA"
  | "contrarioA"
  | "originaleA"
  | "registraB"
  | "contrarioB"
  | "originaleB"
  | "presa"
  | "mancata"
  | "nuovoRound";

export interface Guida {
  /** Pad da evidenziare come prossimo passo. */
  prossimi: Pad[];
  titolo: string;
  sotto: string;
}

/**
 * `ascoltiA`: quante volte la parola di A al contrario e' stata ascoltata in questo round.
 * Il primo ascolto e' il segnale che il telefono e' passato a B.
 */
export function guida(s: State, ascoltiA: number): Guida {
  const { A, B } = s.slots;
  if (!A.original) return { prossimi: ["registraA"], titolo: t.guidaRegistraA, sotto: t.guidaRegistraASotto };
  if (!B.original && ascoltiA === 0)
    return { prossimi: ["contrarioA"], titolo: t.guidaPassaB, sotto: t.guidaPassaBSotto };
  if (!B.original) return { prossimi: ["registraB"], titolo: t.guidaImita, sotto: t.guidaImitaSotto };
  if (!s.revealed) return { prossimi: ["originaleA"], titolo: t.guidaIndovina, sotto: t.guidaIndovinaSotto };
  if (s.verdict === null) return { prossimi: ["presa", "mancata"], titolo: t.guidaEsito, sotto: t.guidaEsitoSotto };
  return {
    prossimi: ["nuovoRound"],
    titolo: s.verdict === "guessed" ? t.guidaPresa : t.guidaMancata,
    sotto: t.guidaProssimo,
  };
}

/**
 * Il pad "Originale" di A svela la soluzione solo quando B ha gia' provato a imitare.
 * Prima e' l'ascolto di controllo di A (sempre con pressione lunga, contro i tocchi per sbaglio).
 */
export function originaleASvela(s: State): boolean {
  return s.slots.B.original !== null && !s.revealed;
}
