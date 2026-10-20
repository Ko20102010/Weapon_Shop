'use strict';
(() => {
  const params=new URLSearchParams(location.search);
  let enabled=params.get('debug')==='collision';
  let model=null;
  const overlay=document.createElement('canvas');
  overlay.id='debugOverlay'; overlay.setAttribute('aria-hidden','true');
  Object.assign(overlay.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'7',display:enabled?'block':'none'});
  const legend=document.createElement('div'); legend.id='debugLegend'; legend.textContent='DEBUG: red blocked • yellow doors • blue zones • purple targets';
  Object.assign(legend.style,{position:'fixed',top:'86px',left:'6px',zIndex:'12',padding:'5px 7px',background:'#111d',color:'#fff',font:'10px sans-serif',border:'1px solid #fff6',borderRadius:'6px',pointerEvents:'none',display:enabled?'block':'none'});
  document.addEventListener('DOMContentLoaded',()=>{document.body.append(overlay,legend)});
  fetch('data/map_model.json').then(r=>{if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json()}).then(x=>model=x).catch(e=>console.warn('Debug map inventory unavailable',e));
  addEventListener('keydown',e=>{if(e.key==='F2'){enabled=!enabled;overlay.style.display=enabled?'block':'none';legend.style.display=enabled?'block':'none'}});
  function rect(ctx,o,colour,cam,z){ctx.strokeStyle=colour;ctx.lineWidth=2;ctx.strokeRect((o.x-cam.x)*z,(o.y-cam.y)*z,o.w*z,o.h*z)}
  function frame(){
    if(enabled&&model&&window.__WSE_DEBUG__){
      const d=window.__WSE_DEBUG__,view=d.getView();
      const ratio=devicePixelRatio||1; overlay.width=innerWidth*ratio;overlay.height=innerHeight*ratio;
      const ctx=overlay.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,innerWidth,innerHeight);
      for(const x of model.walls)rect(ctx,x,'#ff3b30',view.cam,view.zoom);
      for(const x of model.doorways)rect(ctx,x,'#ffd60a',view.cam,view.zoom);
      for(const x of model.interactionZones)rect(ctx,x,'#0a84ff',view.cam,view.zoom);
      ctx.fillStyle='#bf5af2';for(const p of [...model.spawnPoints,...model.navigationTargets]){ctx.beginPath();ctx.arc((p.x-view.cam.x)*view.zoom,(p.y-view.cam.y)*view.zoom,4,0,Math.PI*2);ctx.fill()}
      const path=d.getPlayerPath();if(path?.length){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();path.forEach((p,i)=>{const x=(p.x-view.cam.x)*view.zoom,y=(p.y-view.cam.y)*view.zoom;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()}
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
