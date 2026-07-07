import functools

from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for
)

from flaskr.db import get_db
from flaskr.session import close_requests_session, restart_requests_session

bp = Blueprint('auth', __name__)

@bp.route('/add_account', methods=('GET', 'POST'))
def add_account():
    print("add account request")
    if request.method == 'POST':    
        alias = request.json['alias']
        username = request.json['username']
        password = request.json['password']
        db = get_db()
        error = None
        print(f'{alias} {username} {password}')

        if not alias:
            error = 'Alias is required.'
        elif not username:
            error = 'Username is required.'
        elif not password:
            error = 'Password is required.'

        if error is None:
            try:
                db.execute(
                    "INSERT INTO accounts (alias, username, password) VALUES (?, ?, ?)",
                    (alias, username, password),
                )
                db.commit()
                print("insrted")
            except db.IntegrityError:
                error = f"User {username} is already registered."
            else:
                return redirect(url_for("auth.login"))

        flash(error)

    return render_template('auth/login.html')

@bp.route('/delete_account', methods=('GET', 'POST'))
def delete_account():
    if request.method == 'POST':    
        alias = request.json['alias']
        db = get_db()
        error = None
        print(f'alias - {alias}')
        if not alias:
            error = 'Alias is required.'

        if error is None:
            try:
                db.execute(
                    "DELETE FROM accounts WHERE alias = (?);",
                    (alias,),
                )
                db.commit()
            except db.AttributeError:
                error = f"attr error"

        flash(error)

    return redirect(url_for("auth.login"))
        

@bp.route('/login', methods=('GET', 'POST'))
def login():
    print("login called")
    if request.method == 'POST':
        requests_session = restart_requests_session()
        print("login POST called")
        username = request.form['username']
        password = request.form['password']
        db = get_db()
        error = None

        if username is None:
            error = 'Incorrect username.'
        elif password is None:
            error = 'Incorrect password.'

        if error is None:
            print(f"requesting login by {username} {password}")
            r = requests_session.post(
                'https://new.myheat.net/api/auth/',
                json={
                    "action": "login",
                    "data": {
                        "login": username,
                        "password": password,
                        "rememberMe": False,
                    },
                },
            )
            session['logged_in'] = True
            return redirect(url_for('blog.index'))

        flash(error)

    db = get_db()
    accounts = db.execute(
        'SELECT *'
        ' FROM accounts'
    ).fetchall()

    return render_template('auth/login.html', accounts=accounts)



@bp.route('/logout')
def logout():
    close_requests_session()
    session.clear()
    return redirect(url_for('index'))
