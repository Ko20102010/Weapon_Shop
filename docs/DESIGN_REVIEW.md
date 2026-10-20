# Design Review

## Problems addressed
1. Earlier versions mixed two maps and collision models. v0.20.00 returns to one authoritative geometry: R, SOLIDS and PTS from v0.19.00.
2. On mobile, request cards and tutorial panels obscured the playfield. Distant requests now collapse to an icon and the tutorial is smaller.
3. Roads and doors lacked hierarchy. The redesigned art uses a strong centre spine, branch roads and contrasting doorway mats.
4. Room identity relied on oversized labels. District colour strips and restrained labels now share that job.
5. Animated UI pulse and large buttons competed with gameplay. Controls are calmer and more compact.

## Acceptance rule
If a wall is visible, it originates from SOLIDS. If SOLIDS blocks a point, that wall is rendered. No second map or second collision model is included.
