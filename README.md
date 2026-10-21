# Weapon Shop Empire v0.22.30

Visual-system rebuild based on the user-supplied v0.22.23 source.

## Critical fixes

- Fixed the green-map runtime failure. `playerTick()` shadowed the global keyboard-state object with a nullable `keyboardVector()` result, then attempted to read `.w` from `null` before `draw()` ran.
- The world now renders before simulation updates, so a future update exception does not leave a blank green canvas.

## Artwork changes

- Added outlined room platforms and shadows.
- Added warm sandstone circulation paths.
- Reworked walls as lower open-workshop stone footings with timber rails and strong outlines.
- Strengthened HUD, navigation and joystick outlines for phone readability.
- Preserved existing room, collision and doorway geometry.

## Deployment

Extract the ZIP to the GitHub repository root. Open with `?v=02230`.

## Version record

- v0.22.30: visual rebuild and green-map runtime fix
- v0.22.23: document capture-phase input hotfix
- v0.22.22: mobile input controller rebuild
- v0.22.21: stale manual-craft DOM reference fix
- v0.22.20: continuous automatic crafting
- v0.22.11: artwork stabilisation
- v0.22.10: artwork-first renderer
- v0.22.00: 40/40 navigation foundation
- v0.21.06-dev: route diagnostics
- v0.21.05: open-space map
- v0.21.04: route and auto-craft iteration
- v0.21.03: early auto-craft
- v0.21.02: clean portrait
- v0.21.01: mobile layout
- v0.21.00: shopkeeper journey UI
- v0.20.00: redesign baseline
- v0.19.00: trusted gameplay lineage

## Validation status

Source-level tests pass. Physical iPhone Safari and production GitHub Pages deployment were not executed in the build environment.
