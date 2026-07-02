# app/__init__.py

from flask import Flask

app = Flask(__name__)
app.config['SECRET_KEY'] = 'ssecret-key'
app.config['SESSION_TYPE'] = 'filesystem'

from app import routes
