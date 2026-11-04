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
    /** Pulsante che ha aperto la conferma: riprende il focus quando si chiude. */
    ritorno?: () => HTMLElement | null;
    /** Copre il contenitore (position: relative) invece di occupare una riga. */
    sovrapposta?: boolean;
  }
  let { aperto, domanda, etichettaSi, etichettaNo, azioneSi, azioneNo, onSi, onNo, id, ruolo, ritorno, sovrapposta = false }: Props =
    $props();

  let pulsanteNo: HTMLButtonElement | undefined = $state();
  let contenitore: HTMLDivElement | undefined = $state();
  const idDomanda = $props.id();
  /** Massima attesa perche' il pulsante di ritorno torni abilitato (es. Registra durante l'avvio del microfono). */
  const ATTESA_RITORNO_MS = 5000;

  function focusPerso(): boolean {
    const a = document.activeElement;
    return a === null || a === document.body || (contenitore?.contains(a) ?? false);
  }

  function restituisciFocus(): void {
    const el = ritorno?.();
    if (!el) return;
    const prova = (): boolean => {
      if (!el.isConnected || !focusPerso()) return true; // l'utente e' gia' altrove: non rubare il focus
      if ((el as HTMLButtonElement).disabled) return false;
      el.focus();
      return true;
    };
    if (prova()) return;
    // Disabilitato per ora: riprova quando cambia `disabled`, per un tempo limitato.
    const osservatore = new MutationObserver(() => {
      if (prova()) chiudi();
    });
    const timer = setTimeout(chiudi, ATTESA_RITORNO_MS);
    function chiudi(): void {
      osservatore.disconnect();
      clearTimeout(timer);
    }
    osservatore.observe(el, { attributes: true, attributeFilter: ["disabled"] });
  }

  $effect(() => {
    if (aperto) void tick().then(() => pulsanteNo?.focus());
  });

  /** Scelta fatta da dentro la conferma: chiusa la conferma, il focus torna al pulsante che l'ha aperta. */
  function scegli(fn: () => void): void {
    fn();
    if (ritorno) void tick().then(() => requestAnimationFrame(restituisciFocus));
  }

  function tasto(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      scegli(onNo);
    }
  }
</script>

<div
  class="conferma"
  class:sovrapposta
  {id}
  bind:this={contenitore}
  data-role={ruolo}
  hidden={!aperto}
  role="group"
  aria-labelledby={idDomanda}
>
  <p id={idDomanda}>{domanda}</p>
  <div class="scelte">
    <button type="button" class="no" data-action={azioneNo} bind:this={pulsanteNo} onclick={() => scegli(onNo)} onkeydown={tasto}>{etichettaNo}</button>
    <button type="button" class="si" data-action={azioneSi} onclick={() => scegli(onSi)} onkeydown={tasto}>{etichettaSi}</button>
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
  .conferma.sovrapposta {
    position: absolute;
    inset: 0;
    z-index: 4;
    align-content: center;
    gap: var(--spazio-2);
    padding: var(--spazio-3);
    overflow: auto;
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
