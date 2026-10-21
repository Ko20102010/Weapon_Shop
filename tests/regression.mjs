import fs from 'fs';
const g=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
const h=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const m=JSON.parse(fs.readFileSync(new URL('../data/map_model.json',import.meta.url),'utf8'));
const checks=[
 ['version',g.includes("const VERSION='v0.22.30'")&&h.includes('v0.22.30')],
 ['green map bug fixed',g.includes('const keyVector=keyboardVector()')&&!g.includes('const keys=keyboardVector()')],
 ['render before update',g.indexOf('    draw();\n    try{update(dt)}')>0],
 ['continuous craft',g.includes('AUTO_CRAFT_INTERVAL=1.15')],
 ['capture input',g.includes("document.addEventListener('pointerdown',dragStart,{passive:false,capture:true})")],
 ['visual paths',g.includes('Warm sandstone circulation paths')],
 ['wall rebuild',g.includes('Low open-workshop wall language')],
 ['geometry',m.rooms.length===15&&m.walls.length===76&&m.doorways.length===13]
];
for(const [n,p] of checks)console.log(`${p?'PASS':'FAIL'} ${n}`);if(checks.some(x=>!x[1]))process.exitCode=2;
