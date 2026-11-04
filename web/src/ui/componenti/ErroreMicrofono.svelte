<script lang="ts">
  // #mic-error: sempre nel DOM (hidden quando non serve), role=alert, istruzioni per riattivare il microfono.
  import type { ErroreMicrofono } from "../gioco.svelte";
  import { t } from "../testi";
  import Icona from "./Icona.svelte";

  interface Props {
    codice: ErroreMicrofono | null;
    onChiudi: () => void;
  }
  let { codice, onChiudi }: Props = $props();

  const titolo = $derived.by(() => {
    switch (codice) {
      case "denied":
        return t.erroreNegatoTitolo;
      case "notfound":
        return t.erroreNonTrovatoTitolo;
      case "unsupported":
        return t.erroreNonSupportatoTitolo;
      case "busy":
        return t.erroreOccupatoTitolo;
      default:
        return t.erroreSconosciutoTitolo;
    }
  });
</script>

<div id="mic-error" class="errore" role="alert" hidden={codice === null} data-code={codice ?? undefined}>
  {#if codice}
    <div class="testa">
      <Icona nome="microfono" />
      <h2>{titolo}</h2>
    </div>
    {#if codice === "denied"}
      <p>{t.erroreNegatoIntro}</p>
      <ul>
        <li>{t.erroreNegatoChrome}</li>
        <li>{t.erroreNegatoSafari}</li>
      </ul>
      <p>{t.erroreNegatoFine}</p>
    {:else if codice === "notfound"}
      <p>{t.erroreNonTrovato}</p>
    {:else if codice === "unsupported"}
      <p>{t.erroreNonSupportato}</p>
    {:else if codice === "busy"}
      <p>{t.erroreOccupato}</p>
    {:else}
      <p>{t.erroreSconosciuto}</p>
    {/if}
    <button type="button" class="chiudi" onclick={onChiudi}>{t.hoCapito}</button>
  {/if}
</div>

<style>
  /* Sovrapposto sotto l'intestazione: non spinge il layout della schermata unica */
  .errore {
    position: fixed;
    z-index: 20;
    top: calc(env(safe-area-inset-top) + 72px);
    left: 0;
    right: 0;
    width: min(100% - 2 * var(--margine-schermata), 560px);
    max-height: calc(100dvh - env(safe-area-inset-top) - 88px);
    overflow-y: auto;
    margin: 0 auto;
    display: grid;
    gap: var(--spazio-3);
    padding: var(--spazio-4);
    border-radius: var(--raggio-xl);
    background: var(--colore-contenitore-errore);
    color: var(--colore-su-contenitore-errore);
    box-shadow: 0 12px 40px rgb(0 0 0 / 0.3);
    animation: entra var(--molla-spaziale);
  }
  @keyframes entra {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
  }
  .errore[hidden] {
    display: none;
  }
  .testa {
    display: flex;
    align-items: center;
    gap: var(--spazio-2);
  }
  h2 {
    font: var(--testo-titolo-sezione);
    font-size: 1.125rem;
  }
  ul {
    display: grid;
    gap: var(--spazio-2);
    margin: 0;
    padding-left: 1.25rem;
  }
  .chiudi {
    justify-self: start;
    min-height: var(--altezza-pulsante);
    padding: var(--spazio-2) var(--spazio-5);
    border: 1px solid currentColor;
    border-radius: var(--raggio-pieno);
    background: transparent;
    font: var(--testo-titolo);
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    touch-action: manipulation;
  }
</style>
