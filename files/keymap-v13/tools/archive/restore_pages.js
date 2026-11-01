// restore_pages.js: puts the archived code of a page back where its marker /*@ARCH feature #n@*/ is.
// Usage (from the tools folder):  node archive/restore_pages.js tm        (tm = Turing machine, bb = bouncing balls, lfo = LFO test, ec = MIDI echo, mac = dynamic macros)
// It restores keymap_template.c and engine.js only. See RESTORE.txt for the other 4 steps (key types, layout, tests, clean-up lines).
const fs = require('fs'), path = require('path');
const feat = process.argv[2];
if (!['tm', 'bb', 'lfo', 'ec', 'mac'].includes(feat)) { console.log('Usage: node archive/restore_pages.js tm|bb|lfo|ec|mac'); process.exit(1); }
for (const file of ['keymap_template.c', 'engine.js']) {
  const arch = fs.readFileSync(path.join(__dirname, 'removed_' + file + '.txt'), 'utf8');
  const src = path.join(__dirname, '..', file); let code = fs.readFileSync(src, 'utf8'), n = 0;
  const re = /\/\*@@BLOCK (\w+) #(\d+) \(v12 lines [\d-]+\)@@\*\/\n([\s\S]*?)\n\/\*@@END@@\*\/\n/g; let m;
  while ((m = re.exec(arch))) {
    if (m[1] !== feat) continue;
    const anchor = new RegExp('^[ \\t]*/\\*@ARCH ' + feat + ' #' + m[2] + '@\\*/', 'm');
    if (!anchor.test(code)) { console.log('  marker #' + m[2] + ' not found in ' + file); continue; }
    code = code.replace(anchor, () => m[3]); n++;
  }
  fs.writeFileSync(src, code);
  console.log(file + ': ' + n + ' blocks restored');
}
console.log('Now do the other steps in tools/archive/RESTORE.txt');
