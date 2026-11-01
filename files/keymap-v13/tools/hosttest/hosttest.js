// hosttest.js: runs the same key script through engine.js and through keymap.c (compiled for the PC) and compares the MIDI.
// Usage: node hosttest.js c100-layout-v13.txt       (needs gcc; run it from the tools folder's hosttest subfolder)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const tools = path.join(__dirname, '..');
const layoutPath = process.argv[2] || path.join(tools, '..', 'c100-layout-v13.txt');   // the layout file sits next to the tools folder
const C = require(path.join(tools, 'load'))(true);
const layout = fs.readFileSync(layoutPath, 'utf8');
const out = path.join(__dirname, 'build'); fs.mkdirSync(out, {recursive: true});
cp.execFileSync('node', [path.join(tools, 'gen_keymap.js'), layoutPath, path.join(tools, 'keymap_template.c'), path.join(out, 'keymap.c')], {stdio: 'inherit'});
const kc = new Set(fs.readFileSync(path.join(out, 'keymap.c'), 'utf8').match(/\bKC_[A-Z0-9_]+/g));
fs.writeFileSync(path.join(out, 'kc_stub.h'), [...kc].map((k, i) => '#define ' + k + ' ' + (i + 4)).join('\n') + '\n');
fs.writeFileSync(path.join(out, 'qmk_midi.h'), '');
const exe = path.join(out, process.platform === 'win32' ? 'host.exe' : 'host');
cp.execFileSync('gcc', ['-O1', '-w', '-Werror=implicit-function-declaration', '-DQMK_KEYBOARD_H="qmk_stub.h"', '-I', out, '-I', __dirname, '-o', exe, path.join(__dirname, 'host_main.c')], {stdio: 'inherit'});

// ---- scripts ----
const L3 = [[0, 'press', 2], [40, 'press', 9], [80, 'release', 9], [120, 'press', 9], [160, 'release', 9], [200, 'release', 2]];   // CS + L+ twice = layer 3 page 1
function seq(list) { let t = 0; return list.map(([dt, c, a]) => { t += dt; return [t, c, a]; }); }
const tap = (i, dt = 40, hold = 40) => [[dt, 'press', i], [hold, 'release', i]];
const scripts = {};
scripts.stepRecord = seq([...L3.map(([t, c, a], k) => [k ? 40 : 0, c, a]),
  ...tap(4), ...tap(70), ...tap(72), [40, 'press', 90], [10, 'press', 74], [30, 'release', 90], [10, 'release', 74], ...tap(68), ...tap(69), ...tap(76), ...tap(4),
  ...tap(3), [3000, 'press', 59], [10, 'release', 59], ...tap(99, 300), ...tap(3, 1000), ...tap(9), ...tap(19), ...tap(8), ...tap(8),
  ...tap(4), ...tap(3), [130, 'press', 71], [60, 'release', 71], [200, 'press', 93], [50, 'release', 93], [500, 'press', 75], [50, 'release', 75], ...tap(3, 900), ...tap(4)]);
scripts.drums = seq([...L3.map(([t, c, a], k) => [k ? 40 : 0, c, a]),
  [40, 'press', 59], [40, 'press', 9], [40, 'release', 9], [40, 'press', 9], [40, 'release', 9], [40, 'release', 59],   // SK + up x2 = keyboard page 3
  ...tap(91), ...tap(64), ...tap(66), ...tap(84), ...tap(96), ...tap(60), ...tap(65), ...tap(87), ...tap(4), ...tap(90), ...tap(4),
  [40, 'press', 2], ...tap(78), [40, 'release', 2], ...tap(3), [2500, 'press', 49], [10, 'release', 49], ...tap(3, 600),
  [40, 'press', 58], [40, 'press', 9], [40, 'release', 9], [40, 'release', 58], ...tap(78), ...tap(78), ...tap(97), ...tap(3), ...tap(3, 4500)]);
scripts.velocity = seq([...L3.map(([t, c, a], k) => [k ? 40 : 0, c, a]),
  ...tap(4), ...tap(70), ...tap(71), ...tap(72), ...tap(73), ...tap(4), ...tap(67, 40, 20), ...tap(67, 20, 20),
  ...tap(20), ...tap(51), ...tap(32), ...tap(43), ...tap(67, 40, 20), ...tap(67, 20, 20), ...tap(3), ...tap(3, 2100),
  [40, 'press', 79], [40, 'press', 18], [500, 'release', 18], [40, 'release', 79], ...tap(3), ...tap(3, 2100),
  ...tap(1, 40, 40), [40, 'press', 2], [40, 'press', 1], [40, 'release', 1], [40, 'release', 2], ...tap(3), ...tap(3, 600)]);
scripts.liveRecordClock = seq([...L3.map(([t, c, a], k) => [k ? 40 : 0, c, a]),
  ...tap(4), [40, 'clock', 0xFA], ...Array.from({length: 96}, (_, k) => [21, 'clock', 0xF8]).flatMap((e, k) => k % 7 === 3 ? [e, [0, 'press', 70 + (k % 8)], [5, 'release', 70 + (k % 8)]] : [e]),
  [40, 'clock', 0xFC], ...tap(4)]);
scripts.navigation = seq([[0, 'press', 2], ...[9, 8, 8, 8, 8, 8, 18, 9, 9, 19, 8].flatMap(i => [[40, 'press', i], [40, 'release', i]]), [40, 'release', 2],
  ...tap(8), ...tap(9), ...tap(28), ...tap(29), ...tap(38), ...tap(39), ...tap(95), ...tap(80)]);
// random keys on the step recorder page (no ARP, tempo or tap keys: those use random or float timing)
function fuzz(seed, n, start = L3) {
  let s = seed; const r = k => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s % k; };
  const keys = [3, 4, 1, 2, 8, 9, 18, 19, 5, 7, 17, ...Array.from({length: 80}, (_, i) => 20 + i).filter(i => i !== 98 && i !== 99)];
  const ev = start.map(([t, c, a], k) => [k ? 40 : 0, c, a]); const down = new Set();
  for (let k = 0; k < n; k++) {
    const i = keys[r(keys.length)];
    if (down.has(i)) { ev.push([r(150), 'release', i]); down.delete(i); }
    else { ev.push([r(150), 'press', i]); down.add(i); if (r(3)) { ev.push([r(300), 'release', i]); down.delete(i); } }
  }
  [...down].forEach(i => ev.push([20, 'release', i]));
  ev.push([3000, 'press', 3], [40, 'release', 3]);
  return seq(ev);
}
for (let k = 1; k <= 6; k++) scripts['fuzz' + k] = fuzz(k * 7919, 400);
// other pages: layer 1 page 1 (composer), layer 1 page 2, layer 3 page 2 (drum sequencer), layer 2 page 1 (launcher)
const PG = [[0, 'press', 2], [40, 'press', 8], [40, 'release', 8], [40, 'release', 2]];
scripts.fuzzL1P1 = fuzz(101, 400, [[0, 'press', 11], [40, 'release', 11]]);
scripts.fuzzL1P2 = fuzz(202, 400, PG);
scripts.fuzzL3P2 = fuzz(303, 400, [...L3, ...PG.map(([t, c, a]) => [t + 240, c, a])]);
scripts.fuzzL2P1 = fuzz(404, 400, [[0, 'press', 2], [40, 'press', 9], [40, 'release', 9], [40, 'release', 2]]);


// ---- v10 ----
const go = (cs, list) => seq(list);
const PGn = n => [[40, 'press', 2], ...Array.from({length: n}, () => [[40, 'press', 8], [40, 'release', 8]]).flat(), [40, 'release', 2]];
const L3n = (n) => [...L3.map(([t, c, a], k) => [k ? 40 : 0, c, a]), ...PGn(n)];
const csTap = i => [[40, 'press', 2], [40, 'press', i], [40, 'release', i], [40, 'release', 2]];
const hold = (i, inner) => [[40, 'press', i], ...inner, [40, 'release', i]];
const taps = (i, n) => Array.from({length: n}, () => tap(i)).flat();
// v13: Euclidean = arrows (R1C9 = key 8 right, R1C10 = 9 up, R2C9 = 18 left, R2C10 = 19 down): up / down pick the lane, left / right change a setting.
// LEN = R1C1 (key 0), HITS = R2C1 (key 10), VAR = R1C2 (key 1) work while held; nothing held = the start point. EV: R3C9 = 28 (steps 1-8), R3C10 = 29 (steps 9-16)
scripts.euclid = seq([...L3n(2),
  ...taps(9, 2), ...taps(8, 3), ...taps(18, 1),                       // lane 3, start point +3 then -1
  ...hold(10, [...taps(8, 4), ...taps(9, 1), ...taps(8, 5)]),          // HITS held: lane 3 +4, lane 4 +5
  ...hold(0, [...taps(18, 6), ...taps(19, 2), ...taps(18, 3)]),        // LEN held: lane 4 -6, lane 3 / 2 -3
  ...hold(1, [...taps(8, 4), ...taps(9, 3), ...taps(8, 2)]),           // VAR held
  ...tap(29), ...tap(28), ...tap(3), [3000, 'press', 29], [40, 'release', 29], [40, 'press', 93], [40, 'release', 93], [2500, 'press', 3], [40, 'release', 3]]);
scripts.euclidRelease = seq([...L3n(2), ...hold(10, taps(8, 5)), ...taps(8, 2), ...hold(0, taps(18, 3)), ...taps(18, 2), ...tap(3), ...tap(3, 3000)]);
scripts.fuzzEuclidHold = (() => {
  let s = 9191; const r = k => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s % k; };
  const keys = [0, 10, 1, 8, 9, 18, 19, 8, 9, 18, 19, 28, 29, 3, 90, 93, 80, 74];
  const ev = L3n(2).map(([t, c, a], k) => [k ? 40 : 0, c, a]); const down = new Set();
  for (let k = 0; k < 500; k++) {
    const i = keys[r(keys.length)];
    if (down.has(i)) { ev.push([r(150), 'release', i]); down.delete(i); } else { ev.push([r(150), 'press', i]); down.add(i); if (r(2)) { ev.push([r(300), 'release', i]); down.delete(i); } }
  }
  [...down].forEach(i => ev.push([20, 'release', i])); ev.push([3000, 'press', 3], [40, 'release', 3]);
  return seq(ev);
})();scripts.srSettings = seq([...L3n(0), ...tap(4), ...tap(70), ...tap(72), ...tap(74), ...tap(75), ...tap(77), ...tap(4),
  [40, 'press', 2], [40, 'press', 48], [40, 'release', 2], ...tap(9), ...tap(8), [40, 'release', 48],
  ...hold(2, hold(58, [...tap(9), ...tap(9)])), ...hold(2, hold(79, tap(9))),
  ...tap(67, 40, 20), ...tap(67, 20, 20), ...tap(67, 40, 20), ...tap(40), ...tap(51), ...tap(67, 400, 20), ...tap(21), ...tap(33), ...tap(67, 40, 20), ...tap(67, 20, 20),
  ...tap(3), ...tap(3, 3000), ...tap(19), ...tap(4), ...tap(80), ...tap(82), ...tap(4), ...hold(2, hold(79, [...tap(9), ...tap(9), ...tap(9)])), ...hold(2, hold(79, tap(19))),
  ...tap(3), ...tap(3, 3000)]);
scripts.effects = seq([...PGn(1), ...tap(88), ...hold(88, [...tap(20), ...tap(20, 20), ...tap(31), ...tap(31, 20), ...tap(30), ...tap(30, 20)]),
  ...tap(70, 100, 200), ...tap(61, 600, 100), [1500, 'press', 89], [40, 'release', 89],
  [40, 'press', 71], ...tap(88), [100, 'release', 71], ...tap(71, 100, 200), ...tap(62, 800, 100), [1500, 'press', 88], [40, 'press', 89], [40, 'release', 89], [40, 'release', 88]]);
const fxOne = cells => seq([...PGn(1), ...tap(88), ...hold(88, cells.flatMap(c => [...tap(c), ...tap(c, 20)])), ...tap(70, 100, 200), ...tap(61, 600, 100), [2500, 'press', 89], [40, 'release', 89]]);
scripts.fxDelay = fxOne([20]); scripts.fxChorus = fxOne([30]); scripts.fxRatchet = fxOne([31]); scripts.fxRoll = fxOne([21]); scripts.fxDelayRatchet = fxOne([20, 31]);
scripts.trackFx = seq([...L3n(0), ...tap(4), ...tap(70), ...tap(72), ...tap(4), [40, 'press', 20], ...tap(88), [40, 'release', 20],
  ...hold(88, [...tap(20), ...tap(20, 20), ...tap(25), ...tap(25, 20)]), ...tap(3), ...tap(3, 3000), ...tap(89), ...tap(3), ...tap(3, 1000)]);
scripts.harmony = seq([...PGn(4), [40, 'press', 90], [40, 'press', 7], ...tap(9), [40, 'release', 7], [40, 'release', 90], ...tap(90, 100, 200), ...tap(94, 100, 200),
  [40, 'press', 94], [40, 'press', 7], ...tap(19), ...tap(19), [40, 'release', 7], [40, 'release', 94], ...tap(94, 100, 200), ...tap(95, 100, 200), ...tap(7), ...tap(9), ...tap(90, 100, 200)]);
scripts.otherPageSilent = seq([...L3n(0), ...tap(4), ...tap(70), ...tap(4), ...PGn(1), ...tap(30), ...tap(41), ...PGn(1), ...tap(10), ...taps(99, 3), ...tap(3), [1500, 'press', 2], [40, 'press', 18], [40, 'release', 18], [40, 'release', 2],
  [1500, 'press', 2], [40, 'press', 18], [40, 'release', 18], [40, 'release', 2], [1500, 'press', 2], [40, 'press', 9], [40, 'release', 9], [40, 'release', 2], ...tap(3, 1500)]);
scripts.fuzzEuclid = fuzz(505, 500, L3n(2));
scripts.fuzzHarmony = fuzz(606, 400, PGn(4));
scripts.fuzzMulti = fuzz(707, 400, PGn(5));
scripts.fuzzMicro = fuzz(808, 400, PGn(6));

// ---- v11: generative pages on layer 4 (pages 2-5). GS keys: row r (0-7 from R3) = down (2+r)*10+8, up +1 ----
const L4n = n => [[0, 'press', 2], [40, 'press', 19], [40, 'release', 19], [40, 'release', 2], ...PGn(n)];
const gsk = (r, up) => (2 + r) * 10 + 8 + (up ? 1 : 0);
scripts.randomWalk = seq([...L4n(0), ...tap(3), ...csTap(gsk(2, 1)), ...csTap(gsk(2, 1)), ...csTap(gsk(2, 1)), ...tap(35, 2500), ...csTap(gsk(0, 0)), [100, 'press', 3], [40, 'release', 3],
  ...csTap(gsk(1, 1)), ...csTap(gsk(1, 1)), [3000, 'press', 2], [40, 'press', gsk(3, 1)], [40, 'release', gsk(3, 1)], [40, 'release', 2], ...csTap(gsk(4, 1)), ...csTap(gsk(4, 1)), ...csTap(gsk(5, 1)), ...csTap(gsk(6, 1)), ...csTap(gsk(6, 1)),
  [3000, 'press', 2], [40, 'press', gsk(3, 0)], [40, 'release', gsk(3, 0)], [40, 'release', 2], ...csTap(gsk(2, 0)), ...csTap(gsk(2, 0)), [2500, 'press', 2], [40, 'press', gsk(7, 0)], [40, 'release', gsk(7, 0)], [40, 'release', 2],
  [1500, 'press', 2], [40, 'press', gsk(7, 1)], [40, 'release', gsk(7, 1)], [40, 'release', 2], ...tap(3, 3000)]);
scripts.otherPageGen = seq([...L4n(0), ...tap(3), ...tap(35, 2000), ...PGn(1), ...tap(20, 2000), ...PGn(1), ...tap(60, 1500), ...PGn(1), ...tap(3, 2500), ...PGn(1), ...tap(3, 1500)]);
// v12: 4 walkers. WK keys: 0-3 select (R3-R6 C9 = 28, 38, 48, 58), 4-7 on/off (C10), 8 / 9 = channel down / up (R7 = 68 / 69)
const wk = n => n < 8 ? (2 + (n & 3)) * 10 + (n < 4 ? 8 : 9) : 68 + (n - 8);
scripts.walkers = seq([...L4n(0), ...tap(3), ...tap(wk(5)), ...tap(wk(6)), ...tap(wk(7)), ...tap(wk(9)), ...tap(wk(9)), ...tap(wk(9), 40, 40), ...tap(35, 2500),
  ...tap(wk(2)), ...taps(wk(9), 6), ...tap(53, 40), ...tap(wk(3)), ...taps(wk(8), 2), ...tap(80, 3000), ...tap(wk(1)), ...taps(wk(9), 3), ...tap(14, 40), ...taps(wk(8), 20), ...tap(wk(4), 2500),
  ...tap(wk(0)), ...taps(wk(9), 18), ...tap(wk(5), 2500), ...tap(wk(1)), ...tap(wk(9), 40, 1500), ...tap(wk(8), 40, 1500), ...csTap(gsk(0, 0)), ...csTap(gsk(3, 1)), ...tap(3, 3000), ...tap(3, 500), ...tap(3, 2000)]);
scripts.fuzzWK = fuzz(6666, 500, [...L4n(0), [40, 'press', 3], [40, 'release', 3], ...tap(wk(5)), ...tap(wk(6)), ...tap(wk(7))]);
// ---- v12: arp patterns, rolled chords, MIDI echo, CC sequencer, chord progression, Pond, Constellation ----
const triad = (ms) => [[40, 'press', 90], [10, 'press', 94], [10, 'press', 97], [ms, 'release', 90], [10, 'release', 94], [10, 'release', 97]];
scripts.arpPatterns = seq([...PGn(1), ...tap(98), ...tap(98), ...hold(98, taps(9, 7)), ...triad(1300), ...hold(98, tap(9)), ...triad(1300), ...hold(98, tap(9)), ...triad(1300),
  ...hold(98, tap(9)), ...triad(1300), ...hold(98, tap(9)), ...triad(1300), ...hold(98, tap(9)), ...triad(4600), ...hold(98, tap(9)), ...triad(3600), ...hold(98, taps(9, 2)),
  ...hold(98, tap(8)), ...hold(98, taps(9, 4)), ...triad(1200)]);
scripts.arpCadence = seq([...PGn(1), ...tap(98), ...tap(98), ...hold(98, taps(9, 12)), ...hold(98, tap(18)), ...hold(98, tap(18)), ...hold(98, tap(8)), ...triad(2600), ...hold(98, tap(18)), ...triad(2600)]);
scripts.arpPatOct = seq([...PGn(1), ...tap(98), ...tap(98), [40, 'press', 98], [40, 'press', 41], [40, 'release', 41], [40, 'release', 98], ...hold(98, taps(9, 7)), ...triad(1500),
  ...hold(98, tap(9)), ...triad(1500), ...hold(98, tap(9)), ...triad(1500), ...hold(98, tap(9)), ...triad(1500), ...hold(98, tap(9)), ...triad(1500), ...hold(98, tap(9)), ...triad(1500)]);
scripts.roll = seq([...PGn(3), ...csTap(98), ...tap(90, 400, 100), ...tap(91, 40, 300), ...tap(93, 800, 300), ...hold(2, hold(98, [...tap(9), ...tap(9), ...tap(8), ...tap(18)])), ...tap(90, 300, 100), ...tap(92, 300, 100),
  ...hold(2, hold(98, [...tap(8), ...tap(8)])), ...tap(90, 300, 100), ...tap(90, 300, 100), ...tap(90, 20, 300), ...hold(2, hold(98, [...tap(9), ...tap(9), ...tap(9), ...tap(9)])), ...tap(95, 300, 100), ...tap(94, 8, 300),
  ...csTap(98), ...tap(90, 200, 100)]);
scripts.rollHarmony = seq([...PGn(4), ...csTap(98), ...hold(2, hold(98, [...tap(9), ...tap(18)])), [40, 'press', 90], [40, 'press', 7], [200, 'release', 7], [300, 'release', 90], ...tap(94, 500, 200), ...tap(97, 4, 300)]);
scripts.progression = seq([...PGn(4), ...tap(28), ...tap(90), ...tap(38), ...tap(94), ...tap(48), ...tap(81), ...tap(58), ...tap(96), ...tap(3, 40, 2600), ...tap(4), ...tap(38), ...tap(98), ...tap(58), ...tap(90),
  ...tap(28, 40, 3000), ...tap(3, 40, 300), ...tap(48), ...tap(97), ...tap(3, 40, 2500), ...tap(3)]);
scripts.pond = seq([...L4n(1), ...tap(53, 40, 500), ...tap(46, 40, 1500), ...tap(20, 40, 2500), ...tap(68), ...tap(52, 40, 2500), ...taps(29, 3), ...taps(49, 2), ...tap(68), ...tap(75, 40, 3000), ...taps(59, 2), ...taps(39, 3),
  ...tap(21, 40, 200), ...tap(34, 40, 3500), ...tap(69), ...tap(33, 40, 1500), ...taps(78, 2), ...taps(88, 3), ...tap(77, 40, 2500)]);
scripts.constellation = seq([...L4n(2), ...tap(20), ...tap(35), ...tap(57), ...tap(73), ...tap(3, 40, 2500), ...taps(8, 3), ...tap(9), ...tap(19), ...tap(58), ...tap(41, 40, 1500), ...tap(20, 40, 800), ...tap(99), ...tap(75), ...tap(80),
  ...tap(65), ...tap(42), ...tap(69, 40, 2500), ...taps(18, 7), ...tap(78, 40, 2000), ...tap(3, 40, 300)]);
scripts.fuzzCQ = fuzz(7072, 400, L3n(3));
scripts.fuzzPond = fuzz(7073, 400, L4n(1));
scripts.fuzzCN = fuzz(7074, 400, L4n(2));
scripts.fuzzHarm2 = fuzz(7075, 400, [...PGn(4), ...csTap(98)]);
scripts.fuzzRW = fuzz(1111, 400, [...L4n(0), [40, 'press', 3], [40, 'release', 3]]);

// ---- v13: clock source (R6C10 = key 59): Auto follows an outside clock, Internal only ignores it ----
const clockTicks = n => Array.from({length: n}, () => [21, 'clock', 0xF8]);
scripts.clockSource = seq([...L3n(1), ...tap(90), ...tap(94), ...tap(80), ...tap(84),
  [40, 'clock', 0xFA], ...clockTicks(70), [40, 'clock', 0xFC], ...tap(3, 300), ...tap(3, 1500), ...tap(3, 200),
  ...tap(59), [40, 'clock', 0xFA], ...clockTicks(70), [40, 'clock', 0xFC], ...tap(3, 300), ...tap(3, 1500), ...tap(3, 200),
  ...tap(59), [40, 'clock', 0xFA], ...clockTicks(70), [40, 'clock', 0xFC], ...tap(59), ...tap(59), ...tap(3, 300), ...tap(3, 600)]);
scripts.clockEuclid = seq([...L3n(2), ...hold(10, taps(99, 4)), [40, 'clock', 0xFA], ...clockTicks(60), ...tap(59), ...clockTicks(40), ...tap(59), ...clockTicks(60), [40, 'clock', 0xFC]]);


// ---- v13 section 2: layer 2 ----
const L2n = n => [[0, 'press', 2], [40, 'press', 9], [40, 'release', 9], [40, 'release', 2], ...PGn(n)];
// XY effects (page 2): each effect has its own channel (9-16); XF keys = R2C1-R2C8 = 10-17, XH = R5C9 = 48
scripts.xyEffects = seq([...L2n(1), ...tap(10), [40, 'press', 23], [100, 'release', 23], ...tap(12), [40, 'press', 45], [40, 'press', 46], [300, 'release', 45], [40, 'release', 46], ...tap(17),
  [40, 'press', 20], [600, 'release', 20], ...tap(48), ...tap(14), [40, 'press', 55], [300, 'release', 55], ...tap(11), ...tap(3, 500)]);
// track buttons on page 4 (and page 1) use channel 16, notes 64-95; R3C9 = arm, R4C10 = select
scripts.trackButtons = seq([...L2n(0), ...tap(10), ...tap(13), ...tap(28), ...tap(10), ...tap(17), ...tap(49), ...tap(10), ...tap(38), ...tap(15), ...tap(39), ...tap(16), ...tap(3, 300),
  ...PGn(3), ...tap(10), ...tap(13), ...tap(17), ...tap(28), ...tap(10), ...tap(12), ...tap(3, 300)]);
// Controls Shift on page 4: the 8x8 = 32 knobs. R3C1 = index 20 (K36-), R10C8 = 97, R7C1 = 60 (K20-)
scripts.knobShift = seq([...L2n(3), ...hold(2, [...tap(20), ...tap(21), ...tap(21), ...tap(22), ...tap(23), ...tap(52), ...tap(53), ...tap(60), ...tap(61), ...tap(97), ...tap(96), [40, 'press', 31], [700, 'release', 31]]),
  ...tap(60), ...tap(21), ...tap(3, 300)]);
scripts.fuzzL2P4 = fuzz(8081, 400, L2n(3));
scripts.fuzzL2P4b = fuzz(8083, 600, [...L2n(3), [0, 'press', 2], [40, 'press', 20], [40, 'release', 2], [40, 'release', 20]]);
scripts.fuzzL2P2 = fuzz(8082, 400, L2n(1));

// ---- v13 step one: Shift is only for navigation ----
// Delete (R1C2 = 1) and Copy (R2C2 = 11): double-tap = clear all / paste. Composer page: kick pad R6C1 = 50, steps R3C5 = 24, R4C5 = 34, R3C7 = 26
const dtapK = i => [[40, 'press', i], [20, 'release', i], [60, 'press', i], [20, 'release', i]];
scripts.copyDelete = seq([...tap(50), ...tap(24), ...tap(34), ...dtapK(11), ...tap(26), ...tap(3), ...tap(3, 2500), ...dtapK(1), ...tap(3), ...tap(3, 1500), ...tap(1), ...tap(11), ...tap(24), ...tap(3, 300)]);
scripts.copyDeleteSR = seq([...L3n(0), ...tap(4), ...tap(70), ...tap(72), ...tap(74), ...tap(4), ...tap(1), ...dtapK(1), ...tap(3), ...tap(3, 2000)]);
// Generative hold keys. Pond: R3C9 = 28 speed, R3C10 = 29 decay, R4C9 = 38 threshold, R4C10 = 39 wavelength, R5C9 = 48 octave, R5C10 = 49 filter CC, R6C9 = 58 reach, R6C10 = 59 note length, R7C9 = 68 max ripples, R7C10 = 69 mode, R8C9 = 78 clear
scripts.pondHold = seq([...L4n(1), ...tap(53, 40, 400), ...hold(28, [...taps(9, 2), ...taps(19, 1)]), ...tap(46, 40, 800), ...hold(29, taps(18, 2)), ...hold(38, taps(8, 3)), ...hold(39, taps(9, 2)),
  ...hold(48, taps(9, 1)), ...hold(49, taps(9, 4)), ...hold(58, [...taps(18, 2)]), ...tap(75, 40, 1800), ...hold(59, taps(8, 3)), ...tap(20, 40, 1500), ...hold(68, taps(18, 6)), ...tap(33, 40, 1200),
  ...tap(69), ...tap(52, 40, 1500), ...tap(78), ...tap(88, 40, 1000)]);
const fuzzK = (seed, n, start, keys) => {                // random presses of the given keys only (no Effects key: its echoes drift by 3 ms between engine and firmware)
  let s = seed; const r = k => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s % k; };
  const ev = start.map(([t, c, a], k) => [k ? 40 : 0, c, a]); const down = new Set();
  for (let k = 0; k < n; k++) {
    const i = keys[r(keys.length)];
    if (down.has(i)) { ev.push([r(150), 'release', i]); down.delete(i); } else { ev.push([r(150), 'press', i]); down.add(i); if (r(2)) { ev.push([r(300), 'release', i]); down.delete(i); } }
  }
  [...down].forEach(i => ev.push([20, 'release', i])); ev.push([3000, 'press', 3], [40, 'release', 3]);
  return seq(ev);
};
const padKeys = Array.from({length: 80}, (_, i) => 20 + i).filter(i => i % 10 <= 7);
scripts.fuzzPondHold = fuzzK(7076, 500, L4n(1), [28, 29, 38, 39, 48, 49, 58, 59, 68, 69, 78, 8, 9, 18, 19, ...padKeys]);
scripts.fuzzRWHold = fuzzK(7077, 500, [...L4n(0), [40, 'press', 3], [40, 'release', 3]], [68, 69, 78, 79, 88, 89, 98, 99, 28, 29, 38, 39, 48, 49, 58, 59, 8, 9, 18, 19, ...padKeys]);
// Random walk: R7C9 = 68 channel, R7C10 = 69 run, R8C9 = 78 rate, R8C10 = 79 step, R9C9 = 88 pull, R9C10 = 89 Y mode / CC, R10C9 = 98 octave, R10C10 = 99 gate
scripts.rwHold = seq([...L4n(0), ...tap(3), ...tap(35, 1500), ...hold(78, taps(9, 2)), ...hold(79, taps(8, 1)), ...hold(88, taps(8, 4)), ...hold(89, [...tap(9), ...taps(8, 3)]), ...tap(14, 1500),
  ...hold(98, taps(9, 1)), ...hold(99, taps(18, 2)), ...tap(38), ...hold(68, taps(8, 3)), ...tap(53, 40, 1200), ...tap(69), ...tap(69, 1500), ...tap(3, 500)]);
// Layer 2: page 1 side commands (R8C9 = 78 undo, 79 redo, 88 Ableton record, 89 quantize, 98 launch selected, 99 clip on / off); page 4 knobs (pads = knobs), page 5 shortcuts
scripts.launcherCmds = seq([...L2n(0), ...tap(78), ...tap(79), ...tap(88), ...tap(89), ...tap(98), ...tap(99), ...tap(3, 300)]);
scripts.knobsPage = seq([...L2n(3), ...tap(20), ...tap(21), ...tap(21), ...tap(60), ...tap(97), ...tap(96), [40, 'press', 31], [600, 'release', 31], ...tap(3, 300)]);
scripts.fuzzL2P5 = fuzz(8084, 300, L2n(4));
// global side keys (layer 1 page 3): R4C9 = 38 Ableton record, R4C10 = 39 redo, R6C9 = 58 quantize, R8C9 = 78 rolled chords (hold + arrows for the settings)
scripts.globalKeys = seq([...PGn(2), ...tap(38), ...tap(39), ...tap(58), ...tap(78), ...tap(90, 40, 600), ...hold(78, [...taps(9, 2), ...tap(8)]), ...tap(78), ...tap(92, 40, 400), ...tap(3, 300)]);

// v13 CC sequencer. Lane pads: row 3 = keys 20-27 ... row 6 = 50-57. Mute R3C9-R6C9 = 28 / 38 / 48 / 58, learn R3C10-R6C10 = 29 / 39 / 49 / 59, record R7C9 = 68.
// R7C1-R7C4 = 60-63 value -8 / +8 / -1 / +1, R7C5-C8 = 64-67 tempo, length; R8C1-C8 = 70-77 CC, channel, play (74), reset, fill (76), clear. Effect layers 1-8 = R9C1-R9C8 = 80-87
const ccin = (ch, num, val) => [60, 'ccin', (ch << 16) | (num << 8) | val];
scripts.ccseq = seq([...L3n(3), ...tap(23), ...tap(27), ...tap(20), ...tap(68),                                  // live faders, then record on
  ...tap(22), ...tap(27), ...tap(25), ...tap(21), ...tap(30), ...tap(36), ...tap(33), ...dtapK(33), ...tap(44), ...tap(47), ...dtapK(44),   // enter values, double-tap = on / off
  ...tap(60), ...tap(63), ...tap(62), ...tap(66), ...tap(66), ...tap(71), ...tap(71), ...tap(73), ...tap(72), ...tap(76), ...tap(77),
  ...tap(81), ...tap(81), ...tap(22), ...tap(26), ...tap(32), ...tap(35), ...tap(85), ...tap(85), ...tap(52), ...tap(57), ...tap(87), ...tap(87), ...tap(54), ...tap(51),   // layers 2, 6, 8 on, with their own values
  ...tap(68), ...tap(64), ...tap(65), ...tap(74), ...tap(74, 2500), ...tap(28), ...tap(74, 1500), ...tap(28), ...tap(80), ...tap(80), ...tap(74, 1200), ...tap(75), ...tap(74, 800), ...tap(74)]);
scripts.ccLearn = seq([...L3n(3), ...tap(29), ccin(0, 77, 100), ...tap(39), ...tap(39), ccin(2, 50, 10), ...tap(59), ccin(1, 33, 64), ccin(1, 34, 64), ...tap(68), ...tap(20), ...tap(25), ...tap(30), ...tap(36),
  ...tap(74), ...tap(74, 2200), ...tap(74), ...tap(81), ...tap(81), ...tap(49), ccin(0, 99, 1), ...tap(68), ...tap(53), ...tap(55), ...tap(74), ...tap(74, 1800), ...tap(74)]);
scripts.fuzzCQ2 = fuzzK(7078, 600, [...L3n(3), [40, 'press', 68], [40, 'release', 68]], [28, 29, 38, 39, 48, 49, 58, 59, 68, 74, 75, 76, 77, ...Array.from({length: 24}, (_, i) => 60 + i), ...padKeys.filter(i => i < 58 || i >= 80), 8, 9, 18, 19]);
// ---- run both and compare ----
function runJs(sc) {
  let T = 0; const log = [];
  const E = C.createEngine({now: () => T, random: () => 0.5, state: C.parseExport(layout), send: m => {
    if (m.type === 'on') log.push([T, 'on', m.ch + 1, m.a, m.b]); else if (m.type === 'off') log.push([T, 'off', m.ch + 1, m.a, 0]);
    else if (m.type === 'cc') log.push([T, 'cc', m.ch + 1, m.a, m.b]); else if (m.type === 'pc') log.push([T, 'pc', m.ch + 1, m.a]);
    else if (m.type === 'pb') log.push([T, 'pb', m.ch + 1, m.a]); }});
  for (const [at, c, a] of sc) {
    while (T < at) { T++; E.tick(); }
    if (c === 'press') E.press(a); else if (c === 'release') E.release(a); else if (c === 'clock') E.midiIn(a); else if (c === 'ccin') E.midiCC((a >> 16) & 15, (a >> 8) & 127, a & 127);
  }
  for (let k = 0; k < 2000; k++) { T++; E.tick(); }
  return log.map(x => x.join(' '));
}
function runC(sc) {
  const end = sc[sc.length - 1][0] + 2000;
  const txt = sc.map(([t, c, a]) => t + ' ' + c + ' ' + a).join('\n') + '\n' + end + ' end 0\n';
  return cp.execFileSync(exe, {input: txt}).toString().trim().split(/\r?\n/).filter(Boolean);
}
// same messages, times may differ by 2 ms (whole-ms timers). Effect velocities and MPE bends may differ by a few steps:
// keymap.c rounds down where engine.js rounds (as in v8), which you cannot hear.
function near(x, y) {
  if (x[1] !== y[1] || x[2] !== y[2]) return false;
  if (x[1] === 'pb') return Math.abs(+x[3] - +y[3]) <= 3;
  if (x[3] !== y[3]) return false;
  return x[1] === 'on' ? Math.abs(+x[4] - +y[4]) <= 3 : x.slice(4).join(' ') === y.slice(4).join(' ');
}
function same(a, b) {
  const pa = a.map(s => s.split(' ')), pb = b.map(s => s.split(' ')), used = new Array(pb.length).fill(false);
  const bad = [];
  pa.forEach(x => {
    const k = pb.findIndex((y, j) => !used[j] && Math.abs(+y[0] - +x[0]) <= 2 && near(x, y));
    if (k < 0) bad.push('engine only: ' + x.join(' ')); else used[k] = true;
  });
  pb.forEach((y, j) => { if (!used[j]) bad.push('keymap.c only: ' + y.join(' ')); });
  return bad;
}


let fail = 0;
for (const [name, sc] of Object.entries(scripts)) {
  const a = runJs(sc), b = runC(sc), bad = same(a, b);
  console.log((bad.length ? 'FAIL ' : 'ok   ') + name.padEnd(16) + a.length + ' messages' + (bad.length ? '  (' + bad.length + ' differ)' : ''));
  if (process.env.SHOW === name) console.log(a.join('\n'));
  if (bad.length) { fail++; console.log('  ' + bad.slice(0, +process.env.MORE || 40).join('\n  ')); }
}
console.log(fail ? fail + ' test(s) failed' : 'All tests passed: engine.js and keymap.c send the same MIDI.');
process.exit(fail ? 1 : 0);
