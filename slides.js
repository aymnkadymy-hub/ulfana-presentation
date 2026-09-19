(() => {
'use strict';
const $ = s => document.querySelector(s);
const slides = [...document.querySelectorAll('.slide')];
const dialogs = [...document.querySelectorAll('dialog')];
let current = 0, returnFocus = null, focusInterval = null, timerSeconds = 1500;
const titles = slides.map(s => s.dataset.title);
function closeDialog(d) { d.close(); if (returnFocus?.isConnected) returnFocus.focus(); }
function showDialog(d) { returnFocus = document.activeElement; d.showModal(); }
function stopTimer() { clearInterval(focusInterval); focusInterval = null; $('#focus-demo').classList.remove('running'); $('#focus-demo').setAttribute('aria-pressed','false'); $('#focus-demo small').textContent = 'جرّب الحركة'; }
function go(n, hash = true) {
 current = Math.max(0, Math.min(slides.length - 1, n));
 if (current !== 5) stopTimer();
 slides.forEach((s,i) => { s.hidden = i !== current; s.classList.toggle('active', i === current); if (i === current) s.scrollTop = 0; });
 $('#previous').disabled = current === 0; $('#next').disabled = current === slides.length - 1;
 $('#position').textContent = `${String(current+1).padStart(2,'0')} / ${slides.length}`;
 $('#position').setAttribute('aria-label',`الشريحة ${current+1} من ${slides.length}: ${titles[current]}`);
 $('#progress i').style.width = `${(current+1)/slides.length*100}%`;
 $('#chapter').textContent = slides[current].dataset.chapter;
 document.querySelectorAll('#slide-index button').forEach((b,i) => b.setAttribute('aria-current',String(i === current)));
 document.title = `أولفانا — ${titles[current]}`;
 if (hash) history.replaceState(null,'',`#${slides[current].id}`);
}
function fromHash() { const n = slides.findIndex(s => `#${s.id}` === location.hash); go(n < 0 ? 0 : n, false); }
$('#slide-index').replaceChildren(...slides.map((s,i) => { const b=document.createElement('button'); const n=document.createElement('span'); n.textContent=String(i+1).padStart(2,'0');b.append(n,document.createTextNode(s.dataset.title));b.onclick=()=>{closeDialog($('#index-dialog'));go(i);$('#deck').focus();};return b; }));
$('#next').onclick=()=>go(current+1); $('#previous').onclick=()=>go(current-1);
document.querySelectorAll('[data-next]').forEach(b=>b.onclick=()=>go(current+1));
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(Number(b.dataset.go)));
$('#overview').onclick=()=>showDialog($('#index-dialog'));
document.querySelectorAll('[data-evidence]').forEach(b=>b.onclick=async()=>{showDialog($('#evidence-dialog'));await loadEvidence();if(b.classList.contains('example-link'))$('#semantic-evidence').scrollIntoView({block:'start'});});
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeDialog(b.closest('dialog')));
dialogs.forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d);}});d.addEventListener('cancel',()=>{if(returnFocus?.isConnected)returnFocus.focus();});});
window.addEventListener('hashchange',fromHash);
document.addEventListener('keydown',e=>{
 if(dialogs.some(d=>d.open)||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable=true]'))return;
 const interactive = e.target.closest('button,a,summary');
 if(e.key==='ArrowLeft'||e.key==='PageDown'||(e.key===' '&&!interactive)){e.preventDefault();go(current+1);}
 if(e.key==='ArrowRight'||e.key==='PageUp'){e.preventDefault();go(current-1);}
 if(e.key==='Home'){e.preventDefault();go(0);} if(e.key==='End'){e.preventDefault();go(slides.length-1);}
 if(e.key.toLowerCase()==='f'&&!interactive)$('#fullscreen').click();
});
let touch = null;
$('#deck').addEventListener('touchstart',e=>{if(e.target.closest('button,a,input'))return; const t=e.touches[0];touch={x:t.clientX,y:t.clientY};},{passive:true});
$('#deck').addEventListener('touchend',e=>{if(!touch)return;const t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.6)go(current+(dx>0?1:-1));touch=null;},{passive:true});
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();}catch{ $('#fullscreen').title='ملء الشاشة غير متاح في هذا المتصفح'; }};
if(!document.fullscreenEnabled)$('#fullscreen').hidden=true;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function motion(v){document.documentElement.classList.toggle('reduce',v);$('#motion').setAttribute('aria-pressed',String(v));$('#motion').setAttribute('aria-label',v?'تشغيل الحركة':'إيقاف الحركة');$('#motion').title=v?'تشغيل الحركة':'إيقاف الحركة';}
motion(reduced);$('#motion').onclick=()=>motion(!document.documentElement.classList.contains('reduce'));
let feed='you',personalized=true;
function paintFeed(){document.querySelectorAll('[data-feed]').forEach(b=>{const on=b.dataset.feed===feed;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});$('#feed-source').textContent=feed==='following'?'من الحسابات التي تتابعها':'من مجتمع تخصّصك';$('#feed-title').textContent=feed==='following'?'حديث من اخترت متابعتهم.':'فكرة تستحق أن تصل إليك.';$('#feed-reason').textContent=feed==='following'?'لأنك اخترت متابعة صاحب المنشور':personalized?'لأنها قريبة من اهتمامك':'ترتيب قياسي، باختيارك';}
document.querySelectorAll('[data-feed]').forEach(b=>b.onclick=()=>{feed=b.dataset.feed;paintFeed();});
$('#personalize').onclick=()=>{personalized=!personalized;$('#personalize').setAttribute('aria-checked',String(personalized));paintFeed();};
$('#focus-demo').onclick=()=>{if(focusInterval){stopTimer();return;}$('#focus-demo').classList.add('running');$('#focus-demo').setAttribute('aria-pressed','true');$('#focus-demo small').textContent='إيقاف المثال';focusInterval=setInterval(()=>{timerSeconds=Math.max(0,timerSeconds-1);$('#focus-demo span').textContent=`${String(Math.floor(timerSeconds/60)).padStart(2,'0')}:${String(timerSeconds%60).padStart(2,'0')}`;if(!timerSeconds)stopTimer();},1000);};
let flipped=false;$('#flip-card').onclick=()=>{flipped=!flipped;$('#flip-card').replaceChildren(document.createTextNode(flipped?'حوّل الفهم إلى عادة.':'ما الذي أتقنته اليوم؟'));const s=document.createElement('span');s.textContent=flipped?'اضغط للعودة ↶':'اضغط لتقلب البطاقة ↶';$('#flip-card').append(s);};
document.querySelectorAll('[data-companion]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-companion]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('#companion-main').src=`assets/companions/${b.dataset.companion}.svg`;$('#companion-main').alt=b.dataset.name;$('#companion-name').textContent=b.dataset.name;});
let evidenceLoaded=false;
async function loadEvidence(){if(evidenceLoaded)return;
 const results=await Promise.allSettled([fetch('data/expanded-benchmark.json').then(r=>{if(!r.ok)throw Error();return r.json();}),fetch('data/historical-benchmarks.json').then(r=>{if(!r.ok)throw Error();return r.json();}),fetch('data/semantic-review.json').then(r=>{if(!r.ok)throw Error();return r.json();})]);
 const [expanded,historic,semantic]=results;
 if(expanded.status==='fulfilled'){
  const d=expanded.value, box=$('#expanded-results');box.replaceChildren();
  const p=document.createElement('p');p.textContent=d.description;box.append(p);
  const table=document.createElement('table');table.className='result-table';table.innerHTML='<thead><tr><th>المجموعة</th><th>Gemma 3 4B وحده</th><th>مع المكتبة</th></tr></thead>';const tbody=document.createElement('tbody');
  for(const g of d.groups){const tr=document.createElement('tr');for(const txt of [g.label,`${g.alone.correct} / ${g.total}`,`${g.rag.correct} / ${g.total}`]){const td=document.createElement('td');td.textContent=txt;tr.append(td);}tbody.append(tr);}table.append(tbody);box.append(table);
  for(const text of d.notes){const p=document.createElement('p');p.textContent=text;box.append(p);}
 }else{$('#expanded-results').textContent='تعذّر تحميل النتائج. يمكنك فتح ملف النتائج عبر الرابط أدناه.';}
 if(historic.status==='fulfilled'){
  const d=historic.value['model_bakeoff_frozen.json'];const names={'qwen2.5:7b':'Qwen 2.5 7B','Fanar-1-9B-Instruct-GGUF:Q4_K_M':'Fanar 9B','ALLaM-AI_ALLaM-7B-Instruct-preview':'ALLaM 7B','command-r7b-arabic:7b':'Command R7B','qwen2.5:3b':'Qwen 2.5 3B','gemma3:4b':'Gemma 3 4B'};
  $('#historic-models').replaceChildren();
  for(const [id,v]of Object.entries(d.models)){const row=document.createElement('div');row.className='mini-model';const label=document.createElement('span');label.textContent=names[id]||id;const bar=document.createElement('i');bar.style.width=`${v.hit/v.of*45}%`;const count=document.createElement('b');count.textContent=`${v.hit}/${v.of}`;row.append(label,bar,count);$('#historic-models').append(row);}
 }
 if(semantic.status==='fulfilled'){
  const d=semantic.value,box=$('#semantic-results');box.replaceChildren();
  const fig=document.createElement('figure');fig.className='quality-chart';
  const cap=document.createElement('figcaption');cap.textContent='جواب مكتمل وشرح سليم وفق المصدر';fig.append(cap);
  for(const [arm,label]of [['alone','Gemma وحده'],['rag','مع أولفانا']]){
   const n=d.base_answer_quality[arm].complete,total=d.base_answer_quality.total;
   const row=document.createElement('div');row.className='quality-row';
   const name=document.createElement('span');name.textContent=label;
   const track=document.createElement('div');track.className='quality-track';const bar=document.createElement('i');bar.style.width=`${n/total*100}%`;track.append(bar);
   const count=document.createElement('b');count.textContent=`${n}/${total}`;row.append(name,track,count);fig.append(row);
  }
  const note=document.createElement('small');note.textContent='الأسئلة الأصلية للملفين · 125 سؤالًا بعد استبعاد 5 أسئلة ملتبسة من الطرفين · المحور 0–100% · أولفانا تشمل الكتب والويب';fig.append(note);box.append(fig);
  const c=d.conversation,p=document.createElement('p');p.textContent=`في المحادثات المفتوحة: ${c.alone.complete} من 24 جوابًا مكتملًا للنموذج وحده، و${c.rag.complete} مع أولفانا. المراجعة تشمل المعنى والشرح، وليست مجرد مطابقة كلمات أو أرقام صفحات.`;box.append(p);
  const table=document.createElement('table');table.className='result-table semantic-table';table.innerHTML='<thead><tr><th>المجموعة</th><th>وحده</th><th>أولفانا</th></tr></thead>';const body=document.createElement('tbody');
  for(const g of d.groups){const tr=document.createElement('tr');for(const value of [g.label,`${g.alone.complete}/${g.eligible}`,`${g.rag.complete}/${g.eligible}`]){const td=document.createElement('td');td.textContent=value;tr.append(td);}body.append(tr);}table.append(body);box.append(table);
  const limits=document.createElement('p');limits.className='review-note';limits.textContent='مراجعة مباشرة أجراها المساعد، غير معماة، بنموذج واحد. أسئلة إعادة الصياغة ورسائل المتابعة ليست عينات مستقلة. إسناد الجواب للمصدر يُراجع منفصلًا عن صحة معناه. لا تعزل هذه المقارنة أثر RAG وحده.';box.append(limits);
 }else{$('#semantic-results').textContent='يمكنك تنزيل المراجعة من الرابط أدناه.';}
 evidenceLoaded=expanded.status==='fulfilled'&&historic.status==='fulfilled'&&semantic.status==='fulfilled';
}
document.documentElement.classList.add('js');fromHash();
})();
