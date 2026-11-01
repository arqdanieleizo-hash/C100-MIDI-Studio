// build_layout_v12.js: v11 layout + 4 walkers on layer 4 page 2 -> c100-layout-v12.txt.  Usage: node build_layout_v12.js c100-layout-v11.txt c100-layout-v12.txt
const fs = require('fs'), load = require('./load'), C = load(false);
const st = C.parseExport(fs.readFileSync(process.argv[2], 'utf8'));
const idx = (r, c) => (r - 1) * 10 + (c - 1);
const pg = st.pages[C.pageIndex(3, 1)];
if (pg.name !== 'Random walk') throw new Error('page not found: ' + pg.name);
const set = (tab, i, tok, note) => { const c = C.parseToken(tok); if (!c) throw new Error('bad token ' + tok); tab[i] = Object.assign(c, {note: note || ''}); };
pg.colors = ['#34c759', '#5ac8fa', '#ff9f0a', '#ff2d95'];
pg.purpose = 'Random walk with up to 4 walkers (each its own color and MIDI channel). Each walker moves on the 8x8 grid every tick: X = pitch (scale degree 1-8 of the selected scale and root), Y = velocity or a CC. Tap a pad = put the selected walker there (and switch it on). R3C9-R6C9 = select walker 1-4, R3C10-R6C10 = walker 1-4 on / off, R7C9 / R7C10 = channel of the selected walker down / up. Controls Shift: the 8 shared settings (R3-R10 at the right, left key down, right key up). Needs Play. Plays only while this page is on screen';
pg.ledNote = 'Each walker in its own palette color (walker 1-4 = colors 1-4), its last 3 positions dimmer, the field dim white. Select keys: selected walker white, others dim. On / off keys: walker color when on, very dim when off.';
for (let r = 0; r < 4; r++) {
  set(pg.cells, idx(3 + r, 9), 'WK' + r, r ? '' : 'Select walker 1-4 (R3-R6). Shows its channel (GL = board channel). Then tap a pad to place it, or use the channel keys');
  set(pg.cells, idx(3 + r, 10), 'WK' + (4 + r), r ? '' : 'Walker 1-4 on / off (R3-R6). Walker 1 starts on, the others off');
}
set(pg.cells, idx(7, 9), 'WK8', 'Channel of the selected walker: down. Hold to repeat. GL = follows the board channel, then 1-16');
set(pg.cells, idx(7, 10), 'WK9', 'Channel of the selected walker: up. Hold to repeat');
for (let r = 8; r <= 10; r++) for (let c = 9; c <= 10; c++) set(pg.cells, idx(r, c), '>C');
const sn = ['Rate: 8 / 4 / 3 / 2 / 1 sixteenth steps per move (all walkers)', 'Step size: cells per move (1-3)', 'Pull to center: chance (0-100%) that the move goes toward the middle', 'Y mode: left = velocity, right = CC', 'CC number sent by Y in CC mode (0-127)', 'Octave (-2 to +2)', 'Gate: note length 25 / 50 / 75 / 100% of the tick', 'Run: left = off, right = on (all walkers)'];
for (let r = 0; r < 8; r++) { set(pg.shift, idx(3 + r, 9), 'GS' + 2 * r, 'Shift: ' + sn[r]); set(pg.shift, idx(3 + r, 10), 'GS' + (2 * r + 1)); }
pg.cells[idx(3, 1)].note = 'Tap = move the selected walker there (switches it on). X = scale degree, Y = velocity (bottom quiet, top loud) or the CC value';
// ---- rolled chords: Controls Shift + ARP key
{ const c = C.parseToken('RL'); st.controls.shift[idx(10, 9)] = Object.assign(c, {note: 'Rolled chords on / off (chord keys play their notes one after another). Hold + arrows: up / down = speed (slow harp ... fast guitar), right = direction (up / down / alternate), left = velocity ramp (flat / rising / falling)'}); }

// ===================== v12 new pages =====================
const page = (layer, slot, name, colors, purpose, ledNote, led) => {
  const p = C.blankPage(layer, slot); Object.assign(p, {name, colors, purpose, ledNote});
  for (let i = 0; i < 100; i++) { p.cells[i] = C.parseToken(C.isPad(i) ? '-' : '~'); p.shift[i] = C.parseToken(C.isPad(i) ? '.' : '~'); }
  if (led) p.led = led;
  st.pages[C.pageIndex(layer, slot)] = p; return p;
};
const side = (p, from) => { for (let r = from; r <= 10; r++) for (let c = 9; c <= 10; c++) set(p.cells, idx(r, c), '>C'); };

// ---- Layer 1 page 5 Harmony: chord progression steps
{ const hp = st.pages[C.pageIndex(0, 4)];
  if (hp.name !== 'Harmony') throw new Error('harmony page not found: ' + hp.name);
  for (let r = 0; r < 4; r++) set(hp.cells, idx(3 + r, 9), 'CP' + r, r ? '' : 'Chord progression steps 1-4 (top to bottom). Tap = select a step (it blinks). Delete + tap = clear it. Empty = dark, filled = page color, playhead = white, a waiting chord blinks in color 2');
  hp.purpose += '. Chord progression: 4 slots on R3C9-R6C9 (start empty). Loop = the step recorder BARS setting (1 bar = 16 steps, 4 per chord). Play runs the loop. To edit: select a step, then press a chord key (stopped: set at once; Play + Record: set at the next loop; Play only: just loops)';
}

// ---- Layer 3 page 4 CC sequencer
let q = page(2, 3, 'CC sequencer', ['#ff9f0a', '#5ac8fa', '#30d158', '#ff2d95'],
  'CC step sequencer for synth and effect parameters (Volca, analog synths via MIDI-to-CV, Ableton MIDI map). 4 lanes x 8 steps on 16th notes, each step has its own CC value 0-127. Top 4 rows = lanes 1-4: tap a step to select it (it blinks), tap it again to switch it on / off. Then use the value keys to change the selected step (the CC is sent at once as a preview). Runs with its own play key, in the background (also on other pages). Steps that are off send nothing',
  'Steps in the lane color (lane 1-4 = colors 1-4), brightness follows the step value, selected step blinks, playhead white, steps past the lane length off, muted lane dim.');
for (let l = 0; l < 4; l++) for (let c = 0; c < 8; c++) set(q.cells, idx(3 + l, 1 + c), 'CQ' + (l * 8 + c));
for (let k = 0; k < 8; k++) { set(q.cells, idx(7, 1 + k), 'CR' + k); set(q.cells, idx(8, 1 + k), 'CR' + (8 + k)); }
for (let k = 0; k < 3; k++) set(q.cells, idx(9, 1 + k), 'CR' + (16 + k));
for (let k = 0; k < 4; k++) set(q.cells, idx(10, 1 + k), 'CR' + (19 + k));
side(q, 3);
const cqn = {R7C1: 'Value of the selected step: -8', R7C2: 'Value: +8', R7C3: 'Value: -1', R7C4: 'Value: +1 (keys repeat when held)', R7C5: 'Tempo -5 BPM', R7C6: 'Tempo +5 BPM', R7C7: 'Length of the selected lane: shorter (1-8 steps)', R7C8: 'Length of the selected lane: longer',
  R8C1: 'CC number of the selected lane: down', R8C2: 'CC number of the selected lane: up', R8C3: 'MIDI channel of the sequencer: down (1-16)', R8C4: 'MIDI channel: up', R8C5: 'Play / stop this sequencer (starts the internal clock if nothing else is running)', R8C6: 'Reset: start again from step 1',
  R8C7: 'Fill lane: switch every step of the lane on', R8C8: 'Clear lane: switch every step off and set the values to 64', R9C1: 'Test preset 1 - Volca Keys: cutoff 44, delay time 52, delay feedback 53, LFO rate 46', R9C2: 'Test preset 2 - Volca FM2: chorus 93, reverb 91, LFO rate 46, LFO pitch depth 47',
  R9C3: 'Test preset 3 - generic CC 20-23 for the Ableton MIDI map', R10C1: 'Mute lane 1 (R10C2-R10C4 = lanes 2-4)'};
Object.entries(cqn).forEach(([k, v]) => { const m = /R(\d+)C(\d+)/.exec(k); q.cells[idx(+m[1], +m[2])].note = v; });
q.cells[idx(3, 1)].note = 'Rows 1-4 of the pad = lanes 1-4, 8 steps each. Tap = select, tap again = on / off';

// ---- Layer 4 page 6 Pond
let pd = page(3, 5, 'Pond', ['#00b4ff', '#5e5ce6', '#ffffff', '#64d2ff'],
  'Pond: the 8x8 pad is a water surface. A pad press drops a pebble (it plays its own note) and ripples spread out. Where ripples overlap their heights add up; when the height at a cell passes the threshold, that cell plays its note. Notes are in the selected scale and root: +1 scale step per column, +3 per row. Wave height sets the velocity and a filter CC (CC 74 by default): big waves are loud and bright, fading ripples soft and muffled. Drum mode: the wave height picks the drum (36-43) by intensity. Plays only while this page is on screen. No Play key needed',
  'Wave crests in the main color (brighter = higher), troughs dim in color 2, the pebble flashes white.');
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) set(pd.cells, idx(3 + r, 1 + c), 'PD' + ((7 - r) * 8 + c));
for (let k = 0; k < 14; k++) { const r = 3 + (k >> 1), c = 9 + (k & 1); if (r <= 9) set(pd.cells, idx(r, c), 'PN' + k); }
side(pd, 10);
const pdn = ['Ripple speed (1-6): down / up', 'Decay: how long ripples last (1-5)', 'Threshold: lower = more notes (1-9)', 'Wavelength: short = busy, long = slow waves (1-5)', 'R7C9: melodic / drum mode. R7C10: clear all ripples', null, 'Octave (-2 to +2)', 'Filter CC number (default 74)'];
pdn.forEach((n, r) => { if (n) pd.cells[idx(3 + r, 9)].note = n; });
pd.cells[idx(3, 1)].note = 'Tap = drop a pebble here. Ripples (max 8 at once) play the cells they reach';

// ---- Layer 4 page 7 Constellation
let cn = page(3, 6, 'Constellation', ['#ffd60a', '#5ac8fa', '#ffffff', '#ff375f'],
  'Constellation: tap pads to place anchors (max 20, tap an anchor again to remove it). The anchors are joined by a nearest-neighbour path; a playhead runs along each path on the 16th clock (needs Play). On an anchor it plays a sustained chord from the in-key grid (held until the next anchor); on the cells in between it plays short notes (straight and diagonal). Shape sends CCs: area and perimeter = filter cutoff (CC 74), number of empty keys = reverb send (CC 91), number of anchors = maximum velocity. Arrows: up / down = BPM, left / right = maximum connection distance (low = several small sequences run at once). R10C10 = clear. Plays only while this page is on screen',
  'Anchors bright in the main color, path dim in color 2, playhead white.');
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) set(cn.cells, idx(3 + r, 1 + c), 'CN' + ((7 - r) * 8 + c));
side(cn, 3);
set(cn.cells, idx(10, 10), 'CX', 'Clear: remove all anchors');
cn.cells[idx(3, 1)].note = 'Tap = place an anchor (or remove it). Max 20. The arrows at the top right: up / down = BPM, left / right = maximum connection distance';

// ---- Layer 4 page 8 MIDI Echo
let ec = page(3, 7, 'MIDI Echo', ['#bf5af2', '#ff9f0a', '#ffffff', '#64d2ff'],
  'MIDI echo (a delay pedal in MIDI): the pad plays the note at once, then sends repeats of it, each quieter. Only real pad presses make echoes (echoes never make new echoes). Pads = chromatic like layer 1 page 2. Keys at the right (left key down, right key up, hold to repeat): R3 = echo time 50-1000 ms, R4 = feedback 0-80% (velocity lost per repeat), R5 = repeats 1-8, R6 = note length of each echo 20-300 ms. R7C9 = echo on / off (lit = on). The display shows the new value (3 digits: the hundreds as dots)',
  'Pads lit by the selected scale and root. The on / off key is orange when echo is on.', 'scale');
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) set(ec.cells, idx(3 + r, 1 + c), 'T' + (92 - 8 * r + c));
for (let k = 0; k < 8; k++) set(ec.cells, idx(3 + (k >> 1), 9 + (k & 1)), 'EC' + k);
set(ec.cells, idx(7, 9), 'EC8', 'Echo on / off');
side(ec, 8); set(ec.cells, idx(7, 10), '>C');
['Echo time (50-1000 ms): down / up', 'Feedback (0-80 % lost per repeat): down / up', 'Repeats (1-8): down / up', 'Length of each echo (20-300 ms): down / up'].forEach((n, r) => { ec.cells[idx(3 + r, 9)].note = n; });
ec.cells[idx(3, 1)].note = 'Chromatic pads (same as layer 1 page 2). A press plays the note and queues the echoes';

st.date = '2026-10-26';
fs.writeFileSync(process.argv[3], C.exportText(st));
console.log('wrote', process.argv[3]);
