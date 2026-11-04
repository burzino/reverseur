<script lang="ts">
  // "Registra": tap per avviare, tap per fermare. Mentre registra pulsa e mostra il timer.
  import { riempi, secondi, t } from "../testi";
  import Icona from "./Icona.svelte";
  import VuMeter from "./VuMeter.svelte";

  interface Props {
    inRegistrazione: boolean;
    inAvvio: boolean;
    inElaborazione: boolean;
    disabilitato: boolean;
    /** ms trascorsi */
    trascorso: number;
    /** Livello del microfono 0..1 (VU-meter dentro il pulsante). */
    livello: number;
    massimoMs: number;
    onPremi: () => void;
  }
  let { inRegistrazione, inAvvio, inElaborazione, disabilitato, trascorso, livello, massimoMs, onPremi }: Props =
    $props();

  const sotto = $derived(
    inElaborazione ? t.elaboro : inAvvio ? t.attendoMicrofono : inRegistrazione ? t.toccaPerFermare : "",
  );
  const restante = $derived(Math.max(0, 1 - trascorso / massimoMs));
</script>

<button
  type="button"
  class="pulsante pieno grande registra"
  class:attivo={inRegistrazione}
  data-action="record"
  aria-pressed={inRegistrazione || inAvvio}
  aria-busy={inElaborazione || inAvvio ? "true" : undefined}
  disabled={disabilitato}
  style:--restante={restante}
  onclick={onPremi}
>
  <span class="icona" class:quadrato={inRegistrazione}>
    <Icona nome={inRegistrazione || inElaborazione ? "stop" : "registra"} />
  </span>
  <span class="etichetta">
    <span>{t.registra}</span>
    {#if sotto}<span class="sotto">{sotto}</span>{/if}
  </span>
  <span class="timer" data-role="timer" hidden={!inRegistrazione && !inElaborazione}>
    {riempi(t.timer, { trascorso: secondi(trascorso / 1000), massimo: secondi(massimoMs / 1000) })}
  </span>
  <!-- VU-meter sovrapposto in fondo al pulsante: nessuna riga in piu' mentre si registra -->
  <span class="vu-contenitore"><VuMeter {livello} attivo={inRegistrazione && !inElaborazione} /></span>
</button>

<style>
  .registra {
    justify-content: flex-start;
    height: 100%;
    padding-left: var(--spazio-3);
    /* alto fino a 160 px: una pillola piena diventerebbe una capsula */
    border-radius: var(--raggio-xxl);
  }
  .vu-contenitore {
    position: absolute;
    left: calc(var(--spazio-3) + 3rem + var(--spazio-3));
    right: var(--spazio-6);
    bottom: clamp(10px, 1.6dvh, 18px);
    pointer-events: none;
  }
  .vu-contenitore :global(.vu) {
    height: 8px;
    --colore-vu: currentColor;
  }
  .icona {
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    background: var(--su-accento);
    color: var(--colore-errore);
  }
  .registra:disabled .icona {
    background: color-mix(in srgb, currentColor 16%, transparent);
    color: inherit;
  }
  .registra.attivo,
  .registra[aria-busy="true"] {
    background: var(--colore-errore);
    color: var(--colore-su-errore);
    box-shadow: none;
  }
  .registra.attivo .icona {
    background: var(--colore-su-errore);
    color: var(--colore-errore);
  }
  .registra.attivo {
    animation: pulsa 1.4s ease-in-out infinite;
  }
  /* barra del tempo rimasto (10 s) lungo il fondo */
  .registra.attivo::after {
    content: "";
    position: absolute;
    inset: auto 0 0 0;
    height: 5px;
    background: currentColor;
    opacity: 0.6;
    transform-origin: left center;
    transform: scaleX(var(--restante, 1));
    transition: transform 100ms linear;
  }
  .timer {
    margin-left: auto;
    padding-left: var(--spazio-2);
    font: var(--testo-titolo);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .timer[hidden] {
    display: none;
  }
  @keyframes pulsa {
    0%,
    100% {
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--colore-errore) 55%, transparent);
    }
    50% {
      box-shadow: 0 0 0 10px color-mix(in srgb, var(--colore-errore) 0%, transparent);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .registra.attivo {
      animation: none;
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--colore-errore) 40%, transparent);
    }
  }
</style>
