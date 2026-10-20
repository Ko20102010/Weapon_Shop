# Weapon Shop Empire v0.21.06-dev

GitHub-ready M0 diagnostic build based on v0.21.05.

## Run

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

Collision diagnostics: `http://localhost:8000/?debug=collision`

## Checks

```bash
node --check game.js
node tests/static-checks.mjs
node tests/route-matrix.mjs
```

The route matrix is expected to expose current map defects and exits non-zero when failures remain. This developer build does not claim navigation is fixed or mobile-ready.
