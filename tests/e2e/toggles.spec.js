import { test, expect } from "@playwright/test";
import { attachConsoleGuard } from "./helpers.js";

test("Auto toggle flips and persists to localStorage on every drill", async ({ page }) => {
  for (const path of ["/color.html", "/knight.html", "/bishop.html"]) {
    const errors = attachConsoleGuard(page);
    await page.goto(path);
    const autoToggle = page.locator(".navigation-section").getByText("Auto");
    await expect(autoToggle).toBeVisible();

    const before = await page.evaluate(() => localStorage.getItem("chess-auto-advance"));
    await autoToggle.click();
    const after = await page.evaluate(() => localStorage.getItem("chess-auto-advance"));
    expect(after).not.toBe(before);

    expect(errors).toEqual([]);
  }
});

test("Speak toggle only renders on the color drill", async ({ page }) => {
  await page.goto("/color.html");
  await expect(page.locator(".navigation-section").getByText("Speak")).toBeVisible();

  await page.goto("/knight.html");
  await expect(page.locator(".navigation-section").getByText("Speak")).toHaveCount(0);

  await page.goto("/bishop.html");
  await expect(page.locator(".navigation-section").getByText("Speak")).toHaveCount(0);
});

test("Speak toggle flips and persists across reload", async ({ page }) => {
  await page.goto("/color.html");
  const speakToggle = page.locator(".navigation-section").getByText("Speak");
  await expect(speakToggle).toBeVisible();

  const before = await page.evaluate(() => localStorage.getItem("chess-speak"));
  await speakToggle.click();
  const afterClick = await page.evaluate(() => localStorage.getItem("chess-speak"));
  expect(afterClick).not.toBe(before);

  await page.reload();
  const afterReload = await page.evaluate(() => localStorage.getItem("chess-speak"));
  expect(afterReload).toBe(afterClick);
});
