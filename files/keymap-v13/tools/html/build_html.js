// build_html.js: splices tools/core.js (and engine.js) into the planner and the virtual keyboard, adds the new faces and the how-to guide
const fs = require('fs'), path = require('path');
const T = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const layout = fs.readFileSync(path.join(__dirname, "..", "..", "c100-layout-v13.txt"), 'utf8');
let core = T('core.js').replace(/const DEFAULT_EXPORT = ".*";\n/, () => 'const DEFAULT_EXPORT = ' + JSON.stringify(layout) + ';\n');
if (!core.includes(JSON.stringify(layout).slice(0, 200))) throw new Error('DEFAULT_EXPORT not replaced');
const engine = T('engine.js');
function splice(html, startMark, endMark, body) {
  const a = html.indexOf(startMark), b = html.indexOf(endMark);
  if (a < 0 || b < 0) throw new Error('marker missing ' + startMark);
  const lineStart = html.lastIndexOf('\n', a) + 1, lineEnd = html.indexOf('\n', b) + 1;
  return html.slice(0, lineStart) + body.replace(/\n+$/, '\n') + html.slice(lineEnd);
}
function rep(html, a, b, all) { if (!html.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); return all ? html.split(a).join(b) : html.replace(a, () => b); }

const CRN = "['-8', '+8', '-1', '+1', 'BPM-', 'BPM+', 'LEN-', 'LEN+', 'CC-', 'CC+', 'CH-', 'CH+', 'PLAY', 'RESET', 'FILL', 'CLEAR', 'P1', 'P2', 'P3', 'M1', 'M2', 'M3', 'M4', 'REC']";
const PNN = "['SPD-', 'SPD+', 'DEC-', 'DEC+', 'THR-', 'THR+', 'WAV-', 'WAV+', 'MODE', 'CLEAR', 'OCT-', 'OCT+', 'CC-', 'CC+']";
const facesPlanner = `      case 'WK': return n < 4 ? ['W' + (n + 1), 'select'] : n < 8 ? ['W' + (n - 3), 'on / off'] : [n === 8 ? 'CH-' : 'CH+', 'walker ch'];
      case 'RL': return ['ROLL', 'shift+ARP'];
      case 'CLK': return ['CLK', 'auto / int'];
      case 'CE': return ['L' + (n + 1), 'effect'];
      case 'CY': return ['LRN', 'lane ' + (n + 1)];
      case 'GH': return ['SET' + n, 'hold'];
      case 'GT': return ['TAP', n ? 'clear' : 'toggle'];
      case 'EV': return [n ? '9-16' : '1-8', 'steps'];
      case 'CP': return ['S' + (n + 1), 'chord step'];
      case 'CQ': return [String((n & 7) + 1), 'lane ' + ((n >> 3) + 1)];
      case 'CR': return [${CRN}[n], 'cc seq'];
      case 'PD': return ['', ''];
      case 'PN': return [${PNN}[n], 'pond'];
      case 'CN': return ['', ''];
      case 'CX': return ['CLR', 'clear'];
`;
const facesVK = facesPlanner
  .replace("case 'CP': return ['S' + (n + 1), 'chord step'];", "case 'CP': { const v = st.prog.slot[n]; return ['S' + (n + 1), v === null ? 'empty' : ROMAN[v >> 2] + ' ' + HARM_TYPES[v & 3]]; }")
  .replace("case 'CQ': return [String((n & 7) + 1), 'lane ' + ((n >> 3) + 1)];", "case 'CQ': { const q = st.cq, Y = q.layers[q.layer]; return [String(Y.st[n >> 3][n & 7].v), 'L' + ((n >> 3) + 1) + ' CC' + Y.cc[n >> 3]]; }")
  .replace("case 'RL': return ['ROLL', 'shift+ARP'];", "case 'RL': return ['ROLL', st.roll.on ? 'on' : 'tap'];")
  .replace("case 'GH': return ['SET' + n, 'hold'];", "case 'GH': return [((st.page === E.rwPage ? ['RATE', 'STEP', 'PULL', 'Y/CC', 'OCT', 'GATE', 'CH'] : ['SPD', 'DECAY', 'THR', 'WAVE', 'OCT', 'CC', 'REACH', 'NOTE', 'MAX'])[n] || 'SET'), 'hold'];")
  .replace("case 'GT': return ['TAP', n ? 'clear' : 'toggle'];", "case 'GT': return [st.page === E.rwPage ? 'RUN' : (n ? 'CLEAR' : 'MODE'), 'tap'];")
  .replace("case 'CE': return ['L' + (n + 1), 'effect'];", "case 'CE': return [st.cq.lon[n] ? 'ON' : 'off', 'layer ' + (n + 1)];")
  .replace("case 'CY': return ['LRN', 'lane ' + (n + 1)];", "case 'CY': return [st.cq.learn === n + 1 ? 'LRN..' : 'LRN', 'lane ' + (n + 1)];")
  .replace("case 'CLK': return ['CLK', 'auto / int'];", "case 'CLK': return st.clkInt ? ['INT', 'clock'] : [st.ext ? 'EXT' : 'AUTO', 'clock'];");

const GUIDE = fs.readFileSync(path.join(__dirname, 'guide.html'), 'utf8');

// ---------------- planner ----------------
let p = fs.readFileSync(path.join(__dirname, 'src_planner.html'), 'utf8');
p = splice(p, '// ===================== core (shared', '// ===================== end of core =====================', core);
p = rep(p, "case 'PN': return [noteName(n), 'poly key'];", '');
p = rep(p, "      case 'custom': return ['*', 'custom'];\n    default: return ['', ''];", facesPlanner + "      case 'custom': return ['*', 'custom'];\n    default: return ['', ''];");
p = rep(p, "const KEY = 'c100-keymap-planner-v8';", "const KEY = 'c100-keymap-planner-v13';");
p = rep(p, 'id="lyPurpose" maxlength="240"', 'id="lyPurpose" maxlength="1500"');
p = rep(p, '<div class="purpose" id="purposeBox"></div>', '<div class="purpose" id="purposeBox"></div>\n' + GUIDE);
fs.writeFileSync(path.join(__dirname, "..", "..", "C100_keymap_planner.html"), p);

// ---------------- virtual keyboard ----------------
let v = fs.readFileSync(path.join(__dirname, 'src_vk.html'), 'utf8');
v = splice(v, '// ===================== core (shared', '// ===================== end of core =====================', core);
v = splice(v, '// ===================== engine: the firmware logic', '// ===================== end of engine =====================', engine);
v = v.replace(/      case 'PN': \{ const v = n \+ st\.transpose;[^\n]*\n      case 'PP': return \[POLY_PARAMS[^\n]*\n      case 'PT': return \['TRK'[^\n]*\n/, '');
if (v.includes('st.poly.sel')) throw new Error('old poly faces still there');
v = rep(v, "      case 'custom': return ['*', 'custom'];\n      default: return ['', ''];", facesVK + "      case 'custom': return ['*', 'custom'];\n      default: return ['', ''];");
fs.writeFileSync(path.join(__dirname, "..", "..", "C100_virtual_keyboard.html"), v);
console.log('built', fs.statSync(path.join(__dirname, "..", "..", "C100_keymap_planner.html")).size, fs.statSync(path.join(__dirname, "..", "..", "C100_virtual_keyboard.html")).size);
