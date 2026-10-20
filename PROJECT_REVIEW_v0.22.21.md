# Project Review — v0.22.21 Input Hotfix

## Confirmed root cause

v0.22.20 removed the legacy `#craftGame` element from `index.html`, but `dragStart()` still executed:

```javascript
$('craftGame').classList.contains('show')
```

Because `$('craftGame')` returned `null`, every canvas `pointerdown` threw before drag state could start. This directly disabled drag-to-move.

## Fixes applied

- Removed the stale manual-crafting entry point and dead manual minigame functions.
- Replaced the pointer controller with DOM-safe checks.
- Added non-passive pointer down/move listeners so `preventDefault()` is reliable.
- Added pointer-capture loss handling.
- Added reset on browser blur and document visibility loss.
- Cancelled movement immediately when opening a panel or leaving to save slots.
- Preserved tap-to-move for pointer releases below the 10 px drag threshold.
- Preserved pinch zoom and mouse-wheel zoom.

## Whole-project review findings

### Architecture

- Static canvas browser game, plain JavaScript/CSS/HTML.
- LocalStorage persistence and versioned migration lookup.
- GitHub Pages deployment with query-string cache busting.
- No backend, database, authentication or external runtime dependency.

### Confirmed healthy areas

- JavaScript parses successfully.
- Map model parses and retains 15 rooms, 76 walls and 13 doorways.
- Automated route matrix remains 40/40.
- Artwork stabilisation checks pass.
- Continuous automatic-crafting source checks pass.
- No duplicate static HTML IDs.
- No unexplained static DOM references remain after the fix.

### Remaining risks

- Browser executables are unavailable in the build environment, so real pointer-event execution was not run.
- Physical iPhone Safari, Android Chrome, orientation, 200% zoom and GitHub Pages deployment remain unverified.
- Several management controls are dynamically rendered with inline handlers; they are functional in source but should be migrated to delegated listeners later.
- `game.js` remains a large monolithic file and carries higher regression risk.
- Save migration is source-verified but not browser-executed against real LocalStorage records.

## Release decision

v0.22.20 is blocked because drag movement is confirmed broken. v0.22.21 supersedes it. Publish v0.22.21 only, then verify drag movement and the first Sword loop on a physical phone.
