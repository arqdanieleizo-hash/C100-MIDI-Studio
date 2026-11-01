// build_layout_v13.js: v12 layout -> c100-layout-v13.txt.  Usage: node build_layout_v13.js ../c100-layout-v12.txt ../c100-layout-v13.txt
// Each section of the v13 work adds its changes below (A = layer 4 clean-up, B = layer 2, ...).
const fs = require('fs'), path = require('path');
const OLD = require(path.join(__dirname, '..', '..', 'keymap-v12', 'tools', 'load'))(false);   // v12 core: it still knows the removed pages
const C = require('./load')(false);                                                               // v13 core
const st = OLD.parseExport(fs.readFileSync(process.argv[2], 'utf8'));
const idx = (r, c) => (r - 1) * 10 + (c - 1);
const set = (tab, i, tok, note) => { const c = C.parseToken(tok); if (!c) throw new Error('bad token ' + tok); tab[i] = Object.assign(c, {note: note === undefined ? '' : note}); };

// ===== A. Layer 4: keep Random walk, Pond, Constellation (slots 1-3); the other five pages are archived =====
{
  const L4 = 3, name = s => st.pages[OLD.pageIndex(L4, s)].name;
  const keep = [['Random walk', 1], ['Pond', 5], ['Constellation', 6]];
  keep.forEach(([n, s]) => { if (name(s) !== n) throw new Error('layer 4 page ' + (s + 1) + ' is ' + name(s) + ', expected ' + n); });
  const pages = keep.map(([, s]) => st.pages[OLD.pageIndex(L4, s)]);
  pages.forEach((p, k) => { p.slot = k; st.pages[C.pageIndex(L4, k)] = p; });
  for (let s = 3; s < C.NUM_SLOTS; s++) st.pages[C.pageIndex(L4, s)] = C.blankPage(L4, s);
}

// ===== B. Layer 2 =====
{
  const L2 = 1;
  // ---- page 1 Launcher: the track mode keys move to columns 9-10, the knobs go ----
  const p1 = st.pages[C.pageIndex(L2, 0)];
  if (p1.name !== 'Launcher') throw new Error('layer 2 page 1 is ' + p1.name);
  const tm = [[3, 9, 'TM1', 'Track mode arm'], [3, 10, 'TM2', 'Track mode solo'], [4, 9, 'TM3', 'Track mode mute'], [4, 10, 'TM0', 'Track mode select (the default)'],
    [5, 9, 'TM4', 'Mode: grid = 8 volume faders (CC 40-47)'], [5, 10, 'TM5', 'Mode: grid = 8 pan faders (CC 48-55)'],
    [6, 9, 'TM6', 'Mode: grid = send A faders (CC 56-63)'], [6, 10, 'TM7', 'Mode: grid = send B faders (CC 72-79)']];
  tm.forEach(([r, c, t, n]) => set(p1.cells, idx(r, c), t, n + '. Press a lit mode key again to go back to select'));
  set(p1.cells, idx(7, 9), 'KB:CTRL+D', 'Duplicate (Ctrl+D)');
  set(p1.cells, idx(7, 10), 'KB:DEL', 'Delete / clear (Del)');
  for (let r = 8; r <= 10; r++) for (let c = 9; c <= 10; c++) set(p1.cells, idx(r, c), '-');
  [[1, 1], [1, 2], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [2, 1]].forEach(([r, c]) => set(p1.shift, idx(r, c), '~'));
  p1.purpose = 'Ableton clip launcher (Launchpad Pro style). Clips = notes 0-63 on channel 16, map them with MIDI Map. Row 2 = track buttons (channel 16, notes 64-95). Columns 9-10: R3-R4 = track modes arm / solo / mute / select, R5-R6 = volume / pan / send A / send B faders for the grid, R7 = Duplicate / Delete';

  // ---- page 2 XY effects: each effect has its own channel ----
  const p2 = st.pages[C.pageIndex(L2, 1)];
  if (p2.name !== 'XY effects') throw new Error('layer 2 page 2 is ' + p2.name);
  p2.purpose = 'Kaoss Pad style: X = CC16, Y = CC17, touch = CC18. Effect select (row 2) = CC19 on the board channel, and the 8 effects each have their own channel for X / Y / touch: effect 1 = channel 9 ... effect 8 = channel 16, so each effect can be mapped on its own in Ableton';
  p2.cells[idx(2, 1)].note = 'Effects 1-8 (R2C1-R2C8): select the effect (CC 19) and send X / Y / touch on channel 9-16 (effect n = channel 8 + n). The selected effect is white';

  // ---- page 4 Knobs and shortcuts: the bottom 4 rows become 32 shortcut keys ----
  const p4 = st.pages[C.pageIndex(L2, 3)];
  if (p4.name !== 'Knobs and shortcuts') throw new Error('layer 2 page 4 is ' + p4.name);
  const rows = {
    7:  [['CTRL+A', 'Select all'], ['CTRL+Z', 'Undo'], ['CTRL+Y', 'Redo'], ['CTRL+SHIFT+A', 'Invert selection'],
         ['UP', 'Arrow up'], ['DOWN', 'Arrow down'], ['LEFT', 'Arrow left'], ['RIGHT', 'Arrow right']],
    8:  [['CTRL+C', 'Copy'], ['CTRL+X', 'Cut'], ['CTRL+V', 'Paste'], ['CTRL+U', 'Quantize'],
         ['CTRL+SHIFT+X', 'Cut time'], ['CTRL+SHIFT+G', 'Ungroup'], ['CTRL+ENTER', 'Apply MIDI tool'], ['K', 'Highlight scale']],
    9:  [['Z', 'Zoom to selection'], ['X', 'Zoom back'], ['R', 'Reverse'], ['CTRL+ALT+F', 'Fade / crossfade'],
         ['A', 'Automation mode'], ['CTRL+SHIFT+W', 'Second window'], ['F11', 'Full screen'], null],
    10: [['CTRL+SHIFT+E', 'Split at time selection'], ['CTRL+SHIFT+DEL', 'Delete time'], ['CTRL+SHIFT+D', 'Duplicate time'], ['CTRL+SHIFT+V', 'Paste time'],
         null, null, null, null]
  };
  Object.entries(rows).forEach(([r, list]) => list.forEach((e, k) => { if (e) set(p4.cells, idx(+r, 1 + k), 'KB:' + e[0], e[1] + ' (' + e[0].replace(/\+/g, '+') + ')'); else set(p4.cells, idx(+r, 1 + k), '-', ''); }));
  // ---- Controls Shift: the whole 8x8 = 32 knobs (left key down, right key up), channel 15. CC 20-35 stay where they were (R7-R10), CC 36-39 and 90-101 are new (R3-R6) ----
  const knobCC = [[36, 37, 38, 39], [90, 91, 92, 93], [94, 95, 96, 97], [98, 99, 100, 101], [20, 21, 22, 23], [24, 25, 26, 27], [28, 29, 30, 31], [32, 33, 34, 35]];
  knobCC.forEach((row, k) => row.forEach((cc, j) => {
    const r = 3 + k, c = 1 + 2 * j;
    set(p4.shift, idx(r, c), 'K' + cc + '-', 'Shift: knob CC ' + cc + ' down (channel 15)');
    set(p4.shift, idx(r, c + 1), 'K' + cc + '+', 'Shift: knob CC ' + cc + ' up');
  }));
  p4.purpose = 'Navigate Ableton without mouse and keyboard: rows 3-6 = Ableton shortcuts, rows 7-10 = more shortcuts (edit, zoom, time, arrows). Track buttons in row 2 work as on page 1 (channel 16, notes 64-95). While Controls Shift is held the whole 8x8 becomes 32 knobs, two keys each (left = down, right = up), CC on channel 15: rows 7-10 = CC 20-35 (as before), rows 3-6 = CC 36-39 and 90-101';
  p4.ledNote = 'Pads off; they light while pressed.';
}

// ===== C. Layer 3: Euclidean = hold LEN / HITS / VAR; CC sequencer presets removed; Controls Shift + Tap = clock source =====
{
  const eu = st.pages[C.pageIndex(2, 2)];
  if (eu.name !== 'Euclidean') throw new Error('layer 3 page 3 is ' + eu.name);
  eu.purpose = 'Euclidean drums (Polygene style): 8 lanes (notes 36-43, bottom row = lane 1), each 1-8 steps on the 1/16 clock with its own length, hits, start point and variation. The two keys at the right of every lane (left = down, right = up) change one setting at a time: with NOTHING held they move the lane\'s START POINT (the first step of its pattern, shown in its own colour). HOLD Length (R1C1) and they change the length, HOLD Hits (R2C1) and they change the number of hits (spread as evenly as possible), HOLD Shift + R2C1 and they change the variation. Let go and they are off again. The arrows show steps 1-8 / 9-16. Plays only while this page is on screen';
  eu.ledNote = 'Hits in the lane colour (lanes alternate main colour / colour 2), empty steps dim, steps past the length off, the playing step white, the lane\'s start point in colour 4. The Length / Hits keys are orange only while you hold them.';
  eu.cells[idx(1, 1)].note = 'LENGTH: hold it and tap a lane\'s - / + keys (columns 9-10) to change that lane\'s length (1-16 steps). Off when not held';
  eu.cells[idx(2, 1)].note = 'HITS: hold it and tap a lane\'s - / + keys to change the number of hits (spread as evenly as possible). Off when not held';
  eu.cells[idx(10, 1)].note = 'Tap a step = lane length up to that step. Arrows: right = steps 9-16, left = steps 1-8';
  eu.cells[idx(10, 9)].note = 'Lane 1 - / +. With nothing held: move the lane\'s start point (it wraps around). Hold Length or Hits first to change those instead (lane 2 is R9, up to lane 8 at R3)';
  eu.shift[idx(1, 1)].note = 'Shift + this key: start point (the same as holding nothing)';
  eu.shift[idx(2, 1)].note = 'VARIATION: hold Shift + this key and tap a lane\'s - / + keys (0-100%: chance per step that a hit drops or a rest plays a ghost hit)';

  const cq = st.pages[C.pageIndex(2, 3)];
  if (cq.name !== 'CC sequencer') throw new Error('layer 3 page 4 is ' + cq.name);
  [16, 17, 18].forEach(k => set(cq.cells, idx(9, 1 + (k - 16)), '-', ''));        // the 3 test presets are removed for now

  set(st.controls.shift, idx(2, 5), 'CLK', 'Clock source: tap = Auto (follows a MIDI clock from Ableton or another device when one arrives) / Internal only (ignores outside clock, start and stop). The key is orange while an outside clock is running. The pads show AU or IN');
}

// ===== D. Step one: Controls Shift is for navigation ONLY; every other job has its own key or a "hold a key + arrows" setting; LED colours = keycap colours =====
{
  const pg = (l, s) => st.pages[C.pageIndex(l, s)];
  const B = st.controls.base, S = st.controls.shift;
  const clearShift = tab => { for (let i = 0; i < 100; i++) if (!C.isLocked(i)) tab[i] = Object.assign(C.parseToken('~'), {note: ''}); };
  const none = (tab, r, c) => set(tab, idx(r, c), '-', '');

  // --- Controls: Shift keeps only layer / page navigation. The default knobs go; the freed side keys carry the jobs that needed Shift ---
  clearShift(S);
  for (let r = 3; r <= 8; r++) for (const c of [9, 10]) none(B, r, c);
  set(B, idx(4, 9), 'REC', 'Ableton record (CC 87). Board record is R1C5');
  set(B, idx(4, 10), 'KB:CTRL+Y', 'Redo (Ctrl+Y). Undo is R2C3');
  set(B, idx(6, 9), 'KB:CTRL+U', 'Ableton Quantize (Ctrl+U). Scale quantize is R2C4');
  set(B, idx(6, 10), 'CLK', 'Clock source: tap = Auto (follows a MIDI clock from Ableton or another device when one arrives) / Internal only (ignores outside clock, start and stop). Orange while an outside clock is running. The pads show AU or IN');
  set(B, idx(8, 9), 'RL', 'Rolled chords: tap = on / off (chord keys play their notes one after another). Hold it + arrows: up / down = speed (slow harp ... fast guitar), right = direction (up / down / alternate), left = velocity ramp (flat / rising / falling)');
  B[idx(1, 2)].note = 'Delete: hold it and tap a mini-sequencer step to clear that step. Double-tap = clear the whole selected sequence (on the step recorder: the whole track)';
  B[idx(2, 2)].note = 'Copy the selected mini sequence. Double-tap = paste, then tap the first step';
  B[idx(1, 3)].note = 'Shift: hold it and use the four arrow keys (top right) to change layer and page. This is the only job of Shift';
  B[idx(1, 5)].note = 'Board record: the mini sequencer records the drums and pianos you play while it runs. Flashes red while on. Ableton record is R4C9';
  B[idx(2, 3)].note = 'Undo (Ctrl+Z). Redo is R4C10';
  B[idx(2, 4)].note = 'Scale quantize on / off: out-of-scale notes snap into the scale. Ableton Quantize (Ctrl+U) is R6C9';
  B[idx(10, 9)].note = 'Arpeggiator: double-tap = on / off for everything you play. Hold = the top 4 grid rows show the arp settings. Hold + up / down = pattern, left / right = cadence stop bars. Rolled chords are R8C9';

  B[idx(1, 9)].note = 'Arrow right (big step). With Controls Shift: page up (layer 1 has 7 pages, layer 2 has 5, layer 3 has 4, layer 4 has 3). Always an arrow, never replaced by a page';
  // --- Layer 2 page 1 (Launcher): the knob keys become Ableton commands ---
  const l1 = pg(1, 0);
  set(l1.cells, idx(8, 9), 'KB:CTRL+Z', 'Undo (Ctrl+Z)'); set(l1.cells, idx(8, 10), 'KB:CTRL+Y', 'Redo (Ctrl+Y)');
  set(l1.cells, idx(9, 9), 'REC', 'Ableton record (CC 87)'); set(l1.cells, idx(9, 10), 'KB:CTRL+U', 'Ableton Quantize (Ctrl+U)');
  set(l1.cells, idx(10, 9), 'KB:ENTER', 'Launch the selected clip or scene (Enter)'); set(l1.cells, idx(10, 10), 'KB:0', 'Switch the selected clip on / off (0)');
  l1.purpose = 'Ableton clip launcher (Launchpad Pro style). Clips = notes 0-63 on channel 16, map them with MIDI Map. Row 2 = track buttons (channel 16, notes 64-95). Columns 9-10: R3-R4 = track modes arm / solo / mute / select, R5-R6 = volume / pan / send A / send B faders for the grid, R7 = Duplicate / Delete, R8 = Undo / Redo, R9 = Ableton record / Quantize, R10 = launch selected / clip on-off';
  // --- Layer 2 page 2 (XY): the knobs go ---
  const xy = pg(1, 1);
  for (let r = 6; r <= 9; r++) for (const c of [9, 10]) set(xy.cells, idx(r, c), '>C', '');
  // --- Layer 2: page 4 = the 32 knobs (always on, no Shift), page 5 = the shortcuts ---
  const old4 = pg(1, 3);
  if (old4.name !== 'Knobs and shortcuts') throw new Error('layer 2 page 4 is ' + old4.name);
  const knobTokens = old4.shift.map(c => ({tok: C.token(c), note: c.note}));
  const p5 = old4; p5.slot = 4; p5.name = 'Shortcuts'; p5.shift = C.blankPage(1, 4).shift;
  p5.purpose = 'Navigate Ableton without mouse and keyboard: rows 3-6 = Ableton shortcuts, rows 7-10 = more shortcuts (edit, zoom, time, arrows). Track buttons in row 2 work as on page 1 (channel 16, notes 64-95)';
  st.pages[C.pageIndex(1, 4)] = p5;
  const p4 = C.blankPage(1, 3);
  Object.assign(p4, {name: 'Knobs', channel: 15, led: 'auto', colors: p5.colors.slice(),
    purpose: '32 knobs, two keys each (left = down, right = up, hold to keep turning), always on, on channel 15. Rows 7-10 = CC 20-35, rows 3-6 = CC 36-39 and 90-101. Track buttons in row 2 work as on page 1 (channel 16, notes 64-95)',
    ledNote: 'Every pad in the page colour; it brightens while pressed.'});
  for (let i = 0; i < 100; i++) if (C.isPad(i)) { p4.cells[i] = Object.assign(C.parseToken(knobTokens[i].tok), {note: knobTokens[i].note.replace(/^Shift: /, '')}); }
  [[3, 9], [3, 10], [4, 9], [4, 10]].forEach(([r, c]) => set(p4.cells, idx(r, c), '>C', ''));
  st.pages[C.pageIndex(1, 3)] = p4;

  // --- Layer 3 page 1 (Step recorder): the Shift settings get their own keys ---
  const sr = pg(2, 0);
  set(sr.cells, idx(3, 9), 'MET', 'Metronome on / off (clicks on every beat while playing)');
  set(sr.cells, idx(3, 10), 'SDR', 'Track direction (hold + arrows): FW forward, RV reverse, PP ping-pong, RN random');
  set(sr.cells, idx(4, 9), 'SRT', 'Track rate (track under the cursor): hold + arrows. Up / down = 1/8, 1/16, 1/32; right / left = triplet on / off (3 dots on the grid = triplet)');
  set(sr.cells, idx(4, 10), 'SSW', 'Track swing (hold + arrows), 0-50%: every second step is late');
  clearShift(sr.shift);
  sr.ledNote = sr.ledNote.replace(' or Controls Shift', '');
  sr.purpose = sr.purpose.replace(/ Each track has its own rate, swing and direction \(Controls Shift keys\);/, ' Each track has its own rate, swing and direction (keys R3-R4 at the right);');

  // --- Layer 3 page 3 (Euclidean): hold Length / Hits / Variation + arrows; nothing held = start point ---
  const eu = pg(2, 2);
  eu.cells[idx(1, 1)].note = 'LENGTH: hold it and use the arrows: up / down = pick the lane, left / right = change that lane\'s length (1-8). Off when not held';
  eu.cells[idx(2, 1)].note = 'HITS: hold it and use the arrows: up / down = pick the lane, left / right = number of hits (spread as evenly as possible). Off when not held';
  set(eu.cells, idx(1, 2), 'EP3', 'VARIATION: hold it and use the arrows: up / down = pick the lane, left / right = 0-100% chance per step that a hit drops or a rest plays a ghost hit');
  set(eu.cells, idx(2, 2), '-', '');
  clearShift(eu.shift);
  for (let r = 3; r <= 10; r++) for (const c of [9, 10]) set(eu.cells, idx(r, c), '>C', '');
  eu.cells[idx(10, 1)].note = 'Tap a step = the lane\'s length ends at that step';
  eu.purpose = 'Euclidean drums (Polygene style): 8 lanes (notes 36-43, bottom row = lane 1), each up to 16 steps on the 1/16 clock with its own length, hits, start point and variation. Use the four arrows (top right): UP / DOWN pick the lane (its dim steps get brighter, the pads show L1-L8), LEFT / RIGHT change one setting of that lane. With NOTHING held the setting is the START POINT (the first step of the pattern, in its own colour). HOLD Length (R1C1), Hits (R2C1) or Variation (R1C2) to change those instead. Plays only while this page is on screen';
  eu.ledNote = 'Hits in the lane colour (lanes alternate main colour / colour 2), empty steps dim (brighter in the picked lane), steps past the length off, the playing step white, the lane\'s start point in colour 4. Length / Hits / Variation are orange only while held.';

  // --- Layer 3 page 4 (CC sequencer): 4 lanes x 8 steps x 8 effect layers, mute / learn per lane, record to enter values, live faders ---
  const cq = pg(2, 3);
  if (cq.name !== 'CC sequencer') throw new Error('layer 3 page 4 is ' + cq.name);
  for (let r = 3; r <= 10; r++) for (const c of [9, 10]) set(cq.cells, idx(r, c), '>C', '');
  for (let l = 0; l < 4; l++) {
    set(cq.cells, idx(3 + l, 9), 'CR' + (19 + l), 'MUTE lane ' + (l + 1) + ' (all effect layers). Orange = muted');
    set(cq.cells, idx(3 + l, 10), 'CY' + l, 'LEARN lane ' + (l + 1) + ': tap it, then move a knob on your controller (Ableton, a keyboard with knobs): the lane takes that CC number. Needs a device that sends CC; Volca synths cannot be learned, use CC - / + instead');
  }
  set(cq.cells, idx(7, 9), 'CR23', 'RECORD on / off. Off = the 4 lanes are live faders. On = tap a step to edit it');
  for (let k = 0; k < 8; k++) { set(cq.cells, idx(9, 1 + k), 'CE' + k, k === 0 ? 'EFFECT LAYERS 1-8: tap = select the layer you edit, tap the selected one again = on / off. Bright = on, dim = off, white blink = selected. Every layer that is on sends its own CC numbers and values at the same time' : ''); set(cq.cells, idx(10, 1 + k), '-', ''); }
  cq.cells[idx(3, 1)].note = 'Lanes 1-4 = rows 3-6, 8 steps each, of the selected effect layer. Not recording: tap a key = send that lane\'s CC live (column 1 = 0 ... column 8 = 127, like a fader). Recording: tap a step, the lane\'s 8 keys flash, then tap key 1-8 for its value (1 = 0, 8 = 127); double-tap a step = on / off';
  cq.cells[idx(7, 1)].note = 'Value of the selected step: -8';
  cq.purpose = 'CC step sequencer for synth and effect parameters (Volca, analog synths via MIDI-to-CV, Ableton MIDI map). 4 lanes x 8 steps on 16th notes, and 8 EFFECT LAYERS (row 9): each layer gives every lane its own CC number and its own step values, and every layer that is on sends at the same time, so several effects run together. Rows 3-6 = the lanes of the selected layer; column 9 = MUTE per lane, column 10 = LEARN per lane (move a knob on your controller and the lane takes that CC). Not recording, the lanes are live faders. Record (R7C9): tap a step (its lane flashes), tap a key 1-8 for the value, double-tap a step = on / off. Rows 7-8: value -8 / +8 / -1 / +1, tempo -5 / +5, lane length - / +, lane CC - / +, MIDI channel - / +, play / stop, reset, fill lane, clear lane. Channel 14 by default; the layers use CC 20-51 (layer 1 = 20-23, layer 2 = 24-27 ...). Runs in the background, also on other pages. Steps that are off send nothing';
  cq.ledNote = 'Steps in the lane colour (lane 1-4 = colours 1-4), brightness follows the step value, playhead white, steps past the lane length off, muted lane dim. Effect layers in 8 colours: bright = on, dim = off, white blink = selected. While you enter a value the lane flashes (brighter to the right).';
  clearShift(cq.shift);

  // --- Layer 4 page 1 (Random walk): the Shift bank becomes hold-a-key + arrows ---
  const rw = pg(3, 0);
  if (rw.name !== 'Random walk') throw new Error('layer 4 page 1 is ' + rw.name);
  const rwKeys = [[7, 9, 'GH6', 'Channel of the selected walker: hold it and use the arrows (up / right = higher, down / left = lower). GL = follows the board channel, then 1-16'],
    [7, 10, 'GT0', 'Run on / off for all walkers (tap)'], [8, 9, 'GH0', 'Rate: hold + arrows. 8 / 4 / 3 / 2 / 1 sixteenth steps per move (all walkers)'],
    [8, 10, 'GH1', 'Step size: hold + arrows. Cells per move (1-3)'], [9, 9, 'GH2', 'Pull to centre: hold + arrows. Chance (0-100%) that the move goes toward the middle'],
    [9, 10, 'GH3', 'Y mode: hold + up / down = velocity / CC; hold + left / right = the CC number (0-127)'], [10, 9, 'GH4', 'Octave: hold + arrows (-2 to +2)'], [10, 10, 'GH5', 'Gate: hold + arrows. Note length 25 / 50 / 75 / 100% of the tick']];
  rwKeys.forEach(([r, c, t, n]) => set(rw.cells, idx(r, c), t, n));
  clearShift(rw.shift);
  rw.purpose = 'Random walk with up to 4 walkers (each its own colour and MIDI channel). Each walker moves on the 8x8 grid every tick: X = pitch (scale degree 1-8 of the selected scale and root), Y = velocity or a CC. Tap a pad = put the selected walker there (and switch it on). R3C9-R6C9 = select walker 1-4, R3C10-R6C10 = walker 1-4 on / off. The settings are keys you HOLD while you tap the arrows: R7C9 channel of the selected walker, R7C10 run on / off (tap), R8C9 rate, R8C10 step size, R9C9 pull to centre, R9C10 Y mode / CC number, R10C9 octave, R10C10 gate. Needs Play. Plays only while this page is on screen';
  rw.cells[idx(3, 9)].note = 'Select walker 1-4 (R3-R6). Shows its channel (GL = board channel). Then tap a pad to place it, or hold R7C9 + arrows for its channel';

  // --- Layer 4 page 2 (Pond): hold a setting key + arrows ---
  const pd = pg(3, 1);
  if (pd.name !== 'Pond') throw new Error('layer 4 page 2 is ' + pd.name);
  for (let r = 3; r <= 10; r++) for (const c of [9, 10]) set(pd.cells, idx(r, c), '>C', '');
  const pdKeys = [[3, 9, 'GH0', 'Ripple speed: hold + arrows (1-6)'], [3, 10, 'GH1', 'Decay: hold + arrows. How long ripples last (1-5)'], [4, 9, 'GH2', 'Threshold: hold + arrows. Lower = more notes (1-9)'],
    [4, 10, 'GH3', 'Wavelength: hold + arrows. Short = busy, long = slow waves (1-5)'], [5, 9, 'GH4', 'Octave: hold + arrows (-2 to +2)'], [5, 10, 'GH5', 'Filter CC number: hold + arrows (default 74)'],
    [6, 9, 'GH6', 'Reach: hold + arrows. How far a ripple carries before it fades (1-5)'], [6, 10, 'GH7', 'Note length: hold + arrows (1-5: 60, 120, 200, 400, 800 ms)'],
    [7, 9, 'GH8', 'Max ripples at once: hold + arrows (1-8). Fewer = calmer'], [7, 10, 'GT0', 'Melodic / drum mode (tap)'], [8, 9, 'GT1', 'Clear all ripples (tap)']];
  pdKeys.forEach(([r, c, t, n]) => set(pd.cells, idx(r, c), t, n));
  clearShift(pd.shift);
  pd.purpose = 'Pond: the 8x8 pad is a water surface. A pad press drops a pebble (it plays its own note) and ripples spread out. Where ripples overlap their heights add up; when the height at a cell passes the threshold, that cell plays its note. Notes are in the selected scale and root: +1 scale step per column, +3 per row. Wave height sets the velocity and a filter CC (CC 74 by default): big waves are loud and bright, fading ripples soft and muffled. Drum mode: the wave height picks the drum (36-43). Settings: HOLD a key in columns 9-10 (R3-R7) and use the arrows. R7C10 = melodic / drum mode, R8C9 = clear ripples. Plays only while this page is on screen. No Play key needed';

  // --- the other pages: nothing left on Shift ---
  st.pages.forEach(p => { if (C.pageActive(C.pageIndex(p.layer, p.slot))) clearShift(p.shift); });

  // --- LED colours = keycap colours: layer 1 amber, layer 2 blue, layer 3 green (layer 4 is not printed on the keycaps and keeps its colours) ---
  const hex2 = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16)), toHex = a => '#' + a.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const rot = (h, deg) => {                       // rotate the hue, keep the lightness
    const [r, g, b] = hex2(h).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let hh = 0, s = 0; if (d) { s = d / (1 - Math.abs(2 * l - 1)); hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; if (hh < 0) hh += 360; }
    hh = (hh + deg + 360) % 360; const cc = (1 - Math.abs(2 * l - 1)) * s, x = cc * (1 - Math.abs((hh / 60) % 2 - 1)), m = l - cc / 2;
    const [r1, g1, b1] = hh < 60 ? [cc, x, 0] : hh < 120 ? [x, cc, 0] : hh < 180 ? [0, cc, x] : hh < 240 ? [0, x, cc] : hh < 300 ? [x, 0, cc] : [cc, 0, x];
    return toHex([(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255]);
  };
  const tint = (h, w) => toHex(hex2(h).map(v => v + (255 - v) * w));
  const LAYER_COLOR = ['#ffb347', '#6aa9ff', '#4fe08c'];
  for (let l = 0; l < 3; l++) for (let s = 0; s < C.LAYER_PAGES[l]; s++) {
    const base = LAYER_COLOR[l];
    pg(l, s).colors = [base, tint(base, 0.5), rot(base, 20), rot(base, -20)];   // the layer colour, a pale tint, and two close neighbours so a layer stays in its own colour family
  }
}

// ===== write =====
st.date = new Date().toISOString().slice(0, 10);
const text = C.exportText(st);
C.parseExport(text);                                    // must load back without errors
fs.writeFileSync(process.argv[3], text);
console.log('wrote', process.argv[3], '-', text.split('\n').length, 'lines');
