import { test, expect } from "@playwright/test";

// Phase 1 gate: static shell renders with zero console errors. Buttons will
// fail to fetch /api/... at this phase (no backend wired yet) -- that's
// expected and not asserted against here.
const PAGES = [
  { path: "/", title: /Disquastung/, bodyClass: null },
  { path: "/color.html", title: /Square Color/, bodyClass: "game-color" },
  { path: "/knight.html", title: /Knight Training/, bodyClass: "game-knight" },
  { path: "/bishop.html", title: /Bishop Training/, bodyClass: "game-bishop" },
];

for (const p of PAGES) {
  test(`${p.path} renders static shell with no console errors`, async ({ page }) => {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(String(err)));

    await page.goto(p.path);
    await expect(page).toHaveTitle(p.title);
    if (p.bodyClass) {
      await expect(page.locator("body")).toHaveClass(new RegExp(p.bodyClass));
    }
    expect(errors).toEqual([]);
  });
}
