# Weapon Shop Empire v0.22.11 Stabilisation Build

GitHub-ready stabilisation update based on v0.22.10.

## Deploy

Upload the extracted contents to the repository root and preserve `data/`, `js/`, `tests/` and `docs/`.

## Run

```bash
python3 -m http.server 8000
```

- Game: `http://localhost:8000/?v=02211`
- Collision overlay: `http://localhost:8000/?debug=collision`

## Checks

```bash
node --check game.js
node --check js/debug-overlay.js
node tests/route-matrix.mjs
node tests/art-stabilisation.mjs
```

Automated browser launch and physical-device testing were unavailable in the build environment.
