(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const fmt = new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 1 });
  const pct = (n, d) => d && n !== null && n !== undefined ? `${fmt.format(n / d * 100)}٪` : 'غير مقاس';
  const safe = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const count = (n, d) => `${fmt.format(n)} من ${fmt.format(d)}`;
  const metricLabels = {
    correctness: { label: 'اكتمال وصحة الإجابة وفق المرجع', numerator: 'correct', denominator: 'total', detail: 'إجابات استوفت جميع العناصر المرجعية المطلوبة؛ الإجابات الجزئية لا تدخل في نسبة النجاح الكامل، ولا تصادق النسبة على كل عبارة زائدة.' },
    abstention: { label: 'الامتناع عند غياب الدليل', numerator: 'abstained_correctly', denominator: 'abstention_total', detail: 'أسئلة غير قابلة للإجابة اعترف فيها النموذج بعدم كفاية المعلومات.' },
    citations: { label: 'الإجابة الصحيحة المسندة', numerator: 'grounded_citations', denominator: 'citation_total', detail: 'إجابات مكتملة يدعمها مصدر وصفحة صحيحان دون إحالة إضافية خاطئة؛ مقياس على مستوى الإجابة.' }
  };
  async function renderEvaluation() {
    const el = $('#evaluation-content');
    if (!el) return;
    try {
      const response = await fetch('data/evaluation.json');
      if (!response.ok) throw Error('data');
      const d = await response.json();
      if (d.status !== 'complete') {
        el.innerHTML = '<p class="evidence-note">القياس لم يكتمل بعد. ستظهر النتائج بعد مراجعة الإجابات.</p>';
        return;
      }
      const a = d.arms.alone, r = d.arms.rag;
      el.innerHTML = `<div class="evidence-meta"><span class="evidence-badge">قياس فعلي · تجربة استطلاعية</span><span dir="ltr">${safe(d.model.display_name || d.model.name)} · ${safe(d.date)}</span></div>
        <div class="evidence-sample"><strong>${fmt.format(d.sample.paired_questions)}</strong><p>سؤالًا في الحالتين<span>${fmt.format(d.sample.answerable)} لها مرجع للإجابة · ${fmt.format(d.sample.unanswerable)} لا يتيح المصدر جوابها</span></p><span class="sample-divider"></span><p>النموذج نفسه. الأسئلة نفسها.<span>الفرق: وصوله إلى مقاطع المكتبة.</span></p></div>
        <div class="evidence-controls" role="group" aria-label="اختر مقياس المقارنة">${Object.entries(metricLabels).map(([id,m],i)=>`<button type="button" data-measure="${id}" aria-pressed="${i===0}">${m.label}</button>`).join('')}</div>
        <div id="comparison-chart" class="comparison-chart" aria-live="polite"></div>
        <div class="latency-strip"><div><span>زمن التنفيذ الوسيط · النموذج وحده</span><strong>${a.median_seconds == null ? 'غير مقاس' : fmt.format(a.median_seconds)+' ث'}</strong></div><div><span>زمن الاسترجاع والتوليد الوسيط</span><strong>${r.median_seconds == null ? 'غير مقاس' : fmt.format(r.median_seconds)+' ث'}</strong></div><p>زمن كل حالة على جهاز التجربة؛ يتضمن الاسترجاع في حالة المكتبة، ولا يقيس مسار المنصة الحي كاملًا.</p></div>
        <details class="evidence-method"><summary>كيف قِسنا؟ وما حدود النتيجة؟ <span aria-hidden="true">＋</span></summary><div><p>${safe(d.method)}</p><ul>${(d.limitations||[]).map(x=>`<li>${safe(x)}</li>`).join('')}</ul><p>نتائج الاسترجاع والإجابات التفصيلية المسموح بنشرها في ملفات التقييم.</p><div class="evidence-links"><a href="data/evaluation.json" download>تنزيل النتائج JSON ↗</a><a href="data/methodology.md" target="_blank" rel="noopener">قراءة المنهجية ↗</a></div></div></details>`;
      const after = document.createElement('div');
      after.className = 'evaluation-extra';
      const rt=d.retrieval;
      after.innerHTML = `<div class="retrieval-summary"><div><span>الصفحة المرجعية ضمن أول 8 نتائج</span><strong>${pct(rt.reference_page_at_8,rt.total)}</strong><small>${count(rt.reference_page_at_8,rt.total)} سؤالًا</small></div><div><span>إجابات جزئية · خارج النجاح الكامل</span><strong>${fmt.format(a.partial)} / ${fmt.format(r.partial)}</strong><small>النموذج وحده / مع الاسترجاع</small></div></div><p class="evidence-caution">الامتناع الصحيح لا يكفي وحده: امتنع النموذج عن ${fmt.format(a.incorrect_abstentions)} أسئلة لها جواب، مقابل ${fmt.format(r.incorrect_abstentions)} مع الاسترجاع. هذه عيّنة صغيرة منتقاة، ولا تثبت تفوقًا عامًا.</p>`;
      if(d.live_probe?.status==='complete'){
        const lp=d.live_probe,la=lp.arms.alone,lr=lp.arms.rag;
        after.innerHTML+=`<div class="live-probe"><span class="evidence-badge">اختبار منفصل · داخل المنصة الفعلية</span><h3>ومن المختبر… إلى مسار المكتبة الحي.</h3><p>رفعنا وثيقة اصطناعية أصلية، وسألنا النموذج نفسه ${fmt.format(lp.sample.paired_questions)} أسئلة عن تفاصيلها. ${fmt.format(lp.sample.answerable)} لها جواب، و${fmt.format(lp.sample.unanswerable)} بلا جواب. هذا يفحص الوصول إلى وثيقة جديدة، لا المعرفة العامة. محفزات التطبيق وسياساته تختلف عن الطلب المباشر؛ لذلك لا يعزل هذا الفحص أثر الاسترجاع وحده.</p><div class="live-table-wrap"><table><caption class="sr-only">نتائج فحص الوثيقة الاصطناعية عبر مسار المنصة الحي</caption><thead><tr><th scope="col">المقياس</th><th scope="col">النموذج وحده</th><th scope="col">مع المنصة</th></tr></thead><tbody><tr><th scope="row">إجابات صحيحة كاملة</th><td>${count(la.correct,la.total)}</td><td>${count(lr.correct,lr.total)}</td></tr><tr><th scope="row">صحيحة ومسنَدة إلى المصدر</th><td>${count(la.grounded_citations,la.citation_total)}</td><td>${count(lr.grounded_citations,lr.citation_total)}</td></tr><tr><th scope="row">امتناع عند غياب الجواب</th><td>${count(la.abstained_correctly,la.abstention_total)}</td><td>${count(lr.abstained_correctly,lr.abstention_total)}</td></tr></tbody></table></div><p class="live-findings">ما يحتاج تحسينًا: حالتان نُسبتا خطأً إلى المعرفة العامة، وحالة بحث ويب أعادت معلومة غير مرتبطة بالسؤال. صحة الجواب وصحة إسناده مقياسان مختلفان.</p><details><summary>شاهد مثالًا فعليًا وملفات الاختبار</summary><div class="real-example"><span>من الوثيقة الاصطناعية · الصفحة 2</span><p><b>السؤال:</b> كم نقطة تساوي مهمة Cedar Note وما موعد تسليمها؟</p><p><b>النموذج وحده:</b> أوضح أنه لا يملك معلومات الكتاب.</p><p><b>مع المنصة:</b> 18 نقطة، واليوم السادس الساعة 20:10؛ مع إسناد إلى المصدر. هذا تلخيص للجوابين.</p><a href="data/synthetic-examples.json" target="_blank" rel="noopener">اقرأ أمثلة النجاح والإخفاق الفعلية ↗</a><a href="data/nawar-synthetic-reference.pdf" target="_blank" rel="noopener">افتح وثيقة الاختبار ↗</a></div></details></div>`;
      }
      el.querySelector('.evidence-method').before(after);
      function draw(id) {
        const m=metricLabels[id];
        const rows=[['النموذج وحده',a,'bare'],['مع استرجاع المكتبة',r,'rag']];
        $('#comparison-chart').innerHTML=`<p class="metric-definition">${safe(m.detail)}</p>${rows.map(([label,arm,cls])=>{
          const n=arm[m.numerator],den=arm[m.denominator]; const valid=n!=null&&den>0;
          return `<div class="bar-item ${cls}"><div class="bar-label"><span>${label}</span><strong>${pct(n,den)}</strong></div><div class="bar-track" aria-hidden="true"><span style="--bar-width:${valid?Math.min(100,n/den*100):0}%"></span></div><small>${valid?count(n,den):'غير مقاس في هذه الحالة'}</small></div>`;
        }).join('')}`;
        el.querySelectorAll('[data-measure]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.measure===id)));
      }
      el.querySelectorAll('[data-measure]').forEach(b=>b.addEventListener('click',()=>draw(b.dataset.measure)));
      draw('correctness');
    } catch (_) {
      el.innerHTML='<p class="evidence-note">تعذّر تحميل النتائج. <a href="data/evaluation.json">افتح ملف القياس</a>.</p>';
    }
  }
  async function renderKpis() {
    const el=$('#kpi-content'); if(!el)return;
    try {
      const res=await fetch('data/kpis.json'); if(!res.ok)throw Error('data'); const data=await res.json();
      const groups=[['library','المكتبة وRAG',['library','rag']],['study','أدوات الدراسة',['study']],['community','المجتمع',['community']],['passport','الجواز الأكاديمي',['passport']],['companion','الرفيق',['companion']],['voice','الصوت',['voice']]];
      const north=data.proposed_kpis.find(x=>x.id==='weekly_learning_cycles');
      el.innerHTML=`<div class="north-star"><span class="north-star-icon" aria-hidden="true">✳</span><div><span class="evidence-badge">المؤشر الجامع المقترح</span><h3>${safe(north.label)}</h3><p>${safe(north.definition)}</p></div><span class="baseline-tag">بانتظار خط أساس</span></div><p class="kpi-intro">مؤشرات محددة للتطوير القادم. بيانات الاستخدام المجمّعة غير متصلة بهذا العرض؛ الأرقام المقاسة للنموذج تظهر في المقارنة أعلاه.</p><div class="kpi-controls" role="group" aria-label="مجال مؤشرات الأداء">${groups.map(([id,label],i)=>`<button type="button" data-kpi="${id}" aria-pressed="${i===0}">${label}</button>`).join('')}</div><div class="kpi-grid" id="kpi-grid" aria-live="polite"></div><a class="kpi-download" href="data/kpis.json" download>تنزيل تعريفات المؤشرات والأحداث المطلوبة ↗</a>`;
      function draw(id){
        const g=groups.find(x=>x[0]===id);
        const items=data.proposed_kpis.filter(x=>g[2].includes(x.module));
        const grid=$('#kpi-grid');grid.className='kpi-explorer';
        grid.innerHTML=`<div class="kpi-measure-list" role="group" aria-label="المؤشرات في هذا المجال">${items.map((x,i)=>`<button type="button" data-kpi-measure="${x.id}" aria-pressed="${i===0}"><span>0${i+1}</span>${safe(x.label)}<span aria-hidden="true">←</span></button>`).join('')}</div><div id="kpi-detail" aria-live="polite"></div>`;
        function selectMetric(metricId){
          const x=items.find(x=>x.id===metricId);
          $('#kpi-detail').innerHTML=`<article class="kpi-card"><div class="kpi-card-top"><span>${safe(x.window)}</span><span class="kpi-status">مؤشر مقترح</span></div><h3>${safe(x.label)}</h3><p>${safe(x.definition)}</p><div class="kpi-formula">${x.numerator?`<p><b>البسط</b><span>${safe(x.numerator)}</span></p>`:''}${x.denominator?`<p><b>المقام</b><span>${safe(x.denominator)}</span></p>`:''}</div><p class="kpi-caveat">${safe(x.caveat)}</p><details><summary>ما يلزم لقياسه؟</summary><div><p>${safe(x.availability)}</p></div></details></article>`;
          grid.querySelectorAll('[data-kpi-measure]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kpiMeasure===metricId)));
        }
        grid.querySelectorAll('[data-kpi-measure]').forEach(b=>b.addEventListener('click',()=>selectMetric(b.dataset.kpiMeasure)));
        selectMetric(items[0].id);
        el.querySelectorAll('[data-kpi]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kpi===id)));
      }
      el.querySelectorAll('[data-kpi]').forEach(b=>b.addEventListener('click',()=>draw(b.dataset.kpi)));draw('library');
    }catch(_){el.innerHTML='<p class="evidence-note">تعذّر تحميل لوحة المؤشرات. <a href="data/kpis.json">افتح تعريفاتها</a>.</p>';}
  }
  renderEvaluation(); renderKpis();
})();
