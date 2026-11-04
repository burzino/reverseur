// Tema dell'interfaccia: Reverseur segue solo il sistema (prefers-color-scheme), con i token di
// tema.css copiati da Agenteur. Lo script in index.html applica lo stesso attributo prima del paint.

function aggiornaMeta(): void {
  const meta = document.querySelector('meta[name="theme-color"]');
  const colore = getComputedStyle(document.documentElement).getPropertyValue("--colore-sfondo").trim();
  if (meta && colore) meta.setAttribute("content", colore);
}

let ascolto = false;

/** Imposta `data-tema="sistema"` e allinea `<meta name="theme-color">` allo sfondo risolto. No-op senza DOM. */
export function applicaTema(): void {
  try {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-tema", "sistema");
    aggiornaMeta();
    if (!ascolto && typeof matchMedia === "function") {
      ascolto = true;
      matchMedia("(prefers-color-scheme: dark)").addEventListener("change", aggiornaMeta);
    }
  } catch {
    /* ambiente senza DOM completo: ignorato */
  }
}
