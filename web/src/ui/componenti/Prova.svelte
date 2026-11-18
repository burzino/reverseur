<script lang="ts">
  // Schermata di prova di un giocatore: si ascolta, si registra e si rifa' quante volte si vuole.
  // A: la propria parola (al dritto e come la sentira' B), poi "Passa a B".
  // B: la parola di A al contrario e la propria imitazione al contrario, poi "Rivela" (pressione lunga).
  // Le azioni frequenti (Registra, Passa/Rivela) stanno in basso, sotto il pollice.
  import { gioco, MAX_RECORD_MS, RIVELA_MS, sbloccaAudio } from "../gioco.svelte";
  import { hold } from "../holdButton";
  import type { PlayMode, SlotId } from "../sessione";
  import { sessione } from "../state.svelte";
  import { riempi, t } from "../testi";
  import Ascolto from "./Ascolto.svelte";
  import ConfermaInline from "./ConfermaInline.svelte";
  import Icona from "./Icona.svelte";
  import PulsanteRegistra from "./PulsanteRegistra.svelte";

  interface Props {
    giocatore: SlotId;
  }
  let { giocatore }: Props = $props();

  const s = $derived(sessione.stato);
  const r = $derived(gioco.registrazione);
  const eA = $derived(giocatore === "A");
  const mio = $derived(s.slots[giocatore]);
  const occupato = $derived(r !== null);
  const avvisoTesto = $derived.by(() => {
    const e = gioco.erroreSlot;
    if (!e || e.slot !== giocatore) return null;
    if (e.tipo === "interrotta") return t.registrazioneInterrotta;
    return e.tipo === "debole" ? t.registrazioneDebole : t.registrazioneNonRiuscita;
  });
  const etichettaRegistra = $derived(mio.original ? t.rifai : eA ? t.registra : t.imita);
  const puoAvanzare = $derived(s.slots.A.original !== null && !occupato);

  function suona(id: SlotId, mode: PlayMode): boolean {
    return s.playing?.slot === id && s.playing.mode === mode;
  }
</script>

<section class="schermata" class:giocatore-a={eA} class:giocatore-b={!eA} id="slot-{giocatore}" data-state={mio.status}>
  <header class="intro">
    <span class="lettera" aria-hidden="true">{giocatore}</span>
    <div class="titoli">
      <p class="occhiello">{eA ? t.toccaA : t.toccaB}</p>
      <h2>{eA ? t.provaATitolo : t.provaBTitolo}</h2>
      <p class="aiuto">{eA ? t.provaAAiuto : t.provaBAiuto}</p>
      {#if !eA}
        <button
          type="button"
          id="back-to-a"
          class="pulsante testo ridai"
          data-action="back-to-a"
          disabled={occupato}
          aria-expanded={gioco.confermaRidai}
          onclick={() => (gioco.confermaRidai ? gioco.annullaRidai() : gioco.vai("passaBA"))}
        >
          <Icona nome="indietro" misura={20} />
          {t.ridaiAdA}
        </button>
      {/if}
    </div>
  </header>

  {#if !eA}
    <ConfermaInline
      aperto={gioco.confermaRidai}
      domanda={t.ridaiDomanda}
      etichettaSi={t.ridaiConferma}
      etichettaNo={t.annulla}
      azioneSi="confirm-back-to-a"
      azioneNo="cancel-back-to-a"
      onSi={() => gioco.vai("passaBA")}
      onNo={() => gioco.annullaRidai()}
      ritorno={() => document.getElementById("back-to-a")}
    />
  {/if}

  <div class="ascolti">
    {#if eA}
      <Ascolto
        titolo={t.laTuaParola}
        azione="play-a-original"
        icona="play"
        suona={suona("A", "original")}
        disabilitato={!mio.original || occupato}
        durata={mio.original ? mio.duration : 0}
        onPremi={() => gioco.premiAscolta("A", "original")}
      />
      <Ascolto
        titolo={t.comeLaSentiraB}
        azione="play-a-reversed"
        icona="contrario"
        suona={suona("A", "reversed")}
        disabilitato={!mio.original || occupato}
        durata={mio.original ? mio.duration : 0}
        onPremi={() => gioco.premiAscolta("A", "reversed")}
      />
    {:else}
      <div class="giocatore-a">
        <Ascolto
          titolo={t.parolaAContrario}
          azione="play-a-reversed"
          icona="contrario"
          suona={suona("A", "reversed")}
          disabilitato={!s.slots.A.original || occupato}
          durata={s.slots.A.duration}
          badge={gioco.ascoltiA > 0 ? riempi(t.ascolti, { n: gioco.ascoltiA }) : ""}
          onPremi={() => gioco.premiAscolta("A", "reversed")}
        />
      </div>
      <Ascolto
        titolo={t.imitazioneContrario}
        azione="play-b-reversed"
        icona="contrario"
        suona={suona("B", "reversed")}
        disabilitato={!mio.original || occupato}
        durata={mio.original ? mio.duration : 0}
        vuoto={t.imitazioneVuota}
        onPremi={() => gioco.premiAscolta("B", "reversed")}
      />
    {/if}
  </div>

  <div class="spinta">
    {#if avvisoTesto}<p class="avviso" role="alert">{avvisoTesto}</p>{/if}
  </div>

  <div class="registra-box">
    <PulsanteRegistra
      inRegistrazione={mio.status === "recording"}
      inAvvio={r?.avvio ?? false}
      inElaborazione={r?.elaborazione ?? false}
      disabilitato={(r?.avvio ?? false) || (r?.elaborazione ?? false)}
      trascorso={r?.trascorso ?? 0}
      livello={r?.livello ?? 0}
      massimoMs={MAX_RECORD_MS}
      etichetta={etichettaRegistra}
      onPremi={() => gioco.premiRegistra(giocatore)}
    />
  </div>

  {#if eA}
    <button
      type="button"
      class="pulsante pieno grande avanti"
      data-action="pass-to-b"
      disabled={!puoAvanzare}
      onclick={() => gioco.vai("passaAB")}
    >
      {t.passaAB}
      <Icona nome="avanti" />
    </button>
  {:else}
    <div class="contenitore-trattieni">
      <p class="suggerimento" class:visibile={gioco.suggerimento} data-role="reveal-hint" aria-live="polite">
        {gioco.suggerimento ? t.tieniPremuto : ""}
      </p>
      <button
        type="button"
        id="reveal"
        class="pulsante pieno grande trattieni rivela"
        data-action="reveal"
        aria-describedby="aiuto-rivela"
        disabled={!puoAvanzare}
        use:sbloccaAudio
        use:hold={{
          ms: RIVELA_MS,
          onConfirm: () => gioco.rivela(),
          onCancel: ({ reason }) => gioco.pressioneAnnullata(reason),
        }}
      >
        <Icona nome="occhio" misura={28} />
        <span class="etichetta">
          <span>{t.rivela}</span>
          <span class="sotto">{t.rivelaSotto}</span>
        </span>
        <span class="lucchetto"><Icona nome="lucchetto" misura={18} /></span>
      </button>
      <span class="solo-lettori" id="aiuto-rivela">{t.rivelaAiuto}</span>
    </div>
  {/if}
</section>

<style>
  .intro {
    display: flex;
    align-items: flex-start;
    gap: var(--spazio-3);
  }
  .lettera {
    flex: none;
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    border-radius: 14px;
    background: var(--accento);
    color: var(--su-accento);
    font: var(--testo-titolo-sezione);
    font-size: 1.75rem;
    font-weight: 800;
  }
  .titoli {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .occhiello {
    font: var(--testo-etichetta);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accento);
  }
  h2 {
    font: var(--testo-titolo-sezione);
    font-size: clamp(1.375rem, 5.5vw, 1.75rem);
    font-weight: 800;
    line-height: 1.15;
  }
  .aiuto {
    font: var(--testo-corpo-piccolo);
    color: var(--colore-su-superficie-variante);
  }
  .ridai {
    justify-self: start;
    gap: var(--spazio-1);
    min-height: 44px;
    margin-left: calc(-1 * var(--spazio-3));
    padding-inline: var(--spazio-3);
    font-size: 0.9375rem;
  }
  .ascolti {
    display: grid;
    gap: var(--spazio-2);
  }
  /* Lo spazio libero va soprattutto a Registra (fino a 260 px), il resto resta sopra. */
  .spinta {
    flex: 1 1 0;
    min-height: 0;
    display: flex;
    align-items: flex-end;
  }
  .avviso {
    width: 100%;
    padding: var(--spazio-2) var(--spazio-3);
    border-radius: var(--raggio-m);
    background: var(--colore-contenitore-errore);
    color: var(--colore-su-contenitore-errore);
    font: var(--testo-corpo-piccolo);
  }
  .registra-box {
    flex: 4 1 0;
    min-height: 104px;
    max-height: 260px;
    container-type: size;
  }
  .avanti {
    gap: var(--spazio-2);
  }
  .rivela {
    justify-content: flex-start;
  }
</style>
