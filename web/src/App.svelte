<script lang="ts">
  // Schermata unica: intestazione con "Nuova", come si gioca, slot A e B, Rivela, punteggio.
  // La logica dei gesti sta in ui/gioco.svelte.ts; lo stato della sessione in ui/state.svelte.ts.
  import ConfermaInline from "./ui/componenti/ConfermaInline.svelte";
  import ErroreMicrofono from "./ui/componenti/ErroreMicrofono.svelte";
  import Icona from "./ui/componenti/Icona.svelte";
  import Punteggio from "./ui/componenti/Punteggio.svelte";
  import Slot from "./ui/componenti/Slot.svelte";
  import { gioco, MAX_RECORD_MS, riattiva } from "./ui/gioco.svelte";
  import { hold } from "./ui/holdButton";
  import type { SlotId } from "./ui/sessione";
  import { sessione, store } from "./ui/state.svelte";
  import { t } from "./ui/testi";

  const s = $derived(sessione.stato);
  const r = $derived(gioco.registrazione);
  const suonaOriginaleA = $derived(s.playing?.slot === "A" && s.playing.mode === "original");
  const puoRivelare = $derived(s.slots.A.original !== null && s.slots.A.status !== "recording" && r === null);

  function registrazioneDi(id: SlotId) {
    return r && r.slot === id ? r : null;
  }
</script>

<div id="app" data-revealed={s.revealed ? "true" : "false"}>
  <header class="barra">
    <div class="interno">
      <div class="marchio">
        <h1>{t.titoloApp}</h1>
        <p class="sottotitolo">{t.sottotitoloApp}</p>
      </div>
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
      />
    </div>
  </header>

  <main class="contenuto">
    <ErroreMicrofono codice={gioco.erroreMicrofono} onChiudi={() => gioco.chiudiErrore()} />

    <details class="regole">
      <summary>{t.comeSiGioca}</summary>
      <ol>
        {#each t.passi as passo, i (i)}
          <li>{passo}</li>
        {/each}
      </ol>
    </details>

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
          errore={gioco.erroreSlot === id}
          suggerimento={id === "A" && gioco.suggerimento === "A"}
          massimoMs={MAX_RECORD_MS}
          onRegistra={() => gioco.premiRegistra(id)}
          onConfermaRiregistra={() => gioco.confermaRiregistrazione(id)}
          onAnnullaRiregistra={() => gioco.annullaRiregistrazione()}
          onAscolta={(mode) => gioco.premiAscolta(id, mode)}
          onScarica={() => gioco.scarica(id)}
          onGesto={riattiva}
          onPressioneAnnullata={(motivo) => gioco.pressioneAnnullata("A", motivo)}
        />
      {/each}
    </div>

    <div class="rivela">
      <div class="contenitore-trattieni">
        <p class="suggerimento" class:visibile={gioco.suggerimento === "rivela"} aria-live="polite">
          {gioco.suggerimento === "rivela" ? t.tieniPremuto : ""}
        </p>
        <button
          type="button"
          id="reveal"
          class="pulsante pieno grande"
          class:trattieni={!s.revealed}
          aria-describedby={s.revealed ? undefined : "aiuto-rivela"}
          disabled={!puoRivelare}
          onpointerdown={riattiva}
          onkeydown={riattiva}
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
          <span class="etichetta">
            <span>{t.rivela}</span>
            <span class="sotto">{suonaOriginaleA ? t.toccaPerFermare : s.revealed ? t.rivelaDopo : t.tieniPremuto}</span>
          </span>
          {#if !s.revealed}<span class="lucchetto"><Icona nome="lucchetto" misura={18} /></span>{/if}
        </button>
      </div>
      {#if !s.revealed}<p class="aiuto" id="aiuto-rivela">{t.rivelaAiuto}</p>{/if}
    </div>

    <Punteggio visibile={s.revealed} esito={s.verdict} punteggio={s.score} onEsito={(v) => store.judge(v)} />
  </main>
</div>

<style>
  #app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
  }
  .barra {
    position: sticky;
    top: 0;
    z-index: 5;
    background: color-mix(in srgb, var(--colore-sfondo) 92%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
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
    gap: var(--spazio-2);
    min-height: 64px;
    padding: var(--spazio-1) var(--margine-schermata);
  }
  .interno-conferma {
    width: 100%;
    max-width: var(--larghezza-max);
    margin: 0 auto;
    padding: 0 var(--margine-schermata);
  }
  .interno-conferma:has(:global(#new-game-confirm:not([hidden]))) {
    padding-bottom: var(--spazio-3);
  }
  .marchio {
    flex: 1;
    min-width: 0;
  }
  h1 {
    font: var(--testo-titolo-schermata);
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
  .nuova {
    flex: none;
    gap: var(--spazio-2);
  }

  .contenuto {
    flex: 1;
    display: grid;
    align-content: start;
    gap: var(--spazio-4);
    padding: var(--spazio-4) var(--margine-schermata);
    padding-left: calc(var(--margine-schermata) + env(safe-area-inset-left));
    padding-right: calc(var(--margine-schermata) + env(safe-area-inset-right));
    padding-bottom: calc(var(--spazio-6) + env(safe-area-inset-bottom));
  }

  .regole {
    border-radius: var(--raggio-l);
    background: var(--colore-contenitore-superficie);
  }
  .regole summary {
    display: flex;
    align-items: center;
    min-height: var(--altezza-pulsante);
    padding: 0 var(--spazio-4);
    font: var(--testo-titolo);
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    border-radius: var(--raggio-l);
    list-style: none;
  }
  .regole summary::-webkit-details-marker {
    display: none;
  }
  .regole summary::after {
    content: "";
    margin-left: auto;
    width: 0.6rem;
    height: 0.6rem;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(45deg) translateY(-3px);
    transition: transform var(--molla-effetti);
  }
  .regole[open] summary::after {
    transform: rotate(-135deg) translateY(-3px);
  }
  .regole ol {
    display: grid;
    gap: var(--spazio-2);
    margin: 0;
    padding: 0 var(--spazio-5) var(--spazio-4) calc(var(--spazio-4) + 1.25rem);
  }

  .slots {
    display: grid;
    gap: var(--spazio-4);
  }

  .rivela {
    display: grid;
    gap: var(--spazio-2);
    padding-top: var(--spazio-4);
  }
  .aiuto {
    text-align: center;
    font: var(--testo-corpo-piccolo);
    color: var(--colore-su-superficie-variante);
  }
  #reveal {
    justify-content: flex-start;
  }

  @media (min-width: 600px) {
    .interno,
    .contenuto {
      max-width: 600px;
    }
  }
  /* Desktop: slot affiancati, Rivela e punteggio centrati sotto */
  @media (min-width: 900px) {
    .interno,
    .contenuto {
      max-width: 1040px;
    }
    .slots {
      grid-template-columns: 1fr 1fr;
      gap: var(--spazio-5);
    }
    .regole,
    .rivela,
    .contenuto > :global(#score),
    .contenuto > :global(.totale),
    .contenuto > :global(#mic-error),
    .interno-conferma {
      width: 100%;
      max-width: 560px;
      justify-self: center;
    }
  }
</style>
