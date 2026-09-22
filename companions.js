/* Ulfana's original gaze equations and drawing animations, adapted to slide-local instances. */
(() => {
'use strict';
const traits={aram:{gaze:5.2,reach:160,lean:4.5},thaloobi:{gaze:6.6,reach:210,lean:6.8},mijo:{gaze:4.2,reach:140,lean:3.2},addoun:{gaze:5.8,reach:185,lean:5.4},ozis:{gaze:2.6,reach:178,lean:7.6}};
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),root=document.documentElement,cache=new Map(),instances=[];
let frame=0,held=-1,returnTimer=0,serial=0,printing=false;
const disabled=()=>printing||document.hidden||reduced.matches||root.classList.contains('reduce');
const visible=s=>!disabled()&&s.host.closest('.slide')?.classList.contains('active')&&!document.querySelector('dialog[open]');
function reset(s){s.want={x:0,y:0,r:0};s.cur={x:0,y:0,r:0};s.eyes?.removeAttribute('transform');s.fig?.style.removeProperty('--cp-lean');clearTimeout(s.winkTimer);clearTimeout(s.pokeTimer);s.state?.classList.remove('cp-wink','cp-poke');}
function schedule(){if(!frame)frame=requestAnimationFrame(apply);}
function apply(){
 frame=0;let moving=false;
 for(const s of instances){if(!visible(s)||!s.eyes)continue;
  s.cur.x+=(s.want.x-s.cur.x)*.35;s.cur.y+=(s.want.y-s.cur.y)*.35;s.cur.r+=(s.want.r-s.cur.r)*.18;
  s.eyes.setAttribute('transform',`translate(${s.cur.x.toFixed(2)} ${s.cur.y.toFixed(2)})`);s.fig.style.setProperty('--cp-lean',`${s.cur.r.toFixed(2)}deg`);
  if(['x','y','r'].some(k=>Math.abs(s.want[k]-s.cur[k])>.02))moving=true;
 }
 if(moving)schedule();
}
function center(){for(const s of instances)s.want={x:0,y:0,r:0};schedule();}
function measure(s){const r=s.host.getBoundingClientRect();s.rect={cx:r.left+r.width/2,cy:r.top+r.height*.5,w:r.width||1,left:r.left,right:r.right,top:r.top,bottom:r.bottom};}
function lookAt(x,y){for(const s of instances){if(!visible(s)||!s.eyes)continue;const r=s.rect,t=traits[s.id],dx=x-r.cx,dy=y-r.cy,m=Math.hypot(dx,dy)||1,reach=Math.min(1,m/t.reach),k=reach*t.gaze;s.want={x:dx/m*k,y:dy/m*k*.8,r:dx/m*reach*t.lean};}if(!disabled())schedule();}
function wink(s,poke=false){if(!visible(s)||!s.state)return;s.state.classList.remove('cp-wink');if(poke)s.state.classList.remove('cp-poke');void s.state.offsetWidth;s.state.classList.add('cp-wink');clearTimeout(s.winkTimer);s.winkTimer=setTimeout(()=>s.state?.classList.remove('cp-wink'),200);if(poke){s.state.classList.add('cp-poke');clearTimeout(s.pokeTimer);s.pokeTimer=setTimeout(()=>s.state?.classList.remove('cp-poke'),620);}}
async function mount(s){
 const match=s.img.getAttribute('src')?.match(/\/([a-z]+)\.svg/);if(!match||!traits[match[1]])return;
 const id=match[1],ticket=++s.ticket;if(s.id!==id){reset(s);s.state?.remove();s.state=null;s.eyes=null;s.host.classList.remove('live-ready');}s.id=id;s.host.setAttribute('aria-label',`${s.img.alt} — المس أو اضغط ليتفاعل`);
 if(!cache.has(id))cache.set(id,fetch(`assets/companions/${id}-live.svg?v=phone-v2`).then(r=>{if(!r.ok)throw Error('Companion unavailable');return r.text();}).catch(e=>{cache.delete(id);throw e;}));
 try{
  const source=await cache.get(id);if(ticket!==s.ticket)return;
  const doc=new DOMParser().parseFromString(source,'image/svg+xml'),svg=doc.documentElement;
  if(svg.localName!=='svg'||svg.querySelector('parsererror,script,foreignObject')||!svg.querySelector('.np-eyes'))throw Error('Invalid companion art');
  // Separate fragment identifiers when the same companion appears on multiple slides.
  const unique=`ulfana-live-${++serial}-`,ids=new Map();svg.querySelectorAll('[id]').forEach(e=>{const old=e.id;ids.set(old,unique+old);e.id=unique+old;});
  for(const e of [svg,...svg.querySelectorAll('*')])for(const a of [...e.attributes]){let value=a.value;for(const [old,next]of ids)value=value.replaceAll(`url(#${old})`,`url(#${next})`).replaceAll(`url("#${old}")`,`url("#${next}")`);if(value.startsWith('#')&&ids.has(value.slice(1)))value='#'+ids.get(value.slice(1));if(value!==a.value)e.setAttribute(a.name,value);}
  svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
  const state=document.createElement('span');state.className='live-state';const fig=document.createElement('span');fig.className='cp-fig';const skin=document.createElement('span');skin.className=`cp-ch cp-ch-${id}`;skin.append(document.importNode(svg,true));fig.append(skin);state.append(fig);
  reset(s);s.state?.remove();s.host.append(state);s.state=state;s.fig=fig;s.eyes=state.querySelector('.np-eyes');s.host.classList.add('live-ready');s.host.dataset.character=id;sync();
 }catch{/* The original static illustration stays visible if animation cannot load. */}
}
function sync(){
 if(frame){cancelAnimationFrame(frame);frame=0;}
 for(const s of instances){const active=visible(s);s.host.dataset.motion=active?'on':'off';if(!active)reset(s);else measure(s);}
}
for(const img of document.querySelectorAll('.student-center>img,.individual-row>div>img,#companion-main')){
 const host=document.createElement('span');host.className='live-companion';host.tabIndex=0;host.setAttribute('role','button');host.title='المس الرفيق ليتفاعل';img.before(host);host.append(img);
 const s={host,img,id:'aram',ticket:0,want:{x:0,y:0,r:0},cur:{x:0,y:0,r:0}};instances.push(s);
 host.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();wink(s,true);}});
 new MutationObserver(()=>mount(s)).observe(img,{attributes:true,attributeFilter:['src','alt']});mount(s);
}
// Observe navigation and motion controls, not per-frame SVG/style mutations.
const observer=new MutationObserver(sync);observer.observe(root,{attributes:true,attributeFilter:['class']});document.querySelectorAll('.slide').forEach(e=>observer.observe(e,{attributes:true,attributeFilter:['class']}));document.querySelectorAll('dialog').forEach(e=>observer.observe(e,{attributes:true,attributeFilter:['open']}));
window.addEventListener('pointerdown',e=>{if(e.isPrimary===false||disabled())return;held=e.pointerId;clearTimeout(returnTimer);lookAt(e.clientX,e.clientY);for(const s of instances)if(visible(s)){const r=s.rect;wink(s,e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom);}},{passive:true});
window.addEventListener('pointermove',e=>{if(e.isPrimary===false||(e.pointerType==='touch'&&e.pointerId!==held))return;lookAt(e.clientX,e.clientY);},{passive:true});
function release(e){if(e.pointerId!==held)return;held=-1;clearTimeout(returnTimer);returnTimer=setTimeout(center,1600);}
window.addEventListener('pointerup',release,{passive:true});window.addEventListener('pointercancel',release,{passive:true});window.addEventListener('pointerleave',center,{passive:true});window.addEventListener('blur',center);
/* A phone has no hover, so lookAt only ran while a finger was held down and
   the companion read as a still picture. A slow idle glance gives it life on
   touch; disabled() still defers to reduced motion and hidden slides. */
const touchOnly=matchMedia('(hover: none)');
let idleTimer=0;
function idle(){
 clearTimeout(idleTimer);
 idleTimer=setTimeout(()=>{
  if(held<0&&touchOnly.matches&&!disabled()){
   let any=false;
   for(const s of instances){
    if(!visible(s)||!s.eyes)continue;
    const t=traits[s.id],a=Math.random()*Math.PI*2,k=.3+Math.random()*.55;
    s.want={x:Math.cos(a)*t.gaze*k,y:Math.sin(a)*t.gaze*.8*k,r:Math.cos(a)*t.lean*k*.45};
    any=true;
   }
   if(any)schedule();
  }
  idle();
 },1900+Math.random()*1500);
}
idle();
window.addEventListener('resize',sync,{passive:true});document.querySelector('#deck').addEventListener('scroll',sync,{passive:true,capture:true});document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
window.addEventListener('beforeprint',()=>{printing=true;sync();});window.addEventListener('afterprint',()=>{printing=false;sync();});
new ResizeObserver(sync).observe(document.querySelector('#deck'));sync();
})();
