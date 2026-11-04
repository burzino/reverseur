import { test, expect, type Page } from "@playwright/test";

// PWA: manifest valido sotto /reverseur/, service worker attivo, app usabile offline.
// Il SW esiste solo nel build di produzione (vite preview), che è quello avviato da playwright.config.ts.

async function waitForController(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise<void>((resolve) =>
      navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }),
    );
  });
}

test.describe("PWA", () => {
  test("il manifest è collegato, valido e le icone rispondono 200", async ({ page, request, baseURL }) => {
    await page.goto("./");
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(href, "link rel=manifest mancante").toBeTruthy();
    // Percorso relativo o sotto /reverseur/: mai la radice del dominio.
    expect(href!.startsWith("/") && !href!.startsWith("/reverseur/")).toBe(false);

    const manifestUrl = new URL(href!, page.url()).href;
    const res = await request.get(manifestUrl);
    expect(res.status()).toBe(200);
    const m = await res.json();

    expect(m.name).toBe("Reverseur");
    expect(m.short_name).toBeTruthy();
    expect(m.lang).toBe("it");
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("./");
    expect(m.scope).toBe("./");
    expect(m.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(m.background_color).toMatch(/^#[0-9a-f]{6}$/i);
    // start_url e scope risolti rispetto al manifest restano dentro /reverseur/.
    expect(new URL(m.start_url, manifestUrl).href).toBe(baseURL);
    expect(new URL(m.scope, manifestUrl).href).toBe(baseURL);

    const sizes = m.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(m.icons.some((i: { purpose?: string }) => i.purpose?.includes("maskable"))).toBe(true);

    for (const icon of m.icons as { src: string; type: string }[]) {
      const url = new URL(icon.src, manifestUrl);
      expect(url.pathname.startsWith("/reverseur/"), icon.src).toBe(true);
      const r = await request.get(url.href);
      expect(r.status(), icon.src).toBe(200);
      expect(r.headers()["content-type"], icon.src).toContain(icon.type.split("+")[0]);
    }

    // Icone referenziate dall'HTML (apple-touch-icon, favicon), se presenti.
    for (const sel of ['link[rel="apple-touch-icon"]', 'link[rel="icon"]']) {
      for (const h of await page.locator(sel).evaluateAll((els) => els.map((e) => e.getAttribute("href")))) {
        if (!h) continue;
        const r = await request.get(new URL(h, page.url()).href);
        expect(r.status(), `${sel} ${h}`).toBe(200);
      }
    }
  });

  test("il service worker registra, controlla la pagina e l'app si apre offline", async ({ page, context }) => {
    await page.goto("./");
    await expect(page.locator("#slot-A")).toBeVisible();
    await waitForController(page);

    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    expect(new URL(scope).pathname).toBe("/reverseur/");

    await context.setOffline(true);
    try {
      await page.reload();
      await expect(page.locator("#slot-A")).toBeVisible();
      await expect(page.locator("#slot-B")).toBeVisible();
      await expect(page.locator("#reveal")).toHaveCount(1);
      await expect(page.locator("#slot-A")).toHaveAttribute("data-state", "empty");

      // Una URL di navigazione mai vista viene servita dal fallback (index.html in cache).
      await page.goto("./?offline=1");
      await expect(page.locator("#slot-A")).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });
});
