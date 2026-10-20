# Project Review — v0.22.22 Mobile Input Regression Fix

The phone experience is the release priority. Movement, panel recovery, continuous crafting, stocking and checkout are critical journeys.

## Implemented

- Multi-touch-safe pointer controller
- 7 px dead zone and progressive joystick strength
- Pointer capture release and lost-capture recovery
- Blur and hidden-tab recovery
- Tap-to-move preservation
- WASD and arrow fallback
- Movement reset at save start, panel open and day transition
- Overscroll prevention and coarse-pointer joystick sizing

## Automated evidence

- JavaScript syntax
- Static DOM-reference audit
- Input regression audit
- Mobile UX source audit
- Route matrix 40/40
- Artwork stabilisation audit
- Continuous auto-crafting audit

## Unexecuted

- Real WebKit/Chromium pointer execution
- Physical iPhone Safari drag, pinch and orientation
- Android Chrome
- Production GitHub Pages cache behaviour
- Real LocalStorage migration
- Phone frame-time profiling

Publish v0.22.22 instead of v0.22.20 or v0.22.21. Do not start more features until drag, pinch recovery, orientation recovery and the first Sword loop pass on a phone.
