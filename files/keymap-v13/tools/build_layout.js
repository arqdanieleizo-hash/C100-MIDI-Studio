// build_layout.js: v10 layout + the v11 generative pages (layer 4 pages 2-5) -> c100-layout-v11.txt
const fs = require('fs'), load = require('./load'), C = load(false);
const st = C.parseExport(fs.readFileSync(process.argv[2], 'utf8'));
const set = (pg, i, tok, note) => { const c = C.parseToken(tok); if (!c) throw new Error('bad token ' + tok); pg.cells[i] = Object.assign(c, {note: note || ''}); };
const setS = (pg, i, tok, note) => { const c = C.parseToken(tok); pg.shift[i] = Object.assign(c, {note: note || ''}); };
const idx = (r, c) => (r - 1) * 10 + (c - 1);
function page(slot, name, colors, purpose, ledNote) {
  const pg = C.blankPage(3, slot); Object.assign(pg, {name, colors, purpose, ledNote});
  for (let i = 0; i < 100; i++) pg.cells[i] = C.parseToken(C.isPad(i) ? '-' : '~'), pg.shift[i] = C.parseToken(C.isPad(i) ? '.' : '~');
  for (let i = 0; i < 100; i++) if (C.isPad(i)) pg.shift[i] = C.parseToken('.');
  st.pages[3 * 7 + slot] = pg; return pg;
}
const gs = (pg, from, note) => { for (let r = 0; r < 8; r++) { set(pg, idx(3 + r, 9), 'GS' + (2 * r)); set(pg, idx(3 + r, 10), 'GS' + (2 * r + 1)); } };
// ---- P2 Random walk
let pg = page(1, 'Random walk', ['#34c759', '#5ac8fa', '#ffffff', '#ff9f0a'],
  'Random walk: a walker moves on the 8x8 grid every tick. X = pitch (scale degree 1-8 of the selected scale and root), Y = velocity or a CC. Tap a pad to put the walker there. Rows R3-R10 at the right = settings (left key down, right key up). Needs Play. Plays only while this page is on screen',
  'Walker white, its last 3 positions dimmer, the field dim in the main color.');
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) set(pg, idx(3 + r, 1 + c), 'RW' + ((7 - r) * 8 + c));
gs(pg);
const rwNotes = ['Rate: 8 / 4 / 3 / 2 / 1 sixteenth steps per move', 'Step size: cells per move (1-3)', 'Pull to center: chance (0-100%) that the move goes toward the middle', 'Y mode: left = velocity, right = CC', 'CC number sent by Y in CC mode (0-127)', 'Octave (-2 to +2)', 'Gate: note length 25 / 50 / 75 / 100% of the tick', 'Run: left = off, right = on'];
rwNotes.forEach((n, r) => { pg.cells[idx(3 + r, 9)].note = n; });
pg.cells[idx(3, 1)].note = 'Tap = move the walker there. X = scale degree, Y = velocity (bottom quiet, top loud) or the CC value';
// ---- P3 Turing machine
pg = page(2, 'Turing machine', ['#ff375f', '#ffd60a', '#ffffff', '#64d2ff'],
  'Turing machine: a shift register (2-16 bits). Each tick the last bit comes round again; the lock fader sets the chance that it flips (100% = locked loop, 0% = random). The register value picks a note of the scale. Rows 3-4 = the bits (tap = flip), row 5 = lock fader, rows 6-10 = the last 8 notes as bars. Needs Play. Plays only while this page is on screen',
  'Bits lit in the main color, the feedback bit (last one) white, bits past the length off. Lock fader color 2. History bars color 4, newest bar color 3.');
for (let c = 0; c < 8; c++) { set(pg, idx(3, 1 + c), 'TB' + c); set(pg, idx(4, 1 + c), 'TB' + (8 + c)); set(pg, idx(5, 1 + c), 'TL' + c); }
for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) set(pg, idx(6 + r, 1 + c), 'TH' + ((4 - r) * 8 + c));
gs(pg);
['Rate: 8 / 4 / 3 / 2 / 1 sixteenth steps per tick', 'Register length 2-16 bits', 'Range: 1-3 octaves of the scale', 'Octave (-2 to +2)', 'Rests: chance (0-100%) that a tick is silent', 'Gate: note length 25 / 50 / 75 / 100% of the tick', 'Randomize the register (either key)', 'Run: left = off, right = on'].forEach((n, r) => { pg.cells[idx(3 + r, 9)].note = n; });
pg.cells[idx(3, 1)].note = 'Register bits 1-8 (row 4 = bits 9-16): tap = flip a bit';
pg.cells[idx(5, 1)].note = 'Lock fader: 0 / 15 / 30 / 45 / 60 / 75 / 90 / 100%';
pg.cells[idx(6, 1)].note = 'History: the last 8 notes (oldest left, newest right), higher bar = higher note';
// ---- P4 Bouncing balls
pg = page(3, 'Bouncing balls', ['#30d158', '#0a84ff', '#ffffff', '#ff453a'],
  'Bouncing balls: one ball per column; its note is the scale degree of the column. Tap a pad = drop a ball in that column from that height (bottom row = remove it). A ball hits the floor every 2 x height ticks, so the drop height sets the timing, and a higher drop is louder. Needs Play. Plays only while this page is on screen',
  'Ball white, the apex of its bounce dim, the floor row dim, columns alternate main color / color 2.');
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) set(pg, idx(3 + r, 1 + c), 'BB' + ((7 - r) * 8 + c));
gs(pg);
['Rate: 8 / 4 / 3 / 2 / 1 sixteenth steps per tick (a ball moves one row per tick)', 'Decay: left = off, right = on (each bounce 1 row lower until the ball stops)', 'Rain: chance of a random ball falling per tick (0-10, 3% each)', 'Octave (-2 to +2)', 'Span: scale degrees per column (1-3)', 'Gate: note length 25 / 50 / 75 / 100% of the tick', 'Clear all balls (either key)', 'Run: left = off, right = on'].forEach((n, r) => { pg.cells[idx(3 + r, 9)].note = n; });
pg.cells[idx(3, 1)].note = 'Tap = drop a ball from this height (top row = 7). Bottom row = remove the ball';
// ---- P5 LFO test
pg = page(4, 'LFO test', ['#bf5af2', '#ff9f0a', '#30d158', '#64d2ff'],
  '4 LFOs for testing and MIDI mapping. Each LFO = 2 rows: the top row is its output meter, the bottom row shows the value of the selected setting. Pick the setting with R1C1 / R2C1 / R1C2 / R2C2 (Controls Shift: 4 more), then use the keys at the right of the LFO: upper key = coarse (8), lower key = fine (1); left down, right up. Settings: shape (sine, triangle, saw up, saw down, square, random), rate (tempo synced, 8 bars to 1/16), depth, center, target (0 = pitch bend, else CC number), channel (0 = board channel), run, phase. Runs with Play, only while this page is on screen. All LFOs start off',
  'LFO 1-4 in the 4 palette colors. Meter bright while the LFO runs (dim when off). Setting bar dim. The selected setting key is orange.');
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) set(pg, idx(3 + r, 1 + c), 'LV' + (r * 8 + c));
gs(pg);
const ln = ['coarse', 'fine'];
for (let r = 0; r < 8; r++) pg.cells[idx(3 + r, 9)].note = 'LFO ' + ((r >> 1) + 1) + ' ' + ln[r & 1] + ': change the selected setting (left down, right up)';
set(pg, idx(1, 1), 'GP0', 'Select Shape'); set(pg, idx(2, 1), 'GP1', 'Select Rate'); set(pg, idx(1, 2), 'GP2', 'Select Depth'); set(pg, idx(2, 2), 'GP3', 'Select Center');
setS(pg, idx(1, 1), 'GP4', 'Select Target (0 = pitch bend, else CC number)'); setS(pg, idx(2, 1), 'GP5', 'Select Channel (0 = board channel)');
setS(pg, idx(1, 2), 'GP6', 'Select Run (left off, right on)'); setS(pg, idx(2, 2), 'GP7', 'Select Phase (0-7)');
pg.cells[idx(3, 1)].note = 'Rows 1 / 3 / 5 / 7 of the grid = LFO output meters, rows 2 / 4 / 6 / 8 = value of the selected setting';
st.date = '2026-10-17';
fs.writeFileSync(process.argv[3], C.exportText(st));
console.log('wrote', process.argv[3]);
