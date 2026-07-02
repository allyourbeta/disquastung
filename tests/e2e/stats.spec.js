import { test, expect } from "@playwright/test";
import { squareColor } from "../../src/engine/board.js";
import { attachConsoleGuard, disableAutoAdvance } from "./helpers.js";

async function readStats(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("disquastung-stats");
    return raw ? JSON.parse(raw) : {};
  });
}

async function answerCurrent(page, correct) {
  const squareEl = page.locator(".squares-container .square-display");
  await expect(squareEl).not.toHaveText("");
  const square = (await squareEl.textContent()).trim();
  const answer = correct ? squareColor(square) : squareColor(square) === "light" ? "dark" : "light";
  await page.locator(`.option-button[value="${answer}"]`).click();
  return square;
}

test("color stats persist to localStorage and survive reload", async ({ page }) => {
  const errors = attachConsoleGuard(page);
  await disableAutoAdvance(page);
  await page.goto("/color.html");

  // Round 1: one wrong answer, then correct.
  const square1 = await answerCurrent(page, false);
  await expect(page.locator(".js-feedback.alert-danger")).toBeVisible();
  await answerCurrent(page, true);
  await expect(page.locator(".result-correct")).toHaveText("CORRECT!");
  await page.locator(".result-next").click();

  // Round 2: correct on the first try.
  await expect(page.locator(".question-section")).toBeVisible();
  await answerCurrent(page, true);
  await expect(page.locator(".result-correct")).toHaveText("CORRECT!");

  const stats = await readStats(page);
  expect(Object.keys(stats).length).toBeGreaterThan(0);
  expect(stats[square1]).toBeTruthy();
  expect(stats[square1].misses).toBeGreaterThanOrEqual(1);
  const totalSeen = Object.values(stats).reduce((sum, s) => sum + s.seen, 0);
  expect(totalSeen).toBeGreaterThanOrEqual(3); // 1 wrong + 1 right (round 1) + 1 right (round 2)

  await page.reload();
  const statsAfterReload = await readStats(page);
  expect(statsAfterReload).toEqual(stats);

  expect(errors).toEqual([]);
});
