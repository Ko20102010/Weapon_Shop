# Weapon Shop Empire Development Priority Plan

**Living document:** update this file whenever requirements, priorities, acceptance criteria, implementation status, test evidence, or release risks change in a future chat.

**Current baseline:** v0.21.05  
**Trusted gameplay lineage:** v0.19.00  
**Target:** mobile-first browser game on GitHub Pages  
**Release rule:** a build is blocked if the player, customer, or worker cannot reach a critical room or if a visible wall disagrees with collision.

## Product statement

Build a compact woodland weapon-shop automation game where materials are gathered, products are crafted, stock is placed on physical shelves, customers purchase items, staff automate work, and expeditions provide advanced materials.

## Interaction rules

1. Open space is walkable. A “road” means enough clear space, not a painted corridor.
2. A visible wall blocks movement.
3. A visible doorway does not block movement.
4. Furniture blocks movement only at its visible footprint.
5. Step on a Forge or Alchemy floor logo to craft once automatically.
6. Leave and re-enter a process logo to repeat the action.
7. Walk over finished output to pick it up.
8. Step at the matching shelf to stock carried products.
9. Walk over checkout coins to collect them.
10. Complex management actions may use panels; routine production should not.

# Priorities

## P0 — Navigation, collision, and playable map

**Why:** every other system depends on reliable movement.

### Requirements
- Every room has at least one clearly visible entrance.
- Entrances use narrow collision clearances through the actual wall only.
- No broad “road” rectangle may erase room walls, furniture, or artwork.
- Open space between rooms remains visually simple and walkable.
- Player, customers, employees, and A* navigation use the same collision function.
- Bridge is walkable; deep water remains blocked.
- Add a temporary developer collision overlay before future map changes.

### Critical routes
- Visitor Plaza ↔ main compound
- Main compound ↔ Attack, Defence, Other, checkout, Rare Storage
- Main spine ↔ Forge, Alchemy, Material Yard, Staff House, Training Yard
- Main spine ↔ Contract Warehouse and both Management entrances
- Main spine ↔ Forest Gate

### Acceptance checks
- Keyboard/touch player route reaches every room.
- A* test entity reaches every station and shelf.
- No invisible collision on open floor.
- No visible wall can be crossed except at a doorway.
- Ten repeated entries through each doorway do not trap the entity.

### Status
- **Implemented in v0.21.05:** broad painted roads removed; narrow doorway clearances added.
- **Not device-verified:** iPhone Safari route traversal.

## P0 — Automatic first production loop

### Target loop
1. Gather 2 Iron and 1 Wood.
2. Step on **AUTO CRAFT**.
3. One Iron Sword is crafted using the existing quality system.
4. Walk over the output table to collect it.
5. Approach the Attack Shelf to stock it.
6. Customer buys it.
7. Collect checkout coins.

### Acceptance checks
- No craft button is required near the Forge.
- Forge defaults to Iron Sword at game start.
- One pad entry creates at most one item.
- Insufficient materials display a concise message.
- Full output table prevents crafting without consuming materials.
- Leaving and re-entering crafts again.

### Status
- **Implemented:** Forge and Alchemy auto-process pads.
- **Manual local craft buttons removed.**
- **Not device-verified:** touch movement onto and away from the pad.

## P1 — First five-minute onboarding

### Requirements
- Only the Iron Sword loop is prominent at the start.
- Current Goal always points to the next physical action.
- Advanced menus remain hidden until unlocked.
- First sale should be achievable without opening a management panel.
- First visible upgrade appears after the opening sales milestone.

### Acceptance checks
- New player completes first sale without external instructions.
- Tutorial never blocks the player or a required station.
- Portrait UI leaves the centre playfield visible.

## P1 — Physical shop objects and visible growth

### Requirements
- Shelves, checkout, Forge, Alchemy, beds, desks, crates, and training objects are visible furniture.
- Upgrade tiers change the object art and usable capacity.
- Shelf stock visually matches stored quantities.

### Suggested tiers
- Shelf: 4 → 8 → 12 slots
- Forge: 1 job → 2-job queue → quality bonus
- Staff House: 1 → 3 → 5 workers
- Warehouse: 1 → 2 → 4 active contracts

## P1 — Mobile UI clarity

### Requirements
- One compact status row.
- One slim current-goal bar.
- One contextual action area.
- One bottom navigation row.
- BAG and Overview remain secondary utilities.
- Panels respect safe-area insets and do not cover navigation.

### Acceptance checks
- 390 × 844 portrait: no overlap between HUD, tutorial, BAG, action bar, and navigation.
- 844 × 390 landscape: tutorial hidden and controls remain reachable.
- Touch targets are at least 40 CSS px for primary actions.

## P2 — One polished expedition area

### Greenwood Edge
- Slime and Wolf enemies
- Slime Gel and Wolf Fang materials
- Worker assignment or player participation
- Recommended power and recovery cost
- At least two specialised recipes

### Acceptance checks
- Shop loop remains active before and after expedition.
- Rewards visibly enter the Parts inventory.
- Worker and player routes cannot become stuck.

## P2 — Meaningful customer decisions

Add a small sale decision instead of full negotiation complexity:
- Sell at listed price
- Attempt surcharge with shown success chance
- Recommend a higher-tier item

## P3 — Content and retention

- Product discovery book
- Customer loyalty
- Worker specialisations
- Shop appearance upgrades
- Optional daily challenges
- Save export/import

# Day-system decision

## Current state
- 120-second day retained from the trusted runtime.

## Recommendation
- Day 1–2: no hard time pressure or a guided day.
- Day 3 onward: 240 seconds.
- Pause while full-screen panels are open.
- Always offer **End Day Early**.
- Day review: sales, revenue, stock-outs, missed demand, wages, crafted items, and expedition returns.

# Release gates

A release must not ship when any of these are confirmed:
- blank start screen or uncaught JavaScript exception
- inaccessible critical room
- visible/collision wall mismatch
- A* route failure to a critical station
- save loss or failed migration
- crafting consumes materials without output
- mobile controls overlap a critical action

# Test evidence required per release

- JavaScript syntax
- duplicate HTML IDs
- save/reload regression
- automated geometry checks for doorway openness
- A* reachability matrix for all critical destinations
- desktop browser smoke test
- portrait and landscape browser test
- physical iPhone Safari test when available
- GitHub Pages cache-busting/version check

# Change log

## v0.21.05
- Converted “roads” from broad visible painted corridors to open space.
- Replaced broad collision overrides with narrow doorway clearances.
- Kept only small threshold mats at entrances.
- Retained automatic Forge and Alchemy floor logos.
- Added this living development-priority plan.
