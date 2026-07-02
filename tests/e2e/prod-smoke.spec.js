import { test, expect } from "@playwright/test";
import { squareColor } from "../../src/engine/board.js";

// Phase 5 gate subset: page loads, one full color round, clip request fires.
// Uses relative paths only, so it runs against either the local preview
// server (default playwright.config.js) or a deployed URL (playwright.prod.config.js).
const PAGES = [
  { path: "/", title: /Disquastung/ },
  { path: "/color.html", title: /Square Color/ },
  { path: "/knight.html", title: /Knight Training/ },
  { path: "/bishop.html", title: /Bishop Training/ },
];

for (const p of PAGES) {
  test(`prod smoke: ${p.path} loads with no console errors`, async ({ page }) => {
    const errors = [];
    page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
    page.on("pageerror", (err) => errors.push(String(err)));

    await page.goto(p.path);
    await expect(page).toHaveTitle(p.title);
    expect(errors).toEqual([]);
  });
}

test("prod smoke: one full color round + audio clip request", async ({ page }) => {
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push(String(err)));
  await page.addInitScript(() => {
    window.localStorage.setItem("chess-speak", "true");
    window.localStorage.setItem("chess-auto-advance", "false");
  });

  const requestedClips = [];
  page.on("request", (req) => {
    if (req.url().includes("/audio/squares/")) requestedClips.push(req.url());
  });

  await page.goto("/color.html");
  const squareEl = page.locator(".squares-container .square-display");
  await expect(squareEl).not.toHaveText("");
  const square = (await squareEl.textContent()).trim().toLowerCase();
  const correct = squareColor(square);

  await page.locator(`.option-button[value="${correct}"]`).click();
  await expect(page.locator(".result-correct")).toHaveText("CORRECT!");

  await expect
    .poll(() => requestedClips.some((u) => u.includes(`/audio/squares/${square}.m4a`)), { timeout: 5000 })
    .toBe(true);

  expect(errors).toEqual([]);
});
