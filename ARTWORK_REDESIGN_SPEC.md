# Weapon Shop Empire — Artwork-First Redesign Specification

**Priority:** Artwork before new systems  
**Visual target:** modern mobile pixel-art management game  
**Constraint:** preserve the 40/40 route matrix and existing collision model  
**Do not add:** broad painted roads, decorative blockers, extra menus, or new gameplay systems during this pass

## 1. Visual diagnosis

The current map looks functional rather than desirable. Large flat floor colours, repeated wall blocks, generic rectangular furniture, oversized labels, and weak lighting make the world resemble an editor/debug view. The next pass must improve atmosphere and object recognition without changing navigation.

## 2. Art direction

### Style

- 24–32 px base pixel-art grid
- warm woodland workshop
- readable silhouettes at default mobile portrait zoom
- restrained earthy base palette with bright interaction highlights
- outlined gameplay objects; softer outlines on decoration
- no photorealistic textures
- no floor-wide category colours

### Core palette

- grass dark: `#244B2E`
- grass mid: `#356B3A`
- grass highlight: `#5B9450`
- timber dark: `#3A281F`
- timber mid: `#6A4630`
- timber light: `#A76E42`
- stone dark: `#3B4146`
- stone mid: `#697178`
- brass: `#D1A34A`
- forge ember: `#F36B2B`
- alchemy green: `#58C77A`
- alchemy violet: `#9168C6`
- water dark: `#185E78`
- water light: `#4FAFC5`
- UI cream: `#F5E4BC`

## 3. Layer order

1. ground base
2. local floor materials
3. rugs and wear marks
4. structural walls
5. furniture base
6. characters and movable items
7. tall props and walk-behind canopies
8. interaction glow and temporary effects
9. labels only when near the player

## 4. Map-wide changes

### Ground

- replace repeated grass dots with 3–4 hand-authored grass clusters
- add sparse stones, flowers, roots, and worn patches outside circulation space
- use subtle edge darkening around buildings
- keep all decoration non-blocking

### Walls

- create connected wall tiles: straight, inner corner, outer corner, doorway end, column, damaged variation
- use visible timber posts at room corners
- add shadow on the interior side of walls
- structural wall art must be generated from the same rectangles used by collision

### Doorways

- use timber posts and a small threshold plank
- no wide carpet or painted road
- doorway width remains 96–120 world px where possible
- add one warm highlight at unlocked entrances

### Floors

- Forge: dark stone with soot near furnace only
- Alchemy: worn timber/stone mix with local bottle stains
- Staff House: warm timber planks
- Training Yard: compacted dirt with a circular wear patch
- Retail: neutral timber with category rugs directly under shelves
- Customer Hall: neutral timber with small brass queue studs
- Management: cleaner timber with blue-grey rug under blueprint table
- Rare Storage: dark timber with narrow violet runner

## 5. Room identity props

### Material Yard
- stacked logs
- ore baskets
- herb planters
- canvas storage canopy
- empty-node state has open basket / cut stump

### Staff House
- individual beds
- lockers
- notice board
- hiring desk
- occupied bed icon

### Training Yard
- two dummies
- weapon rack
- target board
- compact dirt wear circle

### Forge
- furnace with animated ember
- anvil with readable horn silhouette
- water trough
- hammer rack
- output table
- visual sequence: furnace → anvil → AUTO CRAFT → output

### Alchemy
- cauldron
- bottle wall shelves
- herb drying rack
- output table
- visual sequence: cauldron → AUTO BREW → output

### Contract Warehouse
- perimeter crate stacks
- loading bay emblem
- hanging manifest board
- open central handling space

### Retail departments
- Attack shelf: red-brown small rug and blade silhouette banner
- Defence shelf: blue-grey rug and shield banner
- Other shelf: violet/green rug and bottle/tool banner
- category colour only beneath and above the shelf, never across the full room

### Customer Hall
- substantial checkout counter with brass trim
- small queue studs
- coin tray
- hanging shop sign

### Rare Storage
- locked glass/wood cases
- subdued violet accent light
- item glow only for stocked rare items

### Management
- contracts desk with papers and seal
- upgrade table with blueprint and lamp
- different icon plaque for each station

### Exterior
- improved bridge planks and rails
- Forest Gate with strong arch silhouette
- shrubs and stones kept away from navigation
- tree canopies can overlap visually; only trunks may block

## 6. Interaction art

### AUTO CRAFT / AUTO BREW

Inactive:
- 45% saturation
- thin outline
- no pulse

Ready:
- brighter trim
- one slow glow cycle
- small material-ready sparkle

Blocked:
- muted grey-red edge
- missing-material icon appears for 1.5 seconds

Success:
- brief 250 ms flash
- crafted item icon moves visually toward output table

### Shelf stocking

- use a small category emblem in front of each shelf
- emblem brightens only when the carried product matches
- wrong category remains dark and shows a short rejection icon

## 7. Mobile visual hierarchy

- room labels appear only within approximately 280 world px of the player
- customer requests collapse to one product icon until selected
- background decoration uses lower contrast than gameplay objects
- important gameplay objects retain 2–3 px dark outlines at default zoom
- no critical icon smaller than 18 CSS px on a 390 × 844 viewport
- interaction pads remain readable when partly covered by the player sprite

## 8. Animation budget

- water: 2–3 frame shimmer
- forge: 3 frame ember loop
- alchemy: 3 frame bubble loop
- stocked shelf: occasional 2 frame sparkle, only for high rarity
- gate torch: optional 3 frame flame
- avoid full-screen particles and constant UI pulsing
- respect `prefers-reduced-motion`

## 9. Required asset set

```text
assets/map/grass_clusters.png
assets/map/walls_woodland.png
assets/map/door_thresholds.png
assets/map/bridge.png
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
assets/map/forest_gate.png
assets/fx/process_pad_forge.png
assets/fx/process_pad_alchemy.png
assets/fx/process_states.png
```

Use transparent PNG atlases. Keep collision data in `data/map_model.json`, not in image dimensions.

## 10. Acceptance criteria

- route matrix remains 40/40
- no decorative asset introduces collision
- every room is identifiable without its text label
- route readability score: 5/5
- collision/art agreement: 5/5
- room identity: at least 4/5
- furniture readability: at least 4/5
- mobile-scale legibility: at least 4/5
- overall map-art average: at least 4/5
- before/after screenshots captured at identical camera position and zoom
- physical iPhone Safari route test completed before mobile-ready claim

## 11. Implementation order

1. grass, walls, doorway ends, and bridge
2. Forge and Alchemy props plus process-state art
3. retail shelves and checkout
4. Material Yard, Staff House, Training Yard, Warehouse
5. Management, Rare Storage, Forest Gate
6. room-label proximity fading and customer-request collapsing
7. before/after captures and scoring
8. route matrix and physical-device regression

## 12. Scope freeze

During the artwork pass, do not change:

- room coordinates
- doorway coordinates
- collision rectangles
- A* targets
- recipes
- prices
- day length
- unlock conditions
- save schema

Any required geometry change must be reviewed separately and must retain 40/40 route results.
