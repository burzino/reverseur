<script lang="ts" module>
  // Icone SVG in linea (Material Symbols, 24 px): niente emoji, che su iOS cambiano aspetto.
  const PERCORSI = {
    registra: "M12 6a6 6 0 1 0 0 12a6 6 0 1 0 0-12z",
    stop: "M7 7h10v10H7z",
    contrario: "M11 18V6l-8.5 6L11 18zm.5-6 8.5 6V6l-8.5 6z",
    play: "M8 5v14l11-7z",
    lucchetto:
      "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z",
    occhio:
      "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
    nuova:
      "M17.65 6.35A7.958 7.958 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
    scarica: "M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z",
    giusto: "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    sbagliato:
      "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    aiuto:
      "M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z",
    chiudi:
      "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    microfono:
      "M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z",
  } as const;
  export type NomeIcona = keyof typeof PERCORSI;
</script>

<script lang="ts">
  interface Props {
    nome: NomeIcona;
    misura?: number;
  }
  let { nome, misura = 24 }: Props = $props();
</script>

<svg viewBox="0 0 24 24" width={misura} height={misura} aria-hidden="true" focusable="false">
  <path fill="currentColor" d={PERCORSI[nome]} />
</svg>

<style>
  svg {
    flex: none;
    display: block;
  }
</style>
