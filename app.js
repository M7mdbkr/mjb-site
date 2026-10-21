/* MJB as an app on phones and iPads.
   Touch screens get a bottom tab bar, a field switcher with swipe between fields,
   an "add to home screen" sheet, and offline support. Desktop with a mouse is unchanged. */
(() => {
  'use strict';

  const root = document.documentElement;
  const arabic = () => root.lang === 'ar';
  const text = (en, ar) => arabic() ? ar : en;
  const coarse = matchMedia('(pointer: coarse)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const inAppBrowser = /FBAN|FBAV|Instagram|LinkedInApp|Twitter|Snapchat|TikTok|Line\/|GSA\/|; wv\)/.test(ua);
  const iosSafari = iOS && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|DuckDuckGo/.test(ua) && !inAppBrowser;
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const store = {
    get: key => { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set: (key, value) => { try { localStorage.setItem(key, value); } catch (e) { /* private mode */ } }
  };
  const buzz = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* not supported */ } };
  const appUI = () => root.classList.contains('app-ui');
  const bilingual = (en, ar) => {
    const fragment = document.createDocumentFragment();
    [['en', en], ['ar', ar]].forEach(([language, label]) => {
      const span = document.createElement('span');
      span.dataset.l = language;
      span.textContent = label;
      fragment.append(span);
    });
    return fragment;
  };
  const svg = paths => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;

  const setModes = () => {
    root.classList.toggle('app-ui', coarse.matches);
    root.classList.toggle('standalone', standalone());
    root.classList.toggle('ios', iOS);
  };
  setModes();

  // ---------- smooth or instant scrolling, through the page's smooth-scroll helper when it runs ----------
  const scrollToY = (y, instant) => {
    const top = Math.max(0, Math.round(y));
    const lenis = window.__lenis;
    if (lenis) { lenis.scrollTo(top, { immediate: !!instant || reduced.matches, force: true }); return; }
    if (instant || reduced.matches) window.scrollTo(0, top);
    else window.scrollTo({ top, behavior: 'smooth' });
  };

  const nav = document.querySelector('nav');
  const fields = [...document.querySelectorAll('.proj[id]')];

  // ---------- bottom tab bar ----------
  const TABS = [
    ['top', 'Home', 'الرئيسية', '<path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-6h-5.6v6H5A1.5 1.5 0 0 1 3.5 19z"/>'],
    ['work', 'Fields', 'المجالات', '<path d="M12 2.8 3.8 7.4v9.2l8.2 4.6 8.2-4.6V7.4z"/><path d="M3.8 7.4 12 12l8.2-4.6M12 12v9.2"/>'],
    ['services', 'Services', 'الخدمات', '<path d="M3.5 12.3V4.8a1.3 1.3 0 0 1 1.3-1.3h7.5l8.2 8.2-8.8 8.8z"/><circle cx="8.2" cy="8.2" r="1.6"/>'],
    ['about', 'About', 'عني', '<circle cx="12" cy="8.2" r="3.9"/><path d="M4.5 20.5c.6-4 3.7-6.6 7.5-6.6s6.9 2.6 7.5 6.6"/>'],
    ['contact', 'Contact', 'تواصل', '<path d="M20.5 11.6a8 8 0 0 1-11.7 7.1l-5.3 1.8 1.8-5.2a8 8 0 1 1 15.2-3.7z"/><path d="M8.5 11.8h.01M12 11.8h.01M15.5 11.8h.01"/>']
  ].filter(([id]) => document.getElementById(id));
  const tabbar = document.createElement('div');
  tabbar.className = 'tabbar';
  tabbar.setAttribute('role', 'navigation');
  const tabLinks = TABS.map(([id, en, ar, icon]) => {
    const link = document.createElement('a');
    link.href = `#${id}`;
    link.dataset.tab = id;
    link.innerHTML = svg(icon);
    link.append(bilingual(en, ar));
    link.addEventListener('click', () => buzz(8));   // the page's own anchor handler does the scrolling
    tabbar.append(link);
    return link;
  });
  document.body.append(tabbar);
  const tabTargets = TABS.map(([id]) => document.getElementById(id));

  // ---------- field switcher (sticky chips) ----------
  const pager = document.createElement('div');
  pager.className = 'fpager';
  pager.setAttribute('role', 'navigation');
  const chipTrack = document.createElement('div');
  chipTrack.className = 'fp-track';
  pager.append(chipTrack);
  const chips = fields.map((field, index) => {
    const chip = document.createElement('a');
    chip.className = 'chip';
    chip.href = `#${field.id}`;
    const number = document.createElement('b');
    number.textContent = String(index + 1).padStart(2, '0');
    chip.append(number, bilingual(field.dataset.name || field.id, field.dataset.nameAr || field.dataset.name || field.id));
    chip.addEventListener('click', event => {
      if (!appUI()) return;
      event.preventDefault();
      buzz(8);
      goTo(index, false);
    });
    chipTrack.append(chip);
    return chip;
  });
  if (nav && fields.length) nav.after(pager);

  // where a field starts on screen: under the top bars on phones, a third into the pinned exhibit on iPads held sideways
  const fieldY = (field, goingDown) => {
    const stick = field.querySelector('.stick');
    const top = field.getBoundingClientRect().top + scrollY;
    if (stick && getComputedStyle(stick).position === 'sticky') return top + innerHeight * .35;
    const navHeight = goingDown || !nav ? 0 : nav.offsetHeight;
    return top - navHeight - (pager.offsetHeight || 0) + 6;
  };
  const goTo = (index, instant) => {
    const field = fields[index];
    if (!field) return;
    const goingDown = field.getBoundingClientRect().top > 0;
    scrollToY(fieldY(field, goingDown), instant);
  };

  // ---------- swipe between fields ----------
  let paging = false;
  const nextSign = dx => (arabic() ? (dx > 0 ? 1 : -1) : (dx < 0 ? 1 : -1));   // right-to-left: the next field sits on the left
  const springBack = wrap => {
    const from = wrap.style.transform;
    wrap.style.transform = '';
    if (from && wrap.animate && !reduced.matches) {
      wrap.animate([{ transform: from }, { transform: 'translateX(0px)' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  };
  const page = (from, to, direction) => {
    const a = fields[from].querySelector('.stick .wrap');
    const b = fields[to].querySelector('.stick .wrap');
    const holders = [fields[from], fields[to]].map(field => field.querySelector('.stick'));
    const finish = () => {
      [a, b].forEach(wrap => { wrap.style.transform = ''; });
      holders.forEach(holder => holder.classList.remove('paging'));
      paging = false;
      updateOnScroll();
    };
    paging = true;
    holders.forEach(holder => holder.classList.add('paging'));
    if (reduced.matches || !a.animate) { scrollToY(fieldY(fields[to], to > from), true); finish(); return; }
    const out = direction * innerWidth * .42;
    const start = a.style.transform || 'translateX(0px)';
    const leave = a.animate([{ transform: start }, { transform: `translateX(${out}px)` }],
      { duration: 170, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    leave.onfinish = () => {
      scrollToY(fieldY(fields[to], to > from), true);
      a.style.transform = '';
      leave.cancel();
      const enter = b.animate([{ transform: `translateX(${-out}px)` }, { transform: 'translateX(0px)' }],
        { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
      enter.onfinish = finish;
      enter.oncancel = finish;
    };
  };

  let gesture = null;
  const zoomed = () => !!(window.visualViewport && visualViewport.scale > 1.02);
  document.addEventListener('touchstart', event => {
    gesture = null;
    if (!appUI() || paging || event.touches.length !== 1 || zoomed()) return;
    const field = event.target.closest && event.target.closest('.proj');
    if (!field || event.target.closest('a, button, input, select, textarea, label, summary')) return;
    const touch = event.touches[0];
    gesture = { field, index: fields.indexOf(field), x: touch.clientX, y: touch.clientY, time: performance.now(),
      mode: null, dx: 0, wrap: field.querySelector('.stick .wrap') };
  }, { passive: true });
  document.addEventListener('touchmove', event => {
    if (!gesture) return;
    if (event.touches.length !== 1) { springBack(gesture.wrap); gesture = null; return; }
    const touch = event.touches[0];
    const dx = touch.clientX - gesture.x;
    const dy = touch.clientY - gesture.y;
    if (!gesture.mode) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      gesture.mode = Math.abs(dx) > Math.abs(dy) * 1.25 ? 'side' : 'scroll';
      if (gesture.mode === 'scroll') { gesture = null; return; }
      hideTip();
    }
    gesture.dx = dx;
    const target = gesture.index + nextSign(dx);
    const pull = target < 0 || target >= fields.length ? .16 : .42;   // resistance at the first and last field
    if (gesture.wrap) gesture.wrap.style.transform = `translateX(${(dx * pull).toFixed(1)}px)`;
  }, { passive: true });
  const endGesture = cancelled => {
    if (!gesture) return;
    const g = gesture;
    gesture = null;
    if (g.mode !== 'side' || !g.wrap) return;
    const speed = Math.abs(g.dx) / Math.max(1, performance.now() - g.time);
    const target = g.index + nextSign(g.dx);
    const far = Math.abs(g.dx) > 64 || (Math.abs(g.dx) > 28 && speed > .45);
    if (!cancelled && far && target >= 0 && target < fields.length) {
      buzz(10);
      store.set('mjb-swipe-tip', '1');
      page(g.index, target, Math.sign(g.dx));
    } else {
      springBack(g.wrap);
    }
  };
  document.addEventListener('touchend', () => endGesture(false), { passive: true });
  document.addEventListener('touchcancel', () => endGesture(true), { passive: true });

  // one-time hint so visitors know they can swipe
  const tip = document.createElement('div');
  tip.className = 'swipe-tip';
  tip.setAttribute('aria-hidden', 'true');
  const tipText = document.createElement('span');
  tipText.append(bilingual('Swipe sideways for the next field', 'اسحب للجانب لتنتقل بين المجالات'));
  const arrows = document.createElement('i');
  arrows.textContent = '⇆';
  tip.append(arrows, tipText);
  document.body.append(tip);
  let tipTimer = 0;
  function hideTip() { tip.classList.remove('on'); clearTimeout(tipTimer); }
  const maybeTip = () => {
    if (store.get('mjb-swipe-tip') || tip.classList.contains('on') || tip.dataset.shown) return;
    tip.dataset.shown = '1';
    store.set('mjb-swipe-tip', '1');
    tip.classList.add('on');
    tipTimer = setTimeout(hideTip, 4200);
  };

  // ---------- add to home screen ----------
  let installEvent = null;
  const sheet = document.createElement('div');
  sheet.className = 'app-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-labelledby', 'app-sheet-title');
  sheet.setAttribute('aria-hidden', 'true');
  sheet.innerHTML = `<div class="as-card">
    <button class="as-x" type="button"><span aria-hidden="true">×</span></button>
    <img src="img/app-192.png" alt="" width="56" height="56">
    <div class="as-copy"><h3 id="app-sheet-title"></h3><p></p></div>
    <ol class="as-steps">
      <li><span class="as-n">1</span><span class="as-s1"></span>${svg('<path d="M12 3.5v11M7.8 7.6 12 3.4l4.2 4.2"/><path d="M8.5 10.5H6.5a1.5 1.5 0 0 0-1.5 1.5v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12a1.5 1.5 0 0 0-1.5-1.5h-2"/>')}</li>
      <li><span class="as-n">2</span><span class="as-s2"></span>${svg('<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M12 8.5v7M8.5 12h7"/>')}</li>
    </ol>
    <div class="as-actions"><button class="btn as-later" type="button"></button><button class="btn btn-main as-go" type="button"></button></div>
  </div>`;
  document.body.append(sheet);
  const sheetTitle = sheet.querySelector('h3');
  const sheetText = sheet.querySelector('.as-copy p');
  const closeButton = sheet.querySelector('.as-x');
  const laterButton = sheet.querySelector('.as-later');
  const goButton = sheet.querySelector('.as-go');
  const canInstall = () => !standalone() && !inAppBrowser && (!!installEvent || iosSafari);
  const fillSheet = () => {
    const ios = !installEvent;
    sheet.classList.toggle('ios', ios);
    sheetTitle.textContent = text('MJB on your home screen', 'MJB على شاشتك الرئيسية');
    sheetText.textContent = text('Add the site as an app: it opens full screen and fast, even without internet.',
      'أضف الموقع كتطبيق: يفتح بشاشة كاملة وبسرعة، حتى بدون إنترنت.');
    sheet.querySelector('.as-s1').textContent = text('Tap the Share button in Safari', 'اضغط زر المشاركة في سفاري');
    sheet.querySelector('.as-s2').textContent = text('Choose “Add to Home Screen”', 'اختر «إضافة إلى الشاشة الرئيسية»');
    closeButton.setAttribute('aria-label', text('Close', 'إغلاق'));
    laterButton.textContent = ios ? text('Got it', 'تم') : text('Later', 'لاحقًا');
    goButton.textContent = text('Install', 'تثبيت');
  };
  const openSheet = () => {
    if (!canInstall()) return;
    fillSheet();
    sheet.classList.add('on');
    sheet.setAttribute('aria-hidden', 'false');
    store.set('mjb-install-seen', '1');
  };
  const closeSheet = () => {
    sheet.classList.remove('on');
    sheet.setAttribute('aria-hidden', 'true');
  };
  closeButton.addEventListener('click', closeSheet);
  laterButton.addEventListener('click', closeSheet);
  goButton.addEventListener('click', async () => {
    if (!installEvent) return;
    const prompt = installEvent;
    installEvent = null;
    closeSheet();
    try { prompt.prompt(); await prompt.userChoice; } catch (e) { /* the browser declined to show it */ }
    updateInstall();
  });
  // footer link that opens the same sheet any time
  const footerWrap = document.querySelector('footer .wrap');
  const getApp = document.createElement('button');
  getApp.type = 'button';
  getApp.className = 'get-app';
  getApp.append(bilingual('Install the app', 'ثبّت التطبيق'));
  getApp.addEventListener('click', openSheet);
  if (footerWrap) footerWrap.append(getApp);
  function updateInstall() { root.classList.toggle('can-install', canInstall()); }
  addEventListener('beforeinstallprompt', event => { event.preventDefault(); installEvent = event; updateInstall(); });
  addEventListener('appinstalled', () => { installEvent = null; closeSheet(); updateInstall(); });
  updateInstall();
  let engagedAt = 0;
  const maybeOfferInstall = () => {
    if (!appUI() || !canInstall() || store.get('mjb-install-seen') || sheet.classList.contains('on')) return;
    if (tip.classList.contains('on') || paging || root.classList.contains('typing')) return;
    if (engagedAt && performance.now() - engagedAt > 1500) openSheet();
  };
  setTimeout(() => { if (!engagedAt) engagedAt = performance.now() - 2000; maybeOfferInstall(); }, 60000);

  // the tab bar steps aside while the keyboard is open
  document.addEventListener('focusin', event => {
    if (event.target.matches && event.target.matches('input, textarea, select')) root.classList.add('typing');
  });
  document.addEventListener('focusout', () => setTimeout(() => {
    const active = document.activeElement;
    if (!(active && active.matches && active.matches('input, textarea, select'))) root.classList.remove('typing');
  }, 60));

  // ---------- follow the scroll: active tab, active field, switcher visibility ----------
  let currentField = -1;
  let framePending = false;
  const centreChip = chip => {
    const track = chipTrack.getBoundingClientRect();
    const box = chip.getBoundingClientRect();
    const delta = (box.left + box.width / 2) - (track.left + track.width / 2);
    if (Math.abs(delta) > 4) chipTrack.scrollBy({ left: delta, behavior: reduced.matches ? 'auto' : 'smooth' });
  };
  function updateOnScroll() {
    framePending = false;
    if (!appUI()) return;
    const line = innerHeight * .4;
    // tab
    let active = 0;
    tabTargets.forEach((target, index) => { if (target.getBoundingClientRect().top <= line) active = index; });
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) active = tabTargets.length - 1;
    tabLinks.forEach((link, index) => {
      const on = index === active;
      link.classList.toggle('on', on);
      if (on) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
    // fields
    if (!fields.length) return;
    const start = (document.getElementById('work') || fields[0]).getBoundingClientRect();
    const last = fields[fields.length - 1].getBoundingClientRect();
    const inFields = start.top < innerHeight * .3 && last.bottom > innerHeight * .45;
    pager.classList.toggle('on', inFields);
    let field = -1;
    fields.forEach((item, index) => {
      const box = item.getBoundingClientRect();
      if (box.top <= innerHeight * .45 && box.bottom > innerHeight * .45) field = index;
    });
    if (field !== currentField && field >= 0) {
      currentField = field;
      chips.forEach((chip, index) => {
        chip.classList.toggle('on', index === field);
        if (index === field) chip.setAttribute('aria-current', 'location'); else chip.removeAttribute('aria-current');
      });
      if (inFields) centreChip(chips[field]);
    }
    if (inFields && field >= 0) maybeTip();
    if (active >= 2 && !engagedAt) engagedAt = performance.now();   // reached Services, About or Contact
    maybeOfferInstall();
  }
  const schedule = () => { if (!framePending) { framePending = true; requestAnimationFrame(updateOnScroll); } };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });

  // ---------- language: labels and names ----------
  const updateLanguage = () => {
    tabbar.setAttribute('aria-label', text('Sections', 'الأقسام'));
    pager.setAttribute('aria-label', text('Fields', 'المجالات'));
    chips.forEach((chip, index) => chip.setAttribute('aria-label', text(
      `Field ${index + 1}: ${fields[index].dataset.name}`,
      `المجال ${index + 1}: ${fields[index].dataset.nameAr || fields[index].dataset.name}`)));
    if (sheet.classList.contains('on')) fillSheet();
    currentField = -1;
    schedule();
  };
  document.addEventListener('langchange', updateLanguage);
  updateLanguage();

  const refresh = () => { setModes(); updateInstall(); schedule(); };
  if (coarse.addEventListener) coarse.addEventListener('change', refresh);
  matchMedia('(display-mode: standalone)').addEventListener?.('change', refresh);

  // ---------- offline support (only on the real site and local previews) ----------
  const host = location.hostname;
  const ownSite = /(^|\.)mjb\.solutions$/.test(host) || host === 'localhost' || host === '127.0.0.1';
  if ('serviceWorker' in navigator && ownSite) {
    addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ }); });
  }
})();
