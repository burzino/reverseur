<script lang="ts">
  // Esito del round: si confrontano liberamente l'originale di A e l'imitazione di B al contrario,
  // si segna se e' stata indovinata e si passa al round dopo.
  import { gioco } from "../gioco.svelte";
  import type { PlayMode, SlotId } from "../sessione";
  import { sessione, store } from "../state.svelte";
  import { riempi, t } from "../testi";
  import Ascolto from "./Ascolto.svelte";
  import Icona from "./Icona.svelte";

  const s = $derived(sessione.stato);

  function suona(id: SlotId, mode: PlayMode): boolean {
    return s.playing?.slot === id && s.playing.mode === mode;
  }
</script>

<section class="schermata esito" id="score">
  <header>
    <h2>{t.esitoTitolo}</h2>
    <p class="aiuto">{t.esitoAiuto}</p>
  </header>

  <div class="ascolti">
    <div class="giocatore-a">
      <Ascolto
        titolo={t.originaleA}
        azione="play-a-original"
        icona="play"
        suona={suona("A", "original")}
        disabilitato={!s.slots.A.original}
        durata={s.slots.A.duration}
        onPremi={() => gioco.premiAscolta("A", "original")}
      />
    </div>
    <div class="giocatore-b">
      <Ascolto
        titolo={t.imitazioneBContrario}
        azione="play-b-reversed"
        icona="contrario"
        suona={suona("B", "reversed")}
        disabilitato={!s.slots.B.original}
        durata={s.slots.B.original ? s.slots.B.duration : 0}
        vuoto="—"
        onPremi={() => gioco.premiAscolta("B", "reversed")}
      />
    </div>
    <p class="scarica">
      {t.scaricaWav}:
      <button type="button" class="link" data-action="download" disabled={!s.slots.A.original} onclick={() => gioco.scarica("A")}>
        <Icona nome="scarica" misura={18} />{t.scaricaParola}
      </button>
      <button type="button" class="link" data-action="download" disabled={!s.slots.B.original} onclick={() => gioco.scarica("B")}>
        <Icona nome="scarica" misura={18} />{t.scaricaImitazione}
      </button>
    </p>
  </div>

  <div class="spinta"></div>

  <h3 class="domanda">{t.comeEAndata}</h3>
  <div class="scelte">
    <button
      type="button"
      class="pulsante tonale giusto"
      data-action="guessed"
      aria-pressed={s.verdict === "guessed"}
      onclick={() => store.judge("guessed")}
    >
      <Icona nome="giusto" />{t.indovinata}
    </button>
    <button
      type="button"
      class="pulsante tonale sbagliato"
      data-action="missed"
      aria-pressed={s.verdict === "missed"}
      onclick={() => store.judge("missed")}
    >
      <Icona nome="sbagliato" />{t.mancata}
    </button>
  </div>
  <button type="button" class="pulsante pieno grande giocatore-a avanti" data-action="next-round" onclick={() => gioco.vai("provaA")}>
    {riempi(t.prossimoRound, { n: s.round + 1 })}
    <Icona nome="avanti" />
  </button>
</section>

<style>
  h2 {
    font: var(--testo-titolo-sezione);
    font-size: clamp(2rem, 9vw, 2.75rem);
    font-weight: 800;
    line-height: 1.05;
  }
  .aiuto {
    margin-top: var(--spazio-1);
    font: var(--testo-corpo-piccolo);
    color: var(--colore-su-superficie-variante);
  }
  .ascolti {
    display: grid;
    gap: var(--spazio-2);
  }
  .scarica {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 var(--spazio-1);
    font: var(--testo-corpo-piccolo);
    color: var(--colore-su-superficie-variante);
  }
  .link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 44px;
    padding: 0 var(--spazio-2);
    border: 0;
    border-radius: var(--raggio-pieno);
    background: transparent;
    color: var(--colore-primario);
    font: var(--testo-etichetta);
    cursor: pointer;
  }
  .link:disabled {
    color: color-mix(in srgb, var(--colore-su-superficie) 40%, transparent);
    cursor: not-allowed;
  }
  .spinta {
    flex: 1;
    min-height: var(--spazio-2);
  }
  .domanda {
    font: var(--testo-titolo);
  }
  .scelte {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spazio-2);
  }
  .scelte .pulsante {
    gap: var(--spazio-2);
    padding-inline: var(--spazio-3);
  }
  .giusto {
    --accento: var(--colore-primario);
    --su-accento: var(--colore-su-primario);
    --contenitore-accento: var(--colore-contenitore-primario);
    --su-contenitore-accento: var(--colore-su-contenitore-primario);
  }
  .sbagliato {
    --accento: var(--colore-errore);
    --su-accento: var(--colore-su-errore);
    --contenitore-accento: var(--colore-contenitore-errore);
    --su-contenitore-accento: var(--colore-su-contenitore-errore);
  }
  .avanti {
    gap: var(--spazio-2);
  }
</style>
