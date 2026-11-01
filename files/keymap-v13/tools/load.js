// load.js: runs the shared core (core.js) and, if asked, the engine (engine.js) in one sandbox and returns everything
// they define. Usage: const C = require('./load')(withEngine); C.parseExport(...), C.createEngine(...), C.TYPES, ...
const fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function load(withEngine) {
  let code = fs.readFileSync(path.join(__dirname, 'core.js'), 'utf8');
  if (withEngine) code += '\n' + fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8');
  code = code.replace(/^(const|let) /gm, 'var ');          // top-level names become properties of the sandbox
  const ctx = {console};
  vm.createContext(ctx);
  vm.runInContext(code, ctx, {filename: 'core+engine'});
  return ctx;
};
