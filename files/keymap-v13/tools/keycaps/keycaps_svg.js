// keycaps_svg.js: draws one keycap legend (up to 4 sections) as SVG. Used by the designer page and by build_keycaps.js (the printable sheet).
// A key = {div: 1-4, sec: [{g: big text, t: small text, c: 'l1' | 'l2' | 'l3' | 'sh' | 'gl'}], gs: size factor, ts: size factor, corner: 'BOOT', home: true}
// Sections: div 1 = whole cap; 2 = top / bottom; 3 = top, bottom-left, bottom-right; 4 = 2 x 2 (top-left, top-right, bottom-left, bottom-right).
// Section colours: l1 / l2 / l3 = layer 1 / 2 / 3, sh = the spare 4th section, gl = the same on every layer.
const KC_COLORS = {
  dark:  {l1: '#ffb347', l2: '#6aa9ff', l3: '#4fe08c', sh: '#ff7ab8', gl: '#f1f3f5', cap: '#252b33', edge: '#0c0f13', sep: '#515a68', page: '#ffffff'},
  light: {l1: '#b45f00', l2: '#1d5bd0', l3: '#0b8043', sh: '#c2185b', gl: '#1a222c', cap: '#f4f2ed', edge: '#bdb7ab', sep: '#c9c3b7', page: '#ffffff'}
};
const KC_NAMES = {l1: 'Layer 1', l2: 'Layer 2', l3: 'Layer 3', sh: 'Spare (4th)', gl: 'All layers'};
const kcEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function kcSize(text, w, h) { const n = Math.max(1, [...String(text)].length); return Math.min(h * 0.64, (w * 0.94) / (n * 0.58)); }
function kcText(text, cx, cy, w, h, fill, font, scale, weight) {
  if (!text) return '';
  return '<text x="' + cx.toFixed(2) + '" y="' + cy.toFixed(2) + '" font-size="' + (kcSize(text, w, h) * (scale || 1)).toFixed(2) + '" fill="' + fill + '" font-family="' + kcEsc(font) +
    '" font-weight="' + (weight || 700) + '" text-anchor="middle" dominant-baseline="central">' + kcEsc(text) + '</text>';
}
function kcBoxes(div) {
  if (div === 1) return [[0, 0, 12, 12]];
  if (div === 2) return [[0, 0, 12, 6], [0, 6, 12, 6]];
  if (div === 3) return [[0, 0, 12, 6], [0, 6, 6, 6], [6, 6, 6, 6]];
  return [[0, 0, 6, 6], [6, 0, 6, 6], [0, 6, 6, 6], [6, 6, 6, 6]];
}
function kcLegend(k, o) {
  const pal = KC_COLORS[o.theme], boxes = kcBoxes(k.div || 1), out = [], gs = k.gs || 1;
  boxes.forEach((b, n) => {
    const s = (k.sec || [])[n] || {}; if (!s.g && !s.t) return;
    const fill = pal[s.c] || pal.gl, tall = (k.div || 1) === 1 && s.t;
    const cx = b[0] + b[2] / 2, cy = b[1] + b[3] / 2 - (tall ? 1.6 : 0);
    out.push(kcText(s.g || '', cx, cy, b[2] - 0.9, b[3] - (tall ? 4.2 : 0.9), fill, o.font, gs));
    if (tall) out.push(kcText(s.t, cx, b[1] + b[3] - 1.9, b[2] - 1, 2.6, fill, o.font, k.ts || 1, 600));
  });
  const d = k.div || 1, ln = (x1, y1, x2, y2) => '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + pal.sep + '" stroke-width="0.18"/>';
  if (d >= 2) out.push(ln(0.8, 6, 11.2, 6));
  if (d === 3) out.push(ln(6, 6.4, 6, 11.2));
  if (d === 4) out.push(ln(6, 0.8, 6, 11.2));
  return out.join('');
}
// one key as an SVG (12 x 12 mm legend area). o: {theme: 'dark' | 'light', font, mode: 'cap' | 'sticker'}
function keySvg(k, o) {
  const pal = KC_COLORS[o.theme];
  const body = o.mode === 'sticker'
    ? '<rect x="0.15" y="0.15" width="11.7" height="11.7" rx="1.6" fill="none" stroke="' + pal.sep + '" stroke-width="0.2" stroke-dasharray="0.7 0.5"/>'
    : '<rect x="0.1" y="0.1" width="11.8" height="11.8" rx="1.8" fill="' + pal.cap + '" stroke="' + pal.edge + '" stroke-width="0.25"/>';
  const corner = k.corner ? kcText(k.corner, 2.6, 1.3, 4, 1.4, pal.gl, o.font, 1, 600) : '';
  const home = k.home ? '<rect x="4.6" y="10.7" width="2.8" height="0.45" rx="0.22" fill="' + pal.gl + '" opacity="0.6"/>' : '';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" class="ksv" role="img" aria-label="' + kcEsc((k.label || '')) + '">' + body + kcLegend(k, o) + corner + home + '</svg>';
}
// the whole board on one sheet, in millimetres, 1 key = 19.05 mm pitch with the 12 mm legend area centred. o: {theme, font, mode, title}
function sheetSvg(keys, o) {
  const P = 19.05, M = 11, W = 10 * P + 2 * M, H = 10 * P + 2 * M + 22, pal = KC_COLORS[o.theme], parts = [];
  parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W.toFixed(1) + 'mm" height="' + H.toFixed(1) + 'mm" viewBox="0 0 ' + W.toFixed(1) + ' ' + H.toFixed(1) + '">');
  parts.push('<rect width="100%" height="100%" fill="' + pal.page + '"/>');
  parts.push('<text x="' + M + '" y="7" font-size="4" font-family="' + kcEsc(o.font) + '" font-weight="700" fill="#18222e">' + kcEsc(o.title || 'C100 keycaps') + '</text>');
  for (let i = 0; i < 100; i++) {
    const r = Math.floor(i / 10), c = i % 10, x = M + c * P, y = M + r * P;
    parts.push('<rect x="' + (x + 0.5).toFixed(2) + '" y="' + (y + 0.5).toFixed(2) + '" width="' + (P - 1) + '" height="' + (P - 1) + '" rx="2.2" fill="none" stroke="#c8ced6" stroke-width="0.2"/>');
    const inner = keySvg(keys[i], o).replace(/^<svg[^>]*>/, '<svg x="' + (x + (P - 12) / 2).toFixed(2) + '" y="' + (y + (P - 12) / 2).toFixed(2) + '" width="12" height="12" viewBox="0 0 12 12">');
    parts.push(inner);
  }
  const ly = M + 10 * P + 6;
  ['l1', 'l2', 'l3', 'sh', 'gl'].forEach((c, n) => {
    const lx = M + n * 36;
    parts.push('<rect x="' + lx + '" y="' + ly + '" width="5" height="5" rx="1" fill="' + pal[c] + '" stroke="#888" stroke-width="0.15"/><text x="' + (lx + 7) + '" y="' + (ly + 3.6) + '" font-size="3" font-family="' + kcEsc(o.font) + '" fill="#18222e">' + kcEsc(KC_NAMES[c]) + '</text>');
  });
  parts.push('<text x="' + M + '" y="' + (ly + 11) + '" font-size="2.6" font-family="' + kcEsc(o.font) + '" fill="#586577">Each key is split in up to 4 sections: top-left = layer 1, top-right = layer 2, bottom-left = layer 3, bottom-right = spare (empty). Layer 4 (generative) is not printed.</text>');
  parts.push('</svg>');
  return parts.join('');
}
