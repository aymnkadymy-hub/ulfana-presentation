(() => {
'use strict';
const $=s=>document.querySelector(s),slides=[...document.querySelectorAll('.slide')],dialogs=[...document.querySelectorAll('dialog')];
let current=0,returnFocus=null;
function closeDialog(d){d.close();if(returnFocus?.isConnected)returnFocus.focus();}
function showDialog(d){returnFocus=document.activeElement;d.showModal();}
function go(n,hash=true){
 current=Math.max(0,Math.min(slides.length-1,n));
 slides.forEach((s,i)=>{s.hidden=i!==current;s.classList.toggle('active',i===current);if(i===current)s.scrollTop=0;});
 $('#previous').disabled=current===0;$('#next').disabled=current===slides.length-1;
 $('#position').textContent=`${String(current+1).padStart(2,'0')} / ${slides.length}`;
 $('#position').setAttribute('aria-label',`الشريحة ${current+1} من ${slides.length}: ${slides[current].dataset.title}`);
 $('#progress i').style.width=`${(current+1)/slides.length*100}%`;$('#chapter').textContent=slides[current].dataset.chapter;
 document.querySelectorAll('#slide-index button').forEach((b,i)=>b.setAttribute('aria-current',String(i===current)));
 document.title=`أولفانا — ${slides[current].dataset.title}`;
 if(hash)history.replaceState(null,'',`#${slides[current].id}`);
}
function fromHash(){const aliases={'your-choice':'your-choices','closer-to-knowledge':'retrieval-results','your-companion':'think-different','one-ulfana':'the-student-first','your-people':'think-different','built-around-you':'think-different','behind-the-experience':'knowledge-from-sources'};const id=location.hash.slice(1),n=slides.findIndex(s=>s.id===(aliases[id]||id));go(n<0?0:n,false);}
$('#slide-index').replaceChildren(...slides.map((s,i)=>{const b=document.createElement('button'),num=document.createElement('span');num.textContent=String(i+1).padStart(2,'0');b.append(num,document.createTextNode(s.dataset.title));b.onclick=()=>{closeDialog($('#index-dialog'));go(i);$('#deck').focus();};return b;}));
$('#next').onclick=()=>go(current+1);$('#previous').onclick=()=>go(current-1);
document.querySelectorAll('[data-next]').forEach(b=>b.onclick=()=>go(current+1));document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(Number(b.dataset.go)));
$('#overview').onclick=()=>showDialog($('#index-dialog'));
document.querySelectorAll('[data-evidence]').forEach(b=>b.onclick=()=>showDialog($('#evidence-dialog')));
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeDialog(b.closest('dialog')));
dialogs.forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d);}});d.addEventListener('cancel',()=>{if(returnFocus?.isConnected)returnFocus.focus();});});
window.addEventListener('hashchange',fromHash);
document.addEventListener('keydown',e=>{if(dialogs.some(d=>d.open)||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable=true]'))return;const interactive=e.target.closest('button,a,summary');if(e.key==='ArrowLeft'||e.key==='PageDown'||(e.key===' '&&!interactive)){e.preventDefault();go(current+1);}if(e.key==='ArrowRight'||e.key==='PageUp'){e.preventDefault();go(current-1);}if(e.key==='Home'){e.preventDefault();go(0);}if(e.key==='End'){e.preventDefault();go(slides.length-1);}if(e.key.toLowerCase()==='f'&&!interactive)$('#fullscreen').click();});
let touch=null;$('#deck').addEventListener('touchstart',e=>{if(e.target.closest('button,a,input,.live-companion'))return;const t=e.touches[0];touch={x:t.clientX,y:t.clientY};},{passive:true});$('#deck').addEventListener('touchend',e=>{if(!touch)return;const t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.6)go(current+(dx>0?1:-1));touch=null;},{passive:true});
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();}catch{$('#fullscreen').title='ملء الشاشة غير متاح في هذا المتصفح';}};if(!document.fullscreenEnabled)$('#fullscreen').hidden=true;
function motion(v){document.documentElement.classList.toggle('reduce',v);$('#motion').setAttribute('aria-pressed',String(v));$('#motion').setAttribute('aria-label',v?'تشغيل الحركة':'إيقاف الحركة');$('#motion').title=v?'تشغيل الحركة':'إيقاف الحركة';}motion(matchMedia('(prefers-reduced-motion: reduce)').matches);$('#motion').onclick=()=>motion(!document.documentElement.classList.contains('reduce'));
document.querySelectorAll('[data-companion]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-companion]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('#companion-main').src=`assets/companions/${b.dataset.companion}.svg`;$('#companion-main').alt=b.dataset.name;$('#companion-name').textContent=b.dataset.name;});
document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true')));
document.querySelectorAll('[data-image]').forEach(b=>b.onclick=()=>{$('#zoomed-image').src=b.dataset.image;$('#zoomed-image').alt=b.dataset.imageTitle;$('#image-title').textContent=b.dataset.imageTitle;showDialog($('#image-dialog'));});
document.documentElement.classList.add('js');fromHash();
})();
