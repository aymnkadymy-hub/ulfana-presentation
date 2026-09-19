(() => {
  'use strict';
  const doc = document;
  const root = doc.documentElement;
  const $ = (selector, scope = doc) => scope.querySelector(selector);
  const $$ = (selector, scope = doc) => Array.from(scope.querySelectorAll(selector));
  const status = $('#app-status');
  const sections = $$('#main > .section');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionPaused = reducedMotion.matches;
  let presentationMode = false;
  let currentSection = 0;
  let previousDialogFocus = null;

  function setMotion(paused) {
    motionPaused = paused;
    root.classList.toggle('motion-paused', paused);
    const toggle = $('.motion-toggle');
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'تشغيل الحركة' : 'إيقاف الحركة');
    toggle.title = paused ? 'تشغيل الحركة' : 'إيقاف الحركة';
    $('use', toggle).setAttribute('href', paused ? '#i-play' : '#i-pause');
  }
  setMotion(motionPaused);
  $('.motion-toggle').addEventListener('click', () => {
    setMotion(!motionPaused);
    status.textContent = motionPaused ? 'أُوقفت الحركات التلقائية.' : reducedMotion.matches ? 'إعداد تقليل الحركة في جهازك ما زال مفعّلًا.' : 'شُغّلت الحركات التلقائية.';
  });
  reducedMotion.addEventListener?.('change', (event) => setMotion(event.matches));

  const menuToggle = $('.menu-toggle');
  const nav = $('#main-nav');
  function closeMenu() {
    nav.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'فتح القائمة');
  }
  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
    nav.classList.toggle('is-open', open);
  });
  $$('a', nav).forEach((link) => link.addEventListener('click', closeMenu));
  doc.addEventListener('click', (event) => { if (!event.target.closest('.site-header')) closeMenu(); });
  window.matchMedia('(min-width: 761px)').addEventListener?.('change', (event) => { if (event.matches) closeMenu(); });

  // Arrow keys follow the visual RTL order; tabs never intercept the entire page.
  function activateTab(tab, focus = false) {
    const list = tab.closest('[role="tablist"]');
    $$('[role="tab"]', list).forEach((item) => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      const panel = doc.getElementById(item.getAttribute('aria-controls'));
      if (panel) panel.hidden = !selected;
    });
    if (focus) tab.focus();
  }
  $$('[role="tablist"]').forEach((list) => {
    const tabs = $$('[role="tab"]', list);
    tabs.forEach((tab) => tab.addEventListener('click', () => activateTab(tab)));
    list.addEventListener('keydown', (event) => {
      const tab = event.target.closest('[role="tab"]');
      if (!tab) return;
      const vertical = list.getAttribute('aria-orientation') === 'vertical';
      let direction = 0;
      if (vertical) {
        if (event.key === 'ArrowDown') direction = 1;
        if (event.key === 'ArrowUp') direction = -1;
      } else {
        if (event.key === 'ArrowLeft') direction = 1;
        if (event.key === 'ArrowRight') direction = -1;
      }
      let next = tabs.indexOf(tab);
      if (direction) next = (next + direction + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      activateTab(tabs[next], true);
    });
  });
  $$('[data-activate-tab]').forEach((button) => button.addEventListener('click', () => {
    const tab = $(`[aria-controls="${button.dataset.activateTab}"]`);
    if (tab) activateTab(tab, true);
  }));
  const platformOrientation = window.matchMedia('(max-width: 760px)');
  function setPlatformOrientation() { $('.platform-tabs').setAttribute('aria-orientation', platformOrientation.matches ? 'horizontal' : 'vertical'); }
  setPlatformOrientation();
  platformOrientation.addEventListener?.('change', setPlatformOrientation);

  const quizFeedback = $('#quiz-feedback');
  $$('[data-answer]').forEach((button) => button.addEventListener('click', () => {
    $$('[data-answer]').forEach((item) => {
      item.classList.remove('is-correct', 'is-incorrect');
      item.removeAttribute('aria-pressed');
    });
    const correct = button.dataset.answer === 'correct';
    button.classList.add(correct ? 'is-correct' : 'is-incorrect');
    button.setAttribute('aria-pressed', 'true');
    quizFeedback.className = `quiz-feedback ${correct ? 'correct' : 'incorrect'}`;
    quizFeedback.textContent = correct
      ? 'صحيح. وجود اسم الحيوان مع كل صورة يعني أن أمثلة التدريب تحمل تسميات: تعلّم تحت الإشراف.'
      : 'حاول مرة ثانية. اسم الحيوان هو «التسمية الصحيحة». حين تتوافر التسميات مع الصور، يكون التعلّم تحت الإشراف.';
  }));

  const companions = {
    aram: { name: 'أرومة', speech: 'كل فكرة جديدة، بذرة.', note: 'خطوة صغيرة. معرفة تنمو.' },
    thaloobi: { name: 'ذيبو', speech: 'نكتشف الفكرة، سويّة.', note: 'للفضول مكان في كل درس.' },
    mijo: { name: 'ميجو', speech: 'على مهلك، الفهم يستاهل.', note: 'هدوء صغير، بين فكرتين.' },
    addoun: { name: 'أدّون', speech: 'فكرة جديدة؟ أنا حاضر!', note: 'شيء من الحيوية في يومك.' },
    ozis: { name: 'أوزيس', speech: 'صفحة أخرى، أفق جديد.', note: 'رفقة لطيفة لطريق المعرفة.' }
  };
  let companionAnimationTimer;
  $$('.companion-choice').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.companion;
    const companion = companions[id];
    if (!companion) return;
    $$('.companion-choice').forEach((item) => {
      const selected = item === button;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    $('.companion-stage').dataset.character = id;
    $('#companion-name').textContent = companion.name;
    $('#companion-speech').textContent = companion.speech;
    $('#companion-note').textContent = companion.note;
    const artwork = $('#companion-main');
    artwork.src = `assets/companions/${id}.svg`;
    artwork.alt = `${companion.name}، من شخصيات رفيق الدراسة`;
    artwork.classList.remove('is-changing');
    if (!motionPaused && !reducedMotion.matches) {
      window.requestAnimationFrame(() => artwork.classList.add('is-changing'));
      window.clearTimeout(companionAnimationTimer);
      companionAnimationTimer = window.setTimeout(() => artwork.classList.remove('is-changing'), 520);
    }
  }));

  const screenshotDialog = $('#screenshot-dialog');
  $$('.screenshot-trigger').forEach((button) => button.addEventListener('click', () => {
    previousDialogFocus = button;
    const source = button.dataset.screenshot;
    const caption = button.dataset.caption || 'واجهة أولفانا';
    $('#screenshot-image').src = source;
    $('#screenshot-image').alt = caption;
    $('#screenshot-caption').textContent = caption;
    $('#screenshot-original').href = source;
    screenshotDialog.showModal();
    doc.body.classList.add('dialog-open');
  }));
  $('#close-screenshot').addEventListener('click', () => screenshotDialog.close());
  screenshotDialog.addEventListener('click', (event) => {
    if (event.target !== screenshotDialog) return;
    const bounds = screenshotDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) screenshotDialog.close();
  });
  screenshotDialog.addEventListener('close', () => {
    doc.body.classList.remove('dialog-open');
    previousDialogFocus?.focus({ preventScroll: true });
  });

  // Normal scrolling remains available in presentation mode.
  const controls = $('#presentation-controls');
  const presentationToggle = $('#present-toggle');
  function syncPresentationPosition() {
    $('#presentation-position').textContent = `${currentSection + 1} / ${sections.length}`;
    $('#previous-section').disabled = currentSection === 0;
    $('#next-section').disabled = currentSection === sections.length - 1;
  }
  function setPresentationMode(enabled) {
    presentationMode = enabled;
    doc.body.classList.toggle('presentation-mode', enabled);
    presentationToggle.setAttribute('aria-pressed', String(enabled));
    $('span', presentationToggle).textContent = enabled ? 'إنهاء العرض' : 'وضع العرض';
    controls.hidden = !enabled;
    if (enabled) {
      syncPresentationPosition();
      status.textContent = 'وضع العرض مفعّل. استخدم السهم الأيسر للقسم التالي، والأيمن للسابق. Escape للإنهاء.';
    } else {
      if (doc.fullscreenElement) doc.exitFullscreen().catch(() => {});
      status.textContent = 'انتهى وضع العرض.';
    }
  }
  function goToSection(index) {
    currentSection = Math.max(0, Math.min(sections.length - 1, index));
    sections[currentSection].scrollIntoView({ behavior: motionPaused || reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
    syncPresentationPosition();
  }
  presentationToggle.addEventListener('click', () => setPresentationMode(!presentationMode));
  $('#exit-presentation').addEventListener('click', () => { setPresentationMode(false); presentationToggle.focus({ preventScroll: true }); });
  $('#previous-section').addEventListener('click', () => goToSection(currentSection - 1));
  $('#next-section').addEventListener('click', () => goToSection(currentSection + 1));
  const fullscreenButton = $('#fullscreen-toggle');
  if (!doc.fullscreenEnabled) fullscreenButton.hidden = true;
  fullscreenButton.addEventListener('click', async () => {
    try {
      if (doc.fullscreenElement) await doc.exitFullscreen();
      else await root.requestFullscreen();
    } catch { status.textContent = 'تعذّر ملء الشاشة في هذا المتصفح. أدوات العرض تبقى متاحة.'; }
  });
  doc.addEventListener('fullscreenchange', () => fullscreenButton.setAttribute('aria-label', doc.fullscreenElement ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'));
  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (screenshotDialog.open) return;
      closeMenu();
      if (presentationMode) setPresentationMode(false);
      return;
    }
    if (!presentationMode || screenshotDialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest('input, textarea, select, [role="tablist"], [contenteditable="true"], summary')) return;
    if (event.key === 'ArrowLeft' || event.key === 'PageDown') { event.preventDefault(); goToSection(currentSection + 1); }
    else if (event.key === 'ArrowRight' || event.key === 'PageUp') { event.preventDefault(); goToSection(currentSection - 1); }
  });

  let scrollTick = false;
  const progress = $('#reading-progress');
  function updateScrollState() {
    const total = root.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0})`;
    const line = Math.min(window.innerHeight * 0.32, 260);
    let nearest = 0;
    sections.forEach((section, index) => { if (section.getBoundingClientRect().top <= line) nearest = index; });
    currentSection = nearest;
    const active = sections[nearest]?.id;
    $$('a', nav).forEach((link) => {
      if (link.hash === `#${active}`) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    if (presentationMode) syncPresentationPosition();
    scrollTick = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollTick) { scrollTick = true; window.requestAnimationFrame(updateScrollState); }
  }, { passive: true });
  window.addEventListener('resize', updateScrollState, { passive: true });
  updateScrollState();
  window.UlfanaShowcase = Object.freeze({ activateTab, setMotion, goToSection });
})();
