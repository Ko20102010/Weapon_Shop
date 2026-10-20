# Map Artwork Before-and-After Review

## Before — v0.22.00

- Functional but dominated by flat colour fields and generic rectangular furniture.
- Repeated wall strips had limited depth and weak doorway endings.
- Room identity depended heavily on permanent text labels.
- Forge, Alchemy, retail and checkout objects lacked distinctive silhouettes.

## After — v0.22.10

- Unified woodland palette with timber, stone, brass, ember, alchemy, water and foliage colour families.
- Walls now include depth, highlights, joints, shadow and end posts.
- Every major room receives identifying props without changing collision.
- Forge now reads as furnace, anvil, trough, tool wall, process pad and output flow.
- Alchemy now reads as cauldron, bottle shelf, process pad and output flow.
- Retail categories use local rugs and icons rather than room-wide colour flooding.
- Checkout has a substantial brass-trimmed counter and small queue studs.
- Bridge and Forest Gate have stronger silhouettes at mobile zoom.
- Room labels display only near the player; distant customer requests collapse to icons.

## Geometry and release evidence

- Room coordinates: unchanged
- Collision rectangles: unchanged
- Doorways: unchanged
- Navigation targets: unchanged
- Route matrix required: 40/40
- Physical iPhone Safari: not executed

## Remaining visual work

- Replace selected emoji props with dedicated pixel sprites in a later asset-atlas pass.
- Capture real-browser paired screenshots at identical camera positions.
- Tune lighting and contrast using physical-phone screenshots.

## v0.22.11 stabilisation findings

- Room labels now use 330 px enter and 410 px leave thresholds, reducing boundary flicker.
- Forge and Alchemy pads receive a thin status ring in the upper visual layer.
- Distant customer icons no longer overlap the patience bar.
- Alchemy cauldron art occupies less of the process zone.
- Mobile Overview and BAG controls meet the 44 × 44 CSS px primary target.
- Real-browser screenshot evidence and physical iPhone validation remain unexecuted.
