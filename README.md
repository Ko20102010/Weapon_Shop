# Weapon Shop Empire v0.22.00

GitHub-ready navigation and map-art build based on v0.21.06-dev.

## Deploy

Upload the extracted contents of this package to the repository root. Do not upload the ZIP itself.

## Run locally

```bash
python3 -m http.server 8000
```

- Normal game: `http://localhost:8000/`
- Collision debug: `http://localhost:8000/?debug=collision`

## Checks

```bash
node --check game.js
node tests/static-checks.mjs
node tests/route-matrix.mjs
```

Automated route matrix: 40 passed, 0 failed. Physical iPhone Safari testing was not available in the build environment.
