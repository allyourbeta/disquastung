import { describe, it, expect } from "vitest";
import { weightedRandomSquare } from "../../src/engine/select.js";
import { FILES, RANKS } from "../../src/engine/board.js";

const ALL_SQUARES = FILES.flatMap((f) => RANKS.map((r) => f + r));
const CENTER_SAMPLE = ["d4", "e5", "c3", "f6"]; // all in files c-f, ranks 3-6
const CORNER_SAMPLE = ["a1", "h1", "a8", "h8"];

function draw(n, stats) {
  const counts = {};
  for (let i = 0; i < n; i++) {
    const sq = weightedRandomSquare(stats);
    counts[sq] = (counts[sq] || 0) + 1;
  }
  return counts;
}

describe("weightedRandomSquare", () => {
  it("draws all 64 squares given enough samples", () => {
    const counts = draw(20000, {});
    expect(Object.keys(counts).length).toBe(64);
    for (const sq of ALL_SQUARES) expect(counts[sq]).toBeGreaterThan(0);
  });

  it("favors central squares over corners by roughly 1.5x with empty stats", () => {
    const counts = draw(20000, {});
    const centerAvg = CENTER_SAMPLE.reduce((s, sq) => s + counts[sq], 0) / CENTER_SAMPLE.length;
    const cornerAvg = CORNER_SAMPLE.reduce((s, sq) => s + counts[sq], 0) / CORNER_SAMPLE.length;
    const ratio = centerAvg / cornerAvg;
    expect(ratio).toBeGreaterThan(1.25);
    expect(ratio).toBeLessThan(1.75);
  });

  it("raises frequency for a square with a high miss count", () => {
    const stats = { a1: { seen: 10, misses: 3, lastMissAt: null } }; // corner, missBoost capped at 1.5
    const counts = draw(20000, stats);
    const missedFreq = counts["a1"];
    const plainCornerFreq = counts["h8"]; // corner, no misses
    expect(missedFreq).toBeGreaterThan(plainCornerFreq * 1.5);
  });

  it("never starves a square (weight always >= 1)", () => {
    // A square with a huge miss count still has bounded weight (missBoost
    // caps at 1.5), and every square keeps base weight 1 regardless.
    const stats = { a1: { seen: 1000, misses: 1000, lastMissAt: null } };
    const counts = draw(5000, stats);
    expect(counts["h1"]).toBeGreaterThan(0);
  });
});
