<script lang="ts">
  // Conferma inline (niente confirm() nativo): resta nel DOM, nascosta con `hidden` quando chiusa.
  // All'apertura il focus va su "Annulla", la scelta sicura.
  import { tick } from "svelte";

  interface Props {
    aperto: boolean;
    domanda: string;
    etichettaSi: string;
    etichettaNo: string;
    azioneSi: string;
    azioneNo: string;
    onSi: () => void;
    onNo: () => void;
    id?: string;
    ruolo?: string;
  }
  let { aperto, domanda, etichettaSi, etichettaNo, azioneSi, azioneNo, onSi, onNo, id, ruolo }: Props = $props();

  let pulsanteNo: HTMLButtonElement | undefined = $state();
  const idDomanda = $props.id();

  $effect(() => {
    if (aperto) void tick().then(() => pulsanteNo?.focus());
  });

  function tasto(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      onNo();
    }
  }
</script>

<div
  class="conferma"
  {id}
  data-role={ruolo}
  hidden={!aperto}
  role="group"
  aria-labelledby={idDomanda}
>
  <p id={idDomanda}>{domanda}</p>
  <div class="scelte">
    <button type="button" class="no" data-action={azioneNo} bind:this={pulsanteNo} onclick={onNo} onkeydown={tasto}>{etichettaNo}</button>
    <button type="button" class="si" data-action={azioneSi} onclick={onSi} onkeydown={tasto}>{etichettaSi}</button>
  </div>
</div>

<style>
  .conferma {
    display: grid;
    gap: var(--spazio-3);
    padding: var(--spazio-4);
    border-radius: var(--raggio-l);
    background: var(--colore-contenitore-errore);
    color: var(--colore-su-contenitore-errore);
    animation: entra var(--molla-spaziale);
  }
  .conferma[hidden] {
    display: none;
  }
  p {
    font: var(--testo-titolo);
  }
  .scelte {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spazio-2);
  }
  button {
    flex: 1 1 8rem;
    min-height: var(--altezza-pulsante);
    padding: var(--spazio-2) var(--spazio-4);
    border-radius: var(--raggio-pieno);
    border: 1px solid transparent;
    font: var(--testo-titolo);
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    touch-action: manipulation;
    transition: transform var(--durata-veloce) ease-out, border-radius var(--durata-veloce) ease-out;
  }
  button:active {
    transform: scale(0.97);
    border-radius: var(--raggio-m);
  }
  .si {
    background: var(--colore-errore);
    color: var(--colore-su-errore);
  }
  .no {
    background: transparent;
    color: var(--colore-su-contenitore-errore);
    border-color: currentColor;
  }
  @keyframes entra {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
  }
</style>
