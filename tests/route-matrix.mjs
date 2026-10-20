import fs from 'fs';import path from 'path';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');const m=JSON.parse(fs.readFileSync(path.join(root,'data/map_model.json'),'utf8'));
const cell=26,gw=Math.ceil(m.world.width/cell),gh=Math.ceil(m.world.height/cell);
const pointIn=(x,y,a,p=0)=>x>=a.x-p&&x<=a.x+a.w+p&&y>=a.y-p&&y<=a.y+a.h+p;
const blocked=(x,y,r=15)=>{if(x-r<24||x+r>m.world.width-24||y-r<24||y+r>m.world.height-24)return true;if(m.doorways.some(a=>pointIn(x,y,a,-Math.max(0,r-3))))return false;return m.walls.some(a=>x+r>a.x&&x-r<a.x+a.w&&y+r>a.y&&y-r<a.y+a.h)};
const grid=new Uint8Array(gw*gh);for(let y=0;y<gh;y++)for(let x=0;x<gw;x++)grid[y*gw+x]=blocked(x*cell+cell/2,y*cell+cell/2)?1:0;
const rawCell=p=>[Math.max(0,Math.min(gw-1,Math.floor(p.x/cell))),Math.max(0,Math.min(gh-1,Math.floor(p.y/cell)))];
const toCell=p=>{const [gx,gy]=rawCell(p);if(!grid[gy*gw+gx])return[gx,gy];for(let r=1;r<=8;r++)for(let y=gy-r;y<=gy+r;y++)for(let x=gx-r;x<=gx+r;x++)if(x>=0&&y>=0&&x<gw&&y<gh&&!grid[y*gw+x])return[x,y];return[gx,gy]};
function reachable(a,b){const [sx,sy]=toCell(a),[tx,ty]=toCell(b),q=[[sx,sy]],seen=new Uint8Array(gw*gh);seen[sy*gw+sx]=1;while(q.length){const [x,y]=q.shift();if(x===tx&&y===ty)return true;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,i=ny*gw+nx;if(nx>=0&&ny>=0&&nx<gw&&ny<gh&&!seen[i]&&!grid[i]){seen[i]=1;q.push([nx,ny])}}}return false}
const spawn=Object.fromEntries(m.spawnPoints.map(x=>[x.id,x])),targets=Object.fromEntries(m.navigationTargets.map(x=>[x.id,x]));
const roomCentre=Object.fromEntries(m.rooms.map(r=>[r.id,{x:r.x+r.w/2,y:r.y+r.h/2}]));
const rows=[];for(const [id,p] of Object.entries(roomCentre))rows.push({from:'playerSpawn',to:`room:${id}`,pass:reachable(spawn.playerSpawn,p)});for(const id of ['swordOut','shieldOut','potionOut','attackShelf','defenseShelf','otherShelf','coinPile','checkoutWait','hire','contractDrop','training','office','visitor','gate'])if(targets[id])rows.push({from:'playerSpawn',to:id,pass:reachable(spawn.playerSpawn,targets[id])});
for(const id of ['attackShelf','defenseShelf','otherShelf','checkoutWait'])if(targets[id])rows.push({from:'customerSpawn',to:id,pass:reachable(spawn.customerSpawn,targets[id])});for(const id of ['attackShelf','defenseShelf','otherShelf','coinPile','hire','contractDrop','gate'])if(targets[id])rows.push({from:'staffSpawn',to:id,pass:reachable(spawn.staffSpawn,targets[id])});
console.log('ROUTE MATRIX');for(const r of rows)console.log(`${r.pass?'PASS':'FAIL'} ${r.from} -> ${r.to}`);const fail=rows.filter(x=>!x.pass);console.log(`SUMMARY pass=${rows.length-fail.length} fail=${fail.length}`);if(fail.length)process.exitCode=2;
