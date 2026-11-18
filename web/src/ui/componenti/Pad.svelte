<script lang="ts" module>
  /**
   * spento: non risponde (disabled). pronto: ha qualcosa da fare (LED acceso, bordo colorato).
   * prossimo: il passo suggerito dalla guida (bordo tratteggiato che pulsa). attivo: suona o e' scelto.
   * registra: sta registrando (rosso). sigillato: svela la soluzione, scuro con lucchetto, si riempie tenendo premuto.
   */
  export type StatoPad = "spento" | "pronto" | "prossimo" | "attivo" | "registra" | "sigillato";
</script>

<script lang="ts">
  // Un pad della plancia: quadrato grande con LED, lettera del giocatore, icona ed etichetta.
  // Il colore viene da --accento (riga del giocatore o pad della partita).
  import type { HoldOptions } from "../holdButton";
  import { hold as azioneHold } from "../holdButton";
  import { sbloccaAudio } from "../gioco.svelte";
  import Icona, { type NomeIcona } from "./Icona.svelte";

  interface Props {
    azione: string;
    stato: StatoPad;
    icona: NomeIcona;
    etichetta: string;
    /** Riga piccola sotto l'etichetta (durata, "Tieni premuto", timer). */
    sotto?: string;
    /** Lettera del giocatore nell'angolo. */
    lettera?: string;
    /** Contatore nell'angolo (es. ascolti). */
    badge?: string;
    ariaLabel: string;
    ariaPressed?: boolean;
    /** Aiuto per i lettori di schermo (es. "tieni premuto"). */
    aiuto?: string;
    /** 0..1: tempo di registrazione rimasto (barra in fondo). */
    restante?: number;
    /** Prossimo passo anche se lo stato e' un altro (il pad sigillato di Svela). */
    evidenzia?: boolean;
    onPremi?: () => void;
    /** Se presente, il pad e' un pulsante a pressione lunga: niente onclick. */
    hold?: HoldOptions;
  }
  let {
    azione,
    stato,
    icona,
    etichetta,
    sotto = "",
    lettera = "",
    badge = "",
    ariaLabel,
    ariaPressed,
    aiuto,
    restante,
    evidenzia = false,
    onPremi,
    hold,
  }: Props = $props();

  const idAiuto = $props.id();
  const nulla = (): void => {};
</script>

{#snippet contenuto()}
  <span class="led" aria-hidden="true"></span>
  {#if lettera}<span class="lettera" aria-hidden="true">{lettera}</span>{/if}
  {#if badge}<span class="badge" aria-hidden="true">{badge}</span>{/if}
  <span class="icona"><Icona nome={stato === "sigillato" ? "lucchetto" : icona} misura={34} /></span>
  <span class="testi">
    <span class="etichetta">{etichetta}</span>
    {#if sotto}<span class="sotto">{sotto}</span>{/if}
  </span>
  {#if restante !== undefined}<span class="restante" style:--restante={restante} aria-hidden="true"></span>{/if}
{/snippet}

{#if hold}
  <button
    type="button"
    class="pad"
    class:evidenzia
    data-stato={stato}
    data-action={azione}
    aria-label={ariaLabel}
    aria-pressed={ariaPressed}
    aria-describedby={aiuto ? idAiuto : undefined}
    disabled={stato === "spento"}
    use:sbloccaAudio
    use:azioneHold={hold}
  >
    {@render contenuto()}
  </button>
{:else}
  <button
    type="button"
    class="pad"
    class:evidenzia
    data-stato={stato}
    data-action={azione}
    aria-label={ariaLabel}
    aria-pressed={ariaPressed}
    aria-describedby={aiuto ? idAiuto : undefined}
    disabled={stato === "spento"}
    onclick={onPremi ?? nulla}
  >
    {@render contenuto()}
  </button>
{/if}
{#if aiuto}<span class="solo-lettori" id={idAiuto}>{aiuto}</span>{/if}

<style>
  .pad {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    min-width: 0;
    width: 100%;
    height: 100%;
    padding: 10px 10px 9px;
    border: 2px solid var(--colore-contorno-variante);
    border-radius: 20px;
    background: var(--colore-contenitore-superficie-minimo);
    color: var(--colore-su-superficie);
    text-align: left;
    overflow: hidden;
    isolation: isolate;
    cursor: pointer;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
    box-shadow: 0 3px 0 color-mix(in srgb, var(--colore-su-superficie) 14%, transparent);
    transition:
      transform 60ms ease-out,
      box-shadow 60ms ease-out,
      background-color var(--molla-effetti),
      border-color var(--molla-effetti),
      color var(--molla-effetti);
  }
  /* Tasto di gomma: si abbassa di 3 px */
  .pad:not(:disabled):active,
  .pad:global(.is-holding) {
    transform: translateY(3px);
    box-shadow: 0 0 0 transparent;
  }
  .pad:focus-visible {
    outline: 3px solid var(--colore-su-sfondo);
    outline-offset: 2px;
  }

  .led {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--colore-su-superficie) 22%, transparent);
  }
  .lettera,
  .badge {
    position: absolute;
    top: 6px;
    right: 9px;
    font: var(--testo-etichetta);
    font-weight: 800;
    color: var(--colore-su-superficie-variante);
  }
  .badge {
    right: auto;
    left: 24px;
    top: 5px;
    padding: 0 6px;
    border-radius: var(--raggio-pieno);
    background: var(--colore-su-superficie);
    color: var(--colore-superficie);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
  }
  .icona {
    align-self: center;
    display: grid;
    place-items: center;
    color: var(--accento);
  }
  .icona :global(svg) {
    width: min(34px, 30cqw);
    height: min(34px, 30cqw);
  }
  .testi {
    display: grid;
    min-width: 0;
    width: 100%;
  }
  .etichetta {
    font: var(--testo-titolo);
    font-size: clamp(0.8125rem, 3.6vw, 0.9375rem);
    font-weight: 800;
    line-height: 1.15;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sotto {
    font: var(--testo-didascalia);
    font-size: 0.75rem;
    line-height: 1.2;
    opacity: 0.8;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* pronto: ha audio o e' utilizzabile */
  .pad[data-stato="pronto"],
  .pad[data-stato="prossimo"] {
    border-color: color-mix(in srgb, var(--accento) 70%, transparent);
  }
  .pad[data-stato="pronto"] .led,
  .pad[data-stato="prossimo"] .led {
    background: var(--accento);
    box-shadow: 0 0 6px var(--accento);
  }
  /* prossimo: bordo tratteggiato che pulsa */
  .pad[data-stato="prossimo"] {
    border-style: dashed;
    border-color: var(--accento);
    background: color-mix(in srgb, var(--accento) 8%, var(--colore-contenitore-superficie-minimo));
    animation: pulsa-prossimo 1.2s ease-in-out infinite;
  }
  .pad.evidenzia {
    outline: 3px dashed var(--accento);
    outline-offset: 3px;
    animation: pulsa-contorno 1.2s ease-in-out infinite;
  }
  /* attivo: suona o e' la scelta fatta */
  .pad[data-stato="attivo"] {
    border-color: var(--accento);
    background: var(--accento);
    color: var(--su-accento);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accento) 30%, transparent);
  }
  .pad[data-stato="attivo"] .icona {
    color: inherit;
  }
  .pad[data-stato="attivo"] .led {
    background: var(--su-accento);
  }
  /* registra */
  .pad[data-stato="registra"] {
    border-color: var(--colore-errore);
    background: var(--colore-errore);
    color: var(--colore-su-errore);
    animation: pulsa-rec 1.4s ease-in-out infinite;
  }
  .pad[data-stato="registra"] .icona,
  .pad[data-stato="registra"] .lettera {
    color: inherit;
  }
  .pad[data-stato="registra"] .led {
    background: var(--colore-su-errore);
    animation: lampeggia 1s steps(2, jump-none) infinite;
  }
  .restante {
    position: absolute;
    inset: auto 0 0 0;
    height: 5px;
    background: currentColor;
    opacity: 0.6;
    transform-origin: left center;
    transform: scaleX(var(--restante, 1));
    transition: transform 100ms linear;
  }
  /* sigillato: lo spoiler. Scuro, lucchetto; tenendo premuto si riempie dal basso col colore di A. */
  .pad[data-stato="sigillato"] {
    border-color: var(--colore-su-superficie);
    background:
      linear-gradient(to top, var(--accento) calc(var(--hold-progress, 0) * 100%), transparent 0) no-repeat,
      var(--colore-su-superficie);
    color: var(--colore-superficie);
  }
  .pad[data-stato="sigillato"] .icona,
  .pad[data-stato="sigillato"] .lettera {
    color: inherit;
  }
  .pad[data-stato="sigillato"] .led {
    background: var(--accento);
    box-shadow: 0 0 6px var(--accento);
  }
  .pad:global(.is-shake) {
    animation: scuoti 400ms cubic-bezier(0.36, 0.07, 0.19, 0.97);
  }
  /* spento */
  .pad:disabled {
    cursor: not-allowed;
    border-color: transparent;
    background: color-mix(in srgb, var(--colore-su-superficie) 6%, transparent);
    color: color-mix(in srgb, var(--colore-su-superficie) 42%, transparent);
    box-shadow: none;
  }
  .pad:disabled .icona {
    color: inherit;
    opacity: 0.6;
  }

  @keyframes pulsa-prossimo {
    50% {
      border-color: color-mix(in srgb, var(--accento) 35%, transparent);
    }
  }
  @keyframes pulsa-contorno {
    50% {
      outline-color: color-mix(in srgb, var(--accento) 30%, transparent);
    }
  }
  @keyframes pulsa-rec {
    50% {
      box-shadow: 0 0 0 6px color-mix(in srgb, var(--colore-errore) 30%, transparent);
    }
  }
  @keyframes lampeggia {
    50% {
      opacity: 0.25;
    }
  }
  @keyframes scuoti {
    20%,
    80% {
      transform: translateX(4px);
    }
    40%,
    60% {
      transform: translateX(-5px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pad[data-stato="prossimo"],
    .pad.evidenzia,
    .pad[data-stato="registra"],
    .pad[data-stato="registra"] .led {
      animation: none;
    }
    .pad:global(.is-shake) {
      animation: none;
      outline: 3px solid var(--colore-errore);
      outline-offset: 2px;
    }
    .pad:not(:disabled):active,
    .pad:global(.is-holding) {
      transform: none;
    }
  }
</style>
