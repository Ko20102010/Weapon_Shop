import fs from 'fs';
const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]));
const refs=new Set([...game.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]));
// IDs below are created dynamically inside panelContent before use.
const dynamic=new Set(['applyRecommended','goSelf','sendWorker','hire','house','office','saveExit','noSave']);
const missing=[...refs].filter(x=>!ids.has(x)&&!dynamic.has(x));
console.log(`HTML IDs ${ids.size}; DOM references ${refs.size}; unexplained missing ${missing.length}`);
if(missing.length){console.log('FAIL missing DOM IDs:',missing.join(', '));process.exitCode=2}else console.log('PASS DOM reference audit');
const required=['game','panel','dragStick','daySummary','slotScreen','mainMenu','bagToggle','toast'];
for(const id of required){const pass=ids.has(id);console.log(`${pass?'PASS':'FAIL'} required #${id}`);if(!pass)process.exitCode=2}
if(/onclick="[^"]*triggerCraft/.test(html)||game.includes('window.triggerCraft')){console.log('FAIL stale manual craft trigger');process.exitCode=2}else console.log('PASS no stale manual craft trigger');
