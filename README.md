# Weapon Shop Empire v0.20.00

Deep visual redesign based on the user-provided v0.19.00 source.

## Design principles
- The trusted v0.19.00 room geometry, SOLIDS collision, door gaps, A* navigation and gameplay systems are unchanged.
- Every structural wall is drawn from the same SOLIDS array used for collision.
- Door mats make every opening visible.
- Distinct districts use restrained colours and a central circulation spine.
- Customer request bubbles collapse to icons at distance to reduce clutter.
- Mobile UI uses smaller HUD chips, clearer spacing and no animated action-button pulse.

## Preserved gameplay
Customers, staff, products, crafting quality, contracts, expeditions, monsters, save migration, touch controls and the 120-second day review remain from v0.19.00.

## Run
Serve over HTTP, for example `python3 -m http.server 8000`, then open `http://localhost:8000/`.
