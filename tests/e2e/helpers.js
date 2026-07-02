// Shared Playwright E2E helpers.

export function attachConsoleGuard(page) {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  return errors;
}

// Auto-advance defaults ON; force it OFF so result screens wait for an
// explicit "Next" click instead of a timer, keeping tests deterministic.
export function disableAutoAdvance(page) {
  return page.addInitScript(() => {
    window.localStorage.setItem("chess-auto-advance", "false");
  });
}

export async function readSquareTexts(page) {
  return page.locator(".squares-container .square-display").allTextContents();
}
