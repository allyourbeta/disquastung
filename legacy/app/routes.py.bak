from flask import render_template, request, session, redirect, url_for
from app import app
from app.utils import generate_random_square, knight_moves, bishop_moves, square_color
import time

import os
print(os.path.join(app.root_path, 'templates'))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/knight', methods=['GET', 'POST'])
def knight_game():
    return game_logic('knight')

@app.route('/bishop', methods=['GET', 'POST'])
def bishop_game():
    return game_logic('bishop')


@app.route('/color', methods=['GET', 'POST'])
def color_game():
    if request.method == 'GET':
        square = generate_random_square()
        correct_color = square_color(square)
        session['square'] = square
        session['correct_color'] = correct_color
        session['start_time'] = time.time()
        return render_template('color_game.html', square=square)
    else:
        # Ensure 'correct_color' exists in the session
        if 'correct_color' not in session or 'square' not in session:
            message = "Session expired or invalid request. Please start a new game."
            return render_template('color_game.html', square=None, message=message)

        user_answer = request.form.get('user_color')
        correct_color = session['correct_color']
        elapsed_time = time.time() - session['start_time']

        if user_answer and user_answer.lower() == correct_color.lower():
            rounded_time = round(elapsed_time, 1)
            message = f"Correct! The square {session['square']} is {correct_color}."
            return render_template('result.html', elapsed_time=rounded_time,
                                   message=message, piece='color')
        else:
            message = "Incorrect. Try again!"
            return render_template('color_game.html', square=session['square'], message=message)


def game_logic(piece):
    if request.method == 'GET':
        square_a = generate_random_square()
        square_b = generate_random_square()

        while square_b == square_a:
            square_b = generate_random_square()

        if piece == 'knight':
            correct_answer, path = knight_moves(square_a, square_b)
        else:
            correct_answer, path = bishop_moves(square_a, square_b)

        session['start_time'] = time.time()
        session['correct_answer'] = correct_answer
        session['path'] = ' '.join(path)
        session['square_a'] = square_a
        session['square_b'] = square_b
        session['piece'] = piece
        return render_template(f'{piece}_game.html', square_a=square_a,
                               square_b=square_b)
    else:
        user_answer = int(request.form['user_moves'])
        correct_answer = session['correct_answer']
        elapsed_time = time.time() - session['start_time']

        if user_answer == correct_answer:
            rounded_time = round(elapsed_time, 1)
            if piece == 'bishop' and correct_answer == 0:
                message = "Correct! The bishop can't move to a different-colored square."
            else:
                message = f"Correct! The {piece} can get there in {correct_answer} {'move' if correct_answer == 1 else 'moves'}."
            return render_template('result.html', elapsed_time=rounded_time,
                                   path=session['path'], piece=session['piece'], message=message)
        else:
            if piece == 'bishop' and correct_answer == 0:
                message = "Incorrect."
            else:
                message = f"Incorrect. Try again."
            return render_template(f'{session["piece"]}_game.html', square_a=session['square_a'],
                                   square_b=session['square_b'], message=message)