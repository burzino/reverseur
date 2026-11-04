<script lang="ts">
  // Esito della partita (visibile dopo "Rivela") e totale salvato in localStorage.
  import type { Score, Verdict } from "../sessione";
  import { riempi, t } from "../testi";

  interface Props {
    visibile: boolean;
    esito: Verdict | null;
    punteggio: Score;
    onEsito: (v: Verdict) => void;
  }
  let { visibile, esito, punteggio, onEsito }: Props = $props();

  const totale = $derived(punteggio.guessed + punteggio.missed);
</script>

<section id="score" class="punteggio" hidden={!visibile} aria-labelledby="titolo-esito">
  <h2 id="titolo-esito">{t.comeEAndata}</h2>
  <div class="scelte">
    <button
      type="button"
      class="pulsante tonale giusto"
      data-action="guessed"
      aria-pressed={esito === "guessed"}
      onclick={() => onEsito("guessed")}
    >
      {t.indovinata}
    </button>
    <button
      type="button"
      class="pulsante tonale sbagliato"
      data-action="missed"
      aria-pressed={esito === "missed"}
      onclick={() => onEsito("missed")}
    >
      {t.nonIndovinata}
    </button>
  </div>
</section>

{#if visibile || totale > 0}
  <p class="totale" aria-live="polite">
    <span class="solo-lettori">{t.punteggio}:</span>
    {riempi(t.punteggioRiga, { g: punteggio.guessed, m: punteggio.missed })}
  </p>
{/if}

<style>
  .punteggio {
    display: grid;
    gap: var(--spazio-3);
    padding: var(--spazio-4);
    border-radius: var(--raggio-xl);
    background: var(--colore-contenitore-superficie);
    animation: entra var(--molla-spaziale);
  }
  .punteggio[hidden] {
    display: none;
  }
  h2 {
    font: var(--testo-titolo);
  }
  .scelte {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: var(--spazio-3);
  }
  .giusto {
    --accento: var(--colore-primario);
    --su-accento: var(--colore-su-primario);
    --contenitore-accento: var(--colore-contenitore-primario);
    --su-contenitore-accento: var(--colore-su-contenitore-primario);
  }
  .sbagliato {
    --accento: var(--colore-errore);
    --su-accento: var(--colore-su-errore);
    --contenitore-accento: var(--colore-contenitore-errore);
    --su-contenitore-accento: var(--colore-su-contenitore-errore);
  }
  .totale {
    text-align: center;
    font: var(--testo-etichetta);
    color: var(--colore-su-superficie-variante);
    font-variant-numeric: tabular-nums;
  }
  @keyframes entra {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
</style>
