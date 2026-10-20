# Weapon Shop Empire v0.19.05 Emergency Collision Fix

Based on the user-provided v0.19.00 runtime.

Fixes:
- Removes the duplicated old map rendering.
- Removes generated room-perimeter collision that caused invisible walls and sealed rooms.
- Uses one collision source: world boundary, physical furniture, and river water.
- Draws every blocking furniture/water rectangle visibly.
- Keeps the bridge gap walkable.
- Moves new-game spawn to the open central road.
- Preserves v0.19.00 customers, employees, products, contracts, expeditions, monsters, UI and 120-second day review.
