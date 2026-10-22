# Sprite and asset checklist

## Scope

This checklist is intended for the next art pass focused on the highest-visibility rooms and interaction art: Forge, Alchemy, Retail, and Customer Hall.

## General asset rules

- Use transparent PNG atlases where possible
- Keep all collision data in gameplay data, not in image dimensions
- Keep object proportions consistent across the map
- Ensure each sprite is readable at mobile zoom
- Do not create decorative props that block navigation or player flow
- Maintain a shared visual grammar: wall thickness, shadow angle, outline density, and material contrast

## Forge asset checklist

### Core room anchors
- Furnace body
- Furnace door or chamber opening
- Ember glow and small flame loop
- Anvil body and horn silhouette
- Water trough
- Hammer rack or tool wall
- Output table or tray
- Process pad state ring
- Material-ready sparkle

### Required states
- Idle furnace
- Active furnace
- Blocked state
- Success flash state
- Ready state glow

### Art rules
- Furnace should be the strongest silhouette in the room
- Ember should add warmth, not overpower the structure
- Output should be clearly separated from the crafting area
- The process visual should read in one glance

### Deliverable check
- Room reads as forge before text appears
- The process order is clear: furnace → anvil → output
- The same style is used across active and inactive states

## Alchemy asset checklist

### Core room anchors
- Cauldron body
- Bubble loop or liquid motion
- Bottle shelf wall
- Herb drying rack
- Output table
- Process pad with status ring
- Small mixing or reaction sparkle

### Required states
- Idle cauldron
- Brewing active
- Blocked state
- Ready state glow
- Success flash state

### Art rules
- Cauldron should be the dominant room anchor
- Shelf structure should feel fixed and architectural, not random decorative clutter
- The output table should remain secondary but obvious
- The room should remain readable even when the player stands in front of the process area

### Deliverable check
- Cauldron reads as magical workstation, not just a pot
- Bottle shelf looks intentional and structured
- Process flow reads clearly without label help

## Retail asset checklist

### Core room anchors
- Attack shelf structure
- Defence shelf structure
- Other shelf structure
- Category rugs or mats
- Category emblem or symbol for each shelf
- Product block silhouettes or category-coded shapes
- Checkout adjacency and narrow customer flow

### Required states
- Idle shelf
- Product stocked
- Correct-category highlight
- Wrong-category dark state
- Rejection feedback

### Art rules
- Use category colour only in the shelf zone, not room-wide
- Keep each shelf distinct without over-using bright colour
- The product zone should remain readable from normal mobile distance
- Ensure the shelf feels like an organized shop, not a pile of objects

### Deliverable check
- Each department is distinguishable without reading text labels
- Shelf accent remains local and controlled
- Category highlights are clear but not visually aggressive

## Customer Hall asset checklist

### Core room anchors
- Main checkout counter
- Brass trim or metal banding
- Queue studs or line markers
- Coin tray or payment surface
- Hanging shop sign
- Nearby walkway and interaction zone

### Required states
- Idle counter
- Active service interaction
- Transaction feedback or highlight

### Art rules
- Counter should be a dominant object with clear mass and depth
- Queue spacing should feel purposeful, not decorative
- The sign should be readable from a short distance and support room identity
- Small details should support the counter, not distract from it

### Deliverable check
- The room reads as a sales/service hall immediately
- Counter silhouette is stronger than the surrounding floor
- Interaction zone and queue flow remain clear at phone scale

## Interaction art checklist

### Forge
- active glow
- ready glow
- blocked red edge or missing material state
- short success flash
- output item movement cue

### Alchemy
- active bubble cycle
- ready glow
- blocked state
- success feedback
- output tray movement cue

### Shelf stocking
- category emblem in front of shelf
- correct-category brightness change
- wrong-category darkened state
- rejection icon timing

## Layer ordering rules

- ground
- local floor materials
- rugs and wear marks
- structural walls
- furniture base
- characters and movable items
- tall props and walk-behind canopies
- interaction glow and effects
- labels when close to the player

## Final acceptance tests

- The room is readable without text
- The process is apparent without UI labels
- The room retains strong mobile relative scale
- The room supports route flow and collision safety
- The room feels consistent with neighboring spaces
