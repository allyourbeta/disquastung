// In-browser replacement for the Flask JSON API (app/routes.py's
// /api/{color,knight,bishop}/{new,check} endpoints). Same request/response
// shapes, verified in PROGRESS.md's recon notes. Flask's per-session state
// (attempt counters, current question, recently-seen squares) becomes
// module-level state here -- equivalent scope, since each page load is a
// fresh session exactly like a fresh GET in the old app.
import { FILES, randomSquare, squareColor } from "./engine/board.js";
import { knightPath } from "./engine/knight.js";
import { bishopPath, bishopMoves } from "./engine/bishop.js";
import { knightHint, bishopHint, colorHint } from "./engine/messages.js";

const RECENT_LIMIT = 20; // ported from routes.py's RECENT_LIMIT

let recentSquares = [];

function rememberSquares(...squares) {
  recentSquares = recentSquares.concat(squares).slice(-RECENT_LIMIT);
}

function freshSquare(avoidExtra = []) {
  const avoid = new Set([...recentSquares, ...avoidExtra]);
  for (let i = 0; i < 200; i++) {
    const s = randomSquare();
    if (!avoid.has(s)) return s;
  }
  return randomSquare(); // pathological fallback (should never hit)
}

function freshTwo() {
  const a = freshSquare();
  const b = freshSquare([a]);
  return [a, b];
}

function isOrthogonalAdjacent(a, b) {
  const fd = Math.abs(FILES.indexOf(a[0]) - FILES.indexOf(b[0]));
  const rd = Math.abs(parseInt(a[1], 10) - parseInt(b[1], 10));
  return (fd === 1 && rd === 0) || (fd === 0 && rd === 1);
}

function freshTwoBishop() {
  const a = freshSquare();
  let b;
  for (let i = 0; i < 200; i++) {
    b = freshSquare([a]);
    if (!isOrthogonalAdjacent(a, b)) return [a, b];
  }
  return [a, b]; // pathological fallback (should never hit)
}

// Phase 4 swaps this for weightedRandomSquare(stats) on the color drill only.
function pickColorSquare() {
  return freshSquare();
}

const state = {
  square: null, correct_color: null, color_attempts: 0,
  square_a: null, square_b: null, correct_moves: null,
  knight_path: null, bishop_path: null,
  knight_attempts: 0, bishop_attempts: 0,
};

function colorNew() {
  const square = pickColorSquare();
  rememberSquares(square);
  state.square = square;
  state.correct_color = squareColor(square);
  state.color_attempts = 0;
  return { square };
}

function colorCheck(answer) {
  const user = String(answer || "").trim();
  if (user === state.correct_color) {
    return { correct: true, square: state.square, correct_color: state.correct_color };
  }
  const n = ++state.color_attempts;
  return { correct: false, attempts: n, message: colorHint(n) };
}

function knightNew() {
  const [a, b] = freshTwo();
  rememberSquares(a, b);
  const path = knightPath(a, b);
  state.square_a = a;
  state.square_b = b;
  state.knight_path = path;
  state.correct_moves = path.length - 1;
  state.knight_attempts = 0;
  return { square_a: a, square_b: b };
}

function knightCheck(answer) {
  const user = Number.parseInt(answer, 10);
  if (Number.isNaN(user)) return { error: "invalid" };
  if (user === state.correct_moves) {
    return { correct: true, piece: "Knight", path: state.knight_path, square_a: state.square_a, square_b: state.square_b };
  }
  const n = ++state.knight_attempts;
  return { correct: false, attempts: n, message: knightHint(n) };
}

function bishopNew() {
  const [a, b] = freshTwoBishop();
  rememberSquares(a, b);
  state.square_a = a;
  state.square_b = b;
  state.correct_moves = bishopMoves(a, b);
  state.bishop_path = bishopPath(a, b);
  state.bishop_attempts = 0;
  return { square_a: a, square_b: b };
}

function bishopCheck(answer) {
  const user = Number.parseInt(answer, 10);
  if (Number.isNaN(user)) return { error: "invalid" };
  if (user === state.correct_moves) {
    return { correct: true, piece: "Bishop", path: state.bishop_path, square_a: state.square_a, square_b: state.square_b };
  }
  const n = ++state.bishop_attempts;
  return { correct: false, attempts: n, message: bishopHint(n) };
}

// game.js calls these two by GAME name ('color'|'knight'|'bishop'), mirroring
// the old fetch("/api/" + GAME + "/new"|"/check") call sites almost exactly.
export async function newQuestion(game) {
  if (game === "color") return colorNew();
  if (game === "knight") return knightNew();
  if (game === "bishop") return bishopNew();
  throw new Error(`unknown game: ${game}`);
}

export async function checkAnswer(game, answer) {
  if (game === "color") return colorCheck(answer);
  if (game === "knight") return knightCheck(answer);
  if (game === "bishop") return bishopCheck(answer);
  throw new Error(`unknown game: ${game}`);
}
