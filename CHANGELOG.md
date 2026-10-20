# Changelog

## v0.22.20 — Continuous Automatic Crafting

- Changed Forge and Alchemy process pads from one craft per entry to continuous crafting while the player remains on the floor logo.
- The first craft attempt occurs immediately on entry; additional attempts occur every 1.15 seconds.
- Crafting stops safely when materials run out, the output table is full, the recipe is unavailable, or the player leaves the pad.
- Added precise failure feedback such as missing material quantity and output capacity.
- Added a process-progress bar inside the pad status ring.
- Updated floor labels to `STAY TO AUTO CRAFT` and `STAY TO AUTO BREW`.
- Removed the legacy manual crafting overlay from HTML.
- Preserved product quality, rarity, defects, discoveries, objectives and output-table behaviour.
- Preserved v0.22.11 geometry and added v0.22.11 save keys to migration lookup.
