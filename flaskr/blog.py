from flask import (
    Blueprint, jsonify, redirect, render_template, session, url_for
)
import json
from flaskr.session import get_requests_session, has_requests_session

bp = Blueprint('blog', __name__)


def require_external_login():
    if not session.get('logged_in') or not has_requests_session():
        session.clear()
        return redirect(url_for('auth.login'))


def myheat_post(action, device_id="0", data=None):
    requests_session = get_requests_session()
    r = requests_session.post(
        'https://new.myheat.net/api/devices/',
        json={
            "action": action,
            "deviceId": str(device_id),
            "data": data or {},
        },
    )
    return json.loads(r.text)


def get_devices():
    response_obj = myheat_post(
        "getDeviceSearch",
        data={
            "filter": {},
            "pageItem": 1,
        },
    )
    return response_obj.get("data", {}).get("devices")

def get_objs(obj_type, device_id, data=None):
    url = f'https://new.myheat.net/api/settings/{str(obj_type)}/'
    payload = {
        "action": "getListV2",
        "data": data or {},
        "deviceId": str(device_id),
    }

    requests_session = get_requests_session()
    r = requests_session.post(url, json=payload)
    return json.loads(r.text)


def get_obj(obj_type, device_id, obj_id):
    url = f'https://new.myheat.net/api/settings/{obj_type.rstrip("s")}/'
    payload = {
        "action": "getData",
        "deviceId": str(device_id),
        "data": {
            "id": int(obj_id),
            "_from": "",
        },
    }

    requests_session = get_requests_session()
    r = requests_session.post(url, json=payload)

    print("POST", url)
    print("PAYLOAD", payload)

    return json.loads(r.text)


def delete_obj(obj_type, device_id, obj_id):
    url = f'https://new.myheat.net/api/settings/{str(obj_type)}/'
    payload = {
        "action": "delete",
        "deviceId": str(device_id),
        "data": {
            "id": str(obj_id),
        },
    }

    requests_session = get_requests_session()
    r = requests_session.post(url, json=payload)
    return json.loads(r.text)


@bp.route('/')
def index():
    login_redirect = require_external_login()
    if login_redirect:
        return login_redirect

    devices = get_devices()

    if devices:
        return redirect(url_for('blog.device', device_id=devices[0]["id"]))

    return render_template('blog/index.html', devices=devices)


@bp.route('/<int:device_id>')
def device(device_id):
    login_redirect = require_external_login()
    if login_redirect:
        return login_redirect
    devices = get_devices()
    print(devices)
    response_obj = myheat_post(
        "getStatusDevice",
        device_id=device_id,
    )
    return render_template(
        'blog/index.html',
        devices=devices,
        device_id=device_id,
        status=response_obj,
    )


@bp.route('/<int:device_id>/<obj_type>')
def device_objs(device_id, obj_type):
    login_redirect = require_external_login()
    if login_redirect:
        return login_redirect

    response_obj = get_objs(obj_type, device_id)
    return jsonify(response_obj)


@bp.route('/<int:device_id>/<obj_type>/<int:obj_id>')
def device_obj(device_id, obj_type, obj_id):
    login_redirect = require_external_login()
    if login_redirect:
        return login_redirect

    response_obj = get_obj(obj_type, device_id, obj_id)
    return jsonify(response_obj)


@bp.route('/<int:device_id>/<obj_type>/<int:obj_id>/delete', methods=('POST',))
def device_obj_delete(device_id, obj_type, obj_id):
    login_redirect = require_external_login()
    if login_redirect:
        return login_redirect

    response_obj = delete_obj(obj_type, device_id, obj_id)
    return jsonify(response_obj)
