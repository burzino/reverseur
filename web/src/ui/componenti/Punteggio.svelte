<script lang="ts">
  // Esito della partita: visibile dopo "Rivela", nella barra in fondo accanto a Rivela (stessa altezza).
  // Il totale salvato sta nell'intestazione (App.svelte).
  import type { Verdict } from "../sessione";
  import { t } from "../testi";

  interface Props {
    visibile: boolean;
    esito: Verdict | null;
    onEsito: (v: Verdict) => void;
  }
  let { visibile, esito, onEsito }: Props = $props();
</script>

<section id="score" class="punteggio" hidden={!visibile} aria-labelledby="titolo-esito">
  <h2 id="titolo-esito" class="solo-lettori">{t.comeEAndata}</h2>
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

<style>
  .punteggio {
    flex: 1;
    min-width: 0;
    animation: entra var(--molla-spaziale);
  }
  .punteggio[hidden] {
    display: none;
  }
  .scelte {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spazio-2);
    height: 100%;
  }
  .scelte .pulsante {
    height: 100%;
    padding-inline: var(--spazio-3);
    font: var(--testo-titolo);
    line-height: 1.2;
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
  @keyframes entra {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
</style>
