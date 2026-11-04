<script lang="ts">
  // Uno slot (A = originale, B = imitazione): Registra, Ascolta al contrario, Ascolta originale, Scarica.
  // In A "Ascolta originale" svela la soluzione: pressione lunga (use:hold) finche' non si e' rivelato.
  // Layout compatto per la schermata unica: riga del titolo (con Scarica come icona), Registra che si
  // prende l'altezza libera, i due ascolti affiancati. Conferma e avvisi si sovrappongono, non spingono.
  import { sbloccaAudio } from "../gioco.svelte";
  import { hold } from "../holdButton";
  import type { Playing, PlayMode, SlotId, SlotState } from "../sessione";
  import { riempi, secondi, t } from "../testi";
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
        return suonaContrario ? t.statoRiproduzioneContrario : t.statoRiproduzioneOriginale;
      case "ready":
        return riempi(t.statoPronto, { durata: secondi(slot.duration) });
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
    <span class="numero" aria-hidden="true">{eA ? 1 : 2}</span>
    <div class="titoli">
      <h2 id="titolo-{id}">
        <span class="solo-lettori">{eA ? 1 : 2} · </span>{titolo} <span class="giocatore">({giocatore})</span>
      </h2>
      <p class="stato" data-role="status" aria-live="polite">
        <span class="punto" aria-hidden="true"></span>{stato}
      </p>
    </div>
    <button
      type="button"
      class="pulsante testo solo-icona scarica"
      data-action="download"
      aria-label={t.scaricaWav}
      disabled={!haAudio || occupato || protetto}
      title={haAudio && protetto ? t.scaricaDopoRivela : t.scaricaWav}
      onclick={onScarica}
    >
      <Icona nome="scarica" />
    </button>
    {#if errore}
      <!-- Avviso sovrapposto alla riga del titolo: non sposta i pulsanti -->
      <p class="errore" role="alert">{errore}</p>
    {/if}
  </header>

  <div class="azioni">
    <div class="riga-registra">
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
    </div>

    <div class="riga-ascolto">
      <button
        type="button"
        class="pulsante tonale"
        data-action="play-reversed"
        aria-label={t.ascoltaContrario}
        aria-pressed={suonaContrario}
        disabled={!haAudio || occupato}
        onclick={() => onAscolta("reversed")}
      >
        <Icona nome={suonaContrario ? "stop" : "contrario"} />
        <span class="etichetta">
          <span>{t.contrarioBreve}</span>
          {#if suonaContrario}<span class="sotto">{t.toccaPerFermare}</span>{/if}
        </span>
      </button>

      {#if eA}
        <div class="contenitore-trattieni">
          <p class="suggerimento" class:visibile={suggerimento} data-role="hold-hint" aria-live="polite">
            {suggerimento ? t.tieniPremuto : ""}
          </p>
          <button
            type="button"
            class="pulsante contorno"
            class:trattieni={protetto}
            data-action="play-original"
            aria-label={t.ascoltaOriginale}
            aria-pressed={suonaOriginale}
            aria-describedby={protetto ? idAiuto : undefined}
            disabled={!haAudio || occupato}
            use:sbloccaAudio
            use:hold={{
              onConfirm: () => onAscolta("original"),
              onCancel: ({ reason }) => onPressioneAnnullata(reason),
              bypass: () => revealed || (playing?.slot === "A" && playing.mode === "original"),
            }}
          >
            <Icona nome={suonaOriginale ? "stop" : "play"} />
            <span class="etichetta">
              <span>{t.originaleBreve}</span>
              {#if suonaOriginale}
                <span class="sotto">{t.toccaPerFermare}</span>
              {:else if protetto}
                <span class="sotto con-lucchetto"><Icona nome="lucchetto" misura={12} />{t.tieniPremuto}</span>
              {/if}
            </span>
          </button>
          <span class="solo-lettori" id={idAiuto}>{t.tieniPremutoAiuto}</span>
        </div>
      {:else}
        <button
          type="button"
          class="pulsante contorno"
          data-action="play-original"
          aria-label={t.ascoltaOriginale}
          aria-pressed={suonaOriginale}
          disabled={!haAudio || occupato}
          onclick={() => onAscolta("original")}
        >
          <Icona nome={suonaOriginale ? "stop" : "play"} />
          <span class="etichetta">
            <span>{t.originaleBreve}</span>
            {#if suonaOriginale}<span class="sotto">{t.toccaPerFermare}</span>{/if}
          </span>
        </button>
      {/if}
    </div>

    <!-- Sovrapposta all'area dei pulsanti: prende il posto di Registra e degli ascolti -->
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
    gap: clamp(4px, 1dvh, 12px);
    min-height: 0;
    padding: clamp(4px, 1dvh, 16px) clamp(10px, 1.4dvh, 16px) clamp(10px, 1.4dvh, 16px);
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

  /* Riga del titolo: numero · titolo e stato · Scarica (icona) */
  .testa {
    position: relative;
    flex: none;
    display: flex;
    align-items: center;
    gap: var(--spazio-2);
    min-height: var(--altezza-pulsante);
  }
  .numero {
    flex: none;
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: var(--raggio-m);
    background: var(--accento);
    color: var(--su-accento);
    font: var(--testo-titolo-sezione);
    font-size: 1.125rem;
  }
  .titoli {
    flex: 1;
    display: grid;
    min-width: 0;
  }
  h2 {
    font: var(--testo-titolo);
    font-size: 1.0625rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .giocatore {
    font: var(--testo-corpo-piccolo);
    color: var(--colore-su-superficie-variante);
  }
  .stato {
    display: flex;
    align-items: center;
    gap: var(--spazio-2);
    min-width: 0;
    font: var(--testo-didascalia);
    font-size: 0.8125rem;
    color: var(--colore-su-superficie-variante);
    white-space: nowrap;
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
  .scarica {
    margin-right: calc(-1 * var(--spazio-2));
  }
  .errore {
    position: absolute;
    inset: 0;
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

  /* Registra si prende l'altezza libera, i due ascolti affiancati sotto */
  .azioni {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: clamp(6px, 1dvh, 12px);
  }
  .riga-registra {
    /* base definita: su desktop lo slot e' alto quanto il contenuto; su telefono cresce o si stringe */
    flex: 1 1 max(120px, 22dvh);
    min-height: var(--altezza-pulsante-grande);
    max-height: max(160px, 28dvh);
    display: flex;
  }
  .riga-ascolto {
    flex: none;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spazio-2);
  }
  .riga-ascolto .pulsante {
    justify-content: flex-start;
    gap: var(--spazio-2);
    height: 100%;
    min-height: clamp(var(--altezza-pulsante), 8dvh, 76px);
    padding-inline: var(--spazio-3);
    font: var(--testo-titolo);
    line-height: 1.2;
  }
  .contenitore-trattieni {
    display: flex;
    min-width: 0;
  }
  .con-lucchetto {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    white-space: nowrap;
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
</style>
