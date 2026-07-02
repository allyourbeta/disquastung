// Pure board primitives. No DOM, no storage. Ported from legacy/app/routes.py.

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
export const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"];

export function squareToCoord(square) {
  return [FILES.indexOf(square[0]), parseInt(square[1], 10) - 1];
}

export function coordToSquare(x, y) {
  return FILES[x] + (y + 1);
}

export function squareColor(square) {
  const [fileIndex, rankIndex] = squareToCoord(square);
  return (fileIndex + rankIndex) % 2 === 0 ? "dark" : "light";
}

export function randomSquare() {
  const f = FILES[Math.floor(Math.random() * FILES.length)];
  const r = RANKS[Math.floor(Math.random() * RANKS.length)];
  return f + r;
}
