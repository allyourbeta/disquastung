#!/usr/bin/env python3
"""Golden-master fixture generator for the Vite/JS port.

Imports the Flask app's pure logic functions directly (no HTTP, no session) and
dumps deterministic JSON fixtures the JS engine must match 100%. Re-runnable;
fixed seed. Run with the Flask app's real deps installed (see .golden-venv/).

IMPORTANT: this is the definition of correct behavior for the port. If the JS
mismatches a fixture, the JS is wrong -- never edit a fixture to make a test
pass.
"""
import json
import os
import random
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# legacy/app's own internals do `from app import routes` (absolute, top-level
# "app"), so put legacy/ on the path -- this also still works pre-move (Phase
# 0), when "app" lives directly at REPO_ROOT and legacy/ doesn't exist yet.
sys.path.insert(0, os.path.join(REPO_ROOT, "legacy"))
sys.path.insert(0, REPO_ROOT)

from app.routes import (
    knight_path, bishop_path, bishop_2_move_path,
    _knight_hint, _bishop_hint, _color_hint, _FILES, _RANKS,
)

SEED = 20260702
OUT_DIR = os.path.join(REPO_ROOT, "tests", "golden")

ALL_SQUARES = [f + r for f in _FILES for r in _RANKS]


def square_color(square):
    file_index = _FILES.index(square[0])
    rank_index = int(square[1]) - 1
    return "dark" if (file_index + rank_index) % 2 == 0 else "light"


def compute_bishop(a, b):
    """Mirrors the branching in app.routes.api_bishop_new exactly."""
    file_diff = abs(_FILES.index(a[0]) - _FILES.index(b[0]))
    rank_diff = abs(int(a[1]) - int(b[1]))
    if file_diff == rank_diff and file_diff > 0:
        return 1, bishop_path(a, b)
    elif (file_diff + rank_diff) % 2 == 0:
        return 2, bishop_2_move_path(a, b)
    else:
        return -1, None


def gen_colors():
    return [{"square": sq, "correct_color": square_color(sq)} for sq in ALL_SQUARES]


def gen_knight():
    rng = random.Random(SEED)
    cases = []
    edge_cases = [
        ("a1", "a1"), ("h8", "h8"), ("a1", "h8"),
        ("a1", "a2"), ("a1", "b1"), ("a1", "b2"),
        ("h8", "h7"), ("h8", "g8"), ("h8", "g7"),
    ]
    for a, b in edge_cases:
        path = knight_path(a, b)
        cases.append({"square_a": a, "square_b": b, "correct_moves": len(path) - 1, "path": path})
    for _ in range(300):
        a = rng.choice(ALL_SQUARES)
        b = rng.choice(ALL_SQUARES)
        path = knight_path(a, b)
        cases.append({"square_a": a, "square_b": b, "correct_moves": len(path) - 1, "path": path})
    return cases


def gen_bishop():
    rng = random.Random(SEED + 1)
    cases = []
    edge_cases = [
        ("a1", "a1"),   # same square (faithful port: routes.py yields 2 via the 2-move branch)
        ("a1", "h8"),   # same long diagonal, 1 move
        ("a1", "h1"),   # opposite color, -1
        ("a1", "a2"),   # orthogonal-adjacent, opposite color, -1
        ("a1", "b2"),   # diagonal-adjacent, 1 move
        ("a1", "b1"),   # opposite color, -1
        ("h8", "h8"),   # same square, other corner
    ]
    for a, b in edge_cases:
        moves, path = compute_bishop(a, b)
        cases.append({"square_a": a, "square_b": b, "correct_moves": moves, "path": path})
    for _ in range(300):
        a = rng.choice(ALL_SQUARES)
        b = rng.choice(ALL_SQUARES)
        moves, path = compute_bishop(a, b)
        cases.append({"square_a": a, "square_b": b, "correct_moves": moves, "path": path})
    return cases


def gen_messages():
    attempt_counts = [1, 2, 3, 4, 5, 9]
    return {
        "knight": {str(n): _knight_hint(n) for n in attempt_counts},
        "bishop": {str(n): _bishop_hint(n) for n in attempt_counts},
        "color": {str(n): _color_hint(n) for n in attempt_counts},
    }


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    fixtures = {
        "colors.json": gen_colors(),
        "knight.json": gen_knight(),
        "bishop.json": gen_bishop(),
        "messages.json": gen_messages(),
    }
    for name, data in fixtures.items():
        path = os.path.join(OUT_DIR, name)
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
            f.write("\n")
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
