<script lang="ts">
  // Uno slot (A = originale, B = imitazione): Registra, Ascolta al contrario, Ascolta originale, Scarica.
  // In A "Ascolta originale" svela la soluzione: pressione lunga (use:hold) finche' non si e' rivelato.
  import { hold } from "../holdButton";
  import type { Playing, PlayMode, SlotId, SlotState } from "../sessione";
  import { riempi, secondi, t } from "../testi";
  import ConfermaInline from "./ConfermaInline.svelte";
  import Icona from "./Icona.svelte";
  import PulsanteRegistra from "./PulsanteRegistra.svelte";
  import VuMeter from "./VuMeter.svelte";

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
    errore: boolean;
    suggerimento: boolean;
    massimoMs: number;
    onRegistra: () => void;
    onConfermaRiregistra: () => void;
    onAnnullaRiregistra: () => void;
    onAscolta: (mode: PlayMode) => void;
    onScarica: () => void;
    onGesto: () => void;
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
    onGesto,
    onPressioneAnnullata,
  }: Props = $props();

  const idAiuto = $props.id();
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
  </header>

  <div class="azioni">
    <PulsanteRegistra
      inRegistrazione={inRegistrazione}
      inAvvio={registrazione?.avvio ?? false}
      inElaborazione={registrazione?.elaborazione ?? false}
      disabilitato={altroOccupato || (registrazione?.avvio ?? false) || (registrazione?.elaborazione ?? false)}
      trascorso={registrazione?.trascorso ?? 0}
      {massimoMs}
      onPremi={onRegistra}
    />
    <VuMeter livello={registrazione?.livello ?? 0} attivo={inRegistrazione && !registrazione?.elaborazione} />

    <ConfermaInline
      aperto={confermaAperta}
      ruolo="rerecord-confirm"
      domanda={t.riregistraDomanda}
      etichettaSi={t.riregistraConferma}
      etichettaNo={t.annulla}
      azioneSi="confirm-rerecord"
      azioneNo="cancel-rerecord"
      onSi={onConfermaRiregistra}
      onNo={onAnnullaRiregistra}
    />

    {#if errore}
      <p class="errore" role="alert">{t.registrazioneNonRiuscita}</p>
    {/if}

    <button
      type="button"
      class="pulsante tonale grande"
      data-action="play-reversed"
      aria-pressed={suonaContrario}
      disabled={!haAudio || occupato}
      onclick={() => onAscolta("reversed")}
    >
      <Icona nome={suonaContrario ? "stop" : "contrario"} misura={28} />
      <span class="etichetta">
        <span>{t.ascoltaContrario}</span>
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
          aria-pressed={suonaOriginale}
          aria-describedby={protetto ? idAiuto : undefined}
          disabled={!haAudio || occupato}
          onpointerdown={onGesto}
          onkeydown={onGesto}
          use:hold={{
            onConfirm: () => onAscolta("original"),
            onCancel: ({ reason }) => onPressioneAnnullata(reason),
            bypass: () => revealed || (playing?.slot === "A" && playing.mode === "original"),
          }}
        >
          <Icona nome={suonaOriginale ? "stop" : "play"} />
          <span class="etichetta">
            <span>{t.ascoltaOriginale}</span>
            {#if suonaOriginale}<span class="sotto">{t.toccaPerFermare}</span>
            {:else if protetto}<span class="sotto">{t.tieniPremuto}</span>{/if}
          </span>
          {#if protetto}<span class="lucchetto"><Icona nome="lucchetto" misura={18} /></span>{/if}
        </button>
        <span class="solo-lettori" id={idAiuto}>{t.tieniPremutoAiuto}</span>
      </div>
    {:else}
      <button
        type="button"
        class="pulsante contorno"
        data-action="play-original"
        aria-pressed={suonaOriginale}
        disabled={!haAudio || occupato}
        onclick={() => onAscolta("original")}
      >
        <Icona nome={suonaOriginale ? "stop" : "play"} />
        <span class="etichetta">
          <span>{t.ascoltaOriginale}</span>
          {#if suonaOriginale}<span class="sotto">{t.toccaPerFermare}</span>{/if}
        </span>
      </button>
    {/if}

    <button
      type="button"
      class="pulsante testo scarica"
      data-action="download"
      disabled={!haAudio || occupato || protetto}
      title={haAudio && protetto ? t.scaricaDopoRivela : undefined}
      onclick={onScarica}
    >
      <Icona nome="scarica" misura={20} />
      {t.scaricaWav}
    </button>
  </div>
</section>

<style>
  .slot {
    --accento: var(--colore-primario);
    --su-accento: var(--colore-su-primario);
    --contenitore-accento: var(--colore-contenitore-primario);
    --su-contenitore-accento: var(--colore-su-contenitore-primario);
    display: grid;
    align-content: start;
    gap: var(--spazio-4);
    padding: var(--spazio-4);
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

  .testa {
    display: flex;
    align-items: center;
    gap: var(--spazio-3);
  }
  .numero {
    flex: none;
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: var(--raggio-m);
    background: var(--accento);
    color: var(--su-accento);
    font: var(--testo-titolo-sezione);
  }
  .titoli {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  h2 {
    font: var(--testo-titolo-sezione);
  }
  .giocatore {
    font: var(--testo-corpo);
    color: var(--colore-su-superficie-variante);
  }
  .stato {
    display: flex;
    align-items: center;
    gap: var(--spazio-2);
    font: var(--testo-etichetta);
    color: var(--colore-su-superficie-variante);
  }
  .punto {
    flex: none;
    width: 0.625rem;
    height: 0.625rem;
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

  .azioni {
    display: grid;
    gap: var(--spazio-3);
  }
  .azioni :global(.pulsante:not(.testo)) {
    justify-content: flex-start;
  }
  .scarica {
    justify-self: start;
    font: var(--testo-etichetta);
  }
  .errore {
    padding: var(--spazio-3) var(--spazio-4);
    border-radius: var(--raggio-m);
    background: var(--colore-contenitore-errore);
    color: var(--colore-su-contenitore-errore);
    font: var(--testo-corpo-piccolo);
  }

  @keyframes lampeggia {
    50% {
      opacity: 0.25;
    }
  }
</style>
