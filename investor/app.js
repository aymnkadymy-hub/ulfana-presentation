const galleryData={library:{image:'../screens/manuscript/01_speaking_library.png',caption:'إجابة من كتاب الطالب مع إسناد واضح إلى الصفحة'},feed:{image:'../screens/manuscript/00_home_feed.png',caption:'منشورات حسب تخصصك ومرحلتك'},tools:{image:'../screens/manuscript/tools_live.png',caption:'أدوات الطالب في مكان واحد'}};
const pillarData={study:{kicker:'المكتبة الناطقة',title:'مو بس يلقالك المعلومة… يساعدك تفهمها.',body:'يسأل، يشرح، يبسط، ويرجعك للمصدر حتى تكون المعلومة أوضح وأقرب للدراسة.',chips:['عربي · English','صوت ومحادثة','مصدر واضح']},identity:{kicker:'الجواز الأكاديمي',title:'لا يبدأ الطالب<br>من الصفر كل مرة.',body:'سجل طويل يربط ما تعلمه الطالب بما يحتاجه لاحقًا. الفكرة أن يصبح الانتقال بين المراحل استمرارًا، لا قطيعة.',chips:['مراحل متعددة','فجوات واضحة','تقدم شخصي']},community:{kicker:'المجتمع المناسب',title:'ليس كل محتوى<br>مناسبًا لكل طالب.',body:'تظهر للطالب منشورات زملائه ومعلّميه بحسب القسم والمرحلة والمنتدى الدراسي، مع تفسير مبسط لسبب ظهورها.',chips:['قسمك أولًا','ترتيب مفهوم','مجتمع آمن']}};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const pathwayStyles=document.createElement('link');
pathwayStyles.rel='stylesheet';
pathwayStyles.href='pathway.css';
document.head.appendChild(pathwayStyles);
const growthStyles=document.createElement('link');
growthStyles.rel='stylesheet';
growthStyles.href='growth.css';
document.head.appendChild(growthStyles);
const productHeading=document.querySelector('#product .section-heading h2');
if(productHeading) productHeading.textContent='كل ما يحتاجه الطالب في مكان واحد';
const pathwaySection=document.querySelector('.compare-section');
if(pathwaySection) pathwaySection.id='pathway';
const studyPillar=document.querySelector('[data-pillar="study"] p');
if(studyPillar) studyPillar.textContent='يفهم كتبه، يسأل، يختبر نفسه، ويراجع الأخطاء.';
document.querySelectorAll('a[href="#proof"]').forEach(link=>link.remove());
const studyDetail=document.querySelector('#pillarDetail');
if(studyDetail){
	studyDetail.querySelector('.detail-copy h3').textContent='مو بس يلقالك المعلومة… يساعدك تفهمها.';
	studyDetail.querySelector('.detail-copy>p:not(.detail-kicker)').textContent='يسأل، يشرح، يبسط، ويرجعك للمصدر حتى تكون المعلومة أوضح وأقرب للدراسة.';
}
const revealObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');revealObserver.unobserve(e.target)}}),{threshold:.12}); $$('.reveal').forEach(el=>revealObserver.observe(el));
const progress=$('#progressBar'); const topButton=$('[data-top]'); window.addEventListener('scroll',()=>{const max=document.documentElement.scrollHeight-innerHeight;progress.style.width=`${Math.min(100,scrollY/max*100)}%`;topButton.classList.toggle('visible',scrollY>600)},{passive:true}); topButton.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
$$('[data-pillar]').forEach(button=>button.addEventListener('click',()=>{const data=pillarData[button.dataset.pillar];$$('[data-pillar]').forEach(b=>b.classList.toggle('is-active',b===button));const detail=$('#pillarDetail');detail.classList.remove('visible');setTimeout(()=>{detail.querySelector('.detail-kicker').textContent=data.kicker;detail.querySelector('.detail-copy h3').innerHTML=data.title;detail.querySelector('.detail-copy>p:not(.detail-kicker)').textContent=data.body;detail.querySelector('.detail-chips').innerHTML=data.chips.map(x=>`<span>${x}</span>`).join('');detail.classList.add('visible')},180)}));
$$('[data-gallery]').forEach(button=>button.addEventListener('click',()=>{const data=galleryData[button.dataset.gallery];$$('[data-gallery]').forEach(b=>b.classList.toggle('is-active',b===button));const image=$('#galleryImage');const frame=$('.gallery-image');if(frame) frame.classList.toggle('gallery-tools-active',button.dataset.gallery==='tools');image.style.opacity=0;setTimeout(()=>{image.src=data.image;$('#galleryCaption').textContent=data.caption;image.style.opacity=1},180)}));
$$('[data-compare]').forEach(button=>button.addEventListener('click',()=>{$$('[data-compare]').forEach(b=>b.classList.toggle('is-active',b===button));const isInstitution=button.dataset.compare==='institution';const labels=isInstitution?['يوفر للجامعة رؤية للتفاعل','يربط الطالب بالمحتوى الرسمي','يسهّل بناء مجتمع للقسم','يظهر الفجوات مبكرًا','يتيح تجربة قابلة للقياس']:['يفهم كتابه الخاص','يحصل على مصدر الإجابة','يرى زملاء تخصصه','يتابع أثر تعلمه','يستمر عند ضعف الاتصال'];$$('.compare-row b').forEach((el,i)=>el.textContent=labels[i]);}));
const counterObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(!e.isIntersecting)return;const el=e.target;const target=Number(el.dataset.value);const decimals=String(target).includes('.')?3:0;let start=0;const t0=performance.now();const tick=now=>{const p=Math.min(1,(now-t0)/900);const eased=1-Math.pow(1-p,3);el.textContent=(target*eased).toFixed(decimals);if(p<1)requestAnimationFrame(tick)};requestAnimationFrame(tick);counterObserver.unobserve(el)}),{threshold:.8});$$('.counter').forEach(el=>counterObserver.observe(el));
