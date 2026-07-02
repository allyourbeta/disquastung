import { describe, it, expect } from "vitest";
import { SupabaseAdapter } from "../../src/api/supabaseAdapter.js";

// No VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set in this test env,
// so every method must no-op safely rather than throw or attempt a
// connection -- this is the "dormant" contract the spec requires.
describe("SupabaseAdapter (dormant, no env vars)", () => {
  it("imports cleanly and constructs", () => {
    expect(() => new SupabaseAdapter()).not.toThrow();
  });

  it("recordAnswer no-ops without throwing", async () => {
    const adapter = new SupabaseAdapter();
    await expect(
      adapter.recordAnswer({ square: "a1", drill: "color", correct: true, attempts: 1 })
    ).resolves.toBeUndefined();
  });

  it("getSquareStats returns {} without throwing", async () => {
    const adapter = new SupabaseAdapter();
    await expect(adapter.getSquareStats()).resolves.toEqual({});
  });

  it("resetStats no-ops without throwing", async () => {
    const adapter = new SupabaseAdapter();
    await expect(adapter.resetStats()).resolves.toBeUndefined();
  });
});
