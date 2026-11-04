<script lang="ts">
  // Schermata unica: intestazione con "Nuova", come si gioca, slot A e B, Rivela, punteggio.
  // La logica dei gesti sta in ui/gioco.svelte.ts; lo stato della sessione in ui/state.svelte.ts.
  import ConfermaInline from "./ui/componenti/ConfermaInline.svelte";
  import ErroreMicrofono from "./ui/componenti/ErroreMicrofono.svelte";
  import Icona from "./ui/componenti/Icona.svelte";
  import Punteggio from "./ui/componenti/Punteggio.svelte";
  import Slot from "./ui/componenti/Slot.svelte";
  import { gioco, MAX_RECORD_MS, sbloccaAudio } from "./ui/gioco.svelte";
  import { hold } from "./ui/holdButton";
  import type { SlotId } from "./ui/sessione";
  import { sessione, store } from "./ui/state.svelte";
  import { riempi, t } from "./ui/testi";

  const s = $derived(sessione.stato);
  const r = $derived(gioco.registrazione);
  const suonaOriginaleA = $derived(s.playing?.slot === "A" && s.playing.mode === "original");
  const totale = $derived(s.score.guessed + s.score.missed);
  let regole: HTMLDialogElement | undefined = $state();
  const puoRivelare = $derived(s.slots.A.original !== null && s.slots.A.status !== "recording" && r === null);

  function registrazioneDi(id: SlotId) {
    return r && r.slot === id ? r : null;
  }

  function erroreDi(id: SlotId): string | null {
    const e = gioco.erroreSlot;
    if (!e || e.slot !== id) return null;
    if (e.tipo === "interrotta") return t.registrazioneInterrotta;
    return e.tipo === "debole" ? t.registrazioneDebole : t.registrazioneNonRiuscita;
  }

  // Pagina nascosta/visibile ed errori del registratore.
  $effect(() => gioco.collega());
</script>

<div id="app" data-revealed={s.revealed ? "true" : "false"}>
  <header class="barra">
    <div class="interno">
      <div class="marchio">
        <h1>{t.titoloApp}</h1>
        <p class="sottotitolo" aria-live="polite">
          {#if totale > 0}
            <span class="solo-lettori">{t.punteggio}:</span>
            <span class="totale" title={riempi(t.punteggioRiga, { g: s.score.guessed, m: s.score.missed })}
              >{riempi(t.punteggioBreve, { g: s.score.guessed, n: totale })}</span
            >
          {:else}
            {t.sottotitoloApp}
          {/if}
        </p>
      </div>
      <button
        type="button"
        id="help"
        class="pulsante testo solo-icona"
        aria-haspopup="dialog"
        aria-controls="rules"
        aria-label={t.comeSiGioca}
        title={t.comeSiGioca}
        onclick={() => regole?.showModal()}
      >
        <Icona nome="aiuto" />
      </button>
      <button
        type="button"
        id="new-game"
        class="pulsante testo nuova"
        aria-expanded={gioco.confermaNuova}
        aria-controls="new-game-confirm"
        aria-label={t.nuovaEtichetta}
        onclick={() => gioco.premiNuova()}
      >
        <Icona nome="nuova" />
        {t.nuova}
      </button>
    </div>
    <!-- Sovrapposta all'intestazione: non aggiunge una riga al layout -->
    <div class="interno-conferma">
      <ConfermaInline
        id="new-game-confirm"
        aperto={gioco.confermaNuova}
        domanda={t.nuovaDomanda}
        etichettaSi={t.nuovaConferma}
        etichettaNo={t.annulla}
        azioneSi="confirm-new"
        azioneNo="cancel-new"
        onSi={() => gioco.nuovaPartita()}
        onNo={() => gioco.annullaNuova()}
        ritorno={() => document.getElementById("new-game")}
      />
    </div>
  </header>

  <main class="contenuto">
    <ErroreMicrofono codice={gioco.erroreMicrofono} onChiudi={() => gioco.chiudiErrore()} />

    <div class="slots">
      {#each ["A", "B"] as const as id (id)}
        <Slot
          {id}
          slot={s.slots[id]}
          playing={s.playing}
          revealed={s.revealed}
          registrazione={registrazioneDi(id)}
          altroOccupato={r !== null && r.slot !== id}
          confermaAperta={gioco.confermaRiregistra === id}
          errore={erroreDi(id)}
          suggerimento={id === "A" && gioco.suggerimento === "A"}
          massimoMs={MAX_RECORD_MS}
          onRegistra={() => gioco.premiRegistra(id)}
          onConfermaRiregistra={() => gioco.confermaRiregistrazione(id)}
          onAnnullaRiregistra={() => gioco.annullaRiregistrazione()}
          onAscolta={(mode) => gioco.premiAscolta(id, mode)}
          onScarica={() => gioco.scarica(id)}
          onPressioneAnnullata={(motivo) => gioco.pressioneAnnullata("A", motivo)}
        />
      {/each}
    </div>

    <!-- Barra in fondo: Rivela; dopo la rivelazione Rivela si riduce a icona e accanto compare l'esito -->
    <div class="fondo">
      <div class="rivela" class:compatta={s.revealed}>
        <div class="contenitore-trattieni">
          <p
            class="suggerimento"
            class:visibile={gioco.suggerimento === "rivela"}
            data-role="reveal-hint"
            aria-live="polite"
          >
            {gioco.suggerimento === "rivela" ? t.tieniPremuto : ""}
          </p>
          <button
            type="button"
            id="reveal"
            class="pulsante pieno grande"
            class:trattieni={!s.revealed}
            aria-describedby={s.revealed ? undefined : "aiuto-rivela"}
            title={s.revealed ? t.rivelaDopo : undefined}
            disabled={!puoRivelare}
            use:sbloccaAudio
            use:hold={{
              onConfirm: () => gioco.rivela(),
              onCancel: ({ reason }) => gioco.pressioneAnnullata("rivela", reason),
              bypass: () => {
                const st = store.getState();
                return st.revealed || (st.playing?.slot === "A" && st.playing.mode === "original");
              },
            }}
          >
            <Icona nome={suonaOriginaleA ? "stop" : "occhio"} misura={28} />
            <span class="etichetta" class:solo-lettori={s.revealed}>
              <span>{t.rivela}</span>
              <span class="sotto">{suonaOriginaleA ? t.toccaPerFermare : s.revealed ? t.rivelaDopo : t.tieniPremuto}</span>
            </span>
            {#if !s.revealed}<span class="lucchetto"><Icona nome="lucchetto" misura={18} /></span>{/if}
          </button>
        </div>
        {#if !s.revealed}<span class="solo-lettori" id="aiuto-rivela">{t.rivelaAiuto}</span>{/if}
      </div>

      <Punteggio visibile={s.revealed} esito={s.verdict} onEsito={(v) => store.judge(v)} />
    </div>
  </main>

  <dialog id="rules" class="regole" aria-labelledby="titolo-regole" bind:this={regole}>
    <div class="testa-regole">
      <h2 id="titolo-regole">{t.comeSiGioca}</h2>
      <form method="dialog">
        <button type="submit" class="pulsante testo solo-icona" aria-label={t.chiudi} title={t.chiudi}>
          <Icona nome="chiudi" />
        </button>
      </form>
    </div>
    <ol>
      {#each t.passi as passo, i (i)}
        <li>{passo}</li>
      {/each}
    </ol>
  </dialog>
</div>

<style>
  /* Una sola schermata senza scorrimento: intestazione, due slot che si dividono l'altezza, barra in fondo.
     Sotto i 600 px di altezza (telefono in orizzontale) si torna a scorrere. */
  #app {
    --spazio-schermata: clamp(8px, 1.4dvh, 16px);
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    min-height: 0;
  }
  .barra {
    position: relative;
    z-index: 5;
    flex: none;
    background: var(--colore-sfondo);
    padding-top: env(safe-area-inset-top);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
    border-bottom: 1px solid var(--colore-contorno-variante);
  }
  .interno,
  .contenuto {
    width: 100%;
    max-width: var(--larghezza-max);
    margin: 0 auto;
  }
  .interno {
    display: flex;
    align-items: center;
    gap: var(--spazio-1);
    padding: var(--spazio-1) calc(var(--margine-schermata) - var(--spazio-2)) var(--spazio-1) var(--margine-schermata);
  }
  .interno-conferma {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin: 0 auto;
    width: 100%;
    max-width: var(--larghezza-max);
    padding: var(--spazio-2) var(--margine-schermata) 0;
    pointer-events: none;
  }
  .interno-conferma > :global(*) {
    pointer-events: auto;
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.25);
  }
  .marchio {
    flex: 1;
    min-width: 0;
  }
  h1 {
    font: var(--testo-titolo-sezione);
    font-weight: 800;
    letter-spacing: 0.02em;
    color: var(--colore-primario);
  }
  .sottotitolo {
    font: var(--testo-didascalia);
    color: var(--colore-su-superficie-variante);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .totale {
    font-variant-numeric: tabular-nums;
  }
  .nuova {
    flex: none;
    gap: var(--spazio-2);
  }
  :global(.pulsante.solo-icona) {
    flex: none;
    width: var(--altezza-pulsante);
    padding: 0;
  }

  .contenuto {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spazio-schermata);
    padding: var(--spazio-schermata) var(--margine-schermata);
    padding-left: calc(var(--margine-schermata) + env(safe-area-inset-left));
    padding-right: calc(var(--margine-schermata) + env(safe-area-inset-right));
    padding-bottom: calc(var(--spazio-schermata) + env(safe-area-inset-bottom));
  }

  .slots {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-rows: 1fr 1fr;
    gap: var(--spazio-schermata);
  }

  .fondo {
    flex: none;
    display: flex;
    gap: var(--spazio-2);
  }
  .rivela {
    flex: 1;
    min-width: 0;
  }
  .rivela.compatta {
    flex: none;
  }
  #reveal {
    justify-content: flex-start;
    min-height: clamp(var(--altezza-pulsante), 8dvh, var(--altezza-pulsante-grande));
  }
  .compatta #reveal {
    width: clamp(var(--altezza-pulsante), 8dvh, var(--altezza-pulsante-grande));
    padding: 0;
    justify-content: center;
  }

  /* Come si gioca: dialogo modale nativo (Esc chiude, il focus torna al pulsante) */
  .regole {
    width: min(100% - 2 * var(--margine-schermata), 480px);
    max-height: min(100dvh - 2 * var(--margine-schermata), 640px);
    margin: auto;
    padding: var(--spazio-4) var(--spazio-4) var(--spazio-5);
    border: none;
    border-radius: var(--raggio-xl);
    background: var(--colore-contenitore-superficie-alto, var(--colore-contenitore-superficie));
    color: var(--colore-su-superficie);
    box-shadow: 0 12px 40px rgb(0 0 0 / 0.3);
  }
  .regole::backdrop {
    background: rgb(0 0 0 / 0.45);
  }
  .testa-regole {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spazio-2);
    margin-bottom: var(--spazio-2);
  }
  .testa-regole h2 {
    font: var(--testo-titolo-sezione);
  }
  .regole ol {
    display: grid;
    gap: var(--spazio-3);
    margin: 0;
    padding-left: 1.25rem;
  }

  @media (min-width: 600px) {
    .interno,
    .contenuto,
    .interno-conferma {
      max-width: 600px;
    }
  }
  /* Desktop: slot affiancati, la barra di Rivela sotto, centrata */
  @media (min-width: 900px) {
    .interno,
    .contenuto {
      max-width: 1040px;
    }
    .interno-conferma {
      max-width: 560px;
    }
    /* slot alti quanto il contenuto, centrati nello spazio libero */
    .slots {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: auto;
      align-content: center;
      gap: var(--spazio-5);
    }
    .fondo {
      width: 100%;
      max-width: 640px;
      align-self: center;
    }
  }
  /* Schermi molto bassi (orizzontale): l'altezza non basta, si scorre */
  @media (max-height: 599px) {
    #app {
      height: auto;
      min-height: 100dvh;
    }
    .slots {
      grid-template-rows: auto;
    }
  }
</style>
