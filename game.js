// Weapon Shop Empire v0.20.00
// 6-Layer Modular Forest Outpost Renderer (zero baked people/stock), Grid A* Pathfinding with anti-corner-cutting, 6 Recipes, Repair Kit, and Player Equipment.
'use strict';
const VERSION='v0.20.00';
const c=document.getElementById('game'),g=c.getContext('2d'),$=id=>document.getElementById(id);
let vw=1280,vh=720;
const WORLD={w:1870,h:2870};
const PREFIX='wse_v02000_slot_',OLD_PREFIXES=['wse_v01900_slot_','wse_v01702_slot_','wse_v01701_slot_','wse_v01700_slot_','wse_v01602_slot_','wse_v01601_slot_','wse_v01600_slot_','wse_v01501_slot_','wse_v01500_slot_','wse_v01400_slot_','wse_v01200_slot_','wse_v01100_slot_'],FOREVER_KEY='wse_forever_v02000',OLD_FOREVER_KEYS=['wse_forever_v01900','wse_forever_v01702','wse_forever_v01701','wse_forever_v01700','wse_forever_v01602','wse_forever_v01601','wse_forever_v01600','wse_forever_v01501','wse_forever_v01500'];
let slot=0,playing=false,last=performance.now(),target=null,msgTimer=0,dayTime=0,spawnTimer=2.5,zoom=.66,pinchStart=0,craftAnim=0,craftKey='sword',dragMove={active:false,id:null,sx:0,sy:0,dx:0,dy:0},animClock=0;

// v0.16.02 always uses the live modular renderer. Concept artwork is preview-only.

const SPRITES={};
const MODULAR_PATHS={
  wallStraight:'assets/walls/wall_straight.png',
  wallCornerOuter:'assets/walls/wall_corner_outer.png',
  wallPillar:'assets/walls/wall_pillar_pair.png',
  fenceSolid:'assets/walls/fence_solid.png',
  fenceShort:'assets/walls/fence_short.png',
  gateLarge:'assets/walls/gate_large.png',
  doorOpen:'assets/walls/door_frame_open.png',
  doorBeam:'assets/walls/door_frame_beam.png',
  fenceGate:'assets/walls/fence_gate.png',
  lampPost:'assets/walls/lamp_post.png',
  dirtPath:'assets/terrain/dirt_path.png',
  grassWhite:'assets/terrain/grass_flowers_white.png',
  grassRocks:'assets/terrain/grass_rocks_flowers.png',
  waterRocks:'assets/terrain/water_rocks.png',
  riverEdge:'assets/terrain/river_edge.png',
  hayBale:'assets/props/hay_bale.png',
  sacks:'assets/props/sacks.png',
  choppingBlock:'assets/props/chopping_block.png',
  streetLamp:'assets/props/street_lamp.png',
  bushRound:'assets/trees/bush_round.png',
  mushrooms:'assets/materials/mushrooms.png',
  rockMossy:'assets/materials/rock_mossy_large.png',
  grass:'assets/terrain/grass_plain.png',
  grassFlower:'assets/terrain/grass_flowers_color.png',
  floorWood:'assets/terrain/floor_wood.png',
  floorWork:'assets/terrain/floor_workshop.png',
  pathStone:'assets/terrain/path_sandstone.png',
  pathMoss:'assets/terrain/path_mossy_stone.png',
  bridge:'assets/terrain/bridge_wood.png',
  anvil:'assets/props/anvil_table.png',
  toolTable:'assets/props/tool_table.png',
  crates:'assets/props/crates.png',
  barrels:'assets/props/barrels.png',
  wagon:'assets/props/wagon.png',
  well:'assets/props/well.png',
  campfire:'assets/props/campfire.png',
  oreIron:'assets/materials/ore_iron.png',
  crystalBlue:'assets/materials/crystal_blue.png',
  herbBundle:'assets/materials/herb_bundle.png',
  fallenLog:'assets/trees/fallen_log.png',
  tree1:'assets/trees/tree_green_01.png',
  tree2:'assets/trees/tree_dark_green.png',
  pine1:'assets/trees/pine_01.png',
  bush:'assets/trees/bush_flowers.png'
};
for(const [k,path] of Object.entries(MODULAR_PATHS)){
  const img=new Image();
  img.src=path+'?v=0.20.00';
  SPRITES[k]=img;
}

let MAP_DATA=null;
if(typeof fetch==='function'){fetch('data/world_map.json?v=0.20.00').then(r=>r.ok?r.json():Promise.reject(new Error('map data unavailable'))).then(data=>{MAP_DATA=data}).catch(()=>{})}
function ensureMapAsset(path){const key='map:'+path;if(!SPRITES[key]){const img=new Image();img.src=path+'?v=0.20.00';SPRITES[key]=img}return SPRITES[key]}
function drawMapObjects(layer){if(!MAP_DATA?.objects)return;for(const o of MAP_DATA.objects){if(o.layer!==layer)continue;const img=ensureMapAsset(o.asset);if(img.complete&&img.naturalWidth){const ax=o.anchor?.[0]??.5,ay=o.anchor?.[1]??1;g.drawImage(img,o.x-o.w*ax,o.y-o.h*ay,o.w,o.h)}}}
function drawWallAssetSegment(seg){
  const horizontal=seg.w>=seg.h,img=SPRITES.wallStraight;
  // A continuous backing strip removes visible gaps between repeated wall sprites.
  pxRect(seg.x-3,seg.y-3,seg.w+6,seg.h+6,'#5f4432');
  pxRect(seg.x-1,seg.y-1,seg.w+2,Math.min(7,seg.h+2),'#9a7658');
  if(!(img&&img.complete&&img.naturalWidth))return;
  g.save();
  const step=horizontal?64:46,overlap=8;
  if(horizontal){
    for(let x=seg.x-overlap;x<seg.x+seg.w;x+=step-overlap){
      const dw=Math.min(step+overlap,seg.x+seg.w+overlap-x);
      g.drawImage(img,x,seg.y-20,dw,48);
    }
  }else{
    for(let y=seg.y-overlap;y<seg.y+seg.h;y+=step-overlap){
      const dh=Math.min(step+overlap,seg.y+seg.h+overlap-y);
      g.drawImage(img,seg.x-18,y,54,dh);
    }
  }
  g.restore();
}function sprReady(k){const i=SPRITES[k];return i&&i.complete&&i.naturalWidth>0}

const base={
  cash:250,rep:20,day:1,legacy:0,
  iron:14,wood:10,herb:10,gel:0,fang:0,hide:0,crystal:0,ember:0,bone:0,
  storageCap:8,outputCap:8,rareStorageCap:6,staffCap:2,contractSlots:1,contractCap:20,
  contracts:[],offers:[],
  skills:{quality:0,merchant:0,adventure:0,management:0},
  products:{
    sword:{on:true,unlocked:true,stock:0},
    axe:{on:false,unlocked:false,stock:0},
    shield:{on:false,unlocked:false,stock:0},
    helmet:{on:false,unlocked:false,stock:0},
    potion:{on:false,unlocked:false,stock:0},
    repair:{on:false,unlocked:false,stock:0}
  },
  output:{sword:0,axe:0,shield:0,helmet:0,potion:0,repair:0},
  outputItems:{sword:[],axe:[],shield:[],helmet:[],potion:[],repair:[]},
  shelfItems:{sword:[],axe:[],shield:[],helmet:[],potion:[],repair:[]},
  rareDisplay:[],
  equipped:{weapon:{name:'Starter Dagger',icon:'🗡️',stat:12},armor:{name:'Cloth Tunic',icon:'🥋',stat:10}},
  poorPolicy:'Honest',
  employees:[],review:4.3,badReviews:0,served:0,zoom:.66,tutorialStep:0,
  goals:[],event:null,visitorClaimed:false,
  statsDay:{sales:0,tips:0,crafted:0,monsters:0,lost:0},
  discoveries:[],productionPriority:'Balanced',
  coinsFloor:0,totalCoinsPicked:0,lifetimeSales:0,shopLevel:1,expeditionUnlocked:false,areaUnlocked:1,selectedArea:'greenwood',bagOpen:false,bagTab:'raw',expeditions:[]
};

let S=clone(base),
    player={x:745,y:1975,speed:325,hp:100,maxHp:100,carryKey:null,carryCount:0,carryItems:[],carryCap:3},
    clients=[],effects=[],monsters=[],drops=[],cam={x:0,y:0};
const keys={};

// Material Yard nodes aligned with Material Yard room (x:60..615, y:310..675)
const yardNodes=[
  {id:'wood1',type:'wood',name:'Timber Logs',icon:'🪵',spr:'fallenLog',x:145,y:495,ready:true,timer:0,max:9},
  {id:'iron1',type:'iron',name:'Iron Ore Pile',icon:'🪨',spr:'oreIron',x:255,y:495,ready:true,timer:0,max:9},
  {id:'herb1',type:'herb',name:'Herb Planters',icon:'🌿',spr:'herbBundle',x:450,y:450,ready:true,timer:0,max:9},
  {id:'herb2',type:'herb',name:'Crimson Herbs',icon:'🌿',spr:'herbBundle',x:430,y:575,ready:true,timer:0,max:10},
  {id:'iron2',type:'iron',name:'Crystal Vein',icon:'💎',spr:'crystalBlue',x:525,y:575,ready:true,timer:0,max:11}
];

// Aligned functional rooms on the 1870x2870 Forest Outpost map
const R={
  material:{x:60,y:310,w:555,h:365,title:'MATERIAL YARD',floor:'#7d6748'},
  staff:{x:660,y:310,w:565,h:370,title:'STAFF HOUSE',floor:'#b59b74'},
  training:{x:1265,y:325,w:270,h:345,title:'TRAINING YARD',floor:'#8b7654'},
  forge:{x:55,y:730,w:580,h:435,title:'FORGE (WEAPONS)',floor:'#876b52'},
  alchemy:{x:660,y:730,w:595,h:435,title:'ALCHEMY LAB',floor:'#7e6c54'},
  contract:{x:1285,y:660,w:535,h:505,title:'CONTRACT WAREHOUSE',floor:'#7b6546'},
  attack:{x:80,y:1190,w:460,h:430,title:'ATTACK PRODUCTS',floor:'#c8ad7f'},
  defense:{x:550,y:1190,w:390,h:430,title:'DEFENSE PRODUCTS',floor:'#c8ad7f'},
  other:{x:950,y:1190,w:315,h:430,title:'OTHER PRODUCTS',floor:'#c8ad7f'},
  rare:{x:70,y:1645,w:315,h:400,title:'RARE STORAGE',floor:'#594563'},
  counter:{x:400,y:1640,w:865,h:400,title:'CUSTOMER HALL & CHECKOUT',floor:'#ccb285'},
  management:{x:1285,y:1350,w:425,h:690,title:'MANAGEMENT & UPGRADES',floor:'#a88d67'},
  visitor:{x:110,y:2150,w:410,h:360,title:'SPECIAL VISITOR PLAZA',floor:'#968463'},
  gate:{x:770,y:105,w:350,h:195,title:'FOREST ADVENTURE GATE',floor:'#5e7844'},
  forest:{x:120,y:60,w:1620,h:235,title:'SLIME WOODS & RUINS',floor:'#2d6830'}
};

// Physical collision boxes (walls, shelves, counters, rivers) with wide, open doorways
const SOLIDS=[
  {x:0,y:0,w:1870,h:24},{x:0,y:2846,w:1870,h:24},{x:0,y:0,w:24,h:2870},{x:1846,y:0,w:24,h:2870},
  // Material Yard (South door x:280..405)
  {x:45,y:305,w:580,h:22},{x:45,y:305,w:22,h:380},{x:603,y:305,w:22,h:380},{x:45,y:665,w:235,h:22},{x:405,y:665,w:220,h:22},
  // Staff House (South door x:855..985)
  {x:655,y:305,w:580,h:22},{x:655,y:305,w:22,h:390},{x:1213,y:305,w:22,h:390},{x:655,y:675,w:200,h:22},{x:985,y:675,w:250,h:22},
  // Training Yard (South open entrance x:1320..1490)
  {x:1255,y:315,w:290,h:22},{x:1255,y:315,w:22,h:355},{x:1523,y:315,w:22,h:355},
  // Forge (South door x:285..425)
  {x:45,y:720,w:595,h:22},{x:45,y:720,w:22,h:455},{x:618,y:720,w:22,h:455},{x:45,y:1155,w:240,h:22},{x:425,y:1155,w:215,h:22},
  // Alchemy Lab (South door x:895..1030)
  {x:660,y:720,w:600,h:22},{x:660,y:720,w:22,h:455},{x:1238,y:720,w:22,h:455},{x:660,y:1155,w:235,h:22},{x:1030,y:1155,w:230,h:22},
  // Contract Warehouse (West gate x:1280, y:840..975)
  {x:1280,y:650,w:550,h:22},{x:1280,y:650,w:22,h:190},{x:1280,y:975,w:22,h:205},{x:1808,y:650,w:22,h:530},{x:1280,y:1158,w:550,h:22},
  // Checkout Counter Bar (walkable around left x<495 and right x>960)
  {x:495,y:1905,w:465,h:50},
  // Rare Storage (North door x:180..305, y:1640)
  {x:60,y:1640,w:120,h:22},{x:305,y:1640,w:85,h:22},{x:60,y:1640,w:22,h:420},{x:368,y:1640,w:22,h:420},{x:60,y:2038,w:330,h:22},
  // South Main Compound Wall (Main Entrance gap x:635..860, y:2038)
  {x:390,y:2038,w:245,h:24},{x:860,y:2038,w:420,h:24},
  // Management Office (West doors y:1570..1695 & y:1840..1960)
  {x:1280,y:1340,w:440,h:22},{x:1280,y:1340,w:22,h:230},{x:1280,y:1695,w:22,h:145},{x:1280,y:1960,w:22,h:90},{x:1698,y:1340,w:22,h:710},{x:1280,y:2038,w:440,h:22},
  // Southern River (Stone Bridge open at x:645..850)
  {x:350,y:2340,w:295,h:230},{x:850,y:2340,w:996,h:230},
  // Physical retail shelf objects: customers and workers stand at the front.
  {x:195,y:1300,w:180,h:92},{x:645,y:1300,w:180,h:92},{x:1015,y:1300,w:180,h:92},
  // Tree trunks only; canopies remain visually overhead and walk-behind.
  {x:98,y:145,w:24,h:24},{x:228,y:125,w:24,h:24},{x:358,y:155,w:24,h:24},
  {x:1468,y:135,w:24,h:24},{x:1608,y:155,w:24,h:24},{x:1728,y:135,w:24,h:24},
  {x:128,y:2225,w:24,h:24},{x:478,y:2225,w:24,h:24},{x:928,y:2225,w:24,h:24},{x:1108,y:2225,w:24,h:24},{x:1338,y:2245,w:24,h:24}
];

const PTS={
  swordOut:{x:315,y:1195},
  shieldOut:{x:415,y:1195},
  potionOut:{x:960,y:1195},
  attackShelf:{x:285,y:1425},
  defenseShelf:{x:735,y:1425},
  otherShelf:{x:1105,y:1425},
  coinPile:{x:825,y:1875},
  checkoutWait:{x:745,y:1815},
  hire:{x:915,y:585},
  contractDrop:{x:1385,y:910},
  rare:{x:225,y:1845},
  training:{x:1395,y:525},
  office:{x:1460,y:1635},
  visitor:{x:315,y:2335},
  gate:{x:945,y:215}
};

const recipes={
  sword:{name:'Iron Sword',icon:'⚔️',cat:'Attack',station:'forge',statName:'ATK',baseStat:12,iron:2,wood:1,value:42,unlockCost:0},
  axe:{name:'Battle Axe',icon:'🪓',cat:'Attack',station:'forge',statName:'ATK',baseStat:18,iron:3,wood:2,value:68,unlockCost:200},
  shield:{name:'Wooden Shield',icon:'🛡️',cat:'Defense',station:'forge',statName:'DEF',baseStat:14,iron:1,wood:3,value:40,unlockCost:150},
  helmet:{name:'Guard Helmet',icon:'🪖',cat:'Defense',station:'forge',statName:'DEF',baseStat:20,iron:3,wood:1,value:64,unlockCost:220},
  potion:{name:'Healing Potion',icon:'🧪',cat:'Other',station:'alchemy',statName:'HP',baseStat:25,herb:2,value:28,unlockCost:0},
  repair:{name:'Repair Kit',icon:'🔧',cat:'Other',station:'alchemy',statName:'FIX',baseStat:15,iron:1,wood:1,herb:1,value:45,unlockCost:160}
};

const rar=[
  ['Poor','#987050',.5,0.75],
  ['Common','#e0e0e0',1,1.0],
  ['Uncommon','#63ce72',1.35,1.25],
  ['Rare','#5a9cff',2.1,1.6],
  ['Epic','#b16cff',3.5,2.1],
  ['Legendary','#ff9a3d',6,2.8]
];

function clone(x){return JSON.parse(JSON.stringify(x))}
const AREA_DATA={
 greenwood:{name:'Greenwood Edge',level:'Lv.1-3',power:20,duration:30,drops:['Slime Gel','Wolf Fang'],color:'#4f9a4b'},
 mossy:{name:'Mossy Cave',level:'Lv.3-6',power:45,duration:60,drops:['Tough Hide','Crystal Shard'],color:'#557d67'},
 ember:{name:'Ember Ruins',level:'Lv.6-10',power:80,duration:90,drops:['Ember Core','Ancient Bone'],color:'#a9543d'}
};
function updateProgression(){
 S.lifetimeSales=S.lifetimeSales||0;
 if(S.lifetimeSales>=5&&!S.products.potion.unlocked){S.products.potion.unlocked=true;S.products.potion.on=true;S.shopLevel=Math.max(S.shopLevel||1,2);toast('SHOP LEVEL 2 • Alchemy and Healing Potion unlocked!')}
 if(S.served>=10){S.shopLevel=Math.max(S.shopLevel||1,3)}
 if(S.day>=3&&S.employees.length>0&&!S.expeditionUnlocked){S.expeditionUnlocked=true;toast('EXPEDITION BOARD UNLOCKED!')}
 if(S.statsDay.monsters>=3)S.areaUnlocked=Math.max(S.areaUnlocked||1,2);
 if(S.statsDay.monsters>=8)S.areaUnlocked=Math.max(S.areaUnlocked||1,3);
}
function featureUnlocked(name){
 if(name==='employees')return (S.shopLevel||1)>=3;
 if(name==='expedition')return !!S.expeditionUnlocked;
 if(name==='wholesale')return S.day>=5&&S.rep>=30;
 if(name==='skills')return S.day>=5;
 return true;
}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function collides(x,y,r=16){return SOLIDS.some(a=>x+r>a.x&&x-r<a.x+a.w&&y+r>a.y&&y-r<a.y+a.h)}
function moveEntity(o,nx,ny,r=16){
  if(!collides(nx,o.y,r))o.x=nx;
  if(!collides(o.x,ny,r))o.y=ny;
}

// ============================================================================
// COLLISION-AWARE 2D GRID A* PATHFINDING ENGINE (No Diagonal Corner-Cutting)
// ============================================================================
const G_CELL=26,GW=Math.ceil(WORLD.w/G_CELL),GH=Math.ceil(WORLD.h/G_CELL);
const navGrid=new Uint8Array(GW*GH);
function buildNavGrid(){
  for(let gy=0;gy<GH;gy++){
    for(let gx=0;gx<GW;gx++){
      const wx=gx*G_CELL+G_CELL/2,wy=gy*G_CELL+G_CELL/2;
      navGrid[gy*GW+gx]=collides(wx,wy,15)?1:0;
    }
  }
}
buildNavGrid();

function nearestWalkableCell(gx,gy){
  gx=Math.max(1,Math.min(GW-2,gx));
  gy=Math.max(1,Math.min(GH-2,gy));
  if(!navGrid[gy*GW+gx])return {gx,gy};
  for(let rad=1;rad<=6;rad++){
    for(let dy=-rad;dy<=rad;dy++){
      for(let dx=-rad;dx<=rad;dx++){
        let nx=gx+dx,ny=gy+dy;
        if(nx>0&&nx<GW-1&&ny>0&&ny<GH-1&&!navGrid[ny*GW+nx])return {gx:nx,gy:ny};
      }
    }
  }
  return {gx,gy};
}

function findAStarPath(sx,sy,tx,ty){
  const sCell=nearestWalkableCell(Math.floor(sx/G_CELL),Math.floor(sy/G_CELL));
  const gCell=nearestWalkableCell(Math.floor(tx/G_CELL),Math.floor(ty/G_CELL));
  const startIdx=sCell.gy*GW+sCell.gx,goalIdx=gCell.gy*GW+gCell.gx;
  if(startIdx===goalIdx)return [{x:tx,y:ty}];

  const total=GW*GH;
  const gScore=new Float32Array(total);gScore.fill(1e9);
  const fScore=new Float32Array(total);fScore.fill(1e9);
  const cameFrom=new Int32Array(total);cameFrom.fill(-1);
  const closed=new Uint8Array(total);
  const open=[startIdx];
  gScore[startIdx]=0;
  fScore[startIdx]=Math.hypot(gCell.gx-sCell.gx,gCell.gy-sCell.gy);

  const dirs=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[-1,1,1.414],[1,-1,1.414],[-1,-1,1.414]];
  let steps=0;
  while(open.length>0&&steps++<3200){
    let bestPos=0,cur=open[0],bestF=fScore[cur];
    for(let i=1;i<open.length;i++){
      const idx=open[i];
      if(fScore[idx]<bestF){bestF=fScore[idx];cur=idx;bestPos=i}
    }
    if(cur===goalIdx){
      const path=[{x:tx,y:ty}];
      let curr=cur;
      while(curr!==startIdx&&cameFrom[curr]!==-1){
        const cx=(curr%GW)*G_CELL+G_CELL/2,cy=Math.floor(curr/GW)*G_CELL+G_CELL/2;
        path.push({x:cx,y:cy});
        curr=cameFrom[curr];
      }
      path.reverse();
      // Light path smoothing (skip intermediate nodes on straight segments)
      if(path.length>2){
        const smooth=[path[0]];
        for(let i=1;i<path.length-1;i+=2)smooth.push(path[i]);
        smooth.push(path[path.length-1]);
        return smooth;
      }
      return path;
    }
    open.splice(bestPos,1);
    closed[cur]=1;
    const cx=cur%GW,cy=Math.floor(cur/GW);
    for(const [dx,dy,cost] of dirs){
      const nx=cx+dx,ny=cy+dy;
      if(nx<=0||nx>=GW-1||ny<=0||ny>=GH-1)continue;
      const nIdx=ny*GW+nx;
      if(closed[nIdx]||navGrid[nIdx])continue;
      // Prevent diagonal corner-cutting across wall edges
      if(dx!==0&&dy!==0){
        if(navGrid[cy*GW+(cx+dx)]||navGrid[(cy+dy)*GW+cx])continue;
      }
      const tentativeG=gScore[cur]+cost;
      if(tentativeG<gScore[nIdx]){
        cameFrom[nIdx]=cur;
        gScore[nIdx]=tentativeG;
        fScore[nIdx]=tentativeG+Math.hypot(gCell.gx-nx,gCell.gy-ny);
        if(!open.includes(nIdx))open.push(nIdx);
      }
    }
  }
  return [{x:tx,y:ty}];
}

function navigate(o,tx,ty,s,dt){
  if(Math.hypot(tx-o.x,ty-o.y)<8)return true;
  const targetKey=`${Math.round(tx/20)},${Math.round(ty/20)}`;
  const prevX=o.x,prevY=o.y;
  if(!o.navPath||o.navKey!==targetKey||(o.stuckTime||0)>0.55){
    o.navPath=findAStarPath(o.x,o.y,tx,ty);
    o.navKey=targetKey;
    o.stuckTime=0;
  }
  if(!o.navPath||!o.navPath.length)return true;
  const wp=o.navPath[0];
  let dx=wp.x-o.x,dy=wp.y-o.y,d=Math.hypot(dx,dy);
  if(d<8){
    o.navPath.shift();
    if(!o.navPath.length)return true;
  }else{
    o.moving=true;
    moveEntity(o,o.x+dx/d*s*dt,o.y+dy/d*s*dt,15);
    if(Math.hypot(o.x-prevX,o.y-prevY)<s*dt*0.2)o.stuckTime=(o.stuckTime||0)+dt;
    else o.stuckTime=0;
  }
  return Math.hypot(tx-o.x,ty-o.y)<9;
}

// ============================================================================
// SAVE SYSTEM & MIGRATION
// ============================================================================
function loadForever(){
  try{
    let raw=localStorage.getItem(FOREVER_KEY);
    if(!raw){for(const oldKey of OLD_FOREVER_KEYS){raw=localStorage.getItem(oldKey);if(raw)break}}
    const data=JSON.parse(raw||'null');
    if(data&&!localStorage.getItem(FOREVER_KEY))localStorage.setItem(FOREVER_KEY,JSON.stringify(data));
    return data;
  }catch{return null}
}
function saveForever(){
  try{localStorage.setItem(FOREVER_KEY,JSON.stringify({legacy:S.legacy,skills:S.skills}))}catch{}
}
function key(n){return PREFIX+n}
function load(n){
  try{
    let raw=localStorage.getItem(key(n));
    if(!raw){
      for(const oldP of OLD_PREFIXES){
        raw=localStorage.getItem(oldP+n);
        if(raw)break;
      }
    }
    return JSON.parse(raw||'null');
  }catch{return null}
}
function syncItemArrays(n){
  Object.keys(recipes).forEach(k=>{
    if(!n.products[k])n.products[k]={...base.products[k]};
    if(!Array.isArray(n.outputItems[k]))n.outputItems[k]=[];
    if(!Array.isArray(n.shelfItems[k]))n.shelfItems[k]=[];
    while(n.outputItems[k].length<(n.output[k]||0))n.outputItems[k].push(makeItemObject(k,1));
    while(n.shelfItems[k].length<(n.products[k]?.stock||0))n.shelfItems[k].push(makeItemObject(k,1));
    n.output[k]=n.outputItems[k].length;
    n.products[k].stock=n.shelfItems[k].length;
  });
}
function norm(x){
  let n=clone(base);
  if(x)Object.assign(n,x);
  const f=loadForever();
  n.skills={...base.skills,...(x?.skills||{}),...(f?.skills||{})};
  if(f&&typeof f.legacy==='number')n.legacy=Math.max(n.legacy||0,f.legacy);
  n.products={...clone(base.products),...(x?.products||{})};
  n.output={...clone(base.output),...(x?.output||{})};
  n.outputItems={...clone(base.outputItems),...(x?.outputItems||{})};
  n.shelfItems={...clone(base.shelfItems),...(x?.shelfItems||{})};
  n.equipped={...clone(base.equipped),...(x?.equipped||{})};
  n.rareDisplay=Array.isArray(x?.rareDisplay)?x.rareDisplay:[];
  n.employees=Array.isArray(x?.employees)?x.employees:[];
  n.employees.forEach((e,i)=>{
    if(!e.x||e.x>1800||e.y>2000||collides(e.x,e.y,15)){e.x=860+(i%3)*55;e.y=540}
  });
  n.contracts=Array.isArray(x?.contracts)?x.contracts:[];
  n.offers=Array.isArray(x?.offers)?x.offers:[];
  n.goals=Array.isArray(x?.goals)?x.goals:[];
  n.statsDay={...base.statsDay,...(x?.statsDay||{})};
  n.discoveries=Array.isArray(x?.discoveries)?x.discoveries:[];
  n.coinsFloor=x?.coinsFloor||0;
  n.poorPolicy=x?.poorPolicy||'Honest';
  syncItemArrays(n);
  return n;
}
function save(reason){
  if(!slot)return;
  S.savedAt=new Date().toLocaleString();
  S.reason=reason;
  saveForever();
  try{localStorage.setItem(key(slot),JSON.stringify(S))}catch{}
  toast(reason+' • saved');
}

function resize(){
  vw=c.width=Math.round(innerWidth*devicePixelRatio);
  vh=c.height=Math.round(innerHeight*devicePixelRatio);
  g.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  vw=innerWidth;vh=innerHeight;
}
addEventListener('resize',resize);resize();

function toast(t){
  $('toast').textContent=t;
  $('toast').classList.add('show');
  clearTimeout(msgTimer);
  msgTimer=setTimeout(()=>$('toast').classList.remove('show'),2100);
}
function addFloat(x,y,text,col='#ffed75'){
  effects.push({x,y,t:1.2,text,col});
}

// ============================================================================
// INPUT & FLOATING JOYSTICK MOVEMENT
// ============================================================================
function screenPoint(ev){
  const r=c.getBoundingClientRect();
  return {x:(ev.clientX-r.left)*vw/r.width,y:(ev.clientY-r.top)*vh/r.height};
}
function dragStart(ev){
  if($('panel').classList.contains('show')||$('craftGame').classList.contains('show')||ev.pointerType==='mouse'&&ev.button!==0)return;
  const p=screenPoint(ev);
  dragMove={active:true,id:ev.pointerId,sx:p.x,sy:p.y,dx:0,dy:0};
  c.setPointerCapture?.(ev.pointerId);
  $('dragStick').style.left=p.x+'px';
  $('dragStick').style.top=p.y+'px';
  $('dragStick').classList.add('show');
  target=null;player.navPath=null;
}
function dragUpdate(ev){
  if(!dragMove.active||ev.pointerId!==dragMove.id)return;
  const p=screenPoint(ev),dx=p.x-dragMove.sx,dy=p.y-dragMove.sy,d=Math.hypot(dx,dy),max=40;
  dragMove.dx=d?dx/d*Math.min(1,d/max):0;
  dragMove.dy=d?dy/d*Math.min(1,d/max):0;
  $('dragStick').firstElementChild.style.transform=`translate(${Math.max(-26,Math.min(26,dx))}px,${Math.max(-26,Math.min(26,dy))}px)`;
  ev.preventDefault();
}
function dragEnd(ev){
  if(!dragMove.active||ev.pointerId!==dragMove.id)return;
  const p=screenPoint(ev),d=Math.hypot(p.x-dragMove.sx,p.y-dragMove.sy);
  if(d<10)target={x:p.x/zoom+cam.x,y:p.y/zoom+cam.y};
  dragMove.active=false;dragMove.dx=dragMove.dy=0;
  $('dragStick').classList.remove('show');
  $('dragStick').firstElementChild.style.transform='translate(0,0)';
}
c.addEventListener('pointerdown',dragStart);
c.addEventListener('pointermove',dragUpdate);
c.addEventListener('pointerup',dragEnd);
c.addEventListener('pointercancel',dragEnd);
c.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom+(e.deltaY<0?.08:-.08))},{passive:false});
c.addEventListener('touchstart',e=>{if(e.touches.length===2)pinchStart=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)},{passive:true});
c.addEventListener('touchmove',e=>{if(e.touches.length===2&&pinchStart){let d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);setZoom(zoom+(d-pinchStart)/500);pinchStart=d;e.preventDefault()}},{passive:false});
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key===' ')attack()});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

function setZoom(v){
  zoom=Math.max(.42,Math.min(1.15,v));
  S.zoom=zoom;
}
function inside(p,z,pad=0){
  return p.x>z.x-pad&&p.x<z.x+z.w+pad&&p.y>z.y-pad&&p.y<z.y+z.h+pad;
}

// ============================================================================
// CRAFTING, QUALITY, REPAIR & EQUIPMENT LOGIC
// ============================================================================
function qroll(skill=0){
  let bonus=S.skills.quality*.045+skill*.0025+(S.nextCraftBonus||0)+(S.event?.type==='forge'?.08:0);
  S.nextCraftBonus=0;
  let r=Math.random()+bonus;
  return r<.08?0:r<.54?1:r<.80?2:r<.93?3:r<.985?4:5;
}
function makeItemObject(k,qIndex,special=false){
  const r=recipes[k]||recipes.sword,q=typeof qIndex==='number'?qIndex:qroll(0);
  const stat=Math.round(r.baseStat*rar[q][3])+(special?8:0);
  const val=Math.round(r.value*rar[q][2]*(S.event?.type==='attack'&&r.cat==='Attack'?1.2:1))+(special?40:0);
  return {
    key:k,
    name:special?'Slime Edge':r.name,
    icon:special?'🗡️':r.icon,
    cat:r.cat,
    q,
    rarity:rar[q][0],
    color:rar[q][1],
    stat,
    value:val,
    defect:q===0?'Weak structure':null,
    special
  };
}
function outputGroupKey(k){
  if(k==='axe')return 'sword';
  if(k==='helmet')return 'shield';
  if(k==='repair')return 'potion';
  return k;
}
function outputPoint(k){
  const gk=outputGroupKey(k);
  return gk==='potion'?PTS.potionOut:gk==='shield'?PTS.shieldOut:PTS.swordOut;
}
function shelfPoint(k){
  const cat=recipes[k]?.cat||'Attack';
  return cat==='Attack'?PTS.attackShelf:cat==='Defense'?PTS.defenseShelf:PTS.otherShelf;
}
function deptTotalStock(cat){
  return Object.keys(recipes).filter(k=>recipes[k].cat===cat).reduce((a,k)=>a+(S.shelfItems[k]?.length||0),0);
}
function deptItems(cat){
  const list=[];
  Object.keys(recipes).filter(k=>recipes[k].cat===cat).forEach(k=>{
    if(S.shelfItems[k])list.push(...S.shelfItems[k]);
  });
  return list;
}
function outputGroup(k){
  if(k==='sword'||k==='axe')return ['sword','axe'];
  if(k==='shield'||k==='helmet')return ['shield','helmet'];
  return ['potion','repair'];
}
function outputGroupCount(k){return outputGroup(k).reduce((n,key)=>n+(S.outputItems[key]?.length||0),0)}
function canCraft(k){
  let r=recipes[k];
  if(!r||!S.products[k]?.unlocked)return false;
  if(outputGroupCount(k)>=S.outputCap)return false;
  return (!r.iron||S.iron>=r.iron)&&(!r.wood||S.wood>=r.wood)&&(!r.herb||S.herb>=r.herb);
}
function maybeAutoEquip(item){
  if(item.cat==='Attack'&&item.stat>(S.equipped.weapon?.stat||0)){
    S.equipped.weapon={name:`${item.rarity} ${item.name}`,icon:item.icon,stat:item.stat};
  }else if(item.cat==='Defense'&&item.stat>(S.equipped.armor?.stat||0)){
    S.equipped.armor={name:`${item.rarity} ${item.name}`,icon:item.icon,stat:item.stat};
  }
}
function craft(k,worker,useSlime=false){
  if(outputGroupCount(k)>=S.outputCap){
    if(!worker)toast(recipes[k].name+' shared output table is full ('+S.outputCap+'/'+S.outputCap+')!');
    return false;
  }
  if(!canCraft(k)){
    if(!worker)toast('Missing materials for '+recipes[k].name);
    return false;
  }
  let r=recipes[k];
  S.iron-=r.iron||0;S.wood-=r.wood||0;S.herb-=r.herb||0;
  let special=false;
  if(k==='sword'&&(useSlime||(S.gel>0&&Math.random()<.22))){
    if(S.gel>0){
      S.gel--;special=true;
      if(!S.discoveries.includes('Slime Edge')){
        S.discoveries.push('Slime Edge');
        toast('NEW RECIPE DISCOVERED • Slime Edge!');
      }
    }
  }
  let item=makeItemObject(k,qroll(worker?.craft||0),special);
  // Repair Kits are consumed immediately when a Poor item is available.
  if(k==='repair'){
    let repaired=null;
    for(const pk of Object.keys(recipes)){
      repaired=(S.outputItems[pk]||[]).find(x=>x.q===0)||(S.shelfItems[pk]||[]).find(x=>x.q===0);
      if(repaired)break;
    }
    if(repaired){
      repaired.q=2;repaired.rarity='Uncommon';repaired.color=rar[2][1];repaired.defect=null;
      repaired.stat=Math.max(repaired.stat,Math.round(recipes[repaired.key]?.baseStat*1.35)||repaired.stat);
      toast(`🔧 Repair Kit consumed: ${repaired.name} upgraded to Uncommon!`);
      S.statsDay.crafted++; craftAnim=.55; craftKey=k;
      return true;
    }
  }
  maybeAutoEquip(item);
  S.outputItems[k].push(item);
  S.output[k]=S.outputItems[k].length;
  if(item.q>=3||item.special){
    S.rareDisplay.unshift({name:item.name,icon:item.icon,rarity:item.rarity,color:item.color,stat:item.stat});
    if(S.rareDisplay.length>S.rareStorageCap)S.rareDisplay.pop();
  }
  S.statsDay.crafted++;
  const op=outputPoint(k);
  addFloat(op.x,op.y-12,`${item.icon} ${item.rarity}`,item.color);
  if(!worker)toast(`Crafted ${item.rarity} ${item.name} (${r.statName} ${item.stat})`);
  return true;
}

function gatherYardNode(n){
  if(!n.ready)return;
  n.ready=false;n.timer=n.max;
  const amt=2+(S.skills.adventure>1?1:0);
  S[n.type]+=amt;
  addFloat(n.x,n.y-18,`+${amt} ${n.icon}`,'#a8ff9e');
  toast(`Gathered +${amt} ${n.name}`);
}

// ============================================================================
// CUSTOMERS & PHYSICAL SHOPPING LOOP
// ============================================================================
function spawnClient(){
  let on=Object.keys(S.products).filter(k=>S.products[k].on&&S.products[k].unlocked);
  if(!on.length||clients.length>=7)return;
  let k=on[Math.floor(Math.random()*on.length)];
  if(S.event?.type==='potion'&&S.products.potion.on)k='potion';
  let lv=Math.random(),level=lv>.84?'Knight':lv>.52?'Veteran':'Adventurer';
  let ps=['Impatient','Bargain','Experienced','Collector','Loyal'],personality=ps[Math.floor(Math.random()*ps.length)];
  let sp=shelfPoint(k),slotIdx=clients.filter(c=>recipes[c.want]?.cat===recipes[k]?.cat).length;
  clients.push({
    id:Date.now()+Math.random(),
    x:725+Math.random()*40,
    y:2480+Math.random()*60,
    want:k,
    shelfX:sp.x+(slotIdx%3-1)*44,
    shelfY:sp.y+34+Math.floor(slotIdx/3)*28,
    pat:64+S.skills.merchant*5,
    max:64+S.skills.merchant*5,
    state:'toShelf',
    level,personality,
    minStat:level==='Knight'?Math.round(recipes[k].baseStat*1.1):level==='Veteran'?recipes[k].baseStat:0,
    minQ:personality==='Collector'?2:level==='Knight'?1:0,
    minRarity:personality==='Collector'?'Uncommon':level==='Knight'?'Common':'Any',
    carriedItem:null,
    tipMult:personality==='Impatient'?1.6:personality==='Loyal'?1.35:1
  });
}

function clientTick(dt){
  for(let i=clients.length-1;i>=0;i--){
    let x=clients[i];x.moving=false;
    if(x.state==='toShelf'){
      if(navigate(x,x.shelfX,x.shelfY,120,dt))x.state='waitShelf';
    }else if(x.state==='waitShelf'){
      x.pat-=dt*(x.personality==='Impatient'?1.25:1);
      let arr=S.shelfItems[x.want];
      let matchIndex=arr?arr.findIndex(item=>item.stat>=(x.minStat||0)&&(item.q>=(x.minQ||0)||(item.q===0&&S.poorPolicy==='Disguise'))):-1;
      if(matchIndex<0&&arr&&arr.length>0&&x.level==='Adventurer'&&x.minQ===0)matchIndex=0;
      if(arr&&matchIndex>=0){
        let item=arr.splice(matchIndex,1)[0];
        S.products[x.want].stock=arr.length;
        if(item.q===0&&S.poorPolicy==='Disguise'){
          let inspectChance=x.level==='Knight'?.75:x.personality==='Experienced'?.7:.35;
          if(Math.random()<inspectChance){
            S.rep-=2;S.badReviews++;S.statsDay.lost++;
            addFloat(x.x,x.y-30,'DEFECT CAUGHT! -2 REP','#ff6b6b');
            toast(`${x.level} caught disguised Poor ${item.name}! (-2 REP)`);
            x.state='leave';continue;
          }
        }
        x.carriedItem=item;
        x.state='toCheckout';
      }else if(x.pat<=0){
        S.rep--;S.statsDay.lost++;
        addFloat(x.x,x.y-25,'UNMET REQUEST -1 REP','#ff857a');
        toast(`Customer left • needed ${recipes[x.want].name}`);
        x.state='leave';
      }
    }else if(x.state==='toCheckout'){
      if(navigate(x,PTS.checkoutWait.x,PTS.checkoutWait.y,124,dt)){
        let item=x.carriedItem;
        let baseVal=item.value;
        if(item.q===0&&S.poorPolicy==='Honest')baseVal=Math.round(recipes[x.want].value*.5);
        if(item.q===0&&S.poorPolicy==='Disguise')baseVal=recipes[x.want].value;
        let mult=x.personality==='Bargain'?.88:x.personality==='Collector'&&item.q>=2?1.45:1;
        let price=Math.max(10,Math.round(baseVal*mult));
        let tip=x.pat/x.max>.58?Math.round(6*x.tipMult)+(S.rareDisplay.length*2):0;
        if(item.q>=2&&x.pat/x.max>.5)S.rep=Math.min(99,S.rep+(Math.random()<.4?1:0));
        S.coinsFloor+=price+tip;
        S.served++;
        S.statsDay.sales+=price;S.lifetimeSales=(S.lifetimeSales||0)+1;updateProgression();
        S.statsDay.tips+=tip;
        goalProgress('sale',1);
        if(tip>0)goalProgress('tip',1);
        addFloat(PTS.coinPile.x,PTS.coinPile.y-15,'+$'+(price+tip),'#ffd95e');
        x.carriedItem=null;
        x.state='leave';
      }
    }else if(x.state==='leave'){
      if(navigate(x,745,2520,142,dt))clients.splice(i,1);
    }
  }
}

// ============================================================================
// EMPLOYEES & PHYSICAL A* WORKER LOOP
// ============================================================================
function matchingContract(k,itemQ=1){
  return S.contracts.find(q=>q.key===k&&q.done<q.qty&&itemQ>=(q.minQ||0));
}
function pickNextOutputForSales(){
  const keys=Object.keys(recipes).filter(k=>(S.outputItems[k]?.length||0)>0);
  if(!keys.length)return null;
  if(S.productionPriority==='Wholesale'){
    let wk=keys.find(k=>matchingContract(k,S.outputItems[k][0]?.q));
    if(wk&&contractUnits()<S.contractCap)return {key:wk,dest:'contract'};
  }
  for(const k of keys){
    const cat=recipes[k].cat;
    if(S.productionPriority==='Balanced'&&S.products[k].stock>=2&&matchingContract(k,S.outputItems[k][0]?.q)&&contractUnits()<S.contractCap){
      return {key:k,dest:'contract'};
    }
    if(deptTotalStock(cat)<12)return {key:k,dest:'shelf'};
    if(matchingContract(k,S.outputItems[k][0]?.q)&&contractUnits()<S.contractCap)return {key:k,dest:'contract'};
  }
  return null;
}

function employeeTick(dt){
  for(let e of S.employees){
    e.moving=false;
    if(e.job==='Sales'){
      e.statusIcon=e.carryKey?'📦':'🪙';
      if(e.carryKey){
        if(e.carryDest==='contract'){
          if(navigate(e,PTS.contractDrop.x,PTS.contractDrop.y,120,dt)){
            let c=matchingContract(e.carryKey,e.carryItem?.q||1);
            if(c&&contractUnits()<S.contractCap){
              c.done++;
              addFloat(PTS.contractDrop.x,PTS.contractDrop.y-15,`Contract ${c.done}/${c.qty}`,'#ffd86b');
            }else if(deptTotalStock(recipes[e.carryKey].cat)<12){
              S.shelfItems[e.carryKey].push(e.carryItem||makeItemObject(e.carryKey,1));
              S.products[e.carryKey].stock=S.shelfItems[e.carryKey].length;
            }
            e.carryKey=null;e.carryItem=null;e.carryCount=0;
          }
        }else{
          let sp=shelfPoint(e.carryKey);
          if(navigate(e,sp.x,sp.y,120,dt)){
            if(deptTotalStock(recipes[e.carryKey].cat)<12){
              S.shelfItems[e.carryKey].push(e.carryItem||makeItemObject(e.carryKey,1));
              S.products[e.carryKey].stock=S.shelfItems[e.carryKey].length;
            }
            e.carryKey=null;e.carryItem=null;e.carryCount=0;
          }
        }
      }else{
        let task=pickNextOutputForSales();
        if(task){
          let op=outputPoint(task.key);
          if(navigate(e,op.x,op.y+22,120,dt)&&S.outputItems[task.key].length>0){
            e.carryItem=S.outputItems[task.key].shift();
            S.output[task.key]=S.outputItems[task.key].length;
            e.carryKey=task.key;e.carryCount=1;e.carryDest=task.dest;
          }
        }else if(S.coinsFloor>0){
          if(navigate(e,PTS.coinPile.x,PTS.coinPile.y-35,120,dt)){
            let amt=S.coinsFloor;
            S.cash+=amt;S.coinsFloor=0;
            addFloat(PTS.coinPile.x,PTS.coinPile.y-20,`+$${amt}`,'#7dff9b');
            toast(e.name+' collected $'+amt+' from checkout');
          }
        }else{
          navigate(e,745,1685,95,dt);
        }
      }
    }else if(e.job==='Craft'){
      e.statusIcon='🔨';
      let candidates=Object.keys(S.products).filter(k=>S.products[k].on&&S.products[k].unlocked&&canCraft(k));
      if(S.productionPriority==='Wholesale'){
        let ck=S.contracts.find(c=>c.done<c.qty&&canCraft(c.key))?.key;
        if(ck)candidates=[ck];
      }
      let k=candidates.sort((a,b)=>(S.products[a].stock+S.output[a])-(S.products[b].stock+S.output[b]))[0]||'sword';
      let z=recipes[k].station==='alchemy'?{x:960,y:960}:{x:355,y:960};
      if(navigate(e,z.x,z.y,112,dt)){
        if(canCraft(k)){
          e.work=(e.work||0)+dt*(1+e.craft/85);
          if(e.work>=6.0){e.work=0;craft(k,e,false)}
        }
      }
    }else if(e.job==='Expedition'){
      e.statusIcon='⚔️';
      if(navigate(e,945,175,118,dt)){
        e.work=(e.work||0)+dt;
        if(e.work>=10.0){
          e.work=0;
          let bonus=1+Math.floor((e.atk*.6+e.def*.4)/30),area=e.expeditionArea||'greenwood';
          S.iron+=bonus;S.wood+=1;S.herb+=1;
          if(area==='greenwood'){if(Math.random()<.65)S.gel++;if(Math.random()<.35)S.fang++}
          else if(area==='mossy'){S.hide=(S.hide||0)+1;if(Math.random()<.5)S.crystal=(S.crystal||0)+1}
          else {S.ember=(S.ember||0)+1;if(Math.random()<.4)S.bone=(S.bone||0)+1}
          e.hp=Math.max(25,e.hp-Math.max(3,14-e.def*.12));
          addFloat(e.x,e.y-25,`+${bonus}🪨 +1🪵 +1🌿`,'#9ef8ff');
          if(e.hp<40){e.job='Staff House';toast(e.name+' is resting in Staff House')}
          else toast(e.name+' returned from Slime Woods with materials');
        }
      }
    }else{
      e.statusIcon='💤';
      let idx=S.employees.indexOf(e);
      let tx=760+(idx%3)*115,ty=520;
      navigate(e,tx,ty,92,dt);
      if(e.hp<100)e.hp=Math.min(100,e.hp+dt*4.5);
    }
  }
}

// ============================================================================
// PLAYER ACTIONS & CONTEXT BAR
// ============================================================================
function tryPickUpGroupOutput(groupKey){
  if(player.carryCount>=player.carryCap)return;
  const groupKeys=Object.keys(recipes).filter(k=>outputGroupKey(k)===groupKey&&S.outputItems[k]?.length>0);
  if(!groupKeys.length)return;
  const k=player.carryKey&&groupKeys.includes(player.carryKey)?player.carryKey:groupKeys[0];
  if(player.carryKey&&player.carryKey!==k)return;
  player.carryKey=k;
  while(player.carryCount<player.carryCap&&S.outputItems[k].length>0){
    let item=S.outputItems[k].shift();
    if(item.q===0&&S.poorPolicy==='Scrap'){
      S.iron++;
      toast('Scrapped Poor item (+1 material)');
      continue;
    }
    player.carryItems.push(item);
    player.carryCount=player.carryItems.length;
  }
  S.output[k]=S.outputItems[k].length;
  if(player.carryCount>0){
    toast(`Picked up ${player.carryCount}× ${recipes[k].name}`);
    if(S.tutorialStep===2)advanceTutorial();
  }else player.carryKey=null;
}

function deliverToContract(){
  if(!player.carryKey||!player.carryCount)return false;
  let c=S.contracts.find(q=>q.key===player.carryKey&&q.done<q.qty);
  if(!c){toast('No active wholesale contract for '+recipes[player.carryKey].name);return false}
  let added=0;
  for(let i=player.carryItems.length-1;i>=0;i--){
    if(contractUnits()<S.contractCap&&c.done<c.qty&&player.carryItems[i].q>=(c.minQ||0)){
      c.done++;added++;
      player.carryItems.splice(i,1);
    }
  }
  player.carryCount=player.carryItems.length;
  if(!player.carryCount)player.carryKey=null;
  if(added>0){
    addFloat(PTS.contractDrop.x,PTS.contractDrop.y-20,`+${added} Contract (${c.done}/${c.qty})`,'#ffd86b');
    toast(`Loaded ${added}× ${recipes[c.key].name} into Contract Warehouse!`);
    return true;
  }
  toast('Carried items do not meet contract quality!');
  return false;
}

function updateContextActions(){
  const bar=$('actionBar');
  let btns=[];
  if(inside(player,R.forge,35)){
    btns.push(`<button onclick="window.triggerCraft('sword',false)">🔨 Sword (${S.iron}/2🪨 ${S.wood}/1🪵)</button>`);
    if(S.products.axe.unlocked)btns.push(`<button onclick="window.triggerCraft('axe',false)">🪓 Axe (${S.iron}/3🪨 ${S.wood}/2🪵)</button>`);
    if(S.products.shield.unlocked)btns.push(`<button onclick="window.triggerCraft('shield',false)">🛡️ Shield (${S.iron}/1🪨 ${S.wood}/3🪵)</button>`);
    if(S.products.helmet.unlocked)btns.push(`<button onclick="window.triggerCraft('helmet',false)">🪖 Helmet (${S.iron}/3🪨 ${S.wood}/1🪵)</button>`);
    if(S.gel>0||S.discoveries.includes('Slime Edge')){
      btns.push(`<button onclick="window.triggerCraft('sword',true)">🗡️ Slime Edge (${S.gel}/1💧)</button>`);
    }
  }
  if(inside(player,R.alchemy,35)){
    btns.push(`<button onclick="window.triggerCraft('potion',false)">⚗️ Potion (${S.herb}/2🌿)</button>`);
    if(S.products.repair.unlocked){
      btns.push(`<button onclick="window.triggerCraft('repair',false)">🔧 Repair Kit (${S.iron}/1🪨 ${S.wood}/1🪵 ${S.herb}/1🌿)</button>`);
    }
  }
  let nearNode=yardNodes.find(n=>n.ready&&dist(player,n)<78);
  if(nearNode){
    btns.push(`<button onclick="window.triggerGather('${nearNode.id}')">${nearNode.icon} Gather ${nearNode.name}</button>`);
  }
  let nearMob=monsters.find(m=>dist(player,m)<175);
  if(nearMob||player.y<320){
    btns.push(`<button onclick="window.triggerAttack()">⚔️ Strike Monster (ATK ${S.equipped.weapon.stat})</button>`);
  }
  if(player.carryKey&&dist(player,PTS.contractDrop)<125){
    btns.push(`<button onclick="window.triggerContractDrop()">📦 Load Wholesale Crate</button>`);
  }
  if(dist(player,PTS.hire)<85&&S.employees.length<S.staffCap){
    btns.push(`<button onclick="window.triggerHire()">🤝 Hire Helper ($120)</button>`);
  }
  if(inside(player,R.training,20)){
    btns.push(`<button onclick="window.triggerTrain()">🎯 Train Staff (+Stats $80)</button>`);
  }
  if(inside(player,R.management,20)){
    btns.push(`<button onclick="window.openPage('wholesale')">📋 Management & Contracts</button>`);
  }
  if(inside(player,R.visitor,35)&&!S.visitorClaimed){
    btns.push(`<button onclick="window.triggerVisitor()">🎁 Claim Visitor Gift</button>`);
  }
  const html=btns.join('');
  if(bar.innerHTML!==html)bar.innerHTML=html;
}

window.triggerCraft=(k,slime)=>startCraftGame(k,slime);
window.triggerGather=id=>{const n=yardNodes.find(x=>x.id===id);if(n)gatherYardNode(n)};
window.triggerAttack=()=>attack();
window.triggerContractDrop=()=>deliverToContract();
window.triggerHire=()=>hireEmployeeAtPad();
window.openPage=openPage;
window.triggerTrain=()=>{
  if(!S.employees.length)return toast('Hire a helper in the Staff House first!');
  if(S.cash<80)return toast('Need $80 to run a training session');
  S.cash-=80;
  S.employees.forEach(e=>{e.sell+=3;e.craft+=3;e.atk+=3;e.def+=3});
  addFloat(PTS.training.x,PTS.training.y-20,'ALL STAFF +3 STATS!','#7dff9b');
  toast('Training complete! All staff gained +3 SELL/CRAFT/ATK/DEF');
};
window.triggerVisitor=()=>{
  if(S.visitorClaimed)return;
  S.visitorClaimed=true;
  S.cash+=65;S.iron+=3;S.wood+=2;S.herb+=2;
  addFloat(PTS.visitor.x,PTS.visitor.y-25,'+$65 +3🪨 +2🪵 +2🌿','#ffd86b');
  toast('Special Visitor gifted $65 and bonus crafting materials!');
  updateContextActions();
};

function hireEmployeeAtPad(){
  if(S.employees.length>=S.staffCap)return toast('Staff House is full • Upgrade in STAFF menu');
  if(S.cash<120)return toast('Need $120 to hire a helper');
  S.cash-=120;
  let id=Date.now();
  S.employees.push({
    id,name:'Helper '+(S.employees.length+1),
    sell:24+Math.floor(Math.random()*26),
    craft:24+Math.floor(Math.random()*26),
    atk:18+Math.floor(Math.random()*28),
    def:18+Math.floor(Math.random()*28),
    wage:20,job:'Sales',hp:100,
    x:915,y:545
  });
  addFloat(PTS.hire.x,PTS.hire.y-20,'HIRED! (Sales)','#7dff9b');
  toast('Hired Helper! Assigned to Sales (change anytime in STAFF)');
}

function playerTick(dt){
  let dx=dragMove.active?dragMove.dx:0,dy=dragMove.active?dragMove.dy:0;
  if(keys.w||keys.arrowup)dy--;
  if(keys.s||keys.arrowdown)dy++;
  if(keys.a||keys.arrowleft)dx--;
  if(keys.d||keys.arrowright)dx++;
  player.moving=false;
  if(dx||dy){
    target=null;player.navPath=null;player.moving=true;
    let d=Math.max(1,Math.hypot(dx,dy)),
        nx=player.x+dx/d*player.speed*dt,
        ny=player.y+dy/d*player.speed*dt;
    moveEntity(player,nx,ny,16);
    if(S.tutorialStep===0)advanceTutorial();
  }else if(target){
    if(navigate(player,target.x,target.y,player.speed,dt))target=null;
    if(S.tutorialStep===0)advanceTutorial();
  }
  player.x=Math.max(40,Math.min(WORLD.w-40,player.x));
  player.y=Math.max(50,Math.min(WORLD.h-50,player.y));

  for(const n of yardNodes){
    if(!n.ready){
      n.timer-=dt;
      if(n.timer<=0){n.ready=true;n.timer=0}
    }else if(dist(player,n)<50){
      gatherYardNode(n);
    }
  }

  for(let i=drops.length-1;i>=0;i--){
    const dr=drops[i];
    if(dist(player,dr)<65){
      S[dr.type]=(S[dr.type]||0)+dr.amt;
      addFloat(dr.x,dr.y-16,`+${dr.amt} ${dr.icon}`,'#a8ff9e');
      drops.splice(i,1);
    }
  }

  if(dist(player,PTS.swordOut)<58)tryPickUpGroupOutput('sword');
  if(dist(player,PTS.shieldOut)<58)tryPickUpGroupOutput('shield');
  if(dist(player,PTS.potionOut)<58)tryPickUpGroupOutput('potion');

  if(player.carryKey){
    let sp=shelfPoint(player.carryKey);
    const cat=recipes[player.carryKey].cat;
    if(dist(player,sp)<76){
      let space=12-deptTotalStock(cat);
      if(space>0){
        let moveCount=Math.min(space,player.carryItems.length);
        for(let i=0;i<moveCount;i++)S.shelfItems[player.carryKey].push(player.carryItems.shift());
        S.products[player.carryKey].stock=S.shelfItems[player.carryKey].length;
        player.carryCount=player.carryItems.length;
        addFloat(sp.x,sp.y-20,`+${moveCount} Stocked`,'#9ef8ff');
        toast(`Stocked ${moveCount}× ${recipes[player.carryKey].name}`);
        if(!player.carryCount)player.carryKey=null;
        if(S.tutorialStep===2)advanceTutorial();
      }else{
        toast(cat+' shelf is full (12/12)!');
      }
    }
    if(dist(player,PTS.contractDrop)<78){
      deliverToContract();
    }
  }

  if(S.coinsFloor>0&&dist(player,PTS.coinPile)<80){
    let amount=S.coinsFloor;
    S.cash+=amount;S.totalCoinsPicked+=amount;S.coinsFloor=0;
    addFloat(PTS.coinPile.x,PTS.coinPile.y-20,`+$${amount}`,'#ffd95e');
    toast(`Collected $${amount} from checkout!`);
    if(S.tutorialStep===3)advanceTutorial();
  }

  updateContextActions();
  cam.x=Math.max(0,Math.min(WORLD.w-vw/zoom,player.x-vw/(2*zoom)));
  cam.y=Math.max(0,Math.min(WORLD.h-vh/zoom,player.y-vh/(2*zoom)));
}

function attack(){
  let best=null,bestD=180;
  for(const m of monsters){
    let d=dist(player,m);
    if(d<bestD){best=m;bestD=d}
  }
  if(!best){
    toast('Walk north to the Forest Adventure Gate to fight monsters!');
    return;
  }
  let dmg=Math.round((S.equipped.weapon?.stat||10)*0.8)+S.skills.adventure*3+(S.rareDisplay.length?2:0);
  best.hp-=dmg;
  effects.push({x:best.x,y:best.y,t:0.35,slash:true,text:`-${dmg}`,col:'#ff7a7a'});
  if(best.hp<=0){
    monsters.splice(monsters.indexOf(best),1);
    const area=S.selectedArea||'greenwood';
    if(area==='greenwood'){drops.push({x:best.x-14,y:best.y,type:best.kind==='wolf'?'fang':'gel',amt:1,icon:best.kind==='wolf'?'🦷':'💧'})}
    else if(area==='mossy'){const t=Math.random()<.5?'hide':'crystal';drops.push({x:best.x-14,y:best.y,type:t,amt:1,icon:t==='hide'?'🟫':'💎'})}
    else {const t=Math.random()<.6?'ember':'bone';drops.push({x:best.x-14,y:best.y,type:t,amt:1,icon:t==='ember'?'🔥':'🦴'})}
    drops.push({x:best.x+14,y:best.y,type:best.kind==='wolf'?'wood':'iron',amt:1,icon:best.kind==='wolf'?'🪵':'🪨'});
    if(Math.random()<.6)S.herb++;
    S.statsDay.monsters++;
    goalProgress('monster',1);
    toast(`${best.kind==='wolf'?'Forest Wolf':'Green Slime'} defeated! Drops spawned`);
    if(S.tutorialStep===4)advanceTutorial();
  }
}

// ============================================================================
// DAY CYCLE & WHOLESALE CONTRACTS
// ============================================================================
function processContractDeadlines(){
  for(let i=S.contracts.length-1;i>=0;i--){
    let q=S.contracts[i];q.days--;
    if(q.done>=q.qty){
      S.cash+=q.reward;S.rep+=q.rep;S.legacy++;saveForever();
      toast(`Wholesale Contract Complete! +$${q.reward} & +1 Legacy`);
      S.contracts.splice(i,1);
    }else if(q.days<=0){
      S.rep-=q.penalty;
      toast(`Wholesale Contract Failed! -${q.penalty} REP`);
      S.contracts.splice(i,1);
    }
  }
}
function generateContractOffers(){
  S.offers=[
    {id:Date.now()+1,buyer:'Town Guard',key:'sword',qty:4,days:2,minQ:1,reward:260,rep:2,penalty:2},
    {id:Date.now()+2,buyer:'Explorer Guild',key:'potion',qty:5,days:2,minQ:1,reward:220,rep:2,penalty:2}
  ];
  if(S.products.shield.unlocked)S.offers.push({id:Date.now()+3,buyer:'Royal Garrison',key:'shield',qty:4,days:2,minQ:1,reward:250,rep:3,penalty:2});
}
function contractsEnd(){processContractDeadlines();generateContractOffers()}
function contractUnits(){return S.contracts.reduce((a,x)=>a+x.done,0)}

function createDayContent(){
  const pool=[
    {type:'sale',target:4,label:'Sell 4 products to customers'},
    {type:'craft',target:3,label:'Craft 3 products at stations'},
    {type:'monster',target:2,label:'Defeat 2 forest monsters'},
    {type:'tip',target:2,label:'Earn 2 fast-service tips'}
  ];
  S.goals=pool.sort(()=>Math.random()-.5).slice(0,3).map(x=>({...x,value:0,done:false}));
  const events=[
    {name:'Adventurer Festival',desc:'Attack weapon prices are increased +20% today.',type:'attack'},
    {name:'Potion Rush',desc:'Customers request Healing Potions more often today.',type:'potion'},
    {name:'Hot Forge',desc:'Crafting quality chances are boosted today.',type:'forge'},
    {name:'Supply Caravan',desc:'A caravan delivered +3 Iron, +3 Wood, and +3 Herb.',type:'merchant'}
  ];
  S.event=events[Math.floor(Math.random()*events.length)];
  if(S.event.type==='merchant'){S.iron+=3;S.wood+=3;S.herb+=3}
  S.visitorClaimed=false;
  if(!S.offers.length)generateContractOffers();
  S.statsDay={sales:0,tips:0,crafted:0,monsters:0,lost:0};
}

function goalProgress(type,n){
  for(const q of S.goals){
    if(q.type===type&&!q.done){
      q.value+=n;
      if(q.value>=q.target){
        q.done=true;
        toast('Daily Goal Complete • '+q.label);
      }
    }
  }
}

function endDay(){
  contractsEnd();
  let wages=S.employees.reduce((a,e)=>a+Math.round(e.wage*(e.job==='Staff House'?.5:e.job==='Expedition'?1.1:1)),0),
      all=S.goals.length&&S.goals.every(x=>x.done);
  S.cash-=wages;
  if(S.cash<0){S.cash=0;S.rep-=2}
  if(all){S.legacy++;saveForever()}
  let oldDay=S.day;
  S.day++;dayTime=0;
  save('Day '+oldDay+' completed');
  playing=false;
  $('summaryContent').innerHTML=`
    <div class="row"><span>Retail sales</span><b>$${S.statsDay.sales}</b></div>
    <div class="row"><span>Service tips</span><b>$${S.statsDay.tips}</b></div>
    <div class="row"><span>Employee wages</span><b>-$${wages}</b></div>
    <div class="row"><span>Customers lost</span><b>${S.statsDay.lost}</b></div>
    <div class="row"><span>Products crafted</span><b>${S.statsDay.crafted}</b></div>
    <div class="row"><span>Monsters defeated</span><b>${S.statsDay.monsters}</b></div>
    <div class="row"><span>All-goals bonus</span><b>${all?'+1 Legacy Point':'Not completed'}</b></div>`;
  $('daySummary').classList.add('show');
}

function update(dt){
  if(!playing)return;
  animClock+=dt;
  updateProgression();
  dayTime+=dt;
  if(dayTime>=120)return endDay();
  spawnTimer-=dt;
  if(spawnTimer<=0){spawnClient();spawnTimer=5+Math.random()*4}
  playerTick(dt);
  employeeTick(dt);
  clientTick(dt);
  if(monsters.length<5&&Math.random()<dt*.45){
    monsters.push({
      x:440+Math.random()*960,
      y:115+Math.random()*140,
      hp:20,maxHp:20,
      kind:Math.random()<.38?'wolf':'slime'
    });
  }
  effects.forEach(e=>e.t-=dt);
  effects=effects.filter(e=>e.t>0);
  if(S.rep<0){
    toast('GAME OVER • Shop reputation fell below 0');
    playing=false;openPage('save');
  }
}

// ============================================================================
// 6-LAYER MODULAR RENDERING SYSTEM (No Baked People or Static Stock!)
// ============================================================================
function pxRect(x,y,w,h,col){
  g.fillStyle=col;
  g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
}
function text(t,x,y,z=14,col='#fff'){
  g.fillStyle=col;
  g.font=`bold ${z}px Arial`;
  g.textAlign='center';
  g.fillText(t,x,y);
}
function labelBadge(t,x,y,col='#fff1c2',bg='#1d1616e6',w=152){
  pxRect(x-w/2,y-12,w,20,bg);
  g.strokeStyle='#9b713f';g.lineWidth=1.5;
  g.strokeRect(Math.round(x-w/2),Math.round(y-12),w,20);
  text(t,x,y+3,10.5,col);
}

function drawTiledRoomFloor(x,y,w,h,baseCol,lineCol,sprKey){
  // Calm base first. A sparse, translucent texture keeps rooms readable without visual noise.
  pxRect(x,y,w,h,baseCol);
  if(sprReady(sprKey)){
    g.save();g.globalAlpha=.20;
    const tile=128;
    for(let yy=y;yy<y+h;yy+=tile){
      for(let xx=x;xx<x+w;xx+=tile){
        g.drawImage(SPRITES[sprKey],xx,yy,Math.min(tile,x+w-xx),Math.min(tile,y+h-yy));
      }
    }
    g.restore();
  }
  g.save();g.globalAlpha=.18;g.strokeStyle=lineCol;g.lineWidth=2;
  for(let yy=y+96;yy<y+h;yy+=128){g.beginPath();g.moveTo(x+10,yy);g.lineTo(x+w-10,yy);g.stroke()}
  g.restore();
}

function drawTwelveSlotRack(x,y,items,title,bannerCol,icon){
  // Solid upright 3-tier shelf object, initially 4 slots and upgradeable to 8/12.
  const cap=(S.shopLevel||1)>=4?12:(S.shopLevel||1)>=2?8:4;
  pxRect(x-86,y-82,172,92,'#241813');
  pxRect(x-81,y-77,162,82,'#7a4d2c');
  pxRect(x-76,y-72,152,70,'#3b2416');
  for(let row=0;row<3;row++)pxRect(x-77,y-51+row*24,154,6,'#9a6337');
  pxRect(x-88,y+5,176,12,'#4b2e20');
  for(let i=0;i<cap;i++){
    const col=i%4,row=Math.floor(i/4),sx=x-57+col*38,sy=y-62+row*24;
    pxRect(sx-13,sy-8,26,18,'#21140e');
    if(i<items.length){const it=items[i];pxRect(sx-12,sy-7,24,3,it.color||bannerCol);text(it.icon,sx,sy+6,12,'#fff')}
  }
  pxRect(x-70,y-106,140,21,bannerCol);text(`${icon} ${title}`,x,y-91,10,'#fff');
  labelBadge(`${Math.min(items.length,cap)}/${cap}`,x,y+34,items.length>=cap?'#ff8978':'#ffe7a0','#191516dd',72);
}
function drawEightSlotOutput(x,y,items,max,label){
  if(sprReady('toolTable'))g.drawImage(SPRITES.toolTable,x-46,y-22,92,46);
  else{
    pxRect(x-46,y-20,92,40,'#6b472b');
    pxRect(x-42,y-16,84,32,'#8c623e');
  }
  for(let i=0;i<max;i++){
    const sx=x-30+(i%4)*20,sy=y-7+Math.floor(i/4)*15;
    pxRect(sx-8,sy-6,16,12,i<items.length?'#2d1e14':'#4f3624');
    if(i<items.length){
      pxRect(sx-8,sy-6,16,3,items[i].color||'#ffd064');
      text(items[i].icon,sx,sy+4,10.5,'#fff');
    }
  }
  labelBadge(`${label} ${items.length}/${max}`,x,y+32,items.length>=max?'#ff8978':'#ffe7a0','#191516dd',108);
}

function drawTreeCanopy(x,y,kind=0){
  if(kind===2&&sprReady('pine1')){g.drawImage(SPRITES.pine1,x-36,y-48,72,84);return}
  if(kind===1&&sprReady('tree2')){g.drawImage(SPRITES.tree2,x-38,y-48,76,84);return}
  if(sprReady('tree1')){g.drawImage(SPRITES.tree1,x-38,y-48,76,84);return}
  pxRect(x-7,y+16,14,26,'#65412c');
  pxRect(x-30,y-8,60,36,kind===1?'#1c562c':'#236733');
  pxRect(x-24,y-22,48,28,kind===1?'#2a743d':'#378846');
  pxRect(x-15,y-32,30,18,'#56ab54');
}

// LAYER 1 & 2: Modular Ground, Rooms, Walls, Empty Shelves & Workstations
function drawLayer1And2(){
  // v0.20.00 visual redesign. Geometry and collision remain the trusted v0.19.00 model.
  // Meadow base with sparse pixels.
  pxRect(0,0,WORLD.w,WORLD.h,'#386f36');
  for(let y=24;y<WORLD.h;y+=72){
    for(let x=24;x<WORLD.w;x+=72){
      const n=(x*7+y*11)%29;
      if(n<7)pxRect(x,y,7,4,n<3?'#6aaa54':'#4b8a43');
    }
  }

  // Roads and shared circulation. The broad centre spine is always visible and matches door openings.
  drawTiledRoomFloor(625,270,250,2110,'#b8945c','#8a693e','pathStone');
  drawTiledRoomFloor(250,1080,1370,150,'#b8945c','#8a693e','pathStone');
  drawTiledRoomFloor(250,1970,1370,160,'#b8945c','#8a693e','pathStone');
  drawTiledRoomFloor(615,2040,265,560,'#ad8754','#806239','pathStone');
  // Clear branch roads to all upper doors.
  pxRect(280,630,405,94,'#bd995f');
  pxRect(835,630,170,94,'#bd995f');
  pxRect(1230,570,330,105,'#bd995f');
  pxRect(1250,835,120,140,'#bd995f');

  // River and bridge.
  pxRect(350,2340,1496,230,'#197899');
  for(let xx=370;xx<1830;xx+=62){pxRect(xx,2380+(xx%4)*34,32,5,'#62c7d6')}
  drawTiledRoomFloor(645,2335,205,235,'#8d633a','#5c3c22','bridge');
  pxRect(645,2335,12,235,'#50331e');pxRect(838,2335,12,235,'#50331e');

  // Room floors, each district uses a restrained colour family.
  const roomStyle={
    material:['#756245','#aa8e5a'],staff:['#aa946d','#d1b98b'],training:['#796b4f','#a28a5d'],
    forge:['#70554a','#a96a42'],alchemy:['#665b50','#7c6fb1'],contract:['#715b42','#9d7a45'],
    attack:['#b19369','#bb5d4f'],defense:['#b19369','#5275a3'],other:['#b19369','#7d5aa4'],
    rare:['#4d3d57','#8c5bb0'],counter:['#b59b72','#d1aa5c'],management:['#927858','#6686a0'],
    visitor:['#817259','#9f875f'],gate:['#536f42','#73945b'],forest:['#275c2d','#378047']
  };
  for(const [key,rm] of Object.entries(R)){
    const st=roomStyle[key]||[rm.floor,'#907552'];
    drawTiledRoomFloor(rm.x,rm.y,rm.w,rm.h,st[0],st[1],key==='forge'||key==='alchemy'?'floorWork':'floorWood');
    // A slim colour strip identifies each department without occupying walk space.
    pxRect(rm.x+8,rm.y+8,Math.max(20,rm.w-16),8,st[1]);
  }

  // Functional furniture, aligned to gameplay points.
  // Forge benches and furnaces.
  for(const fx of [185,435]){
    pxRect(fx-54,778,108,82,'#3b3434');pxRect(fx-42,790,84,56,'#1e2022');
    pxRect(fx-28,807,56,31,'#e76a2c');pxRect(fx-17,814,34,18,'#ffd05c');
    pxRect(fx-34,915,68,34,'#555a60');pxRect(fx-22,907,44,12,'#81878e');
  }
  // Alchemy benches and cauldrons.
  for(const ax of [805,1035]){
    pxRect(ax-55,775,110,34,'#543925');pxRect(ax-44,753,20,24,'#57c67d');pxRect(ax,753,20,24,'#ad78e8');
    pxRect(ax-38,905,76,62,'#2a2c31');pxRect(ax-29,900,58,17,ax<900?'#52d274':'#a46dea');
  }
  // Beds, training dummies, desks and visitor well.
  for(let i=0;i<3;i++){const bx=710+i*150;pxRect(bx,390,82,48,'#5c3b2b');pxRect(bx+7,397,68,34,['#668eb0','#9870a9','#689574'][i])}
  for(const dx of [1345,1445]){pxRect(dx-6,470,12,46,'#69442b');pxRect(dx-22,482,44,8,'#8f5d38');pxRect(dx-13,454,26,26,'#d5b987')}
  pxRect(1390,1510,180,74,'#62442c');pxRect(1402,1522,156,50,'#9c6a3f');
  pxRect(1390,1810,180,74,'#39556c');pxRect(1402,1822,156,50,'#62829a');
  pxRect(PTS.visitor.x-38,PTS.visitor.y-38,76,76,'#6c757c');pxRect(PTS.visitor.x-25,PTS.visitor.y-25,50,50,'#2282a1');

  // Hiring pad and checkout bar.
  pxRect(PTS.hire.x-55,PTS.hire.y-27,110,54,'#2f7741');
  g.strokeStyle='#9be3aa';g.lineWidth=2;g.strokeRect(PTS.hire.x-55,PTS.hire.y-27,110,54);
  text('HIRE',PTS.hire.x,PTS.hire.y+4,10,'#fff');
  pxRect(495,1905,465,52,'#5a3a25');pxRect(495,1905,465,12,'#bf8a49');

  // Every collision wall is rendered from the same SOLIDS array. No separate invisible geometry.
  for(const wall of SOLIDS){
    if(wall.y>=2340&&wall.h>=180)continue; // river collision already visible
    if(wall.x===495&&wall.y===1905)continue; // checkout bar already visible
    drawWallAssetSegment(wall);
  }

  // Doorway mats make openings obvious.
  const doors=[
    [280,648,125,30],[855,658,130,30],[1320,638,170,30],[285,1148,140,30],
    [895,1148,135,30],[1272,840,38,135],[180,1632,125,30],[635,2030,225,34],
    [1272,1570,38,125],[1272,1840,38,120]
  ];
  for(const d of doors){pxRect(d[0],d[1],d[2],d[3],'#e0c27e');g.strokeStyle='#8f6b3a';g.lineWidth=2;g.strokeRect(...d)}
  drawMapObjects('lowProps');
}
// LAYER 3: Dynamic World (Materials, Outputs, 12-Slot Shelves, Contract Crates, Rare Storage, Coins & Y-Sorted Characters)
function drawCrate(x,y,filled=false){
  const spr=SPRITES.crates;
  if(spr&&spr.complete&&spr.naturalWidth){
    g.save();g.globalAlpha=filled?1:.58;g.drawImage(spr,x-30,y-28,60,52);g.restore();
  }else{
    pxRect(x-28,y-24,56,46,filled?'#8a5a2f':'#56412f');
    g.strokeStyle='#d6a45b';g.lineWidth=3;g.strokeRect(x-28,y-24,56,46);
    g.beginPath();g.moveTo(x-25,y-20);g.lineTo(x+25,y+18);g.moveTo(x+25,y-20);g.lineTo(x-25,y+18);g.stroke();
  }
}

function drawLayer3(){
  // Material Yard Nodes
  for(const n of yardNodes){
    if(n.ready&&sprReady(n.spr)){
      g.drawImage(SPRITES[n.spr],n.x-28,n.y-24,56,48);
    }else{
      pxRect(n.x-26,n.y-20,52,40,n.ready?'#45382b':'#2b241d');
      text(n.icon,n.x,n.y+6,20,n.ready?'#fff':'#666');
    }
    if(!n.ready){
      pxRect(n.x-22,n.y+16,44,6,'#222');
      pxRect(n.x-22,n.y+16,44*(1-n.timer/n.max),6,'#67d876');
    }
  }

  // Workshop Output Tables (8-slot visible capacity)
  const forgeSwordOut=[...S.outputItems.sword,...S.outputItems.axe];
  const forgeShieldOut=[...S.outputItems.shield,...S.outputItems.helmet];
  const alchOut=[...S.outputItems.potion,...S.outputItems.repair];
  drawEightSlotOutput(PTS.swordOut.x,PTS.swordOut.y,forgeSwordOut,S.outputCap,'⚔️ OUT');
  drawEightSlotOutput(PTS.shieldOut.x,PTS.shieldOut.y,forgeShieldOut,S.outputCap,'🛡️ OUT');
  drawEightSlotOutput(PTS.potionOut.x,PTS.potionOut.y,alchOut,S.outputCap,'🧪 OUT');

  // 12-Slot Retail Shelves (Attack, Defense, Other)
  drawTwelveSlotRack(PTS.attackShelf.x,PTS.attackShelf.y-25,deptItems('Attack'),'ATTACK','#b83737','⚔️');
  drawTwelveSlotRack(PTS.defenseShelf.x,PTS.defenseShelf.y-25,deptItems('Defense'),'DEFENSE','#3368a6','🛡️');
  drawTwelveSlotRack(PTS.otherShelf.x,PTS.otherShelf.y-25,deptItems('Other'),'OTHER','#784aa8','🧪');

  // Rare Storage Showcase (x:70..385, y:1645..2045)
  pxRect(PTS.rare.x-110,PTS.rare.y-50,220,95,'#261933');
  g.strokeStyle='#a56de2';g.lineWidth=2;g.strokeRect(PTS.rare.x-110,PTS.rare.y-50,220,95);
  for(let i=0;i<6;i++){
    const rx=PTS.rare.x-82+(i%3)*82,ry=PTS.rare.y-22+Math.floor(i/3)*42;
    const it=S.rareDisplay[i];
    pxRect(rx-20,ry-15,40,30,it?it.color:'#3b284d');
    if(it)text(it.icon,rx,ry+6,15,'#fff');
  }
  labelBadge(`✨ RARE SHOWCASE (${S.rareDisplay.length}/6)`,PTS.rare.x,PTS.rare.y-62,'#f3c6ff','#291d36ee',168);

  // Contract Warehouse 20-Crate Pallets (visibly filling as wholesale units are delivered)
  const filledCrates=contractUnits();
  const crateSlots=[];
  S.contracts.slice(0,3).forEach(q=>{
    const visible=Math.min(5,Math.max(1,Math.ceil(q.qty/4)));
    for(let j=0;j<visible;j++)crateSlots.push({q,j});
  });
  for(let i=0;i<10;i++){
    const cx=1365+(i%5)*80,cy=735+Math.floor(i/5)*88,slotInfo=crateSlots[i];
    const delivered=slotInfo?Math.max(0,slotInfo.q.done-slotInfo.j*4):0;
    drawCrate(cx,cy,delivered>0);
    if(slotInfo){
      text(recipes[slotInfo.q.key].icon,cx+22,cy+25,14,'#fff');
      text(`${Math.min(4,delivered)}/4`,cx+22,cy+56,8,delivered>0?'#9dff9d':'#ffe0a0');
    }
  }
  pxRect(PTS.contractDrop.x-48,PTS.contractDrop.y-24,96,48,'#3a542c');
  g.strokeStyle='#ffd064';g.lineWidth=2;g.strokeRect(PTS.contractDrop.x-48,PTS.contractDrop.y-24,96,48);
  text('DROP ZONE',PTS.contractDrop.x,PTS.contractDrop.y+4,10,'#fff3b8');
  labelBadge(`📦 CONTRACTS ${filledCrates}/${S.contractCap}`,1535,695,'#ffe0a0');

  // Checkout Coins Pile
  if(S.coinsFloor>0){
    pxRect(PTS.coinPile.x-42,PTS.coinPile.y-36,84,22,'#191516e6');
    for(let i=0;i<Math.min(14,Math.ceil(S.coinsFloor/15));i++){
      g.fillStyle='#ffd54f';
      g.beginPath();g.arc(PTS.coinPile.x-24+(i%5)*12,PTS.coinPile.y-2+Math.floor(i/5)*10,6.5,0,7);g.fill();
    }
    text('🪙 $'+S.coinsFloor,PTS.coinPile.x,PTS.coinPile.y-21,11.5,'#fff4a3');
  }

  // Monster Loot Drops
  for(const dr of drops){
    pxRect(dr.x-12,dr.y-12,24,24,'#233b24cc');
    text(dr.icon,dr.x,dr.y+5,14,'#fff');
  }

  // Y-Sorted Dynamic Entities (Player, Workers, Customers, Monsters)
  const entities=[];
  clients.forEach(x=>entities.push({y:x.y,fn:()=>{
    let col=x.level==='Knight'?'#4a6b9c':x.personality==='Collector'?'#8a4999':'#6f4c92';
    person(x,col,x.level,x.level==='Knight'?'Knight':x.personality==='Collector'?'Collector':x.level==='Veteran'?'Veteran':'none',x.carriedItem?x.carriedItem.icon:'');
  }}));
  S.employees.forEach(e=>entities.push({y:e.y,fn:()=>{
    let col=e.job==='Sales'?'#c68a2d':e.job==='Craft'?'#c65337':e.job==='Expedition'?'#4b6cb7':'#67825d';
    person(e,col,`${e.name} (${e.job})`,e.job==='Craft'?'Smith':'none',e.carryKey?recipes[e.carryKey].icon:(e.statusIcon||''));
  }}));
  monsters.forEach(m=>entities.push({y:m.y,fn:()=>{
    let bounce=Math.sin(animClock*8+m.x)*3;
    if(m.kind==='wolf'){
      pxRect(m.x-22,m.y-4+bounce,44,24,'#596270');
      pxRect(m.x-14,m.y-16+bounce,28,16,'#778294');
    }else{
      pxRect(m.x-22,m.y-3+bounce,44,28,'#49ad44');
      pxRect(m.x-15,m.y-15+bounce,30,18,'#78dd62');
    }
    pxRect(m.x-8,m.y+2+bounce,4,4,'#222');pxRect(m.x+5,m.y+2+bounce,4,4,'#222');
    pxRect(m.x-20,m.y-26,40,6,'#222');
    pxRect(m.x-20,m.y-26,40*(m.hp/m.maxHp),6,'#67e66c');
  }}));
  entities.push({y:player.y,fn:()=>{
    if(player.carryCount>0){
      for(let i=0;i<player.carryItems.length;i++){
        let it=player.carryItems[i];
        pxRect(player.x-14,player.y-76-i*20,28,18,it.color||'#fff');
        text(it.icon,player.x,player.y-62-i*20,14,'#fff');
      }
    }
    person(player,'#297ea1','YOU','Hero',S.equipped.weapon?.icon||'');
  }});
  entities.sort((a,b)=>a.y-b.y);
  entities.forEach(ent=>ent.fn());
}

// LAYER 4, 5 & 6: Upper Tree Canopies, Animated Fire/Bubbles, Request Bubbles & Room Signboards
function drawLayer4To6(){
  {
    // Layer 4: Forest Trees & Perimeter Canopies
    const treeCoords=[
      [110,140,0],[240,120,1],[370,150,2],[1480,130,1],[1620,150,2],[1740,130,0],
      [140,2220,0],[490,2220,1],[940,2220,0],[1120,2220,1],[1350,2240,2],
      [220,2680,1],[480,2680,0],[960,2680,1],[1220,2680,0],[1520,2680,2]
    ];
    for(const [tx,ty,tk] of treeCoords)drawTreeCanopy(tx,ty,tk);
    drawMapObjects('highProps');

    // Forest Adventure Archway Sign
    pxRect(835,255,220,28,'#593a22');
    g.strokeStyle='#ffd064';g.lineWidth=2;g.strokeRect(835,255,220,28);
    text('🌲 FOREST ADVENTURE',945,274,11,'#ffe9b5');

    // Room Header Signboards
    for(const rm of Object.values(R)){
      if(rm.title)labelBadge(rm.title,rm.x+rm.w/2,rm.y+23,'#ffe9b5','#241a14e6',Math.min(176,rm.w-28));
    }
  }

  // Layer 5: Animated Forge Sparks, Alchemy Bubbles & Combat Slash Effects
  const flicker=Math.sin(animClock*10)*4;
  pxRect(180,812+flicker,10,10,'#fff3a1');
  pxRect(430,812-flicker,10,10,'#fff3a1');
  g.fillStyle='#7dff9b';
  g.beginPath();g.arc(845+Math.sin(animClock*5)*10,898-(animClock*20)%18,4,0,7);g.fill();
  g.fillStyle='#d58cff';
  g.beginPath();g.arc(1075+Math.cos(animClock*5)*10,898-((animClock*20+9)%18),4,0,7);g.fill();

  if(!S.visitorClaimed){
    labelBadge('🎁 TAP TO CLAIM VISITOR GIFT!',PTS.visitor.x,PTS.visitor.y-52,'#ffd86b','#3b2818f0',188);
  }

  // Layer 6: Customer Request Bubbles, Patience Bars & Floating Numbers
  clients.forEach(x=>{
    if(x.state==='toShelf'||x.state==='waitShelf'){
      let r=recipes[x.want];
      let label=`${r.icon} ${r.name}`+(x.minStat?`\n${r.statName} ${x.minStat}+`:'')+(x.minRarity!=='Any'?` • ${x.minRarity}+`:'');
      drawRequest(x,label);
      pxRect(x.x-30,x.y-64,60,6,'#332a30');
      pxRect(x.x-30,x.y-64,60*Math.max(0,x.pat/x.max),6,x.pat/x.max>.4?'#5ed177':'#ed6256');
    }
  });

  S.employees.forEach(e=>{
    if(e.job==='Craft'&&e.work>0){
      pxRect(e.x-24,e.y-66,48,6,'#222');
      pxRect(e.x-24,e.y-66,48*Math.min(1,e.work/6.0),6,'#ffd257');
    }
  });

  if(target){
    g.strokeStyle='#fff0a3';g.lineWidth=3;
    g.strokeRect(target.x-12,target.y-12,24,24);
  }
  effects.forEach(e=>{
    if(e.slash){
      g.strokeStyle='#fff';g.lineWidth=3;
      g.beginPath();g.arc(e.x,e.y,28,0,Math.PI);g.stroke();
    }
    text(e.text,e.x,e.y-(1.2-e.t)*34,14,e.col||'#ffed75');
  });
}

function person(o,col='#302831',label='',hatType='none',badge=''){
  g.save();const bob=o.moving?Math.round(Math.sin(animClock*14)*1):0;g.translate(Math.round(o.x),Math.round(o.y+bob));
  g.fillStyle='#0006';g.beginPath();g.ellipse(0,17-bob,9,3,0,0,Math.PI*2);g.fill();
  pxRect(-6,5,5,10,'#34292b');pxRect(1,5,5,10,'#34292b');
  pxRect(-8,-7,16,13,col);pxRect(-10,-5,3,9,col);pxRect(7,-5,3,9,col);
  pxRect(-6,-16,12,9,'#e7b978');pxRect(-3,-12,2,2,'#282024');pxRect(2,-12,2,2,'#282024');
  const hat=hatType==='Hero'?'#23698b':hatType==='Knight'?'#8794a0':hatType==='Smith'?'#a94d32':hatType==='Collector'?'#9a6bc0':'#4b352c';
  pxRect(-7,-20,14,5,hat);pxRect(-9,-17,18,2,hat);
  if(badge)text(badge,10,-10,10,'#fff');
  if(o===player&&label)labelBadge(label,0,-30,'#fff','#171719dd',42);
  g.restore();
}
function drawRequest(o,label){
  const near=Math.hypot(player.x-o.x,player.y-o.y)<250;
  if(!near){
    const first=label.split(' ')[0];
    pxRect(o.x-17,o.y-58,34,24,'#fff0c9');
    g.strokeStyle='#6d4931';g.lineWidth=2;g.strokeRect(o.x-17,o.y-58,34,24);
    text(first,o.x,o.y-40,13,'#352619');
    return;
  }
  const lines=label.split('\n'),w=118,h=14+lines.length*13,x=o.x-w/2,y=o.y-68-h;
  pxRect(x,y,w,h,'#fff0c9');g.strokeStyle='#6d4931';g.lineWidth=2;g.strokeRect(x,y,w,h);
  for(let i=0;i<lines.length;i++)text(lines[i],o.x,y+14+i*13,9,'#352619');
}
function draw(){
  g.save();
  g.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  g.clearRect(0,0,vw,vh);
  g.scale(zoom,zoom);
  g.translate(-cam.x,-cam.y);
  drawLayer1And2();
  drawLayer3();
  drawLayer4To6();
  g.restore();
}

// ============================================================================
// UI PANELS & SLOTS
// ============================================================================
function renderSlots(){
  const box=$('saveSlots');
  if(!box)return;
  box.innerHTML=[1,2,3].map(n=>{
    let d=load(n);
    return `<div class="slot"><h2>SAVE SLOT ${n}</h2>${d?`<p>Day ${d.day} • Cash $${d.cash}<br>Reputation ${d.rep} • Legacy ${d.legacy||0}<br>Staff ${d.employees?.length||0} • Saved ${d.savedAt||'Recently'}</p>`:'<p>Empty shop record<br>Start at the Modular Forest Outpost with 0 employees and build your empire!</p>'}<div class="actions"><button data-load="${n}">${d?'LOAD SHOP':'START NEW SHOP'}</button>${d?`<button class="danger" data-del="${n}">DELETE</button>`:''}</div></div>`;
  }).join('');
  document.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>start(Number(b.dataset.load)));
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{
    if(confirm('Delete this save slot? (Forever Skills & Legacy are kept)')){
      const num=Number(b.dataset.del);
      localStorage.removeItem(key(num));
      OLD_PREFIXES.forEach(p=>localStorage.removeItem(p+num));
      renderSlots();
    }
  });
}

function start(n){
  slot=n;
  let existing=load(n);
  S=norm(existing);
  player={x:745,y:1975,speed:325,hp:100,maxHp:100,carryKey:null,carryCount:0,carryItems:[],carryCap:3+S.skills.management};
  clients=[];monsters=[];drops=[];target=null;dayTime=0;zoom=S.zoom||.66;
  updateProgression();
  if(!S.goals.length)createDayContent();
  if(!S.offers.length)generateContractOffers();
  playing=true;
  setZoom(S.zoom||.66);
  $('slotScreen').classList.remove('show');
  $('app').classList.remove('hidden');
  if(!existing)save('Slot created');
  toast('Hold & drag anywhere to walk around your Modular Forest Outpost!');
  showTutorial();
}

function card(title,body){return `<div class="card"><h3>${title}</h3>${body}</div>`}

function openPage(p){
  if(['employees','wholesale','skills','expedition'].includes(p)&&!featureUnlocked(p)){toast('This function unlocks later in shop progression');return}
  $('panel').classList.add('show');
  let h='';
  if(p==='status'){
    h=`<div class="eventBanner"><b>TODAY'S EVENT • ${S.event?.name||'Market Day'}</b><br>${S.event?.desc||''}</div>
    <h2>DAILY GOALS</h2>
    ${S.goals.map(q=>`<div class="dailyGoal ${q.done?'done':''}">${q.done?'✓':'□'} ${q.label} • <b>${Math.min(q.value,q.target)}/${q.target}</b></div>`).join('')}
    <h2>SHOP & HERO OVERVIEW</h2>
    <div class="grid">
      ${card('Business Status',`
        <div class="row"><span>Day</span><b>${S.day}</b></div>
        <div class="row"><span>Cash</span><b>$${S.cash}</b></div>
        <div class="row"><span>Reputation</span><b>${S.rep}</b></div>
        <div class="row"><span>Shop Rating</span><b>${Math.max(1,S.review-S.badReviews*.15).toFixed(1)} ★</b></div>
      `)}
      ${card('Equipped Hero Gear',`
        <div class="row"><span>Weapon</span><b>${S.equipped.weapon.icon} ${S.equipped.weapon.name} (ATK ${S.equipped.weapon.stat})</b></div>
        <div class="row"><span>Defense</span><b>${S.equipped.armor.icon} ${S.equipped.armor.name} (DEF ${S.equipped.armor.stat})</b></div>
        <p style="font-size:11px;color:#a8ff9e;margin:6px 0 0">Crafting higher-stat weapons or armor automatically upgrades your equipped gear!</p>
      `)}
      ${card('Raw Materials',`
        <div class="row"><span>🪨 Iron Ore</span><b>${S.iron}</b></div>
        <div class="row"><span>🪵 Hardwood</span><b>${S.wood}</b></div>
        <div class="row"><span>🌿 Healing Herb</span><b>${S.herb}</b></div>
        <div class="row"><span>💧 Slime Gel</span><b>${S.gel}</b></div>
      `)}
      ${card('Rare Storage (+Tip Bonus)',S.rareDisplay.length?S.rareDisplay.map(r=>`<div>${r.icon} <b style="color:${r.color}">${r.rarity} ${r.name}</b> (${r.stat})</div>`).join(''):'Craft Rare+ items or Slime Edge to fill Rare Storage!')}
    </div>`;
  }
  if(p==='products'){
    h=`<h2>PRODUCTS & QUALITY POLICY</h2>
    <div class="presetRow">
      <button data-preset="Safe">SAFE</button>
      <button data-preset="Profit">PROFIT</button>
      <button data-preset="Quality">QUALITY</button>
      <button data-preset="Custom">ALL ON</button>
    </div>
    <div class="card" style="margin-bottom:10px">
      <h3>Poor / Defective Item Policy: <b>${S.poorPolicy}</b></h3>
      <p style="font-size:12px;margin:4px 0;color:#cbb89d">Choose how Poor-quality items are handled (or craft Repair Kits at Alchemy to upgrade Poor items to Uncommon!):</p>
      <div class="presetRow" style="grid-template-columns:repeat(3,1fr);margin:0">
        <button data-poor="Honest" class="${S.poorPolicy==='Honest'?'on':''}">HONEST (50% Price)</button>
        <button data-poor="Scrap" class="${S.poorPolicy==='Scrap'?'on':''}">SCRAP (+1 Mat)</button>
        <button data-poor="Disguise" class="${S.poorPolicy==='Disguise'?'on':''}">DISGUISE (Risk -REP)</button>
      </div>
    </div>
    <div class="grid">
      ${Object.entries(recipes).map(([k,r])=>{
        let x=S.products[k];
        return card(`${r.icon} ${r.name}`,`
          <div class="row"><span>Department</span><b>${r.cat} (${r.statName} ${r.baseStat})</b></div>
          <div class="row"><span>Recipe Cost</span><b>${r.iron?r.iron+'🪨 ':''}${r.wood?r.wood+'🪵 ':''}${r.herb?r.herb+'🌿':''}</b></div>
          <div class="row"><span>Product Stock</span><b>${x.stock}</b></div><div class="row"><span>${r.cat} Shelf Total</span><b>${deptTotalStock(r.cat)}/12</b></div><div class="row"><span>Shared Output</span><b>${outputGroupCount(k)}/${S.outputCap}</b></div>
          ${x.unlocked?`<button data-toggle="${k}" class="${x.on?'on':''}">${x.on?'SELLING ON':'SELLING OFF'}</button>`:`<button data-unlock="${k}">UNLOCK RECIPE ($${r.unlockCost})</button>`}
        `);
      }).join('')}
    </div>`;
  }
  if(p==='employees'){
    h=`<h2>STAFF & ASSIGNMENTS (${S.employees.length}/${S.staffCap})</h2>
    <button class="action" id="applyRecommended">✨ APPLY ALL RECOMMENDED ROLES</button>
    <div class="grid" style="margin-top:10px">
      ${S.employees.map(e=>card(`${e.name} • ${e.job}`,`
        <div class="abilities"><span>SELL ${e.sell}</span><span>CRAFT ${e.craft}</span><span>ATK ${e.atk}</span><span>DEF ${e.def}</span></div>
        <div class="row"><span>HP ${Math.round(e.hp)}/100</span><span>Wage $${e.wage}/day</span></div>
        ${['Sales','Craft','Expedition','Staff House'].map(j=>`<button data-emp="${e.id}" data-job="${j}" class="${e.job===j?'on':''}">${j}</button>`).join('')}
      `)).join('')}
      ${card('Staff House Management',`
        <div class="row"><span>Staff Capacity</span><b>${S.employees.length}/${S.staffCap}</b></div>
        <button id="hire">🤝 HIRE NEW HELPER ($120)</button>
        <button id="house">🏠 UPGRADE STAFF HOUSE ($300)</button>
      `)}
    </div>`;
  }
  if(p==='wholesale'){
    h=`<h2>WHOLESALE CONTRACTS</h2>
    <div class="card" style="margin-bottom:10px">
      <h3>Worker Priority: <b>${S.productionPriority}</b></h3>
      <p style="font-size:12px;margin:4px 0;color:#cbb89d">Controls whether Sales & Craft workers prioritize Retail shelves or the Contract Warehouse:</p>
      <div class="presetRow" style="grid-template-columns:repeat(3,1fr);margin:0">
        <button data-priority="Retail" class="${S.productionPriority==='Retail'?'on':''}">RETAIL FIRST</button>
        <button data-priority="Balanced" class="${S.productionPriority==='Balanced'?'on':''}">BALANCED</button>
        <button data-priority="Wholesale" class="${S.productionPriority==='Wholesale'?'on':''}">WHOLESALE FIRST</button>
      </div>
    </div>
    <div class="grid">
      ${S.contracts.map(q=>card(`ACTIVE • ${q.buyer}`,`
        <div class="row"><span>Order</span><b>${recipes[q.key].icon} ${recipes[q.key].name} ${q.done}/${q.qty}</b></div>
        <div class="bar"><i style="width:${Math.min(100,q.done/q.qty*100)}%"></i></div>
        <div class="row"><span>Deadline</span><b>${q.days} day(s) left</b></div>
        <div class="row"><span>Reward</span><b>$${q.reward} & +1 Legacy</b></div>
        <p style="font-size:11px;color:#ffd88a;margin:6px 0 0">Carry ${recipes[q.key].name} to the Contract Warehouse drop zone (or set worker priority to Wholesale)!</p>
      `)).join('')}
      ${S.offers.map(q=>card(`OFFER • ${q.buyer}`,`
        <div class="row"><span>Product</span><b>${recipes[q.key].icon} ${recipes[q.key].name} ×${q.qty}</b></div>
        <div class="row"><span>Time / Reward</span><b>${q.days} days • $${q.reward}</b></div>
        <button data-contract="${q.id}">ACCEPT CONTRACT</button>
      `)).join('')}
      ${card('Contract Office',`
        <div class="row"><span>Warehouse Crates</span><b>${contractUnits()}/${S.contractCap}</b></div>
        <div class="row"><span>Active Contracts</span><b>${S.contracts.length}/${S.contractSlots}</b></div>
        <button id="office">📦 UPGRADE CONTRACT OFFICE ($500)</button>
      `)}
    </div>`;
  }
  if(p==='expedition'){
    if(!featureUnlocked('expedition'))h=`<h2>🔒 EXPEDITION BOARD</h2><div class="card"><p>Unlocks on Day 3 after hiring the first helper.</p></div>`;
    else h=`<h2>EXPEDITION BOARD</h2><p>Choose an area, then assign a worker or enter personally.</p><div class="grid">${Object.entries(AREA_DATA).map(([k,a],i)=>card(`${i+1}. ${a.name}`,
      `<div class="row"><span>Area level</span><b>${a.level}</b></div><div class="row"><span>Recommended power</span><b>${a.power}</b></div><div class="row"><span>Possible drops</span><b>${a.drops.join(', ')}</b></div>`+
      (i+1<=(S.areaUnlocked||1)?`<button data-area="${k}">SELECT AREA</button>`:`<button disabled>🔒 CLEAR PREVIOUS AREA</button>`))).join('')}</div>`;
  }
  if(p==='skills'){
    const desc={
      quality:'Boosts crafted item rarity & ATK/DEF stats.',
      merchant:'Increases customer patience & tip generosity.',
      adventure:'Increases player monster damage & gathering yield.',
      management:'Increases player carrying stack capacity (+1 per level).'
    };
    h=`<h2>FOREVER SKILLS (Survives New Game)</h2>
    <p>Available Legacy Points: <b style="color:#ffd264">${S.legacy}</b></p>
    <div class="grid">
      ${Object.entries(S.skills).map(([k,v])=>card(`${k.toUpperCase()} • Lv.${v}`,`
        <p style="font-size:12px;color:#cbb89d">${desc[k]}</p>
        <button data-skill="${k}">UPGRADE (${v+1} LEGACY)</button>
      `)).join('')}
    </div>`;
  }
  if(p==='visual'){
    h=`<h2>PROGRESSIVE PIXEL WORLD PREVIEW (v0.19.00)</h2>
    <div class="visualNote">
      <b>Live Modular Rendering Only:</b> Ground, walls, shelves, workstations, dynamic stock, and characters render in separate layers. Concept artwork is not available as a playable map background.
    </div>
    <iframe src="art_preview.html?v=0.20.00" style="width:100%;height:56vh;border:2px solid #8c653d;border-radius:12px;background:#1a1e18"></iframe>`;
  }
  if(p==='save'){
    h=`<h2>SAVE & EXIT</h2>
    <button class="action" id="saveExit">💾 SAVE NOW & EXIT TO SLOTS</button>
    <button class="action" id="noSave">🚪 EXIT WITHOUT SAVING THIS DAY</button>
    <p style="font-size:12px;color:#cbb89d">Auto-save occurs at the end of every day. Forever Skills and Legacy Points are saved permanently across all slots.</p>`;
  }
  $('panelContent').innerHTML=h;
  bindPanel();
}

function bindPanel(){
  document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{
    let p=b.dataset.preset;
    if(p==='Safe'){S.products.sword.on=true;S.products.potion.on=true;['axe','shield','helmet','repair'].forEach(k=>S.products[k].on=false)}
    else if(p==='Profit'||p==='Custom')Object.values(S.products).forEach(x=>x.on=x.unlocked);
    else if(p==='Quality'){S.products.sword.on=true;S.products.potion.on=false;['axe','shield','helmet'].forEach(k=>{if(S.products[k].unlocked)S.products[k].on=true})}
    toast(p+' preset applied');openPage('products');
  });
  document.querySelectorAll('[data-poor]').forEach(b=>b.onclick=()=>{
    S.poorPolicy=b.dataset.poor;
    toast('Poor item policy: '+S.poorPolicy);
    openPage('products');
  });
  document.querySelectorAll('[data-priority]').forEach(b=>b.onclick=()=>{
    S.productionPriority=b.dataset.priority;
    toast('Priority set to '+S.productionPriority);
    openPage('wholesale');
  });
  if($('applyRecommended'))$('applyRecommended').onclick=()=>{
    S.employees.forEach((e,idx)=>{
      let exp=e.atk*.6+e.def*.4;
      if(idx===0&&!S.employees.some(w=>w.job==='Sales'))e.job='Sales';
      else e.job=e.sell>=e.craft&&e.sell>=exp?'Sales':e.craft>=exp?'Craft':'Expedition';
    });
    toast('Recommended jobs applied!');openPage('employees');
  };
  document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>{
    S.products[b.dataset.toggle].on=!S.products[b.dataset.toggle].on;
    openPage('products');
  });
  document.querySelectorAll('[data-unlock]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.unlock,cost=recipes[k].unlockCost||180;
    if(S.cash>=cost){
      S.cash-=cost;
      S.products[k].unlocked=true;
      S.products[k].on=true;
      toast(`Unlocked ${recipes[k].name}!`);
      openPage('products');
    }else toast(`Need $${cost} to unlock`);
  });
  document.querySelectorAll('[data-emp]').forEach(b=>b.onclick=()=>{
    let emp=S.employees.find(e=>e.id==b.dataset.emp);
    if(emp){emp.job=b.dataset.job;openPage('employees')}
  });
  document.querySelectorAll('[data-contract]').forEach(b=>b.onclick=()=>{
    if(S.contracts.length>=S.contractSlots)return toast('No free contract slot');
    let q=S.offers.find(x=>x.id==b.dataset.contract);
    if(q){
      S.contracts.push({...q,done:0});
      S.offers=S.offers.filter(x=>x.id!=q.id);
      toast('Accepted wholesale contract for '+q.buyer);
      openPage('wholesale');
    }
  });
  document.querySelectorAll('[data-area]').forEach(b=>b.onclick=()=>{
    S.selectedArea=b.dataset.area;const a=AREA_DATA[S.selectedArea];
    $('panelContent').innerHTML=`<h2>${a.name}</h2><div class="card"><div class="row"><span>Recommended power</span><b>${a.power}</b></div><div class="row"><span>Drops</span><b>${a.drops.join(', ')}</b></div><button id="goSelf">⚔️ GO MYSELF</button><button id="sendWorker">👤 ASSIGN BEST WORKER</button></div>`;
    $('goSelf').onclick=()=>{S.expeditions.push({area:S.selectedArea,mode:'player',started:Date.now()});$('panel').classList.remove('show');target={x:PTS.gate.x,y:PTS.gate.y};toast('Travel to the Forest Gate to enter '+a.name)};
    $('sendWorker').onclick=()=>{const e=[...S.employees].filter(x=>x.job!=='Expedition').sort((x,y)=>(y.atk+y.def)-(x.atk+x.def))[0];if(!e)return toast('No available worker');e.job='Expedition';e.expeditionArea=S.selectedArea;e.work=0;toast(e.name+' assigned to '+a.name);openPage('employees')};
  });
  document.querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>{
    let k=b.dataset.skill,cost=S.skills[k]+1;
    if(S.legacy>=cost){
      S.legacy-=cost;S.skills[k]++;
      player.carryCap=3+S.skills.management;
      saveForever();
      toast(k.toUpperCase()+' upgraded to Lv.'+S.skills[k]);
      openPage('skills');
    }else toast('Not enough Legacy Points');
  });
  if($('hire'))$('hire').onclick=()=>{hireEmployeeAtPad();openPage('employees')};
  if($('house'))$('house').onclick=()=>{
    if(S.cash>=300){S.cash-=300;S.staffCap+=2;toast('Staff capacity increased to '+S.staffCap);openPage('employees')}
    else toast('Need $300');
  };
  if($('office'))$('office').onclick=()=>{
    if(S.cash>=500){S.cash-=500;S.contractSlots++;S.contractCap+=20;toast('Contract Office upgraded!');openPage('wholesale')}
    else toast('Need $500');
  };
  if($('saveExit'))$('saveExit').onclick=()=>{save('Manual Save & Exit');exitSlots()};
  if($('noSave'))$('noSave').onclick=exitSlots;
}

function recommendation(){
  if(S.coinsFloor>0)return {t:'Collect $'+S.coinsFloor+' at Checkout',x:PTS.coinPile.x,y:PTS.coinPile.y-30};
  if(player.carryCount>0){
    if(matchingContract(player.carryKey,player.carryItems[0]?.q)&&S.productionPriority==='Wholesale'){
      return {t:'Deliver to Contract Warehouse',x:PTS.contractDrop.x,y:PTS.contractDrop.y};
    }
    let p=shelfPoint(player.carryKey);
    return {t:'Stock carried items on shelf',x:p.x,y:p.y};
  }
  if(S.output.sword>0||S.output.axe>0)return {t:'Pick up Weapons at Forge Output',x:PTS.swordOut.x,y:PTS.swordOut.y+20};
  if(S.output.shield>0||S.output.helmet>0)return {t:'Pick up Armor at Forge Output',x:PTS.shieldOut.x,y:PTS.shieldOut.y+20};
  if(S.output.potion>0||S.output.repair>0)return {t:'Pick up Potions at Alchemy Output',x:PTS.potionOut.x,y:PTS.potionOut.y+20};
  if(!S.visitorClaimed)return {t:'Claim Special Visitor Gift (South Plaza)',x:PTS.visitor.x,y:PTS.visitor.y};
  if(S.iron<2||S.wood<1||S.herb<2)return {t:'Gather materials in Material Yard',x:335,y:515};
  if(S.products.sword.stock<2)return {t:'Craft Swords in the Forge',x:355,y:960};
  if(S.products.potion.stock<2)return {t:'Brew Potions in Alchemy Lab',x:960,y:960};
  if(S.employees.length===0&&S.cash>=120)return {t:'Hire 1st Helper in Staff House ($120)',x:PTS.hire.x,y:PTS.hire.y};
  return {t:'Fight Monsters at Forest Gate',x:945,y:200};
}

function showTutorial(){
  let st=S.tutorialStep||0;
  if(st>=5){$('tutorial').classList.remove('show');return}
  const steps=[
    ['1/5 • Drag to Move','Hold & slide your finger anywhere like a joystick to walk around the Modular Forest Outpost. Tap 💡 Next Task anytime to auto-walk!'],
    ['2/5 • Craft at the Forge','Walk into the FORGE (left workshop) and tap 🔨 Sword on the bottom action bar.'],
    ['3/5 • Pick Up & Stock Shelf','Walk over the Sword at ⚔️ OUT, then carry it to the 12-slot ATTACK shelf.'],
    ['4/5 • Customer & Checkout Coins','Watch a customer walk in from the South Bridge, inspect your shelf, and leave coins at CHECKOUT. Walk over the coins!'],
    ['5/5 • Grow the Shop','Sell 5 Swords to unlock Alchemy. Employees, expeditions and contracts unlock later.']
  ];
  $('tutorialTitle').textContent=steps[st][0];
  $('tutorialText').textContent=steps[st][1];
  $('tutorial').classList.add('show');
}
function advanceTutorial(){
  S.tutorialStep=Math.min(5,(S.tutorialStep||0)+1);
  showTutorial();
}

let craftUseSlime=false;
function startCraftGame(k,useSlime=false){
  if($('craftGame').classList.contains('show'))return;
  if(outputGroupCount(k)>=S.outputCap)return toast(recipes[k].name+' shared output table is full!');
  if(!canCraft(k))return toast('Missing raw materials • Visit the Material Yard!');
  craftKey=k;craftUseSlime=useSlime;craftAnim=0;
  $('craftTitle').textContent='CRAFTING • '+(useSlime?'SLIME EDGE':recipes[k].name.toUpperCase());
  $('craftGame').classList.add('show');
  playing=false;
  let start=performance.now();
  function anim(t){
    if(!$('craftGame').classList.contains('show'))return;
    craftAnim=(Math.sin((t-start)/460)+1)/2;
    $('craftMarker').style.left=(craftAnim*96)+'%';
    requestAnimationFrame(anim);
  }
  requestAnimationFrame(anim);
}
function finishCraft(){
  let perfect=craftAnim>.42&&craftAnim<.58;
  S.nextCraftBonus=perfect?.22:.04;
  $('craftGame').classList.remove('show');
  playing=true;
  if(craft(craftKey,null,craftUseSlime)){
    goalProgress('craft',1);
    if(perfect)toast('PERFECT HAMMER! Quality boosted!');
    if(S.tutorialStep===1)advanceTutorial();
  }
}

function exitSlots(){
  playing=false;
  $('app').classList.add('hidden');
  $('panel').classList.remove('show');
  $('slotScreen').classList.add('show');
  renderSlots();
}

$('zoomIn').onclick=()=>setZoom(zoom+.1);
$('zoomOut').onclick=()=>setZoom(zoom-.1);
$('overview').onclick=()=>setZoom(.46);
$('suggest').onclick=()=>{
  let r=recommendation();
  toast(r.t);
  if(r.page)openPage(r.page);
  else{target={x:r.x,y:r.y};player.navPath=null}
};
$('tutorialSkip').onclick=()=>{S.tutorialStep=5;$('tutorial').classList.remove('show')};
$('summaryNext').onclick=()=>{
  $('daySummary').classList.remove('show');
  createDayContent();playing=true;
  save('Day '+S.day+' started');
};
$('craftTap').onclick=finishCraft;
function handleMenuPage(ev){
  const b=ev.target.closest?.('[data-page]');
  if(!b)return;
  ev.preventDefault();ev.stopPropagation();
  openPage(b.dataset.page);
}
$('mainMenu').addEventListener('click',handleMenuPage);
$('bagToggle').onclick=toggleBag;
$('closePanel').onclick=()=>$('panel').classList.remove('show');

function refreshMenus(){
 const rules={employees:featureUnlocked('employees'),wholesale:featureUnlocked('wholesale'),skills:featureUnlocked('skills'),expedition:featureUnlocked('expedition')};
 document.querySelectorAll('#mainMenu [data-page]').forEach(b=>{const p=b.dataset.page;if(p in rules)b.classList.toggle('lockedFeature',!rules[p])});
}
function toggleBag(){S.bagOpen=!S.bagOpen;$('bagPanel').classList.toggle('show',S.bagOpen);renderBag()}
function renderBag(){if(!$('bagPanel'))return;const parts=`💧 Gel <b>${S.gel||0}</b><br>🦷 Fang <b>${S.fang||0}</b><br>🟫 Hide <b>${S.hide||0}</b><br>💎 Crystal <b>${S.crystal||0}</b><br>🔥 Ember <b>${S.ember||0}</b><br>🦴 Bone <b>${S.bone||0}</b>`;$('bagPanel').innerHTML=`<div class="bagTabs"><button data-bag="raw">RAW</button><button data-bag="parts">PARTS</button></div><div class="bagBody">${S.bagTab==='parts'?parts:`🪨 Iron <b>${S.iron}</b><br>🪵 Wood <b>${S.wood}</b><br>🌿 Herb <b>${S.herb}</b>`}</div>`;document.querySelectorAll('[data-bag]').forEach(b=>b.onclick=()=>{S.bagTab=b.dataset.bag;renderBag()})}
function loop(t){
  let dt=Math.min(.035,(t-last)/1000);
  last=t;
  if(playing){
    refreshMenus();
    update(dt);
    draw();
    $('cash').textContent='$'+S.cash;
    $('rep').textContent='REP '+S.rep;
    $('day').textContent='DAY '+S.day;
    $('clock').textContent=Math.max(0,Math.ceil(120-dayTime))+'s';
    $('heroHud').textContent=`${S.equipped.weapon.icon}${S.equipped.weapon.stat} ${S.equipped.armor.icon}${S.equipped.armor.stat}`;
    $('carryHud').textContent=`🤲 ${player.carryKey?recipes[player.carryKey].icon+' '+player.carryCount+'/'+player.carryCap:'Empty (0/'+player.carryCap+')'} | 🪙 $${S.coinsFloor} | 🪨${S.iron} 🪵${S.wood} 🌿${S.herb} 💧${S.gel}`;
    let rec=recommendation();
    $('suggest').textContent='💡 '+rec.t;
  }
  requestAnimationFrame(loop);
}
renderSlots();
requestAnimationFrame(loop);