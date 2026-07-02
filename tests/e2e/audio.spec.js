import { test, expect } from "@playwright/test";
import { squareColor } from "../../src/engine/board.js";
import { attachConsoleGuard } from "./helpers.js";

test("Speak ON: answering correctly requests the square's audio clip", async ({ page }) => {
  const errors = attachConsoleGuard(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("chess-speak", "true");
    window.localStorage.setItem("chess-auto-advance", "false");
  });

  const requestedClips = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/audio/squares/")) requestedClips.push(url);
  });

  await page.goto("/color.html");

  const squareEl = page.locator(".squares-container .square-display");
  await expect(squareEl).not.toHaveText("");
  const square = (await squareEl.textContent()).trim().toLowerCase();
  const correct = squareColor(square);

  await page.locator(`.option-button[value="${correct}"]`).click();

  await expect
    .poll(() => requestedClips.some((u) => u.includes(`/audio/squares/${square}.m4a`)), {
      timeout: 5000,
    })
    .toBe(true);

  expect(errors).toEqual([]);
});
