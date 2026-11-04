<script lang="ts">
  // "Registra": pad neutro con il disco rosso (rosso = registra). Tap per avviare, tap per fermare.
  // Mentre registra il pad diventa rosso e mostra timer, VU-meter e la barra del tempo rimasto.
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
  class="pulsante registra"
  class:attivo={inRegistrazione}
  data-action="record"
  aria-pressed={inRegistrazione || inAvvio}
  aria-busy={inElaborazione || inAvvio ? "true" : undefined}
  disabled={disabilitato}
  style:--restante={restante}
  onclick={onPremi}
>
  <span class="disco">
    <Icona nome={inRegistrazione || inElaborazione ? "stop" : "registra"} misura={28} />
  </span>
  <span class="etichetta">
    <span>{t.registra}</span>
    {#if sotto}<span class="sotto">{sotto}</span>{/if}
  </span>
  <span class="timer" data-role="timer" hidden={!inRegistrazione && !inElaborazione}>
    {riempi(t.timer, { trascorso: secondi(trascorso / 1000), massimo: secondi(massimoMs / 1000) })}
  </span>
  <span class="vu-contenitore"><VuMeter {livello} attivo={inRegistrazione && !inElaborazione} /></span>
</button>

<style>
  /* Le unita' cq si riferiscono all'area dei pad (.azioni in Slot.svelte) */
  .registra {
    flex-direction: column;
    gap: min(8px, 2.5cqh);
    height: 100%;
    padding: var(--spazio-2);
    border-radius: var(--raggio-xl);
    background: var(--colore-contenitore-superficie-massimo);
    color: var(--colore-su-superficie);
    font: var(--testo-titolo-sezione);
    font-size: 1.25rem;
    line-height: 1.2;
  }
  .registra:not(:disabled):active {
    border-radius: var(--raggio-l);
  }
  .etichetta {
    text-align: center;
    justify-items: center;
  }
  .disco {
    flex: none;
    display: grid;
    place-items: center;
    width: max(40px, min(68px, 32cqh));
    height: max(40px, min(68px, 32cqh));
    border-radius: 50%;
    background: var(--colore-errore);
    color: var(--colore-su-errore);
  }
  .registra:disabled:not([aria-busy="true"]) {
    background: color-mix(in srgb, var(--colore-su-superficie) 10%, transparent);
    color: color-mix(in srgb, var(--colore-su-superficie) 45%, transparent);
  }
  .registra:disabled .disco {
    background: color-mix(in srgb, currentColor 16%, transparent);
    color: inherit;
  }
  .registra.attivo,
  .registra[aria-busy="true"] {
    background: var(--colore-errore);
    color: var(--colore-su-errore);
    box-shadow: none;
  }
  .registra.attivo .disco,
  .registra[aria-busy="true"] .disco {
    background: var(--colore-su-errore);
    color: var(--colore-errore);
  }
  .registra.attivo {
    animation: pulsa 1.4s ease-in-out infinite;
  }
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
    font: var(--testo-titolo);
    font-size: 1.0625rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .timer[hidden] {
    display: none;
  }
  .vu-contenitore {
    width: 80%;
    max-width: 160px;
    pointer-events: none;
  }
  .vu-contenitore:has(:global(.vu[hidden])) {
    display: none;
  }
  .vu-contenitore :global(.vu) {
    height: 8px;
    --colore-vu: currentColor;
  }
  @container (max-height: 175px) {
    .attivo .sotto {
      display: none;
    }
  }
  @keyframes pulsa {
    0%,
    100% {
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--colore-errore) 55%, transparent);
    }
    50% {
      box-shadow: 0 0 0 8px color-mix(in srgb, var(--colore-errore) 0%, transparent);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .registra.attivo {
      animation: none;
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--colore-errore) 40%, transparent);
    }
  }
</style>
