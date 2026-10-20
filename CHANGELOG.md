# Changelog

## v0.22.22 — Mobile Input Regression Fix

- Rebuilt drag-to-move with multi-touch protection, pointer-capture recovery and non-passive pointer handling.
- Added a 7 px dead zone and progressive joystick response up to a 46 px radius.
- Preserved tap-to-move and pinch zoom without allowing a second touch to hijack movement.
- Added WASD and arrow-key fallback for desktop verification.
- Reset movement on panel opening, save start, next day, browser blur and hidden-tab state.
- Added overscroll prevention and larger coarse-pointer joystick presentation.
- Preserved continuous automatic crafting, artwork, routes, saves and progression.
