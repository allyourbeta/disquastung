from flask import render_template, request, session, jsonify
from app import app
import random


def bishop_2_move_path(start, end):
    """Calculate a 2-move bishop path between squares"""
    def square_to_coord(square):
        return ord(square[0]) - 97, int(square[1]) - 1
    
    def coord_to_square(x, y):
        return chr(x + 97) + str(y + 1)
    
    start_x, start_y = square_to_coord(start)
    end_x, end_y = square_to_coord(end)
    
    # Find intermediate squares that work
    for mid_x in range(8):
        for mid_y in range(8):
            if mid_x == start_x and mid_y == start_y:
                continue
            if mid_x == end_x and mid_y == end_y:
                continue
                
            # Check if start->middle is diagonal
            dx1 = mid_x - start_x
            dy1 = mid_y - start_y
            if abs(dx1) != abs(dy1) or dx1 == 0:
                continue
                
            # Check if middle->end is diagonal  
            dx2 = end_x - mid_x
            dy2 = end_y - mid_y
            if abs(dx2) != abs(dy2) or dx2 == 0:
                continue
                
            # Found a valid 2-move path
            middle = coord_to_square(mid_x, mid_y)
            return [start, middle, end]
    
    return None

def bishop_path(start, end):
    """Calculate the path a bishop takes between two squares"""
    def square_to_coord(square):
        return ord(square[0]) - 97, int(square[1]) - 1
    
    def coord_to_square(x, y):
        return chr(x + 97) + str(y + 1)
    
    start_x, start_y = square_to_coord(start)
    end_x, end_y = square_to_coord(end)
    
    # Check if squares are on same diagonal
    dx = end_x - start_x
    dy = end_y - start_y
    
    if abs(dx) != abs(dy):
        return None  # Not on same diagonal, impossible move
    
    if dx == 0 and dy == 0:
        return [start]  # Same square
    
    # For single-move paths, only return start and end squares
    return [start, end]

def knight_path(start, end):
    def valid_moves(x, y):
        return [(x + 2, y + 1), (x + 2, y - 1), (x - 2, y + 1), (x - 2, y - 1),
                (x + 1, y + 2), (x + 1, y - 2), (x - 1, y + 2), (x - 1, y - 2)]

    def coord_to_square(x, y):
        return chr(x + 97) + str(y + 1)

    def square_to_coord(square):
        return ord(square[0]) - 97, int(square[1]) - 1

    start_x, start_y = square_to_coord(start)
    end_x, end_y = square_to_coord(end)

    queue = [(start_x, start_y, [start])]
    visited = set()

    while queue:
        x, y, path = queue.pop(0)
        if (x, y) == (end_x, end_y):
            return path

        if (x, y) not in visited:
            visited.add((x, y))
            for nx, ny in valid_moves(x, y):
                if 0 <= nx < 8 and 0 <= ny < 8:
                    queue.append((nx, ny, path + [coord_to_square(nx, ny)]))

    return None


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/knight_game', methods=['GET', 'POST'])
def knight_game():
    if request.method == 'POST':
        try:
            user_moves = int(request.form['user_moves'])
        except (ValueError, KeyError):
            error_message = "Invalid input. Please select a valid number of moves."
            square_a = session.get('square_a', 'a1')
            square_b = session.get('square_b', 'a2')
            return render_template('knight_game.html', square_a=square_a, square_b=square_b, message=error_message, correct_moves=session.get('correct_moves'))
        correct_moves = session.get('correct_moves')
        square_a = session.get('square_a')
        square_b = session.get('square_b')
        path = session.get('path')

        if user_moves == correct_moves:
            message = "Correct!"
            return render_template('result.html', correct=True, message=message,
                                   square_a=square_a, square_b=square_b,
                                   correct_moves=correct_moves, piece="Knight",
                                   game_type='knight_game', path=path)
        else:
            # Track attempts for better UX feedback
            attempt_count = session.get('knight_attempts', 0) + 1
            session['knight_attempts'] = attempt_count
            
            if attempt_count == 1:
                error_message = "Incorrect. Try again."
            elif attempt_count == 2:
                error_message = "Still incorrect. Think about the knight's L-shaped moves."
            elif attempt_count == 3:
                error_message = "Not quite right. Remember, knights move in an L: 2 squares in one direction, 1 in perpendicular."
            else:
                error_message = f"Incorrect attempt #{attempt_count}. Keep trying - you've got this."
            
            return render_template('knight_game.html', square_a=square_a, square_b=square_b, message=error_message, correct_moves=session.get('correct_moves'))

    square_a, square_b = _fresh_two()
    _remember_squares(square_a, square_b)

    path = knight_path(square_a, square_b)
    correct_moves = len(path) - 1

    session['correct_moves'] = correct_moves
    session['square_a'] = square_a
    session['square_b'] = square_b
    session['path'] = path
    session['knight_attempts'] = 0  # Reset attempt counter for new game

    return render_template('knight_game.html', square_a=square_a, square_b=square_b, correct_moves=session.get('correct_moves'))

@app.route('/bishop_game', methods=['GET', 'POST'])
def bishop_game():
    if request.method == 'POST':
        try:
            user_moves = int(request.form['user_moves'])
        except (ValueError, KeyError):
            error_message = "Invalid input. Please select a valid number of moves."
            square_a = session.get('square_a', 'a1')
            square_b = session.get('square_b', 'a2')
            return render_template('bishop_game.html', square_a=square_a, square_b=square_b, message=error_message, correct_moves=session.get('correct_moves'))
        correct_moves = session.get('correct_moves')
        square_a = session.get('square_a')
        square_b = session.get('square_b')
        path = session.get('bishop_path')

        if user_moves == correct_moves:
            message = "Correct!"
            return render_template('result.html', correct=True, message=message,
                                   square_a=square_a, square_b=square_b,
                                   correct_moves=correct_moves, piece="Bishop",
                                   start_square=square_a, end_square=square_b,
                                   path=path, game_type='bishop_game')
        else:
            # Track attempts for better UX feedback
            attempt_count = session.get('bishop_attempts', 0) + 1
            session['bishop_attempts'] = attempt_count
            
            if attempt_count == 1:
                error_message = "Incorrect. Try again."
            elif attempt_count == 2:
                error_message = "Still incorrect. Think about diagonal movement patterns."
            elif attempt_count == 3:
                error_message = "Not quite right. Bishops only move diagonally and can't change square colors."
            else:
                error_message = f"Incorrect attempt #{attempt_count}. Consider the diagonal paths."
            
            return render_template('bishop_game.html', square_a=square_a, square_b=square_b, message=error_message, correct_moves=session.get('correct_moves'))

    files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    ranks = ['1', '2', '3', '4', '5', '6', '7', '8']
    square_a, square_b = _fresh_two_bishop()
    _remember_squares(square_a, square_b)

    file_diff = abs(files.index(square_a[0]) - files.index(square_b[0]))
    rank_diff = abs(int(square_a[1]) - int(square_b[1]))

    # Calculate the actual path
    if file_diff == rank_diff and file_diff > 0:
        # Direct diagonal - 1 move
        correct_moves = 1
        path = bishop_path(square_a, square_b)
    elif (file_diff + rank_diff) % 2 == 0:
        # Same color squares - 2 moves possible
        correct_moves = 2
        path = bishop_2_move_path(square_a, square_b)
    else:
        # Different color squares - impossible
        correct_moves = -1
        path = None

    session['correct_moves'] = correct_moves
    session['square_a'] = square_a
    session['square_b'] = square_b
    session['bishop_path'] = path
    session['bishop_attempts'] = 0  # Reset attempt counter for new game

    return render_template('bishop_game.html', square_a=square_a, square_b=square_b, correct_moves=session.get('correct_moves'))


@app.route('/color_game', methods=['GET', 'POST'])
def color_game():
    if request.method == 'POST':
        user_color = request.form['color']
        correct_color = session.get('correct_color')
        square = session.get('square')

        if user_color == correct_color:
            message = "Correct!"
            return render_template('result.html', correct=True, message=message,
                                   square_a=square, correct_color=correct_color,
                                   start_square=square, end_square=square,
                                   piece="Square", game_type='color_game')
        else:
            # Track attempts for better UX feedback
            attempt_count = session.get('color_attempts', 0) + 1
            session['color_attempts'] = attempt_count
            
            if attempt_count == 1:
                error_message = "Incorrect. Try again."
            elif attempt_count == 2:
                error_message = "Still incorrect. Think about the checkerboard pattern."
            elif attempt_count == 3:
                error_message = "Not quite right. Remember: a1 is a dark square, pattern alternates from there."
            else:
                error_message = f"Incorrect attempt #{attempt_count}. Visualize the board pattern."
            
            return render_template('color_game.html', square=square, message=error_message, correct_color=session.get('correct_color'))

    # Generate a random square
    files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    ranks = ['1', '2', '3', '4', '5', '6', '7', '8']
    square = _fresh_square()
    _remember_squares(square)

    # Determine the correct color
    file_index = files.index(square[0])
    rank_index = int(square[1]) - 1
    correct_color = 'dark' if (file_index + rank_index) % 2 == 0 else 'light'  # Fixed color determination

    # Store the correct answer in the session
    session['correct_color'] = correct_color
    session['square'] = square
    session['color_attempts'] = 0  # Reset attempt counter for new game

    return render_template('color_game.html', square=square, correct_color=session.get('correct_color'))

# ---------------------------------------------------------------------------
# JSON API for the no-reload (single-page) game flow.
# These endpoints reuse the same path/answer logic as the HTML routes above.
# The HTML GET/POST routes remain intact as a no-JavaScript fallback.
# ---------------------------------------------------------------------------

_FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
_RANKS = ['1', '2', '3', '4', '5', '6', '7', '8']


def _rand_square():
    return random.choice(_FILES) + random.choice(_RANKS)


def _rand_two():
    a = _rand_square()
    b = _rand_square()
    while b == a:
        b = _rand_square()
    return a, b


RECENT_LIMIT = 20  # don't reuse a square seen in the last 20 picks


def _recent_squares():
    r = session.get('recent_squares')
    return r if isinstance(r, list) else []


def _remember_squares(*squares):
    # Queue behavior: push new picks on the end, drop anything past the window.
    r = _recent_squares() + list(squares)
    session['recent_squares'] = r[-RECENT_LIMIT:]


def _fresh_square(also_avoid=()):
    # Set behavior: O(1) membership test against the recent window.
    avoid = set(_recent_squares()) | set(also_avoid)
    for _ in range(200):  # safety cap; 64 - 20 leaves plenty of choices
        s = _rand_square()
        if s not in avoid:
            return s
    return _rand_square()  # pathological fallback (should never hit)


def _fresh_two():
    a = _fresh_square()
    b = _fresh_square(also_avoid=(a,))
    return a, b


def _is_orthogonal_adjacent(a, b):
    """True if b is directly left/right/up/down of a (a straight one-step
    neighbour). Diagonal neighbours are NOT orthogonal-adjacent."""
    fd = abs(_FILES.index(a[0]) - _FILES.index(b[0]))
    rd = abs(int(a[1]) - int(b[1]))
    return (fd == 1 and rd == 0) or (fd == 0 and rd == 1)


def _fresh_two_bishop():
    """Like _fresh_two, but reject an orthogonally-adjacent second square.
    Such pairs are always opposite-coloured, so the bishop answer is always
    the trivial "N/A". Diagonally-adjacent squares are kept (a real 1-move
    question)."""
    a = _fresh_square()
    for _ in range(200):  # safety cap; at most ~4 neighbours excluded
        b = _fresh_square(also_avoid=(a,))
        if not _is_orthogonal_adjacent(a, b):
            return a, b
    return a, b  # pathological fallback (should never hit)


def _knight_hint(n):
    if n == 1:
        return "Incorrect. Try again."
    if n == 2:
        return "Still incorrect. Think about the knight's L-shaped moves."
    if n == 3:
        return "Not quite right. Remember, knights move in an L: 2 squares in one direction, 1 in perpendicular."
    return "Incorrect attempt #%d. Keep trying - you've got this." % n


def _bishop_hint(n):
    if n == 1:
        return "Incorrect. Try again."
    if n == 2:
        return "Still incorrect. Think about diagonal movement patterns."
    if n == 3:
        return "Not quite right. Bishops only move diagonally and can't change square colors."
    return "Incorrect attempt #%d. Consider the diagonal paths." % n


def _color_hint(n):
    if n == 1:
        return "Incorrect. Try again."
    if n == 2:
        return "Still incorrect. Think about the checkerboard pattern."
    if n == 3:
        return "Not quite right. Remember: a1 is a dark square, pattern alternates from there."
    return "Incorrect attempt #%d. Visualize the board pattern." % n


@app.route('/api/knight/new')
def api_knight_new():
    a, b = _fresh_two()
    _remember_squares(a, b)
    path = knight_path(a, b)
    session['correct_moves'] = len(path) - 1
    session['square_a'] = a
    session['square_b'] = b
    session['path'] = path
    session['knight_attempts'] = 0
    return jsonify(square_a=a, square_b=b)


@app.route('/api/knight/check', methods=['POST'])
def api_knight_check():
    data = request.get_json(silent=True) or {}
    try:
        user = int(data.get('answer'))
    except (TypeError, ValueError):
        return jsonify(error='invalid'), 400
    if user == session.get('correct_moves'):
        return jsonify(correct=True, piece='Knight', path=session.get('path'),
                       square_a=session.get('square_a'), square_b=session.get('square_b'))
    n = session.get('knight_attempts', 0) + 1
    session['knight_attempts'] = n
    return jsonify(correct=False, attempts=n, message=_knight_hint(n))


@app.route('/api/bishop/new')
def api_bishop_new():
    a, b = _fresh_two_bishop()
    _remember_squares(a, b)
    file_diff = abs(_FILES.index(a[0]) - _FILES.index(b[0]))
    rank_diff = abs(int(a[1]) - int(b[1]))
    if file_diff == rank_diff and file_diff > 0:
        correct, path = 1, bishop_path(a, b)
    elif (file_diff + rank_diff) % 2 == 0:
        correct, path = 2, bishop_2_move_path(a, b)
    else:
        correct, path = -1, None
    session['correct_moves'] = correct
    session['square_a'] = a
    session['square_b'] = b
    session['bishop_path'] = path
    session['bishop_attempts'] = 0
    return jsonify(square_a=a, square_b=b)


@app.route('/api/bishop/check', methods=['POST'])
def api_bishop_check():
    data = request.get_json(silent=True) or {}
    try:
        user = int(data.get('answer'))
    except (TypeError, ValueError):
        return jsonify(error='invalid'), 400
    if user == session.get('correct_moves'):
        return jsonify(correct=True, piece='Bishop', path=session.get('bishop_path'),
                       square_a=session.get('square_a'), square_b=session.get('square_b'))
    n = session.get('bishop_attempts', 0) + 1
    session['bishop_attempts'] = n
    return jsonify(correct=False, attempts=n, message=_bishop_hint(n))


@app.route('/api/color/new')
def api_color_new():
    square = _fresh_square()
    _remember_squares(square)
    file_index = _FILES.index(square[0])
    rank_index = int(square[1]) - 1
    correct_color = 'dark' if (file_index + rank_index) % 2 == 0 else 'light'
    session['correct_color'] = correct_color
    session['square'] = square
    session['color_attempts'] = 0
    return jsonify(square=square)


@app.route('/api/color/check', methods=['POST'])
def api_color_check():
    data = request.get_json(silent=True) or {}
    user = (data.get('answer') or '').strip()
    if user == session.get('correct_color'):
        return jsonify(correct=True, square=session.get('square'),
                       correct_color=session.get('correct_color'))
    n = session.get('color_attempts', 0) + 1
    session['color_attempts'] = n
    return jsonify(correct=False, attempts=n, message=_color_hint(n))
