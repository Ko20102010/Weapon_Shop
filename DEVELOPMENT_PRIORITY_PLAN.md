# Weapon Shop Empire — Development Priority Plan

**Plan version:** 1.2  
**Updated:** 20 October 2026  
**Trusted baseline:** v0.22.22 Mobile Input Fix Build  
**Previous executable baseline:** v0.22.00  
**Deployment model:** static HTML, CSS and JavaScript on GitHub Pages  
**Primary target:** iPhone Safari portrait  
**Secondary targets:** Android Chrome portrait, mobile landscape and desktop browsers  
**Document rule:** update this file in every implementation chat and commit it with the related source changes.

---

## 1. Trusted baseline inventory

The v0.22.10 build was created from the latest user-supplied source files:

```text
index.html
game.js
style.css
data/map_model.json
js/debug-overlay.js
tests/route-matrix.mjs
```

The route test was supplied as `route-matrix.txt` because the upload interface did not accept `.mjs`; the build stores and executes the same content as `tests/route-matrix.mjs`.

### Current application type

- Browser game
- Canvas-based world renderer
- Plain JavaScript, HTML and CSS
- LocalStorage save system
- Static GitHub Pages deployment
- No backend, database, authentication or remote API

### Current geometry inventory

```text
World:       1870 × 2870 px
Rooms:       15
Walls:       76
Doorways:    13
Process pads: 2
```

---

## 2. v0.22.10 release summary

### Artwork changes completed

- Reworked the live map renderer with a warmer woodland workshop palette.
- Added deeper timber walls, joints, highlights, shadows and doorway end posts.
- Improved room floors with controlled plank and workshop patterns.
- Added water-bank shadow, river shimmer, detailed bridge planks and bridge rails.
- Added a stronger Forest Gate silhouette.
- Added room-specific props to Material Yard, Staff House, Training Yard, Forge, Alchemy Lab, Contract Warehouse, retail departments, Customer Hall, Rare Storage, Management and Visitor Plaza.
- Added local retail rugs instead of room-wide category colour flooding.
- Added a larger brass-trimmed checkout counter and queue markers.
- Added proximity-based room labels.
- Collapsed distant customer requests to compact product icons.
- Added ready, blocked and active-player artwork states for `AUTO CRAFT` and `AUTO BREW`.
- Corrected the onboarding text to describe automatic floor-logo crafting.
- Updated the mobile UI skin with dark timber, brass and cream colours.

### Compatibility preserved

- Room coordinates unchanged
- Wall/collision rectangles unchanged
- Doorways unchanged
- Navigation targets unchanged
- Existing crafting, quality and rarity logic retained
- Customer, employee, contract and expedition systems retained
- Existing v0.22.00 saves included in migration lookup

### Executed checks

```text
JavaScript syntax:                 PASS
Debug overlay JavaScript syntax:   PASS
Route matrix:                      PASS — 40/40
Version/cache consistency:         PASS
Duplicate HTML IDs:                PASS
ZIP integrity:                     PASS
```

### Not executed

- Real-browser screenshot comparison
- Physical iPhone Safari route traversal
- Android Chrome device test
- Frame-time/performance profiling
- Screen-reader test
- 200% browser zoom test
- Production GitHub Pages deployment verification

The build must not be described as mobile-ready until the physical-device critical journeys pass.

---

## 3. Current critical journeys

A release is blocked unless all applicable journeys pass.

### Journey A — Start and move

1. Load a save slot.
2. Move using touch without scrolling the page.
3. Enter and exit every unlocked room.
4. Cross the bridge and reach Forest Gate.
5. Rotate portrait → landscape → portrait.
6. Save and reload at a valid walkable point.

### Journey B — First Sword

1. Gather 2 Iron and 1 Wood.
2. Enter Forge.
3. Step on `AUTO CRAFT`.
4. Produce exactly one Iron Sword.
5. Collect the output automatically.
6. Stock Attack Shelf automatically.
7. Customer purchases the Sword.
8. Collect checkout coins.

### Journey C — Mobile interface

1. Read cash, day/time and current objective.
2. Open and close BAG repeatedly.
3. Open each unlocked navigation panel.
4. Scroll panels without moving the player.
5. Close overlays without accidental world input.
6. Confirm controls remain above iPhone safe areas.

### Journey D — Automation

1. Hire a worker.
2. Assign a role.
3. Confirm worker reaches output, shelf, checkout, warehouse and Forest Gate targets.
4. End the day and reload without losing assignment state.

---

## 4. Milestone status

- [x] M0 — Baseline protection and diagnostics
- [x] M1 — Navigation foundation, 40/40 route matrix
- [x] M1A — Artwork-first v0.22.10 renderer pass
- [x] M2 — Continuous automatic Forge/Alchemy loop implemented; physical first-sale timing remains unverified
- [ ] M3 — Mobile onboarding and day-system redesign
- [ ] M4 — Visible shop-growth tiers
- [ ] M5 — Customer selling decisions
- [ ] M6 — Greenwood expedition vertical slice
- [ ] M7 — Dedicated pixel-sprite atlas and final visual polish

---

# 5. Immediate priority — v0.22.11 stabilisation

**Purpose:** verify v0.22.10 artwork did not reduce usability or performance before adding gameplay.

## Required file changes

### `DEVELOPMENT_PRIORITY_PLAN.md`

- Replace the previous plan with this v1.2 plan.
- Record physical-device findings and any artwork corrections.

### `MAP_ART_BEFORE_AFTER_REVIEW.md`

- Add real-browser captures at identical camera positions.
- Score route readability, room identity, interaction clarity, visual hierarchy, colour consistency, furniture readability, mobile legibility and collision/art agreement.

### `docs/map-review/`

Add:

```text
before-overview.png
after-overview.png
before-forge.png
after-forge.png
before-retail.png
after-retail.png
before-customer-hall.png
after-customer-hall.png
before-mobile-portrait.png
after-mobile-portrait.png
collision-overlay-overview.png
```

### `game.js`

Only correct confirmed artwork regressions. Do not change geometry or gameplay in v0.22.11.

Potential checks:

- Decorative props must not obscure interaction targets.
- Forge pad must remain visible beneath the player.
- Alchemy pad must remain visible beneath the player.
- Customer request icon must not cover patience bar.
- Room-label proximity threshold must not flicker excessively.
- Wall end posts must not visually close an open doorway.

### `style.css`

Only correct confirmed mobile contrast, touch-target or overlap defects.

## Acceptance gate

- Route matrix remains 40/40.
- Every critical entrance passes physical iPhone testing.
- Default portrait zoom clearly shows Forge and Alchemy process pads.
- No new artwork creates false collision cues.
- No primary UI control overlaps another control at 390 × 844 CSS px.
- Map-art review overall average reaches at least 4/5.
- Route readability and collision/art agreement each score 5/5.

---

# 6. M2 — Complete automatic Sword loop

**Target version:** v0.22.20  
**Priority:** P0  
**Dependency:** v0.22.11 stabilisation

## Confirmed current state

- Forge pad automatically calls the existing `craft()` function on entry.
- Pad entry is locked until the player exits.
- Output pickup, shelf stocking and checkout coin collection already have proximity automation.
- The legacy manual crafting minigame and related DOM remain present.
- Context crafting buttons are removed near Forge and Alchemy.

## Exact required changes

### `game.js`

Create a single routine-interaction state controller:

```text
idle
entered
validating
executed
lockedUntilExit
failed
```

Apply the controller consistently to:

- automatic material gathering
- Forge crafting
- Alchemy brewing
- output pickup
- shelf stocking
- checkout coin collection
- contract loading

Remove or disable the legacy manual crafting overlay from the normal first-sale journey. Preserve quality and rarity calculations inside `craft()`.

Improve failure feedback:

- missing materials names the missing materials
- full output table reports current and maximum capacity
- wrong shelf preserves carried products
- full shelf preserves carried products
- locked Alchemy explains the unlock condition

### `index.html`

If the manual minigame is removed entirely, remove:

```text
#craftGame
#craftTap
#craftMarker
```

If retained for a later optional skill action, keep the elements hidden from the first-sale flow and document the trigger.

### `style.css`

Remove unused crafting-minigame styles only if the DOM feature is removed.

Add clear pad states:

```text
ready
blocked
active
success
```

### `tests/interaction-tests.mjs`

Add tests for:

- enough materials → exactly one output
- insufficient materials → no material loss
- full output table → no material loss
- remaining on pad → no repeat
- leave and re-enter → next attempt
- output pickup updates carried inventory
- correct shelf stocks product
- wrong shelf preserves product
- full shelf preserves product
- customer sale decrements stock once
- coin collection increments cash once

## M2 acceptance gate

- First Sword crafted without a manual button.
- First sale completes without opening a panel.
- First sale completes in under 90 seconds on physical iPhone Safari.
- Routine Sword cycle uses one predictable interaction language.
- No failed action consumes materials or products.
- Route matrix remains 40/40.

---

# 7. M3 — Mobile onboarding and day-system redesign

**Target version:** v0.23.00  
**Priority:** P1

## Day behaviour

```text
Day 1: no hard timer; ends after first sale or End Day
Day 2: no hard timer; teaches first visible upgrade and Alchemy path
Day 3 onward: 240-second active day
```

Pause the timer while:

- full-screen panel is open
- Day Complete is open
- recoverable error overlay is open

Always provide `End Day Early`.

## Progressive disclosure

### First-sale phase

Visible:

- Material Yard
- Forge
- Attack Shelf
- checkout

Hidden or disabled:

- Staff House management
- Alchemy functionality
- expeditions
- wholesale
- skills
- Rare Storage functionality

### Unlock sequence

```text
5 sales: Alchemy + Healing Potion + first shelf upgrade
10 customers: Staff House + first worker + TEAM
Day 3 + worker: Forest Gate + Greenwood Edge + PARTS
Reputation milestone: Defence products + contracts + Management
Advanced shop: Rare display + permanent skills + later expeditions
```

## M3 acceptance gate

- No management panel required before first sale.
- Current objective indicates one physical action.
- Timer does not advance under a full-screen panel.
- No overlap at 360 × 800, 390 × 844, 393 × 852 and 430 × 932.
- Primary touch targets are at least 44 × 44 CSS px.
- Centre 60% of portrait viewport remains available for gameplay.

---

# 8. M4 — Visible shop growth

**Target version:** v0.24.00  
**Priority:** P1

## Required tiers

### Attack Shelf

```text
Tier 1: rough timber, 4 slots
Tier 2: reinforced shelf, 8 slots
Tier 3: premium display, 12 slots
```

### Forge

```text
Tier 1: one production position
Tier 2: two-job queue
Tier 3: quality bonus and stronger visual treatment
```

### Staff House

```text
Tier 1: one bed
Tier 2: three beds and notice board
Tier 3: five beds, lockers and recovery bonus
```

### Customer Hall

```text
Tier 1: plain checkout counter
Tier 2: queue markers and decoration
Tier 3: premium counter and higher-value customers
```

## Acceptance gate

A Level 1 and Level 3 shop must be clearly distinguishable with the HUD hidden.

---

# 9. M5 — Customer selling decisions

**Target version:** v0.25.00  
**Priority:** P2

Add a two-tap-maximum choice for important customers:

```text
SELL at listed price
SURCHARGE with visible success chance
RECOMMEND a higher-tier available product
```

Routine customers and assigned sales workers remain automatic.

## Acceptance gate

- At least 20% of mid-game sales offer a meaningful choice.
- Choice resolves in no more than two taps.
- Sale, stock and reputation update exactly once.

---

# 10. M6 — Greenwood expedition vertical slice

**Target version:** v0.26.00  
**Priority:** P2

Limit the first complete expedition area to:

- Slime
- Wolf
- Slime Gel
- Wolf Fang
- player or worker participation
- recovery cost
- two material-dependent recipes

## Acceptance gate

The expedition enter, reward and return loop must preserve shop state, navigation, assignments and saves.

---

# 11. M7 — Dedicated pixel-sprite atlas

**Target version:** after gameplay foundation  
**Priority:** P2

v0.22.10 improves live canvas artwork programmatically, but several props still use emoji. M7 replaces selected emoji and primitive props with dedicated transparent PNG atlases.

## Target assets

```text
assets/map/grass_clusters.png
assets/map/walls_woodland.png
assets/map/door_thresholds.png
assets/map/bridge.png
assets/map/forest_gate.png
assets/rooms/material_yard.png
assets/rooms/staff_house.png
assets/rooms/training_yard.png
assets/rooms/forge_props.png
assets/rooms/alchemy_props.png
assets/rooms/warehouse_props.png
assets/rooms/retail_props.png
assets/rooms/customer_hall.png
assets/rooms/rare_storage.png
assets/rooms/management.png
assets/fx/process_pad_forge.png
assets/fx/process_pad_alchemy.png
assets/fx/process_states.png
```

Collision remains in `data/map_model.json`; image bounds must not become hidden collision.

---

# 12. Save and migration policy

Current v0.22.10 keys:

```text
wse_v02210_slot_
wse_forever_v02210
```

Migration lookup includes v0.22.00 keys.

For every future schema change:

- keep the older storage key readable
- write the new record
- read it back successfully
- preserve the old record until verification completes
- validate saved player coordinates against walkable geometry
- relocate invalid coordinates to the nearest walkable spawn
- preserve products, materials, workers, contracts, discoveries, equipment and progression

---

# 13. Accessibility, security and performance

## Accessibility

- Semantic buttons and accessible names for icon-only controls
- Visible keyboard focus
- 44 × 44 CSS px primary touch targets
- No information conveyed only by colour
- `prefers-reduced-motion` support
- Usable at 200% zoom
- Safe-area inset support
- Portrait/landscape recovery

## Security and privacy

- No secrets or tokens in the static package
- No personal data in saves, fixtures or screenshots
- Validate imported save and map JSON
- Escape player-provided names before DOM insertion
- Avoid inserting untrusted values through `innerHTML`
- Keep external dependencies absent unless reviewed and pinned

## Performance

Artwork checks must include:

- default portrait frame-time observation
- no per-frame image creation
- no unbounded effects or entity arrays
- debug overlay disabled by default
- reduced animation under `prefers-reduced-motion`
- no repeated layout thrashing from HUD updates

---

# 14. Required test commands

```bash
node --check game.js
node --check js/debug-overlay.js
node tests/route-matrix.mjs
```

After M2:

```bash
node tests/interaction-tests.mjs
```

Manual local run:

```bash
python3 -m http.server 8000
```

URLs:

```text
http://localhost:8000/?v=02210
http://localhost:8000/?debug=collision
```

---

# 15. Required release report

Every release must state:

- version
- trusted baseline
- exact changed files
- exact added and removed files
- save migration status
- automated checks and results
- browser checks and results
- responsive checks and results
- accessibility/security/performance checks performed
- physical-device status
- deployment status
- known limitations
- rollback steps
- ZIP size
- SHA-256 checksum

---

## Current next action

Deploy v0.22.22 and verify drag, tap, pinch recovery, orientation recovery and the first Sword loop on physical iPhone Safari. Do not begin M3 until these phone critical journeys pass.

---

# Change log

## Plan 1.2 — v0.22.10

- Established v0.22.10 as the trusted baseline.
- Recorded the artwork-first changes and 40/40 route result.
- Added v0.22.11 artwork stabilisation as the immediate release gate.
- Clarified that M2 is not complete while the legacy manual crafting overlay and untested interaction paths remain.
- Added M7 for dedicated sprite-atlas replacement after the gameplay foundation.
- Recorded unexecuted browser, device, accessibility and performance checks explicitly.


## v0.22.11 execution record — 20 October 2026

- Room-label flicker stabilisation: implemented.
- Process-pad upper-layer visibility ring: implemented.
- Customer icon/patience-bar separation: implemented.
- Alchemy process-zone visual competition: reduced.
- Recoverable renderer error state: implemented.
- 44 × 44 CSS px mobile utility targets: implemented.
- Route matrix and source checks: executed in release package.
- Real-browser screenshots and physical-device tests: not executed.


## v0.22.20 execution record — 20 October 2026

- Continuous pad crafting: implemented.
- Immediate entry craft: implemented.
- Repeat interval: 1.15 seconds while standing on the pad.
- Stop conditions: player exit, missing materials, full output, unavailable recipe.
- Legacy manual crafting overlay: removed from HTML.
- Route, artwork stabilisation and interaction source checks: executed.
- Physical iPhone first-sale time and browser runtime interaction: not executed.


## v0.22.21 input regression record — 20 October 2026

- Root cause: `dragStart()` dereferenced removed `#craftGame`, throwing on every canvas pointer down.
- Stale reference and dead manual-craft code: removed.
- Pointer cancellation and lost-capture recovery: implemented.
- Static DOM-reference audit: added.
- Route/art/interaction regression checks: retained.
- Real-browser and physical-device execution: not available.


## v0.22.22 mobile input record — 20 October 2026

- Multi-touch-safe pointer controller, dead zone, progressive strength, capture recovery and keyboard fallback: implemented.
- Static input, DOM, mobile UX, route, artwork and interaction checks: executed.
- Real-browser and physical-phone input execution: not available.
