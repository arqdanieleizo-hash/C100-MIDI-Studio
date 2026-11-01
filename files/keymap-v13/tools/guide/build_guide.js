// build_guide.js: builds C100_guide.html (one self-contained page) from the layout file, core.js, engine.js and guide_content.js
// Usage (from the tools folder):  node guide/build_guide.js [layout.txt] [out.html]     add --check to run every demo headless and print what it does
const fs = require('fs'), path = require('path'), vm = require('vm');
const here = __dirname, tools = path.join(here, '..');
const args = process.argv.slice(2), check = args.includes('--check'), pos = args.filter(a => !a.startsWith('--'));
const layoutPath = pos[0] || path.join(tools, '..', 'c100-layout-v13.txt');
const outPath = pos[1] || path.join(tools, '..', 'C100_guide.html');
const R = f => fs.readFileSync(path.isAbsolute(f) ? f : path.join(here, f), 'utf8');
const layout = fs.readFileSync(layoutPath, 'utf8');
const core = fs.readFileSync(path.join(tools, 'core.js'), 'utf8').replace(/const DEFAULT_EXPORT = ".*";\n/, 'const DEFAULT_EXPORT = "";\n');
const engine = fs.readFileSync(path.join(tools, 'engine.js'), 'utf8');
const content = R('guide_content.js'), player = R('guide_player.js'), shell = R('guide_shell.html');

// key faces: taken from the virtual keyboard page, so the labels are always the same
const vkPath = path.join(tools, '..', 'C100_virtual_keyboard.html');          // the BUILT page (it has the v12 / v13 key faces added by build_html.js)
if (!fs.existsSync(vkPath)) throw new Error('build the virtual keyboard first: node html/build_html.js');
const vk = fs.readFileSync(vkPath, 'utf8');
const a = vk.indexOf('  function face(c) {'), b = vk.indexOf('  const kindClass'), e = vk.indexOf("|| '';", b) + 6;
if (a < 0 || b < 0 || e < 6) throw new Error('could not find face() / kindClass in C100_virtual_keyboard.html');
const face = 'function makeFace(E) {\n' + vk.slice(a, e) + '\n  return {face, kindClass};\n}\n';

if (check) {
  const split = player.indexOf('// ---- board ----');
  const code = core + '\n' + engine + '\nconst LAYOUT = ' + JSON.stringify(layout) + ';\n' + face + '\n' + content + '\n' + player.slice(0, split) +
    '\n;({compile, newRun, describeMsg, kidx, CONTENT, LAYER_PAGES, NUM_LAYERS, pageIndex, parseExport, LAYOUT});';
  const ctx = {console, performance: {now: () => 0}}; vm.createContext(ctx);
  const X = vm.runInContext(code.replace(/^(const|let) /gm, 'var '), ctx, {filename: 'guide'});
  const demos = [];
  X.CONTENT.intro.forEach(s => { if (!s.hero) demos.push([s.id, s.where || [0, 0], s.demo, s]); });
  for (let l = 0; l < X.NUM_LAYERS; l++) for (let s = 0; s < X.LAYER_PAGES[l]; s++) { const id = 'L' + (l + 1) + 'P' + (s + 1); const c = X.CONTENT.pages[id]; if (!c) { console.log('MISSING TEXT for ' + id); continue; } demos.push([id, [l, s], c.demo, c]); }
  const dump = (args.find(a => a.startsWith('--dump=')) || '').slice(7);
  if (dump) {
    const d = demos.find(x => x[0] === dump); if (!d) { console.log('no demo ' + dump); process.exit(1); }
    const run = X.newRun(d[2], d[1]);
    for (let t = 0; t <= run.dur; t += 20) run.advance(t);
    const caps = run.comp.caps;
    run.msgs.forEach(x => { const rel = x.t - run.t0; let n = 0; caps.forEach(c => { if (c.t <= rel) n = c.n; }); console.log(String(rel).padStart(6) + ' ms  step ' + n + '  ' + X.describeMsg(x.m)); });
    process.exit(0);
  }
  let bad = 0;
  const keyOk = (k, where) => { try { X.kidx(k); } catch (er) { console.log('  BAD KEY in ' + where + ': ' + k); bad++; } };
  demos.forEach(([id, where, demo, c]) => {
    (c.zones || []).forEach(z => { if (z.r[0] < 1 || z.r[1] > 10 || z.c[0] < 1 || z.c[1] > 10) { console.log('  BAD ZONE in ' + id); bad++; } });
    (c.marks || []).forEach(m => keyOk(m.key, id + ' mark'));
    if (!demo || !demo.steps) { console.log(id.padEnd(8) + ' (no demo)'); return; }
    try {
      const run = X.newRun(demo, where), E = run.E, texts = new Set(); let maxLit = 0, downSeen = 0;
      const page = E.status().page;
      if (page !== X.pageIndex(where[0], where[1])) { console.log('  WRONG PAGE in ' + id + ': at ' + page); bad++; }
      for (let t = 0; t <= run.dur; t += 20) {
        run.advance(t);
        if (E.text) texts.add(E.text.s.trim());
        if (t % 100 === 0) { let lit = 0; for (let i = 0; i < 100; i++) { const l = E.led(i); if (l && l[0] + l[1] + l[2] > 0) lit++; if (E.down[i]) downSeen++; } maxLit = Math.max(maxLit, lit); }
      }
      const types = {}; run.msgs.forEach(x => types[x.m.type] = (types[x.m.type] || 0) + 1);
      console.log(id.padEnd(8) + (run.dur / 1000).toFixed(1).padStart(5) + 's  steps ' + String(demo.steps.length).padStart(2) + '  msgs ' + String(run.msgs.length).padStart(4) + ' ' + JSON.stringify(types) + '  litMax ' + maxLit + (texts.size ? '  text: ' + [...texts].join(',') : '') + (demo.expect === 'quiet' ? '' : (run.msgs.length === 0 && !texts.size ? '   <-- NOTHING HAPPENS' : '')));
      (demo.steps || []).forEach(st => (st.look || []).forEach(k => keyOk(k, id + ' look')));
    } catch (er) { console.log(id.padEnd(8) + ' ERROR ' + er.message); bad++; }
  });
  console.log(bad ? bad + ' problem(s)' : 'all demos ran');
  process.exit(bad ? 1 : 0);
}

let out = shell.replace('/*@@CORE@@*/', () => core).replace('/*@@ENGINE@@*/', () => engine).replace('/*@@LAYOUT@@*/', () => JSON.stringify(layout))
  .replace('/*@@FACE@@*/', () => face).replace('/*@@CONTENT@@*/', () => content).replace('/*@@PLAYER@@*/', () => player);
fs.writeFileSync(outPath, out);
console.log('wrote', outPath, Math.round(out.length / 1024) + ' KB');
