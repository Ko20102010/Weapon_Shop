# Weapon Shop Empire — Before-and-After Map-Art Review

**Review version:** 1.0  
**Before build:** v0.21.05 Open Space Map  
**After build:** v0.22.00 Navigation Foundation  
**Next implementation target:** v0.22.10 Automatic Sword Loop  
**Review scope:** map readability, collision communication, visual hierarchy, mobile legibility, room identity, environmental consistency, and production-zone clarity.

---

## 1. Executive assessment

The v0.22.00 map is structurally better than v0.21.05 because broad painted corridors were removed, room openings were rebuilt, retail/customer spaces became visually open, and the automated route matrix improved from 24/40 passing routes to 40/40.

The map is not yet visually complete. The v0.22.00 art establishes a cleaner foundation, but several areas still read as coloured rectangles rather than a developed woodland weapon shop. The next build must preserve the 40/40 route result while improving material texture, room identity, furniture silhouettes, depth, and mobile-scale recognition.

### Release decision

- Navigation foundation: **automated pass**
- Map-art direction: **approved with required follow-up**
- Physical iPhone route test: **not executed**
- Mobile-ready claim: **not permitted yet**

---

## 2. Before-and-after summary

## Before: v0.21.05

### Strengths

- Existing room names and functional areas remained recognisable.
- Forge and Alchemy process pads were visible.
- Woodland colours were present.
- The map contained distinct areas for shop operations, staff, management, customers, and expeditions.

### Weaknesses

- Door clearances were manually layered over a separate wall system.
- Several critical rooms and targets were unreachable.
- Upper rooms appeared visually connected but were not consistently connected in collision/navigation.
- Some map elements competed for attention with large labels and UI overlays.
- Furniture and collision footprints were not consistently generated from the same source.
- The map mixed decorative room art, structural walls, and interaction areas without a clear visual hierarchy.
- Open space and “road” logic were still ambiguous.

### Measured navigation result

```text
24 routes passed
16 routes failed
```

Failed areas included Material Yard, Staff House, Training Yard, Contract Warehouse, Forest Gate, related interaction targets, and several staff routes.

---

## After: v0.22.00

### Improvements

- Structural walls were rebuilt with explicit openings.
- Upper rooms gained aligned north/south links.
- Retail departments and Customer Hall became open display spaces.
- Broad painted roads were removed.
- Open grass and room clearances now provide circulation.
- Wall rendering and collision geometry were regenerated together during packaging.
- Furniture artwork was aligned with blocking furniture footprints.
- River and bridge presentation was simplified.
- Department colours were reduced to quieter floor palettes and slim accent strips.
- Small threshold mats replaced large corridor graphics.
- Forge and Alchemy process pads remained visually prominent.

### Measured navigation result

```text
40 routes passed
0 routes failed
```

### Remaining weaknesses

- Room floors still rely heavily on flat colour blocks.
- Several rooms lack unique environmental props that explain their purpose without labels.
- Walls use repeated segments with limited corner, doorway, and junction variation.
- The open retail/customer area needs stronger zoning without reintroducing painted roads.
- Exterior grass is repetitive and lacks focal landscaping.
- The river is readable but visually simple.
- Furniture silhouettes are too generic in Management and customer areas.
- Production pads can dominate nearby furniture at mobile zoom.
- Room labels remain more important than environmental storytelling.
- Depth ordering and walk-behind effects need refinement.

---

## 3. Area-by-area review

## Material Yard

### Before

- Materials were identifiable mainly through labels and node icons.
- Entrance reliability was poor.
- Yard boundaries did not clearly communicate an outdoor working area.

### After

- Reachability is restored.
- Open ground is clearer.
- The room colour is calmer.

### Next-build changes

- Add stacked logs, ore baskets, herb planters, and a simple storage canopy.
- Keep a 120 px clear route from the doorway to every gather node.
- Use small ground wear patches beneath nodes, not a continuous road.
- Ensure gatherable nodes have a stronger active/empty visual state.

## Staff House

### Before

- Beds existed, but the room function depended on the label.
- Staff routes failed.

### After

- Staff spawn and routes pass the automated matrix.
- The room remains visually sparse.

### Next-build changes

- Add visible beds, lockers, a notice board, and a hiring desk.
- Keep all props outside the staff spawn route.
- Differentiate occupied and available beds.
- Do not add collision to small decorative items.

## Training Yard

### Before

- Dummies were present, but access failed.

### After

- Player and staff target routes pass.
- The space remains visually plain.

### Next-build changes

- Add two training dummies, rack markings, and a worn practice patch.
- Keep the doorway-to-target line unobstructed.
- Use outdoor fencing only where collision is also present.

## Forge

### Before

- Forge equipment and process logo competed visually.
- Craft interaction rules changed between builds.

### After

- Forge route and output targets pass.
- Auto-craft pad remains available.

### Next-build changes

- Establish a clear visual sequence: furnace → anvil → AUTO CRAFT pad → output table.
- Reduce pad saturation when inactive; brighten only when the player carries enough materials.
- Add ember lighting and soot around equipment, not across walkable space.
- Keep a minimum 96 px doorway and 90 px circulation around the process pad.

## Alchemy Lab

### Before

- Colour identity was strong but visually noisy.
- Route reliability was inconsistent.

### After

- Route and potion output pass.
- Purple accent is restrained.

### Next-build changes

- Establish cauldron → AUTO BREW pad → output table.
- Add bottle shelves and herb bundles as non-blocking wall decoration.
- Reserve bright purple/green effects for active brewing only.

## Contract Warehouse

### Before

- Entrance and delivery target were blocked in route tests.

### After

- Player and staff contract routes pass.
- The room still lacks warehouse visual structure.

### Next-build changes

- Add crate stacks along perimeter walls.
- Add a clear delivery bay and floor emblem at the drop target.
- Keep central loading space open.
- Limit blocking crates to rectangles represented in the map model.

## Retail departments

### Before

- Separate room blocks and walls over-divided the sales floor.
- Customer and staff routes were inconsistent.

### After

- Attack, Defence, and Other departments are open display zones.
- All customer and staff shelf routes pass.

### Next-build changes

- Preserve open circulation.
- Differentiate categories through shelf shape, banners, and product silhouettes, not floor-wide colour blocks.
- Add a subtle 8–12 px category border or rug beneath each shelf only.
- Ensure customer request bubbles do not cover shelf icons.

## Customer Hall and checkout

### Before

- Walls and road overlays made the space visually crowded.

### After

- Customer Hall is open and checkout remains the primary blocker.
- Customer routes pass.

### Next-build changes

- Add a clear queue zone using small brass studs or short floor marks.
- Improve counter silhouette and coin collection effect.
- Keep the central queue path at least 120 px wide.
- Do not use full-width painted lanes.

## Rare Storage

### Before

- Visually distinct but route access was uncertain.

### After

- Route passes.

### Next-build changes

- Add locked display cases and subdued violet lighting.
- Keep rare cases against walls.
- Use lighting and item glow rather than a large saturated floor.

## Management

### Before

- Two entrances were difficult to read.
- Desks were generic rectangle blocks.

### After

- Management route passes.
- Two functional zones remain reachable.

### Next-build changes

- Distinguish Contracts desk and Upgrades table through props and icon plaques.
- Make both door thresholds visually obvious.
- Use paper, blueprint, and lamp details without adding collision.

## Visitor Plaza, bridge, Forest Gate, and forest

### Before

- The southern and northern travel chain was unreliable.

### After

- Visitor, bridge, Forest Gate, and forest routes pass.
- Exterior art remains basic.

### Next-build changes

- Add sparse shrubs and stones outside circulation space.
- Improve bridge rails and plank variation while preserving the exact bridge walkable bounds.
- Give Forest Gate a strong silhouette visible at mobile zoom.
- Keep tree canopies decorative; only trunks represented in the model may block movement.

---

## 4. Visual-system rules for the next build

1. **Open space is circulation.** Do not paint roads across rooms or furniture.
2. **Walls are structural.** Every visible structural wall must come from map-model collision geometry.
3. **Doorways are gaps.** Threshold art may indicate an opening but must never cover the opening with collision.
4. **Props explain function.** A room should be recognisable without reading the room label.
5. **Colour identifies, not floods.** Use category accents on shelves, banners, trim, and local rugs.
6. **Interaction logos are stateful.** Inactive pads are subdued; valid pads brighten; blocked pads show why.
7. **Furniture silhouettes matter.** Forge, cauldron, shelf, counter, bed, desk, crate, and gate should not share the same generic rectangle treatment.
8. **Mobile zoom governs detail.** Important objects must remain recognisable at the default portrait zoom.
9. **Decorations do not silently block.** Decorative pixels are non-blocking unless included in `map_model.json`.
10. **No art-only route changes.** Any changed wall, furniture footprint, doorway, water edge, bridge, or station must update the map model and rerun the route matrix.

---

## 5. Before-and-after evidence required for future builds

Each map-art build must include:

```text
docs/map-review/
├── before-overview.png
├── after-overview.png
├── before-forge.png
├── after-forge.png
├── before-retail.png
├── after-retail.png
├── before-customer-hall.png
├── after-customer-hall.png
├── before-mobile-portrait.png
└── after-mobile-portrait.png
```

### Capture requirements

- Same camera position and zoom for each pair.
- Same save fixture where possible.
- Debug overlay off for art review images.
- Separate collision-overlay screenshots for engineering evidence.
- Include portrait 390 × 844 capture.
- No personal data in captures.

### Review criteria

Score each area from 1 to 5:

- route readability
- room identity
- interaction clarity
- visual hierarchy
- colour consistency
- furniture readability
- mobile-scale legibility
- collision/art agreement

### Minimum acceptance

- No category scores below 3.
- Route readability and collision/art agreement must score 5.
- Overall average at least 4 before release.

---

## 6. Next-build implementation list

**Target:** v0.22.10

### Required files

- `MAP_ART_BEFORE_AFTER_REVIEW.md` retained and updated
- `data/map_model.json` updated for any changed blocking footprint
- `game.js` art rendering updates only after geometry review
- `style.css` mobile label and interaction-state adjustments
- `tests/route-matrix.mjs` rerun with 40/40 required
- `route-matrix-results.txt` refreshed
- `CHANGELOG.md` updated
- `DEVELOPMENT_PRIORITY_PLAN.md` milestone record updated
- `docs/map-review/` screenshot evidence added after real-browser capture

### Release gate

Do not release v0.22.10 if:

- route matrix is below 40/40
- any critical room fails physical iPhone entry/exit testing
- process pads are unclear at default portrait zoom
- new decorative elements create invisible collision
- before/after review evidence is missing

---

## 7. Review conclusion

v0.22.00 fixes the measurable navigation failures and removes the most damaging map-art problem: broad painted corridors covering the shop. The next build should not rearrange the map again. The next build should improve the existing map through recognisable props, cleaner materials, stateful interaction pads, restrained category accents, and consistent mobile-scale silhouettes while preserving the 40/40 route matrix.
