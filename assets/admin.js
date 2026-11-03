(function () {
  'use strict';
  var CFG = window.TIDEWELL_ADMIN || {};
  var state = { key: null, data: null, tab: 'overview', knowledge: null };
  var CHANNELS = { chat: { label: 'Chat', color: 'var(--series-1)' }, web_voice: { label: 'Browser voice', color: 'var(--series-2)' }, phone: { label: 'Phone callback', color: 'var(--series-3)' } };
  var TEAMS = { strategy: 'Strategy', automation: 'Automation & AI', cloud: 'Cloud & Data', 'client-success': 'Client Success' };
  var SERVICES = { strategy: 'IT Strategy & Roadmap', automation: 'Process Automation', ai: 'AI Readiness & Adoption', workspace: 'M365 & Workspace', data: 'Data & Reporting', 'fractional-cto': 'Fractional CTO' };
  var ICON = {
    overview: '<path d="M4 13h6V4H4v9Zm10 7h6v-9h-6v9ZM4 20h6v-4H4v4Zm10-16v4h6V4h-6Z"/>',
    leads: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6 6 0 0 0-4-5.6"/>',
    meetings: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    handovers: '<path d="M7 11V6.5a2 2 0 0 1 4 0V11M11 10V5a2 2 0 0 1 4 0v6M15 9.5a2 2 0 0 1 4 0V14a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.4L3 14.5a1.8 1.8 0 0 1 3-2L7 14"/>',
    conversations: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z"/>',
    outbox: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
    knowledge: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
    usage: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>',
    check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
    alert: '<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 10v4.5M12 17.3v.1"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.4 2"/>',
  };
  function svg(name) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[name] + '</svg>'; }

  // ---------- DOM helpers (all data goes through textContent) ----------
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v; // only for our own static icon markup
      else if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x != null && x !== false) el.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); });
      else el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }
  var $ = function (s) { return document.querySelector(s); };
  function when(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  function money(cents) { return '$' + (Number(cents || 0) / 100).toFixed(2); }
  function mins(s) { s = Number(s || 0); return s < 60 ? s + 's' : Math.floor(s / 60) + 'm ' + (s % 60) + 's'; }
  function chan(c) { var x = CHANNELS[c] || { label: c || '—', color: 'var(--muted)' }; var i = h('i'); i.style.background = x.color; return h('span', { class: 'chan' }, i, x.label); }
  function tierBadge(t) {
    var map = { hot: ['hot', 'Hot'], warm: ['warm', 'Warm'], nurture: ['nurture', 'Nurture'], 'not a fit': ['nofit', 'Not a fit'] };
    var m = map[t] || ['', t || '—'];
    return h('span', { class: 'badge ' + m[0], text: m[1] });
  }
  function convBadge(status) {
    if (status === 'review') return h('span', { class: 'badge review', html: svg('alert') }, 'Needs review');
    if (status === 'unresolved') return h('span', { class: 'badge', html: svg('clock') }, 'Unresolved');
    return h('span', { class: 'badge good', html: svg('check') }, 'OK');
  }
  var OUTCOMES = { booked_call: 'Booked a call', saved_enquiry: 'Saved enquiry', sent_information: 'Sent information', handed_over: 'Handed to a person', answered_questions: 'Answered questions', declined_recording: 'Declined recording', not_a_fit: 'Not a fit', other: 'Other' };

  // ---------- API ----------
  // The API address is stored encrypted with the access key; a wrong key simply fails to decrypt.
  function b64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  function unlock(key) {
    var e = CFG.enc;
    if (!e) return Promise.reject(new Error('not_configured'));
    return crypto.subtle.importKey('raw', new TextEncoder().encode(key), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) { return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(e.salt), iterations: e.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']); })
      .then(function (k) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(e.iv) }, k, b64(e.ct)); })
      .then(function (buf) { state.api = new TextDecoder().decode(buf); return state.api; })
      .catch(function (err) { throw new Error(err && err.message === 'not_configured' ? 'not_configured' : 'unauthorized'); });
  }
  function call(body) {
    return fetch(state.api, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(Object.assign({ key: state.key }, body)) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.ok) throw new Error(r.status === 401 ? 'unauthorized' : (j.error || 'error')); return j; }); });
  }
  function load() {
    $('#refresh').disabled = true;
    return call({ op: 'summary' }).then(function (d) {
      state.data = d;
      $('#updated').textContent = 'Updated ' + new Date(d.generatedAt).toLocaleTimeString();
      renderNav(); render();
    }).catch(function (e) {
      if (e.message === 'unauthorized') { signOut('That access key was not accepted.'); return; }
      $('#updated').textContent = 'Could not load data. Try again.';
    }).finally(function () { $('#refresh').disabled = false; });
  }
  function setStatus(id, status) {
    return call({ op: 'update_status', id: id, status: status }).then(load).catch(function () { alert('Could not update the status.'); });
  }

  // ---------- Login ----------
  function signOut(msg) {
    state.key = null; state.data = null;
    try { sessionStorage.removeItem('tw-admin-key'); } catch (e) {}
    $('#app').classList.add('hidden'); $('#login').classList.remove('hidden');
    $('#login-err').textContent = msg || '';
  }
  $('#login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    state.key = $('#key').value.trim();
    $('#login-err').textContent = '';
    var btn = $('#login-btn'); btn.disabled = true;
    unlock(state.key).then(function () { return call({ op: 'summary' }); }).then(function (d) {
      try { sessionStorage.setItem('tw-admin-key', state.key); } catch (err) {}
      state.data = d; showApp();
    }).catch(function (err) { $('#login-err').textContent = err.message === 'unauthorized' ? 'That access key was not accepted.' : err.message === 'not_configured' ? 'The dashboard is not configured on this copy.' : 'Could not reach the dashboard API.'; })
      .finally(function () { btn.disabled = false; });
  });
  function showApp() {
    $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
    $('#updated').textContent = 'Updated ' + new Date(state.data.generatedAt).toLocaleTimeString();
    renderNav(); render();
  }
  $('#refresh').addEventListener('click', load);
  $('#signout').addEventListener('click', function () { signOut(''); });

  // ---------- Nav ----------
  var TABS = [['overview', 'Overview'], ['leads', 'Leads'], ['meetings', 'Meetings'], ['handovers', 'Handovers'], ['conversations', 'Conversations'], ['outbox', 'Outbox'], ['knowledge', 'Knowledge'], ['usage', 'Usage & costs']];
  function counts() {
    var d = state.data || {};
    return { leads: (d.leads || []).filter(function (l) { return l.status === 'new'; }).length, meetings: (d.bookings || []).filter(function (b) { return b.status !== 'cancelled'; }).length, handovers: (d.handovers || []).filter(function (x) { return x.status === 'open'; }).length, conversations: (d.conversations || []).filter(function (c) { return c.status === 'review'; }).length };
  }
  function renderNav() {
    var nav = $('#tabs'); nav.innerHTML = '';
    var c = counts();
    TABS.forEach(function (t) {
      var b = h('button', { class: 'tab', role: 'tab', 'aria-selected': state.tab === t[0] ? 'true' : 'false', html: svg(t[0]), onclick: function () { state.tab = t[0]; renderNav(); render(); } }, t[1], c[t[0]] ? h('span', { class: 'count', text: String(c[t[0]]) }) : null);
      nav.appendChild(b);
    });
  }

  // ---------- Views ----------
  function render() {
    var root = $('#view'); root.innerHTML = '';
    var title = TABS.filter(function (t) { return t[0] === state.tab; })[0][1];
    $('#title').textContent = title;
    var views = { overview: overview, leads: leads, meetings: meetings, handovers: handovers, conversations: conversations, outbox: outbox, knowledge: knowledge, usage: usage };
    views[state.tab](root);
  }

  function tile(label, value, sub) { return h('div', { class: 'tile' }, h('div', { class: 'label', text: label }), h('div', { class: 'value', text: value }), sub ? h('div', { class: 'sub', text: sub }) : null); }

  function overview(root) {
    var d = state.data, k = d.kpis;
    root.appendChild(h('div', { class: 'tiles' },
      tile('Conversations', String(k.conversations), 'chat, voice and phone'),
      tile('Leads', String(k.leads), k.hot_leads + ' hot'),
      tile('Meetings booked', String(k.bookings), 'intro calls'),
      tile('Open handovers', String(k.open_handovers), 'waiting for a person'),
      tile('Needs review', String(k.needs_review), 'flagged by AI analysis'),
      tile('AI cost to date', money(k.cost_cents), 'measured by Retell')));
    var grid = h('div', { class: 'grid-2' });
    var chartCard = h('div', { class: 'card' });
    var tableBtn = h('button', { class: 'btn ghost sm', text: 'Show table' });
    chartCard.appendChild(h('div', { class: 'card-head' }, h('div', null, h('h2', { text: 'Conversations per day' }), h('p', { class: 'desc', text: 'Last 14 days, by channel' })), h('div', { class: 'actions' }, tableBtn)));
    var chartBox = h('div');
    var tableBox = h('div', { class: 'table-wrap hidden' });
    chartCard.appendChild(chartBox); chartCard.appendChild(tableBox);
    drawDaily(chartBox, d.days);
    tableBox.appendChild(table(['Date', 'Chat', 'Browser voice', 'Phone', 'Cost'], d.days.slice().reverse().map(function (x) { return [x.date, num(x.chat), num(x.web_voice), num(x.phone), num(money(x.cost_cents))]; })));
    tableBtn.addEventListener('click', function () { var show = tableBox.classList.toggle('hidden'); chartBox.classList.toggle('hidden', !show); tableBtn.textContent = show ? 'Show table' : 'Show chart'; });
    grid.appendChild(chartCard);
    var act = h('div', { class: 'card' }, h('h2', { text: 'Latest activity' }), h('p', { class: 'desc', text: 'Everything the assistant did, newest first' }));
    var items = [];
    (d.bookings || []).forEach(function (b) { items.push({ t: b.createdAt, ico: 'meetings', a: 'Meeting booked: ' + b.name + (b.company ? ' (' + b.company + ')' : ''), b: b.ref + ' · ' + (TEAMS[b.team] || b.team) }); });
    (d.leads || []).forEach(function (l) { items.push({ t: l.createdAt, ico: 'leads', a: 'New ' + l.tier + ' lead: ' + l.name + (l.company ? ' (' + l.company + ')' : ''), b: 'Score ' + l.score + ' · routed to ' + (TEAMS[l.team] || l.team) }); });
    (d.handovers || []).forEach(function (x) { items.push({ t: x.createdAt, ico: 'handovers', a: 'Handover requested: ' + x.name, b: (TEAMS[x.team] || x.team) + ' · reply ' + (x.reply_by || '') }); });
    items.sort(function (a, b) { return String(b.t).localeCompare(String(a.t)); });
    var ul = h('ul', { class: 'activity' });
    items.slice(0, 7).forEach(function (i) { ul.appendChild(h('li', null, h('span', { class: 'ico', html: svg(i.ico) }), h('div', { class: 'what' }, i.a, h('span', { text: i.b })), h('span', { class: 'when', text: when(i.t) }))); });
    if (!items.length) ul.appendChild(h('li', { class: 'empty', text: 'Nothing yet. Try the assistant on the website.' }));
    act.appendChild(ul);
    grid.appendChild(act);
    root.appendChild(grid);
  }
  function num(v) { return { num: true, v: String(v) }; }

  function drawDaily(box, days) {
    var keys = ['chat', 'web_voice', 'phone'];
    var legend = h('div', { class: 'legend' });
    keys.forEach(function (k) { var i = h('i'); i.style.background = CHANNELS[k].color; legend.appendChild(h('span', null, i, CHANNELS[k].label)); });
    box.appendChild(legend);
    var wrap = h('div', { class: 'chart viz-root' });
    box.appendChild(wrap);
    var W = 640, H = 240, L = 30, R = 8, T = 10, B = 26;
    var max = Math.max(1, Math.max.apply(null, days.map(function (d) { return d.chat + d.web_voice + d.phone; })));
    var step = max <= 4 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : Math.ceil(max / 5 / 5) * 5;
    var top = Math.ceil(max / step) * step;
    var y = function (v) { return T + (H - T - B) * (1 - v / top); };
    var band = (W - L - R) / days.length, bw = Math.min(24, band * 0.6);
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 ' + W + ' ' + H); s.setAttribute('role', 'img'); s.setAttribute('aria-label', 'Conversations per day by channel, last 14 days. Table view available.');
    function el(tag, a, parent) { var e = document.createElementNS(ns, tag); Object.keys(a).forEach(function (k) { e.setAttribute(k, a[k]); }); (parent || s).appendChild(e); return e; }
    for (var v = 0; v <= top; v += step) {
      el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: 'var(--grid)', 'stroke-width': 1 });
      var t = el('text', { x: L - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'tick' }); t.textContent = String(v);
    }
    var tip = h('div', { class: 'tooltip hidden' });
    wrap.appendChild(tip);
    days.forEach(function (d, i) {
      var cx = L + band * i + band / 2, x = cx - bw / 2;
      var g = el('g', { class: 'col', tabindex: 0, 'aria-label': d.date + ': ' + d.chat + ' chat, ' + d.web_voice + ' browser voice, ' + d.phone + ' phone' });
      el('rect', { class: 'hit', x: L + band * i, y: T, width: band, height: H - T - B, fill: 'transparent' }, g);
      var acc = 0;
      var segs = keys.filter(function (k) { return d[k] > 0; });
      segs.forEach(function (k, j) {
        var y0 = y(acc), y1 = y(acc + d[k]);
        acc += d[k];
        var hgt = Math.max(0, y0 - y1 - (j > 0 ? 2 : 0));
        var isTop = j === segs.length - 1;
        var r = isTop ? Math.min(4, hgt / 2) : 0;
        var yTop = y1, yBot = y1 + hgt;
        // Square at the baseline, 4px rounded only on the top segment's data end.
        var p = 'M' + x + ',' + yBot + ' L' + x + ',' + (yTop + r) + (r ? ' Q' + x + ',' + yTop + ' ' + (x + r) + ',' + yTop : '') + ' L' + (x + bw - r) + ',' + yTop + (r ? ' Q' + (x + bw) + ',' + yTop + ' ' + (x + bw) + ',' + (yTop + r) : '') + ' L' + (x + bw) + ',' + yBot + ' Z';
        el('path', { d: p, fill: CHANNELS[k].color, class: 'seg' }, g);
      });
      if (i % 2 === 0 || days.length <= 7) { var lbl = el('text', { x: cx, y: H - 8, 'text-anchor': 'middle', class: 'tick' }); lbl.textContent = new Date(d.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
      function show() {
        tip.innerHTML = '';
        tip.appendChild(h('div', { class: 't', text: new Date(d.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) }));
        keys.forEach(function (k) { var key = h('span', { class: 'key' }); key.style.background = CHANNELS[k].color; tip.appendChild(h('div', { class: 'row' }, key, h('b', { text: String(d[k]) }), CHANNELS[k].label)); });
        tip.appendChild(h('div', { class: 'row' }, h('span', { class: 'key' }), h('b', { text: money(d.cost_cents) }), 'AI cost'));
        tip.classList.remove('hidden');
        var bb = wrap.getBoundingClientRect(), px = (cx / W) * bb.width;
        tip.style.left = Math.min(Math.max(0, px - 80), bb.width - 170) + 'px';
        tip.style.top = '28px';
      }
      g.addEventListener('pointerenter', show); g.addEventListener('focus', show);
      g.addEventListener('pointerleave', function () { tip.classList.add('hidden'); }); g.addEventListener('blur', function () { tip.classList.add('hidden'); });
    });
    el('line', { x1: L, x2: W - R, y1: y(0), y2: y(0), stroke: '#c9d1cf', 'stroke-width': 1 });
    wrap.appendChild(s);
  }

  function table(head, rows, onRow) {
    var t = h('table'), th = h('tr');
    head.forEach(function (x) { th.appendChild(h('th', { text: x })); });
    t.appendChild(h('thead', null, th));
    var tb = h('tbody');
    rows.forEach(function (r, i) {
      var tr = h('tr', onRow ? { class: 'clickable', tabindex: 0 } : null);
      r.forEach(function (c) {
        if (c && c.num) tr.appendChild(h('td', { class: 'num', text: c.v }));
        else if (c instanceof Node) tr.appendChild(h('td', null, c));
        else if (c && c.main !== undefined) tr.appendChild(h('td', null, c.main, h('span', { class: 'sub', text: c.sub || '' })));
        else tr.appendChild(h('td', { text: c == null ? '' : String(c) }));
      });
      if (onRow) { tr.addEventListener('click', function (e) { if (!e.target.closest('select')) onRow(i); }); tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') onRow(i); }); }
      tb.appendChild(tr);
    });
    if (!rows.length) tb.appendChild(h('tr', null, h('td', { class: 'empty', colspan: head.length, text: 'Nothing here yet.' })));
    t.appendChild(tb);
    return h('div', { class: 'table-wrap' }, t);
  }
  function statusSelect(rec, options) {
    var s = h('select', { class: 'status', 'aria-label': 'Status' });
    options.forEach(function (o) { var opt = h('option', { value: o, text: o }); if (o === rec.status) opt.selected = true; s.appendChild(opt); });
    s.addEventListener('change', function () { setStatus(rec.id, s.value); });
    return s;
  }
  function card(title, desc, content) { return h('div', { class: 'card' }, h('h2', { text: title }), desc ? h('p', { class: 'desc', text: desc }) : null, content); }

  function leads(root) {
    var L = state.data.leads;
    root.appendChild(card('Leads', 'Everyone who saved an enquiry or booked a call. Scored 0–100 from company size, timeline, budget and service fit, then routed to a team. Click a row for details.', table(['Received', 'Contact', 'Service', 'Score', 'Routed to', 'Channel', 'Status'], L.map(function (l) {
      return [when(l.createdAt), { main: l.name + (l.company ? ' · ' + l.company : ''), sub: l.email || l.phone }, SERVICES[l.service] || l.service || '—', h('span', null, tierBadge(l.tier), ' ' + l.score), TEAMS[l.team] || l.team, chan(l.channel), statusSelect(l, ['new', 'booked', 'contacted', 'won', 'lost'])];
    }), function (i) { var l = L[i]; var det = l.details || {}; drawer('Lead · ' + l.name, l.ref + ' · ' + when(l.createdAt), [kv([['Company', l.company], ['Role', det.role], ['Email', l.email], ['Phone', l.phone], ['Company size', det.company_size], ['Service', SERVICES[l.service] || l.service], ['Timeline', det.timeline], ['Budget', det.budget_range], ['Prefers', det.preferred_contact], ['Score', l.score + ' (' + l.tier + ')'], ['Routed to', TEAMS[l.team] || l.team], ['Conversation', l.conversation_id]]), h('div', { class: 'section-title', text: 'What they need' }), h('p', { text: l.summary })]); })));
  }
  function meetings(root) {
    var M = state.data.bookings;
    root.appendChild(card('Meetings', 'Intro calls booked by the assistant into the Google Calendar, after the visitor confirmed.', table(['Booked', 'When (Central)', 'Contact', 'Topic', 'Team', 'Ref', 'Status'], M.map(function (b) {
      var start = b.start_iso ? new Date(b.start_iso).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
      return [when(b.createdAt), { main: start, sub: b.visitor_timezone ? 'visitor in ' + b.visitor_timezone : '' }, { main: b.name + (b.company ? ' · ' + b.company : ''), sub: b.email }, b.topic || b.summary, TEAMS[b.team] || b.team, b.ref, statusSelect(b, ['booked', 'cancelled'])];
    }))));
  }
  function handovers(root) {
    var X = state.data.handovers;
    root.appendChild(card('Handovers', 'Requests for a person. The assistant told each visitor who would reply and by when.', table(['Received', 'Contact', 'Reason', 'Team', 'Reply promised', 'Urgency', 'Status'], X.map(function (x) {
      return [when(x.createdAt), { main: x.name, sub: x.email || x.phone }, { main: (x.details && x.details.reason) || '', sub: (x.details && x.details.category) || '' }, TEAMS[x.team] || x.team, x.reply_by, x.tier === 'urgent' ? h('span', { class: 'badge hot', text: 'Urgent' }) : 'Normal', statusSelect(x, ['open', 'resolved'])];
    }), function (i) { var x = X[i]; drawer('Handover · ' + x.name, x.ref + ' · ' + when(x.createdAt), [kv([['Email', x.email], ['Phone', x.phone], ['Category', x.details && x.details.category], ['Team', TEAMS[x.team] || x.team], ['Reply promised', x.reply_by], ['Channel', (CHANNELS[x.channel] || {}).label], ['Conversation', x.conversation_id]]), h('div', { class: 'section-title', text: 'Summary for the team' }), h('p', { text: x.summary })]); })));
  }
  function conversations(root) {
    var C = state.data.conversations;
    root.appendChild(card('Conversations', 'Every finished chat and call, with Retell’s summary, outcome and measured cost. Chats appear about 3 minutes after the visitor stops typing, calls about a minute after they end. Click one for the transcript.', table(['Ended', 'Channel', 'Summary', 'Outcome', 'Length', 'Cost', 'Check'], C.map(function (c) {
      return [when(c.createdAt), chan(c.channel), { main: c.name ? c.name + (c.company ? ' · ' + c.company : '') : '', sub: c.summary }, OUTCOMES[c.tier] || c.tier || '—', num(c.channel === 'chat' ? c.score + ' msgs' : mins(c.duration_s)), num(money(c.cost_cents)), convBadge(c.status)];
    }), function (i) {
      var c = C[i], body = [];
      body.push(kv([['Channel', (CHANNELS[c.channel] || {}).label], ['Outcome', OUTCOMES[c.tier] || c.tier], ['Sentiment', c.sentiment], ['Length', c.channel === 'chat' ? c.score + ' messages' : mins(c.duration_s)], ['Cost', money(c.cost_cents)], ['Phone', c.phone], ['Ended by', c.ended], ['ID', c.ref]]));
      if (c.status === 'review') body.push(h('div', { class: 'demo-note', html: svg('alert') }, 'Retell’s post-conversation analysis flagged this one for review (possible unsupported claim, unconfirmed action or an unhappy visitor).'));
      body.push(h('div', { class: 'section-title', text: 'Summary' }), h('p', { text: c.summary }));
      if (c.recording_url) { body.push(h('div', { class: 'section-title', text: 'Recording' })); body.push(h('audio', { controls: 'controls', preload: 'none', src: c.recording_url })); }
      body.push(h('div', { class: 'section-title', text: 'Transcript' }));
      var tr = h('div', { class: 'transcript' });
      (c.messages || []).forEach(function (m) { tr.appendChild(h('div', { class: 'msg ' + (m.role === 'user' ? 'user' : 'agent'), text: m.content })); });
      body.push(tr);
      if ((c.tools || []).length) { body.push(h('div', { class: 'section-title', text: 'Actions the assistant took' })); var tl = h('div', { class: 'transcript' }); c.tools.forEach(function (t) { tl.appendChild(h('div', { class: 'msg tool', text: (t.role === 'tool_call_invocation' ? '→ ' + (t.name || '') + ' ' : '← result ') + t.content })); }); body.push(tl); }
      drawer('Conversation · ' + when(c.createdAt), c.summary ? c.summary.slice(0, 90) + (c.summary.length > 90 ? '…' : '') : '', body);
    })));
  }
  function outbox(root) {
    var O = state.data.outbox;
    root.appendChild(h('div', { class: 'demo-note', html: svg('info') }, 'Demo guard: emails to visitors are written and stored here but not sent, so this public demo never emails strangers. Team alerts are sent for real. In a client build these go out from the client’s own domain.'));
    root.appendChild(card('Outbox', 'Follow-up and confirmation emails prepared by the workflows from approved content. Click one to preview it.', table(['Prepared', 'To', 'Subject', 'Type', 'Status'], O.map(function (o) {
      return [when(o.createdAt), o.to, o.subject, o.kind === 'booking' ? 'Booking confirmation' : 'Service information', o.status === 'sent' ? h('span', { class: 'badge good', html: svg('check') }, 'Sent') : h('span', { class: 'badge', html: svg('clock') }, 'Held (demo)')];
    }), function (i) { var o = O[i]; var f = h('iframe', { sandbox: '', title: 'Email preview' }); f.srcdoc = o.html; drawer(o.subject, 'To ' + o.to + ' · ' + o.ref, [f]); })));
  }
  function knowledge(root) {
    var box = h('div');
    root.appendChild(h('div', { class: 'demo-note', html: svg('info') }, 'Read-only in this demo. These documents are generated from the same content file as the website and uploaded to the agents’ knowledge base, so the site and the AI never disagree. In a client build, editors change them in the CMS and they sync automatically.'));
    root.appendChild(card('Knowledge base', 'What the chat and voice agents are allowed to know.', box));
    function show(k) {
      box.appendChild(h('p', { class: 'desc', text: k.documents.length + ' documents · last built ' + new Date(k.builtAt).toLocaleString() }));
      k.documents.forEach(function (d) { box.appendChild(h('details', { class: 'doc' }, h('summary', { text: d.title }), h('pre', { text: d.text }))); });
    }
    if (state.knowledge) show(state.knowledge);
    else fetch('../assets/knowledge.json').then(function (r) { return r.json(); }).then(function (k) { state.knowledge = k; show(k); }).catch(function () { box.appendChild(h('p', { class: 'empty', text: 'Could not load the knowledge documents.' })); });
  }
  function usage(root) {
    var u = state.data.usage;
    var rows = ['chat', 'web_voice', 'phone'].map(function (k) {
      var x = u[k], avg = x.conversations ? x.cost_cents / x.conversations : 0;
      var unit = k === 'chat' ? (x.messages ? money(x.cost_cents / x.messages * 2) + ' per AI reply (approx.)' : '—') : (x.seconds ? money(x.cost_cents / (x.seconds / 60)) + ' per minute' : '—');
      return [chan(k), num(x.conversations), num(k === 'chat' ? x.messages + ' msgs' : mins(x.seconds)), num(money(x.cost_cents)), num(money(avg)), unit, num(money(x.month_cost_cents))];
    });
    root.appendChild(card('AI usage and cost', 'Measured per conversation by Retell (speech, language model, voice, knowledge base and analysis). Telephony for callbacks is included in phone costs.', table(['Channel', 'Conversations', 'Volume', 'Total', 'Avg per conversation', 'Unit cost', 'This month'], rows)));
    var chatAvg = u.chat.conversations ? u.chat.cost_cents / u.chat.conversations : 0;
    var vmin = u.web_voice.seconds ? u.web_voice.cost_cents / (u.web_voice.seconds / 60) : 0;
    root.appendChild(card('What a month could cost at these rates', 'Projection from the measured averages above. Fixed platform fees (hosting, n8n, phone number) are separate.', table(['Scenario', 'Estimate'], [
      ['300 chats', chatAvg ? money(chatAvg * 300) : 'needs chat data'],
      ['200 browser-voice minutes', vmin ? money(vmin * 200) : 'needs voice data'],
      ['Both together', chatAvg && vmin ? money(chatAvg * 300 + vmin * 200) : '—'],
    ])));
  }

  function kv(pairs) { var dl = h('dl', { class: 'kv' }); pairs.forEach(function (p) { if (p[1] == null || p[1] === '') return; dl.appendChild(h('dt', { text: p[0] })); dl.appendChild(h('dd', { text: String(p[1]) })); }); return dl; }
  function drawer(title, sub, content) {
    closeDrawer();
    var bg = h('div', { class: 'drawer-bg', id: 'drawer-bg', onclick: closeDrawer });
    var closeBtn = h('button', { class: 'btn ghost sm', text: 'Close', onclick: closeDrawer });
    var d = h('aside', { class: 'drawer', id: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, h('header', null, h('div', null, h('h3', { text: title }), h('div', { class: 'sub', text: sub || '' })), closeBtn), h('div', { class: 'body' }, content));
    document.body.appendChild(bg); document.body.appendChild(d); closeBtn.focus();
  }
  function closeDrawer() { ['drawer', 'drawer-bg'].forEach(function (id) { var e = document.getElementById(id); if (e) e.remove(); }); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

  // ---------- Start ----------
  try { var saved = sessionStorage.getItem('tw-admin-key'); if (saved) { state.key = saved; unlock(saved).then(function () { return call({ op: 'summary' }); }).then(function (d) { state.data = d; showApp(); }).catch(function () { signOut(''); }); } } catch (e) {}
  if (!CFG.enc) { $('#login-err').textContent = 'The dashboard is not configured on this copy.'; }
})();
