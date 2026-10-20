# Weapon Shop Empire v0.22.22 Mobile Input Fix

This build supersedes v0.22.20 and v0.22.21.

## Deploy

Upload the extracted contents to the GitHub repository root, preserving all folders.

## Local run

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/?v=02222`.

## Checks

```bash
node --check game.js
node --check js/debug-overlay.js
node tests/project-audit.mjs
node tests/input-regression.mjs
node tests/mobile-ux-audit.mjs
node tests/route-matrix.mjs
node tests/art-stabilisation.mjs
node tests/interaction-tests.mjs
```
