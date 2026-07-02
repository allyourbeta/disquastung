import { test, expect } from "@playwright/test";
import { squareColor } from "../../src/engine/board.js";
import { attachConsoleGuard, disableAutoAdvance } from "./helpers.js";

const KEY_VALUE = { w: "light", l: "light", b: "dark", d: "dark" };

for (const key of Object.keys(KEY_VALUE)) {
  test(`color keyboard: "${key}" answers ${KEY_VALUE[key]}`, async ({ page }) => {
    const errors = attachConsoleGuard(page);
    await disableAutoAdvance(page);
    await page.goto("/color.html");

    const squareEl = page.locator(".squares-container .square-display");
    await expect(squareEl).not.toHaveText("");
    const square = (await squareEl.textContent()).trim();
    const correct = squareColor(square);
    const value = KEY_VALUE[key];

    await page.keyboard.press(key);

    if (value === correct) {
      await expect(page.locator(".result-correct")).toHaveText("CORRECT!");
    } else {
      await expect(page.locator(".js-feedback.alert-danger")).toHaveText("Incorrect. Try again.");
    }

    expect(errors).toEqual([]);
  });
}

test("color keyboard: Enter and Space both advance from the result screen", async ({ page }) => {
  const errors = attachConsoleGuard(page);
  await disableAutoAdvance(page);
  await page.goto("/color.html");

  for (const key of ["Enter", " "]) {
    const squareEl = page.locator(".squares-container .square-display");
    await expect(squareEl).not.toHaveText("");
    const square = (await squareEl.textContent()).trim();
    const correct = squareColor(square);

    await page.locator(`.option-button[value="${correct}"]`).click();
    await expect(page.locator(".result-correct")).toHaveText("CORRECT!");

    await page.keyboard.press(key);
    await expect(page.locator(".question-section")).toBeVisible();
    await expect(squareEl).not.toHaveText("");
  }

  expect(errors).toEqual([]);
});
