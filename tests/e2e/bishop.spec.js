import { test, expect } from "@playwright/test";
import { bishopMoves } from "../../src/engine/bishop.js";
import { attachConsoleGuard, disableAutoAdvance, readSquareTexts } from "./helpers.js";

async function currentPair(page) {
  const squares = page.locator(".squares-container .square-display");
  await expect(squares.nth(0)).not.toHaveText("");
  await expect(squares.nth(1)).not.toHaveText("");
  const [a, b] = await readSquareTexts(page);
  return [a.trim(), b.trim()];
}

test("bishop: completes a full correct round", async ({ page }) => {
  const errors = attachConsoleGuard(page);
  await disableAutoAdvance(page);
  await page.goto("/bishop.html");

  const [a, b] = await currentPair(page);
  const correct = bishopMoves(a, b);

  await page.locator(`.option-button[value="${correct}"]`).click();

  await expect(page.locator(".result-correct")).toHaveText("CORRECT!");
  await expect(page.locator("#chessboard-container .mini-chessboard")).toBeVisible();

  expect(errors).toEqual([]);
});

test("bishop: 'not possible' (-1) case answers N/A correctly", async ({ page }) => {
  const errors = attachConsoleGuard(page);
  await disableAutoAdvance(page);
  await page.goto("/bishop.html");

  let a, b, correct;
  for (let attempt = 0; attempt < 60; attempt++) {
    [a, b] = await currentPair(page);
    correct = bishopMoves(a, b);
    if (correct === -1) break;
    await page.reload();
  }
  expect(correct, "expected to find a -1 (not possible) pair within 60 reloads").toBe(-1);

  await page.locator(`.option-button[value="-1"]`).click();

  await expect(page.locator(".result-correct")).toHaveText("CORRECT!");

  expect(errors).toEqual([]);
});
