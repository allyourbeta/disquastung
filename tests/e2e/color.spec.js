import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { squareColor } from "../../src/engine/board.js";
import { attachConsoleGuard, disableAutoAdvance } from "./helpers.js";

const messages = JSON.parse(
  readFileSync(fileURLToPath(new URL("../golden/messages.json", import.meta.url)), "utf8")
);

test("color: wrong x3 shows recorded hints, then correct shows verdict", async ({ page }) => {
  const errors = attachConsoleGuard(page);
  await disableAutoAdvance(page);
  await page.goto("/color.html");

  const squareEl = page.locator(".squares-container .square-display");
  await expect(squareEl).not.toHaveText("");
  const square = (await squareEl.textContent()).trim();
  const correct = squareColor(square);
  const wrong = correct === "light" ? "dark" : "light";

  const wrongBtn = page.locator(`.option-button[value="${wrong}"]`);
  const correctBtn = page.locator(`.option-button[value="${correct}"]`);
  const feedback = page.locator(".js-feedback.alert-danger");

  await wrongBtn.click();
  await expect(feedback).toHaveText(messages.color["1"]);
  await wrongBtn.click();
  await expect(feedback).toHaveText(messages.color["2"]);
  await wrongBtn.click();
  await expect(feedback).toHaveText(messages.color["3"]);

  await correctBtn.click();
  await expect(page.locator(".result-correct")).toBeVisible();
  await expect(page.locator(".result-correct")).toHaveText("CORRECT!");
  await expect(page.locator("#chessboard-container .mini-chessboard")).toBeVisible();

  // Next-question flow: auto-advance is off, so the Next button must appear
  // and clicking it returns to a fresh question.
  const nextBtn = page.locator(".result-next");
  await expect(nextBtn).toBeVisible();
  await nextBtn.click();
  await expect(page.locator(".question-section")).toBeVisible();
  await expect(squareEl).not.toHaveText("");

  expect(errors).toEqual([]);
});
