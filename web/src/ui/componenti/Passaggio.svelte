<script lang="ts">
  // Passaggio di mano: schermata a tutto colore del giocatore che riceve il telefono.
  // Nessun audio qui: chi riceve conferma di avere il telefono con il pulsante grande.
  import { gioco } from "../gioco.svelte";
  import { t } from "../testi";
  import Icona from "./Icona.svelte";

  interface Props {
    /** Chi riceve il telefono. */
    verso: "A" | "B";
  }
  let { verso }: Props = $props();
  const aB = $derived(verso === "B");
</script>

<section class="schermata passaggio" class:giocatore-a={!aB} class:giocatore-b={aB}>
  <div class="lettere" aria-hidden="true">
    <span class="lettera da">{aB ? "A" : "B"}</span>
    <Icona nome="avanti" misura={40} />
    <span class="lettera a">{verso}</span>
  </div>
  <h2>{aB ? t.passaABTitolo : t.passaBATitolo}</h2>
  <p class="aiuto">{aB ? t.passaABAiuto : t.passaBAAiuto}</p>
  <div class="spinta"></div>
  <button
    type="button"
    class="pulsante grande conferma"
    data-action={aB ? "start-b" : "start-a"}
    onclick={() => gioco.vai(aB ? "provaB" : "provaA")}
  >
    {aB ? t.sonoB : t.sonoA}
    <Icona nome="avanti" />
  </button>
  {#if aB}
    <button type="button" class="pulsante testo indietro" data-action="back-to-a" onclick={() => gioco.vai("provaA")}>
      <Icona nome="indietro" misura={20} />
      {t.rifaiParolaA}
    </button>
  {/if}
</section>

<style>
  .passaggio {
    border-radius: var(--raggio-xl);
    padding: var(--spazio-5) var(--spazio-4) var(--spazio-4);
    background: var(--accento);
    color: var(--su-accento);
  }
  .lettere {
    display: flex;
    align-items: center;
    gap: var(--spazio-3);
    margin-bottom: var(--spazio-4);
  }
  .lettera {
    display: grid;
    place-items: center;
    width: 4.5rem;
    height: 4.5rem;
    border-radius: 50%;
    font: var(--testo-titolo-sezione);
    font-size: 2.5rem;
    font-weight: 800;
  }
  .da {
    border: 3px solid currentColor;
    opacity: 0.7;
  }
  .a {
    background: var(--su-accento);
    color: var(--accento);
  }
  h2 {
    font: var(--testo-titolo-sezione);
    font-size: clamp(2rem, 9vw, 2.75rem);
    font-weight: 800;
    line-height: 1.05;
  }
  .aiuto {
    margin-top: var(--spazio-3);
    font: var(--testo-corpo);
    opacity: 0.92;
  }
  .spinta {
    flex: 1;
    min-height: var(--spazio-5);
  }
  .conferma {
    gap: var(--spazio-2);
    background: var(--su-accento);
    color: var(--accento);
  }
  .indietro {
    align-self: center;
    gap: var(--spazio-2);
    color: inherit;
  }
  .indietro:not(:disabled):hover {
    background: color-mix(in srgb, currentColor 12%, transparent);
  }
</style>
