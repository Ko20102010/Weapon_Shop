# Changelog

## v0.22.21 — Input Hotfix and Project Review

- Fixed drag-to-move failure caused by a stale `#craftGame` dereference after the manual crafting overlay was removed.
- Removed dead manual-crafting functions and the unused global craft trigger.
- Added robust pointer cancellation, lost-capture, browser-blur and visibility-change handling.
- Reset drag state when opening panels or returning to save slots.
- Added input regression and static DOM-reference audits.
- Preserved continuous automatic crafting, artwork, map geometry, routes, saves and progression.
- Added v0.22.20 save keys to migration lookup.
