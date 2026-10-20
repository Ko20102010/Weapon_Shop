import fs from 'fs';import {execFileSync} from 'child_process';import path from 'path';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
execFileSync('node',['--check',path.join(root,'game.js')],{stdio:'inherit'});
const model=JSON.parse(fs.readFileSync(path.join(root,'data/map_model.json'),'utf8'));
const required=['world','rooms','walls','doorways','water','blockingFurniture','interactionZones','spawnPoints','navigationTargets'];for(const k of required)if(!(k in model))throw Error('missing '+k);
const ids=[];for(const k of required.filter(k=>Array.isArray(model[k])))for(const o of model[k]){if(!o.id)throw Error(`${k} item missing id`);ids.push(`${k}:${o.id}`);if(!Number.isFinite(o.x)||!Number.isFinite(o.y))throw Error(`${o.id} invalid coordinate`);if('w'in o&&(!(o.w>0)||!(o.h>0)))throw Error(`${o.id} invalid size`);if(o.x<0||o.y<0||o.x+(o.w||0)>model.world.width||o.y+(o.h||0)>model.world.height)throw Error(`${o.id} out of bounds`)}
if(new Set(ids).size!==ids.length)throw Error('duplicate scoped IDs');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const htmlIds=[...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]);if(new Set(htmlIds).size!==htmlIds.length)throw Error('duplicate HTML IDs');
for(const f of ['style.css','game.js','js/debug-overlay.js','data/map_model.json'])if(!fs.existsSync(path.join(root,f)))throw Error('missing '+f);
for(const token of ['v0.22.00','style.css?v=0.22.00','game.js?v=0.22.00','debug-overlay.js?v=0.22.00'])if(!html.includes(token)&&token!=='v0.22.00')throw Error('HTML version mismatch '+token);
console.log(`STATIC PASS rooms=${model.rooms.length} walls=${model.walls.length} doors=${model.doorways.length} zones=${model.interactionZones.length}`);
