import requests
import threading
import uuid

from flask import current_app, session


SESSION_KEY = "requests_session_id"


class RequestsSessionStore:
    def __init__(self):
        self._lock = threading.RLock()
        self._sessions = {}

    def get(self):
        session_id = session.get(SESSION_KEY)

        with self._lock:
            if session_id is None or session_id not in self._sessions:
                session_id = uuid.uuid4().hex
                session[SESSION_KEY] = session_id
                self._sessions[session_id] = requests.Session()

            return self._sessions[session_id]

    def has_current(self):
        session_id = session.get(SESSION_KEY)

        with self._lock:
            return session_id in self._sessions

    def restart(self):
        self.close()
        return self.get()

    def close(self):
        session_id = session.pop(SESSION_KEY, None)

        if session_id is None:
            return

        with self._lock:
            requests_session = self._sessions.pop(session_id, None)

        if requests_session is not None:
            requests_session.close()


def init_app(app):
    app.extensions["requests_session_store"] = RequestsSessionStore()


def get_requests_session():
    return current_app.extensions["requests_session_store"].get()


def has_requests_session():
    return current_app.extensions["requests_session_store"].has_current()


def restart_requests_session():
    return current_app.extensions["requests_session_store"].restart()


def close_requests_session():
    current_app.extensions["requests_session_store"].close()
