<script lang="ts">
  // Scheda di ascolto a tutta larghezza: icona tonda, titolo, durata. Tap per suonare, tap per fermare.
  // Il colore viene da --accento (giocatore della schermata o della scheda).
  import { secondi, t } from "../testi";
  import Icona from "./Icona.svelte";

  interface Props {
    titolo: string;
    /** data-action per gli E2E. */
    azione: string;
    icona: "contrario" | "play";
    suona: boolean;
    disabilitato: boolean;
    /** Secondi di audio; 0 = nessuna registrazione. */
    durata: number;
    /** Testo al posto della durata quando non c'e' audio. */
    vuoto?: string;
    /** Contatore a destra (es. "3×"). */
    badge?: string;
    onPremi: () => void;
  }
  let { titolo, azione, icona, suona, disabilitato, durata, vuoto = "", badge = "", onPremi }: Props = $props();

  const sotto = $derived(suona ? t.toccaPerFermare : durata > 0 ? secondi(durata) : vuoto);
</script>

<button
  type="button"
  class="ascolto"
  data-action={azione}
  aria-pressed={suona}
  disabled={disabilitato}
  onclick={onPremi}
>
  <span class="tondo"><Icona nome={suona ? "stop" : icona} misura={26} /></span>
  <span class="testi">
    <span class="titolo">{titolo}</span>
    {#if sotto}<span class="sotto">{sotto}</span>{/if}
  </span>
  {#if badge}<span class="badge">{badge}</span>{/if}
</button>

<style>
  .ascolto {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--spazio-3);
    width: 100%;
    min-height: 72px;
    padding: var(--spazio-2) var(--spazio-4) var(--spazio-2) var(--spazio-2);
    border: 1px solid var(--colore-bordo-livello);
    border-radius: var(--raggio-xl);
    background: var(--contenitore-accento);
    color: var(--su-contenitore-accento);
    text-align: left;
    cursor: pointer;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition:
      border-radius var(--durata-veloce) ease-out,
      transform var(--durata-veloce) ease-out,
      background-color var(--molla-effetti),
      color var(--molla-effetti),
      box-shadow var(--molla-effetti);
  }
  .ascolto:not(:disabled):active {
    border-radius: var(--raggio-l);
    transform: scale(0.98);
  }
  .ascolto[aria-pressed="true"] {
    background: var(--accento);
    color: var(--su-accento);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accento) 35%, transparent);
  }
  .ascolto:disabled {
    cursor: not-allowed;
    background: color-mix(in srgb, var(--colore-su-superficie) 8%, transparent);
    color: color-mix(in srgb, var(--colore-su-superficie) 55%, transparent);
  }
  .ascolto:focus-visible {
    outline: 3px solid var(--colore-su-sfondo);
    outline-offset: 3px;
  }
  .tondo {
    flex: none;
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--accento);
    color: var(--su-accento);
  }
  [aria-pressed="true"] .tondo {
    background: var(--su-accento);
    color: var(--accento);
  }
  .ascolto:disabled .tondo {
    background: color-mix(in srgb, currentColor 14%, transparent);
    color: inherit;
  }
  .testi {
    flex: 1;
    display: grid;
    min-width: 0;
  }
  .titolo {
    font: var(--testo-titolo);
    font-size: 1.0625rem;
    line-height: 1.25;
  }
  .sotto {
    font: var(--testo-didascalia);
    font-variant-numeric: tabular-nums;
    opacity: 0.85;
  }
  .badge {
    flex: none;
    padding: 2px 10px;
    border-radius: var(--raggio-pieno);
    background: color-mix(in srgb, currentColor 14%, transparent);
    font: var(--testo-etichetta);
    font-variant-numeric: tabular-nums;
  }
</style>
