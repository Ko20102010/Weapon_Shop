# Weapon Shop Empire v0.22.20 Automatic Loop Build

## Crafting behaviour

1. Step onto `STAY TO AUTO CRAFT` or `STAY TO AUTO BREW`.
2. The first item is attempted immediately.
3. Another item is attempted every 1.15 seconds while the player remains on the logo.
4. Crafting stops when materials run out, the shared output table is full, the recipe is unavailable, or the player leaves.
5. Leave the pad to collect and stock output, then return to continue.

## Deploy

Upload the extracted contents to the GitHub repository root, preserving `data/`, `js/`, `tests/` and `docs/`.

## Checks

```bash
node --check game.js
node --check js/debug-overlay.js
node tests/route-matrix.mjs
node tests/art-stabilisation.mjs
node tests/interaction-tests.mjs
```

Physical-device and real-browser interaction testing were unavailable in the build environment.
