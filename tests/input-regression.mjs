import fs from 'fs';
const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const checks=[
 ['version',game.includes("const VERSION='v0.22.21'")&&html.includes('v0.22.21')],
 ['removed DOM dereference',!game.includes("$('craftGame').classList")],
 ['removed manual functions',!game.includes('function startCraftGame(')&&!game.includes('function finishCraft(')],
 ['pointer down non-passive',game.includes("c.addEventListener('pointerdown',dragStart,{passive:false})")],
 ['pointer move non-passive',game.includes("c.addEventListener('pointermove',dragUpdate,{passive:false})")],
 ['pointer capture loss',game.includes("c.addEventListener('lostpointercapture',dragEnd)")],
 ['visibility reset',game.includes("document.addEventListener('visibilitychange'")],
 ['blur reset',game.includes("addEventListener('blur',resetDragMovement)")],
 ['panel reset',game.includes('function openPage(p){\n  resetDragMovement();')],
 ['safe joystick DOM',game.includes("const stick=$('dragStick');")&&game.includes("const knob=$('dragStick')?.firstElementChild")],
 ['canvas touch action',fs.readFileSync(new URL('../style.css',import.meta.url),'utf8').includes('touch-action:none')]
];
for(const [name,pass] of checks)console.log(`${pass?'PASS':'FAIL'} ${name}`);
if(checks.some(x=>!x[1]))process.exitCode=2;
