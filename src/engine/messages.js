// Attempt-count hint strings, ported verbatim from legacy/app/routes.py's
// _knight_hint / _bishop_hint / _color_hint. n is the 1-indexed wrong-attempt
// count. Wording must not change (matches recorded speech vocabulary rules).

export function knightHint(n) {
  if (n === 1) return "Incorrect. Try again.";
  if (n === 2) return "Still incorrect. Think about the knight's L-shaped moves.";
  if (n === 3) return "Not quite right. Remember, knights move in an L: 2 squares in one direction, 1 in perpendicular.";
  return `Incorrect attempt #${n}. Keep trying - you've got this.`;
}

export function bishopHint(n) {
  if (n === 1) return "Incorrect. Try again.";
  if (n === 2) return "Still incorrect. Think about diagonal movement patterns.";
  if (n === 3) return "Not quite right. Bishops only move diagonally and can't change square colors.";
  return `Incorrect attempt #${n}. Consider the diagonal paths.`;
}

export function colorHint(n) {
  if (n === 1) return "Incorrect. Try again.";
  if (n === 2) return "Still incorrect. Think about the checkerboard pattern.";
  if (n === 3) return "Not quite right. Remember: a1 is a dark square, pattern alternates from there.";
  return `Incorrect attempt #${n}. Visualize the board pattern.`;
}
