<script lang="ts">
  // VU-meter a segmenti: decorativo (il timer e lo stato danno la stessa informazione a parole).
  interface Props {
    livello: number;
    attivo: boolean;
  }
  let { livello, attivo }: Props = $props();

  const SEGMENTI = 16;
  // curva percettiva: i livelli bassi della voce restano visibili
  const accesi = $derived(attivo ? Math.round(Math.min(1, Math.sqrt(Math.max(0, livello))) * SEGMENTI) : 0);
</script>

<div class="vu" data-role="vu" aria-hidden="true" hidden={!attivo}>
  {#each { length: SEGMENTI } as _, i (i)}
    <span class="segmento" class:acceso={i < accesi} class:alto={i >= SEGMENTI - 3}></span>
  {/each}
</div>

<style>
  .vu {
    display: grid;
    grid-template-columns: repeat(16, 1fr);
    gap: 3px;
    height: 14px;
  }
  .vu[hidden] {
    display: none;
  }
  .segmento {
    border-radius: 3px;
    background: color-mix(in srgb, var(--colore-su-superficie) 14%, transparent);
    transition: background-color 60ms linear;
  }
  .segmento.acceso {
    background: var(--accento);
  }
  .segmento.alto.acceso {
    background: var(--colore-errore);
  }
</style>
