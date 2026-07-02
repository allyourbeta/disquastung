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
import { weightedRandomSquare } from "./engine/select.js";
import * as storage from "./api/storage.js";

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

async function pickColorSquare() {
  const stats = await storage.getSquareStats();
  const avoid = new Set(recentSquares);
  for (let i = 0; i < 200; i++) {
    const s = weightedRandomSquare(stats);
    if (!avoid.has(s)) return s;
  }
  return weightedRandomSquare(stats); // pathological fallback (should never hit)
}

// Knight/bishop questions involve two squares; a wrong answer implicates
// both equally, so both get credited (weighted selection only reads this
// for the color drill, but the interface is drill-generic).
async function recordPairAnswer(drill, a, b, correct, attempts) {
  await storage.recordAnswer({ square: a, drill, correct, attempts });
  await storage.recordAnswer({ square: b, drill, correct, attempts });
}

const state = {
  square: null, correct_color: null, color_attempts: 0,
  square_a: null, square_b: null, correct_moves: null,
  knight_path: null, bishop_path: null,
  knight_attempts: 0, bishop_attempts: 0,
};

async function colorNew() {
  const square = await pickColorSquare();
  rememberSquares(square);
  state.square = square;
  state.correct_color = squareColor(square);
  state.color_attempts = 0;
  return { square };
}

async function colorCheck(answer) {
  const user = String(answer || "").trim();
  const correct = user === state.correct_color;
  const n = correct ? state.color_attempts : ++state.color_attempts;
  await storage.recordAnswer({ square: state.square, drill: "color", correct, attempts: n });
  if (correct) {
    return { correct: true, square: state.square, correct_color: state.correct_color };
  }
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

async function knightCheck(answer) {
  const user = Number.parseInt(answer, 10);
  if (Number.isNaN(user)) return { error: "invalid" };
  const correct = user === state.correct_moves;
  const n = correct ? state.knight_attempts : ++state.knight_attempts;
  await recordPairAnswer("knight", state.square_a, state.square_b, correct, n);
  if (correct) {
    return { correct: true, piece: "Knight", path: state.knight_path, square_a: state.square_a, square_b: state.square_b };
  }
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

async function bishopCheck(answer) {
  const user = Number.parseInt(answer, 10);
  if (Number.isNaN(user)) return { error: "invalid" };
  const correct = user === state.correct_moves;
  const n = correct ? state.bishop_attempts : ++state.bishop_attempts;
  await recordPairAnswer("bishop", state.square_a, state.square_b, correct, n);
  if (correct) {
    return { correct: true, piece: "Bishop", path: state.bishop_path, square_a: state.square_a, square_b: state.square_b };
  }
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
