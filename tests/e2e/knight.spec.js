import { test, expect } from "@playwright/test";
import { knightMoves } from "../../src/engine/knight.js";
import { attachConsoleGuard, disableAutoAdvance, readSquareTexts } from "./helpers.js";

test("knight: completes a full correct round", async ({ page }) => {
  const errors = attachConsoleGuard(page);
  await disableAutoAdvance(page);
  await page.goto("/knight.html");

  const squares = page.locator(".squares-container .square-display");
  await expect(squares.nth(0)).not.toHaveText("");
  await expect(squares.nth(1)).not.toHaveText("");
  const [a, b] = await readSquareTexts(page);
  const correct = knightMoves(a.trim(), b.trim());

  await page.locator(`.option-button[value="${correct}"]`).click();

  await expect(page.locator(".result-correct")).toHaveText("CORRECT!");
  await expect(page.locator("#chessboard-container .mini-chessboard")).toBeVisible();

  expect(errors).toEqual([]);
});
