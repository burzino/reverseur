<script lang="ts">
  // Uno slot (A = parola, B = imitazione): Registra e Al contrario sono due pad affiancati di pari peso;
  // "Originale" e' una pillola compatta nella riga del titolo, accanto a Scarica (mockup 06).
  // In A "Originale" svela la soluzione: pressione lunga (use:hold) finche' non si e' rivelato.
  // Conferma e avvisi si sovrappongono, non spingono.
  import { sbloccaAudio } from "../gioco.svelte";
  import { hold } from "../holdButton";
  import type { Playing, PlayMode, SlotId, SlotState } from "../sessione";
  import { secondi, t } from "../testi";
  import ConfermaInline from "./ConfermaInline.svelte";
  import Icona from "./Icona.svelte";
  import PulsanteRegistra from "./PulsanteRegistra.svelte";

  interface StatoRegistrazione {
    trascorso: number;
    livello: number;
    avvio: boolean;
    elaborazione: boolean;
  }

  interface Props {
    id: SlotId;
    slot: SlotState;
    playing: Playing | null;
    revealed: boolean;
    /** Registrazione in corso su questo slot, se c'e'. */
    registrazione: StatoRegistrazione | null;
    /** L'altro slot sta registrando: qui non si registra e non si ascolta. */
    altroOccupato: boolean;
    confermaAperta: boolean;
    /** Testo dell'avviso di registrazione di questo slot, se c'e'. */
    errore: string | null;
    suggerimento: boolean;
    massimoMs: number;
    onRegistra: () => void;
    onConfermaRiregistra: () => void;
    onAnnullaRiregistra: () => void;
    onAscolta: (mode: PlayMode) => void;
    onScarica: () => void;
    onPressioneAnnullata: (motivo: string) => void;
  }
  let {
    id,
    slot,
    playing,
    revealed,
    registrazione,
    altroOccupato,
    confermaAperta,
    errore,
    suggerimento,
    massimoMs,
    onRegistra,
    onConfermaRiregistra,
    onAnnullaRiregistra,
    onAscolta,
    onScarica,
    onPressioneAnnullata,
  }: Props = $props();

  const idAiuto = $props.id();
  let sezione: HTMLElement | undefined = $state();
  const eA = $derived(id === "A");
  const titolo = $derived(eA ? t.titoloSlotA : t.titoloSlotB);
  const giocatore = $derived(eA ? t.giocatoreA : t.giocatoreB);
  const inRegistrazione = $derived(slot.status === "recording");
  const occupato = $derived(registrazione !== null || altroOccupato);
  const haAudio = $derived(slot.original !== null && !inRegistrazione);
  const suonaContrario = $derived(playing?.slot === id && playing.mode === "reversed");
  const suonaOriginale = $derived(playing?.slot === id && playing.mode === "original");
  /** In A l'originale chiede la pressione lunga finche' non e' stato rivelato. */
  const protetto = $derived(eA && !revealed);

  const stato = $derived.by(() => {
    if (registrazione?.elaborazione) return t.elaboro;
    switch (slot.status) {
      case "recording":
        return t.statoRegistrazione;
      case "playing":
        return t.statoRiproduzione;
      case "ready":
        return t.statoPronto;
      default:
        return t.statoVuoto;
    }
  });
</script>

<section
  class="slot"
  class:slot-b={!eA}
  id="slot-{id}"
  data-slot={id}
  data-state={slot.status}
  aria-labelledby="titolo-{id}"
  bind:this={sezione}
>
  <header class="testa">
    <span class="lettera" aria-hidden="true">{id}</span>
    <div class="titoli">
      <h2 id="titolo-{id}">
        <span class="solo-lettori">{giocatore} · </span>{titolo}
      </h2>
      <p class="stato" data-role="status" aria-live="polite">
        <span class="punto" aria-hidden="true"></span>{stato}
      </p>
    </div>

    {#snippet contenutoPillola()}
      <span class="pelle">
        <Icona nome={suonaOriginale ? "stop" : "play"} misura={18} />
        <span>{t.originaleBreve}</span>
        {#if protetto && !suonaOriginale}<Icona nome="lucchetto" misura={14} />{/if}
      </span>
    {/snippet}

    <div class="contenitore-trattieni pillola-box">
      {#if eA}
        <p class="suggerimento sotto" class:visibile={suggerimento} data-role="hold-hint" aria-live="polite">
          {suggerimento ? t.tieniPremuto : ""}
        </p>
        <button
          type="button"
          class="pillola"
          class:protetta={protetto}
          data-action="play-original"
          aria-label={t.ascoltaOriginale}
          aria-pressed={suonaOriginale}
          aria-describedby={protetto ? idAiuto : undefined}
          title={suonaOriginale ? t.toccaPerFermare : protetto ? t.tieniPremuto : undefined}
          disabled={!haAudio || occupato}
          use:sbloccaAudio
          use:hold={{
            onConfirm: () => onAscolta("original"),
            onCancel: ({ reason }) => onPressioneAnnullata(reason),
            bypass: () => revealed || (playing?.slot === "A" && playing.mode === "original"),
          }}
        >
          {@render contenutoPillola()}
        </button>
        <span class="solo-lettori" id={idAiuto}>{t.tieniPremutoAiuto}</span>
      {:else}
        <button
          type="button"
          class="pillola"
          data-action="play-original"
          aria-label={t.ascoltaOriginale}
          aria-pressed={suonaOriginale}
          title={suonaOriginale ? t.toccaPerFermare : undefined}
          disabled={!haAudio || occupato}
          onclick={() => onAscolta("original")}
        >
          {@render contenutoPillola()}
        </button>
      {/if}
    </div>

    <button
      type="button"
      class="scarica"
      data-action="download"
      aria-label={t.scaricaWav}
      disabled={!haAudio || occupato || protetto}
      title={haAudio && protetto ? t.scaricaDopoRivela : t.scaricaWav}
      onclick={onScarica}
    >
      <Icona nome="scarica" misura={22} />
    </button>
    {#if errore}
      <!-- Avviso sovrapposto alla riga del titolo: non sposta i pulsanti -->
      <p class="errore" role="alert">{errore}</p>
    {/if}
  </header>

  <div class="azioni">
    <PulsanteRegistra
      {inRegistrazione}
      inAvvio={registrazione?.avvio ?? false}
      inElaborazione={registrazione?.elaborazione ?? false}
      disabilitato={altroOccupato || (registrazione?.avvio ?? false) || (registrazione?.elaborazione ?? false)}
      trascorso={registrazione?.trascorso ?? 0}
      livello={registrazione?.livello ?? 0}
      {massimoMs}
      onPremi={onRegistra}
    />

    <button
      type="button"
      class="pulsante pad contrario"
      data-action="play-reversed"
      aria-label={t.ascoltaContrario}
      aria-pressed={suonaContrario}
      disabled={!haAudio || occupato}
      onclick={() => onAscolta("reversed")}
    >
      <Icona nome={suonaContrario ? "stop" : "contrario"} misura={44} />
      <span class="etichetta">
        <span>{t.contrarioBreve}</span>
        {#if suonaContrario}
          <span class="sotto">{t.toccaPerFermare}</span>
        {:else if haAudio}
          <span class="sotto durata">{secondi(slot.duration)}</span>
        {/if}
      </span>
    </button>

    <!-- Sovrapposta ai due pad -->
    <ConfermaInline
      aperto={confermaAperta}
      sovrapposta
      ruolo="rerecord-confirm"
      domanda={t.riregistraDomanda}
      etichettaSi={t.riregistraConferma}
      etichettaNo={t.annulla}
      azioneSi="confirm-rerecord"
      azioneNo="cancel-rerecord"
      onSi={onConfermaRiregistra}
      onNo={onAnnullaRiregistra}
      ritorno={() => sezione?.querySelector<HTMLElement>("[data-action=record]") ?? null}
    />
  </div>
</section>

<style>
  .slot {
    --accento: var(--colore-primario);
    --su-accento: var(--colore-su-primario);
    --contenitore-accento: var(--colore-contenitore-primario);
    --su-contenitore-accento: var(--colore-su-contenitore-primario);
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 2px 12px 12px;
    border-radius: var(--raggio-xl);
    background: var(--colore-contenitore-superficie-basso);
    border: 1px solid var(--colore-contorno-variante);
    transition:
      border-color var(--molla-effetti),
      box-shadow var(--molla-effetti);
  }
  .slot-b {
    --accento: var(--colore-terziario);
    --su-accento: var(--colore-su-terziario);
    --contenitore-accento: var(--colore-contenitore-terziario);
    --su-contenitore-accento: var(--colore-su-contenitore-terziario);
  }
  .slot[data-state="recording"] {
    border-color: var(--colore-errore);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--colore-errore) 30%, transparent);
  }
  .slot[data-state="playing"] {
    border-color: var(--accento);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accento) 30%, transparent);
  }

  /* Riga del titolo: lettera · titolo e stato · pillola Originale · Scarica. Deve stare in 304 px (360 px). */
  .testa {
    position: relative;
    z-index: 2;
    flex: none;
    display: flex;
    align-items: center;
    gap: var(--spazio-2);
    height: 56px;
  }
  .lettera {
    flex: none;
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 10px;
    background: var(--accento);
    color: var(--su-accento);
    font: var(--testo-titolo);
    font-weight: 700;
  }
  .titoli {
    flex: 1;
    display: grid;
    min-width: 0;
  }
  h2 {
    font: var(--testo-titolo);
    line-height: 1.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .stato {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font: var(--testo-didascalia);
    font-size: 0.8125rem;
    color: var(--colore-su-superficie-variante);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .punto {
    flex: none;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--colore-contorno);
  }
  [data-state="ready"] .punto {
    background: var(--accento);
  }
  [data-state="playing"] .punto {
    background: var(--accento);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accento) 35%, transparent);
  }
  [data-state="recording"] .punto {
    background: var(--colore-errore);
    animation: lampeggia 1s steps(2, jump-none) infinite;
  }

  /* Pillola "Originale": il pulsante e' l'area di tocco (56 px di altezza), la pelle visibile e' alta 44 px.
     La pressione lunga (holdButton) riempie la pelle con --hold-progress (velo + barra in fondo). */
  .pillola-box {
    flex: none;
    display: flex;
  }
  .pillola {
    position: relative;
    display: flex;
    align-items: center;
    height: 56px;
    min-width: 56px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--accento);
    cursor: pointer;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
    transition: transform var(--durata-veloce) ease-out;
  }
  .pelle {
    position: relative;
    display: flex;
    align-items: center;
    gap: 5px;
    height: 44px;
    padding: 0 12px 0 10px;
    border: 1px solid var(--colore-contorno);
    border-radius: var(--raggio-pieno);
    overflow: hidden;
    isolation: isolate;
    font: var(--testo-etichetta);
    white-space: nowrap;
    transition:
      border-radius var(--durata-veloce) ease-out,
      background-color var(--molla-effetti),
      border-color var(--molla-effetti),
      color var(--molla-effetti);
  }
  .pillola:not(:disabled):hover .pelle {
    background: color-mix(in srgb, var(--accento) 10%, transparent);
  }
  .pillola:not(:disabled):active,
  .pillola:global(.is-holding) {
    transform: scale(0.97);
  }
  .pillola:not(:disabled):active .pelle,
  .pillola:global(.is-holding) .pelle {
    border-radius: 14px;
    border-color: var(--accento);
  }
  .pillola[aria-pressed="true"] .pelle {
    background: var(--accento);
    color: var(--su-accento);
    border-color: transparent;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accento) 35%, transparent);
  }
  .protetta .pelle::after {
    content: "";
    position: absolute;
    inset: auto 0 0 0;
    height: 4px;
    z-index: -1;
    background: currentColor;
    transform-origin: left center;
    transform: scaleX(var(--hold-progress, 0));
  }
  .protetta:global(.is-holding) .pelle::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background: currentColor;
    opacity: 0.22;
    transform-origin: left center;
    transform: scaleX(var(--hold-progress, 0));
  }
  .pillola:global(.is-shake) {
    animation: scuoti-pillola 400ms cubic-bezier(0.36, 0.07, 0.19, 0.97);
  }
  .pillola:disabled {
    cursor: not-allowed;
    color: color-mix(in srgb, var(--colore-su-superficie) 50%, transparent);
  }
  .pillola:disabled .pelle {
    border-color: transparent;
    background: color-mix(in srgb, var(--colore-su-superficie) 10%, transparent);
  }
  .pillola:focus-visible {
    outline: none;
  }
  .pillola:focus-visible .pelle {
    outline: 3px solid var(--colore-su-sfondo);
    outline-offset: 2px;
  }

  .scarica {
    flex: none;
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    /* rientra nel margine dello slot: l'icona resta allineata al bordo dei pad */
    margin: 0 -14px 0 -6px;
    padding: 0;
    border: 0;
    border-radius: var(--raggio-pieno);
    background: transparent;
    color: var(--colore-su-superficie-variante);
    cursor: pointer;
    touch-action: manipulation;
  }
  .scarica:not(:disabled):hover {
    background: color-mix(in srgb, var(--colore-su-superficie) 8%, transparent);
  }
  .scarica:disabled {
    cursor: not-allowed;
    color: color-mix(in srgb, var(--colore-su-superficie) 38%, transparent);
  }
  .errore {
    position: absolute;
    inset: 4px 0;
    z-index: 3;
    display: flex;
    align-items: center;
    padding: var(--spazio-1) var(--spazio-3);
    border-radius: var(--raggio-m);
    background: var(--colore-contenitore-errore);
    color: var(--colore-su-contenitore-errore);
    font: var(--testo-corpo-piccolo);
    line-height: 1.15;
    animation: compare var(--molla-spaziale);
  }

  /* Due pad di pari peso. Altezza: quella libera nella schermata, ma al massimo 1,3 volte la larghezza
     di un pad (niente colonne). 72 px = riga del titolo + padding e bordo dello slot; 34 px = padding,
     bordo e spazio tra i pad. Le unita' cq si riferiscono a .slots (App.svelte). */
  .azioni {
    position: relative;
    flex: none;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spazio-2);
    height: max(
      var(--altezza-pulsante-grande),
      min(calc((100cqh - var(--spazio-schermata, 12px)) / 2 - 72px), calc((100cqw - 34px) / 2 * 1.3))
    );
    container-type: size;
  }
  .pad {
    height: 100%;
    border-radius: var(--raggio-xl);
  }
  .contrario {
    flex-direction: column;
    gap: min(8px, 2.5cqh);
    padding: var(--spazio-2);
    background: var(--accento);
    color: var(--su-accento);
    font: var(--testo-titolo-sezione);
    font-size: 1.25rem;
    line-height: 1.2;
  }
  .contrario :global(svg) {
    width: min(44px, 26cqh);
    height: min(44px, 26cqh);
  }
  /* lo stile del pad e' piu' specifico di .pulsante:disabled: lo stato disabilitato va ripetuto qui */
  .contrario:disabled {
    background: color-mix(in srgb, var(--colore-su-superficie) 10%, transparent);
    color: color-mix(in srgb, var(--colore-su-superficie) 45%, transparent);
  }
  .contrario .etichetta {
    text-align: center;
    justify-items: center;
  }
  .contrario .durata {
    font-variant-numeric: tabular-nums;
  }

  /* Desktop: slot affiancati, i pad seguono la larghezza (1:1,35) entro l'altezza disponibile */
  @media (min-width: 900px) {
    .azioni {
      height: max(
        var(--altezza-pulsante-grande),
        min(calc(((100cqw - 24px) / 2 - 34px) / 2 * 1.35), calc(100dvh - 330px))
      );
    }
  }

  @keyframes lampeggia {
    50% {
      opacity: 0.25;
    }
  }
  @keyframes compare {
    from {
      opacity: 0;
    }
  }
  @keyframes scuoti-pillola {
    10%,
    90% {
      transform: translateX(-2px);
    }
    20%,
    80% {
      transform: translateX(4px);
    }
    30%,
    50%,
    70% {
      transform: translateX(-6px);
    }
    40%,
    60% {
      transform: translateX(6px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pillola:global(.is-shake) {
      animation: none;
    }
    .pillola:global(.is-shake) .pelle {
      outline: 3px solid var(--colore-errore);
      outline-offset: 2px;
    }
    .pillola:not(:disabled):active,
    .pillola:global(.is-holding) {
      transform: none;
    }
  }
</style>
