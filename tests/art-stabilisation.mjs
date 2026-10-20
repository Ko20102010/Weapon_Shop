import fs from 'fs';
const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const checks=[
 ['version',game.includes("const VERSION='v0.22.20'")&&html.includes('v0.22.20')],
 ['room label hysteresis',game.includes('function roomLabelNear(')&&game.includes('d<410:d<330')],
 ['process pad top ring',game.includes('function drawProcessPadOverlay()')&&game.includes('drawProcessPadOverlay();')],
 ['request separation',game.includes("x.y-86,'#352619'")],
 ['render recovery',game.includes("Map rendering error — reload this page")&&game.includes("console.error('Render failure'")],
 ['accessible controls',html.includes('aria-label="Show map overview"')&&html.includes('aria-label="Close panel"')],
 ['mobile utility target',css.includes('min-width:44px!important;min-height:44px!important')],
 ['focus visible',css.includes('button:focus-visible')]
];
for(const [name,pass] of checks)console.log(`${pass?'PASS':'FAIL'} ${name}`);
if(checks.some(x=>!x[1]))process.exitCode=2;
