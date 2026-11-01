// ===================== engine: the firmware logic, with no page access =====================
// keymap.c is a direct port of this. Keep the two in step.
const DOUBLE_TAP_MS = 300, TEXT_MS = 1500, PAGE_TEXT_MS = 500, KNOB_HOLD_MS = 350, KNOB_REPEAT_MS = 50, SLOW_REPEAT_MS = 100;
const PB_STEP = 1024, PB_MS = 5, LFO_MS = 10, BLINK_MS = 250;   /*@ARCH-INLINE mac: CLEAR_HOLD_MS = 500, MACRO_MAX = 192 */
const hexRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const RATE_BEATS = [1, 0.5, 1 / 3, 0.25, 1 / 6, 0.125];
const DELAY_BEATS = [0.25, 1 / 3, 0.5, 0.75, 1, 2];
const FXT = {
  dlDecay: [0.9, 0.8, 0.7, 0.6, 0.5, 0.4], dlShift: [0, 12, -12, 7, 5, -5],
  chInt: [12, -12, 7, 19, -24, 24], chOff: [5, 10, 20, 30, 45, 60], chLvl: [0.3, 0.45, 0.6, 0.75, 0.9, 1],
  depth: [0.2, 0.35, 0.5, 0.65, 0.8, 1], rdStart: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6], width: [0.2, 0.36, 0.52, 0.68, 0.84, 1],
  haVel: [0, 40, 60, 80, 100, 127], gate: [0.2, 0.35, 0.5, 0.65, 0.8, 0.95], swing: [0, 0.08, 0.16, 0.25, 0.33, 0.42],
  raSpan: [0.25, 0.5, 0.75, 1, 1.5, 2], raDecay: [1, 0.9, 0.8, 0.7, 0.6, 0.5],
  stSpeed: [10, 20, 35, 50, 75, 100], ramp: [0, 0.05, 0.1, 0.15, 0.2, 0.25],
  flCount: [1, 1, 2, 2, 3, 3], flSpace: [15, 25, 35, 50, 70, 100], flLvl: [0.2, 0.3, 0.4, 0.5, 0.6, 0.7],
  vbDepth: [0.05, 0.1, 0.2, 0.35, 0.6, 1], vbDelay: [0, 100, 200, 400, 700, 1000],
  huTime: [0, 5, 10, 20, 30, 50], huVel: [0, 10, 20, 30, 45, 60], huNote: [0, 5, 10, 20, 35, 50]
};
const HOLD_TYPES = ['SCALE','ROOT','OCT','TEMPO','CHAN','VOL','ZC','ZO','ZV','ZT','ZK','BARS','SK','LN','SRT','SSW','SDR'];
const ARROWS = {UP: [1, false], DOWN: [-1, false], RIGHT: [1, true], LEFT: [-1, true]};
const ROLL_MS = [180, 110, 70, 40, 20, 10], ROLL_DIR = ['UP', 'DN', 'AL'], ROLL_RAMP = ['FL', 'CR', 'DM'];   // ms between the notes of a rolled chord: slow harp ... fast guitar
const ARP_TYPES = ['T','S','CH','CK','MK','A'];          // + non-drum zone notes
const RETUNE_TYPES = ['T','S','CH','CK','MK','ZN'];       // follow microtonal scales
const POLY_RATE_BEATS = [1, 0.5, 0.25, 0.125];
const MS_PAGE = 0;                                        // the mini sequencer lives on layer 1 page 1
// step recorder (layer 3 page 1): 4 tracks x 16 or 32 steps, 3 keyboard pages, 16 drum steps
const SR_MAXN = 6, SR_PREVIEW_MS = 200, SR_CLICK = 37;   // notes per step, preview length, metronome note (drum channel)
const SR_VEL = [0, 25, 60, 100, 127];                     // velocity levels 1-4 (ghost, low, normal, accent)
const SR_DRUMS = [56, 51, 60, 54, 41, 45, 48, 49, 35, 37, 39, 70, 36, 38, 42, 46];   // keyboard page 3: drum pads R7-R10 x C1-C4 (GM notes)
const SR_KICK = 12;                                       // the lane selected at power-up (R10C1, kick)
const SR_PP = [12, 6, 3, 8, 4, 2];                        // clock pulses (24 per beat) per step: 1/8, 1/16, 1/32, then triplets
const SR_RATE_CODE = ['8 ', '16', '32'], SR_DIRS = ['FW', 'RV', 'PP', 'RN'], SR_MODES = ['  ', 'VE', 'PR', 'RA'];
const FX_TAP_MS = 500;                                    // the effects key toggles on release if held less than this
const EU_PARAMS = ['LN', 'HT', 'SH', 'VR'];               // euclidean settings: length, hits, shift, variation
// generative pages (layer 4 pages 2-5): random walk, Turing machine, bouncing balls, LFO test
const GEN_RATES = [8, 4, 3, 2, 1];                        // 1/16 steps per tick: 1/2, 1/4, 1/8 dotted, 1/8, 1/16
const GEN_GATE = [25, 50, 75, 100];                       // note length in percent of the tick
/*@ARCH tm #73@*/
/*@ARCH lfo #72@*/

function createEngine(cfg) {
  const now = cfg.now, send = cfg.send, changed = cfg.changed || (() => {}), rnd = cfg.random || Math.random;
  const E = {glideStep: 8, glideMs: 5};
  const mod = () => ({held: false, locked: false, last: -1e9});
  const findPage = t => E.state.pages.findIndex(p => p.cells.some(c => c.type === t));
  const newSrTrack = () => ({steps: new Array(32).fill(null), len: 16, cursor: 0, mute: false, ph: -1, phTick: -1, recTick: -2, rate: 1, trip: false, swing: 0, dir: 0, pp: 1});
  const newGen = () => ({
    rw: {rate: 3, step: 1, pull: 2, ymode: 0, cc: 74, oct: 0, gate: 1, run: true, sel: 0,
         w: [[3, 3, true], [4, 4, false], [1, 6, false], [6, 1, false]].map(([x, y, on]) => ({x, y, tr: [], on, ch: 0}))},
    /*@ARCH tm #71@*/
    /*@ARCH bb #70@*/
    /*@ARCH lfo #69@*/
    sel: 0, lp: 0});
  /*@ARCH mac #68@*/

  function reset(st) {
    Object.assign(E, {
      state: st, s: st.settings, layer: 0, slots: [0, 0, 0, 0], page: 0, LT: mod(),
      transpose: 0, xDown: false, xUp: false, root: 0, scale: 0, bankIdx: [0, 13], quant: false, gch: 0,
      down: new Array(100).fill(false), held: new Array(100).fill(null), keyNotes: Array.from({length: 100}, () => []), latched: new Array(100).fill(false),
      heldXY: new Array(100).fill(-1), xyHold: false, xyTouch: false, xyCur: [64, 64], xyTgt: [64, 64], xySent: [-1, -1], xyMoving: false, xyTimer: 0, xyEff: 0,
      knobVal: Array.from({length: 128}, (_, i) => i === 1 ? 0 : 64), faderVal: new Array(128).fill(0), toggles: {},
      vol: new Array(16).fill(100),
      repeat: null, lm: {}, pb: {val: 0, tgt: 0, up: false, dn: false, ch: 0, timer: 0},
      bpm: st.settings.bpm, taps: [], playing: false, step16: 0, lastStep: -1, lastStepT: 0, clkNext: 0, pend: [],
      ext: {active: false, ticks: 0, last: 0, iv: 0},
      seq: new Array(8).fill(0), seqPage: 0, mseq: new Array(16).fill(0), mLane: 0,
      eu: [0, 1, 2, 3, 4, 5, 6, 7].map(() => ({len: 8, hits: 0, shift: 0, vari: 0, pos: -1})), euSel: 2, euHeld: 0, euLane: 0, euView: 0, euTick: 0, clkInt: false, delLast: -1e9, cpyLast: -1e9,
      gen: newGen(), gTick: 0, navT: 0,
      /*@ARCH ec #67@*/
      cq: {len: [8, 8, 8, 8], mute: [false, false, false, false], layer: 0, lon: [true, false, false, false, false, false, false, false], selL: 0, selS: 0, ch: 13, run: false, pos: 0, ownClock: false, rec: false, entL: -1, entS: 0, entT: 0, learn: 0,
        layers: Array.from({length: 8}, (_, k) => ({cc: [0, 1, 2, 3].map(l => 20 + 4 * k + l), st: Array.from({length: 4}, () => Array.from({length: 8}, () => ({on: false, v: 64})))}))},
      prog: {slot: [null, null, null, null], pend: [null, null, null, null], sel: -1, cur: -1, tick: 0, on: [], ch: 0},
      pd: {rip: [], mode: 0, speed: 2, decay: 2, thr: 3, wl: 2, oct: 0, cc: 74, reach: 2, nlen: 2, maxr: 8, h: new Array(64).fill(0), last: new Array(64).fill(-1e9), next: 0},
      cn: {a: [], maxD: 5, chains: [], cell: new Array(64).fill(0), cutoff: 0, send: 0, vmax: 127},
      mel: {0: Array.from({length: 16}, () => ({notes: [], len: 1})), 1: Array.from({length: 16}, () => ({notes: [], len: 1}))},
      msTarget: DRUM_ZONE, msRun: false, msHold: null, lastNote: {0: 60, 1: 48}, recMode: false, recHeld: {}, clip: null, pasteArmed: false,
      csDown: false, stDown: false, delDown: false, susKey: -1,
      arpOn: false, apDown: -1, apLast: -1e9, roll: {on: false, speed: 3, dir: 0, ramp: 0, flip: false}, rolls: [],
      arp: {notes: [], rate: 5, mode: 0, oct: 1, gate: 1, mask: 255, step: 0, next: 0, on: [], offAt: 0, ch: 0, pat: 0, cad: 2, cstep: 0, t0: 0},
      trackMode: 0, text: null, param: null, kbPage: 0,
      // zone channels: layer 4 keyboards 1-16, drums 10, step recorder pianos 1-4; chord pianos 21 (in key) and 23 (major)
      zones: Array.from({length: NUM_ZONES}, (_, z) => ({ch: z >= 4 && z < DRUM_ZONE ? z - 3 : z === DRUM_ZONE ? 10 : z > DRUM_ZONE ? z - 19 : 0, xp: 0,
        chord: z === 21 || z === 23, ctype: z === 21 ? CHORD_TYPES.length - 1 : 0, fx: false})),
      fx: {on: new Array(12).fill(false), sel: -1, val: FX_DEFS.map(d => [0, 1, 2, 3, 4, 5].map(k => d.def[k] || 0)), q: [], held: {}, ch: 0,
           lfoT: 0, cc11: 127, pbv: 0, firstHeld: 0, stAlt: false, lastKey: -1, lastT: -1e9},
      harm: null, harmKeys: [],
      tuning: 0, mpeNext: 1,
      /*@ARCH-INLINE mac: mac: [0, 1, 2, 3].map(newSlot), replaying: false, */
      sr: {tr: [0, 1, 2, 3].map(newSrTrack), target: 0, half: 0, bars: 1, kb: 0, vel: false, metro: false, lane: SR_KICK,
           dseq: new Array(16).fill(0), dph: -1, tick: 0, group: false, gtr: 0, gstep: 0, svLast: -1e9, mode: 0, pulse: 0, q: []},
      subK: 5, subT0: 0, seed: 0x2545F491, harmOct: [0, 0],
      fxAll: false, fxEl: new Array(24 + 4 + NUM_PAGES).fill(false), fxLast: -1, fxKey: -1, fxUsed: false, fxT: 0, fxTarget: -1
    });
    E.sqPage = findPage('SQ'); E.euPage = findPage('EU'); E.srPage = findPage('SS');
    E.rwPage = findPage('RW');   /*@ARCH-INLINE tm: E.tmPage = findPage('TB'); bb: E.bbPage = findPage('BB'); lfo: E.lfoPage = findPage('LV'); ec: E.ecPage = findPage('EC'); */
    E.cqPage = findPage('CQ'); E.progPage = findPage('CP'); E.pdPage = findPage('PD'); E.cnPage = findPage('CN');
    const fxPages = new Set(st.pages.map((p, k) => p.cells.some(c => c.type === 'FX') ? k : -1).filter(k => k >= 0));
    st.pages.forEach((p, k) => p.cells.forEach(c => { if (c.type === 'ZN' && fxPages.has(k)) E.zones[c.z].fx = true; }));
  }

  // random numbers shared with keymap.c (xorshift32), so hosttest can compare random features
  function rndInt(n) { let x = E.seed; x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; E.seed = x; return x % n; }
  const pages = () => E.state.pages;
  const active = m => m.held || m.locked;
  const scaleIv = () => SCALES[E.scale].iv;
  const chOf = p => p < 0 ? E.gch : (pages()[p].channel ? pages()[p].channel - 1 : E.gch);
  const zoneOf = z => (z >= 4 && z <= 7) ? z + 4 * E.kbPage : ((z === 20 || z === 21) && E.sr.kb === 1) ? z + 2 : z;   // keyboard banks / step recorder page 2
  const zoneCh = z => E.zones[z].ch ? E.zones[z].ch - 1 : E.gch;
  const curPage = () => pageIndex(E.layer, E.slots[E.layer]);
  const per16 = () => Math.floor(15000 / E.bpm);          // whole milliseconds, like the firmware
  const beat = () => 60000 / E.bpm;
  // arpeggiator settings shown on rows R3-R6 while the ARP key is held
  function arpOverlay(i) {
    const r = Math.floor(i / 10), x = i % 10;
    if (r === 2) return mk('AR', x); if (r === 3) return mk('AM', x);
    if (r === 4) return x < 4 ? mk('AO', x + 1) : mk('AG', x - 4);
    return mk('AS', x);
  }
  // step recorder keyboard page 3: drum pads (left) and 16 drum steps (right) on rows R7-R10
  function srOverlay(i) { const r = Math.floor(i / 10) - 6, x = i % 10; return x < 4 ? mk('ZN', SR_DRUMS[r * 4 + x], '', '', DRUM_ZONE) : mk('DS', r * 4 + x - 4); }
  // effects key held: rows R3-R8 show the effects (columns 1-2) and the faders of the effect being edited (columns 3-8)
  function fxOverlay(i) { const r = Math.floor(i / 10) - 2, x = i % 10; return x === 0 ? mk('FX', r) : x === 1 ? mk('FX', r + 6) : mk('FP', (5 - r) * 6 + x - 2); }
  function resolve(i) {
    if (E.apDown >= 0 && isPad(i) && Math.floor(i / 10) <= 5) return {c: arpOverlay(i), page: E.page};
    if (E.fxKey >= 0 && isPad(i) && Math.floor(i / 10) <= 7) return {c: fxOverlay(i), page: E.page};
    if (E.page === E.srPage && E.sr.kb === 2 && isPad(i) && Math.floor(i / 10) >= 6) return {c: srOverlay(i), page: E.page};
    return resolveCell(E.state, E.page, i, E.csDown && !(E.param && isLocked(i)));   // while a setting key is held the 4 navigation keys stay arrows
  }
  const pageHasXY = p => pages()[p].cells.some((_, i) => resolveCell(E.state, p, i, false).c.type === 'XY');

  // ---- output (every message passes the macro recorder) ----
  function out(m) {
    /*@ARCH mac #66@*/
    send(m);
  }
  const cc = (ch, n, v) => out({type: 'cc', ch, a: n, b: v});
  const nOn = (ch, n, v) => out({type: 'on', ch, a: n, b: clamp(Math.round(v), 1, 127)});
  const nOff = (ch, n) => out({type: 'off', ch, a: n, b: 0});
  const bend = (ch, v, mpe) => out({type: 'pb', ch, a: v, mpe: !!mpe});

  // ---- LED text display: 2 characters, on the bottom or top 5 rows of the grid ----
  function showText(s, top, ind = 0, neg = false, hold = false, ms = TEXT_MS) {
    E.text = {s: (s + '  ').slice(0, 2), top: !!top, ind, neg, until: hold ? Infinity : now() + ms};
  }
  function showNum(v, top, signed, hold, ind) {
    const a = Math.abs(v);
    const s = a < 10 ? (signed ? (v < 0 ? '-' : v > 0 ? '+' : ' ') : ' ') + a : String(a % 100).padStart(2, '0');
    showText(s, top, ind !== undefined ? ind : Math.floor(a / 100), v < 0 && a >= 10, hold);
  }

  function pageCheck() {
    const p = curPage();
    if (p === E.page) return;
    if (pageHasXY(E.page) && !pageHasXY(p)) xyLeave();
    if (p !== MS_PAGE) { E.msRun = false; E.msHold = null; }
    if (p !== E.srPage) E.sr.group = false;
    E.page = p; E.navT = now() + 1000;                        // the layer / page indicator flashes for 1 s
  }
  function setSlot(s) { const n = LAYER_PAGES[E.layer]; E.slots[E.layer] = ((s % n) + n) % n; pageCheck(); showText('P' + (E.slots[E.layer] + 1), false, 0, false, false, PAGE_TEXT_MS); }

  // ---- notes ----
  function noteOn(i, ch, n, v = 127) { if (n < 0 || n > 127) return; E.keyNotes[i].push([ch, n]); nOn(ch, n, v); }
  // MPE note: its own channel (2-16) with a pitch bend for the microtone
  function mpeOn(i, n, cents, v = 127) {
    if (n < 0 || n > 127) return;
    const ch = E.mpeNext; E.mpeNext = E.mpeNext >= 15 ? 1 : E.mpeNext + 1;
    bend(ch, clamp(Math.round(cents / (E.s.bendRange * 100) * 8192), -8192, 8191), true);
    noteOn(i, ch, n, v);
  }
  function keyNotesOff(i) { E.rolls = E.rolls.filter(r => r.i !== i); E.keyNotes[i].forEach(([ch, n]) => nOff(ch, n)); E.keyNotes[i] = []; E.latched[i] = false; }
  const playable = n => E.quant ? snapToScale(n, E.root, scaleIv()) : n;
  function scaleCents(n) {
    const S = SCALES[E.scale], rel = (((n - E.root) % 12) + 12) % 12, k = S.iv.indexOf(rel);
    return k >= 0 ? S.dev[k] : 0;
  }
  function stepUp(n, k) { const iv = scaleIv(); let m = snapToScale(n, E.root, iv); while (k > 0) { m++; if (inScale(m, E.root, iv)) k--; } return m; }
  function zoneNotes(z, base) {
    const zn = E.zones[z];
    if (!zn.chord) return [base];
    const ct = CHORD_TYPES[zn.ctype];
    if (!ct.iv) { const r = snapToScale(base, E.root, scaleIv()); return [r, stepUp(r, 2), stepUp(r, 4)]; }
    return ct.iv.map(k => base + k);
  }
  const harmBase = () => 48 + E.root + E.transpose;
  function harmNotes(n) {
    const deg = n >> 2, ty = n & 3, iv = scaleIv();
    return HARM_STEPS[ty].map(s => degreePitch(deg + s, harmBase(), iv));
  }
  function notesFor(c) {
    const iv = scaleIv();
    switch (c.type) {
      case 'N': return [c.n];
      case 'T': case 'A': return [playable(c.n + E.transpose)];
      case 'S': return [degreePitch(c.n, 36 + E.root + E.transpose, iv)];
      case 'CH': { const col = c.n % 8, row = c.n >> 3; return chordSteps(row, iv.length).map(s => degreePitch(col + s, 48 + E.root + E.transpose, iv)); }
      case 'CK': return harmNotes(c.n).map(n => n + E.harmOct[0]);
      case 'MK': return [degreePitch(c.n, harmBase(), iv) + E.harmOct[1]];
      case 'ZN': {
        const z = zoneOf(c.z);
        if (z === DRUM_ZONE) return [c.n + E.zones[z].xp];
        return zoneNotes(z, playable(c.n + E.transpose + E.zones[z].xp)); }
    }
    return [];
  }
  // play the notes of a key: arp, microtonal scale (MPE) or plain
  // effects: on for everything (fxAll) or per element: zones 0-23, step recorder tracks 24-27, other pages 28 + page
  const fxFor = el => E.fxAll || (el >= 0 && E.fxEl[el]);
  const fxAny = () => E.fxAll || E.fxEl.some(Boolean);
  function playNotes(i, ch, ns, type, drum, el = -1) {
    if (E.latched[i]) { keyNotesOff(i); return; }
    keyNotesOff(i);
    if (el >= 0) { E.fxLast = el; if (E.held[i]) E.held[i].el = el; }
    if (fxFor(el)) { fxNoteOn(i, ch, ns); E.held[i].fx = true; return; }
    if (!drum && E.arpOn && E.arp.mode !== 7 && (ARP_TYPES.includes(type) || type === 'ZN')) {
      ns.forEach(n => arpAdd(i, n, ch)); E.held[i].arp = true; return;
    }
    if (!drum && E.roll.on && ns.length > 1 && (type === 'CH' || type === 'CK' || type === 'ZN')) { rollOn(i, ch, ns); return; }   // rolled chord
    if (!drum && SCALES[E.scale].micro && RETUNE_TYPES.includes(type)) { ns.forEach(n => mpeOn(i, n, scaleCents(n))); return; }
    ns.forEach(n => noteOn(i, ch, n));
  }
  // rolled chords: the notes of a chord key start one after another (speed, direction, velocity ramp). A key released early drops the notes not yet played
  function rollOn(i, ch, ns) {
    const R = E.roll, up = ns.slice().sort((x, y) => x - y);
    const order = R.dir === 1 ? up.reverse() : R.dir === 2 ? (R.flip ? up.reverse() : up) : up;
    if (R.dir === 2) R.flip = !R.flip;
    const ms = ROLL_MS[R.speed], last = Math.max(1, order.length - 1);
    order.forEach((n, k) => {
      const v = R.ramp === 1 ? 70 + Math.round(57 * k / last) : R.ramp === 2 ? 127 - Math.round(57 * k / last) : 127;
      if (k === 0) noteOn(i, ch, n, v); else E.rolls.push({i, ch, n, v, at: now() + k * ms});
    });
  }
  function rollTick() {
    if (!E.rolls.length) return false;
    const t = now(), due = E.rolls.filter(r => t >= r.at);
    if (!due.length) return false;
    E.rolls = E.rolls.filter(r => t < r.at);
    due.forEach(r => noteOn(r.i, r.ch, r.n, r.v));
    return true;
  }
  function releaseLatched() {
    for (let i = 0; i < 100; i++) if (E.latched[i] && !E.down[i]) keyNotesOff(i);
    E.arp.notes = E.arp.notes.filter(x => !x.latched);
    if (!E.arp.notes.length) arpStop();
  }

  // ---- arpeggiator ----
  function arpPeriod() { const r = ARP_RATES[E.arp.rate]; return 60000 * r[1] / (E.bpm * r[2]); }
  function arpAllOff() { E.arp.on.forEach(n => nOff(E.arp.ch, n)); E.arp.on = []; }
  function arpStop() { arpAllOff(); E.arp.step = 0; }
  function arpAdd(i, n, ch) {
    if (n < 0 || n > 127) return;
    const ex = E.arp.notes.find(x => x.n === n);
    if (ex) { ex.key = i; ex.latched = false; return; }
    if (E.arp.notes.length >= 16) return;
    if (!E.arp.notes.length) { E.arp.step = 0; E.arp.cstep = 0; E.arp.next = now(); E.arp.t0 = now(); }
    E.arp.ch = ch; E.arp.notes.push({n, key: i, latched: false});
  }
  function arpRelease(i) {
    if (active(E.LT)) { E.arp.notes.forEach(x => { if (x.key === i) x.latched = true; }); return; }
    E.arp.notes = E.arp.notes.filter(x => x.key !== i);
    if (!E.arp.notes.length) arpStop();
  }
  function arpTakeLatched(i) {
    const ex = E.arp.notes.filter(x => x.key === i && x.latched);
    if (!ex.length) return false;
    E.arp.notes = E.arp.notes.filter(x => !ex.includes(x)); if (!E.arp.notes.length) arpStop();
    return true;
  }
  // classical / jazz patterns (modes 8-14). Each returns a list of steps (a step = a list of notes), works with any number of held notes;
  // octaves (a.oct) wrap: the whole figure is repeated one octave higher.
  function arpPattern(mode, sorted) {
    const a = E.arp, n = sorted.length, out = [];
    const oct = o => sorted.map(x => x + 12 * o);
    const fit = v => v >= 0 && v <= 127;
    if (mode === 8) {                                          // Alberti: low, high, middle, high (1-3-2-3)
      for (let o = 0; o < a.oct; o++) { const t = oct(o), lo = t[0], hi = t[n - 1], mid = t[n > 2 ? (n - 1) >> 1 : 0]; [lo, hi, mid, hi].forEach(v => out.push(v)); }
    } else if (mode === 9) {                                   // Bach: the low note, then a rising 3-note figure, repeated
      for (let o = 0; o < a.oct; o++) {
        const t = oct(o), up = t.concat(oct(o + 1)), f = [up[1], up[2], up[3]].map((v, k) => v === undefined ? up[up.length - 1] : v);
        out.push(t[0]); f.forEach(v => out.push(v)); f.forEach(v => out.push(v));
      }
    } else if (mode === 10) {                                  // rolling (Chopin style): the whole chord up and down across at least 2 octaves
      const span = Math.max(2, a.oct), up = []; for (let o = 0; o < span; o++) oct(o).forEach(v => up.push(v));
      up.push(sorted[0] + 12 * span);
      const dn = up.slice().reverse().slice(1, -1);
      up.concat(dn).forEach(v => out.push(v));
    } else if (mode === 11) {                                  // bebop: chord tones on the beats, a half-step approach note on the offbeats
      const up = []; for (let o = 0; o < a.oct; o++) oct(o).forEach(v => up.push(v));
      const ct = up.length > 2 ? up.concat(up.slice().reverse().slice(1, -1)) : up;
      ct.forEach((v, k) => { const nx = ct[(k + 1) % ct.length]; out.push(v); out.push(nx > v ? nx - 1 : nx + 1); });
    } else if (mode === 12) {                                  // upper structure: 3rd, 5th, 7th, 9th above the lowest held note (in the scale)
      const r = sorted[0];
      for (let o = 0; o < a.oct; o++) [2, 4, 6, 8].forEach(k => out.push(stepUp(r, k) + 12 * o));
    }
    return out.filter(fit).map(v => [v]);
  }
  function arpSequence(modeIn) {
    const a = E.arp, played = a.notes.map(x => x.n), sorted = played.slice().sort((x, y) => x - y), mode = modeIn === undefined ? a.mode : modeIn;
    if (mode >= 8 && mode <= 12) { const s = arpPattern(mode, sorted); if (s.length) return s; }
    if (mode === 13) return arpSequence(a.pat);                // cadence stop plays the last selected pattern, then a block chord
    if (mode === 14) return arpSequence(0);                    // intensity: up, thinned out or filled in by how long the chord is held
    if (mode === 6) return [sorted];
    const base = mode === 5 ? played : sorted, exp = [];
    for (let o = 0; o < a.oct; o++) base.forEach(n => { if (n + 12 * o <= 127) exp.push(n + 12 * o); });
    const rev = exp.slice().reverse();
    let seq = exp;
    if (mode === 1) seq = rev;
    if (mode === 2) seq = exp.length > 2 ? exp.concat(rev.slice(1, -1)) : exp;
    if (mode === 3) seq = rev.length > 2 ? rev.concat(exp.slice(1, -1)) : rev;
    if (mode === 4) return [[exp[Math.floor(rnd() * exp.length)]]];
    return seq.map(n => [n]);
  }
  function arpTick() {
    const a = E.arp;
    if (a.on.length && now() >= a.offAt) arpAllOff();
    if (!a.notes.length || a.mode === 7 || now() < a.next) return false;
    const per = arpPeriod();
    a.next = Math.max(a.next + per, now() + 1);
    arpAllOff();
    const gate = Math.max(5, per * ARP_GATES[a.gate] / 100 - (a.gate === 3 ? 2 : 0));
    if (a.mode === 13) {                                       // cadence stop: after N bars one block chord, then the pattern starts again
      const spb = Math.max(1, Math.round(240000 / (E.bpm * per)));   // arp steps in one bar
      if (a.cstep >= a.cad * spb) {
        a.notes.map(x => x.n).forEach(n => { nOn(a.ch, n, 127); a.on.push(n); });
        a.offAt = now() + Math.max(5, per * 2 - 2); a.cstep = 0; a.step = 0; return true;
      }
      a.cstep++;
    }
    let vel = 127, play = !!(a.mask & (1 << (a.step % 8)));
    if (a.mode === 14) {                                       // intensity: the longer you hold, the denser and louder it gets (keys have no velocity)
      const held = now() - a.t0, div = held < 1000 ? 4 : held < 2000 ? 2 : 1;
      play = a.step % div === 0; vel = Math.min(127, 50 + Math.floor(held / 25));
    }
    if (play) {
      const seq = arpSequence(), notes = seq[a.step % seq.length];
      notes.forEach(n => { nOn(a.ch, n, vel); a.on.push(n); });
      a.offAt = now() + gate;
    }
    a.step++;
    return true;
  }

  // ---- clock: one 16th step (internal timer or 6 ticks of Ableton's MIDI clock) ----
  function fire(ch, n, dur, v = 127) { if (n < 0 || n > 127 || E.pend.length >= 64) return; nOn(ch, n, v); E.pend.push({ch, n, at: now() + Math.max(10, dur)}); }
  function clockStep() {
    const per = per16(), st = E.step16, base = E.s.seqNote, t = now();
    if (E.page === E.sqPage) for (let l = 0; l < 8; l++) if (E.seq[l] & (1 << st)) fire(chOf(E.sqPage), base + l, per / 2);   // only on its own page
    if (E.msRun) {
      const dch = zoneCh(DRUM_ZONE);
      for (let l = 0; l < 16; l++) if (E.mseq[l] & (1 << st)) fire(dch, base + l, per / 2);
      [0, 1].forEach(z => { const s = E.mel[z][st]; s.notes.forEach(n => fire(zoneCh(z), n, s.len * per - 5, 110)); });
    }
    euStep();
    genStep();
    cqStep(); progStep(); cnStep();
    srStep();
    E.subT0 = t; E.subK = 0; srPulse();                       // pulse 0 of the 6 in this step
    E.lastStep = st; E.lastStepT = t; E.step16 = (st + 1) % 16;
  }
  // Euclidean (Polygene style): every lane loops its own length on the 1/16 clock
  function euHit(l, s) {
    const L = E.eu[l]; if (s >= L.len || !L.hits) return false;
    const j = ((s - L.shift) % L.len + L.len) % L.len;
    return (j * L.hits) % L.len < L.hits;
  }
  function euStep() {
    const k = E.euTick++, on = E.page === E.euPage, ch = chOf(E.euPage), per = per16();
    E.eu.forEach((L, l) => {
      L.pos = k % L.len;
      if (!on) return;
      let hit = euHit(l, L.pos), v = 127;
      if (L.vari && rndInt(100) < L.vari * 10) { hit = !hit; v = 60; }      // variation: a hit drops or a rest plays a ghost hit
      if (hit) fire(ch, E.s.seqNote + l, per / 2, v);
    });
  }

  // ======== v12 pages: MIDI echo, CC sequencer, chord progression, Pond, Constellation ========
  /*@ARCH ec #65@*/
  // ---- CC step sequencer (layer 3 page 4): 4 lanes x 8 steps, each step a CC value, 16th-note steps ----
  // ---- CC step sequencer (layer 3 page 4): 4 lanes x 8 steps x 8 effect layers. Every layer that is ON sends its own CC numbers and step values at the same time ----
  const CQ_LAYER_COL = [[255, 90, 60], [255, 160, 40], [240, 220, 50], [110, 230, 90], [40, 220, 200], [70, 150, 255], [170, 100, 255], [255, 90, 200]];
  const cqLay = () => E.cq.layers[E.cq.layer];
  const cqLevel = s => Math.floor(s * 127 / 7);                  // lane key 1-8 -> value 0 ... 127
  function cqKey(n, i) {
    const q = E.cq, Y = cqLay(), l = q.selL, S = Y.st[l][q.selS], ch = q.ch;
    if (n <= 3) { S.v = clamp(S.v + [-8, 8, -1, 1][n], 0, 127); cc(ch, Y.cc[l], S.v); showNum(S.v, false, false, false); }          // editing a value sends the CC as a preview
    else if (n <= 5) tempoBy(ch, n === 4 ? -5 : 5), showNum(E.bpm, false, false, false);
    else if (n <= 7) { q.len[l] = clamp(q.len[l] + (n === 6 ? -1 : 1), 1, 8); showNum(q.len[l], false, false, false); }
    else if (n <= 9) { Y.cc[l] = clamp(Y.cc[l] + (n === 8 ? -1 : 1), 0, 127); showNum(Y.cc[l], false, false, false); }
    else if (n <= 11) { q.ch = clamp(q.ch + (n === 10 ? -1 : 1), 0, 15); showNum(q.ch + 1, false, false, false); }
    else if (n === 12) {                                                                                                          // play / stop of this sequencer
      if (q.run) { q.run = false; if (q.ownClock && E.playing) stopClock(); q.ownClock = false; showText('OF', false); }
      else { q.run = true; q.pos = 0; if (!E.playing) { startClock(); q.ownClock = true; } showText('ON', false); }
    }
    else if (n === 13) { q.pos = 0; showText('RS', false); }
    else if (n === 14) { Y.st[l].forEach(s => { s.on = true; }); showText('FL', false); }
    else if (n === 15) { Y.st[l].forEach(s => { s.on = false; s.v = 64; }); showText('CL', false); }
    else if (n >= 19 && n <= 22) { q.mute[n - 19] = !q.mute[n - 19]; showText(q.mute[n - 19] ? 'MU' : 'ON', false); }
    else if (n === 23) { q.rec = !q.rec; q.entL = -1; showText(q.rec ? 'RC' : 'OF', false); }                                   // record: tap a step, then a key 1-8 for its value
    if (n <= 11) E.repeat = {key: i, t: now(), rep: false, slow: true, fn: () => cqRepeat(n)};
  }
  function cqRepeat(n) { const saved = E.repeat; cqKey(n, -1); E.repeat = saved; }
  function cqCell(n) {
    const q = E.cq, Y = cqLay(), l = n >> 3, s = n & 7;
    q.selL = l;
    if (!q.rec) { const v = cqLevel(s); cc(q.ch, Y.cc[l], v); showNum(v, false, false, false); return; }                           // not recording: the lane is a fader (live)
    if (q.entL === l) {
      if (s === q.entS && now() - q.entT < DOUBLE_TAP_MS) { const S = Y.st[l][s]; S.on = !S.on; q.entL = -1; showText(S.on ? 'ON' : 'OF', false); return; }   // double-tap a step = on / off
      const S = Y.st[l][q.entS]; S.v = cqLevel(s); S.on = true; cc(q.ch, Y.cc[l], S.v); q.selS = q.entS; q.entL = -1; showNum(S.v, false, false, false); return;      // a key 1-8 sets the value
    }
    q.entL = l; q.entS = s; q.entT = now(); q.selS = s; showNum(Y.st[l][s].v, false, false, false);                              // tap a step: the lane's 8 keys flash
  }
  function cqLayerKey(n) {
    const q = E.cq; q.entL = -1;
    if (q.layer === n) { q.lon[n] = !q.lon[n]; showText(q.lon[n] ? 'ON' : 'OF', false); } else { q.layer = n; showText('L' + (n + 1), false); }
  }
  function cqLearnKey(n) { const q = E.cq; q.learn = q.learn === n + 1 ? 0 : n + 1; q.selL = n; showText(q.learn ? 'LR' : 'OF', false); }
  function cqStep() {
    const q = E.cq; if (!q.run) return;
    const k = q.pos++;
    for (let l = 0; l < 4; l++) {
      if (q.mute[l]) continue;
      const s = k % q.len[l];
      for (let a = 0; a < 8; a++) { if (!q.lon[a]) continue; const S = q.layers[a].st[l][s]; if (S.on) cc(q.ch, q.layers[a].cc[l], S.v); }
    }
  }  // ---- chord progression (Harmony page, chord keys): 4 slots, loop length = the step recorder BARS ----
  function progOff() { const P = E.prog; P.on.forEach(n => nOff(P.ch, n)); P.on = []; }
  function progKey(n) {
    const P = E.prog;
    if (E.delDown) { P.slot[n] = null; P.pend[n] = null; if (P.cur === n) progOff(); showText('--', false); return; }
    P.sel = n; showNum(n + 1, false, false, false);
  }
  function progChord(cn) {                                    // a chord key was pressed on the Harmony page
    const P = E.prog; if (P.sel < 0) return;
    if (!E.playing) P.slot[P.sel] = cn; else if (E.recMode) P.pend[P.sel] = cn;      // stopped: set now. playing + record: at the next loop. playing only: just loops
  }
  function progStep() {
    const P = E.prog;
    if (E.page !== E.progPage) { progOff(); P.cur = -1; return; }
    const len = 16 * E.sr.bars, spc = len / 4, k = P.tick++ % len;
    if (k === 0) for (let s = 0; s < 4; s++) if (P.pend[s] !== null) { P.slot[s] = P.pend[s]; P.pend[s] = null; }
    if (k % spc === 0) {
      const s = k / spc; P.cur = s; progOff(); P.ch = chOf(E.page);
      if (P.slot[s] !== null) harmNotes(P.slot[s]).map(x => x + E.harmOct[0]).forEach(x => { if (x >= 0 && x <= 127) { nOn(P.ch, x, 100); P.on.push(x); } });
    }
  }
  // ---- Pond (layer 4): ripples add up; where the height passes the threshold the cell's note plays; height = velocity + filter CC. Integer math only ----
  const PD_SP = [4, 6, 8, 12, 16, 24];                       // front speed in 1/100 cell per 40 ms tick (1 ... 6 cells per second)
  const PD_WL = [150, 200, 300, 400, 600];                   // wavelength in 1/100 cell
  const PD_DEC = [62966, 64238, 64668, 65014, 65209];        // amplitude factor per tick (x65536): decay 1, 2, 3, 5, 8 seconds
  const PD_LIFE = [150, 250, 350, 550, 850];
  const PD_REACH = [150, 250, 400, 700, 1200];                // how far a ripple carries (distance constant, 1/100 cell); default 3rd = 400
  const PD_NLEN = [60, 120, 200, 400, 800];                  // note length in ms; default 3rd = 200                 // ticks a ripple lives
  const SINE32 = [0, 50, 98, 142, 181, 213, 237, 251, 256, 251, 237, 213, 181, 142, 98, 50, 0, -50, -98, -142, -181, -213, -237, -251, -256, -251, -237, -213, -181, -142, -98, -50];
  const isqrt = n => Math.floor(Math.sqrt(n));
  const pdThr = () => Math.floor((E.pd.thr + 1) * 256 / 10);
  function pdHeight(x, y) {                                   // wave height in 1/256
    const P = E.pd; let h = 0;
    P.rip.forEach(r => {
      const dc = isqrt(10000 * ((x - r.x) * (x - r.x) + (y - r.y) * (y - r.y)));
      if (dc > r.front) return;
      const wave = SINE32[Math.floor((r.front - dc) * 32 / PD_WL[P.wl]) % 32], att = Math.floor(256 * PD_REACH[P.reach] / (PD_REACH[P.reach] + dc));
      h += (((r.amp >> 8) * att >> 8) * wave) >> 8;
    });
    return h;
  }
  function pdPlay(x, y, h) {
    const P = E.pd, ch = chOf(E.page), v = clamp(30 + Math.floor(70 * h / 256), 1, 127);
    const n = P.mode ? 36 + clamp(Math.floor((h - pdThr()) * 6 / 256), 0, 7) : degreePitch(x + 3 * y, 36 + E.root + E.transpose + 12 * P.oct, scaleIv());
    cc(ch, P.cc, clamp(20 + Math.floor(90 * Math.min(h, 307) / 256), 0, 127));              // big wave = bright, fading ripple = muffled
    fire(ch, n, PD_NLEN[P.nlen], v);
  }
  function pdPress(n) {
    const P = E.pd, x = n & 7, y = n >> 3;
    while (P.rip.length >= P.maxr) P.rip.shift();
    P.rip.push({x, y, front: 0, amp: 65536, age: 0}); pdPlay(x, y, 256);
  }
  function pdKey(n, i) {
    const P = E.pd;
    if (n === 8) { P.mode = P.mode ? 0 : 1; showText(P.mode ? 'DR' : 'ME', false); return; }
    if (n === 9) { P.rip = []; showText('CL', false); return; }
    const run = () => {
      const d = n & 1 ? 1 : -1;
      switch (n >> 1) {
        case 0: P.speed = clamp(P.speed + d, 0, 5); showNum(P.speed + 1, false, false, false); break;
        case 1: P.decay = clamp(P.decay + d, 0, 4); showNum(P.decay + 1, false, false, false); break;
        case 2: P.thr = clamp(P.thr + d, 0, 8); showNum(P.thr + 1, false, false, false); break;
        case 3: P.wl = clamp(P.wl + d, 0, 4); showNum(P.wl + 1, false, false, false); break;
        case 5: P.oct = clamp(P.oct + d, -2, 2); showNum(P.oct, false, true, false); break;
        case 6: P.cc = clamp(P.cc + d, 0, 127); showNum(P.cc, false, false, false); break;
      }
    };
    E.repeat = {key: i, t: now(), rep: false, slow: true, fn: run}; run();
  }
  function pdTick() {
    const P = E.pd;
    if (E.page !== E.pdPage) { if (P.rip.length) P.h.fill(0); return false; }
    const t = now(); if (t < P.next) return false; P.next = t + 40;
    P.rip.forEach(r => { r.front += PD_SP[P.speed]; r.amp = Math.floor(r.amp * PD_DEC[P.decay] / 65536); r.age++; });
    P.rip = P.rip.filter(r => r.age <= PD_LIFE[P.decay]);
    const thr = pdThr();
    for (let c = 0; c < 64; c++) {
      const x = c & 7, y = c >> 3, h = P.rip.length ? pdHeight(x, y) : 0;
      if (h >= thr && P.h[c] < thr && t - P.last[c] > 150) { P.last[c] = t; pdPlay(x, y, h); }
      P.h[c] = h;
    }
    return true;
  }
  // ---- Constellation (layer 4): anchors joined by a nearest-neighbour path; a playhead runs along it ----
  function cnRebuild() {
    const N = E.cn, left = N.a.slice(), chains = [];
    while (left.length) {
      let cur = left.shift(); const ch = [cur];
      for (;;) {
        let best = -1, bd = 1e9;
        left.forEach((q, k) => { const d = (q.x - cur.x) * (q.x - cur.x) + (q.y - cur.y) * (q.y - cur.y); if (d <= N.maxD * N.maxD && d < bd) { bd = d; best = k; } });
        if (best < 0) break;
        cur = left.splice(best, 1)[0]; ch.push(cur);
      }
      const cells = [{x: ch[0].x, y: ch[0].y, a: true}];
      for (let k = 1; k < ch.length; k++) {
        const p = ch[k - 1], q = ch[k], st = Math.max(Math.abs(q.x - p.x), Math.abs(q.y - p.y));
        for (let s = 1; s <= st; s++) cells.push({x: Math.floor((2 * (p.x * st + (q.x - p.x) * s) + st) / (2 * st)), y: Math.floor((2 * (p.y * st + (q.y - p.y) * s) + st) / (2 * st)), a: s === st});
      }
      const old = N.chains[chains.length];
      chains.push({anchors: ch, cells, pos: old ? old.pos : 0, last: -1, on: old ? old.on : []});
    }
    N.chains.forEach((c, k) => { if (k >= chains.length) cnChordOff(c); });
    N.chains = chains;
    N.cell = new Array(64).fill(0);                                          // 1 = path, 2 = anchor
    chains.forEach(c => c.cells.forEach(p => { N.cell[p.y * 8 + p.x] = Math.max(N.cell[p.y * 8 + p.x], p.a ? 2 : 1); }));
    // shape -> CC: area + perimeter -> filter cutoff, empty keys -> reverb send, node count -> max velocity (integer math)
    const order = [].concat(...chains.map(c => c.anchors)), n = order.length;
    let area = 0, per = 0;
    for (let k = 0; k < n; k++) { const p = order[k], q = order[(k + 1) % n]; area += p.x * q.y - q.x * p.y; per += isqrt(10000 * ((q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y))); }
    area = n > 2 ? Math.abs(area) : 0; if (n < 2) per = 0; else if (n === 2) per = Math.floor(per / 2);
    const empty = 64 - N.cell.filter(v => v).length, a = Math.min(area, 80), pp = Math.min(per, 3000);
    N.cutoff = clamp(Math.floor((127 * (225 * a + 4 * pp) + 15000) / 30000), 0, 127);
    N.send = n ? clamp(Math.floor((127 * empty + 32) / 64), 0, 127) : 0;
    N.vmax = n ? clamp(40 + Math.floor((87 * n + 10) / 20), 1, 127) : 127;
    const ch = chOf(E.cnPage);
    if (n) { cc(ch, 74, N.cutoff); cc(ch, 91, N.send); }
  }
  function cnChordOff(c) { c.on.forEach(([ch, n]) => nOff(ch, n)); c.on = []; }
  function cnPress(n) {
    const N = E.cn, x = n & 7, y = n >> 3, k = N.a.findIndex(p => p.x === x && p.y === y);
    if (k >= 0) N.a.splice(k, 1); else if (N.a.length < 20) N.a.push({x, y}); else return;
    cnRebuild();
  }
  function cnClear() { const N = E.cn; N.chains.forEach(cnChordOff); N.a = []; N.chains = []; N.cell = new Array(64).fill(0); showText('CL', false); }
  function cnArrow(d, big, i) {
    const N = E.cn, run = () => {
      if (big) { N.maxD = clamp(N.maxD + d, 1, 11); cnRebuild(); showNum(N.maxD, false, false, false); }
      else { tempoBy(chOf(E.cnPage), d); showNum(E.bpm, false, false, false); }
    };
    E.repeat = {key: i, t: now(), rep: false, slow: true, fn: run}; run();
  }
  function cnStep() {
    const N = E.cn; if (E.page !== E.cnPage) return;
    const ch = chOf(E.page), iv = scaleIv(), per = per16();
    N.chains.forEach(c => {
      const period = Math.max(c.cells.length, 4), idx = c.pos++ % period;
      c.last = idx < c.cells.length ? idx : -1;
      if (c.last < 0) return;
      const p = c.cells[idx], deg = p.x + 3 * p.y;
      if (p.a) {                                              // anchor: a sustained chord, held until the next anchor of this chain
        cnChordOff(c);
        [0, 2, 4].forEach(s => { const m = degreePitch(deg + s, 36 + E.root + E.transpose, iv); if (m >= 0 && m <= 127) { nOn(ch, m, N.vmax); c.on.push([ch, m]); } });
      } else fire(ch, degreePitch(deg, 48 + E.root + E.transpose, iv), per / 2, Math.floor((N.vmax * 7 + 5) / 10));    // between anchors: short notes
    });
  }
  // ---- generative pages (layer 4): each ticks on the 1/16 clock only while its page is on screen ----
  const genBase = oct => 48 + E.root + E.transpose + 12 * oct;
  const genDur = (rate, gate) => Math.floor(per16() * GEN_RATES[rate] * GEN_GATE[gate] / 100);
  function rwTick(R, pch) {                                   // random walk, up to 4 walkers: X = scale degree, Y = velocity or a CC
    R.w.forEach(W => {
      if (!W.on) return;
      const ch = W.ch ? W.ch - 1 : pch;                       // walker channel (0 = follows the board channel)
      W.tr = [[W.x, W.y]].concat(W.tr).slice(0, 3);
      if (rndInt(100) < R.pull * 10) { W.x += W.x < 3 ? 1 : W.x > 4 ? -1 : 0; W.y += W.y < 3 ? 1 : W.y > 4 ? -1 : 0; }
      else { W.x = clamp(W.x + (rndInt(3) - 1) * R.step, 0, 7); W.y = clamp(W.y + (rndInt(3) - 1) * R.step, 0, 7); }
      const n = degreePitch(W.x, genBase(R.oct), scaleIv()), dur = genDur(R.rate, R.gate);
      if (R.ymode) { cc(ch, R.cc, Math.floor(W.y * 127 / 7)); fire(ch, n, dur, 100); }
      else fire(ch, n, dur, 20 + W.y * 15);
    });
  }
  const wkShow = W => { if (W.ch) showNum(W.ch, false, false, false); else showText('GL', false); };
  function wkParam(n) {                                       // channel of the selected walker: key 8 = down, 9 = up
    const R = E.gen.rw, W = R.w[R.sel];
    W.ch = clamp(W.ch + (n === 9 ? 1 : -1), 0, 16); wkShow(W);
  }
  /*@ARCH tm #64@*/
  /*@ARCH bb #63@*/
  function genStep() {
    const k = E.gTick++, G = E.gen, p = E.page;
    if (p === E.rwPage) { if (G.rw.run && k % GEN_RATES[G.rw.rate] === 0) rwTick(G.rw, chOf(p)); }
    /*@ARCH tm #62@*/
    /*@ARCH bb #61@*/
  }
  /*@ARCH lfo #60@*/
  function gsParam(n) {                                       // a setting key of a generative page: row = setting, even = down, odd = up
    const r = n >> 1, d = n & 1 ? 1 : -1, G = E.gen, p = E.page;
    const run = (o) => { o.run = d > 0; showText(o.run ? 'ON' : 'OF', false); };
    if (p === E.rwPage) {
      const R = G.rw;
      switch (r) {
        case 0: R.rate = clamp(R.rate + d, 0, 4); showNum(GEN_RATES[R.rate], false, false, false); break;
        case 1: R.step = clamp(R.step + d, 1, 3); showNum(R.step, false, false, false); break;
        case 2: R.pull = clamp(R.pull + d, 0, 10); showNum(R.pull * 10, false, false, false); break;
        case 3: R.ymode = d > 0 ? 1 : 0; showText(R.ymode ? 'CC' : 'VE', false); break;
        case 4: R.cc = clamp(R.cc + d, 0, 127); showNum(R.cc, false, false, false); break;
        case 5: R.oct = clamp(R.oct + d, -2, 2); showNum(R.oct, false, true, false); break;
        case 6: R.gate = clamp(R.gate + d, 0, 3); showNum(GEN_GATE[R.gate], false, false, false); break;
        case 7: run(R); break;
      }
    /*@ARCH tm #59@*/
    /*@ARCH bb #58@*/
    /*@ARCH lfo #57@*/
    }
  }
  // v13: generative pages: HOLD a setting key and use the arrows (up / right = more, down / left = less)
  function ghParam(n, d, big, top) {
    const p = E.page, hold = true, G = E.gen;
    const num = v => showNum(v, top, false, hold), txt = s => showText(s, top, 0, false, hold);
    if (p === E.rwPage) {
      const R = G.rw;
      switch (n) {
        case 0: if (d) R.rate = clamp(R.rate + d, 0, 4); num(GEN_RATES[R.rate]); break;
        case 1: if (d) R.step = clamp(R.step + d, 1, 3); num(R.step); break;
        case 2: if (d) R.pull = clamp(R.pull + d, 0, 10); num(R.pull * 10); break;
        case 3: if (d && big) R.cc = clamp(R.cc + d, 0, 127); else if (d) R.ymode = d > 0 ? 1 : 0; if (big) num(R.cc); else txt(R.ymode ? 'CC' : 'VE'); break;
        case 4: if (d) R.oct = clamp(R.oct + d, -2, 2); showNum(R.oct, top, true, hold); break;
        case 5: if (d) R.gate = clamp(R.gate + d, 0, 3); num(GEN_GATE[R.gate]); break;
        case 6: { const W = R.w[R.sel]; if (d) W.ch = clamp(W.ch + d, 0, 16); if (W.ch) num(W.ch); else txt('GL'); break; }
      }
    } else if (p === E.pdPage) {
      const P = E.pd;
      switch (n) {
        case 0: if (d) P.speed = clamp(P.speed + d, 0, 5); num(P.speed + 1); break;
        case 1: if (d) P.decay = clamp(P.decay + d, 0, 4); num(P.decay + 1); break;
        case 2: if (d) P.thr = clamp(P.thr + d, 0, 8); num(P.thr + 1); break;
        case 3: if (d) P.wl = clamp(P.wl + d, 0, 4); num(P.wl + 1); break;
        case 4: if (d) P.oct = clamp(P.oct + d, -2, 2); showNum(P.oct, top, true, hold); break;
        case 5: if (d) P.cc = clamp(P.cc + d, 0, 127); num(P.cc); break;
        case 6: if (d) P.reach = clamp(P.reach + d, 0, 4); num(P.reach + 1); break;
        case 7: if (d) P.nlen = clamp(P.nlen + d, 0, 4); num(P.nlen + 1); break;
        case 8: if (d) { P.maxr = clamp(P.maxr + d, 1, 8); while (P.rip.length > P.maxr) P.rip.shift(); } num(P.maxr); break;
      }
    }
  }
  function gtPress(n) {
    if (E.page === E.rwPage) { if (n === 0) { const R = E.gen.rw; R.run = !R.run; showText(R.run ? 'ON' : 'OF', false); } return; }
    if (E.page === E.pdPage) { const P = E.pd; if (n === 0) { P.mode = P.mode ? 0 : 1; showText(P.mode ? 'DR' : 'ME', false); } else { P.rip = []; showText('CL', false); } }
  }  function clockTick() {
    let did = false;
    E.pend = E.pend.filter(p => { if (now() >= p.at) { nOff(p.ch, p.n); did = true; return false; } return true; });
    if (E.ext.active && now() - E.ext.last > 500) E.ext.active = false;
    if (E.playing && !E.ext.active && now() >= E.clkNext) { E.clkNext = Math.max(E.clkNext + per16(), now() + 1); clockStep(); did = true; }
    // pulses 1-5 of the step (24 per beat) for the step recorder track rates
    while (E.playing && !E.ext.active && E.subK < 5 && now() >= E.subT0 + Math.floor(per16() * (E.subK + 1) / 6)) { E.subK++; srPulse(); did = true; }
    if (srQueue()) did = true;
    return did;
  }
  function startClock() {
    E.cq.pos = 0; E.prog.tick = 0; E.prog.cur = -1;
    E.playing = true; E.step16 = 0; E.clkNext = now(); E.euTick = 0; E.subK = 5; E.gTick = 0; /*@ARCH-INLINE lfo: E.gen.lp = 0; bb: E.gen.bb.ph.fill(0); */
    const S = E.sr; S.tick = 0; S.pulse = 0; S.group = false; S.q = [];
    S.tr.forEach(t => { t.pos = -1; t.pp = 1; t.cnt = 0; });
  }
  function stopClock() {
    progOff(); E.prog.cur = -1; E.cn.chains.forEach(cnChordOff); E.cq.run = false;
    E.playing = false; E.lastStep = -1; E.pend.forEach(p => nOff(p.ch, p.n)); E.pend = [];
    E.eu.forEach(L => { L.pos = -1; }); E.sr.tr.forEach(t => { t.ph = -1; }); E.sr.dph = -1; E.sr.q = [];
  }
  // MIDI from the computer: 0xF8 clock, 0xFA start, 0xFB continue, 0xFC stop
  E.midiIn = function (b) {
    if (E.clkInt) return;                                  // clock source = Internal only: ignore the outside clock, start and stop
    const t = now(), X = E.ext;
    if (b === 0xF8) {
      if (X.active && t - X.last < 500) { const d = t - X.last; X.iv = X.iv ? X.iv * 0.9 + d * 0.1 : d; E.bpm = clamp(Math.round(60000 / (X.iv * 24)), 40, 240); }
      X.active = true; X.last = t;
      if (E.playing) { if (X.ticks % 6 === 0) clockStep(); else srPulse(); X.ticks++; }
    } else if (b === 0xFA) { startClock(); X.ticks = 0; E.msRun = E.page === MS_PAGE; }
    else if (b === 0xFB) { E.playing = true; }
    else if (b === 0xFC) stopClock();
    changed();
  };
  E.midiCC = function (ch, num, val) { const q = E.cq; if (q.learn) { cqLay().cc[q.learn - 1] = num; q.learn = 0; showNum(num, false, false, false); changed(); } };   // learn: the next CC that arrives is this lane's number

  // ---- mini sequencer (layer 1 page 1): drums or a piano ----
  const melTarget = () => E.msTarget === 0 || E.msTarget === 1;
  function nearestStep() { return (E.playing && now() - E.lastStepT > per16() / 2) ? (E.lastStep + 1) % 16 : Math.max(0, E.lastStep); }
  function msClearStep(s) { if (melTarget()) E.mel[E.msTarget][s] = {notes: [], len: 1}; else for (let l = 0; l < 16; l++) E.mseq[l] &= ~(1 << s); }
  function msClearAll() { if (melTarget()) E.mel[E.msTarget] = Array.from({length: 16}, () => ({notes: [], len: 1})); else E.mseq.fill(0); showText('CL', false); }
  function msCopy() { E.clip = melTarget() ? {kind: 'm', data: JSON.parse(JSON.stringify(E.mel[E.msTarget]))} : {kind: 'd', data: E.mseq.slice()}; showText('CP', false); }
  function msPaste(s) {
    E.pasteArmed = false;
    const C = E.clip;
    if (!C || (C.kind === 'm') !== melTarget()) { showText('--', false); return; }
    if (C.kind === 'd') E.mseq = C.data.map(b => ((b << s) | (b >>> (16 - s))) & 0xFFFF);
    else { const m = E.mel[E.msTarget]; C.data.forEach((st, k) => { m[(k + s) % 16] = JSON.parse(JSON.stringify(st)); }); }
    showText('PS', false);
  }

  // ---- step recorder (layer 3 page 1): 4 tracks, step record (stopped) and live record (playing) ----
  const srTr = () => E.sr.tr[E.sr.target];
  const srNew = () => ({notes: [], vel: 3, prob: 4, rat: 1});
  const srHeld = () => E.held.some(h => h && h.sr);
  function srCursor(t, k) { E.sr.tr[t].cursor = k; if (t === E.sr.target) E.sr.half = k >> 3; }
  function srAdd(st, notes) { notes.forEach(x => { if (st.notes.length < SR_MAXN && !st.notes.some(y => y.n === x.n && y.c === x.c)) st.notes.push({n: x.n, c: x.c}); }); }
  function srBars(b) {
    const S = E.sr; if (b === S.bars) return;
    S.bars = b; S.tr.forEach(t => { t.len = 16 * b; t.cursor = Math.min(t.cursor, t.len - 1); }); S.half = Math.min(S.half, 2 * b - 1);
  }
  function srKb(k) { E.sr.kb = k; if (k === 2) E.sr.mode = 0; }
  // a note key was pressed on the step recorder page: record it when Board REC is on
  function srNote(i, ns, ch) {
    const S = E.sr, notes = ns.filter(n => n >= 0 && n <= 127).map(n => ({n, c: ch}));
    if (!E.recMode || !notes.length) return;
    E.held[i].sr = true;
    if (E.playing) {                                          // live record into the step that is playing
      const t = srTr(), k = t.ph < 0 ? 0 : t.ph;
      if (t.recTick !== t.phTick || !t.steps[k] || !t.steps[k].notes) { t.steps[k] = srNew(); t.recTick = t.phTick; }
      srAdd(t.steps[k], notes); srCursor(S.target, k); return;
    }
    if (!S.group) { const t = srTr(); S.group = true; S.gtr = S.target; S.gstep = t.cursor; t.steps[t.cursor] = srNew(); }
    srAdd(S.tr[S.gtr].steps[S.gstep], notes);                 // keys held together = one step
  }
  function srKeyUp() {                                        // step record: move on when every recorded key is up
    const S = E.sr;
    if (!S.group || srHeld()) return;
    S.group = false; const t = S.tr[S.gtr]; srCursor(S.gtr, (t.cursor + 1) % t.len);
  }
  function srArrow(d, big) {                                  // right / left = step, up / down = track
    const S = E.sr, t = srTr(); S.group = false;
    if (big) { srCursor(S.target, (t.cursor + d + t.len) % t.len); return; }
    const nt = (S.target - d + 4) % 4; S.target = nt; srCursor(nt, Math.min(t.cursor, S.tr[nt].len - 1));
  }
  function srPress(i, n) {
    const S = E.sr, col = n & 7, row = n >> 3, k = S.half * 8 + col;
    E.fxLast = 24 + (S.mode ? S.target : row);
    if (S.mode) {                                             // edit mode: the 4 rows are 4 levels (velocity, probability or ratchet) of the target track
      const t = srTr(), s = t.steps[k];
      if (k >= t.len) return;
      srCursor(S.target, k); S.group = false;
      if (s && s.notes && s.notes.length) { s[['', 'vel', 'prob', 'rat'][S.mode]] = 4 - row; srPreview(s); }
      return;
    }
    const t = S.tr[row];
    if (k >= t.len) return;
    if (E.delDown) { t.steps[k] = null; return; }
    S.target = row; srCursor(row, k); S.group = false; srPreview(t.steps[k]);
  }
  function srStep() {                                         // one 16th step: metronome and drum steps
    const S = E.sr, k = S.tick++, on = E.page === E.srPage, per = per16(), dch = zoneCh(DRUM_ZONE);
    const si = k % (16 * S.bars); S.dph = si;
    if (!on) return;
    if (S.metro && k % 4 === 0) fire(dch, SR_CLICK, per / 2, k % 16 === 0 ? 127 : 70);
    for (let l = 0; l < 16; l++) if (S.dseq[l] & (1 << si)) fire(dch, SR_DRUMS[l], per / 2);
  }
  function srAdvance(t) {
    const L = t.len;
    if (t.dir === 0) t.pos = (t.pos + 1) % L;
    else if (t.dir === 1) t.pos = t.pos <= 0 || t.pos > L - 1 ? L - 1 : t.pos - 1;
    else if (t.dir === 2) {
      if (L < 2 || t.pos < 0) { t.pos = 0; t.pp = 1; }
      else { let p = t.pos + t.pp; if (p >= L || p < 0) { t.pp = -t.pp; p = t.pos + t.pp; } t.pos = clamp(p, 0, L - 1); }
    } else t.pos = rndInt(L);
  }
  function srPulse() {                                        // one clock pulse (24 per beat): tracks step at their own rate
    /*@ARCH lfo #56@*/
    const S = E.sr, p = S.pulse++, on = E.page === E.srPage, per = per16();
    S.tr.forEach((t, n) => {
      const pp = SR_PP[t.trip ? 3 + t.rate : t.rate];
      if (p % pp) return;
      srAdvance(t);
      const i = t.pos; t.ph = i; t.phTick = t.cnt; t.cnt++;
      if (E.recMode && n === S.target && !srHeld()) S.half = i >> 3;   // the step page follows the playhead while recording
      const s = t.steps[i];
      if (!on || t.mute || !s || !s.notes) return;
      if (s.prob < 4 && rndInt(100) >= s.prob * 25) return;
      const ms = Math.floor(per * pp / 6), sw = t.phTick % 2 ? Math.floor(ms * t.swing / 10) : 0, r = s.rat;
      let len = 1;
      if (t.dir === 0) for (let j = i + 1; j < t.len && t.steps[j] && t.steps[j].tie; j++) len++;
      const dur = r > 1 ? Math.floor(Math.floor(ms / r) * 4 / 5) : (len - 1) * ms + Math.floor(ms * 4 / 5);
      for (let k = 0; k < r; k++) s.notes.forEach(x => srOut(now() + sw + Math.floor(k * ms / r), x.c, x.n, SR_VEL[s.vel], dur, n));
    });
  }
  function srOut(at, ch, n, v, dur, tr) {
    if (at > now()) { if (E.sr.q.length < 48) E.sr.q.push({at, ch, n, v, dur, tr}); return; }
    if (fxFor(24 + tr)) fxSeqNote(ch, n, v, dur); else fire(ch, n, dur, v);
  }
  function srQueue() {                                        // swing and ratchet notes that are due
    const S = E.sr; if (!S.q.length) return false;
    const due = S.q.filter(e => e.at <= now()); if (!due.length) return false;
    S.q = S.q.filter(e => e.at > now());
    due.forEach(e => srOut(now(), e.ch, e.n, e.v, e.dur, e.tr));
    return true;
  }
  function srPreview(s) { if (s && s.notes) s.notes.forEach(x => fire(x.c, x.n, SR_PREVIEW_MS, SR_VEL[s.vel])); }

  // ---- MIDI effects ----  // ---- MIDI effects ----
  const fxv = (k, p) => E.fx.val[k][p];
  const fxOn = k => E.fx.on[k];
  function q(ev) { if (E.fx.q.length < 128) E.fx.q.push(ev); }
  function qNote(ch, n, v, at, dur) {
    if (n < 0 || n > 127 || v < 1) return;
    q({at, type: 'on', ch, n, v}); q({at: at + Math.max(10, dur), type: 'off', ch, n});
  }
  function emitHit(ch, n, v, at, dur, withChorus) {
    let base = [[n, v, at, dur]];
    if (fxOn(7)) {
      const cnt = fxv(7, 0) + 2, span = FXT.raSpan[fxv(7, 1)] * beat(), sp = span / cnt;
      base = Array.from({length: cnt}, (_, k) => [n, v * Math.pow(FXT.raDecay[fxv(7, 2)], k), at + k * sp, sp * 0.6]);
    }
    base.forEach(([n1, v1, t1, d1]) => {
      qNote(ch, n1, v1, t1, d1);
      if (withChorus && fxOn(1)) qNote(ch, n1 + FXT.chInt[fxv(1, 0)], v1 * FXT.chLvl[fxv(1, 2)], t1 + FXT.chOff[fxv(1, 1)], d1);
      echoes(ch, n1, v1, t1);
    });
  }
  function echoes(ch, n, v, at) {
    if (fxOn(0)) {
      const T = DELAY_BEATS[fxv(0, 0)] * beat(), reps = fxv(0, 1) + 1, dec = FXT.dlDecay[fxv(0, 2)], sh = FXT.dlShift[fxv(0, 3)];
      for (let k = 1; k <= reps; k++) qNote(ch, n + sh * k, v * Math.pow(dec, k), at + T * k, T * 0.8);
    }
    if (fxOn(3)) {
      const T = DELAY_BEATS[fxv(3, 0)] * beat(), reps = fxv(3, 1) + 1, st = FXT.rdStart[fxv(3, 2)];
      for (let k = 1; k <= reps; k++) qNote(ch, n, v * (st + (1 - st) * (k - 1) / reps), at + T * k, T * 0.8);
    }
    if (fxOn(4)) {
      const T = DELAY_BEATS[fxv(4, 0)] * beat(), reps = fxv(4, 1) + 1, dec = FXT.dlDecay[fxv(4, 2)], w = Math.round(63 * FXT.width[fxv(4, 3)]);
      for (let k = 1; k <= reps; k++) {
        q({at: at + T * k - 1, type: 'cc', ch, n: 10, v: k % 2 ? 64 - w : 64 + w});
        qNote(ch, n, v * Math.pow(dec, k), at + T * k, T * 0.8);
      }
      q({at: at + T * (reps + 1), type: 'cc', ch, n: 10, v: 64});
    }
  }
  function fxNoteOn(i, ch, notes) {
    const F = E.fx; F.ch = ch;
    let hits = notes.map(n => ({n, v: 127, t: 0}));
    if (fxOn(5)) {
      const add = [];
      notes.forEach(n => {
        const iv = scaleIv(), inK = inScale(n, E.root, iv);
        [[n + 12, 0], [n - 12, 1], [n + 7, 2], [inK ? stepUp(n, 6) : n + 10, 3], [inK ? stepUp(n, 2) : n + 4, 4]].forEach(([m, p]) => {
          if (fxv(5, p)) add.push({n: m, v: FXT.haVel[fxv(5, p)], t: 0});
        });
      });
      hits = hits.concat(add);
    }
    if (fxOn(8) && hits.length > 1) {
      const d = fxv(8, 1);
      hits.sort((a, b) => a.n - b.n);
      if (d >= 2 && d <= 3) hits.reverse();
      if (d >= 4) { if (F.stAlt) hits.reverse(); F.stAlt = !F.stAlt; }
      hits.forEach((h, k) => { h.t += k * FXT.stSpeed[fxv(8, 0)]; h.v *= Math.max(0.1, 1 - k * FXT.ramp[fxv(8, 2)]); });
    }
    if (fxOn(11)) {
      hits.forEach(h => {
        h.t += rnd() * FXT.huTime[fxv(11, 0)];
        h.v = clamp(h.v + (rnd() * 2 - 1) * FXT.huVel[fxv(11, 1)], 1, 127);
        if (rnd() * 100 < FXT.huNote[fxv(11, 2)]) h.n = snapToScale(h.n + Math.floor(rnd() * 15) - 7, E.root, scaleIv());
      });
    }
    if (fxOn(9)) {
      const gc = FXT.flCount[fxv(9, 0)], sp = FXT.flSpace[fxv(9, 1)], gl = FXT.flLvl[fxv(9, 2)];
      hits.forEach(h => { for (let k = 0; k < gc; k++) qNote(ch, h.n, h.v * gl, now() + h.t + k * sp, sp * 0.8); h.t += gc * sp; });
    }
    if (fxOn(1) && !fxOn(6) && !fxOn(7))
      hits = hits.concat(hits.map(h => ({n: h.n + FXT.chInt[fxv(1, 0)], v: h.v * FXT.chLvl[fxv(1, 2)], t: h.t + FXT.chOff[fxv(1, 1)]})));
    const held = {ch, hits, roll: fxOn(6), rollK: 0, rollNext: now(), notes: []};
    if (!Object.keys(F.held).length) F.firstHeld = now();
    F.held[i] = held;
    if (held.roll) return;
    if (fxOn(7)) { hits.forEach(h => emitHit(ch, h.n, h.v, now() + h.t, 60, true)); return; }
    hits.forEach(h => {
      if (h.n < 0 || h.n > 127) return;
      if (h.t <= 0) noteOn(i, ch, h.n, h.v); else q({at: now() + h.t, type: 'onheld', ch, n: h.n, v: h.v, key: i});
      echoes(ch, h.n, h.v, now() + h.t);
    });
  }
  // a note from a step recorder track that has effects on (no held key): harmonizer, then emitHit (ratchet, chorus, echoes)
  function fxSeqNote(ch, n, v, dur) {
    E.fx.ch = ch; const t = now(), hits = [[n, v]];
    if (fxOn(5)) {
      const iv = scaleIv(), inK = inScale(n, E.root, iv);
      [[n + 12, 0], [n - 12, 1], [n + 7, 2], [inK ? stepUp(n, 6) : n + 10, 3], [inK ? stepUp(n, 2) : n + 4, 4]].forEach(([m, p]) => { if (fxv(5, p)) hits.push([m, FXT.haVel[fxv(5, p)]]); });
    }
    hits.forEach(([m, w]) => emitHit(ch, m, w, t, dur, true));
  }
  function fxAllOff() {                                       // effects off on every keyboard and track
    const F = E.fx; E.fxAll = false; E.fxEl.fill(false);
    if (F.cc11 !== 127) { F.cc11 = 127; cc(F.ch, 11, 127); }
    if (F.pbv !== 0) { F.pbv = 0; bend(F.ch, 0); }
  }
  function fxNoteOff(i) {
    if (!E.fx.held[i]) return;
    keyNotesOff(i);
    delete E.fx.held[i];
  }
  function fxTick() {
    const F = E.fx, t = now();
    let did = false;
    Object.values(F.held).forEach(h => {
      if (!h.roll || t < h.rollNext) return;
      const per = RATE_BEATS[fxv(6, 0)] * beat(), shape = fxv(6, 2), k = h.rollK++;
      const lvl = shape <= 1 ? 1 : shape <= 3 ? Math.min(1, 0.4 + 0.1 * k) : Math.max(0.2, 1 - 0.1 * k);
      h.hits.forEach(x => emitHit(h.ch, x.n, x.v * lvl, t + x.t, per * FXT.gate[fxv(6, 1)], true));
      h.rollNext += per + ((k % 2 === 0) ? 1 : -1) * per * FXT.swing[fxv(6, 3)];
      if (h.rollNext <= t) h.rollNext = t + per;
      did = true;
    });
    if (F.q.length) {
      const due = F.q.filter(e => e.at <= t);
      if (due.length) {
        F.q = F.q.filter(e => e.at > t);
        due.sort((a, b) => a.at - b.at || (a.type === 'off' ? -1 : 1)).forEach(e => {
          if (e.type === 'on') nOn(e.ch, e.n, e.v);
          else if (e.type === 'off') nOff(e.ch, e.n);
          else if (e.type === 'cc') cc(e.ch, e.n, e.v);
          else if (e.type === 'onheld') {
            if (F.held[e.key]) noteOn(e.key, e.ch, e.n, e.v); else { nOn(e.ch, e.n, e.v); q({at: t + 60, type: 'off', ch: e.ch, n: e.n}); }
          }
        });
        did = true;
      }
    }
    if (t - F.lfoT >= LFO_MS) {
      F.lfoT = t;
      if (fxOn(2) && fxAny()) {
        const per = RATE_BEATS[fxv(2, 0)] * beat() * 2, ph = (t % per) / per, d = FXT.depth[fxv(2, 1)], sh = fxv(2, 2);
        const w = sh <= 1 ? 0.5 + 0.5 * Math.cos(2 * Math.PI * ph) : sh <= 3 ? (ph < 0.5 ? 1 : 0) : 1 - ph;
        const v = Math.round(127 * (1 - d + d * w));
        if (v !== F.cc11) { F.cc11 = v; cc(F.ch, 11, v); did = true; }
      } else if (F.cc11 !== 127) { F.cc11 = 127; cc(F.ch, 11, 127); did = true; }
      const vib = fxOn(10) && Object.keys(F.held).length && t - F.firstHeld >= FXT.vbDelay[fxv(10, 2)];
      if (vib) {
        const per = RATE_BEATS[fxv(10, 0)] * beat(), v = Math.round(8191 * FXT.vbDepth[fxv(10, 1)] * Math.sin(2 * Math.PI * (t % per) / per));
        if (v !== F.pbv) { F.pbv = v; bend(F.ch, v); did = true; }
      } else if (F.pbv !== 0) { F.pbv = 0; bend(F.ch, 0); did = true; }
    }
    return did;
  }
  function fxOff(k) {
    const F = E.fx; F.on[k] = false;
    if (k === 2 && F.cc11 !== 127) { F.cc11 = 127; cc(F.ch, 11, 127); }
    if (k === 4) cc(F.ch, 10, 64);
  }
  // tap = edit this effect's faders; double-tap = switch it on / off
  function fxPress(k) {
    const F = E.fx;
    if (F.lastKey === k && now() - F.lastT < DOUBLE_TAP_MS) { if (F.on[k]) fxOff(k); else F.on[k] = true; F.lastT = -1e9; }
    else F.lastT = now();
    F.lastKey = k; F.sel = k;
  }

  /*@ARCH mac #55@*/

  function kill() {
    for (let i = 0; i < 100; i++) keyNotesOff(i);
    E.arp.notes = []; arpStop(); stopClock();
    E.LT.locked = false; E.LT.held = false;
    const F = E.fx;
    Object.keys(F.held).forEach(k => fxNoteOff(+k));
    /*@ARCH-INLINE ec: E.ec.q = []; */ E.pd.rip = [];
    F.q = []; F.on.fill(false); F.cc11 = 127; F.pbv = 0;
    /*@ARCH mac #54@*/
    for (let ch = 0; ch < 16; ch++) { cc(ch, 123, 0); cc(ch, 64, 0); }
    cc(F.ch, 11, 127); cc(F.ch, 10, 64); bend(F.ch, 0);
    E.pb.val = E.pb.tgt = 0;
    showText('--', false);
  }

  // ---- XY pad ----
  const xyAnyHeld = () => E.heldXY.some(v => v >= 0);
  const xyCh = () => 8 + E.xyEff;                              // v13: effect 1-8 sends X / Y / touch on channel 9-16
  function xySend() {
    const ch = xyCh();
    if (E.xyCur[0] !== E.xySent[0]) { cc(ch, 16, E.xyCur[0]); E.xySent[0] = E.xyCur[0]; }
    if (E.xyCur[1] !== E.xySent[1]) { cc(ch, 17, E.xyCur[1]); E.xySent[1] = E.xyCur[1]; }
  }
  function xyTouchSet(on) { if (E.xyTouch === on) return; E.xyTouch = on; cc(xyCh(), 18, on ? 127 : 0); }
  function xyUpdate(jump) {
    let n = 0, sx = 0, sy = 0;
    E.heldXY.forEach(v => { if (v >= 0) { sx += v % 8; sy += Math.floor(v / 8); n++; } });
    if (!n) return;
    E.xyTgt = [Math.floor((2 * sx * 127 + 7 * n) / (14 * n)), Math.floor((2 * sy * 127 + 7 * n) / (14 * n))];
    if (jump || E.glideStep === 0) { E.xyCur = E.xyTgt.slice(); E.xyMoving = false; xySend(); }
    else { E.xyMoving = true; E.xyTimer = now(); }
  }
  const stepToward = (c, t) => { const s = E.glideStep; return c < t ? (t - c <= s ? t : c + s) : c > t ? (c - t <= s ? t : c - s) : c; };
  function xyLeave() { E.xyHold = false; if (!xyAnyHeld()) xyTouchSet(false); }

  // ---- knobs, hold + arrows parameters ----
  function knob(ch, n, dir) {
    if (E.s.knobMode === 'relative') { cc(ch, n, dir > 0 ? 65 : 63); return; }
    E.knobVal[n] = clamp(E.knobVal[n] + dir * E.s.knobStep, 0, 127); cc(ch, n, E.knobVal[n]);
  }
  function tempoBy(ch, d) {
    const nb = clamp(E.bpm + d, 40, 240), real = nb - E.bpm;
    E.bpm = nb;
    if (real) cc(ch, CC_TEMPO, clamp(64 + real, 1, 127));
  }
  // show (d = 0) or change a parameter. d = +1/-1, big = left/right arrows
  function param(p, d, big) {
    const hold = true, top = p.top, lim = E.s.transposeLimit;
    if (d) p.used = true;
    switch (p.type) {
      case 'SCALE': {
        const bank = SCALES[E.scale].bank;
        if (d && big) { const nb = (bank + (d > 0 ? 1 : 1)) % 2; E.bankIdx[bank] = E.scale; E.scale = E.bankIdx[nb]; }
        else if (d) { const f = BANK_FIRST[bank], n = BANK_SIZE[bank]; E.scale = f + ((E.scale - f + d + n) % n); E.bankIdx[bank] = E.scale; }
        showText(SCALES[E.scale].code, top, SCALES[E.scale].bank ? 2 : 0, false, hold); break; }
      case 'ROOT': E.root = (E.root + d * (big ? 7 : 1) + 84) % 12; showText(NOTE_NAMES[E.root], top, 0, false, hold); break;
      case 'OCT':
        if (p.side >= 0) { const o = E.harmOct; o[p.side] = clamp(o[p.side] + 12 * d, -36, 36); showNum(o[p.side] / 12, top, true, hold); break; }   // harmony: one half
        E.transpose = clamp(E.transpose + d * (big ? 12 : 1), -lim, lim); showNum(E.transpose, top, true, hold); break;
      case 'TEMPO': if (d) tempoBy(p.ch, d * (big ? 10 : 1)); showNum(E.bpm, top, false, hold); break;
      case 'CHAN': E.gch = clamp(E.gch + d * (big ? 4 : 1), 0, 15); showNum(E.gch + 1, top, false, hold); break;
      case 'VOL': case 'ZV': {
        const ch = p.type === 'VOL' ? E.gch : zoneCh(p.zone);
        if (d) { E.vol[ch] = clamp(E.vol[ch] + d * (big ? 10 : 1), 0, 127); cc(ch, 7, E.vol[ch]); }
        showNum(E.vol[ch], top, false, hold); break; }
      case 'ZC': {
        const z = E.zones[p.zone], lo = (p.zone < 4 || p.zone === DRUM_ZONE) ? 0 : 1;
        z.ch = clamp(z.ch + d * (big ? 4 : 1), lo, 16);
        if (z.ch) showNum(z.ch, top, false, hold); else showText('G ', top, 0, false, hold);
        break; }
      case 'ZO': { const z = E.zones[p.zone]; z.xp = clamp(z.xp + d * (big ? 12 : 1), -lim, lim); showNum(z.xp, top, true, hold); break; }
      case 'ZT': case 'ZK': {
        const z = E.zones[p.zone];
        if (p.type === 'ZK' && !d) break;          // a tap on ZK toggles chords (on release); show the type only when changing it
        z.ctype = (z.ctype + d * (big ? 4 : 1) + CHORD_TYPES.length * 4) % CHORD_TYPES.length; showText(CHORD_TYPES[z.ctype].code, top, 0, false, hold); break; }
      case 'ARP': {                                          // up / down = next / previous pattern, left / right = cadence stop bars (1-8)
        const a = E.arp;
        if (d && big) { a.cad = clamp(a.cad + d, 1, 8); showText('C' + a.cad, top, 0, false, hold); break; }
        if (d) { do { a.mode = (a.mode + d + ARP_CODES.length) % ARP_CODES.length; } while (a.mode === 7); if (a.mode !== 13) a.pat = a.mode; a.cstep = 0; }
        showText(ARP_CODES[a.mode], top, 0, false, hold); break; }
      case 'RL': {                                           // up / down = speed, right = direction, left = velocity ramp
        const R = E.roll;
        if (d && big) { if (d > 0) { R.dir = (R.dir + 1) % 3; showText(ROLL_DIR[R.dir], top, 0, false, hold); } else { R.ramp = (R.ramp + 1) % 3; showText(ROLL_RAMP[R.ramp], top, 0, false, hold); } break; }
        if (d) R.speed = clamp(R.speed + d, 0, 5);
        showNum(ROLL_MS[R.speed], top, false, hold); break; }
      case 'BARS': if (d) srBars(clamp(E.sr.bars + d, 1, 2)); showText('B' + E.sr.bars, top, 0, false, hold); break;
      case 'SK': if (d) srKb(clamp(E.sr.kb + d, 0, 2)); showText('K' + (E.sr.kb + 1), top, 0, false, hold); break;
      case 'LN': {
        const t = srTr();
        if (d) { t.len = clamp(t.len + d * (big ? 4 : 1), 1, 16 * E.sr.bars); t.cursor = Math.min(t.cursor, t.len - 1); }
        showNum(t.len, top, false, hold); break; }
      case 'SRT': { const t = srTr(); if (d) { if (big) t.trip = d > 0; else t.rate = clamp(t.rate + d, 0, 2); } showText(SR_RATE_CODE[t.rate], top, t.trip ? 3 : 0, false, hold); break; }
      case 'SSW': { const t = srTr(); if (d) t.swing = clamp(t.swing + d, 0, 5); showNum(t.swing * 10, top, false, hold); break; }
      case 'SDR': { const t = srTr(); if (d) t.dir = (t.dir + d + 4) % 4; showText(SR_DIRS[t.dir], top, 0, false, hold); break; }
      case 'GH': ghParam(p.n, d, big, top); break;
    }
  }
  function modPress(m) {
    if (m.locked) m.locked = false;
    else if (now() - m.last < DOUBLE_TAP_MS) m.locked = true;
    m.last = now(); m.held = true;
  }

  function euArrow(d, big, i) {                              // v13: arrows on the Euclidean page
    const run = () => {
      if (!big) { E.euLane = clamp(E.euLane + d, 0, 7); showText('L' + (E.euLane + 1), false); }
      else euParam(E.euLane, d);
    };
    E.repeat = {key: i, t: now(), rep: false, slow: true, fn: run}; run();
  }
  function euParam(l, d) {                                   // change the selected euclidean setting of lane l
    const L = E.eu[l];
    switch (E.euSel) {
      case 0: L.len = clamp(L.len + d, 1, 8); L.hits = Math.min(L.hits, L.len); L.shift = L.shift % L.len; showNum(L.len, false, false, false); break;
      case 1: L.hits = clamp(L.hits + d, 0, L.len); showNum(L.hits, false, false, false); break;
      case 2: L.shift = (L.shift + d + L.len) % L.len; showNum(L.shift, false, false, false); break;
      case 3: L.vari = clamp(L.vari + d, 0, 10); showNum(L.vari * 10, false, false, false); break;
    }
  }
  // the held note (or step recorder track step) the effects key acts on, -1 = everything
  function fxHeldEl() { for (let k = 0; k < 100; k++) { const h = E.held[k]; if (h && E.down[k] && h.el !== undefined) return h.el; } return -1; }
  E.press = function (i) {
    if (E.down[i]) return;
    E.down[i] = true;
    if (E.fxKey >= 0) E.fxUsed = true;
    const {c, page} = resolve(i), ch = chOf(page), {c: col, r: row} = padRC(i);
    E.held[i] = {c, ch};
    switch (c.type) {
      case 'N': case 'T': case 'S': case 'CH': case 'MK':
        playNotes(i, ch, notesFor(c), c.type, false, 28 + E.page);
        /*@ARCH ec #53@*/
        break;
      case 'CK':
        if (E.page === E.progPage) progChord(c.n);
        E.harmKeys = E.harmKeys.filter(k => k !== i).concat([i]); E.harm = {deg: c.n >> 2, type: c.n & 3};
        playNotes(i, ch, notesFor(c), c.type, false, 28 + E.page); break;
      case 'ZN': {
        const z = zoneOf(c.z), zch = zoneCh(z), ns = notesFor(c), drum = z === DRUM_ZONE;
        E.held[i].ch = zch;
        if (E.stDown && (drum || z === 0 || z === 1)) { E.msTarget = z; showText(drum ? 'DR' : z === 0 ? 'UP' : 'LO', false); E.held[i] = null; break; }
        if (E.page === E.srPage) {
          const S = E.sr;
          if (drum && S.kb === 2 && Math.floor(i / 10) >= 6 && i % 10 < 4) S.lane = (Math.floor(i / 10) - 6) * 4 + i % 10;
          if (!drum) srNote(i, ns, zch);
          else if (E.recMode && E.playing && S.dph >= 0) S.dseq[S.lane] |= 1 << S.dph;   // drums record only into the drum steps
        }
        if (drum) {
          const lane = c.n - E.s.seqNote;
          if (page === MS_PAGE && lane >= 0 && lane < 16) { E.mLane = lane; if (E.recMode && E.msRun && E.playing) E.mseq[lane] |= 1 << nearestStep(); }
          playNotes(i, zch, ns, 'N', true, z); break;
        }
        if (z <= 1) {
          E.lastNote[z] = ns[0];
          if (E.msHold && E.msHold.z === z) {                   // holding a step: add / remove this note
            const s = E.mel[z][E.msHold.step]; E.msHold.added = true;
            ns.forEach(n => { const k = s.notes.indexOf(n); if (k >= 0) s.notes.splice(k, 1); else if (s.notes.length < 4) s.notes.push(n); });
          } else if (E.recMode && E.msRun && E.playing) {
            const s = nearestStep(), st = E.mel[z][s];
            ns.forEach(n => { if (!st.notes.includes(n) && st.notes.length < 4) st.notes.push(n); });
            st.len = 1; E.recHeld[i] = {z, s, t: now()};
          }
        }
        if (E.arpOn && E.arp.mode !== 7 && arpTakeLatched(i)) { E.held[i] = null; break; }
        playNotes(i, zch, ns, 'ZN', false, z); break; }
      case 'A':
        if (E.arpOn && E.arp.mode !== 7 && arpTakeLatched(i)) { E.held[i] = null; break; }
        playNotes(i, ch, notesFor(c), 'A', false, 28 + E.page); break;
      case 'MT': {
        const x = c.n % 8, y = c.n >> 3, cents = tuningCents(E.tuning, x, y);
        const total = (TUNING_BASE[E.tuning] + E.root + E.transpose) * 100 + cents, n = Math.round(total / 100);
        if (E.latched[i]) { keyNotesOff(i); break; }
        keyNotesOff(i); mpeOn(i, n, total - n * 100); break; }
      case 'TUD': case 'TUU': E.tuning = (E.tuning + (c.type === 'TUU' ? 1 : TUNINGS.length - 1)) % TUNINGS.length; showText(TUNINGS[E.tuning].code, false); break;
      case 'LT': modPress(E.LT); break;
      case 'SL':
        if (now() - E.LT.last < DOUBLE_TAP_MS) { E.LT.locked = !E.LT.locked; E.LT.last = -1e9; if (!E.LT.locked) releaseLatched(); }
        else { E.LT.last = now(); E.susKey = i; cc(ch, 64, 127); }
        break;
      case 'AP':
        if (now() - E.apLast < DOUBLE_TAP_MS) {
          E.arpOn = !E.arpOn; E.apLast = -1e9;
          if (E.arpOn && E.arp.mode === 7) E.arp.mode = 0;
          if (!E.arpOn) { E.arp.notes = []; arpStop(); }
        } else E.apLast = now();
        E.apDown = i;
        E.param = {key: i, type: 'ARP', n: 0, zone: 0, ch, top: false, used: false, side: -1}; param(E.param, 0, false); break;   // hold ARP + arrows = pattern
      case 'RL': E.param = {key: i, type: 'RL', n: 0, zone: 0, ch, top: false, used: false, side: -1}; param(E.param, 0, false); break;
      case 'PGU': setSlot(E.slots[E.layer] + 1); break;
      case 'PGD': setSlot(E.slots[E.layer] - 1); break;
      case 'CS': E.csDown = true; showText('P' + (E.slots[E.layer] + 1), false, 0, false, true); break;   // Shift: page label drawn on the pads (test)
      case 'PBU': case 'PBD':
        if (c.type === 'PBU') E.pb.up = true; else E.pb.dn = true;
        E.pb.ch = ch; E.pb.tgt = E.pb.up && !E.pb.dn ? 8191 : E.pb.dn && !E.pb.up ? -8192 : 0; break;
      case 'SCU': case 'SCD': E.scale = (E.scale + (c.type === 'SCU' ? 1 : SCALES.length - 1)) % SCALES.length; showText(SCALES[E.scale].code, false); break;
      case 'RTU': case 'RTD': E.root = (E.root + (c.type === 'RTU' ? 1 : 11)) % 12; showText(NOTE_NAMES[E.root], false); break;
      case 'QZ': E.quant = !E.quant; break;
      case 'CC': cc(ch, c.n, 127); break;
      case 'CT': E.toggles[c.n] = !E.toggles[c.n]; cc(ch, c.n, E.toggles[c.n] ? 127 : 0); break;
      case 'KU': case 'KD': {
        const dir = c.type === 'KU' ? 1 : -1;
        E.repeat = {key: i, t: now(), rep: false, fn: () => knob(ch, c.n, dir)}; knob(ch, c.n, dir); break; }
      case 'FD': E.faderVal[c.n] = rowValue(row); cc(ch, c.n, E.faderVal[c.n]); break;
      case 'PC': out({type: 'pc', ch, a: c.n}); break;
      case 'KB': {
        const ar = ARROWS[String(c.s).toUpperCase()];
        if (ar && E.param) {
          const p = E.param;
          E.held[i].arrow = true;
          E.repeat = {key: i, t: now(), rep: false, slow: true, fn: () => { if (E.param) param(E.param, ar[0], ar[1]); }}; param(p, ar[0], ar[1]);
          break;
        }
        if (ar && E.msHold) {
          E.held[i].arrow = true;
          if (ar[1]) { const s = E.mel[E.msHold.z][E.msHold.step]; s.len = clamp(s.len + ar[0], 1, 16); E.msHold.added = true; showNum(s.len, false, false, false); }
          break;
        }
        if (ar && E.page === E.cnPage) { E.held[i].arrow = true; cnArrow(ar[0], ar[1], i); break; }   // constellation: up / down = BPM, left / right = max distance
        if (ar && E.page === E.euPage) { E.held[i].arrow = true; euArrow(ar[0], ar[1], i); break; }   // euclidean: up / down = pick the lane, left / right = change the setting (start point; hold Length / Hits / Variation for those)
        if (ar && E.page === E.srPage) {                      // step recorder: the arrows move the step cursor
          E.held[i].arrow = true;
          E.repeat = {key: i, t: now(), rep: false, slow: true, fn: () => srArrow(ar[0], ar[1])}; srArrow(ar[0], ar[1]);
          break;
        }
        out({type: 'key', text: kbPretty(c.s)}); break; }
      case 'SCALE': case 'ROOT': case 'OCT': case 'TEMPO': case 'CHAN': case 'VOL':
      case 'ZC': case 'ZO': case 'ZV': case 'ZT': case 'ZK': case 'BARS': case 'SK': case 'LN': case 'SRT': case 'SSW': case 'SDR': case 'GH': {
        let side = -1;                                        // harmony: OCT with a chord pad (0) or melody pad (1) held
        if (c.type === 'OCT') for (let k = 0; k < 100; k++) { const h = E.held[k]; if (h && E.down[k] && (h.c.type === 'CK' || h.c.type === 'MK')) side = h.c.type === 'CK' ? 0 : 1; }
        E.param = {key: i, type: c.type, n: c.n, zone: c.type[0] === 'Z' ? zoneOf(c.n) : 0, ch, top: Math.floor(i / 10) >= 6, used: false, side};
        param(E.param, 0, false); break; }
      case 'KP': E.kbPage = c.n; showText('B' + (c.n + 1), false); break;
      case 'KPU': case 'KPD': E.kbPage = (E.kbPage + (c.type === 'KPU' ? 1 : 3)) % 4; showText('B' + (E.kbPage + 1), false); break;
      case 'PS':
        if (!E.playing) { cc(ch, CC_PLAY, 127); startClock(); E.msRun = E.page === MS_PAGE; }
        else if (E.page === MS_PAGE && !E.msRun) { E.msRun = true; E.held[i].quiet = true; }
        else { cc(ch, CC_STOP, 127); stopClock(); E.held[i].stop = true; }
        break;
      case 'PLAY': cc(ch, CC_PLAY, 127); startClock(); E.msRun = E.page === MS_PAGE; break;
      case 'STOP': cc(ch, CC_STOP, 127); stopClock(); break;
      case 'BREC': E.recMode = !E.recMode; break;
      case 'REC': cc(ch, CC_REC, 127); break;
      case 'TAP': {
        cc(ch, CC_TAP, 127);
        const t = now();
        if (E.taps.length && t - E.taps[E.taps.length - 1] > 2000) E.taps = [];
        E.taps.push(t); if (E.taps.length > 5) E.taps.shift();
        if (E.taps.length >= 2) E.bpm = clamp(Math.round(60000 * (E.taps.length - 1) / (t - E.taps[0])), 40, 240);
        break; }
      case 'BPMU': case 'BPMD': {
        const dir = c.type === 'BPMU' ? 1 : -1;
        E.repeat = {key: i, t: now(), rep: false, slow: true, fn: () => tempoBy(ch, dir)}; tempoBy(ch, dir); break; }
      case 'KILL': kill(); break;
      case 'LU': E.layer = (E.layer + 1) % NUM_LAYERS; pageCheck(); break;
      case 'LD': E.layer = (E.layer + NUM_LAYERS - 1) % NUM_LAYERS; pageCheck(); break;
      case 'LG': E.layer = c.n - 1; pageCheck(); break;
      case 'LM': E.lm[i] = E.layer; E.layer = c.n - 1; pageCheck(); break;
      case 'XD': case 'XU': {
        if (c.type === 'XD') E.xDown = true; else E.xUp = true;
        const lim = E.s.transposeLimit, stp = E.s.transposeStep;
        if (E.xDown && E.xUp) E.transpose = 0;
        else if (c.type === 'XU' && E.transpose + stp <= lim) E.transpose += stp;
        else if (c.type === 'XD' && E.transpose - stp >= -lim) E.transpose -= stp;
        showNum(E.transpose, false, true, false);
        break; }
      case 'XR': E.transpose = 0; break;
      case 'CL':
        if (E.trackMode >= 4) { const n = FADER_BASE[E.trackMode] + col; E.faderVal[n] = rowValue(row); cc(ch, n, E.faderVal[n]); }
        else noteOn(i, ch, c.n);
        break;
      case 'TR': noteOn(i, 15, 64 + (E.trackMode <= 3 ? E.trackMode : 0) * 8 + c.n - 1); break;
      case 'TM': E.trackMode = E.trackMode === c.n ? 0 : c.n; break;
      case 'XY':
        E.heldXY[i] = c.n;
        if (!E.xyTouch) { xyUpdate(true); xyTouchSet(true); } else xyUpdate(false);
        break;
      case 'XF': if (E.xyTouch) xyTouchSet(false); E.xyHold = false; E.xyEff = c.n; E.xySent = [-1, -1]; cc(ch, 19, c.n * 16 + 8); break;   // new effect: touch off on the old channel, X / Y go out again on the new one
      case 'XH': E.xyHold = !E.xyHold; if (!E.xyHold && !xyAnyHeld()) xyTouchSet(false); break;
      case 'AR': E.arp.rate = c.n; break;
      case 'AM': E.arp.mode = c.n; if (c.n !== 13) E.arp.pat = c.n === 7 ? E.arp.pat : c.n; if (c.n === 7) { E.arpOn = false; E.arp.notes = []; arpStop(); } break;
      case 'AO': E.arp.oct = c.n; break;
      case 'AG': E.arp.gate = c.n; break;
      case 'AS': E.arp.mask ^= 1 << c.n; break;
      case 'SQ': E.seq[c.n >> 3] ^= 1 << (E.seqPage * 8 + (c.n & 7)); break;
      case 'SP': E.seqPage = c.n; break;
      case 'EU': {                                            // tap a step = lane length up to that step
        const L = E.eu[c.n >> 3]; L.len = (c.n & 7) + 8 * E.euView + 1; L.hits = Math.min(L.hits, L.len); L.shift %= L.len; showNum(L.len, false, false, false); break; }
      case 'EP': E.euHeld |= 1 << c.n; E.euSel = c.n; showText(EU_PARAMS[c.n], false); break;       // v13: HOLD LEN / HITS / VAR and use the lane keys; nothing held = start point
      case 'CLK': E.clkInt = !E.clkInt; E.ext = {active: false, ticks: 0, last: 0, iv: 0}; showText(E.clkInt ? 'IN' : 'AU', false); break;   // clock source: Auto / Internal only
      case 'CQ': cqCell(c.n); break;
      case 'CR': cqKey(c.n, i); break;
      case 'CE': cqLayerKey(c.n); break;
      case 'CY': cqLearnKey(c.n); break;
      case 'PD': pdPress(c.n); break;
      case 'CN': cnPress(c.n); break;
      case 'RW': { const R = E.gen.rw, W = R.w[R.sel]; W.x = c.n & 7; W.y = c.n >> 3; W.tr = []; W.on = true; break; }
      case 'CP': progKey(c.n); break;
      /*@ARCH ec #52@*/
      case 'PN': pdKey(c.n, i); break;
      case 'GT': gtPress(c.n); break;
      case 'EV': E.euView = c.n; break;
      case 'CX': cnClear(); break;
      case 'WK': {
        const R = E.gen.rw;
        if (c.n < 4) { R.sel = c.n; wkShow(R.w[c.n]); }
        else if (c.n < 8) { R.sel = c.n - 4; const W = R.w[R.sel]; W.on = !W.on; W.tr = []; showText(W.on ? 'ON' : 'OF', false); }
        else { E.repeat = {key: i, t: now(), rep: false, slow: true, fn: () => wkParam(c.n)}; wkParam(c.n); }
        break; }
      /*@ARCH tm #51@*/
      /*@ARCH bb #50@*/
      /*@ARCH lfo #49@*/
      case 'GS': E.repeat = {key: i, t: now(), rep: false, slow: true, fn: () => gsParam(c.n)}; gsParam(c.n); break;
      case 'EK': {
        const l = c.n >> 1, d = c.n & 1 ? 1 : -1;
        E.repeat = {key: i, t: now(), rep: false, slow: true, fn: () => euParam(l, d)}; euParam(l, d); break; }
      case 'FXK': E.fxKey = i; E.fxUsed = false; E.fxT = now(); E.fxTarget = fxHeldEl(); break;
      case 'FXO': if (E.fxKey >= 0) kill(); else fxAllOff(); break;
      case 'MS':
        if (E.delDown) { msClearStep(c.n); E.held[i].done = true; break; }
        if (E.pasteArmed) { msPaste(c.n); E.held[i].done = true; break; }
        if (melTarget()) { E.msHold = {step: c.n, key: i, added: false, z: E.msTarget}; break; }
        E.mseq[E.mLane] ^= 1 << c.n; break;
      case 'ST': E.stDown = true; break;
      case 'DEL': {
        const dbl = now() - E.delLast < DOUBLE_TAP_MS; E.delLast = dbl ? -1e9 : now();      // v13: double-tap = clear all (it was Controls Shift + Delete)
        E.delDown = true;
        if (E.page === E.srPage) {                            // step recorder: clear the cursor step (double-tap: the whole track)
          const t = srTr(); E.sr.group = false;
          if (dbl) { t.steps.fill(null); srCursor(E.sr.target, 0); showText('CL', false); } else t.steps[t.cursor] = null;
          break;
        }
        if (dbl) { msClearAll(); E.held[i].done = true; } break; }
      case 'CPY': {
        const dbl = now() - E.cpyLast < DOUBLE_TAP_MS; E.cpyLast = dbl ? -1e9 : now();      // v13: tap = copy, double-tap = paste (it was Controls Shift + Copy)
        if (dbl) { if (E.clip) { E.pasteArmed = !E.pasteArmed; showText(E.pasteArmed ? 'PS' : '  ', false); } else showText('--', false); } else msCopy(); break; }
      /*@ARCH mac #48@*/
      case 'FX': fxPress(c.n); break;
      case 'FP': { const k = E.fx.sel, pc = c.n % 6; if (k >= 0 && pc < FX_DEFS[k].params.length) E.fx.val[k][pc] = Math.floor(c.n / 6); break; }
      case 'SS': srPress(i, c.n); E.held[i].el = 24 + (E.sr.mode ? E.sr.target : c.n >> 3); break;
      case 'DS': {
        const S = E.sr, k = c.n + 16 * (S.half >> 1);
        if (k >= 16 * S.bars) break;
        S.dseq[S.lane] ^= 1 << k;
        if (S.dseq[S.lane] & (1 << k)) fire(zoneCh(DRUM_ZONE), SR_DRUMS[S.lane], SR_PREVIEW_MS);
        break; }
      case 'SM': srTr().mute = !srTr().mute; break;
      case 'SR': case 'TI':
        if (E.recMode && !E.playing) { const t = srTr(); t.steps[t.cursor] = c.type === 'SR' ? {rest: true} : {tie: true}; E.sr.group = false; srCursor(E.sr.target, (t.cursor + 1) % t.len); }
        break;
      case 'SV': {                                            // double-tap = edit modes on / off; single tap in a mode = next mode
        const S = E.sr;
        if (S.kb === 2) break;
        if (now() - S.svLast < DOUBLE_TAP_MS) { S.mode = S.mode ? 0 : 1; S.svLast = -1e9; if (S.mode) showText('VE', false); }
        else { if (S.mode) { S.mode = S.mode % 3 + 1; showText(SR_MODES[S.mode], false); } S.svLast = now(); }
        break; }
      case 'SG': E.sr.half = (E.sr.half + 1) % (2 * E.sr.bars); break;
      case 'MET': E.sr.metro = !E.sr.metro; break;
      case 'custom': out({type: 'note', text: 'Custom key (no behavior yet)'}); break;
    }
    changed();
  };

  E.release = function (i) {
    if (!E.down[i]) return;
    E.down[i] = false;
    const h = E.held[i]; E.held[i] = null;
    if (E.repeat && E.repeat.key === i) E.repeat = null;
    if (E.heldXY[i] >= 0) { E.heldXY[i] = -1; if (xyAnyHeld()) xyUpdate(false); else if (!E.xyHold) xyTouchSet(false); }
    if (h && h.fx) fxNoteOff(i);
    else if (E.keyNotes[i].length) {
      if (active(E.LT) && h && ['N','T','S','CH','CK','MK','A','ZN','MT'].includes(h.c.type)) E.latched[i] = true; else keyNotesOff(i);
    }
    if (E.recHeld[i]) { const R = E.recHeld[i]; E.mel[R.z][R.s].len = clamp(Math.round((now() - R.t) / per16()), 1, 16); delete E.recHeld[i]; }
    E.harmKeys = E.harmKeys.filter(k => k !== i);
    if (!E.harmKeys.length) E.harm = null;
    if (h && h.sr) srKeyUp();
    if (h) {
      const c = h.c;
      if (h.arp) arpRelease(i);
      if (E.param && E.param.key === i) {
        if (E.param.type === 'ZK' && !E.param.used) { const z = E.zones[E.param.zone]; z.chord = !z.chord; }
        if (E.param.type === 'RL' && !E.param.used) { E.roll.on = !E.roll.on; showText(E.roll.on ? 'ON' : 'OF', false); }
        if (E.param.type === 'SK' && !E.param.used) { srKb((E.sr.kb + 1) % 3); showText('K' + (E.sr.kb + 1), false); }   // a tap = next keyboard page
        E.param = null; if (E.text) E.text.until = now() + TEXT_MS;
      }
      switch (c.type) {
        case 'LT': E.LT.held = false; if (!active(E.LT)) releaseLatched(); break;
        case 'SL': if (E.susKey === i) { cc(h.ch, 64, 0); E.susKey = -1; } break;
        case 'AP': if (E.apDown === i) E.apDown = -1; break;
        case 'CS': E.csDown = false; if (E.text && E.text.until === Infinity) E.text.until = now() + 150; break;
        case 'ST': E.stDown = false; break;
        case 'DEL': E.delDown = false; break;
        case 'EP': { E.euHeld &= ~(1 << c.n); E.euSel = 2; for (let k = 3; k >= 0; k--) if (E.euHeld & (1 << k)) E.euSel = k; break; }
        case 'FXK':
          if (E.fxKey === i) {
            E.fxKey = -1;
            if (!E.fxUsed && now() - E.fxT < FX_TAP_MS) { if (E.fxTarget < 0) E.fxAll = !E.fxAll; else { E.fxEl[E.fxTarget] = !E.fxEl[E.fxTarget]; E.fxLast = E.fxTarget; } }
          }
          break;
        /*@ARCH mac #47@*/
        case 'MS':
          if (E.msHold && E.msHold.key === i) {
            const z = E.msHold.z, s = E.mel[z][E.msHold.step];
            if (!E.msHold.added) { if (s.notes.length) E.mel[z][E.msHold.step] = {notes: [], len: 1}; else s.notes.push(E.lastNote[z]); }
            E.msHold = null;
          }
          break;
        case 'PBU': case 'PBD':
          if (c.type === 'PBU') E.pb.up = false; else E.pb.dn = false;
          E.pb.tgt = E.pb.up ? 8191 : E.pb.dn ? -8192 : 0; break;
        case 'CC': cc(h.ch, c.n, 0); break;
        case 'PS': if (!h.quiet) cc(h.ch, h.stop ? CC_STOP : CC_PLAY, 0); break;
        case 'PLAY': cc(h.ch, CC_PLAY, 0); break;
        case 'STOP': cc(h.ch, CC_STOP, 0); break;
        case 'REC': cc(h.ch, CC_REC, 0); break;
        case 'TAP': cc(h.ch, CC_TAP, 0); break;
        case 'KB': if (!h.arrow) out({type: 'keyup', text: kbPretty(c.s)}); break;
        case 'XD': E.xDown = false; break;
        case 'XU': E.xUp = false; break;
        case 'LM': if (E.lm[i] !== undefined) { E.layer = E.lm[i]; delete E.lm[i]; pageCheck(); } break;
      }
    }
    changed();
  };

  E.tick = function () {
    let did = false;
    if (E.repeat) {
      const need = E.repeat.rep ? (E.repeat.slow ? SLOW_REPEAT_MS : KNOB_REPEAT_MS) : KNOB_HOLD_MS;
      if (now() - E.repeat.t >= need) { E.repeat.t = now(); E.repeat.rep = true; E.repeat.fn(); did = true; }
    }
    if (E.xyMoving && now() - E.xyTimer >= E.glideMs) {
      E.xyTimer = now();
      E.xyCur = [stepToward(E.xyCur[0], E.xyTgt[0]), stepToward(E.xyCur[1], E.xyTgt[1])];
      xySend();
      if (E.xyCur[0] === E.xyTgt[0] && E.xyCur[1] === E.xyTgt[1]) E.xyMoving = false;
      did = true;
    }
    if (E.pb.val !== E.pb.tgt && now() - E.pb.timer >= PB_MS) {
      E.pb.timer = now();
      const d = E.pb.tgt - E.pb.val;
      E.pb.val = Math.abs(d) <= PB_STEP ? E.pb.tgt : E.pb.val + Math.sign(d) * PB_STEP;
      bend(E.pb.ch, E.pb.val); did = true;
    }
    if (arpTick()) did = true;
    if (rollTick()) did = true;
    /*@ARCH ec #46@*/
    if (pdTick()) did = true;
    if (clockTick()) did = true;
    if (fxTick()) did = true;
    /*@ARCH mac #45@*/
    if (E.text && now() >= E.text.until) { E.text = null; did = true; }
    if (did) changed();
  };

  E.releaseAll = function () { for (let i = 0; i < 100; i++) if (E.down[i]) E.release(i); };
  E.setState = function (st) {
    if (E.state) { E.releaseAll(); kill(); if (E.xyTouch) xyTouchSet(false); }
    reset(st); changed();
  };

  // ---- lights: [r, g, b] for a key, or null = unlit ----
  const WHITE = [255, 255, 255], DIMW = [60, 60, 60], OFF = [0, 0, 0], CTRLW = [110, 110, 110], CTRLV = [0, 190, 255], ORANGE = [255, 90, 0], RED = [255, 0, 0], GREEN = [0, 255, 40], GOLD = [255, 200, 40],
    VIOLET = [160, 60, 255], LIME = [150, 255, 0];
  const dim = (c, k = 5) => c.map(v => Math.round(v / k));
  const blink = (ms = BLINK_MS) => Math.floor(now() / ms) % 2 === 0;
  function isOn(c) {
    switch (c.type) {
      case 'LT': case 'SL': return active(E.LT);
      case 'QZ': return E.quant; case 'PLAY': case 'PS': return E.playing; case 'XH': return E.xyHold; case 'XF': return E.xyEff === c.n;
      case 'TM': return c.n && E.trackMode === c.n; case 'SP': return E.seqPage === c.n; case 'KP': return E.kbPage === c.n;
      case 'CT': return !!E.toggles[c.n]; case 'ZK': return E.zones[zoneOf(c.n)].chord;
      case 'RL': return E.roll.on; /*@ARCH-INLINE ec: case 'EC': return c.n === 8 && E.ec.on; */ case 'PN': return c.n === 8 && E.pd.mode === 1; case 'GT': return (E.page === E.pdPage && c.n === 0 && E.pd.mode === 1) || (E.page === E.rwPage && c.n === 0 && E.gen.rw.run); case 'EV': return E.euView === c.n; case 'CR': return (c.n === 12 && E.cq.run) || (c.n >= 19 && c.n <= 22 && E.cq.mute[c.n - 19]) || (c.n === 23 && E.cq.rec); case 'CY': return E.cq.learn === c.n + 1; case 'AP': return E.arpOn; case 'CS': return E.csDown; case 'CPY': return E.pasteArmed; case 'ST': return E.stDown;
      case 'DEL': return E.delDown; case 'EP': return !!((E.euHeld >> c.n) & 1); case 'CLK': return E.ext.active && !E.clkInt; /*@ARCH-INLINE lfo: case 'GP': return E.gen.sel === c.n; */
      case 'SM': return srTr().mute; case 'MET': return E.sr.metro; case 'SV': return E.sr.mode > 0;
    }
    return false;
  }
  const pcOf = n => ((n % 12) + 12) % 12;
  function ctrlLed(c, i, pal) {                               // own light for some control keys (null = the normal control light)
    switch (c.type) {
      case 'WK': {                                            // walker keys: select / on-off in the walker's color, channel keys in the selected walker's color
        const R = E.gen.rw, k = c.n & 3;
        if (c.n >= 8) return E.down[i] ? ORANGE : dim(pal[R.sel], 3);
        if (c.n < 4) return R.sel === k ? WHITE : dim(pal[k], 6);
        return R.w[k].on ? pal[k] : dim(pal[k], 14); }
      case 'CP': {                                            // chord progression step: filled = page color, playhead white, selected blinks, waiting chord blinks color 2
        const P = E.prog, n = c.n, base = P.slot[n] !== null ? pal[0] : OFF;
        if (E.playing && P.cur === n && E.page === E.progPage) return WHITE;
        if (P.pend[n] !== null && blink()) return pal[1];
        if (P.sel === n && blink()) return WHITE;
        return base; }
    }
    return null;
  }
  // Shift navigation display: column 9 = layer (1-4), column 10 = page, as many lights as the number, filled from the bottom; unused slots = dim dots
  const NAV_LAYER = [255, 80, 0], NAV_PAGE = [255, 205, 0], NAV_KEY = [255, 60, 0], NAV_CTRL = [255, 120, 0];
  function navLed(i) {
    const r = Math.floor(i / 10), x = i % 10, k = 9 - r;
    if (r >= 2 && x === 8) { const v = E.layer + 1; return k < v ? NAV_LAYER : k < NUM_LAYERS ? dim(NAV_LAYER, 12) : OFF; }
    if (r >= 2 && x === 9) { const v = E.slots[E.layer] + 1, tot = LAYER_PAGES[E.layer]; return k < v ? NAV_PAGE : k < tot ? dim(NAV_PAGE, 12) : OFF; }
    if (!E.csDown) return null;                              // Shift held: the control area turns orange, the 4 navigation keys a stronger orange
    if (i === 8 || i === 9 || i === 18 || i === 19) return E.down[i] ? WHITE : NAV_KEY;
    return E.down[i] ? WHITE : NAV_CTRL;
  }
  E.led = function (i) {
    const pg = pages()[E.page], {c} = resolve(i), pal = pg.colors.map(hexRgb), col = pal[0];
    if (!isPad(i)) {
      if (c.type === 'none') return OFF;
      if (c.type === 'BREC' && E.recMode) return blink() ? RED : dim(RED, 4);
      if (c.type === 'FXK' && !E.down[i] && fxFor(E.fxLast)) return VIOLET;   // effects on for what you played last
      const cl = ctrlLed(c, i, pal); if (cl) return cl;                       // keys of the generative pages that show their own state
      if (E.csDown || now() < E.navT) { const nl = navLed(i); if (nl) return nl; }   // Shift held, or 1 s after a layer / page change
      return E.down[i] || isOn(c) ? ORANGE : controlVaries(E.state, E.page, i) ? CTRLV : CTRLW;   // cyan = changes with the layer, page or Controls Shift
    }
    const {c: x, r: y} = padRC(i);
    const T = E.text;
    if (T) {
      const y0 = T.top ? 3 : 0, yi = T.top ? 2 : 5;
      if (y >= y0 && y <= y0 + 4) {
        const k = x < 3 ? 0 : (x >= 4 && x < 7) ? 1 : -1;
        if (k < 0) return OFF;
        const g = FONT[T.s[k]] || FONT[' '];
        return g[y0 + 4 - y][x - k * 4] === '1' ? WHITE : OFF;
      }
      if (y === yi && (T.ind || T.neg)) return x < T.ind ? WHITE : (x === 7 && T.neg) ? RED : OFF;
    }
    if (TYPES[c.type] && TYPES[c.type].ctrl) return E.down[i] || isOn(c) ? ORANGE : OFF;
    if (E.down[i] || E.keyNotes[i].length || E.arp.notes.some(a => a.key === i)) return WHITE;
    const mode = pg.led, iv = scaleIv();
    if (mode === 'off' || c.type === 'none') return OFF;
    if (mode === 'solid') return col;
    const scaleCol = n => pcOf(n - E.root) === 0 ? col : (!inScale(n, E.root, iv) ? OFF : pal[1]);
    const pianoCol = n => isBlackKey(n) ? pal[1] : col;
    switch (c.type) {
      case 'N': return mode === 'piano' ? pianoCol(c.n) : mode === 'scale' ? scaleCol(c.n) : col;
      case 'T': { const n = c.n + E.transpose; return mode === 'piano' ? pianoCol(n) : scaleCol(n); }
      case 'A': { const n = c.n + E.transpose; return mode === 'scale' ? scaleCol(n) : pianoCol(n); }
      case 'ZN': {
        const z = zoneOf(c.z), zc = pal[ZONE_SLOT[c.z]];
        if (z === DRUM_ZONE && E.page === E.srPage && E.sr.kb === 2) return (Math.floor(i / 10) - 6) * 4 + x === E.sr.lane ? pal[3] : zc;
        if (z === DRUM_ZONE) return E.page === MS_PAGE && E.msTarget === DRUM_ZONE && c.n - E.s.seqNote === E.mLane ? pal[3] : zc;
        return isBlackKey(c.n) ? dim(zc, 4) : zc; }
      case 'S': return c.n % iv.length === 0 ? col : pal[1];
      case 'CH': return c.n % 8 === 0 || c.n % 8 === 7 ? col : pal[1];
      case 'CK': {
        const deg = c.n >> 2;
        if (E.harm && HARM_NEXT[E.harm.deg % 7].includes(deg % 7) && blink(200)) return pal[2];
        return deg % 7 === 0 ? col : dim(col, 3); }
      case 'MK': {
        const n = degreePitch(c.n, harmBase(), iv), pc = pcOf(n);
        if (!E.harm) return pcOf(n - E.root) === 0 ? col : dim(pal[1], 2);
        const cn = HARM_STEPS[E.harm.type].map(s => pcOf(degreePitch(E.harm.deg + s, harmBase(), iv)));
        if (pc === cn[0]) return col;
        if (cn.includes(pc)) return pal[1];
        if (cn.some(t => pcOf(pc - t) === 1)) return dim(pal[3], 2);
        return pal[2]; }
      case 'MT': {
        const cents = tuningCents(E.tuning, c.n % 8, c.n >> 3);
        const rel = E.tuning === 5 ? cents % 1901.955 : cents % 1200, dev = ((cents % 100) + 100) % 100;
        if (E.tuning === 4) { const h = 1 + (c.n >> 3) * 8 + (c.n % 8); if ((h & (h - 1)) === 0) return col; let k = h; while (k % 2 === 0) k /= 2; if (k === 3) return pal[3]; }
        else { if (rel < 1 || rel > (E.tuning === 5 ? 1900.9 : 1199)) return col; if (Math.abs(rel - 701.955) < 10) return pal[3]; }
        return dev <= 6 || dev >= 94 ? pal[1] : pal[2]; }
      case 'XY': if (E.xyTouch && x === Math.floor((E.xyTgt[0] * 7 + 63) / 127) && y === Math.floor((E.xyTgt[1] * 7 + 63) / 127)) return WHITE; return col;
      case 'FD': return rowValue(y) <= E.faderVal[c.n] ? col : OFF;
      case 'CL': if (E.trackMode >= 4) return rowValue(y) <= E.faderVal[FADER_BASE[E.trackMode] + x] ? col : OFF; return dim(col);
      case 'SS': {                                            // step recorder: track steps, or 4 velocity levels in velocity mode
        const S = E.sr, k = S.half * 8 + (c.n & 7);
        if (S.mode) {
          const t = srTr(), s = t.steps[k], lv = 4 - (c.n >> 3), mc = S.mode === 1 ? pal[S.target] : S.mode === 2 ? VIOLET : LIME;
          if (k >= t.len) return OFF;
          if (lv === 1 && k === t.cursor && blink()) return WHITE;
          if (!s || !s.notes || !s.notes.length) return OFF;
          if (lv > s[['', 'vel', 'prob', 'rat'][S.mode]]) return dim(mc, 10);
          return E.playing && k === t.ph && !t.mute ? WHITE : S.mode === 1 && lv === 4 ? GOLD : mc; }
        const n = c.n >> 3, t = S.tr[n], s = t.steps[k], tc = pal[n];
        if (k >= t.len) return OFF;
        if (n === S.target && k === t.cursor && blink()) return WHITE;
        if (E.playing && k === t.ph && !t.mute) return WHITE;
        const v = !s ? dim(tc, 12) : s.notes ? (s.vel === 1 ? dim(tc, 4) : s.vel === 2 ? dim(tc, 2) : tc) : s.tie ? dim(tc, 3) : dim(DIMW, 2);
        return t.mute ? dim(v, 4) : v; }
      case 'DS': {
        const S = E.sr, k = c.n + 16 * (S.half >> 1);
        if (k >= 16 * S.bars) return OFF;
        const on = !!(S.dseq[S.lane] & (1 << k)), ph = E.playing && k === S.dph;
        return on && ph ? WHITE : on ? pal[3] : ph ? DIMW : dim(col, (c.n >> 2) & 1 ? 12 : 6); }
      case 'SQ': {
        const l = c.n >> 3, k = c.n & 7, on = !!(E.seq[l] & (1 << (E.seqPage * 8 + k))), ph = E.lastStep === E.seqPage * 8 + k;
        return on && ph ? WHITE : on ? col : ph ? pal[2] : OFF; }
      case 'EU': {
        const l = c.n >> 3, s = (c.n & 7) + 8 * E.euView, L = E.eu[l], lc = l % 2 ? pal[1] : col;
        if (s >= L.len) return OFF;
        if (E.playing && L.pos === s) return WHITE;
        if (s === L.shift) return euHit(l, s) ? pal[3] : dim(pal[3], 6);      // the lane's start point has its own colour
        return euHit(l, s) ? lc : dim(lc, l === E.euLane ? 8 : 16); }
      case 'CQ': {
        const q = E.cq, Y = q.layers[q.layer], l = c.n >> 3, s = c.n & 7, S = Y.st[l][s], lc = pal[l];
        if (s >= q.len[l]) return OFF;
        if (q.run && q.pos > 0 && (q.pos - 1) % q.len[l] === s) return WHITE;
        if (q.entL === l) return blink() ? lc.map(v => Math.round(v * (0.2 + 0.8 * (s + 1) / 8))) : dim(lc, 14);   // value entry: the lane's 8 keys flash, brighter to the right
        if (q.rec && q.selL === l && q.selS === s && blink()) return WHITE;
        const b = S.on ? lc.map(v => Math.round(v * (0.3 + 0.7 * S.v / 127))) : dim(lc, 14);   // brightness follows the step value
        return q.mute[l] ? dim(b, 4) : b; }
      case 'CE': { const q = E.cq, col = CQ_LAYER_COL[c.n]; if (q.layer === c.n && blink()) return WHITE; return q.lon[c.n] ? col : dim(col, 12); }   // effect layers: bright = on, dim = off, white blink = selected
      case 'CR': {
        const q = E.cq, n = c.n, grp = n <= 3 ? pal[1] : n <= 5 ? pal[2] : n <= 7 ? pal[3] : n <= 9 ? pal[0] : n <= 11 ? pal[1] : null;
        if (n === 12) return q.run ? GREEN : dim(GREEN, 6);
        return grp ? dim(grp, 3) : DIMW; }      case 'PD': {
        const P = E.pd, h = P.h[c.n] / 256, x = c.n & 7, y = c.n >> 3;
        if (P.rip.some(r => r.x === x && r.y === y && r.age < 4)) return WHITE;
        if (h > 0.04) return pal[0].map(v => Math.round(v * clamp(0.12 + 0.88 * h, 0, 1)));
        if (h < -0.04) return pal[1].map(v => Math.round(v * clamp(-0.5 * h, 0.05, 0.5)));
        return dim(pal[0], 30); }
      case 'CN': {
        const N = E.cn, v = N.cell[c.n], x = c.n & 7, y = c.n >> 3;
        if (E.playing && N.chains.some(ch => ch.last >= 0 && ch.cells[ch.last].x === x && ch.cells[ch.last].y === y)) return WHITE;
        return v === 2 ? pal[0] : v === 1 ? dim(pal[1], 6) : dim(pal[1], 40); }
      case 'RW': {
        const R = E.gen.rw, px = c.n & 7, py = c.n >> 3;          // each walker has its own palette color
        for (let w = 0; w < 4; w++) if (R.w[w].on && R.w[w].x === px && R.w[w].y === py) return pal[w];
        for (let w = 0; w < 4; w++) { if (!R.w[w].on) continue; const k = R.w[w].tr.findIndex(q => q[0] === px && q[1] === py); if (k >= 0) return dim(pal[w], 2 + 2 * k); }
        return dim(DIMW, 2); }

      /*@ARCH tm #44@*/
      /*@ARCH bb #43@*/
      /*@ARCH lfo #42@*/
      case 'MS': {
        const ph = E.msRun && E.lastStep === c.n;
        if (E.msHold && E.msHold.step === c.n) return WHITE;
        if (melTarget()) {
          const m = E.mel[E.msTarget], zc = pal[ZONE_SLOT[E.msTarget]];
          const on = m[c.n].notes.length > 0;
          let tail = false;
          for (let k = 1; k < 16 && !tail; k++) { const s = m[(c.n - k + 16) % 16]; if (s.notes.length && s.len > k) tail = true; }
          return on && ph ? WHITE : on ? zc : ph ? DIMW : tail ? dim(zc, 4) : OFF;
        }
        const on = !!(E.mseq[E.mLane] & (1 << c.n));
        return on && ph ? WHITE : on ? pal[3] : ph ? DIMW : OFF; }
      case 'AR': return E.arp.rate === c.n ? col : dim(col);
      case 'AM': return E.arp.mode === c.n ? col : dim(col);
      case 'AO': return E.arp.oct === c.n ? col : dim(col);
      case 'AG': return E.arp.gate === c.n ? col : dim(col);
      case 'AS': return E.arp.mask & (1 << c.n) ? col : dim(col);
      case 'FX': return E.fx.sel === c.n ? (E.fx.on[c.n] ? GOLD : WHITE) : E.fx.on[c.n] ? col : dim(col);   // selected + on gold, selected white, on main color
      case 'FP': {
        const k = E.fx.sel, pc = c.n % 6, pr = Math.floor(c.n / 6);
        if (k < 0 || pc >= FX_DEFS[k].params.length) return OFF;
        return pr <= E.fx.val[k][pc] ? col : dim(col, 8); }
      /*@ARCH mac #41@*/
    }
    return col;
  };

  E.status = () => ({page: E.page, layer: E.layer, slot: E.slots[E.layer], cs: E.csDown,
    latch: active(E.LT), transpose: E.transpose, root: E.root, scale: E.scale, quant: E.quant, bpm: E.bpm, playing: E.playing,
    trackMode: E.trackMode, arp: E.arp, arpOn: E.arpOn, roll: E.roll, cq: E.cq, prog: E.prog, pd: E.pd, cn: E.cn, xyHold: E.xyHold, xyTouch: E.xyTouch, step: E.lastStep, gch: E.gch, kbPage: E.kbPage,
    param: E.param, fx: E.fx, zones: E.zones, mLane: E.mLane, msTarget: E.msTarget, msRun: E.msRun, recMode: E.recMode, tuning: E.tuning,
    eu: E.eu, euSel: E.euSel, euView: E.euView, clkInt: E.clkInt, euLane: E.euLane, gen: E.gen, fxAll: E.fxAll, fxKey: E.fxKey, harmOct: E.harmOct, ext: E.ext.active, harm: E.harm, sr: E.sr, srPage: E.srPage});
  E.resolve = i => resolve(i).c;
  E.zoneOf = zoneOf; E.zoneCh = zoneCh;
  E.notesFor = notesFor;
  E.setState(cfg.state);
  return E;
}
// ===================== end of engine =====================
