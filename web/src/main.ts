import { mount } from "svelte";
import "./ui/tema.css";
import "./ui/pulsanti.css";
import App from "./App.svelte";
import * as audio from "./audio/audio";
import { store } from "./ui/state.svelte";
import { applicaTema } from "./ui/tema";

declare global {
  interface Window {
    __reverseur?: { store: typeof store };
  }
}

applicaTema();

// Modalita' test (E2E): spia su AudioBufferSourceNode e store esposto.
if (new URLSearchParams(window.location.search).has("test")) {
  audio.enableTestSpy();
  window.__reverseur = { store };
}

const bersaglio = document.getElementById("radice");
if (!bersaglio) throw new Error("Elemento #radice mancante");

export default mount(App, { target: bersaglio });
