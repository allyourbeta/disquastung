// Weighted square selection for the COLOR drill only. Deliberately coarse
// per the owner's request -- knight/bishop keep uniform random selection.
import { FILES, RANKS } from "./board.js";

const CENTER_FILES = new Set(["c", "d", "e", "f"]);
const CENTER_RANKS = new Set(["3", "4", "5", "6"]);

function isCenterSquare(square) {
  return CENTER_FILES.has(square[0]) && CENTER_RANKS.has(square[1]);
}

function weight(square, stats) {
  const centerBoost = isCenterSquare(square) ? 0.5 : 0;
  const misses = (stats && stats[square] && stats[square].misses) || 0;
  const missBoost = Math.min(1.5, 0.5 * misses);
  return 1 + centerBoost + missBoost; // always >= 1, no starvation
}

export function weightedRandomSquare(stats) {
  const squares = [];
  for (const f of FILES) for (const r of RANKS) squares.push(f + r);
  const weights = squares.map((sq) => weight(sq, stats));
  const total = weights.reduce((sum, w) => sum + w, 0);

  let roll = Math.random() * total;
  for (let i = 0; i < squares.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return squares[i];
  }
  return squares[squares.length - 1]; // floating-point rounding fallback
}
