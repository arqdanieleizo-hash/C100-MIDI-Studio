// cut_pages.js: ONE-TIME script used for v13. Moves the code of the removed layer 4 pages out of keymap_template.c and engine.js
// into tools/archive/*.txt and leaves a marker comment  /*@ARCH feature #n@*/  where each block was.
// restore_pages.js puts a feature back. Line numbers below are those of the v12 files (the script cuts from the bottom up).
const fs = require('fs'), path = require('path');
const tools = path.join(__dirname, '..');
// [feature, first line, last line]  (1-based, inclusive, v12 numbering)
const CUTS = {
  'keymap_template.c': [
    ['mac', 48, 49], ['ec', 267, 270], ['mac', 365, 373], ['mac', 418, 423],
    ['lfo', 746, 747], ['tm', 750, 750], ['bb', 751, 751], ['lfo', 752, 752], ['tm', 754, 754], ['bb', 755, 755], ['lfo', 756, 758],
    ['tm', 786, 796], ['bb', 797, 805], ['tm', 809, 809], ['bb', 810, 810], ['lfo', 812, 837],
    ['tm', 851, 861], ['bb', 862, 872], ['lfo', 873, 884],
    ['lfo', 1044, 1044], ['mac', 1256, 1346], ['ec', 1479, 1514],
    ['ec', 1729, 1729], ['mac', 1750, 1750], ['ec', 1792, 1792], ['ec', 1911, 1911],
    ['tm', 1979, 1980], ['bb', 1981, 1981], ['lfo', 1982, 1982], ['mac', 2007, 2007], ['mac', 2068, 2068], ['mac', 2103, 2103],
    ['mac', 2117, 2117], ['ec', 2118, 2118], ['ec', 2147, 2147], ['lfo', 2156, 2156],
    ['tm', 2386, 2398], ['bb', 2399, 2408], ['lfo', 2409, 2425], ['mac', 2458, 2473]
  ],
  'engine.js': [
    ['tm', 38, 38], ['lfo', 39, 41], ['tm', 52, 52], ['bb', 53, 53], ['lfo', 54, 54], ['mac', 56, 56], ['ec', 72, 72], ['mac', 135, 135],
    ['ec', 380, 410], ['tm', 611, 621], ['bb', 622, 630], ['tm', 634, 634], ['bb', 635, 635], ['lfo', 637, 663],
    ['tm', 679, 690], ['bb', 691, 702], ['lfo', 703, 714], ['lfo', 832, 832],
    ['mac', 1020, 1101], ['mac', 1111, 1111], ['ec', 1224, 1224], ['ec', 1387, 1387],
    ['tm', 1396, 1397], ['bb', 1398, 1398], ['lfo', 1399, 1399], ['mac', 1421, 1421], ['mac', 1484, 1484], ['ec', 1531, 1531], ['mac', 1535, 1535],
    ['tm', 1707, 1716], ['bb', 1717, 1720], ['lfo', 1721, 1735], ['mac', 1758, 1770]
  ]
};
let n = 0;
for (const [file, cuts] of Object.entries(CUTS)) {
  const full = path.join(tools, file), lines = fs.readFileSync(full, 'utf8').split('\n');
  const parts = [];
  cuts.slice().sort((a, b) => b[1] - a[1]).forEach(([feat, a, b]) => {
    const id = ++n, block = lines.slice(a - 1, b);
    const indent = /^\s*/.exec(block[0])[0];
    parts.push({id, feat, a, b, text: block.join('\n')});
    lines.splice(a - 1, b - a + 1, indent + '/*@ARCH ' + feat + ' #' + id + '@*/');
  });
  fs.writeFileSync(full, lines.join('\n'));
  parts.sort((x, y) => x.id - y.id).reverse();
  fs.writeFileSync(path.join(__dirname, 'removed_' + file + '.txt'),
    parts.map(p => '/*@@BLOCK ' + p.feat + ' #' + p.id + ' (v12 lines ' + p.a + '-' + p.b + ')@@*/\n' + p.text + '\n/*@@END@@*/\n').join(''));
  console.log(file, ':', cuts.length, 'blocks moved');
}
