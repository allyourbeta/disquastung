import { describe, it, expect } from "vitest";
import colorFixtures from "../golden/colors.json";
import knightFixtures from "../golden/knight.json";
import bishopFixtures from "../golden/bishop.json";
import messageFixtures from "../golden/messages.json";
import { squareColor } from "../../src/engine/board.js";
import { knightPath, knightMoves } from "../../src/engine/knight.js";
import { bishopPath, bishopMoves } from "../../src/engine/bishop.js";
import { knightHint, bishopHint, colorHint } from "../../src/engine/messages.js";

describe("golden master: color (all 64 squares)", () => {
  for (const { square, correct_color } of colorFixtures) {
    it(`${square} -> ${correct_color}`, () => {
      expect(squareColor(square)).toBe(correct_color);
    });
  }
});

describe("golden master: knight", () => {
  it(`matches every one of ${knightFixtures.length} fixtures (moves + path)`, () => {
    for (const { square_a, square_b, correct_moves, path } of knightFixtures) {
      expect(knightMoves(square_a, square_b)).toBe(correct_moves);
      expect(knightPath(square_a, square_b)).toEqual(path);
    }
  });
});

describe("golden master: bishop", () => {
  it(`matches every one of ${bishopFixtures.length} fixtures (moves + path)`, () => {
    for (const { square_a, square_b, correct_moves, path } of bishopFixtures) {
      expect(bishopMoves(square_a, square_b)).toBe(correct_moves);
      expect(bishopPath(square_a, square_b)).toEqual(path);
    }
  });
});

describe("golden master: hint messages", () => {
  it("knight hints match at every recorded attempt count", () => {
    for (const [n, msg] of Object.entries(messageFixtures.knight)) {
      expect(knightHint(Number(n))).toBe(msg);
    }
  });
  it("bishop hints match at every recorded attempt count", () => {
    for (const [n, msg] of Object.entries(messageFixtures.bishop)) {
      expect(bishopHint(Number(n))).toBe(msg);
    }
  });
  it("color hints match at every recorded attempt count", () => {
    for (const [n, msg] of Object.entries(messageFixtures.color)) {
      expect(colorHint(Number(n))).toBe(msg);
    }
  });
});
