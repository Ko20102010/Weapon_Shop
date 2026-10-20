# Weapon Shop Empire v0.22.21 Input Hotfix

This build supersedes v0.22.20, where drag-to-move was broken by a stale reference to the removed manual crafting overlay.

## Deploy

Replace the repository-root contents with this package while preserving the included folder structure.

## Test locally

```bash
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/?v=02221
```

## Automated checks

```bash
node --check game.js
node --check js/debug-overlay.js
node tests/project-audit.mjs
node tests/input-regression.mjs
node tests/route-matrix.mjs
node tests/art-stabilisation.mjs
node tests/interaction-tests.mjs
```

Real-browser and physical-device tests were unavailable in the build environment.
