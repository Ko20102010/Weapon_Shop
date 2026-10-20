import fs from 'fs';
const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const checks=[
 ['version',game.includes("const VERSION='v0.22.20'")&&html.includes('v0.22.20')],
 ['continuous interval',game.includes('const AUTO_CRAFT_INTERVAL=1.15')&&game.includes('autoCraftState.elapsed+=dt')],
 ['immediate first craft',game.includes('attemptPadCraft(id,true);\n    return;')],
 ['repeat while inside',game.includes('autoCraftState.elapsed%=AUTO_CRAFT_INTERVAL')],
 ['reset on exit',game.includes("autoCraftState={padId:'',elapsed:0,crafted:0,blockedReason:''};return")],
 ['dt passed from player tick',game.includes('processAutoCraftPads(dt);')],
 ['full output guard',game.includes('Output table full')&&game.includes('outputGroupCount(key)>=S.outputCap')],
 ['missing material detail',game.includes('more ${mat[0].toUpperCase()+mat.slice(1)}')],
 ['progress ring',game.includes('autoCraftState.elapsed/AUTO_CRAFT_INTERVAL')],
 ['manual overlay removed',!html.includes('id="craftGame"')&&!html.includes('id="craftTap"')],
 ['auto tutorial',game.includes('continues while you remain on the logo')]
];
for(const [name,pass] of checks)console.log(`${pass?'PASS':'FAIL'} ${name}`);
if(checks.some(x=>!x[1]))process.exitCode=2;
