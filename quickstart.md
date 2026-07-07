# Quickstart

## 1. Create and activate venv

```bash
python3 -m venv .venv
source .venv/bin/activate
```

On Windows PowerShell:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

## 2. Install dependencies

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 3. Initialize database

This creates `instance/flaskr.sqlite` from `flaskr/schema.sql`.

```bash
flask --app flaskr init-db
```

## 4. Run development server

```bash
flask --app flaskr run --debug
```

Open:

```text
http://127.0.0.1:5000
```

## Useful Commands

Deactivate venv:

```bash
deactivate
```

Recreate database:

```bash
flask --app flaskr init-db
```

Run on another port:

```bash
flask --app flaskr run --debug --port 5001
```
