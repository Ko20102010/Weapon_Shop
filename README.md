# Weapon Shop Empire v0.22.23 Input Capture Hotfix

This hotfix addresses the reported symptom: touching and dragging produced no joystick. Pointer input is now observed at document capture phase and filtered to the playable app surface.

Deploy only the changed files if preferred:

```text
index.html
game.js
data/map_model.json
CHANGELOG.md
DEVELOPMENT_PRIORITY_PLAN.md
tests/input-regression.mjs
tests/input-capture-audit.mjs
```
