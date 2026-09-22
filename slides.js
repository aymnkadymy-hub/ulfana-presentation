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
document.querySelectorAll('[data-evidence]').forEach(b=>b.onclick=async()=>{showDialog($('#evidence-dialog'));await loadEvidence();if(b.classList.contains('example-link'))$('#semantic-evidence').scrollIntoView({block:'start'});});
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
  const d=semantic.value,t=d.paired_tests,box=$('#semantic-results');box.replaceChildren();
  const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
  // Lead with the finding that survives a paired test, not the bigger-looking one.
  const kpi=el('div','kpi-card');
  kpi.append(el('span','kpi-label','الأجوبة الخاطئة أو الممتنعة — من 125 سؤالًا'));
  const pair=el('div','kpi-pair');
  for(const [arm,label] of [['alone','النموذج وحده'],['rag','مع أولفانا']]){
   const side=el('div','kpi-side'+(arm==='rag'?' kpi-good':''));
   side.append(el('b',null,String(t.wrong_answer[arm])),el('span',null,label));
   pair.append(side);
   if(arm==='alone')pair.append(el('i','kpi-arrow','←'));
  }
  kpi.append(pair);
  kpi.append(el('p','kpi-plain','بعبارة بسيطة: النموذج وحده أخطأ في نحو سؤال من كل أربعة. ومع ملف الطالب نفسه، أخطأ في نحو سؤال من كل تسعة.'));
  kpi.append(el('small','kpi-stat',`فرق حقيقي لا صدفة: تحسّن في ${t.wrong_answer.ulfana_better} سؤالًا وتراجع في ${t.wrong_answer.ulfana_worse}، على الأسئلة نفسها · اختبار McNemar، p=${t.wrong_answer.p_value}`));
  box.append(kpi);
  // Publishing our own null result is what makes the one above credible.
  const nul=el('div','kpi-null');
  nul.append(el('b',null,'وما لم يتحسّن:'));
  nul.append(el('p',null,`اكتمال الجواب وجودة شرحه بقيا كما هما عمليًا: ${t.complete_answer.alone} مقابل ${t.complete_answer.rag} من ${t.complete_answer.n}. الفرق داخل حدود الصدفة (p=${t.complete_answer.p_value})، فلا ندّعي تحسّنًا فيه.`));
  nul.append(el('p',null,`وفي المحادثات المترابطة: ${t.conversations.alone} مقابل ${t.conversations.rag} من ${t.conversations.n} — عيّنة أصغر من أن تحسم اتجاهًا (p=${t.conversations.p_value}).`));
  box.append(nul);
  const table=el('table','result-table semantic-table');
  table.innerHTML='<thead><tr><th>المجموعة</th><th>وحده</th><th>أولفانا</th><th>الدلالة</th></tr></thead>';
  const body=el('tbody');
  for(const g of d.groups){
   const k=t.by_group[g.id],tr=el('tr');
   for(const v of [g.label,`${g.alone.complete}/${g.eligible}`,`${g.rag.complete}/${g.eligible}`,
                   k?(k.p_value<0.05?`p=${k.p_value}`:'بلا فرق دالّ'):'—'])tr.append(el('td',null,v));
   body.append(tr);
  }
  table.append(body);box.append(el('p','table-cap','اكتمال الجواب لكل مجموعة. لا مجموعة منها تُظهر فرقًا دالًّا في أي اتجاه — بما فيها المجموعتان اللتان يبدو فيها النموذج وحده أعلى.'));box.append(table);
  box.append(el('p','review-note','مراجعة مباشرة أجراها المساعد، غير معماة، بنموذج واحد محليًا. أسئلة إعادة الصياغة ورسائل المتابعة ليست عينات مستقلة. إسناد الجواب للمصدر يُراجع منفصلًا عن صحة معناه. المقارنة للنظام الكامل ولا تعزل أثر الاسترجاع وحده.'));
 }else{$('#semantic-results').textContent='يمكنك تنزيل المراجعة من الرابط أدناه.';}
 evidenceLoaded=expanded.status==='fulfilled'&&historic.status==='fulfilled'&&semantic.status==='fulfilled';
}
document.documentElement.classList.add('js');fromHash();
})();
