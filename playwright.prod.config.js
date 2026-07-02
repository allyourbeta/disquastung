import { defineConfig, devices } from "@playwright/test";

// Runs the Phase 5 smoke subset against a deployed URL instead of a local
// preview server. Usage: DEPLOY_URL=https://... npx playwright test --config=playwright.prod.config.js
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /prod-smoke\.spec\.js/,
  reporter: "list",
  use: {
    baseURL: process.env.DEPLOY_URL || "https://disquastung.vercel.app",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
