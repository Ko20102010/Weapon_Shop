import fs from 'fs';
const g=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
const checks=[
 ['document capture pointerdown',g.includes("document.addEventListener('pointerdown',dragStart,{passive:false,capture:true})")],
 ['document capture pointermove',g.includes("document.addEventListener('pointermove',dragUpdate,{passive:false,capture:true})")],
 ['document capture pointerup',g.includes("document.addEventListener('pointerup',dragEnd,{capture:true})")],
 ['app surface filter',g.includes('function isGameSurfaceEvent(ev)')&&g.includes("app.contains(ev.target)")],
 ['interactive exclusion',g.includes('function isInteractiveInputTarget(target)')&&g.includes('.tutorialCard,.daySummary,.slotScreen')],
 ['canvas capture retained',g.includes('c.setPointerCapture?.(ev.pointerId)')],
 ['continuous crafting retained',g.includes('AUTO_CRAFT_INTERVAL=1.15')]
];
for(const [n,p] of checks)console.log(`${p?'PASS':'FAIL'} ${n}`);if(checks.some(x=>!x[1]))process.exitCode=2;
