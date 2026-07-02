import random
from collections import deque

col_to_letter = {1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G', 8: 'H'}
letter_to_col = {v: k for k, v in col_to_letter.items()}

def generate_random_square():
    """Generates a random square on an 8x8 chessboard with lettered columns.""" 
    return f"{col_to_letter[random.randint(1, 8)]}{random.randint(1, 8)}"

def is_valid(c, r):
    """Checks if the given column and row are within the chessboard boundaries."""
    return 1 <= c <= 8 and 1 <= r <= 8

def square_color(square):
    """Determines the color of a given square on the chessboard."""
    col, row = letter_to_col[square[0]], int(square[1])
    return "dark" if (col + row) % 2 == 0 else "light"

def knight_moves(start, end):
    """Calculates the minimum number of moves required for a knight to move from start to end and stores the path."""
    directions = [(2, 1), (2, -1), (-2, 1), (-2, -1),
                  (1, 2), (1, -2), (-1, 2), (-1, -2)]

    start_c, start_r = letter_to_col[start[0]], int(start[1])
    end_c, end_r = letter_to_col[end[0]], int(end[1])

    queue = deque([(start_c, start_r, 0, [(start_c, start_r)])])
    visited = set()
    visited.add((start_c, start_r))

    while queue:
        c, r, moves, path = queue.popleft()

        if (c, r) == (end_c, end_r):
            return moves, [f"{col_to_letter[pos[0]]}{pos[1]}" for pos in path]

        for dc, dr in directions:
            nc, nr = c + dc, r + dr
            if is_valid(nc, nr) and (nc, nr) not in visited:
                visited.add((nc, nr))
                queue.append((nc, nr, moves + 1, path + [(nc, nr)]))

def bishop_moves(start, end):
    """Calculates the minimum number of moves required for a bishop to move from start to end and stores the path."""
    start_c, start_r = letter_to_col[start[0]], int(start[1])
    end_c, end_r = letter_to_col[end[0]], int(end[1])

    # Check if the start and end squares are the same color
    if (start_c + start_r) % 2 != (end_c + end_r) % 2:
        return 0, []  # 0 indicates impossible move

    # Direct move if on the same diagonal
    if abs(start_c - end_c) == abs(start_r - end_r):
        return 1, [start, end]

    # If not on the same diagonal, it's always 2 moves
    # Find an intermediate square
    for c in range(1, 9):
        for r in range(1, 9):
            if abs(start_c - c) == abs(start_r - r) and abs(end_c - c) == abs(end_r - r):
                intermediate_square = f"{col_to_letter[c]}{r}"
                return 2, [start, intermediate_square, end]

    # This should never happen, but just in case
    return 0, []
