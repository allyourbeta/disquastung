import { test, expect } from "@playwright/test";
import { attachConsoleGuard } from "./helpers.js";

test("PWA: manifest is served and linked", async ({ page }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBe("/manifest.webmanifest");

  const res = await page.request.get(href);
  expect(res.ok()).toBeTruthy();
  const manifest = await res.json();
  expect(manifest.name).toBe("Disquastung");
  expect(manifest.short_name).toBe("Disquastung");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
});

test("PWA: service worker registers and activates", async ({ page }) => {
  const errors = attachConsoleGuard(page);
  await page.goto("/");

  const active = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false;
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active;
  });
  expect(active).toBe(true);

  expect(errors).toEqual([]);
});

test("PWA: audio clips are served from the precache when the network is blocked", async ({ page, context }) => {
  // First load: let the service worker install and precache the app shell +
  // all 64 clips (generateSW precaches everything up front, not lazily).
  // Precache entries are keyed with a `?__WB_REVISION__=...` query workbox
  // appends itself, so match by pathname rather than exact URL.
  await page.goto("/color.html");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const keys = await caches.keys();
          for (const k of keys) {
            const cache = await caches.open(k);
            const reqs = await cache.keys();
            if (reqs.some((r) => new URL(r.url).pathname === "/audio/squares/a1.m4a")) return true;
          }
          return false;
        }),
      { timeout: 15000 }
    )
    .toBe(true);

  // Now cut off the network for clip requests entirely and reload -- if the
  // clip is truly precached, the fetch resolves from Cache Storage without
  // ever reaching the network, so the abort rule never fires.
  await context.route("**/audio/squares/**", (route) => route.abort());
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);

  const result = await page.evaluate(async () => {
    const res = await fetch("/audio/squares/a1.m4a");
    return { ok: res.ok, status: res.status };
  });
  expect(result.ok).toBe(true);

  // The page itself must still render fully offline-for-audio too.
  await expect(page.locator(".squares-container .square-display")).not.toHaveText("");
});
