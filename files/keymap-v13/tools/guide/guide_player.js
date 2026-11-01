// ===== guide player: runs the real engine (engine.js) on a virtual clock and draws the board =====
const GAP = 330;
const kidx = k => {
  if (typeof k === 'number') return k;
  const m = /^R(\d+)C(\d+)$/.exec(k);
  if (!m || +m[1] < 1 || +m[1] > 10 || +m[2] < 1 || +m[2] > 10) throw new Error('bad key name: ' + k);
  return (m[1] - 1) * 10 + (m[2] - 1);
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const $q = (s, r) => (r || document).querySelector(s);

// ---- a demo is a list of steps; each step has a caption (say) and actions (do) ----
// actions: 'R3C1' (tap) | ['tap', key, holdMs, gapMs] | ['taps', key, n, gapMs] | ['dtap', key] (double tap)
//          ['chord', [keys], holdMs] | ['hold', key, [actions], preMs, postMs] | ['down', key, waitMs] | ['up', key, waitMs] | ['wait', ms]
function compile(steps) {
  const ev = [], caps = []; let t = 0;
  const press = i => ev.push({t, k: 'p', i}), rel = i => ev.push({t, k: 'r', i});
  function tap(k, hold = 150, gap = GAP) { const i = kidx(k); press(i); t += hold; rel(i); t += gap; }
  function act(a) {
    if (typeof a === 'string' || typeof a === 'number') return tap(a);
    const op = a[0];
    if (op === 'tap') tap(a[1], a[2], a[3]);
    else if (op === 'taps') for (let n = 0; n < a[2]; n++) tap(a[1], 110, a[3] || 240);
    else if (op === 'dtap') { tap(a[1], 60, 70); tap(a[1], 60, GAP); }
    else if (op === 'chord') { const ks = a[1].map(kidx); ks.forEach(press); t += a[2] || 900; ks.forEach(rel); t += GAP; }
    else if (op === 'hold') { const i = kidx(a[1]); press(i); t += a[3] === undefined ? 250 : a[3]; a[2].forEach(act); t += a[4] === undefined ? 150 : a[4]; rel(i); t += GAP; }
    else if (op === 'wait') t += a[1];
    else if (op === 'down') { press(kidx(a[1])); t += a[2] === undefined ? 450 : a[2]; }
    else if (op === 'up') { rel(kidx(a[1])); t += a[2] === undefined ? 450 : a[2]; }
    else throw new Error('unknown action ' + op);
  }
  steps.forEach((s, n) => {
    caps.push({t, text: s.say || '', keys: (s.look || []).map(kidx), n: n + 1});
    (s.do || []).forEach(act);
    t += s.after === undefined ? 500 : s.after;
  });
  return {ev, caps, dur: t};
}
// go to a layer / page: Controls Shift + layer-up, then Controls Shift + page-up
function gotoActions(l, p) {
  const out = [];
  if (l) out.push(['hold', 'R1C3', Array.from({length: l}, () => ['tap', 'R1C10', 70, 140]), 60, 60]);
  if (p) out.push(['hold', 'R1C3', Array.from({length: p}, () => ['tap', 'R1C9', 70, 140]), 60, 60]);
  return out;
}
function describeMsg(m) {
  switch (m.type) {
    case 'on':  return 'Note ON   ch' + (m.ch + 1) + '  ' + noteName(m.a) + '  vel ' + m.b;
    case 'off': return 'Note OFF  ch' + (m.ch + 1) + '  ' + noteName(m.a);
    case 'cc':  return 'CC ' + String(m.a).padEnd(3) + ' ch' + (m.ch + 1) + '  value ' + m.b;
    case 'pc':  return 'Program   ch' + (m.ch + 1) + '  ' + m.a;
    case 'pb':  return (m.mpe ? 'MPE bend  ch' : 'Pitch bend ch') + (m.ch + 1) + '  ' + m.a;
    case 'key': return 'Computer key  ' + m.text;
    default:    return m.text || '';
  }
}

// ---- a run = one engine on a virtual clock ----
function newRun(demo, where) {
  let T = 0, seed = 12345;
  const msgs = [];
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;
  const E = createEngine({now: () => T, random: rnd, state: parseExport(LAYOUT), send: m => { if (m.type !== 'keyup') msgs.push({t: T, m}); }});
  const face = makeFace(E);
  let ev = [], ptr = 0, base = 0;
  const step = () => {
    T += 2;
    while (ptr < ev.length && ev[ptr].t + base <= T) { const e = ev[ptr++]; if (e.k === 'p') E.press(e.i); else E.release(e.i); }
    E.tick();
  };
  // setup (silent): go to the page, then the demo's own setup
  ev = compile([{do: [...gotoActions(where[0], where[1]), ...(demo.setup || [])], after: 0}]).ev;
  ptr = 0; base = 0;
  const setupEnd = ev.length ? ev[ev.length - 1].t + 1500 : 0;
  while (T < setupEnd) step();
  msgs.length = 0;
  const comp = compile(demo.steps || []);
  ev = comp.ev; ptr = 0; base = T;
  const tail = demo.tail === undefined ? 1500 : demo.tail;
  return {E, face, msgs, comp, dur: comp.dur + tail, t0: base, pos: 0,
    advance(target) { while (T < base + target) step(); this.pos = target; }};
}

// ---- board ----
const PITCH = 9.65, CELL = 8.75;   // in cqw: board width 95.6, 10 cells, gap 0.9
function makeBoard(holder) {
  holder.innerHTML = '<div class="boardwrap"><div class="board"></div></div>';
  const board = $q('.board', holder), keys = [];
  for (let i = 0; i < 100; i++) {
    const k = document.createElement('div'); k.className = 'key'; k.innerHTML = '<span class="m"></span><span class="s"></span>';
    board.appendChild(k); keys.push(k);
  }
  return {board, keys, cache: new Array(100).fill(''), wrap: $q('.boardwrap', holder)};
}
function addOverlays(b, zones, marks, colors) {
  (zones || []).forEach(z => {
    const [r1, r2] = z.r, [c1, c2] = z.c, col = /^#/.test(z.color || '') ? z.color : colors[z.tone || 0];
    const d = document.createElement('div'); d.className = 'zone'; d.style.setProperty('--zc', col);
    d.dataset.r = r1 + ',' + r2; d.dataset.c = c1 + ',' + c2;
    d.innerHTML = '<span>' + esc(z.label) + '</span>'; b.board.appendChild(d);
  });
  (marks || []).forEach((m, n) => {
    const [, r, c] = /^R(\d+)C(\d+)$/.exec(m.key).map(Number);
    const d = document.createElement('div'); d.className = 'mark';
    d.dataset.r = r; d.dataset.c = c;
    d.textContent = n + 1; b.board.appendChild(d);
  });
  // place them from the real key rectangles (the keys are not always square)
  const place = () => {
    const K = b.keys, bw = b.board.clientWidth;
    if (!bw) return;
    b.board.querySelectorAll('.zone,.mark').forEach(d => {
      const [r1, r2] = d.dataset.r.split(',').map(Number), [c1, c2] = d.dataset.c.split(',').map(Number);
      const a = K[(r1 - 1) * 10 + c1 - 1], z = K[((r2 || r1) - 1) * 10 + (c2 || c1) - 1];
      if (d.classList.contains('mark')) {
        d.style.left = (a.offsetLeft + a.offsetWidth * 0.85) + 'px'; d.style.top = (a.offsetTop + a.offsetHeight * 0.15) + 'px';
      } else {
        const pad = 3;
        d.style.left = (a.offsetLeft - pad) + 'px'; d.style.top = (a.offsetTop - pad) + 'px';
        d.style.width = (z.offsetLeft + z.offsetWidth - a.offsetLeft + 2 * pad) + 'px'; d.style.height = (z.offsetTop + z.offsetHeight - a.offsetTop + 2 * pad) + 'px';
      }
    });
  };
  place();
  if (window.ResizeObserver) new ResizeObserver(place).observe(b.board); else window.addEventListener('resize', place);
}
function paint(b, run, look) {
  const E = run.E, st = E.status(), pg = E.state.pages[st.page];
  for (let i = 0; i < 100; i++) {
    const c = E.resolve(i), k = b.keys[i], led = E.led(i), pad = isPad(i);
    let cls = 'key';
    if (led && (led[0] + led[1] + led[2]) > 0) cls += ' lit';
    else if (led || pad) cls += ' dark';
    else { const q = run.face.kindClass(c); if (q) cls += ' ' + q; }
    if (E.text && pad && padRC(i).r <= 4) cls += ' text';
    if (E.down[i]) cls += ' down';
    if (look && look.includes(i)) cls += ' look';
    if (k.className !== cls) k.className = cls;
    if (led) {
      const css = 'rgb(' + led.join(',') + ')';
      if (k.style.getPropertyValue('--led') !== css) {
        k.style.setProperty('--led', css);
        k.style.setProperty('--ledtext', (led[0] * .3 + led[1] * .59 + led[2] * .11) > 120 ? '#111' : '#f2f2f2');
      }
    }
    const f = run.face.face(c), key = f[0] + '|' + f[1];
    if (b.cache[i] !== key) { b.cache[i] = key; k.firstChild.textContent = f[0]; k.lastChild.textContent = f[1]; }
  }
}

// ---- one animated card (board + controls + caption + monitor) ----
let ACTIVE = null;   // the card that is playing now
function makeStage(host, opts) {
  // opts: {where:[layer,page], demo, zones, marks, id}
  const demo = opts.demo || {steps: []};
  const root = document.createElement('div'); root.className = 'stage';
  root.innerHTML = '<div class="bh"></div><ul class="legend"></ul>' +
    '<div class="ctl"><button class="go" type="button">Play</button><button class="back" type="button" aria-label="Previous step">&#9664; Step</button><button class="fwd" type="button" aria-label="Next step">Step &#9654;</button>' +
    '<input class="scrub" type="range" min="0" max="1000" value="0" aria-label="Position in the demo"><select class="spd" aria-label="Speed"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="1.5">1.5x</option><option value="2">2x</option></select></div>' +
    '<div class="cap" aria-live="polite"></div><div class="mon"><div class="h">What the keyboard sends</div></div>';
  host.appendChild(root);
  const b = makeBoard($q('.bh', root));
  const legend = $q('.legend', root);
  (opts.marks || []).forEach((m, n) => { const li = document.createElement('li'); li.innerHTML = '<b class="num">' + (n + 1) + '</b><span>' + m.text + '</span>'; legend.appendChild(li); });
  if (!(opts.marks || []).length) legend.remove();
  const goBtn = $q('.go', root), scrub = $q('.scrub', root), capEl = $q('.cap', root), mon = $q('.mon', root), spd = $q('.spd', root);
  let run = null, raf = 0, playing = false, last = 0, pos = 0, overlaysDone = false, comp = null;
  const colors = () => run.E.state.pages[run.E.status().page].colors;
  function ensure() {
    if (run) return;
    run = newRun(demo, opts.where || [0, 0]); comp = run.comp;
    if (!overlaysDone) { addOverlays(b, opts.zones, opts.marks, colors()); overlaysDone = true; }
    root.dataset.ready = '1';
  }
  function capAt(t) { let c = comp.caps[0]; for (const x of comp.caps) if (x.t <= t) c = x; return c; }
  function show() {
    const c = capAt(pos);
    paint(b, run, c ? c.keys : null);
    capEl.innerHTML = c && c.text ? '<span class="n">' + c.n + '/' + comp.caps.length + '</span>' + c.text : '<span class="n">Ready</span>Press Play to watch.';
    const recent = run.msgs.filter(x => !(x.m.type === 'pb' && !x.m.mpe && x.m.a !== 0 && x.m.a !== 8191 && x.m.a !== -8192)).slice(-5).reverse();
    mon.innerHTML = '<div class="h">What the keyboard sends</div>' + (recent.length ? recent.map(x => '<div>' + esc(describeMsg(x.m)) + '</div>').join('') : '<div>(nothing yet)</div>');
    scrub.value = Math.round(pos / run.dur * 1000);
    goBtn.textContent = playing ? 'Pause' : (pos >= run.dur - 1 ? 'Replay' : 'Play');
    root.classList.toggle('playing', playing);
  }
  function seek(t) {
    ensure();
    t = Math.max(0, Math.min(run.dur, t));
    if (t < pos) { run = newRun(demo, opts.where || [0, 0]); comp = run.comp; }
    run.advance(t); pos = t; show();
  }
  function frame(now) {
    if (!playing) return;
    const dt = Math.min(80, now - last) * parseFloat(spd.value); last = now;
    pos = Math.min(run.dur, pos + dt); run.advance(pos); show();
    if (pos >= run.dur) { playing = false; goBtn.textContent = 'Replay'; return; }
    raf = requestAnimationFrame(frame);
  }
  function play() {
    ensure();
    if (ACTIVE && ACTIVE !== api) ACTIVE.pause();
    if (pos >= run.dur - 1) seek(0);
    playing = true; ACTIVE = api; last = performance.now(); raf = requestAnimationFrame(frame); show();
  }
  function pause() { playing = false; cancelAnimationFrame(raf); if (run) show(); }
  const api = {play, pause, seek, root, ensure, get playing() { return playing; }, get dur() { return run ? run.dur : 0; }};
  goBtn.addEventListener('click', () => (playing ? pause() : play()));
  scrub.addEventListener('input', () => { const was = playing; pause(); ensure(); seek(scrub.value / 1000 * run.dur); if (was) play(); });
  $q('.fwd', root).addEventListener('click', () => { pause(); ensure(); const n = comp.caps.find(c => c.t > pos + 5); seek(n ? n.t + 1 : run.dur); });
  $q('.back', root).addEventListener('click', () => { pause(); ensure(); let p = comp.caps.filter(c => c.t < pos - 800).pop(); seek(p ? p.t + 1 : 0); });
  api.seek = seek;
  return api;
}

// ---- build the whole page ----
const ST = parseExport(LAYOUT);
const PAGE_ID = (l, s) => 'L' + (l + 1) + 'P' + (s + 1);
const STAGES = {};
function refList(pg) {
  const rows = [];
  const add = (cells, tag) => cells.forEach((c, i) => { if (c.note && c.note.trim()) rows.push('<div><span class="k">' + keyName(i) + (tag ? ' + Shift' : '') + '</span> ' + esc(c.note) + '</div>'); });
  add(pg.cells, false); add(pg.shift, true);
  return rows.length ? '<details class="ref"><summary>Every key on this page (from your layout file)</summary><div class="refbody">' + rows.join('') + '</div></details>' : '';
}
// static labelled map of all 100 keys (the keyboard has no printed labels): cellFn(i) -> a cell, or null for an empty key
let KM_FACE = null;
function keyMapHtml(cellFn, title, open) {
  if (!KM_FACE) KM_FACE = makeFace(createEngine({now: () => 0, random: () => 0.5, state: ST, send: () => {}}));
  let h = '<div class="sg km" style="grid-template-columns:auto repeat(10,minmax(0,1fr))"><span></span>';
  for (let c = 1; c <= 10; c++) h += '<span class="sgl" style="text-align:center">C' + c + '</span>';
  for (let r = 0; r < 10; r++) {
    h += '<span class="sgl">R' + (r + 1) + '</span>';
    for (let c = 0; c < 10; c++) {
      const i = r * 10 + c; let cell = cellFn(i);
      if (cell && cell.c) cell = cell.c;
      if (!cell || !cell.type) { h += '<b class="n"></b>'; continue; }
      const f = KM_FACE.face(cell), q = KM_FACE.kindClass(cell);
      h += '<b class="' + (q === 'fn' ? 'a' : q === 'cc' ? 'c' : q === 'none' ? 'n' : 'k') + '" title="' + esc(keyName(i) + (cell.note ? ': ' + cell.note : '')) + '">' + esc(f[0]) + (f[1] ? '<i>' + esc(f[1]) + '</i>' : '') + '</b>';
    }
  }
  return '<details class="ref"' + (open ? ' open' : '') + '><summary>' + title + '</summary><div class="refbody" style="max-height:none">' + h + '</div>' +
    '<div class="sgn" style="padding:0 14px 12px">Colours show the kind of key (amber = note, chord or built-in control, blue = sends a MIDI message or a computer shortcut, grey = other); hatched = does nothing. Hover a key for its description.</div></details>';
}
function listHtml(tag, items) { return items && items.length ? '<' + tag + '>' + items.map(x => '<li>' + x + '</li>').join('') + '</' + tag + '>' : ''; }
function buildCard(c, where, pg, badge) {
  where = where || [0, 0];
  const card = document.createElement('article'); card.className = 'card'; card.id = c.id;
  const text = document.createElement('div'); text.className = 'txt';
  text.innerHTML = '<div class="badge">' + esc(badge) + '</div><h3>' + esc(c.title || pg.name) + '</h3>' +
    (c.what ? '<p class="what">' + c.what + '</p>' : '') +
    (c.steps ? '<h4>How to use it</h4>' + listHtml('ol', c.steps) : '') +
    (c.tips && c.tips.length ? '<h4>Good to know</h4>' + c.tips.map(t => '<div class="tip">' + t + '</div>').join('') : '') +
    (c.warn ? c.warn.map(t => '<div class="tip warn">' + t + '</div>').join('') : '') +
    (c.extra || '') + (c.ctrlMap ? keyMapHtml(i => (isPad(i) ? null : ST.controls.base[i]), 'Key map: the control keys (shared by every page)', true) : '') +
    (pg ? keyMapHtml(i => resolveCell(ST, pageIndex(where[0], where[1]), i, false), 'Key map: every key on this page (labels)', true) + refList(pg) : '');
  const stageHost = document.createElement('div');
  card.appendChild(text); card.appendChild(stageHost);
  return {card, stageHost};
}
function buildPage() {
  const main = $q('#main'), toc = $q('#toc'), tocHtml = [];
  const lazy = [];
  const addStage = (host, id, opts) => lazy.push({host, id, opts});

  // intro sections
  CONTENT.intro.forEach(s => {
    const sec = document.createElement('section'); sec.className = 'sec'; sec.id = s.id;
    if (s.hero) { sec.innerHTML = '<div class="hero"><h2>' + s.title + '</h2>' + s.html + '</div>'; main.appendChild(sec); tocHtml.push('<a href="#' + s.id + '">' + esc(s.nav || s.title) + '</a>'); if (s.map) sec.appendChild(buildMap()); if (s.after) { const d = document.createElement('div'); d.innerHTML = s.after; sec.appendChild(d); } return; }
    const {card, stageHost} = buildCard(Object.assign({id: s.id + '-card'}, s), s.where, null, s.kicker || 'Basics');
    if (s.table) { const t = document.createElement('div'); t.innerHTML = s.table(); card.querySelector('.txt').appendChild(t); }
    sec.innerHTML = '<p class="kicker">' + esc(s.kicker || 'Basics') + '</p><h2 class="title">' + esc(s.title) + '</h2>' + (s.tagline ? '<p class="tag">' + s.tagline + '</p>' : '');
    card.querySelector('.badge').remove(); card.querySelector('h3').remove();
    sec.appendChild(card); main.appendChild(sec);
    tocHtml.push('<a href="#' + s.id + '">' + esc(s.nav || s.title) + '</a>');
    addStage(stageHost, s.id, {where: s.where || [0, 0], demo: s.demo, zones: s.zones, marks: s.marks});
  });
  // layers and pages
  tocHtml.push('<h2>Layers and pages</h2>');
  for (let l = 0; l < NUM_LAYERS; l++) {
    const L = CONTENT.layers[l];
    const head = document.createElement('div'); head.className = 'layer-head'; head.id = 'layer' + (l + 1);
    head.innerHTML = '<p class="kicker">Layer ' + (l + 1) + '</p><h2>' + esc(L.title) + '</h2><p>' + L.intro + '</p>';
    main.appendChild(head);
    tocHtml.push('<h2>Layer ' + (l + 1) + ' &middot; ' + esc(L.short) + '</h2>');
    for (let s = 0; s < LAYER_PAGES[l]; s++) {
      const id = PAGE_ID(l, s), pg = ST.pages[pageIndex(l, s)], c = CONTENT.pages[id];
      if (!c) { console.warn('no guide text for ' + id); continue; }
      const {card, stageHost} = buildCard(Object.assign({id}, c), [l, s], pg, 'Layer ' + (l + 1) + ' · Page ' + (s + 1));
      main.appendChild(card);
      addStage(stageHost, id, {where: [l, s], demo: c.demo, zones: c.zones, marks: c.marks});
      tocHtml.push('<a href="#' + id + '">' + (s + 1) + '. ' + esc(c.title || pg.name) + '</a>');
    }
  }
  // tools and reference
  tocHtml.push('<h2>Reference</h2>');
  CONTENT.after.forEach(s => {
    const sec = document.createElement('section'); sec.className = 'sec'; sec.id = s.id;
    sec.innerHTML = '<p class="kicker">' + esc(s.kicker || 'Reference') + '</p><h2 class="title">' + esc(s.title) + '</h2>' + (s.tagline ? '<p class="tag">' + s.tagline + '</p>' : '') + (typeof s.html === 'function' ? s.html() : s.html);
    main.appendChild(sec); tocHtml.push('<a href="#' + s.id + '">' + esc(s.nav || s.title) + '</a>');
  });
  toc.innerHTML = '<h2>Start here</h2>' + tocHtml.join('');
  // lazy stages: build when they come near the screen
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const it = lazy.find(x => x.host === e.target); if (!it || it.done) return; it.done = true;
    try { STAGES[it.id] = makeStage(it.host, it.opts); STAGES[it.id].ensure(); STAGES[it.id].seek(0); }
    catch (err) { it.host.innerHTML = '<div class="tip warn">This demo could not start: ' + esc(err.message) + '</div>'; console.error(err); }
    io.unobserve(e.target);
  }), {rootMargin: '600px 0px'});
  lazy.forEach(x => io.observe(x.host));
  // pause when scrolled away
  const io2 = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting && ACTIVE && ACTIVE.root.parentNode === e.target) ACTIVE.pause(); }), {threshold: 0});
  lazy.forEach(x => io2.observe(x.host));
  // contents highlight
  const links = [...toc.querySelectorAll('a')];
  const io3 = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { links.forEach(a => a.classList.toggle('cur', a.getAttribute('href') === '#' + e.target.id)); } }), {rootMargin: '-30% 0px -60% 0px'});
  main.querySelectorAll('section.sec, article.card').forEach(x => io3.observe(x));
  toc.addEventListener('click', e => { if (e.target.closest('a')) toc.classList.remove('open'); });
  // deep link test hook: #L1P1&t=4000
  const m = /^#(\w+)&t=(\d+)/.exec(location.hash);
  if (m) {
    const it = lazy.find(x => x.id === m[1]);
    if (it) {
      it.done = true; STAGES[m[1]] = makeStage(it.host, it.opts); STAGES[m[1]].seek(+m[2]);
      if (/&only/.test(location.hash)) {                       // test view: show only this card (used for screenshots)
        let t = document.getElementById(m[1]); while (t.parentNode !== main) t = t.parentNode;
        [...main.children].forEach(x => { if (x !== t) x.style.display = 'none'; });
        $q('#toc').style.display = 'none'; $q('.wrap').style.display = 'block';
      } else { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById(m[1]).scrollIntoView({block: 'start'}); }
    }
  }
}
function buildMap() {
  const d = document.createElement('div'); d.className = 'map';
  for (let l = 0; l < NUM_LAYERS; l++) {
    const L = CONTENT.layers[l]; let h = '<div class="lc"><b>Layer ' + (l + 1) + ': ' + esc(L.short) + '</b>';
    for (let s = 0; s < LAYER_PAGES[l]; s++) { const pg = ST.pages[pageIndex(l, s)]; h += '<a href="#' + PAGE_ID(l, s) + '">' + (s + 1) + '. ' + esc(pg.name) + '</a>'; }
    d.insertAdjacentHTML('beforeend', h + '</div>');
  }
  return d;
}
// theme + menu
(function () {
  const root = document.documentElement, btn = $q('#themeBtn');
  try { const t = localStorage.getItem('c100-guide-theme'); if (t) root.setAttribute('data-theme', t); } catch (e) { /* storage may be blocked */ }
  if (/&light/.test(location.hash)) root.setAttribute('data-theme', 'light');                 // test hook for screenshots
  btn.addEventListener('click', () => {
    const dark = root.getAttribute('data-theme') ? root.getAttribute('data-theme') === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const n = dark ? 'light' : 'dark'; root.setAttribute('data-theme', n);
    try { localStorage.setItem('c100-guide-theme', n); } catch (e) { /* ignore */ }
  });
  const mb = $q('#menuBtn'), toc = $q('#toc');
  mb.addEventListener('click', () => { const o = toc.classList.toggle('open'); mb.setAttribute('aria-expanded', o ? 'true' : 'false'); });
})();
buildPage();
