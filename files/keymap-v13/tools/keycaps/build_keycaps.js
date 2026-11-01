// build_keycaps.js: makes the keycap designer page, the printable sheet (SVG) and the label list from the layout file.
// Usage (from the tools folder):  node keycaps/build_keycaps.js [layout.txt]
// Each key gets up to 4 sections: layer 1, layer 2, layer 3 (their first page); the 4th section is left empty (Shift only navigates). Layer 4 is not printed.
const fs = require('fs'), path = require('path');
const here = __dirname, tools = path.join(here, '..'), out = path.join(tools, '..');
const layoutPath = process.argv[2] || path.join(out, 'c100-layout-v13.txt');
const C = require(path.join(tools, 'load'))(false);
const st = C.parseExport(fs.readFileSync(layoutPath, 'utf8'));
const svgSrc = fs.readFileSync(path.join(here, 'keycaps_svg.js'), 'utf8');
const lib = new Function(svgSrc + '\nreturn {keySvg, sheetSvg, KC_COLORS, KC_NAMES};')();

// ---------- short legends (g = big, t = small) ----------
const GM = {36: 'KICK', 37: 'RIM', 38: 'SNR', 39: 'CLAP', 40: 'SNR', 41: 'TOM', 42: 'HAT', 43: 'TOM', 44: 'PHAT', 45: 'TOM', 46: 'OHAT', 47: 'TOM', 48: 'TOM', 49: 'CRSH', 50: 'TOM', 51: 'RIDE', 56: 'COW', 60: 'BONG', 70: 'SHK'};
const KBMAP = {RIGHT: '→', LEFT: '←', UP: '↑', DOWN: '↓', DEL: '⌦', ENTER: '⏎', SPACE: '␣', TAB: '⇥', ESC: 'ESC', BSPC: '⌫', MINUS: '−', EQUAL: '=', PGUP: 'PgUp', PGDN: 'PgDn'};
function kbLegend(s) {
  const u = s.toUpperCase();
  if (u === 'CTRL+Z') return {g: '↶', t: 'undo'}; if (u === 'CTRL+Y') return {g: '↷', t: 'redo'}; if (u === 'CTRL+U') return {g: '^U', t: 'quant'};
  const parts = u.split('+'), key = parts.pop(), mods = parts.map(p => ({CTRL: '^', SHIFT: '⇧', ALT: '⌥', GUI: '⌘'}[p] || p)).join('');
  return {g: mods + (KBMAP[key] || key), t: KBMAP[key] && key.length > 3 ? '' : 'key'};
}
const sg = (n, a, b) => (n & 1 ? b : a);
const CR = ['−8', '+8', '−1', '+1', 'BPM−', 'BPM+', 'LEN−', 'LEN+', 'CC−', 'CC+', 'CH−', 'CH+', 'PLAY', 'RST', 'FILL', 'CLR', 'P1', 'P2', 'P3', 'M1', 'M2', 'M3', 'M4'];
function legendOf(c) {
  const n = c.n || 0, T = c.type, nn = C.noteName;
  switch (T) {
    case 'none': case 'trans': case 'REFC': case 'REFL': return {g: '', t: ''};
    case 'N': case 'T': case 'A': return {g: nn(n), t: ''};
    case 'ZN': return {g: GM[n] && c.z === 19 ? GM[n] : nn(n), t: ''};
    case 'S': return {g: nn(C.degreePitch(n, 36, C.SCALES[0].iv)), t: 'key'};
    case 'CH': return {g: C.ROMAN[n % 8], t: ['tri', 'inv1', 'inv2', '7th', '9th', 'sus2', 'sus4', 'pwr'][n >> 3]};
    case 'CK': return {g: C.ROMAN[n >> 2], t: ['tri', '7th', '9th', 'sus4'][n & 3]};
    case 'MK': return {g: '♪', t: 'melody'}; case 'MT': return {g: String(n), t: 'µ'};
    case 'MS': return {g: String(n + 1), t: 'step'};
    case 'SQ': case 'EU': case 'CQ': return {g: String((n & 7) + 1), t: 'L' + ((n >> 3) + 1)};
    case 'SS': return {g: String((n & 7) + 1), t: 'T' + ((n >> 3) + 1)}; case 'DS': return {g: String(n + 1), t: 'drum'};
    case 'CL': return {g: String(n), t: 'clip'}; case 'TR': return {g: 'T' + n, t: ''};
    case 'XY': return {g: 'XY', t: ''}; case 'XF': return {g: 'FX' + (n + 1), t: ''}; case 'XH': return {g: 'HOLD', t: 'xy'};
    case 'FD': return {g: String(n), t: 'CC'}; case 'CC': case 'CT': return {g: String(n), t: 'CC'}; case 'PC': return {g: String(n), t: 'prog'};
    case 'RW': case 'PD': case 'CN': return {g: '◦', t: 'cell'}; case 'CX': return {g: 'CLR', t: ''};
    case 'KB': return kbLegend(c.s);
    case 'PBU': return {g: '▲', t: 'bend'}; case 'PBD': return {g: '▼', t: 'bend'};
    case 'DEL': return {g: '⌫', t: 'del'}; case 'CPY': return {g: '⧉', t: 'copy'}; case 'CS': return {g: '⇧', t: 'shift'};
    case 'PS': return {g: '▶■', t: 'play'}; case 'PLAY': return {g: '▶', t: 'play'}; case 'STOP': return {g: '■', t: 'stop'};
    case 'BREC': return {g: '●', t: 'rec'}; case 'REC': return {g: '●', t: 'live'}; case 'TAP': return {g: 'TAP', t: ''}; case 'QZ': return {g: 'Q', t: 'quant'};
    case 'CLK': return {g: 'CLK', t: 'clock'}; case 'KILL': return {g: 'KILL', t: ''};
    case 'CHAN': return {g: 'CH', t: 'chan'}; case 'SCALE': return {g: '♯♭', t: 'scale'}; case 'OCT': return {g: '±', t: 'oct'}; case 'ROOT': return {g: 'KEY', t: 'root'};
    case 'TEMPO': return {g: 'BPM', t: ''}; case 'VOL': return {g: 'VOL', t: ''};
    case 'PGU': return {g: '▲', t: 'page'}; case 'PGD': return {g: '▼', t: 'page'}; case 'LU': return {g: '⇑', t: 'layer'}; case 'LD': return {g: '⇓', t: 'layer'};
    case 'KU': return {g: '+', t: 'K' + n}; case 'KD': return {g: '−', t: 'K' + n};
    case 'XU': return {g: '▲', t: 'oct'}; case 'XD': return {g: '▼', t: 'oct'}; case 'XR': return {g: '0', t: 'oct'};
    case 'FXK': return {g: 'FX', t: ''}; case 'FXO': return {g: 'FX', t: 'off'}; case 'AP': return {g: 'ARP', t: ''}; case 'SL': return {g: 'SUS', t: 'latch'}; case 'LT': return {g: 'LT', t: 'latch'};
    case 'RL': return {g: 'ROLL', t: ''};
    case 'TM': return {g: C.TRACK_MODES[n].slice(0, 4).toUpperCase(), t: 'mode'};
    case 'EP': return {g: ['LEN', 'HITS', 'SHFT', 'VAR'][n], t: 'hold'}; case 'EK': return {g: sg(n, '−', '+'), t: 'L' + ((n >> 1) + 1)};
    case 'WK': return n < 4 ? {g: 'W' + (n + 1), t: 'sel'} : n < 8 ? {g: 'W' + (n - 3), t: 'on'} : {g: sg(n, '−', '+'), t: 'ch'};
    case 'GS': return {g: sg(n, '−', '+'), t: 'set'};
    case 'PN': return n === 8 ? {g: 'MODE', t: ''} : n === 9 ? {g: 'CLR', t: ''} : {g: sg(n, '−', '+'), t: ['spd', 'dec', 'thr', 'wav', '', 'oct', 'cc'][n >> 1]};
    case 'CP': return {g: 'S' + (n + 1), t: 'chord'}; case 'CR': return {g: CR[n] || String(n), t: 'cc seq'};
    case 'SM': return {g: 'MUTE', t: 'trk'}; case 'SR': return {g: 'REST', t: ''}; case 'TI': return {g: 'TIE', t: ''}; case 'SV': return {g: 'VEL', t: 'edit'};
    case 'SG': return {g: 'STEP', t: 'page'}; case 'BARS': return {g: 'BARS', t: ''}; case 'SK': return {g: 'KB', t: 'page'}; case 'LN': return {g: 'LEN', t: 'trk'};
    case 'MET': return {g: 'MET', t: ''}; case 'SRT': return {g: 'RATE', t: 'trk'}; case 'SSW': return {g: 'SWG', t: 'trk'}; case 'SDR': return {g: 'DIR', t: 'trk'};
    case 'GH': return {g: 'SET', t: 'hold'}; case 'GT': return {g: 'TAP', t: ''}; case 'EV': return {g: n ? '9-16' : '1-8', t: 'steps'};
    case 'ZC': return {g: 'CH', t: 'zone'}; case 'ZO': return {g: '±', t: 'oct'}; case 'ZV': return {g: 'VOL', t: 'zone'}; case 'ZT': return {g: 'TYPE', t: 'chord'}; case 'ZK': return {g: 'CHD', t: 'on/off'};
    case 'ST': return {g: 'TGT', t: 'seq'}; case 'SP': return {g: n ? '9-16' : '1-8', t: 'steps'};
    case 'KP': return {g: 'B' + (n + 1), t: 'bank'}; case 'KPD': return {g: '−', t: 'bank'}; case 'KPU': return {g: '+', t: 'bank'};
    case 'TUD': return {g: '−', t: 'tuning'}; case 'TUU': return {g: '+', t: 'tuning'};
    default: return {g: C.token(c).replace(/^KB:/, ''), t: ''};
  }
}
const jobText = c => (c.note && c.note.trim()) || (C.TYPES[c.type] ? C.TYPES[c.type].label : c.type);

// ---------- one entry per key ----------
const keys = [], colName = ['l1', 'l2', 'l3'];
for (let i = 0; i < 100; i++) {
  const layerCells = [0, 1, 2].map(l => C.resolveCell(st, C.pageIndex(l, 0), i, false).c);
  const shiftR = C.resolveCell(st, C.pageIndex(0, 0), i, true);
  const SHIFT_SECTION = false;                          // v13: Shift only changes layer / page, so the 4th section is left empty (set true to print Shift jobs again)
  const shiftCell = SHIFT_SECTION && shiftR.shifted ? shiftR.c : null;
  const L = layerCells.map(legendOf), S = shiftCell ? legendOf(shiftCell) : {g: '', t: ''};
  const same = L.every(x => x.g === L[0].g && x.t === L[0].t);
  const hasShift = !!(S.g || S.t) && (S.g !== L[0].g || S.t !== L[0].t);
  const k = {pos: C.keyName(i), jobs: [...layerCells.map(jobText), shiftCell ? jobText(shiftCell) : ''], gs: 1, ts: 1};
  if (same && !hasShift) { k.div = 1; k.sec = [{g: L[0].g, t: L[0].t, c: 'gl'}]; }
  else if (same) { k.div = 2; k.sec = [{g: L[0].g, t: '', c: 'gl'}, {g: S.g, t: S.t, c: 'sh'}]; }
  else { k.div = 4; k.sec = [0, 1, 2].map(l => ({g: L[l].g, t: L[l].t, c: colName[l]})).concat([{g: hasShift ? S.g : '', t: hasShift ? S.t : '', c: 'sh'}]); }
  if (i === 0) k.corner = 'BOOT';
  if (i === 2 || i === 48) k.home = true;
  k.label = k.pos + ' ' + k.sec.map(s => s.g).filter(Boolean).join(' / ');
  keys.push(k);
}

// ---------- outputs ----------
const font = 'Barlow Condensed, Arial Narrow, Arial, sans-serif';
fs.writeFileSync(path.join(out, 'C100_keycaps_layout.svg'), lib.sheetSvg(keys, {theme: 'light', font, mode: 'cap', title: 'C100 8K keycaps (firmware v13): layer 1 / 2 / 3'}));
fs.writeFileSync(path.join(out, 'C100_keycaps_layout_dark.svg'), lib.sheetSvg(keys, {theme: 'dark', font, mode: 'cap', title: 'C100 8K keycaps (firmware v13): layer 1 / 2 / 3'}));
const lines = ['C100 8K keycap labels (firmware v13). Each key: up to 4 sections. L1 / L2 / L3 = the first page of layers 1-3. The 4th section is left empty. Layer 4 is not printed.', ''];
keys.forEach(k => lines.push(k.pos.padEnd(7) + 'div ' + k.div + '   ' + k.sec.map((s, n) => (['L1', 'L2', 'L3', 'SP'][k.div === 1 ? 0 : k.div === 2 ? [0, 3][n] : n] || '').padEnd(3) + (s.g || '-').padEnd(7) + (s.t ? '(' + s.t + ') ' : '')).join('  ') + (k.corner ? '  mark: ' + k.corner : '')));
fs.writeFileSync(path.join(out, 'keycap-labels-v13.txt'), lines.join('\n') + '\n');
const shell = fs.readFileSync(path.join(here, 'keycaps_shell.html'), 'utf8');
const page = shell.replace('/*@@SVGLIB@@*/', () => svgSrc).replace('/*@@DATA@@*/', () => JSON.stringify(keys)).replace('/*@@DATE@@*/', () => new Date().toISOString().slice(0, 10));
fs.writeFileSync(path.join(out, 'C100_keycap_designer.html'), page);
const nd = [1, 2, 3, 4].map(d => keys.filter(k => k.div === d).length);
console.log('keycaps: 1 section x' + nd[0] + ', 2 x' + nd[1] + ', 3 x' + nd[2] + ', 4 x' + nd[3] + ' | wrote C100_keycap_designer.html, C100_keycaps_layout.svg (+ _dark), keycap-labels-v13.txt');
