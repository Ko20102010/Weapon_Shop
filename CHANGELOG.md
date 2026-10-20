# Changelog

## v0.22.23 — Input Capture Hotfix

- Moved world pointer listeners to document capture phase so transparent HUD wrappers cannot prevent drag start.
- Accepts movement from non-interactive surfaces inside `#app`.
- Explicitly excludes buttons, panels, menus, camera controls, action controls, tutorial cards, day summary and save-slot overlay.
- Retains canvas pointer capture, multi-touch protection, dead zone, tap-to-move, pinch zoom and continuous automatic crafting.
- Preserves map geometry, routes, saves, artwork and progression.
