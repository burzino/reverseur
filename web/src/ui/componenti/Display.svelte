<script lang="ts">
  // Display della plancia (sola lettura): round e punteggio, cosa sta succedendo, e cosa fare adesso.
  // Durante la registrazione mostra timer grande e VU-meter. E' sempre scuro, come lo schermo di uno strumento.
  import { gioco, MAX_RECORD_MS } from "../gioco.svelte";
  import { guida } from "../guida";
  import { sessione } from "../state.svelte";
  import { riempi, secondi, t } from "../testi";
  import VuMeter from "./VuMeter.svelte";

  const s = $derived(sessione.stato);
  const r = $derived(gioco.registrazione);
  const g = $derived(guida(s, gioco.ascoltiA));
  const registraAttiva = $derived(r !== null && !r.avvio && !r.elaborazione);

  const stato = $derived.by(() => {
    if (r) return { classe: "rec", testo: `● ${riempi(t.inRegistrazione, { chi: r.slot })}` };
    const p = s.playing;
    if (!p) return null;
    const cosa = p.mode === "reversed" ? `◀◀ ${p.slot}` : `▶ ${p.slot}`;
    return { classe: p.slot === "A" ? "a" : "b", testo: riempi(t.inAscolto, { cosa }) };
  });

  const avviso = $derived.by(() => {
    const e = gioco.erroreSlot;
    if (!e) return null;
    if (e.tipo === "interrotta") return t.registrazioneInterrotta;
    return e.tipo === "debole" ? t.registrazioneDebole : t.registrazioneNonRiuscita;
  });

  /** Secondi con una cifra decimale, a due cifre intere: 03,4 */
  function cifre(ms: number): string {
    const v = Math.min(ms, MAX_RECORD_MS) / 1000;
    return v.toFixed(1).replace(".", ",").padStart(4, "0");
  }
</script>

<section class="display" aria-label={t.titoloApp}>
  <p class="riga-alta">
    <span>
      <span data-role="round">{riempi(t.round, { n: s.round })}</span>
      <span class="punti" title={riempi(t.punteggioRiga, { g: s.score.guessed, m: s.score.missed })}>
        <span class="solo-lettori">{t.punteggio}:</span>
        ✓{s.score.guessed} ✗{s.score.missed}
      </span>
    </span>
    {#if stato}<span class="stato {stato.classe}">{stato.testo}</span>{/if}
  </p>

  <div class="centro" aria-live="polite">
    {#if registraAttiva && r}
      <p class="timer" data-role="timer">
        {cifre(r.trascorso)}<span class="massimo"> / {secondi(MAX_RECORD_MS / 1000)}</span>
      </p>
      <div class="vu"><VuMeter livello={r.livello} attivo={true} /></div>
    {:else}
      <h2 class="titolo" data-role="guide">{g.titolo}</h2>
    {/if}
  </div>

  {#if avviso}
    <p class="avviso" role="alert">{avviso}</p>
  {:else}
    <p class="sotto">{g.sotto}</p>
  {/if}

  {#if s.revealed}
    <p class="scarica">
      {t.scaricaWav}:
      <button type="button" data-action="download" disabled={!s.slots.A.original} onclick={() => gioco.scarica("A")}
        >{t.scaricaParola}</button
      >
      <button type="button" data-action="download" disabled={!s.slots.B.original} onclick={() => gioco.scarica("B")}
        >{t.scaricaImitazione}</button
      >
    </p>
  {/if}
</section>

<style>
  .display {
    --d-testo: #f3eff7;
    --d-tenue: #b9b2c4;
    --d-a: #cbbeff;
    --d-b: #efb8c8;
    --d-rec: #ff8a80;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spazio-1);
    padding: var(--spazio-3) var(--spazio-4) var(--spazio-3);
    border-radius: var(--raggio-xl);
    background: #1a1820;
    color: var(--d-testo);
    overflow: hidden;
  }
  .riga-alta {
    display: flex;
    justify-content: space-between;
    gap: var(--spazio-2);
    font: 600 0.75rem/1.3 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--d-tenue);
  }
  .punti {
    margin-left: var(--spazio-2);
  }
  .stato {
    white-space: nowrap;
  }
  .stato.rec {
    color: var(--d-rec);
  }
  .stato.a {
    color: var(--d-a);
  }
  .stato.b {
    color: var(--d-b);
  }
  .centro {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: var(--spazio-2);
  }
  .titolo {
    font: var(--testo-titolo-sezione);
    font-size: clamp(1.375rem, 4.2dvh, 2rem);
    font-weight: 800;
    line-height: 1.1;
  }
  .timer {
    font-weight: 300;
    font-size: clamp(2.75rem, 10dvh, 4.5rem);
    line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .massimo {
    font-size: 0.3em;
    color: var(--d-tenue);
    letter-spacing: 0;
  }
  .vu {
    --colore-vu: var(--d-rec);
  }
  .vu :global(.vu) {
    height: clamp(14px, 4dvh, 32px);
  }
  .sotto,
  .avviso {
    font: var(--testo-corpo-piccolo);
    color: var(--d-tenue);
  }
  .avviso {
    color: var(--d-rec);
  }
  .scarica {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 var(--spazio-2);
    font: var(--testo-didascalia);
    color: var(--d-tenue);
  }
  .scarica button {
    min-height: 36px;
    padding: 0 var(--spazio-1);
    border: 0;
    background: transparent;
    color: var(--d-a);
    font: var(--testo-etichetta);
    text-decoration: underline;
    cursor: pointer;
  }
  .scarica button:disabled {
    color: var(--d-tenue);
    text-decoration: none;
    cursor: not-allowed;
  }
</style>
