// ===== guide text, diagrams and demos =====
// Edit this file to change the guide, then run:  node guide/build_guide.js   (from the tools folder).   Check demos with:  node guide/build_guide.js --check
// Keys are named like the layout file: R3C1 = row 3, column 1.  A demo is a list of steps {say, look, do, after}; see guide_player.js for the actions.
const k = n => '<span class="k">' + n + '</span>';

function controlsTable() {
  const rows = [];
  for (let i = 0; i < 100; i++) {
    if (isPad(i)) continue;
    const b = ST.controls.base[i], s = ST.controls.shift[i];
    if (!b.note && !s.note) continue;
    rows.push('<tr><td>' + keyName(i) + '</td><td>' + esc(b.note || '') + '</td><td>' + esc(s.note || '') + '</td></tr>');
  }
  return '<table class="t"><thead><tr><th>Key</th><th>What it does</th><th>With Shift held</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>';
}

// static labelled picture of a block of keys. rows: [{label, cells: ['text', 'text|sub|class', ...]}]; class = a (amber) c (blue) g (green) p (pink) d (dim)
function sgrid(title, rows, cols, note) {
  let h = '<div class="sgwrap"><div class="sgt">' + title + '</div><div class="sg" style="grid-template-columns:auto repeat(' + cols + ',minmax(0,1fr))">';
  rows.forEach(r => {
    h += '<span class="sgl">' + (r.label || '') + '</span>';
    for (let i = 0; i < cols; i++) {
      const [t, s, c] = String(r.cells[i] === undefined ? '' : r.cells[i]).split('|');
      h += '<b class="' + (c || '') + '">' + t + (s ? '<i>' + s + '</i>' : '') + '</b>';
    }
  });
  return h + '</div>' + (note ? '<div class="sgn">' + note + '</div>' : '') + '</div>';
}
function arpDiagram() {
  const rates = ARP_RATES.map(r => r[0]), modes = ARP_CODES.slice(0, 8);
  return sgrid('While you HOLD the ARP key (R10C9) the top four pad rows show the settings',
    [{label: 'R3 rate', cells: rates.map(x => x + '||a')},
     {label: 'R4 mode', cells: modes.map(x => x + '||c')},
     {label: 'R5 octaves | gate', cells: ['1 oct||g', '2 oct||g', '3 oct||g', '4 oct||g', '25%||p', '50%||p', '75%||p', '100%||p']},
     {label: 'R6 rhythm', cells: [1, 2, 3, 4, 5, 6, 7, 8].map(x => 'step ' + x + '|lit = plays|a')}], 8,
    'Tap a pad to choose. The chosen one is bright, the others dim. Rate = how fast. Mode = the order of the notes (OF switches the arp off). Octaves = how many octaves the pattern climbs. Gate = how long each note lasts. Rhythm = 8 steps: tap a step to make it a rest or a note.');
}
function fxDiagram() {
  const L1 = FX_DEFS.slice(0, 6), L2 = FX_DEFS.slice(6, 12), rows = [];
  for (let r = 0; r < 6; r++) {
    const lv = 6 - r;
    rows.push({label: 'R' + (r + 3), cells: [L1[r].code + '|' + L1[r].name.split(' ')[0] + '|a', L2[r].code + '|' + L2[r].name.split(' ')[0] + '|a'].concat([0, 1, 2, 3, 4, 5].map(p => 'level ' + lv + '||' + (p < 4 ? 'g' : 'd')))});
  }
  return sgrid('While you HOLD the FX key (R9C9) rows 3-8 show the effects',
    rows, 8, 'Columns 1-2 (amber): the 12 effects. <b>Tap</b> one to edit it, <b>double-tap</b> to switch it on / off. Columns 3-8 (green): up to 6 faders of the effect you are editing; the row you tap is the level (top row = highest). The picture shows the Delay, which has 4 faders (time, repeats, decay, pitch); unused faders are dim.');
}
function fxTable() {
  return '<table class="t"><thead><tr><th>Code</th><th>Effect</th><th>Faders (columns 3-8, left to right)</th></tr></thead><tbody>' +
    FX_DEFS.map(f => '<tr><td>' + f.code + '</td><td>' + f.name + '</td><td>' + f.params.join(', ') + '</td></tr>').join('') + '</tbody></table>';
}
function patternTable() {
  const d = [['UP', 'Up', 'lowest to highest, then again'], ['DN', 'Down', 'highest to lowest'], ['UD', 'Up-down', 'up, then back down'], ['DU', 'Down-up', 'down, then back up'], ['RN', 'Random', 'a random held note each step'], ['AS', 'As played', 'in the order you pressed the keys'], ['CH', 'Chord', 'all notes together on every step'], ['OF', 'Off', 'switches the arpeggiator off'],
    ['AL', 'Alberti', 'low - high - middle - high: the classic classical piano accompaniment'], ['BA', 'Bach', 'the low note, then a rising three-note figure played twice, repeated'], ['RO', 'Rolling', 'Chopin style: the whole chord runs up across at least 2 octaves and back down'], ['BE', 'Bebop', 'chord notes on the beat, a half-step approach note on the off-beat'], ['US', 'Upper structure', 'the 3rd, 5th, 7th and 9th above your lowest held note, in the scale'], ['CS', 'Cadence stop', 'plays your last pattern for 1-8 bars (hold ARP + left / right), then one block chord, then starts again'], ['IN', 'Intensity', 'the keys have no velocity, so: thin and soft at first, denser and louder the longer you hold the chord']];
  return '<table class="t"><thead><tr><th>Code</th><th>Pattern</th><th>What you hear</th></tr></thead><tbody>' + d.map(r => '<tr><td>' + r.join('</td><td>') + '</td></tr>').join('') + '</tbody></table>';
}

const CONTENT = {
  // ------------------------------------------------------------------ Start here
  intro: [
    {
      id: 'start', hero: true, nav: 'Welcome', map: true,
      title: 'Your Keychron C100 as a MIDI instrument',
      html: '<p>The C100 is a big block of 100 keys. With this firmware every key can play notes, trigger clips, move knobs or run a sequencer, and it talks to Ableton Live (or any MIDI program) like a pro controller.</p>' +
            '<p>This guide walks through the whole board, <b>layer by layer, page by page</b>. Every page has a labelled picture of the keys, a short animation you can play, pause and step through, and a list of what to press. <b>The animations are not recordings</b>: they run the same program as the virtual keyboard, so the lights and the MIDI messages you see are what the real keyboard does.</p>' +
            '<p><b>The 30-second version:</b> there are 4 layers, each with several pages. Hold <b>Shift</b> and use the four arrow keys in the top-right corner to move between them. Everything else follows from that.</p>',
      after: '<p style="color:var(--muted)">Jump to any page from the map above, or use the contents on the left.</p>'
    },
    {
      id: 'board', nav: 'Meet the board', kicker: 'Basics', title: 'Meet the board',
      tagline: 'Three areas: a big pad grid, a row of control keys on top, and two columns of side keys.',
      where: [0, 0],
      zones: [
        {r: [3, 10], c: [1, 8], label: 'Pad grid 8x8: where you play', tone: 0},
        {r: [1, 2], c: [1, 8], label: 'Control keys', color: '#f2a93b'},
        {r: [3, 10], c: [9, 10], label: 'Side keys', color: '#5aa7ff'},
        {r: [1, 2], c: [9, 10], label: 'Arrows', color: '#ff6f91'}
      ],
      marks: [
        {key: 'R1C3', text: '<b>Shift</b> (Controls Shift). Hold it to give the arrow keys their navigation job.'},
        {key: 'R1C4', text: '<b>Play / stop</b> for all sequencers.'},
        {key: 'R1C1', text: 'Top-left: pitch bend up. <b>Hold it while you plug the USB cable in</b> to put the keyboard into flash mode.'},
        {key: 'R1C10', text: 'The four arrows (top right). Alone they are arrows; with Shift they change layer and page.'}
      ],
      what: 'The 8x8 block at the bottom left is the <b>pad grid</b>. It changes completely from page to page: drums, keyboards, clips, sequencers. The two rows on top are <b>control keys</b> that work everywhere: shift, play, scale, tempo and more. The columns on the right are <b>side keys</b> that each page uses for its own settings.',
      steps: [
        'Press any pad. It lights up and sends a MIDI note (or whatever that page does).',
        'Look at the colours: <b>lit pads</b> belong to the page, <b>orange keys</b> are control keys, <b>blue keys</b> send MIDI messages or computer shortcuts, hatched keys do nothing.',
        'The LED colours change with every page, so you always know where you are.'
      ],
      tips: ['In the pictures, white rings show a key being pressed. The box under the picture shows the MIDI messages that press sent.'],
      demo: {steps: [
        {say: 'Tap a pad in the top-left corner: these are <b>drum pads</b>. Each press lights the pad and sends a MIDI note.', look: ['R6C1', 'R6C2'], do: ['R6C1', 'R6C3', 'R5C3']},
        {say: 'The bottom half holds two <b>piano keyboards</b>. Press several keys together to play a chord.', look: ['R10C1', 'R10C3', 'R10C5'], do: [['chord', ['R10C1', 'R10C3', 'R10C5'], 900]]},
        {say: 'The orange keys on top are the <b>control keys</b>. They stay the same on every page. Press <b>Play</b> and the white playhead runs over the steps.', look: ['R1C4'], do: ['R1C4', ['wait', 1500], 'R1C4']}
      ], tail: 800}
    },
    {
      id: 'nav', nav: 'Layers and pages', kicker: 'Basics', title: 'Layers and pages',
      tagline: '4 layers x several pages. Hold Shift, then tap an arrow.',
      where: [0, 0],
      zones: [{r: [1, 2], c: [3, 3], label: 'Shift', color: '#f2a93b'}, {r: [1, 2], c: [9, 10], label: 'Arrows', color: '#ff6f91'}, {r: [3, 10], c: [9, 10], label: '1 LED per layer / page', color: '#5aa7ff'}],
      marks: [{key: 'R1C3', text: '<b>Shift</b>: hold it.'}, {key: 'R1C10', text: '<b>Up</b> + Shift = next <b>layer</b>. (R2C10 down = previous layer.)'}, {key: 'R1C9', text: '<b>Right</b> + Shift = next <b>page</b>. (R2C9 left = previous page.)'}],
      what: 'Think of 4 floors in a building. <b>Layer 1</b> = keyboards, <b>Layer 2</b> = Ableton control, <b>Layer 3</b> = sequencers, <b>Layer 4</b> = generative music. Each floor has pages (rooms). While you hold <b>Shift</b>, the control area turns orange and the side columns show where you are: <b>column 9</b> lights one LED per layer, <b>column 10</b> one LED per page.',
      steps: [
        'Hold <b>Shift</b> (R1C3).',
        'Tap the <b>up arrow</b> (R1C10) for the next layer, <b>down</b> (R2C10) for the previous one.',
        'Tap the <b>right arrow</b> (R1C9) for the next page, <b>left</b> (R2C9) for the previous one.',
        'Let go of Shift. A page label (P1, P2 ...) flashes for a second to confirm.'
      ],
      tips: ['Each layer remembers which page you were on.', 'Without Shift the arrows are normal arrow keys (they also move cursors inside many pages).'],
      demo: {steps: [
        {say: 'You start on layer 1, page 1. <b>Hold Shift</b> (R1C3): the control area turns orange.', look: ['R1C3'], do: [['down', 'R1C3', 1000]]},
        {say: 'Still holding Shift, tap <b>up</b> (R1C10): next <b>layer</b>. Column 9 shows 2 LEDs for layer 2.', look: ['R1C10'], do: [['tap', 'R1C10', 150, 1100]]},
        {say: 'Tap <b>right</b> (R1C9): next <b>page</b>. Column 10 shows the page number.', look: ['R1C9'], do: [['tap', 'R1C9', 150, 1100]]},
        {say: 'Once more: page 3 on layer 2.', look: ['R1C9'], do: [['tap', 'R1C9', 150, 1100]]},
        {say: 'Let go of Shift. You are on <b>layer 2, page 3</b> (a bank of faders for Ableton macros).', do: [['up', 'R1C3', 1500]]}
      ], tail: 500}
    },
    {
      id: 'controls', nav: 'Control keys', kicker: 'Basics', title: 'The control keys: hold a key, then use the arrows',
      tagline: 'The orange keys on top work on every page. Many of them are settings: hold the key and tap the arrows.',
      where: [0, 1],
      zones: [{r: [1, 2], c: [1, 8], label: 'Control keys', color: '#f2a93b'}, {r: [1, 2], c: [9, 10], label: 'Arrows', color: '#ff6f91'}],
      marks: [
        {key: 'R1C6', text: '<b>Channel</b>: the MIDI channel for the whole board.'}, {key: 'R1C7', text: '<b>Scale</b>: which notes belong to the key you play in.'},
        {key: 'R1C8', text: '<b>Octave</b>: move everything up or down.'}, {key: 'R2C7', text: '<b>Tempo</b> (BPM) for the sequencers.'},
        {key: 'R2C8', text: '<b>Root</b>: the home note of the scale.'}, {key: 'R2C6', text: '<b>Volume</b> of the board channel.'}
      ],
      what: 'Keys like <b>Scale, Root, Octave, Tempo, Channel and Volume</b> have no value of their own. You <b>hold the key and tap the arrows</b>: <b>up / down</b> = a small step, <b>right / left</b> = a big step. While you hold, the pads spell out the new value (a 2-letter code or a number).',
      steps: [
        'Hold <b>Scale</b> (R1C7) and tap up / down: the next or previous scale. Left / right switches between the Western and Non-Western banks.',
        'Hold <b>Root</b> (R2C8) and tap up / down: the home note moves a semitone. Left / right moves by a fifth.',
        'Hold <b>Tempo</b> (R2C7): up / down = 1 BPM, left / right = 10 BPM.',
        'Hold <b>Octave</b> (R1C8): up / down = 1 semitone, left / right = 1 octave.',
        'Other keys: <b>Play/stop</b> (R1C4), <b>Board record</b> (R1C5), <b>Tap tempo</b> (R2C5), <b>Undo</b> (R2C3), <b>Quantize</b> (R2C4), <b>Pitch bend</b> (R1C1 / R2C1).',
        '<b>Clock source</b> (R6C10): <b>Auto</b> (AU) follows a MIDI clock from Ableton or another device when one arrives; <b>Internal only</b> (IN) ignores outside clock, start and stop. The key is orange while an outside clock is running.', 'Also on the side keys: <b>Ableton record</b> (R4C9), <b>Redo</b> (R4C10), <b>Ableton Quantize</b> (R6C9) and <b>rolled chords</b> (R8C9). <b>Shift</b> (R1C3) is only for changing layer and page.'
      ],
      tips: ['Colours: <b>orange</b> = the key is on, <b>cyan</b> = this key does something different on this page, white = normal.', 'The full list of control keys, with their Shift jobs, is in the table below.'],
      table: controlsTable, ctrlMap: true,
      demo: {steps: [
        {say: 'Hold <b>Scale</b> (R1C7) and tap <b>up</b> (R1C10): the next scale. The pads show its 2-letter name.', look: ['R1C7', 'R1C10'], do: [['hold', 'R1C7', [['taps', 'R1C10', 2, 700]], 300, 500]]},
        {say: 'With Scale held, <b>right</b> (R1C9) jumps to the other bank of scales.', look: ['R1C7', 'R1C9'], do: [['hold', 'R1C7', [['tap', 'R1C9', 150, 700]], 300, 500]]},
        {say: 'Hold <b>Root</b> (R2C8) and tap <b>up</b>: the home note rises a semitone each time.', look: ['R2C8', 'R1C10'], do: [['hold', 'R2C8', [['taps', 'R1C10', 3, 700]], 300, 500]]},
        {say: 'Hold <b>Tempo</b> (R2C7): <b>up</b> adds 1 BPM, <b>right</b> adds 10.', look: ['R2C7', 'R1C9'], do: [['hold', 'R2C7', [['taps', 'R1C10', 2, 600], ['tap', 'R1C9', 150, 700]], 300, 500]]},
        {say: 'Hold <b>Octave</b> (R1C8) and tap <b>right</b>: one octave up for every keyboard.', look: ['R1C8', 'R1C9'], do: [['hold', 'R1C8', [['tap', 'R1C9', 150, 800]], 300, 500]]}
      ], tail: 500}
    },
    {
      id: 'arp', nav: 'Arpeggiator and rolled chords', kicker: 'Playing tools', title: 'Arpeggiator and rolled chords',
      tagline: 'Hold a chord and let the keyboard play the notes one by one, or strum chords like a guitar.',
      where: [0, 2],
      zones: [{r: [10, 10], c: [9, 9], label: 'ARP', color: '#ff6f91'}, {r: [8, 8], c: [9, 9], label: 'ROLL', color: '#ff6f91'}, {r: [3, 6], c: [1, 8], label: 'Arp settings (while ARP is held)', tone: 1}],
      marks: [{key: 'R10C9', text: '<b>ARP</b> key. <b>Double-tap</b> = on / off. <b>Hold</b> = open the settings.'}, {key: 'R8C9', text: '<b>ROLL</b> (R8C9) = rolled chords on / off.'}],
      what: 'The <b>arpeggiator</b> turns any held notes into a pattern, in time with the tempo. <b>Rolled chords</b> do something similar for chord keys: the notes of the chord come one after another (a harp or guitar strum) instead of all at once.',
      steps: [
        '<b>Double-tap ARP</b> (R10C9) to switch the arpeggiator on, and again to switch it off.',
        'Hold a few pads together: the notes are played one by one.',
        '<b>Hold ARP</b>: the top 4 pad rows turn into settings: rate, mode, octaves and gate, and a rhythm mask.',
        '<b>Hold ARP + up / down</b>: pick a pattern (its 2 letters appear on the pads): <b>AL</b> Alberti, <b>BA</b> Bach, <b>RO</b> rolling, <b>BE</b> bebop, <b>US</b> upper structure, <b>CS</b> cadence stop, <b>IN</b> intensity. Left / right sets the length of the cadence.',
        '<b>Rolled chords</b>: tap the <b>ROLL</b> key (R8C9). Hold it and use the arrows: up / down = speed, right = direction, left = velocity ramp.'
      ],
      tips: ['The keys have no velocity (they are on / off switches), so the <b>Intensity</b> pattern gets louder and denser the <b>longer you hold</b> the chord.', 'The arpeggiator follows the board tempo (hold <b>Tempo</b> R2C7 + arrows) or an outside MIDI clock. It works on every pad that plays notes: keyboards, chords and zones, but not drum pads.', 'It plays up to 16 held notes. With <b>Latch</b> on (double-tap Sustain, see Effects) the notes keep arpeggiating after you let go.', 'While the settings are shown you can still hold chord keys to hear the result; let go of ARP and the pads return to normal.'],
      extra: arpDiagram() + '<h4>The patterns (ARP held + up / down)</h4>' + patternTable() +
        sgrid('Where the arpeggiator keys are', [{label: 'R10', cells: ['', '', '', '', '', '', '', '', 'ARP|double-tap = on / off|a', 'SUS||c']}, {label: 'R9', cells: ['', '', '', '', '', '', '', '', 'FX||a', 'FX off||a']}, {label: 'R8', cells: ['', '', '', '', '', '', '', '', 'ROLL||a', '']}], 10, 'The side keys R8C9, R9C9-R9C10 and R10C9-R10C10 are the same on every page that does not use them for its own settings (the shared Controls). R10C9 = ARP, R8C9 = ROLL.'),
      demo: {steps: [
        {say: '<b>Double-tap ARP</b> (R10C9) to switch the arpeggiator on.', look: ['R10C9'], do: [['dtap', 'R10C9']]},
        {say: 'Hold three pads. Instead of a chord you hear the notes one after another, in time.', look: ['R10C1', 'R10C3', 'R10C5'], do: [['chord', ['R10C1', 'R10C3', 'R10C5'], 2200]]},
        {say: '<b>Hold ARP</b>: the top pad rows become the arp settings (rate, mode, octaves, gate). Tap one to change it.', look: ['R10C9'], do: [['hold', 'R10C9', [['wait', 900], 'R3C6', 'R4C3'], 300, 300]]},
        {say: 'Hold ARP and tap <b>up</b>: a new pattern. Its 2 letters show on the pads.', look: ['R10C9', 'R1C10'], do: [['hold', 'R10C9', [['taps', 'R1C10', 3, 700]], 300, 400]]},
        {say: 'Play the same chord again with the new pattern.', look: ['R10C1', 'R10C3', 'R10C5'], do: [['chord', ['R10C1', 'R10C3', 'R10C5'], 2400]]},
        {say: 'Double-tap ARP to switch it off.', look: ['R10C9'], do: [['dtap', 'R10C9']]}
      ], tail: 400}
    },
    {
      id: 'roll', nav: 'Rolled chords', kicker: 'Playing tools', title: 'Rolled chords (strum)',
      tagline: 'On the chord pages one pad plays a whole chord. Roll it to hear the notes one after another.',
      where: [0, 3],
      zones: [{r: [8, 8], c: [9, 9], label: 'ROLL', color: '#ff6f91'}],
      marks: [{key: 'R8C9', text: '<b>ROLL</b>: tap = rolled chords on / off. Hold + arrows = speed, direction, velocity ramp.'}, {key: 'R10C1', text: 'A chord pad (degree I triad).'}],
      what: 'Chords are pressed all at once by default. With <b>rolled chords</b> on, the notes of a chord start one after another like a harp or a guitar strum. You set the speed, the direction and a velocity ramp.',
      steps: ['Tap <b>ROLL</b> (R8C9): rolled chords on (tap again to switch off).', 'Play a chord pad: the notes come one after another.', '<b>Hold ROLL</b> and tap the arrows: up / down = speed (slow harp to fast guitar), right = direction (up / down / alternate), left = velocity ramp (flat / rising / falling).'],
      tips: ['<b>Speed</b>: 6 steps, from a slow harp (180 ms between notes) to a fast guitar strum (10 ms).', '<b>Direction</b>: UP (low to high), DN (high to low) or AL (alternates every time).', '<b>Velocity ramp</b>: FL = flat, CR = crescendo (each note louder), DM = diminuendo (each note softer). While you hold the key, the pads spell the new value.'],
      demo: {steps: [
        {say: 'First, a normal chord: all notes together.', look: ['R10C1'], do: [['chord', ['R10C1'], 700]]},
        {say: 'Tap <b>ROLL</b> (R8C9): rolled chords on.', look: ['R8C9'], do: [['tap', 'R8C9', 120, 500]]},
        {say: 'The same chord is now strummed note by note.', look: ['R10C1'], do: [['chord', ['R10C1'], 1500]]},
        {say: '<b>Hold ROLL</b> and tap the arrows to change the speed.', look: ['R8C9', 'R1C10'], do: [['hold', 'R8C9', [['taps', 'R1C10', 3, 500]], 250, 250]]},
        {say: 'Strum again, now at the new speed.', look: ['R10C1'], do: [['chord', ['R10C1'], 1500]]}
      ], tail: 300}
    },    {
      id: 'fx', nav: 'Effects, sustain, latch', kicker: 'Playing tools', title: 'Effects, sustain and latch',
      tagline: 'Delay, chorus and more for everything you play, plus a sustain pedal and a latch.',
      where: [0, 1],
      zones: [{r: [9, 10], c: [9, 10], label: 'FX, FX off, ARP, Sustain', color: '#f2a93b'}],
      marks: [{key: 'R9C9', text: '<b>FX</b>: tap = effects on / off. Hold = open the effects.'}, {key: 'R9C10', text: '<b>FX off</b>: switch every effect off.'}, {key: 'R10C10', text: '<b>Sustain</b>: hold = sustain pedal. Double-tap = latch.'}],
      what: 'The <b>FX key</b> (R9C9) adds MIDI effects (echoes, chorus, ratchets, harmonizer and more) to the notes you play. <b>Sustain</b> (R10C10) works like a piano pedal. <b>Double-tap</b> it for <b>latch</b>: the notes keep playing after you let go.',
      steps: ['<b>Hold FX</b> (R9C9): rows 3-8 show the effects. Columns 1-2 are 12 effects (tap = edit its faders, double-tap = on / off), columns 3-8 are its faders (see the picture below).', 'Tap a row in a fader column to set that fader: the top row is the highest level. The pad lights to show the value.', 'Let go and play: every effect that is on works on everything you play. <b>Tap FX</b> (without holding) to switch all effects on / off quickly; your settings are kept.', '<b>FX off</b> (R9C10) switches every effect off at once.', '<b>Hold Sustain</b> (R10C10) = sustain pedal (CC 64). <b>Double-tap Sustain</b> = latch on / off: notes keep sounding after you let go, tap the pad again to stop that note.'],
      tips: ['Effects are MIDI effects: they add extra notes or controller messages, so they work with any instrument, not only Ableton.', 'Effects stack: several can be on at the same time (for example Delay + Humanize).', 'The Effects (FX) key is a different thing from the <b>XY effects</b> on layer 2 page 2, which send controller values instead.'],
      extra: fxDiagram() + '<h4>The 12 effects and their faders</h4>' + fxTable(),
      demo: {steps: [
        {say: 'A plain note first.', look: ['R8C1'], do: [['tap', 'R8C1', 200, 900]]},
        {say: '<b>Tap FX</b> (R9C9) once: effects are switched on for everything you play.', look: ['R9C9'], do: ['R9C9', ['wait', 300]]},
        {say: '<b>Hold FX</b>: the pads show the effects. <b>Double-tap</b> the first effect (R3C1) to turn it on.', look: ['R9C9', 'R3C1'], do: [['hold', 'R9C9', [['dtap', 'R3C1'], ['wait', 600]], 300, 200]]},
        {say: 'Now every note comes back as echoes.', look: ['R8C1'], do: [['tap', 'R8C1', 200, 2400]]},
        {say: '<b>FX off</b> (R9C10) switches the effects off again.', look: ['R9C10'], do: ['R9C10', ['wait', 500]]},
        {say: '<b>Double-tap Sustain</b> (R10C10) for <b>latch</b>, then play a chord and let go: it keeps sounding.', look: ['R10C10'], do: [['dtap', 'R10C10'], ['chord', ['R8C1', 'R8C3', 'R8C5'], 400], ['wait', 1300]]},
        {say: 'Tap the pads again to stop the latched notes.', look: ['R8C1', 'R8C3', 'R8C5'], do: [['tap', 'R8C1', 120, 300], ['tap', 'R8C3', 120, 300], ['tap', 'R8C5', 120, 800]]}
      ], tail: 400}
    }
  ],

  // ------------------------------------------------------------------ Layers
  layers: [
    {title: 'Layer 1: Keyboards', short: 'Keyboards', intro: 'Seven ways to play notes: a composer with drums and pianos, chromatic and in-key grids, a chord keyboard, a harmony keyboard, many channels at once, and microtonal tunings.'},
    {title: 'Layer 2: Ableton control', short: 'Ableton control', intro: 'Launch clips, move effects with an XY pad, ride faders, and drive Ableton with shortcuts and knobs, all without touching the mouse.'},
    {title: 'Layer 3: Sequencers', short: 'Sequencers', intro: 'Record and loop patterns: a 4-track step recorder, a drum sequencer, a Euclidean rhythm machine and a CC sequencer for synth parameters.'},
    {title: 'Layer 4: Generative music', short: 'Generative', intro: 'Pages that make music by themselves from rules: random walkers, ripples on a pond, and a constellation of anchors.'}
  ],

  // ------------------------------------------------------------------ Pages
  pages: {
    L1P1: {
      tagline: 'Drums, a 16-step sequencer and two pianos on one screen.',
      what: 'Everything you need to sketch a song on one page: <b>drum pads</b> top-left, a <b>16-step mini sequencer</b> top-right, and an <b>upper and a lower piano</b> below. Each part has its own MIDI channel.',
      zones: [{r: [3, 6], c: [1, 4], label: 'Drum pads', tone: 0}, {r: [3, 6], c: [5, 8], label: 'Mini sequencer: 16 steps', tone: 3}, {r: [7, 8], c: [1, 8], label: 'Upper piano', tone: 1}, {r: [9, 10], c: [1, 8], label: 'Lower piano', tone: 2}],
      marks: [
        {key: 'R3C9', text: '<b>Octave down / up</b> (R3C9 / R3C10) for the pianos. The drums stay.'},
        {key: 'R7C3', text: '<b>Channel key</b> of the upper piano: hold it and tap the arrows. (R9C3 for the lower piano, R7C9 for the drums.)'},
        {key: 'R7C10', text: '<b>Sequence target</b>: hold it and press a drum pad or a piano key to choose what the sequencer edits.'},
        {key: 'R9C7', text: '<b>Chords</b> for the lower piano: tap = on / off, hold it and use the arrows to change the chord type.'}
      ],
      steps: [
        'Tap the <b>drum pads</b> to play drums.',
        'To make a loop: tap a drum pad, then tap <b>steps</b> on the right. The 16 steps read like text: left to right, top to bottom.',
        'Press <b>Play</b> (R1C4). A white light runs over the steps and the lit ones play.',
        'For a melody: hold <b>R7C10</b> and tap a piano key, then tap a step and press notes. Hold a step and tap right / left to make it longer.',
        'Lower piano: tap <b>R9C7</b> for chords: one key plays a whole chord.'
      ],
      tips: ['The sequencer stops when you leave this page.', 'Each pad of the sequencer belongs to whatever you tapped last: a drum, the upper piano or the lower piano.'],
      demo: {steps: [
        {say: 'Tap a drum pad to play it: kick, snare, hats.', look: ['R6C1', 'R6C3'], do: ['R6C1', 'R6C3', 'R5C3']},
        {say: 'Build a beat: tap the <b>kick</b> pad (R6C1), then tap steps 1 and 9 on the right.', look: ['R6C1', 'R3C5', 'R5C5'], do: ['R6C1', 'R3C5', 'R5C5']},
        {say: 'Tap the <b>snare</b> pad (R6C3), then steps 5 and 13.', look: ['R6C3', 'R4C5', 'R6C5'], do: ['R6C3', 'R4C5', 'R6C5']},
        {say: 'Tap the <b>closed hat</b> (R5C3), then every other step.', look: ['R5C3', 'R3C7', 'R4C7', 'R5C7', 'R6C7'], do: ['R5C3', 'R3C7', 'R4C7', 'R5C7', 'R6C7']},
        {say: 'Press <b>Play</b>: the white playhead runs over the steps and your drums play.', look: ['R1C4'], do: ['R1C4', ['wait', 4200]]},
        {say: 'Press Play again to stop.', look: ['R1C4'], do: ['R1C4']}
      ], tail: 300}
    },
    L1P2: {
      tagline: 'Every pad is a note: one semitone per column, eight per row.',
      what: 'A <b>chromatic isomorphic</b> keyboard: next pad to the right = one semitone higher, next row up = eight semitones higher. Chord and scale shapes look the same in every key. The lights show your scale: <b>root notes</b> shine in the main colour, other notes of the scale in a second colour, notes <b>outside the scale are dark</b>.',
      zones: [{r: [3, 10], c: [1, 8], label: 'Chromatic grid (36-99)', tone: 0}],
      marks: [{key: 'R10C1', text: 'Bottom-left = note 36 (C1).'}, {key: 'R10C2', text: 'One pad right = <b>+1 semitone</b>.'}, {key: 'R9C1', text: 'One pad up = <b>+8 semitones</b>.'}],
      steps: ['Play along a row: each pad is a semitone higher.', 'Change the scale: hold <b>Scale</b> (R1C7) and tap up / down. The dark pads change.', 'Change the home note: hold <b>Root</b> (R2C8) and use the arrows.', 'Hold <b>Octave</b> (R1C8) and use the arrows to move the whole grid.'],
      tips: ['Because the shapes are the same in every key, a chord you learn once works everywhere.'],
      demo: {steps: [
        {say: 'Play along the bottom row: every pad is one <b>semitone</b> higher.', look: ['R10C1', 'R10C2'], do: ['R10C1', 'R10C2', 'R10C3', 'R10C4', 'R10C5']},
        {say: 'One row up is 8 semitones higher.', look: ['R9C1'], do: ['R10C1', 'R9C1', 'R8C1']},
        {say: 'Hold <b>Scale</b> (R1C7) and tap up: the pads that are <b>not in the scale go dark</b>.', look: ['R1C7', 'R1C10'], do: [['hold', 'R1C7', [['taps', 'R1C10', 2, 700]], 300, 600]]},
        {say: 'Hold <b>Root</b> (R2C8) and tap up: the whole pattern of lights moves.', look: ['R2C8', 'R1C10'], do: [['hold', 'R2C8', [['taps', 'R1C10', 3, 600]], 300, 500]]}
      ], tail: 600}
    },
    L1P3: {
      tagline: 'Only notes of your scale, so you cannot play a wrong note.',
      what: 'A grid where <b>every pad is in the selected scale and root</b>. Next pad to the right = next note of the scale, next row up = 3 scale steps higher. Root notes are lit in the main colour. Change the scale or root and every pad changes with it.',
      zones: [{r: [3, 10], c: [1, 8], label: 'In-key grid', tone: 0}],
      marks: [{key: 'R10C1', text: 'The lowest pad is the <b>root</b> note.'}, {key: 'R10C2', text: 'One pad right = <b>next scale note</b>.'}, {key: 'R9C1', text: 'One row up = <b>3 scale steps</b> (a third).'}],
      steps: ['Play up a row: you walk up the scale.', 'Hold <b>Scale</b> (R1C7) + up / down: the same pads now play another scale (major, minor, blues, ...).', 'Hold <b>Root</b> (R2C8) + arrows to change the home note.'],
      tips: ['A good page for beginners and for live improvising: whatever you press sounds right.'],
      demo: {steps: [
        {say: 'Play up the bottom row: you are climbing the scale.', look: ['R10C1', 'R10C8'], do: ['R10C1', 'R10C2', 'R10C3', 'R10C4', 'R10C5', 'R10C6', 'R10C7', 'R10C8']},
        {say: 'A chord from pads in a zig-zag (every other pad up a row).', look: ['R10C1', 'R9C1', 'R8C1'], do: [['chord', ['R10C1', 'R9C1', 'R8C1'], 900]]},
        {say: 'Change the scale: hold <b>Scale</b> (R1C7) and tap up.', look: ['R1C7', 'R1C10'], do: [['hold', 'R1C7', [['taps', 'R1C10', 3, 700]], 300, 500]]},
        {say: 'The same pads now play a different scale.', look: ['R10C1', 'R10C8'], do: ['R10C1', 'R10C2', 'R10C3', 'R10C4', 'R10C5']}
      ], tail: 400}
    },
    L1P4: {
      tagline: 'One chord per pad, Launchpad-style.',
      what: 'Each pad plays a <b>whole chord</b> built from your scale and root. The <b>columns</b> are the chords of the key, I to VIII (like the degrees of the scale). The <b>rows</b> are chord types, from the bottom: triad, 1st inversion, 2nd inversion, 7th, 9th, sus2, sus4, power chord.',
      zones: [{r: [3, 10], c: [1, 8], label: 'One chord per pad', tone: 0}],
      marks: [{key: 'R10C1', text: 'Bottom row = <b>triads</b>, columns = degrees I to VIII.'}, {key: 'R9C1', text: 'Second row = 1st inversion (smoother voice leading).'}, {key: 'R7C1', text: '4th row = 7th chords.'}, {key: 'R3C1', text: 'Top row = power chords.'}],
      steps: ['Tap a pad in the bottom row: the chord of that degree (I, ii, iii, IV, V, vi ...).', 'Move up a row to change the chord type of the same degree.', 'Change <b>Scale</b> / <b>Root</b> and all chords follow.'],
      tips: ['A classic progression to try: I - V - vi - IV = pads in columns 1, 5, 6 and 4 of the bottom row.'],
      demo: {steps: [
        {say: 'Tap the bottom row for triads: I (R10C1) ...', look: ['R10C1'], do: [['chord', ['R10C1'], 800]]},
        {say: '... then V (R10C5), vi (R10C6) and IV (R10C4): a pop progression.', look: ['R10C5', 'R10C6', 'R10C4'], do: [['chord', ['R10C5'], 800], ['chord', ['R10C6'], 800], ['chord', ['R10C4'], 800]]},
        {say: 'Go up a row for the 1st inversion of the same chord.', look: ['R9C1'], do: [['chord', ['R10C1'], 700], ['chord', ['R9C1'], 700]]},
        {say: 'Four rows up: a 7th chord. It sounds richer.', look: ['R7C1'], do: [['chord', ['R7C1'], 1000]]}
      ], tail: 400}
    },
    L1P5: {
      tagline: 'Chords on the left, melody on the right, plus a 4-step chord loop.',
      what: 'An experimental keyboard for writing. <b>Left half:</b> the chords of the key (rows I, II, III, IV, V, VI, VII and I again, bottom to top; columns triad, 7th, 9th, sus4). <b>Right half:</b> a melody keyboard with only notes of the scale, <b>lit by the chord you hold</b>: chord tones, good tensions, and notes to avoid. The 4 keys at the right (R3C9-R6C9) are a <b>chord progression</b>.',
      zones: [{r: [3, 10], c: [1, 4], label: 'Chords of the key', tone: 0}, {r: [3, 10], c: [5, 8], label: 'Melody (lit by the held chord)', tone: 1}, {r: [3, 6], c: [9, 9], label: 'Progression', tone: 2}],
      marks: [{key: 'R10C1', text: '<b>Degree I</b>. Going up the rows: II, III, IV, V, VI, VII, I (octave up).'}, {key: 'R10C5', text: '<b>Melody keys</b>: only scale notes. Right = next scale note, up = 4 notes higher.'}, {key: 'R3C9', text: '<b>Progression step 1</b> (4 steps, top to bottom). Tap to select, then press a chord.'}],
      steps: [
        'Hold a chord with one hand, play the melody pad with the other: the <b>lights show which notes fit</b> the chord.',
        'To loop a progression: tap a <b>step</b> (R3C9-R6C9), then press a chord key. Do this for each of the 4 steps.',
        'Press <b>Play</b> (R1C4): the four chords loop. (Stopped: the chord is set at once. Play + Record: it goes in at the next loop.)',
        '<b>Delete + tap a step</b> clears it. The loop length follows the step recorder BARS setting.'
      ],
      demo: {steps: [
        {say: 'Hold the <b>I chord</b> (R10C1) with the left hand and play melody pads on the right. The lights show chord tones and tensions.', look: ['R10C1', 'R10C5'], do: [['down', 'R10C1', 300], 'R10C5', 'R10C6', 'R10C7', 'R9C6', ['up', 'R10C1', 300]]},
        {say: 'Now a progression. Tap <b>step 1</b> (R3C9), then the <b>I</b> chord.', look: ['R3C9', 'R10C1'], do: ['R3C9', 'R10C1']},
        {say: 'Step 2 (R4C9) and the <b>V</b> chord (R6C1).', look: ['R4C9', 'R6C1'], do: ['R4C9', 'R6C1']},
        {say: 'Step 3 (R5C9): <b>vi</b> (R5C1). Step 4 (R6C9): <b>IV</b> (R7C1).', look: ['R5C9', 'R5C1', 'R6C9', 'R7C1'], do: ['R5C9', 'R5C1', 'R6C9', 'R7C1']},
        {say: 'Press <b>Play</b>: the four chords loop. The playhead step is white.', look: ['R1C4'], do: ['R1C4', ['wait', 6800]]},
        {say: 'Press Play to stop.', do: ['R1C4']}
      ], tail: 300}
    },
    L1P6: {
      tagline: 'Four small keyboards, each on its own MIDI channel.',
      what: 'Four <b>one-octave keyboards</b> (two rows each), every one with its own <b>MIDI channel, octave and volume</b>. Ideal for playing several instruments at once from a single page (for example four tracks in Ableton). The <b>bank keys</b> (R5C9 / R5C10) give you 4 banks = 16 keyboards in all, on channels 1-16.',
      zones: [{r: [3, 4], c: [1, 8], label: 'Keyboard 1', tone: 0}, {r: [5, 6], c: [1, 8], label: 'Keyboard 2', tone: 1}, {r: [7, 8], c: [1, 8], label: 'Keyboard 3', tone: 2}, {r: [9, 10], c: [1, 8], label: 'Keyboard 4', tone: 3}],
      marks: [{key: 'R3C3', text: '<b>Channel</b> key: hold it and tap the arrows. The pads show the channel.'}, {key: 'R3C7', text: '<b>Octave</b> key of keyboard 1.'}, {key: 'R3C8', text: '<b>Volume</b> key (CC 7 on its channel).'}, {key: 'R5C10', text: '<b>Next bank</b> of 4 keyboards (R5C9 = previous).'}],
      steps: ['Play any keyboard: it sends on its own channel.', 'Hold a keyboard\'s <b>channel</b> key and tap up / down to move it to another channel.', 'Use the <b>octave</b> and <b>volume</b> keys the same way (hold + arrows).', '<b>R5C9 / R5C10</b>: switch to the next bank of four keyboards.'],
      demo: {steps: [
        {say: 'Keyboard 1 (top two rows): play a few notes.', look: ['R4C1', 'R4C3'], do: ['R4C1', 'R4C3', 'R4C5']},
        {say: 'Keyboard 2 sends on the next channel. Compare the channel numbers in the box below.', look: ['R6C1', 'R6C3'], do: ['R6C1', 'R6C3', 'R6C5']},
        {say: 'Hold the <b>channel key</b> of keyboard 1 (R3C3) and tap <b>up</b>: it moves to another channel.', look: ['R3C3', 'R1C10'], do: [['hold', 'R3C3', [['taps', 'R1C10', 3, 700]], 300, 500]]},
        {say: 'Play it again: the channel in the box has changed.', look: ['R4C1'], do: ['R4C1', 'R4C3']},
        {say: '<b>Next bank</b> (R5C10): four new keyboards on channels 5-8.', look: ['R5C10'], do: ['R5C10', ['wait', 900], 'R4C1', 'R6C1']}
      ], tail: 400}
    },
    L1P7: {
      tagline: 'Notes between the notes: 24, 19 and 31 tones per octave, just intonation and more.',
      what: 'An isomorphic keyboard with <b>six tunings</b>: 24-EDO (quarter tones), 19-EDO, 31-EDO, just intonation, harmonic series and Bohlen-Pierce. Each note is sent as <b>MPE</b> (its own channel plus a pitch bend), so a synth that supports MPE plays the exact pitch. The pad labels show the pitch in <b>cents</b>.',
      zones: [{r: [3, 10], c: [1, 8], label: 'Microtonal grid', tone: 0}],
      marks: [{key: 'R5C9', text: '<b>Previous tuning</b> (its code shows on the grid).'}, {key: 'R5C10', text: '<b>Next tuning</b>.'}],
      steps: ['Play the pads: between two normal notes there are extra pads.', 'Tap <b>R5C10</b> for the next tuning (R5C9 = previous).', 'In Ableton: set the track input to the C100 with <b>MPE</b> on and use an MPE instrument (Wavetable, Drift, Meld, Sampler).'],
      tips: ['Colours: root and octaves in the main colour, the pure fifth in colour 4, notes that match the normal 12 notes in colour 2, other microtones in colour 3.'],
      warn: ['This page needs an <b>MPE instrument</b>. A normal synth plays the notes but ignores the pitch bends, so the in-between notes sound wrong.'],
      demo: {steps: [
        {say: 'Play along a row. Each note is sent with its own pitch bend (watch the box below).', look: ['R10C1', 'R10C2'], do: ['R10C1', 'R10C2', 'R10C3', 'R10C4', 'R10C5']},
        {say: 'Next tuning: <b>R5C10</b>. The grid shows the new tuning code.', look: ['R5C10'], do: ['R5C10', ['wait', 900]]},
        {say: 'The same pads now give different pitches.', look: ['R10C1', 'R10C2'], do: ['R10C1', 'R10C2', 'R10C3']}
      ], tail: 400}
    },
    L2P1: {
      tagline: 'A clip launcher for Ableton, Launchpad style.',
      what: 'The 8x8 grid launches <b>clips</b> (MIDI notes 0-63 on channel 16). The row on top, <b>row 2</b>, has <b>track buttons</b> 1-8. The side keys change what the track buttons do (select, arm, solo, mute) or turn the grid into <b>8 faders</b> (volume, pan, send A, send B).',
      zones: [{r: [2, 2], c: [1, 8], label: 'Track buttons 1-8', color: '#f2a93b'}, {r: [3, 10], c: [1, 8], label: 'Clip grid', tone: 0}, {r: [3, 6], c: [9, 10], label: 'Modes', tone: 2}],
      marks: [{key: 'R2C1', text: '<b>Track 1</b> (R2C1-R2C8). Notes 64-95 on channel 16.'}, {key: 'R3C9', text: '<b>Arm</b> / solo (R3), mute / select (R4): what the track buttons do.'}, {key: 'R5C9', text: '<b>Volume</b> / pan (R5), send A / send B (R6): the grid becomes 8 faders.'}, {key: 'R7C9', text: '<b>Duplicate</b> (Ctrl+D) and Delete (R7C10).'}, {key: 'R8C9', text: '<b>Undo</b> / Redo (R8), <b>Ableton record</b> / Quantize (R9), <b>launch selected</b> / clip on-off (R10).'}],
      steps: [
        'In Ableton: open <b>MIDI Map mode</b> (Ctrl+M), click a clip, press the pad you want, repeat. Then close map mode.',
        'Tap a pad to launch the clip it is mapped to.',
        'Row 2 = track buttons. Tap <b>R3C9</b> (arm), then a track button: that track is armed. <b>R4C10</b> goes back to select.',
        '<b>R5C9</b> (volume) turns the grid into 8 faders: tap higher up = louder. Same for pan and sends.', 'The keys at the bottom of the side columns are Ableton commands: Undo, Redo, record, Quantize, launch selected, clip on / off.'
      ],
      tips: ['Ableton does not send lights back yet: the pads show a fixed colour.', 'Turn <b>Remote</b> on for the C100 in Ableton\'s MIDI preferences, or MIDI map will not see the CC messages.'],
      demo: {steps: [
        {say: 'Tap clip pads: each sends a note on channel 16. Map it to a clip in Ableton.', look: ['R10C1', 'R9C2'], do: ['R10C1', 'R9C2', 'R8C3']},
        {say: '<b>Track buttons</b> are in row 2. By default they <b>select</b> a track.', look: ['R2C1', 'R2C2'], do: ['R2C1', 'R2C2']},
        {say: 'Tap <b>arm</b> (R3C9), then a track button: that track is armed.', look: ['R3C9', 'R2C3'], do: ['R3C9', 'R2C3', 'R2C4']},
        {say: 'Back to <b>select</b> (R4C10).', look: ['R4C10'], do: ['R4C10']},
        {say: 'Tap <b>volume</b> (R5C9): the grid turns into 8 faders. Tap a pad to set that track\'s volume.', look: ['R5C9', 'R7C3', 'R4C5'], do: ['R5C9', 'R7C3', 'R4C5', 'R9C1']},
        {say: 'Tap volume again to go back to the clips.', look: ['R5C9'], do: ['R5C9']}
      ], tail: 400}
    },
    L2P2: {
      tagline: 'A Kaoss-pad style XY effect with 8 effects, each on its own channel.',
      what: 'Touch the grid and it sends two <b>CC values</b>: <b>X</b> (CC 16, left to right) and <b>Y</b> (CC 17, bottom to top), plus <b>touch</b> (CC 18). Two fingers = the point halfway between them, and the value glides smoothly. The <b>8 effect keys</b> in row 2 pick which effect you control, and <b>every effect has its own MIDI channel</b> (channel 9 to 16), so each one can be mapped to a different device in Ableton.',
      zones: [{r: [2, 2], c: [1, 8], label: 'Effect 1-8 (channel 9-16)', color: '#f2a93b'}, {r: [3, 10], c: [1, 8], label: 'Touch area (X / Y)', tone: 0}, {r: [5, 5], c: [9, 9], label: 'Hold', tone: 2}],
      marks: [{key: 'R2C1', text: '<b>Effect 1</b> (R2C1-R2C8). Effect n sends on channel 8 + n. The chosen effect lights orange.'}, {key: 'R8C4', text: 'Touch anywhere: X = column, Y = row.'}, {key: 'R5C9', text: '<b>Hold</b>: keep the effect on after you let go.'}],
      steps: ['Tap an <b>effect key</b> in row 2 (the chosen one lights orange).', 'Touch the grid: X, Y and touch messages go out on that effect\'s channel.', 'Touch with two fingers: you get the middle point.', '<b>R5C9</b> (hold) keeps the effect on after you let go.'],
      tips: ['In Ableton, map X to one parameter and Y to another for each effect channel.'],
      demo: {steps: [
        {say: 'Effect 1 is selected (channel 9). Hold a pad: X, Y and touch are sent.', look: ['R8C3'], do: [['down', 'R8C3', 900], ['up', 'R8C3', 500]]},
        {say: 'Pick <b>effect 3</b> (R2C3). Its X / Y now go out on <b>channel 11</b>.', look: ['R2C3'], do: ['R2C3', ['down', 'R5C6', 900], ['up', 'R5C6', 500]]},
        {say: 'Two fingers: the value is the point <b>halfway</b> between them and it glides.', look: ['R9C2', 'R4C7'], do: [['down', 'R9C2', 200], ['down', 'R4C7', 1200], ['up', 'R9C2', 200], ['up', 'R4C7', 500]]},
        {say: '<b>Hold</b> (R5C9) keeps the effect on after you let go.', look: ['R5C9'], do: [['down', 'R6C5', 300], ['tap', 'R5C9', 120, 100], ['up', 'R6C5', 1200], ['tap', 'R5C9', 120, 600]]}
      ], tail: 400}
    },
    L2P3: {
      tagline: 'Eight vertical faders for Ableton rack macros, handy while you play a piano.',
      what: 'The pad grid is <b>8 vertical faders</b> (one per column) for <b>rack macros 1-8</b> (CC 102-109 on channel 16). Row 2 still holds the track buttons. A good support page while your other hand plays a piano keyboard.',
      zones: [{r: [3, 10], c: [1, 8], label: '8 faders (macros 1-8)', tone: 0}],
      marks: [{key: 'R10C1', text: 'Bottom row = 0, top row = 127.'}, {key: 'R3C8', text: 'Column 8 = macro 8 (CC 109).'}],
      steps: ['Tap a pad in a column: that macro jumps to the height you tapped.', 'The lit bar shows the current value.', 'Map CC 102-109 (channel 16) to your rack macros with MIDI map.'],
      demo: {steps: [
        {say: 'Tap near the middle of column 1: macro 1 jumps there.', look: ['R6C1'], do: ['R6C1']},
        {say: 'Tap the top of column 2 for the maximum, the bottom of column 3 for the minimum.', look: ['R3C2', 'R10C3'], do: ['R3C2', 'R10C3']},
        {say: 'Move several faders in turn.', look: ['R5C5', 'R8C6', 'R4C8'], do: ['R5C5', 'R8C6', 'R4C8', 'R9C7']}
      ], tail: 500}
    },
    L2P4: {
      tagline: '32 knobs, always on: two keys each.',
      what: 'The whole 8x8 grid is <b>32 knobs</b> on channel 15, two keys each: the <b>left key turns the knob down, the right key turns it up</b>, and holding a key keeps turning it. <b>Rows 7-10</b> are CC 20-35, <b>rows 3-6</b> are CC 36-39 and 90-101. No Shift needed. Row 2 still holds the track buttons (channel 16, as on page 1).',
      zones: [{r: [7, 10], c: [1, 8], label: 'CC 20-35 (rows 7-10)', tone: 0}, {r: [3, 6], c: [1, 8], label: 'CC 36-39 and 90-101 (rows 3-6)', tone: 1}, {r: [2, 2], c: [1, 8], label: 'Track buttons', color: '#f2a93b'}],
      marks: [{key: 'R7C1', text: '<b>Knob 1</b> down (R7C1) / up (R7C2): CC 20. Every pair of keys is one knob.'}, {key: 'R3C1', text: 'Top row: knob CC 36 (R3C1 / R3C2), CC 37 (R3C3 / R3C4) ...'}, {key: 'R10C7', text: 'Last knob: CC 35.'}],
      steps: ['Tap the <b>right key</b> of a pair: the knob turns up by one step. The <b>left key</b> turns it down.', 'Hold a key: after a moment the knob keeps turning.', 'Map any knob in Ableton: MIDI map mode, click a parameter, turn the knob.'],
      tips: ['The same 8x8 grid on page 5 holds Ableton shortcuts instead.', 'Knob values are remembered, so a knob continues from where it was.'],
      demo: {steps: [
        {say: 'Tap the right key of knob 1 (<b>R7C2</b>): it turns up. Each press sends CC 20.', look: ['R7C2'], do: [['taps', 'R7C2', 4, 300]]},
        {say: 'The left key (<b>R7C1</b>) turns it down.', look: ['R7C1'], do: [['taps', 'R7C1', 2, 300]]},
        {say: 'Every pair is its own knob: R8C4 is the right key of CC 25.', look: ['R8C4'], do: [['taps', 'R8C4', 3, 300]]},
        {say: 'The top rows are knobs too: CC 36 ... 39 and 90 ... 101. <b>Hold</b> a key to keep turning.', look: ['R3C2'], do: [['down', 'R3C2', 1400], ['up', 'R3C2', 300]]}
      ], tail: 400}
    },
    L2P5: {
      tagline: 'Ableton shortcuts on the pads.',
      what: 'Run Ableton without the mouse. <b>Rows 3-6</b> hold the main shortcuts (view, tracks, loop, play, zoom). <b>Rows 7-10</b> hold editing shortcuts (select, copy, undo, zoom, time edits, arrow keys). Row 2 has the track buttons, working exactly as on page 1 (channel 16).',
      zones: [{r: [3, 6], c: [1, 8], label: 'Shortcuts: view, tracks, play', tone: 0}, {r: [7, 10], c: [1, 8], label: 'Shortcuts: edit, zoom, time', tone: 1}, {r: [2, 2], c: [1, 8], label: 'Track buttons', color: '#f2a93b'}],
      marks: [{key: 'R3C1', text: '<b>Tab</b>: switch Session / Arrangement view.'}, {key: 'R6C1', text: '<b>Space</b>: play / stop in Ableton.'}, {key: 'R7C2', text: '<b>Ctrl+Z</b>: undo.'}, {key: 'R7C5', text: 'The four arrow keys (R7C5-R7C8).'}],
      steps: ['Tap a pad: the C100 types that shortcut on your computer (Ableton must be in front).', 'The shortcuts are the same as in Ableton\'s own list, so what you learn here works on your computer keyboard too.'],
      tips: ['A few shortcuts exist twice on purpose: Undo, Redo and Quantize are also on the control keys, on page 1, and the arrow keys at the top right.'],
      demo: {steps: [
        {say: 'Tap <b>R3C1</b>: the C100 presses Tab on your computer (Session / Arrangement).', look: ['R3C1'], do: ['R3C1']},
        {say: '<b>R6C1</b> is Space (play / stop in Ableton). <b>R7C2</b> is Undo.', look: ['R6C1', 'R7C2'], do: ['R6C1', 'R7C2']},
        {say: 'The arrow keys (<b>R7C5-R7C8</b>) move the selection in Ableton.', look: ['R7C5', 'R7C8'], do: ['R7C5', 'R7C6', 'R7C7', 'R7C8']},
        {say: '<b>R9C1</b> and <b>R9C2</b> zoom to the selection and back.', look: ['R9C1', 'R9C2'], do: ['R9C1', 'R9C2']}
      ], tail: 400}
    },    L3P1: {
      tagline: 'A 4-track step recorder with pianos and drum pads.',
      what: 'Record melodies and drums into <b>4 tracks of 16 or 32 steps</b>. <b>Rows 3-6</b> are the tracks (8 steps per page). <b>Rows 7-10</b> are keyboards: two pianos, a second pair, or drum pads and drum steps (the SK key flicks between three keyboard pages). With <b>Board record</b> on: <b>stopped = step record</b> (each note or chord fills the next step); <b>playing = live record</b>.',
      zones: [{r: [3, 6], c: [1, 8], label: 'Tracks 1-4 (8 steps per page)', tone: 0}, {r: [7, 10], c: [1, 8], label: 'Keyboards (3 pages)', tone: 1}, {r: [3, 10], c: [9, 10], label: 'Step tools', color: '#5aa7ff'}],
      marks: [{key: 'R7C9', text: '<b>Rest</b> (R7C9) and <b>Tie</b> (R7C10) while step recording.'}, {key: 'R5C9', text: '<b>Mute</b> the track under the cursor.'}, {key: 'R6C9', text: '<b>Bars</b>: hold + arrows: 1 bar = 16 steps, 2 bars = 32.'}, {key: 'R7C8', text: '<b>Edit modes</b>: double-tap = faders for velocity, probability, ratchet.'}, {key: 'R8C9', text: '<b>Step page</b>: next 8 steps.'}],
      steps: [
        'Tap <b>Board record</b> (R1C5): it blinks red.',
        'Stopped = <b>step record</b>: play a note or a chord, and it fills the step under the white cursor, then the cursor moves on. Use <b>Rest</b> (R7C9) for an empty step and <b>Tie</b> (R7C10) to hold a note.',
        'Turn record off and press <b>Play</b>: the track plays back.',
        'Playing + record = <b>live record</b>: whatever you play lands in the playing step.',
        'The side keys R3-R4 set the track\'s <b>rate, swing and direction</b> and switch the <b>metronome</b> (hold + arrows). <b>Double-tap Delete</b> clears the whole track, <b>double-tap Copy</b> pastes.'
      ],
      tips: ['Double-tap <b>R7C8</b> to edit each step\'s velocity, probability or ratchet (rows 3-6 become 8 faders).', 'This page only plays while you are on it.'],
      warn: ['This page will be reworked in a later version. The steps above describe version 13.'],
      demo: {steps: [
        {say: 'Tap <b>Board record</b> (R1C5). The key blinks red.', look: ['R1C5'], do: ['R1C5']},
        {say: 'Play notes on the piano keys (rows 7-8). Each note fills the <b>next step</b> of track 1.', look: ['R8C1', 'R8C3'], do: ['R8C1', 'R8C3', 'R8C5']},
        {say: 'Tap <b>Rest</b> (R7C9) to leave a step empty, then add a note.', look: ['R7C9'], do: ['R7C9', 'R8C8']},
        {say: 'Switch record off, then press <b>Play</b> (R1C4): track 1 plays what you entered.', look: ['R1C5', 'R1C4'], do: ['R1C5', 'R1C4', ['wait', 4200]]},
        {say: 'Press Play to stop.', look: ['R1C4'], do: ['R1C4']}
      ], tail: 300}
    },
    L3P2: {
      tagline: '8 drum lanes x 16 steps. The classic grid beat maker.',
      what: 'Each row is a <b>drum lane</b> (bottom row = lane 1 = note 36). Tap a pad to switch that step on or off. The pad grid shows 8 steps at a time: <b>R5C9</b> shows steps 1-8, <b>R5C10</b> steps 9-16. Press Play and a coloured column runs along the steps. It uses the internal clock, or follows an outside MIDI clock (for example Ableton) automatically. Shift + Tap (R2C5) switches to the internal clock only.',
      zones: [{r: [3, 10], c: [1, 8], label: '8 lanes x 8 steps (two pages = 16)', tone: 0}],
      marks: [{key: 'R10C1', text: '<b>Lane 1</b> (bottom row) plays note 36. Each row up is the next note.'}, {key: 'R5C9', text: 'Show steps <b>1-8</b>.'}, {key: 'R5C10', text: 'Show steps <b>9-16</b>.'}],
      steps: ['Tap pads to switch steps on (they light) or off.', 'Press <b>Play</b> (R1C4): the loop starts. The playhead column is a different colour.', 'Tap <b>R5C10</b> to see and edit steps 9-16.', 'Change the tempo: hold <b>Tempo</b> (R2C7) and tap the arrows.'],
      demo: {steps: [
        {say: 'Lane 1 (bottom row): switch on steps 1 and 5 for a kick.', look: ['R10C1', 'R10C5'], do: ['R10C1', 'R10C5']},
        {say: 'Lane 3: a snare on steps 3 and 7.', look: ['R8C3', 'R8C7'], do: ['R8C3', 'R8C7']},
        {say: 'Lane 5: hats on every step.', look: ['R6C1', 'R6C8'], do: ['R6C1', 'R6C2', 'R6C3', 'R6C4', 'R6C5', 'R6C6', 'R6C7', 'R6C8']},
        {say: 'Press <b>Play</b>: the coloured column runs along the steps.', look: ['R1C4'], do: ['R1C4', ['wait', 4500]]},
        {say: '<b>R5C10</b> shows steps 9-16.', look: ['R5C10'], do: ['R5C10', ['wait', 1500]]},
        {say: 'Press Play to stop.', look: ['R1C4'], do: ['R1C4']}
      ], tail: 300}
    },
    L3P3: {
      tagline: 'Euclidean rhythms: hits spread as evenly as possible over the steps.',
      what: 'Eight lanes of drums (notes 36-43, bottom row = lane 1). For every lane you set the <b>length</b>, the number of <b>hits</b> (spread as evenly as possible, which gives rhythms found all over the world), a <b>start point</b> and a <b>variation</b>. You work with the <b>four arrows</b> (top right): <b>up / down pick the lane</b>, <b>left / right change a setting</b>. With nothing held the setting is the <b>start point</b>; hold Length, Hits or Variation to change those.',
      zones: [{r: [3, 10], c: [1, 8], label: 'Euclidean lanes (1 per row)', tone: 0}, {r: [1, 2], c: [1, 2], label: 'Hold to change', color: '#f2a93b'}, {r: [1, 2], c: [9, 10], label: 'Arrows', color: '#ff6f91'}],
      marks: [{key: 'R1C1', text: '<b>Length</b>: hold it, then left / right.'}, {key: 'R2C1', text: '<b>Hits</b>: hold it, then left / right.'}, {key: 'R1C2', text: '<b>Variation</b>: hold it, then left / right.'}, {key: 'R1C10', text: '<b>Up / down</b> pick the lane (its dim steps get brighter, the pads spell L1-L8). <b>Left / right</b> change the setting.'}],
      steps: ['Tap <b>up</b> or <b>down</b> (R1C10 / R2C10) to pick a lane. The pads spell its number (L1 to L8).', 'With <b>nothing held</b>, tap <b>right</b> or <b>left</b>: the lane\'s <b>start point</b> moves (the orange step), and wraps around.', '<b>Hold Hits</b> (R2C1) and tap right / left: more or fewer hits. <b>Hold Length</b> (R1C1): a longer or shorter lane. <b>Hold Variation</b> (R1C2): the chance (0-100%) that a hit drops or a rest plays a ghost hit.', 'Press <b>Play</b> (R1C4) and listen. Tap a step pad to end the lane there.'],
      tips: ['The keys light orange only while you hold them. The pads show the value (LN, HT, a number).', 'Every lane has up to 8 steps (one row of pads).','Play follows an outside MIDI clock automatically. R6C10 switches to the internal clock only.'],
      demo: {steps: [
        {say: 'Tap <b>up</b> twice: lane 3 is picked (the pads spell L3).', look: ['R1C10'], do: [['taps', 'R1C10', 2, 500]]},
        {say: '<b>Hold Hits</b> (R2C1) and tap <b>right</b>: lane 3 gets more hits, spread out evenly.', look: ['R2C1', 'R1C9'], do: [['hold', 'R2C1', [['taps', 'R1C9', 5, 300]], 300, 300]]},
        {say: '<b>Hold Length</b> (R1C1) and tap <b>left</b>: the lane gets shorter, so it loops faster.', look: ['R1C1', 'R2C9'], do: [['hold', 'R1C1', [['taps', 'R2C9', 4, 300]], 300, 300]]},
        {say: 'Let go. With <b>nothing held</b> the same arrows move the lane\'s <b>start point</b> (the orange step).', look: ['R1C9'], do: [['taps', 'R1C9', 3, 400]]},
        {say: 'Tap <b>down</b> twice to go back to lane 1 and give it hits too.', look: ['R2C10', 'R2C1'], do: [['taps', 'R2C10', 2, 400], ['hold', 'R2C1', [['taps', 'R1C9', 4, 300]], 300, 300]]},
        {say: 'Press <b>Play</b> (R1C4): all lanes play together, each on its own length.', look: ['R1C4'], do: ['R1C4', ['wait', 4500]]},
        {say: 'Press Play to stop.', do: ['R1C4']}
      ], tail: 300}
    },    L3P4: {
      tagline: 'A step sequencer for synth and effect parameters.',
      what: 'Instead of notes, this sequencer sends <b>CC values</b> (knob movements) to a synth or to Ableton. <b>4 lanes x 8 steps</b> (rows 3-6) on 16th notes. Row 9 holds <b>8 effect layers</b>: each layer has its own CC numbers and step values, and every layer that is <b>on</b> plays at the same time. Default channel 14. It keeps running in the background, also when you change page.',
      zones: [{r: [3, 6], c: [1, 8], label: '4 lanes x 8 steps (CC values)', tone: 0}, {r: [7, 8], c: [1, 8], label: 'Value, tempo, length, CC, channel, play', tone: 1}, {r: [9, 9], c: [1, 8], label: '8 effect layers', color: '#f2a93b'}, {r: [3, 6], c: [9, 10], label: 'Mute / learn', color: '#ff6f91'}],
      marks: [{key: 'R7C9', text: '<b>Record</b>: on = tap a step to set its value; off = the pads are live faders.'}, {key: 'R3C9', text: '<b>Mute</b> lane 1 to 4 (R3C9-R6C9).'}, {key: 'R3C10', text: '<b>Learn</b> lane 1 to 4 (R3C10-R6C10): tap it, then move a knob on your synth; the lane takes that CC number.'}, {key: 'R9C1', text: '<b>Effect layers</b> 1-8: tap = select, tap the selected one again = on / off. Bright = on, dim = off, white blink = selected.'}, {key: 'R8C5', text: '<b>Play / stop</b> this sequencer.'}],
      steps: ['<b>Not recording</b>: each lane\'s 8 pads are a live fader. Tap pad 1 for 0 and pad 8 for 127; the CC is sent at once.', 'Press <b>Record</b> (R7C9). Tap a step: the lane\'s 8 pads flash. Tap one (1 = lowest, 8 = highest) to set that step\'s value. <b>Double-tap</b> a step to switch it on or off.', 'Press <b>R8C5</b> to play. Brightness shows the value. Tap R9C2 to pick effect layer 2, tap it again to switch it on: both layers now play.', 'Change the lane\'s CC number with R8C1 / R8C2, the MIDI channel with R8C3 / R8C4. Or tap <b>Learn</b> and move a knob.'],
      demo: {steps: [
        {say: 'Not recording yet: tap pad 8 of lane 1 (R3C8). The pads are live faders, so the CC jumps to the top value.', look: ['R3C8'], do: ['R3C8', 'R3C2']},
        {say: 'Press <b>Record</b> (R7C9), then tap step 3 of lane 1: the lane\'s 8 pads flash. Tap pad 6 to set the value.', look: ['R7C9', 'R3C3'], do: ['R7C9', 'R3C3', 'R3C6']},
        {say: 'Do the same for step 5 (low value) and step 7 (high value).', look: ['R3C5', 'R3C7'], do: ['R3C5', 'R3C1', 'R3C7', 'R3C8']},
        {say: 'Press <b>Record</b> again to leave it, then press <b>Play</b> (R8C5): the CC values are sent in time.', look: ['R7C9', 'R8C5'], do: ['R7C9', 'R8C5', ['wait', 3200]]},
        {say: 'Tap <b>effect layer 2</b> (R9C2) to select it, tap it again to switch it on: it sends its own CCs at the same time.', look: ['R9C2'], do: ['R9C2', 'R9C2', ['wait', 1500]]},
        {say: 'Press Play to stop.', do: ['R8C5']}
      ], tail: 300}
    },    L4P1: {
      tagline: 'Up to four walkers roam the grid and play what they step on.',
      what: 'Each <b>walker</b> moves one step on the grid on every beat of the clock. Where it stands decides the note: <b>X = pitch</b> (scale degree 1-8), <b>Y = velocity</b> (or a CC value). Walkers each have their own colour and MIDI channel. The settings are keys you <b>hold</b> while you tap the arrows. Needs <b>Play</b> and plays while you are on this page.',
      zones: [{r: [3, 10], c: [1, 8], label: 'The field: X = pitch, Y = velocity', tone: 0}, {r: [3, 6], c: [9, 10], label: 'Select (left) / on-off (right)', tone: 1}, {r: [7, 10], c: [9, 10], label: 'Hold + arrows', color: '#f2a93b'}],
      marks: [{key: 'R3C9', text: '<b>Select</b> walker 1-4 (R3C9-R6C9).'}, {key: 'R3C10', text: '<b>On / off</b> for walker 1-4 (R3C10-R6C10). Only walker 1 starts on.'}, {key: 'R7C9', text: '<b>Channel</b> of the selected walker: hold it and tap the arrows.'}, {key: 'R8C9', text: '<b>Rate</b> (R8C9), step size (R8C10), pull to centre (R9C9), Y mode / CC (R9C10), octave (R10C9), gate (R10C10): hold + arrows. R7C10 = run on / off.'}],
      steps: ['Press <b>Play</b> (R1C4). Walker 1 starts moving.', 'Tap a pad: the selected walker jumps there.', 'Switch more walkers on with R4C10, R5C10, R6C10 and select them with R4C9 ...', '<b>Hold a setting key</b> (R7C9-R10C10) and tap the arrows: up / right = more, down / left = less. R9C10: up / down = velocity or CC mode, left / right = the CC number.'],
      demo: {steps: [
        {say: 'Press <b>Play</b> (R1C4). Walker 1 (green) starts to move on its own.', look: ['R1C4'], do: ['R1C4', ['wait', 2500]]},
        {say: 'Tap a pad: the walker jumps there, and walks on from that spot.', look: ['R8C4'], do: ['R8C4', ['wait', 2500]]},
        {say: 'Switch <b>walker 2</b> on (R4C10), select it (R4C9) and drop it somewhere else.', look: ['R4C10', 'R4C9'], do: ['R4C10', 'R4C9', 'R5C7', ['wait', 2500]]},
        {say: '<b>Hold Rate</b> (R8C9) and tap <b>up</b>: the walkers move faster.', look: ['R8C9', 'R1C10'], do: [['hold', 'R8C9', [['taps', 'R1C10', 2, 400]], 300, 300], ['wait', 2500]]},
        {say: 'Press Play to stop.', do: ['R1C4']}
      ], tail: 300}
    },
    L4P2: {
      tagline: 'Drop a pebble in the pond and the ripples play the notes they touch.',
      what: 'The pad grid is a <b>water surface</b>. Tap a pad to drop a <b>pebble</b>: it plays its own note and ripples spread out. Where ripples overlap, their heights add up; when the height at a cell passes a threshold, <b>that cell plays its note</b>. Wave height sets the velocity and a filter (CC 74): big waves are loud and bright, fading ripples are soft and muffled. No Play key needed. Every setting is a key you <b>hold</b> while you tap the arrows.',
      zones: [{r: [3, 10], c: [1, 8], label: 'The pond', tone: 0}, {r: [3, 8], c: [9, 10], label: 'Hold + arrows', color: '#f2a93b'}],
      marks: [{key: 'R3C9', text: '<b>Speed</b> (R3C9), decay (R3C10), threshold (R4C9), wavelength (R4C10): hold + arrows.'}, {key: 'R5C9', text: '<b>Octave</b> (R5C9) and filter CC (R5C10): hold + arrows.'}, {key: 'R6C9', text: '<b>Reach</b> (R6C9): how far a ripple carries. <b>Note length</b> (R6C10). <b>Max ripples</b> (R7C9).'}, {key: 'R7C10', text: '<b>Melodic / drum mode</b> (R7C10) and <b>clear ripples</b> (R8C9): tap.'}],
      steps: ['Tap a pad to drop a pebble.', 'Watch the rings spread and the notes they trigger.', '<b>Hold</b> a setting key and tap the arrows (up / right = more, down / left = less). The pads show the value.', 'Settings: speed, decay, threshold (lower = more notes), wavelength, octave, filter CC, reach, note length, max ripples (fewer = calmer).'],
      demo: {steps: [
        {say: 'Tap a pad: a <b>pebble</b> falls, plays its note and rings spread out.', look: ['R6C4'], do: ['R6C4', ['wait', 2200]]},
        {say: 'A second pebble: where rings cross, notes play.', look: ['R9C7'], do: ['R9C7', ['wait', 2500]]},
        {say: '<b>Hold Speed</b> (R3C9) and tap <b>up</b>: the ripples spread faster.', look: ['R3C9', 'R1C10'], do: [['hold', 'R3C9', [['taps', 'R1C10', 3, 400]], 300, 300], 'R5C3', ['wait', 2200]]},
        {say: '<b>Hold Reach</b> (R6C9) and tap <b>right</b>: the ripples carry further, so more cells play.', look: ['R6C9', 'R1C9'], do: [['hold', 'R6C9', [['taps', 'R1C9', 3, 400]], 300, 300], 'R7C6', ['wait', 2200]]},
        {say: '<b>Clear</b> (R8C9) calms the pond.', look: ['R8C9'], do: ['R8C9', ['wait', 600]]}
      ], tail: 300}
    },    L4P3: {
      tagline: 'Place stars; the sequence follows a path through them.',
      what: 'Tap pads to place <b>anchors</b> (stars). The anchors are joined by a <b>nearest-neighbour path</b> and a white playhead runs along it, one cell per 16th step. On an anchor it plays a held <b>chord</b>; on the cells between, short <b>notes</b>. The shape also sends CCs (filter, reverb send, maximum velocity). Needs <b>Play</b>.',
      zones: [{r: [3, 10], c: [1, 8], label: 'The sky: place up to 20 anchors', tone: 0}],
      marks: [{key: 'R10C10', text: '<b>Clear</b>: remove all anchors.'}, {key: 'R1C10', text: 'Arrows: <b>up / down</b> = tempo, <b>left / right</b> = how far anchors can connect (low = several small sequences).'}],
      steps: ['Tap pads to place anchors (tap an anchor again to remove it).', 'Press <b>Play</b> (R1C4): the playhead walks the path.', 'Use the arrows at the top right: up / down = BPM, left / right = maximum connection distance.', '<b>R10C10</b> clears everything.'],
      demo: {steps: [
        {say: 'Place anchors by tapping pads. Bright pads are anchors, dim pads are the path between them.', look: ['R4C2', 'R6C5', 'R8C3', 'R5C7'], do: ['R4C2', 'R6C5', 'R8C3', 'R5C7']},
        {say: 'Press <b>Play</b> (R1C4): the white playhead runs along the path and plays notes.', look: ['R1C4'], do: ['R1C4', ['wait', 5000]]},
        {say: 'Add another anchor: the path changes.', look: ['R9C7'], do: ['R9C7', ['wait', 4000]]},
        {say: 'Press Play to stop.', do: ['R1C4']}
      ], tail: 300}
    }
  },

  // ------------------------------------------------------------------ Reference
  after: [
    {
      id: 'midi', nav: 'MIDI messages', kicker: 'Reference', title: 'What the keyboard sends',
      tagline: 'Channels and CC numbers, for MIDI mapping in Ableton.',
      html: () => '<table class="t"><thead><tr><th>What</th><th>Channel</th><th>Message</th></tr></thead><tbody>' +
        '<tr><td>Board channel (R1C6)</td><td>1 by default</td><td>Notes, knobs and most pages</td></tr>' +
        '<tr><td>Drums (layer 1 page 1, step recorder)</td><td>10 by default</td><td>Notes</td></tr>' +
        '<tr><td>Clip launcher (layer 2 page 1)</td><td>16</td><td>Clips = notes 0-63, track buttons = notes 64-95 (select 64-71, arm 72-79, solo 80-87, mute 88-95)</td></tr>' +
        '<tr><td>Faders (layer 2 page 1 modes)</td><td>16</td><td>CC 40-47 volume, 48-55 pan, 56-63 send A, 72-79 send B</td></tr>' +
        '<tr><td>Macro faders (layer 2 page 3)</td><td>16</td><td>CC 102-109</td></tr>' +
        '<tr><td>XY pad (layer 2 page 2)</td><td>9-16 (effect 1-8)</td><td>CC 16 = X, 17 = Y, 18 = touch. CC 19 on the board channel selects the effect</td></tr>' +
        '<tr><td>Knobs (layer 2 page 4)</td><td>15</td><td>CC 20-35 (rows 7-10) and CC 36-39, 90-101 (rows 3-6)</td></tr>' +
                '<tr><td>Transport (control keys)</td><td>board channel</td><td>CC 85 play, 86 stop, 87 Ableton record (R4C9, or R9C9 on the Launcher), 88 tap tempo, 89 tempo</td></tr>' +
        '<tr><td>Sustain (R10C10)</td><td>board channel</td><td>CC 64</td></tr>' +
        '<tr><td>Volume (R2C6)</td><td>board channel</td><td>CC 7</td></tr>' +
        '<tr><td>Random walk Y (CC mode), Pond filter</td><td>page channel</td><td>CC 74 by default</td></tr>' +
        '<tr><td>Constellation shape</td><td>page channel</td><td>CC 74 filter, CC 91 reverb send</td></tr>' +
        '<tr><td>CC sequencer (layer 3 page 4)</td><td>its own channel</td><td>CC numbers set per lane</td></tr>' +
        '<tr><td>Microtonal (layer 1 page 7)</td><td>MPE: one channel per note</td><td>Notes plus pitch bend</td></tr>' +
        '</tbody></table><p style="color:var(--muted)">The MIDI channel shown for each device in Ableton starts at 1. A "board channel" key (R1C6) changes the default for the whole board.</p>'
    },
    {
      id: 'tools', nav: 'Planner, keyboard, flashing', kicker: 'Reference', title: 'The tools around the board',
      tagline: 'How the guide, the planner, the virtual keyboard and the flasher fit together.',
      html: '<table class="t"><tbody>' +
        '<tr><th>This guide</th><td>Explains every page. It is built from your layout file, so it always matches the firmware you built.</td></tr>' +
        '<tr><th>Virtual keyboard</th><td>The board in your browser. Click or touch the keys and watch the MIDI. <b>Test every change here before flashing.</b></td></tr>' +
        '<tr><th>Planner</th><td>Where you design the layout: click a key, choose what it does, copy the text at the bottom into your layout file.</td></tr>' +
        '<tr><th>Build C100.bat</th><td>Builds the firmware (.bin) on your PC in 1-3 minutes.</td></tr>' +
        '<tr><th>Flash C100.bat</th><td>Writes the .bin to the keyboard. Put the keyboard in flash mode first: unplug, <b>hold the top-left key</b>, plug in, let go after 3 seconds.</td></tr>' +
        '<tr><th>If it does not start</th><td>Use the tiny <b>RESET</b> button inside the keyboard (hold it while plugging in). Flash mode through the ROM always works, so the board cannot be broken by a bad firmware.</td></tr>' +
        '</tbody></table>'
    },
    {
      id: 'flash', nav: 'Flash the keyboard', kicker: 'Windows', title: 'Flash the firmware (DFU), step by step',
      tagline: 'Put the keyboard in flash (DFU) mode and write the .bin. Takes about 3 minutes. Nothing here can break the board: flash mode lives in the chip and always works.',
      html: '<p><b>Downloads</b> (the two .bin files sit next to this guide):</p><ul>' +
        '<li><a href="keychron_c100_8k_midi_v13.bin" download>keychron_c100_8k_midi_v13.bin</a>: this custom MIDI firmware (the one you build with Build C100.bat).</li>' +
        '<li><a href="c100_8k_STOCK.bin" download>c100_8k_STOCK.bin</a>: the original Keychron firmware, to go back to normal typing.</li>' +
        '<li><a href="https://github.com/FingerDrumLabo/keychron-c100-midi" target="_blank" rel="noopener">FingerDrum Labo: keychron-c100-midi</a>: the community firmware this project started from (also has a browser flasher and a Zadig / QMK Toolbox guide).</li>' +
        '<li><a href="https://dfu-util.sourceforge.net/releases/" target="_blank" rel="noopener">dfu-util</a>: the flashing program (already in the <b>flash tool</b> folder of the project).</li>' +
        '<li><a href="https://zadig.akeo.ie/" target="_blank" rel="noopener">Zadig</a>: installs the Windows USB driver (only if Windows does not see the keyboard in flash mode).</li></ul>' +
        '<h3>A. The easy way: Flash C100.bat</h3><ol class="steps">' +
        '<li>Double-click <b>Flash C100.bat</b> in the project folder.</li>' +
        '<li>Type the number of the firmware in the list (just Enter = the newest) and press Enter. You can also drag a .bin onto the .bat.</li>' +
        '<li><b>Flash mode:</b> unplug the keyboard, <b>hold the top-left key</b> (R1C1), plug the USB cable in, keep holding for 3 seconds, then let go.</li>' +
        '<li>The flasher finds the keyboard and writes the file. <b>Do not unplug</b> while it says "Flashing". When it says "Done" the keyboard restarts by itself.</li></ol>' +
        '<h3>B. By hand (the same thing in a terminal)</h3><ol class="steps">' +
        '<li>Open PowerShell in <code>flash tool\\dfu-util-0.11-binaries\\dfu-util-0.11-binaries\\win64</code>.</li>' +
        '<li>Put the keyboard in flash mode (as above). Check that it shows up: <code>.\\dfu-util.exe -l</code> must list <code>2e3c:df11</code>.</li>' +
        '<li>Flash: <code>.\\dfu-util.exe -d 2e3c:df11 -a 0 -s 0x08000000:leave -D "C:\\path\\to\\keychron_c100_8k_midi_v13.bin"</code>. Keep <code>-d 2e3c:df11</code> so no other device is touched.</li></ol>' +
        '<h3>C. First time on Windows: the USB driver</h3><ol class="steps">' +
        '<li>Put the keyboard in flash mode and open <b>Zadig</b>.</li>' +
        '<li>Menu <i>Options &rarr; List All Devices</i>. Pick <b>DFU in FS Mode</b>.</li>' +
        '<li>Check that the USB ID reads <b>2E3C : DF11</b>. If it does not, <b>stop</b>: never install the driver on another device.</li>' +
        '<li>Set the driver to <b>WinUSB</b> and click <i>Install Driver</i> (or <i>Replace Driver</i>). Once is enough; normal use is not affected.</li></ol>' +
        '<h3>D. Add the keyboard to your music program (FingerDrum Labo steps)</h3><ol class="steps">' +
        '<li>After flashing, the keyboard shows up as a MIDI device called <b>Keychron C100 8K</b>. It no longer types normally (flash the stock firmware to get typing back).</li>' +
        '<li><b>Ableton Live:</b> Preferences &rarr; Link / Tempo / MIDI. Under <i>MIDI Ports</i>, switch <b>Track</b> (and <b>Remote</b> if you want the Layer 2 controls to work on the Live interface) <b>On</b> for Keychron C100 8K.</li>' +
        '<li>On a MIDI track set <b>MIDI From</b> to Keychron C100 8K, channel <i>All Channels</i> (or the channel of the page you use), and press <b>Arm</b>.</li>' +
        '<li>Logic Pro and GarageBand find it by themselves: choose a software-instrument track.</li>' +
        '<li>The Keychron Launcher still works for lighting and key remapping.</li></ol>' +
        '<h3>If something goes wrong</h3><ul>' +
        '<li><b>"did not appear in flash mode"</b>: unplug, do the flash-mode step again, run the flasher again. It waits up to 2 minutes.</li>' +
        '<li><b>"Flashing did not finish"</b>: flash mode again and re-run. The board is safe.</li>' +
        '<li><b>Keyboard does not start or is not seen at all</b>: use the tiny <b>RESET</b> button inside the keyboard (hold it while plugging in), then flash the stock or the MIDI file.</li>' +
        '<li>Only ever flash the <b>C100 8K</b> with these files, never another Keychron board.</li></ul>'
    },
    {
      id: 'build', nav: 'Compile the firmware', kicker: 'Windows', title: 'Compile (build) the firmware on your PC',
      tagline: 'No GitHub needed. The layout file is turned into keymap.c, then compiled to a .bin in 1-3 minutes.',
      html: '<p class="tip warn"><b>Tested on Windows only.</b> One-time set-up: install <b>QMK MSYS</b> (msys.qmk.fm, default folder <code>C:\\QMK_MSYS</code>), <b>Git</b> and <b>Node.js</b>, then double-click <b>Set up building.bat</b> to download the Keychron QMK source (default <code>C:\\Users\\&lt;you&gt;\\qmk_keychron</code>). Your own folders can be listed in <code>build-locations.txt</code>. Full steps, including installing gcc for the tests: <b>BUILDING.md</b> in the project folder.</p>' +
        '<h3>The workflow</h3><ol class="steps">' +
        '<li><b>Design</b> in the <i>Planner</i> (C100_keymap_planner.html): click keys, choose their jobs, copy the export text at the bottom.</li>' +
        '<li><b>Save</b> the text into <code>files\\keymap-v13\\c100-layout-v13.txt</code> (keep a backup copy of the old one).</li>' +
        '<li><b>Test</b>: double-click <b>Build pages and guide.bat</b>. It rebuilds the planner, the virtual keyboard, this guide and the keycaps. Try the change in <i>C100_virtual_keyboard.html</i>.</li>' +
        '<li><b>Build</b>: double-click <b>Build C100.bat</b>. It builds the newest <code>keymap-vNN</code> folder in <code>files</code>: first it makes <code>keymap.c</code> from the layout file, then compiles with QMK.</li>' +
        '<li>On success it says <b>Done</b> and saves <code>keychron_c100_8k_midi_v13.bin</code> inside that folder. It refuses to save a file that lacks the <b>256 KB</b> setting (that mistake once made the board look dead).</li>' +
        '<li><b>Flash</b> it (section above).</li></ol>' +
        '<h3>Starting a new version</h3><ol class="steps">' +
        '<li>Copy the folder <code>files\\keymap-v13</code> to <code>keymap-v14</code> (the old one stays as a backup) and rename the layout file to <code>c100-layout-v14.txt</code>.</li>' +
        '<li>Run Build C100.bat: it always takes the highest number.</li></ol>' +
        '<h3>If the build fails</h3><ul>' +
        '<li>The window says <b>BUILD FAILED</b>: copy the lines above it and send them to Claude.</li>' +
        '<li>"QMK MSYS was not found" or "The Keychron QMK source was not found": install or download them (Set up building.bat), or type your folder when the build asks.</li>' +
        '<li><b>Alternative without a PC build:</b> the FingerDrum Labo project (link in the flash section) offers ready-made files and a browser flasher.</li></ul>'
    },
    {
      id: 'glossary', nav: 'Glossary', kicker: 'Reference', title: 'Words used in this guide',
      html: '<dl class="glos">' +
        '<dt>MIDI</dt><dd>The language music gear speaks. A key press becomes a message: which note, how hard, on which channel.</dd>' +
        '<dt>Channel</dt><dd>MIDI has 16 channels, like 16 radio stations. A synth listens to one of them.</dd>' +
        '<dt>CC (control change)</dt><dd>A message that carries a knob position from 0 to 127. Used for volume, filters, effects and so on.</dd>' +
        '<dt>Velocity</dt><dd>How hard a note is played, 1 to 127. These keys are on / off switches, so most pages send a fixed velocity.</dd>' +
        '<dt>Scale and root</dt><dd>The set of notes that sound good together (the scale) and its home note (the root).</dd>' +
        '<dt>Arpeggio</dt><dd>Playing the notes of a chord one after another instead of together.</dd>' +
        '<dt>Quantize</dt><dd>Snap notes to the beat or to the scale.</dd>' +
        '<dt>Latch</dt><dd>Notes keep sounding after you let go of the keys, until you press a key again.</dd>' +
        '<dt>Euclidean rhythm</dt><dd>A pattern with a chosen number of hits spread as evenly as possible over a number of steps.</dd>' +
        '<dt>MPE</dt><dd>A way to bend every note on its own. The microtonal page uses it to play notes between the notes.</dd>' +
        '<dt>Shift</dt><dd>The key at R1C3. Hold it and tap the four arrow keys to change layer and page. It has no other job.</dd><dt>Hold + arrows</dt><dd>Many settings are keys you hold while you tap the arrows: up / right = more, down / left = less.</dd>' +
        '<dt>Flash</dt><dd>Writing new firmware (the keyboard\'s program) to the keyboard.</dd>' +
        '</dl>'
    }
  ]
};
