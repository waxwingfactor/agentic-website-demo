(function () {
  'use strict';
  var cfg = window.TIDEWELL || {};
  // Absolute logo URL derived from this script's own location, so it works on any host and sub-page.
  try { var me = document.currentScript && document.currentScript.src; if (me) cfg.logoUrl = new URL('logo.svg', me).href; } catch (e) {}
  var hasAgents = !!(cfg.publicKey && cfg.chatAgentId && cfg.voiceAgentId);
  var tz = 'America/Chicago';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) {}
  // Slate tokens for the third-party widget (it can't read our CSS variables).
  var BRAND = { theme: '#273449', accent: '#475569' };

  // ----- Demo banner -----
  var banner = document.getElementById('demo-banner');
  try { if (sessionStorage.getItem('tw-banner-hidden') === '1' && banner) banner.hidden = true; } catch (e) {}
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-dismiss-banner]') && banner) {
      banner.hidden = true;
      try { sessionStorage.setItem('tw-banner-hidden', '1'); } catch (err) {}
    }
  });

  // ----- Mobile menu -----
  var header = document.querySelector('.site-header');
  var menuBtn = document.querySelector('[data-menu]');
  if (menuBtn && header) {
    menuBtn.addEventListener('click', function () {
      var open = header.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    header.querySelectorAll('.nav a').forEach(function (a) {
      a.addEventListener('click', function () { header.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); });
    });
  }

  // ----- Status pill -----
  function setStatus(live, text) {
    document.querySelectorAll('[data-assistant-status]').forEach(function (el) {
      var d = el.querySelector('.dot');
      if (d) { d.classList.toggle('ok', !!live); d.classList.toggle('bad', !live); }
      var t = el.querySelector('[data-status-text]');
      if (t) t.textContent = text;
    });
  }

  // ----- Office open/closed, computed from the published hours in the business time zone -----
  (function officeStatus() {
    var h = cfg.hours; if (!h) return;
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: cfg.timezone || 'America/Chicago', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      var get = function (t) { return (parts.filter(function (p) { return p.type === t; })[0] || {}).value; };
      var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
      var mins = (Number(get('hour')) % 24) * 60 + Number(get('minute'));
      var toMin = function (x) { var a = x.split(':'); return Number(a[0]) * 60 + Number(a[1]); };
      var open = h.weekdays.indexOf(day) !== -1 && mins >= toMin(h.open) && mins < toMin(h.close);
      document.querySelectorAll('[data-office-dot]').forEach(function (d) { d.classList.add(open ? 'ok' : 'warn'); });
      document.querySelectorAll('[data-office-text]').forEach(function (t) { t.textContent = open ? 'Office open now (Mon–Fri 9–5 Central)' : 'Office closed now (Mon–Fri 9–5 Central). The assistant is available.'; });
    } catch (e) {}
  })();

  // ----- Fade up once on first view, siblings staggered by 70 ms -----
  (function reveal() {
    var els = [].slice.call(document.querySelectorAll('.reveal'));
    if (!els.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, sibs = [].slice.call(el.parentNode.children).filter(function (c) { return c.classList.contains('reveal'); });
        el.style.transitionDelay = (Math.max(0, sibs.indexOf(el)) * 70) + 'ms';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (e) { io.observe(e); });
  })();

  function dynamicVars(entry) {
    return JSON.stringify({ visitor_timezone: tz, page_path: location.pathname.replace(/^.*\//, '/') || '/', entry: entry });
  }

  function commonAttrs(s) {
    s.setAttribute('data-theme-color', BRAND.theme);
    s.setAttribute('data-component-color', BRAND.accent);
    if (cfg.logoUrl) { s.setAttribute('data-logo-url', cfg.logoUrl); s.setAttribute('data-fab-icon-url', cfg.logoUrl); }
  }

  // ----- Floating chat + voice widget (all pages except the callback page) -----
  function loadWidget() {
    if (!hasAgents) { setStatus(false, 'Assistant not connected'); return; }
    var s = document.createElement('script');
    s.id = 'retell-widget';
    s.src = 'https://dashboard.retellai.com/retell-widget-v2.js';
    s.setAttribute('data-public-key', cfg.publicKey);
    s.setAttribute('data-voice-public-key', cfg.publicKey);
    s.setAttribute('data-agent-id', cfg.chatAgentId);
    s.setAttribute('data-voice-agent-id', cfg.voiceAgentId);
    s.setAttribute('data-title', 'Tidewell AI assistant');
    s.setAttribute('data-bot-name', 'Tidewell AI assistant');
    s.setAttribute('data-fab-text', 'Ask Tidewell');
    s.setAttribute('data-popup-message', "Hi, I'm Tidewell's AI assistant. Ask me about our services or book a free intro call.");
    s.setAttribute('data-show-ai-popup-time', '8');
    s.setAttribute('data-dynamic', dynamicVars('website'));
    commonAttrs(s);
    s.onload = function () { setStatus(true, 'AI assistant online'); };
    s.onerror = function () { setStatus(false, 'Assistant unavailable right now'); };
    document.body.appendChild(s);
  }

  // ----- Embedded callback widget (callback page) -----
  function loadCallback() {
    var slot = document.getElementById('callback-widget-slot');
    if (!slot) return;
    var offline = slot.querySelector('[data-callback-offline]');
    if (!(cfg.publicKey && cfg.voiceAgentId && cfg.callbackPhone)) { if (offline) offline.textContent = 'The callback assistant is not connected yet.'; return; }
    var box = document.createElement('div');
    box.setAttribute('data-retell-widget', 'true');
    box.setAttribute('data-widget', 'callback');
    box.setAttribute('data-public-key', cfg.publicKey);
    box.setAttribute('data-agent-id', cfg.voiceAgentId);
    box.setAttribute('data-phone-number', cfg.callbackPhone);
    box.setAttribute('data-title', 'Request a call');
    box.setAttribute('data-countries', 'US,CA');
    box.setAttribute('data-tc', new URL('privacy.html', location.href).href);
    box.setAttribute('data-dynamic', dynamicVars('callback'));
    commonAttrs(box);
    box.setAttribute('data-color', BRAND.accent);
    box.style.height = '100%';
    slot.innerHTML = '';
    slot.appendChild(box);
    var s = document.createElement('script');
    s.src = 'https://dashboard.retellai.com/retell-widget-embed.js';
    s.onerror = function () { slot.innerHTML = '<p class="cb-offline">The callback form could not load. Please use the chat instead.</p>'; };
    document.body.appendChild(s);
    setStatus(true, 'AI assistant online');
  }

  // ----- Open the widget from our own buttons -----
  // The widget renders in an open shadow root and has no JS API, so we click its own controls.
  function widgetRoots() {
    var roots = [];
    document.querySelectorAll('body *').forEach(function (el) { if (el.shadowRoot) roots.push(el.shadowRoot); });
    return roots;
  }
  function visible(el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
  function findIn(roots, test) {
    for (var i = 0; i < roots.length; i++) {
      var els = roots[i].querySelectorAll('button, [role="button"], a');
      for (var j = 0; j < els.length; j++) {
        var el = els[j];
        var label = ((el.getAttribute('aria-label') || '') + ' ' + (el.innerText || el.textContent || '')).replace(/\s+/g, ' ').trim().toLowerCase();
        if (visible(el) && test(label, el)) return el;
      }
    }
    return null;
  }
  function wait(fn, ms) {
    return new Promise(function (resolve) {
      var t0 = Date.now();
      (function tick() {
        var v = fn();
        if (v || Date.now() - t0 > ms) return resolve(v);
        setTimeout(tick, 120);
      })();
    });
  }
  function isPanelOpen(roots) {
    return !!findIn(roots, function (l) { return /chat assistant|voice assistant|type (a|your) message|send message|start (a )?call|end call|new chat|close/.test(l) && !/ask tidewell|need support/.test(l); });
  }
  function openAssistant(mode) {
    if (!hasAgents) { alert('The AI assistant is not connected on this copy of the site.'); return; }
    var want = mode === 'voice' ? /voice/ : /chat/;
    wait(function () { var r = widgetRoots(); return r.length && findIn(r, function (l) { return /ask tidewell|need support/.test(l); }) ? r : null; }, 8000).then(function (roots) {
      if (!roots) { alert('The assistant is still loading. Please try again in a moment.'); return; }
      if (!isPanelOpen(roots)) {
        var fab = findIn(roots, function (l) { return /ask tidewell|need support/.test(l); });
        if (fab) fab.click();
      }
      return wait(function () {
        return findIn(widgetRoots(), function (l) { return want.test(l) && /assistant|start|talk|call|chat/.test(l) && !/ask tidewell|end/.test(l); });
      }, 2500).then(function (choice) { if (choice) choice.click(); });
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-open-assistant]');
    if (!b) return;
    e.preventDefault();
    if (!cfg.loadWidget) { location.href = 'index.html#assistant'; return; }
    openAssistant(b.getAttribute('data-open-assistant'));
  });
  window.tidewellOpenAssistant = openAssistant;

  if (cfg.loadWidget) loadWidget(); else loadCallback();
})();
