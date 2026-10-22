# 2-week art improvement plan

## Goal

Improve the visual clarity, room identity, and mobile readability of the main gameplay rooms without changing route matrix, collision, or room coordinates.

## Scope constraints

- Keep route matrix at 40/40
- Keep collision rectangles unchanged
- Do not broaden the feature set
- Do not add decorative blockers or major gameplay systems
- Prioritize readability, room identity, and phone usability

## Week 1 — silhouette and room identity pass

### Goal

Make each room readable without labels.

### Deliverables

#### 1. Forge redesign pass
- Strengthen furnace silhouette as the main anchor
- Clarify anvil and workbench relation
- Improve flow from furnace to output
- Add clean ember and heat framing
- Keep action zone clearly readable

#### 2. Alchemy redesign pass
- Build a stronger cauldron silhouette
- Clarify bottle shelf shape and wall structure
- Make the output location obvious
- Reduce alchemy clutter while preserving the magical mood
- Ensure the room reads as process-driven and not random

#### 3. Retail redesign pass
- Distinguish Attack, Defence, and Other shelves more clearly
- Localize category accents to the shelf zone
- Simplify shelf composition so categories read fast
- Strengthen the checkout counter with clear brass trim and queue cues

#### 4. Customer Hall pass
- Make checkout counter dominant and functional
- Define queue studs and coin tray clearly
- Strengthen hanging sign identity
- Keep the room calm but active

### Week 1 QA gate

- All major rooms must read in under 1 second from normal player distance
- No room should require permanent text labels to be understood
- Forge and Alchemy should be identifiable from silhouette alone
- Retail categories should be distinguishable without reading UI labels

## Week 2 — mobile polish and validation

### Goal

Make the artwork pass on actual phone screens.

### Deliverables

#### 1. Real-device screenshot capture
- Capture before/after screenshots from identical camera positions
- Check both portrait and landscape orientations
- Confirm the same room comparison at consistent zoom

#### 2. UI and label tuning
- Tune label distance thresholds and fade behavior
- Reduce distant label clutter
- Keep only near-player labels visible
- Collapse customer requests to icons where needed

#### 3. Interaction readability pass
- Ensure process pads remain readable under player sprite overlap
- Adjust glow, outline, and state ring treatments
- Confirm blocked/ready/active states are still understandable

#### 4. Final art balance pass
- Reduce low-priority decoration noise
- Increase depth on walls and important furniture
- Improve materials and ground variation without clutter

### Week 2 QA gate

- Test on iPhone Safari at portrait and landscape sizes
- Ensure all key rooms remain readable at phone viewing distance
- Confirm labels are only subtle support, not visual necessity
- Check route clarity and player legibility during movement and interaction

## Art pass checklist by phase

### Phase A — foundation
- Wall depth and shadow treatment
- Ground variation and material separation
- Doorway and bridge silhouettes
- Room anchor objects

### Phase B — room identity
- Forge anchor layout
- Alchemy anchor layout
- Retail category zoning
- Customer Hall counter and queue flow

### Phase C — polish
- Outline and contrast tuning
- Decorative trim reduction
- Room-to-room consistency pass
- Small scenic variation without clutter

### Phase D — validation
- Real-device screenshot pass
- Route and mobility checks
- Final readability review
- Release readiness sign-off

## Exit criteria

The pass is complete when:
- every major room reads without labels
- routes remain clear and safe
- collision remains unchanged
- the world feels intentional at mobile scale
- the art direction feels coherent across all rooms

## Suggested milestone cadence

### Day 1–3
- Collect comparison screenshots
- Review room silhouette issues
- Identify weak rooms and asset gaps

### Day 4–7
- Forge, Alchemy, Retail, and Customer Hall redesign
- Re-test with immediate room readability checks

### Day 8–10
- Build and tune remaining rooms
- Consolidate the art grammar across all rooms

### Day 11–14
- Mobile screenshot pass
- Real-device QA
- Fix final readability issues
- Final signoff

