import { describe, it, expect, beforeEach } from "vitest";

// vitest's default environment is Node (no DOM), so shim the tiny slice of
// localStorage the adapter uses rather than pulling in a jsdom dependency.
function installLocalStorageShim() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
}

installLocalStorageShim();
const { LocalAdapter } = await import("../../src/api/localAdapter.js");

describe("LocalAdapter", () => {
  beforeEach(() => {
    installLocalStorageShim();
  });

  it("tracks seen/misses per square and persists across instances", async () => {
    const a = new LocalAdapter();
    await a.recordAnswer({ square: "a1", drill: "color", correct: false, attempts: 1 });
    await a.recordAnswer({ square: "a1", drill: "color", correct: true, attempts: 2 });

    const b = new LocalAdapter(); // separate instance, same backing store
    const stats = await b.getSquareStats();
    expect(stats.a1.seen).toBe(2);
    expect(stats.a1.misses).toBe(1);
    expect(stats.a1.lastMissAt).not.toBeNull();
  });

  it("resetStats clears everything", async () => {
    const a = new LocalAdapter();
    await a.recordAnswer({ square: "b2", drill: "color", correct: false, attempts: 1 });
    await a.resetStats();
    const stats = await a.getSquareStats();
    expect(stats).toEqual({});
  });
});
