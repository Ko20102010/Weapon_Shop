# Weapon Shop Empire — Mobile-First Development and GitHub Implementation Plan

**Plan version:** 1.1  
**Planning date:** 20 October 2026  
**Trusted baseline:** v0.21.05  
**Trusted gameplay lineage:** v0.19.00  
**Deployment:** GitHub Pages, static HTML/CSS/JavaScript  
**Primary device:** iPhone Safari portrait  
**Secondary devices:** Android Chrome portrait, mobile landscape, desktop browsers  
**Document rule:** update this file in every change chat and commit it with the related source change.

---

## 1. Current repository baseline

The v0.21.05 package currently contains:

```text
/
├── index.html                         2,963 bytes
├── style.css                        21,882 bytes
├── game.js                          95,328 bytes
├── README.md                           677 bytes
├── DEVELOPMENT_PRIORITY_PLAN.md      7,269 bytes
└── backup_v0.19.00/
    ├── index.html                    2,593 bytes
    ├── style.css                     9,649 bytes
    └── game.js                      91,915 bytes
```

Current implementation anchors in `game.js`:

```text
line 4     VERSION
line 153   SOLIDS
line 244   DOOR_CLEARANCES
line 258   PROCESS_PADS
line 265   collides()
line 283   processAutoCraftPads()
line 318   buildNavGrid()
line 954   updateContextActions()
line 1026  playerTick()
line 1194  endDay()
line 1325  drawLayer1And2()
```

> Line numbers are baseline references only. After editing, locate code by function or constant name rather than by line number.

Current cache-busted assets:

```text
style.css?v=0.21.05
game.js?v=0.21.05
```

---

## 2. Product objective and release gates

The mobile-first foundation must deliver this loop without opening a management panel:

```text
Collect Iron and Wood
→ enter Forge
→ step on AUTO CRAFT
→ collect Iron Sword output
→ step at Attack Shelf
→ customer buys Sword
→ collect checkout coins
```

### Target outcomes

- First material: under 20 seconds
- First Sword: under 45 seconds
- First sale: under 90 seconds
- Menus required before first sale: zero
- Inaccessible critical rooms: zero
- Collision-related navigation retries: zero
- Routine production methods: one consistent control per action

### Hard release blockers

Do not publish a release with any confirmed issue below:

- blank screen or uncaught JavaScript exception
- inaccessible critical room
- player, customer, or worker route failure
- visible wall/collision disagreement
- auto-craft consuming materials without output
- save loss or failed migration
- mobile controls covering a required action
- stale GitHub Pages assets after deployment
- first sale requiring an undocumented manual craft action

---

# 3. Exact target repository structure

Create the following structure incrementally. Do not perform one large rewrite.

```text
/
├── index.html
├── style.css
├── game.js
├── README.md
├── DEVELOPMENT_PRIORITY_PLAN.md
├── CHANGELOG.md                         # new in M0
├── data/
│   ├── map_model.json                   # new in M0
│   ├── map_model.schema.json            # new in M0
│   └── save_fixtures/
│       ├── new_game.json                # new in M0
│       ├── migrated_v01900.json         # new in M0
│       ├── carried_product.json         # new in M0
│       └── worker_assigned.json          # new in M0
├── js/
│   ├── map-model.js                     # new in M1
│   ├── navigation.js                    # new in M1
│   ├── interactions.js                  # new in M2
│   ├── save-migration.js                # new in M1
│   └── debug-overlay.js                 # new in M0
├── tests/
│   ├── static-checks.mjs                # new in M0
│   ├── route-matrix.mjs                 # new in M0
│   ├── interaction-tests.mjs            # new in M2
│   └── save-migration-tests.mjs         # new in M1
└── backup_v0.19.00/                     # retained, not modified
    ├── index.html
    ├── style.css
    └── game.js
```

### Architecture decision

The app remains a static browser game. No backend, database, package manager, or remote script dependency is required for M0–M4.

Use native ES modules only after GitHub Pages path testing succeeds. Until then, load the new files using ordered `<script defer>` tags to avoid introducing a bundler migration during the navigation fix.

---

# 4. Milestone M0 — Baseline protection and diagnostics

**Target version:** v0.21.06-dev  
**Priority:** P0  
**Release type:** developer-only diagnostic build

## Exact file changes

### `DEVELOPMENT_PRIORITY_PLAN.md`

- Replace the old plan with this file.
- Update the plan version and milestone status in every future implementation chat.
- Record executed and unexecuted tests.

### `CHANGELOG.md` — new

Add:

```markdown
# Changelog

## Unreleased
- Added mobile-first implementation plan.
- Added map/collision diagnostics plan.
```

### `data/map_model.schema.json` — new

Define and validate:

```text
world
rooms
walls
doorways
water
blockingFurniture
interactionZones
spawnPoints
navigationTargets
```

Required field rules:

- all IDs are unique strings
- all coordinates are finite non-negative numbers
- width and height are greater than zero
- doorways reference an existing wall or room
- navigation targets have an entity type
- all objects stay within world bounds

### `data/map_model.json` — new

Initially migrate the current v0.21.05 room, wall, doorway, water, furniture, process-pad, spawn, and target coordinates without changing the live map.

This first file is an inventory and test input. M0 must not switch gameplay to the new model yet.

### `js/debug-overlay.js` — new

Implement:

```text
?debug=collision
F2 desktop toggle
```

Overlay colours:

```text
red     blocked collision
 green  walkable navigation cells
 yellow doorway clearance
 blue   interaction/process zones
 white  selected A* path
 purple spawn and target points
```

Requirements:

- overlay never captures touch input
- portrait legend collapses to one badge
- debug mode defaults to off
- overlay uses the same camera transform as the game canvas

### `tests/static-checks.mjs` — new

Check:

- `game.js` JavaScript syntax using `node --check`
- JSON parse for `map_model.json`
- schema-required top-level keys
- unique IDs
- in-bounds rectangles
- duplicate HTML IDs
- missing local asset references
- version consistency across `index.html`, `game.js`, and cache-bust query strings

### `tests/route-matrix.mjs` — new

Create test rows for:

```text
playerSpawn → every room entrance
playerSpawn → every station
customerSpawn → each shelf
customerSpawn → checkout
staffSpawn → all worker destinations
Forest Gate → return destination
```

M0 may report failures. It must print a complete pass/fail matrix and exit non-zero when a critical row fails.

### `index.html`

Add before `game.js`:

```html
<script defer src="js/debug-overlay.js?v=0.21.06-dev"></script>
```

Update all version labels and asset query strings to `0.21.06-dev`.

### `game.js`

Add only safe diagnostic hooks:

- expose camera transform read-only for debug drawing
- expose current nav path read-only
- expose collision rectangles read-only
- do not change `SOLIDS`, `DOOR_CLEARANCES`, `collides()`, or gameplay in M0

### `README.md`

Add exact local-run and test commands:

```bash
python3 -m http.server 8000
node --check game.js
node tests/static-checks.mjs
node tests/route-matrix.mjs
```

## M0 acceptance gate

- Trusted v0.21.05 files preserved in a backup or prior Git commit.
- Debug overlay loads without affecting normal input.
- Static checks run.
- Route matrix runs and reports every critical destination.
- No gameplay or save behaviour intentionally changed.

## M0 rollback

Revert the M0 commit. No save migration is introduced.

---

# 5. Milestone M1 — Single-source map, collision, and navigation

**Target version:** v0.22.00  
**Priority:** P0  
**Release type:** navigation foundation

## Exact file changes

### `data/map_model.json`

Make this the authoritative source for:

- visible room floors
- visible wall segments
- real doorway gaps
- bridge and water
- blocking furniture footprints
- process zones
- player/customer/staff spawn points
- interaction and A* targets

Rules:

- open space is the road; do not add broad painted road rectangles
- a visible wall blocks movement
- a visible doorway does not block movement
- furniture collision matches visible furniture
- bridge overrides water only within bridge bounds

### `js/map-model.js` — new

Responsibilities:

```javascript
loadMapModel()
validateMapModel()
buildWallSegments()
buildDoorwayClearances()
buildBlockingRectangles()
getInteractionZones()
getNavigationTargets()
```

Error states:

- loading: show non-blocking loading indicator
- parse failure: show recoverable map error panel
- validation failure: list invalid IDs and fields
- retry: reload the model
- fallback: do not silently continue using mixed geometry

### `js/navigation.js` — new

Move or wrap the following logic from `game.js`:

```text
G_CELL, GW, GH
navGrid
buildNavGrid()
nearestWalkableCell()
findAStarPath()
navigate()
```

Inputs must come from generated blocking rectangles and doorway gaps.

Add:

```javascript
runReachabilityMatrix()
nearestValidSpawn()
```

### `js/save-migration.js` — new

Add schema versioning:

```javascript
save.schemaVersion = 1
```

Migration rules:

- read v0.21.05 and v0.19.00 save keys
- preserve old keys until new save writes and reads back successfully
- validate player coordinates against the generated nav grid
- move invalid positions to `nearestValidSpawn()`
- preserve products, materials, employees, progression, contracts, discoveries, equipment, and day stats

### `game.js`

Replace these current v0.21.05 definitions:

```text
SOLIDS
DOOR_CLEARANCES
collides()
buildNavGrid() source geometry
```

with calls to the new map/navigation modules.

Keep these gameplay functions materially unchanged:

```text
craft()
clientTick()
employeeTick()
monsterTick()
endDay()
product and progression logic
```

Replace direct map constants in `drawLayer1And2()` with rendering from `map_model.json`.

Do not retain a second handwritten collision list.

### `index.html`

Load in this order:

```html
<script defer src="js/map-model.js?v=0.22.00"></script>
<script defer src="js/navigation.js?v=0.22.00"></script>
<script defer src="js/save-migration.js?v=0.22.00"></script>
<script defer src="js/debug-overlay.js?v=0.22.00"></script>
<script defer src="game.js?v=0.22.00"></script>
```

Update stylesheet query string to `0.22.00`.

### `tests/route-matrix.mjs`

Make 100% critical reachability mandatory.

Targets:

- Material Yard
- Staff House
- Training Yard
- Forge process pad
- Alchemy process pad
- Contract Warehouse
- Attack Shelf
- Defence Shelf
- Other Shelf
- checkout
- Rare Storage
- both Management entrances
- Forest Gate
- Visitor Plaza

### `tests/save-migration-tests.mjs` — new

Test:

- new save
- v0.19.00 save
- v0.21.05 save
- invalid player position
- carried product
- worker assignment
- day-end state
- malformed data rejection

## M1 acceptance gate

- 100% critical route matrix pass.
- Zero collision rectangles without a visible blocker.
- Zero walk-through structural walls outside a doorway.
- Door clear width at least 78 px; preferred 96–120 px.
- Main circulation clearance at least 120 px.
- Player, customer, and staff use the same nav model.
- Save migration passes and old save keys remain recoverable.
- Physical iPhone entry/exit test completed for every critical room before calling the release mobile-ready.

## M1 rollback

- Restore v0.21.05 source files.
- Retain old save keys.
- Remove new modules and return asset references to v0.21.05.

---

# 6. Milestone M2 — Fully automatic Sword loop

**Target version:** v0.22.10  
**Priority:** P0  
**Depends on:** M1

## Exact file changes

### `js/interactions.js` — new

Implement one interaction controller with explicit states:

```text
idle
entered
validating
executed
lockedUntilExit
failed
```

Functions:

```javascript
getActiveInteractionZone()
onZoneEnter()
onZoneExit()
autoGather()
autoCraft()
autoCollectOutput()
autoStock()
autoCollectCoins()
```

### `data/map_model.json`

Add or finalise zones:

```text
material-gather-iron
material-gather-wood
forge-auto-craft
alchemy-auto-brew
attack-auto-stock
defence-auto-stock
other-auto-stock
checkout-coin-collection
contract-auto-load
```

Each zone requires:

```text
id
type
bounds
icon
label
allowedEntityTypes
cooldownMode = exit
```

### `game.js`

Move current `processAutoCraftPads()` behaviour into `js/interactions.js`.

Remove manual proximity crafting from `updateContextActions()`.

Preserve advanced recipe selection in the Products panel.

Forge behaviour:

- default recipe: Iron Sword
- selected unlocked enabled Forge recipe takes priority
- exactly one craft attempt per entry
- no material consumption when output is full
- no material consumption on validation failure
- existing rarity, quality, defects, discoveries, stats, and objectives remain active

Shelf behaviour:

- correct category stocks carried items automatically
- wrong category does not remove carried items
- full shelf explains the failure

### `tests/interaction-tests.mjs` — new

Test:

- sufficient materials → exactly one output
- insufficient materials → no loss
- full output → no loss
- standing still → no repeat
- leave and re-enter → next attempt
- output pickup updates carried item
- correct shelf stocks
- wrong shelf preserves carried item
- sale decrements stock
- coin pickup increments cash once

### `style.css`

Add mobile-readable floor-logo states:

```text
ready
blocked
success
locked
```

Minimum visible logo footprint: 88 × 72 world px.

Do not add persistent DOM controls for routine crafting.

## M2 acceptance gate

- First Sword crafted without pressing a craft button.
- First sale completed without opening a panel.
- First sale under 90 seconds on physical iPhone Safari.
- No duplicate craft while remaining on the pad.
- No material loss on any failed craft path.

## M2 rollback

Disable `interactions.js` and restore v0.22.00 interaction behaviour without changing save data.

---

# 7. Milestone M3 — Mobile onboarding and day model

**Target version:** v0.23.00  
**Priority:** P1  
**Depends on:** M2

## Exact file changes

### `index.html`

Keep permanent UI to:

- cash
- day/time
- one current objective
- bottom navigation

Ensure icon-only controls have `aria-label`.

### `style.css`

Enforce portrait budgets:

```text
status row ≤ 30 px
objective row ≤ 36 px
bottom navigation ≤ 54 px + safe area
action row ≤ 40 px when visible
permanent UI obstruction < 15% viewport height
```

Reference viewports:

```text
360 × 800
390 × 844
393 × 852
430 × 932
```

Requirements:

- primary touch targets at least 44 × 44 CSS px
- panel internal scrolling
- no scroll chaining
- safe-area inset support
- 200% zoom without losing controls
- reduced-motion support
- portrait/landscape recovery

### `game.js`

Replace the 120-second opening-day rule:

```text
Day 1: no hard timer; ends after first sale or End Day
Day 2: no hard timer; teaches first upgrade and Alchemy path
Day 3+: 240-second active day
```

Pause timer when:

- full-screen panel is open
- Day Complete summary is open
- recoverable error panel is open

Add **End Day Early**.

### Save migration

Add:

```text
save.dayMode
save.currentObjective
save.tutorialFlags
```

Defaults must preserve existing progression.

### Progressive disclosure

First-sale phase shows only:

- Material Yard
- Forge
- Attack Shelf
- checkout

Hide or disable advanced navigation until unlock conditions are met.

### Tests

Add responsive and day-state checks:

- panel timer pause
- Day 1 no timer expiry
- Day 3 240-second timer
- End Day Early pays rewards once
- rotation with panel open
- BAG and panel repeated open/close

## M3 acceptance gate

- No control overlap at all reference viewports.
- Centre 60% of portrait viewport remains available for gameplay.
- New player completes first sale without external instructions.
- Timer never advances under a full-screen panel.
- Touch targets meet minimum size.

---

# 8. Milestone M4 — Visible shop growth

**Target version:** v0.24.00  
**Priority:** P1  
**Depends on:** M3

## Exact file changes

### `data/map_model.json`

Add visual-tier references for:

```text
attackShelfTier
forgeTier
staffHouseTier
customerHallTier
exteriorTier
```

### `game.js`

Render by tier while preserving existing gameplay values.

### `style.css`

Add unlock celebration and upgrade comparison layouts.

### Save migration

Add:

```text
save.shopVisualTier
```

### Required tiers

Attack Shelf:

```text
Tier 1 = rough timber, 4 slots
Tier 2 = reinforced, 8 slots
Tier 3 = premium rack, 12 slots
```

Forge:

```text
Tier 1 = one anvil/output
Tier 2 = second position/two-job queue
Tier 3 = quality bonus
```

Staff House:

```text
Tier 1 = one bed
Tier 2 = three beds
Tier 3 = five beds and recovery bonus
```

Customer Hall:

```text
Tier 1 = plain counter
Tier 2 = queue markings/decor
Tier 3 = premium counter/high-value customers
```

## M4 acceptance gate

Shop Level 1 and Shop Level 3 screenshots are visibly different with the HUD hidden.

---

# 9. Milestone M5 — Customer decision vertical slice

**Target version:** v0.25.00  
**Priority:** P2  
**Depends on:** M4

## Exact file changes

### `game.js`

Add an important-customer sale state:

```text
sell at listed price
attempt surcharge with shown chance
recommend a higher-tier item
```

Routine customers and assigned sales workers remain automatic.

### `index.html`

Add a semantic two-tap-maximum sale decision overlay.

### `style.css`

Implement portrait-safe sale choice controls.

### Tests

- decision opens only for eligible customers
- sale value and reputation update once
- recommendation checks stock
- failed surcharge cannot duplicate or lose stock incorrectly

## M5 acceptance gate

At least 20% of mid-game sales offer a meaningful choice resolved in fewer than two taps.

---

# 10. Milestone M6 — Greenwood expedition vertical slice

**Target version:** v0.26.00  
**Priority:** P2  
**Depends on:** M5

## Exact file changes

### `data/map_model.json`

Add Greenwood Edge combat and return targets.

### `game.js`

Limit first expedition release to:

- Slime
- Wolf
- Slime Gel
- Wolf Fang
- player or worker participation
- recovery cost
- two material-dependent recipes

### Tests

- enter/return route
- worker assignment/reload
- reward delivery
- inventory capacity
- no duplicate expedition completion
- shop state preserved during expedition

## M6 acceptance gate

Complete expedition and return loop passes without breaking shop state, navigation, or saves.

---

# 11. Test and release commands

Run for every release:

```bash
node --check game.js
node tests/static-checks.mjs
node tests/route-matrix.mjs
node tests/save-migration-tests.mjs
node tests/interaction-tests.mjs
```

Serve locally:

```bash
python3 -m http.server 8000
```

Manual browser checks:

```text
http://localhost:8000/?debug=collision
http://localhost:8000/?v=<release-version>
```

GitHub Pages checks:

- uploaded files are extracted, not a ZIP
- asset query strings match the release version
- hard refresh or versioned URL loads new JavaScript and CSS
- no 404 network requests
- no uncaught console errors
- old save migrates and reloads

---

# 12. Required release report

Every released ZIP and GitHub Pages update must state:

- version
- trusted baseline
- exact changed files
- exact new files
- removed files
- save migration status
- automated checks executed and results
- browser checks executed and results
- physical-device checks executed and results
- unexecuted tests
- known limitations
- rollback steps
- ZIP size
- SHA-256 checksum

Never describe a build as mobile-ready until the physical iPhone Safari critical journeys pass.

---

# 13. Milestone status board

- [x] M0 — Baseline and diagnostics
- [ ] M1 — Single-source navigation foundation
- [ ] M2 — Automatic Sword loop
- [ ] M3 — Mobile onboarding and day model
- [ ] M4 — Visible shop growth
- [ ] M5 — Customer decision vertical slice
- [ ] M6 — Greenwood expedition vertical slice

## Current next action

Review the M0 route-matrix failures, then implement **M1 only**. Do not add content until the single-source map reaches 100% critical-route pass.

---

# Change log

## Plan 1.1 — 20 October 2026

- Added exact current repository inventory and implementation anchors.
- Added target GitHub file structure.
- Added exact per-file changes for M0–M6.
- Added version targets, dependencies, acceptance gates, rollback steps, migration changes, and release commands.
- Confirmed M0 diagnostics as the next implementation scope.


## M0 execution record — 20 October 2026

- Static checks: passed.
- Debug overlay script syntax: passed.
- Map inventory generated: passed.
- Route matrix executed: see `route-matrix-results.txt`; failures are release blockers for M1.
- Real-browser and physical-device checks: not executed.
- Gameplay, map geometry, and saves: not intentionally changed.
