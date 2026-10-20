# Weapon Shop Empire v0.22.10 Artwork Build

GitHub-ready static browser-game update based on the user-supplied v0.22.00 source.

## Deploy

Upload the extracted contents to the GitHub repository root. Preserve the `data/` and `js/` folders.

## Run locally

```bash
python3 -m http.server 8000
```

- Game: `http://localhost:8000/?v=02210`
- Collision overlay: `http://localhost:8000/?debug=collision`

## Validation commands

```bash
node --check game.js
node tests/route-matrix.mjs
```

The artwork pass does not change map geometry. Physical iPhone Safari testing was not available in the build environment.
