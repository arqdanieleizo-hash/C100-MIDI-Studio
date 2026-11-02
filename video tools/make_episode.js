// Makes the frames and the narration for one draft video episode.   node make_episode.js 03
// 1. reads the scene table and the "Narration only" paragraphs of the episode script (video scripts folder)
// 2. makes a wav per paragraph with the Windows voice (System.Speech)
// 3. opens the guide in Edge (remote debugging): scenes that name a guide page play that page's demo; the others get a text slide
// 4. writes narration.wav, list.txt (frame list with durations) and make_video.bat (needs ffmpeg)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..'), GUIDE = path.join(ROOT, 'files', 'keymap-v13', 'C100_guide.html');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FPS = 8, GAP = 0.45, W = 1280, H = 720, VOICE = 'Microsoft David Desktop';
const GUIDE_IDS = /`(L\dP\d|nav|controls|arp|roll|fx|board)`/;
// scenes whose table row has no guide page, but where a guide page fits (scene number -> page)
const OVERRIDES = {
  '01': {1: 'L1P1', 3: 'board', 4: 'board', 5: 'board', 6: 'board', 8: 'L1P1'},
  '03': {1: 'nav', 10: 'controls', 11: 'controls'}, '04': {1: 'L1P1'}, '05': {1: 'L1P5'}, '06': {1: 'arp'},
  '07': {1: 'L2P1'}, '08': {1: 'L3P1', 12: 'L3P4'}, '10': {}, '11': {}, '12': {}, '02': {}
};
// real screens (the browser tools) for scenes that are not on the guide's board: scene number -> {file, hash, js: [[when 0-1, code], ...]}
const PADJS = 'window.pad=(i,ms=150)=>{const b=document.querySelector(\'#board .key[data-i="\'+i+\'"]\');if(!b)return;b.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerId:1}));setTimeout(()=>b.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerId:1})),ms)};' +
  'window.go=id=>{const e=document.getElementById(id);if(e)e.scrollIntoView({block:"start"})};window.clk=(sel,k=0)=>{const e=document.querySelectorAll(sel)[k];if(e)e.click()};';
const VK = 'C100_virtual_keyboard.html', PL = 'C100_keymap_planner.html', GD = 'C100_guide.html';
const WEB = {
  '10': {
    1: {file: VK, js: [[0.05, 'pad(62)'], [0.2, 'pad(64)'], [0.35, 'pad(66)'], [0.5, 'pad(73)'], [0.65, 'pad(75)'], [0.8, 'pad(62);pad(66)']]},
    2: {file: VK, js: [[0.0, 'pad(44)'], [0.3, 'pad(46)'], [0.6, 'window.scrollTo(0,400)'], [0.9, 'pad(55)']]},
    3: {file: VK, js: [[0.0, 'go("soundOn")'], [0.5, 'go("midiOut")']]},
    4: {file: GD, hash: '#start', js: [[0.0, 'document.documentElement.style.scrollBehavior="auto";go("start")'], [0.6, 'window.scrollBy(0,300)']]},
    5: {file: GD, hash: '#L1P1', js: [[0.0, 'document.documentElement.style.scrollBehavior="auto";go("L1P1")']]},
    6: {file: GD, hash: '#L1P1', js: [[0.0, 'document.documentElement.style.scrollBehavior="auto";go("L1P1");STAGES.L1P1.ensure()'], [0.1, 'STAGES.L1P1.seek(2000)'], [0.4, 'STAGES.L1P1.seek(6000)'], [0.7, 'STAGES.L1P1.seek(10000)']]},
    7: {file: GD, hash: '#L1P1', js: [[0.0, 'document.documentElement.style.scrollBehavior="auto";go("L1P1")'], [0.3, 'document.querySelectorAll("#L1P1 details.ref").forEach(d=>d.open=true);window.scrollBy(0,500)']]},
    8: {file: GD, hash: '#L1P1', js: [[0.0, 'document.documentElement.style.scrollBehavior="auto";go("L1P1");window.__t=[...document.querySelectorAll("button")].find(b=>/dark/i.test(b.textContent))'], [0.4, 'window.__t&&window.__t.click()'], [0.8, 'window.__t&&window.__t.click()']]}
  },
  '11': {
    1: {file: PL, js: []}, 2: {file: PL, js: [[0.2, 'clk("#layerTabs button",2)'], [0.5, 'clk("#layerTabs button",3)'], [0.8, 'clk("#layerTabs button",1)']]},
    3: {file: PL, js: [[0.1, 'clk("#board .key",42)'], [0.5, 'clk("#board .key",43)']]},
    4: {file: PL, js: [[0.1, 'clk("#board .key",42)'], [0.3, 'go("keyPanel")'], [0.7, 'go("edType")']]},
    5: {file: PL, js: [[0.1, 'clk("#board .key",42)'], [0.4, 'document.querySelectorAll("#board .key")[59].dispatchEvent(new MouseEvent("click",{bubbles:true,shiftKey:true}))'], [0.6, 'go("fillPanel")']]},
    6: {file: PL, js: [[0.3, 'clk("#shiftChk")'], [0.8, 'clk("#shiftChk")']]},
    7: {file: PL, js: [[0.1, 'clk("#board .key",42)'], [0.4, 'go("edNote")'], [0.8, 'go("layerPanel")']]},
    8: {file: PL, js: [[0.2, 'go("out")'], [0.7, 'window.scrollBy(0,200)']]}
  }
};
const num = process.argv[2] || '09', file = fs.readdirSync(path.join(ROOT, 'video scripts')).find(f => f.startsWith(num + ' '));
if (!file) throw new Error('no script for ' + num);
const OUT = path.join(__dirname, 'out', 'ep' + num); fs.mkdirSync(path.join(OUT, 'frames'), {recursive: true}); fs.mkdirSync(path.join(OUT, 'audio'), {recursive: true});
const md = fs.readFileSync(path.join(ROOT, 'video scripts', file), 'utf8');
const title = (/^# Episode \d+: (.*)$/m.exec(md) || [0, file])[1].trim();
const clean = s => s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();

// ---- scenes ----
const rows = md.split(/\r?\n/).filter(l => /^\| \d+ \|/.test(l)).map(l => { const c = l.split('|'); return {n: +c[1], screen: c[3].trim()}; });
const tail = md.slice(md.indexOf('## Narration only') + 17).trim();
// the scripts spell letter codes for a human voice ("A L is Alberti"); the computer voice just says the names
const paras = tail.split(/\r?\n\s*\r?\n/).map(s => s.trim()).filter(Boolean).map(p => p.replace(/\b(?:A L|B A|R O|B E|U S|C S|I N) (?:is )?/g, ''));
console.log(file + ': ' + rows.length + ' scene rows, ' + paras.length + ' narration paragraphs');
if (paras.length < rows.length || paras.length > rows.length + 1) throw new Error('rows and paragraphs do not match');
const scenes = paras.map((p, i) => {
  const r = rows[i], m = r && GUIDE_IDS.exec(r.screen), page = m ? m[1] : (OVERRIDES[num] || {})[r && r.n] || null;
  return {text: p, page, shot: r ? clean(r.screen) : 'Closing', closing: !r};
});
if (scenes.length > rows.length) scenes[scenes.length - 1].page = null;

// ---- voice ----
const ps = ['Add-Type -AssemblyName System.Speech', '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer', "$s.SelectVoice('" + VOICE + "')", '$s.Rate = 0'];
paras.forEach((p, i) => {
  const f = path.join(OUT, 'audio', 's' + i + '.txt'); fs.writeFileSync(f, p, 'utf8');
  ps.push("$s.SetOutputToWaveFile('" + path.join(OUT, 'audio', 's' + i + '.wav') + "'); $s.Speak([IO.File]::ReadAllText('" + f + "', [Text.Encoding]::UTF8)); $s.SetOutputToNull()");
});
fs.writeFileSync(path.join(OUT, 'audio', 'voice.ps1'), ps.join('\r\n'));
cp.execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(OUT, 'audio', 'voice.ps1')], {stdio: 'inherit'});
function readWav(f) {
  const b = fs.readFileSync(f); let o = 12, fmt = null, data = null;
  while (o + 8 <= b.length) { const id = b.toString('ascii', o, o + 4), n = b.readUInt32LE(o + 4); if (id === 'fmt ') fmt = {ch: b.readUInt16LE(o + 10), rate: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22)}; if (id === 'data') { data = b.subarray(o + 8, Math.min(b.length, o + 8 + n)); break; } o += 8 + n + (n & 1); }
  return {fmt, data};
}
const wavs = paras.map((_, i) => readWav(path.join(OUT, 'audio', 's' + i + '.wav')));
const fmt = wavs[0].fmt, bps = fmt.rate * fmt.ch * fmt.bits / 8;
const durs = wavs.map(w => w.data.length / bps + GAP);
const parts = []; wavs.forEach(w => { parts.push(w.data); parts.push(Buffer.alloc(Math.round(GAP * bps / 2) * 2)); });
const pcm = Buffer.concat(parts), hd = Buffer.alloc(44);
hd.write('RIFF', 0); hd.writeUInt32LE(36 + pcm.length, 4); hd.write('WAVEfmt ', 8); hd.writeUInt32LE(16, 16); hd.writeUInt16LE(1, 20); hd.writeUInt16LE(fmt.ch, 22); hd.writeUInt32LE(fmt.rate, 24); hd.writeUInt32LE(bps, 28); hd.writeUInt16LE(fmt.ch * fmt.bits / 8, 32); hd.writeUInt16LE(fmt.bits, 34); hd.write('data', 36); hd.writeUInt32LE(pcm.length, 40);
fs.writeFileSync(path.join(OUT, 'narration.wav'), Buffer.concat([hd, pcm]));
console.log('total narration ' + (pcm.length / bps).toFixed(1) + ' s');
// consecutive scenes on the same page share one run of the demo (split by narration length)
scenes.forEach((s, i) => { if (s.page) s.group = (i > 0 && scenes[i - 1].page === s.page) ? scenes[i - 1].group : i; });
scenes.forEach((s, i) => {
  if (!s.page) return;
  const g = scenes.map((x, k) => k).filter(k => scenes[k].page && scenes[k].group === s.group), tot = g.reduce((t, k) => t + durs[k], 0);
  s.a = g.filter(k => k < i).reduce((t, k) => t + durs[k], 0) / tot; s.b = s.a + durs[i] / tot;
});

const CSS = `html,body{margin:0;background:#0b0f15!important;overflow:hidden}
body>header,header.top,#toc,.pn,footer,.card .txt,.ctl,.legend,.layer-head,.kicker,.title,.tag,.mon .h{display:none!important}
.wrap,main,#main{display:block!important;margin:0!important;padding:0!important;max-width:none!important;width:auto!important}
.card{display:block!important;background:transparent!important;border:0!important;padding:0!important;margin:0!important;position:absolute;left:40px;top:28px;width:560px}
.stage{width:560px}.cap{display:none!important}.mon{margin-top:8px!important;font-size:13px!important}
#vt{position:fixed;left:640px;top:28px;right:40px;color:#e8eef6;font:700 30px/1.25 system-ui,Segoe UI,sans-serif}
#vt small{display:block;color:#7fb2ff;font:600 16px system-ui;letter-spacing:.08em;text-transform:uppercase;margin-bottom:10px}
#vs{position:fixed;left:640px;right:40px;top:200px;color:#dfe7f1;font:400 24px/1.45 system-ui,Segoe UI,sans-serif}
#vb{position:fixed;left:640px;right:40px;bottom:30px;color:#8896a8;font:16px system-ui}`;
const SLIDE = `html,body{margin:0;width:100%;height:100%;background:#0b0f15;color:#e8eef6;font-family:system-ui,Segoe UI,sans-serif;overflow:hidden}
#p{position:fixed;inset:0;display:grid;grid-template-rows:auto 1fr auto auto;padding:48px 70px}
#e{color:#7fb2ff;font:600 18px system-ui;letter-spacing:.08em;text-transform:uppercase}#t{font:700 38px/1.2 system-ui;margin-top:8px}
#c{align-self:center;border-left:6px solid #f2a93b;padding:6px 0 6px 28px;font:600 34px/1.35 system-ui;color:#f2d896;max-width:1000px}
#c small{display:block;color:#8896a8;font:500 16px system-ui;letter-spacing:.08em;text-transform:uppercase;margin-bottom:12px}
#s{font:400 24px/1.45 system-ui;color:#dfe7f1;max-width:1100px;margin-bottom:14px}#b{color:#8896a8;font:16px system-ui}`;

async function main() {
  const port = 9300 + (+num || 0), prof = path.join(OUT, 'edge-profile');
  const edge = cp.spawn(EDGE, ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + port, '--user-data-dir=' + prof, '--window-size=' + W + ',' + H, '--hide-scrollbars', 'about:blank'], {stdio: 'ignore'});
  let list; for (let i = 0; i < 60; i++) { try { list = await (await fetch('http://127.0.0.1:' + port + '/json')).json(); if (list.some(t => t.type === 'page')) break; } catch (e) {} await new Promise(r => setTimeout(r, 250)); }
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = new Map();
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({id: i, method, params})); });
  const ev = async expr => { const r = await send('Runtime.evaluate', {expression: expr, returnByValue: true, awaitPromise: true}); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception)); return r.result.result.value; };
  await send('Page.enable'); await send('Emulation.setDeviceMetricsOverride', {width: W, height: H, deviceScaleFactor: 1, mobile: false});
  let n = 0; const lst = [];
  const shot = async dur => { const name = String(n++).padStart(5, '0') + '.jpg'; const r = await send('Page.captureScreenshot', {format: 'jpeg', quality: 72}); fs.writeFileSync(path.join(OUT, 'frames', name), Buffer.from(r.result.data, 'base64')); lst.push("file 'frames/" + name + "'\nduration " + dur.toFixed(4)); };
  const epLabel = 'Episode ' + num;
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i], total = durs[i], web = ((WEB[num] || {})[i + 1]) && !sc.closing ? WEB[num][i + 1] : null;
    if (web) {
      const frames = Math.max(2, Math.round(total * FPS)), todo = web.js.slice();
      await send('Page.navigate', {url: 'file:///' + path.join(ROOT, 'files', 'keymap-v13', web.file).replace(/\\/g, '/') + (web.hash || '')}); await new Promise(r => setTimeout(r, 1500));
      await ev(PADJS);
      for (let f = 0; f < frames; f++) {
        while (todo.length && todo[0][0] <= f / frames) { try { await ev(todo.shift()[1]); } catch (e) { console.log('  js failed: ' + e.message.slice(0, 80)); } }
        await new Promise(r => setTimeout(r, 70)); await shot(total / frames);
      }
      console.log('scene ' + (i + 1) + '/' + scenes.length + ' web ' + web.file + ' ' + frames + ' frames'); continue;
    }
    if (!sc.page) {
      await send('Page.navigate', {url: 'about:blank'}); await new Promise(r => setTimeout(r, 300));
      await ev('(()=>{document.head.innerHTML="<style>"+' + JSON.stringify(SLIDE) + '+"</style>";document.body.innerHTML=' + JSON.stringify('<div id="p"><div><div id="e">' + epLabel + '</div><div id="t"></div></div><div id="c"><small>' + (sc.closing ? 'Closing' : 'Scene ' + (i + 1) + ' - footage to add') + '</small><span id="x"></span></div><div id="s"></div><div id="b">C100 MIDI Studio  -  draft video, computer voice</div></div>') + ';document.getElementById("t").textContent=' + JSON.stringify(title) + ';document.getElementById("x").textContent=' + JSON.stringify(sc.closing ? 'Thanks for watching' : sc.shot.slice(0, 280)) + ';document.getElementById("s").textContent=' + JSON.stringify(sc.text) + ';})()');
      await shot(total); console.log('scene ' + (i + 1) + '/' + scenes.length + ' slide'); continue;
    }
    const frames = Math.max(2, Math.round(total * FPS));
    await send('Page.navigate', {url: 'file:///' + GUIDE.replace(/\\/g, '/') + '#' + sc.page + '&t=0&only'}); await new Promise(r => setTimeout(r, 1200));
    await send('Page.reload'); await new Promise(r => setTimeout(r, 1800));
    await ev('(()=>{const st=document.createElement("style");st.textContent=' + JSON.stringify(CSS + '\n.card:not(#' + sc.page + '):not(#' + sc.page + '-card){display:none!important}') + ';document.head.appendChild(st);' +
      'for(const [i,t] of [["vt",""],["vs",""],["vb","C100 MIDI Studio  -  draft video, computer voice"]]){const d=document.createElement("div");d.id=i;d.textContent=t;document.body.appendChild(d);}' +
      'document.getElementById("vt").innerHTML=' + JSON.stringify('<small>' + epLabel + '</small>' + title) + ';document.getElementById("vs").textContent=' + JSON.stringify(sc.text) + ';})()');
    const q = JSON.stringify(sc.page);
    const dur = await ev('(STAGES[' + q + '].ensure(), STAGES[' + q + '].dur)');
    for (let f = 0; f < frames; f++) { await ev('STAGES[' + q + '].seek(' + (dur * (sc.a + (sc.b - sc.a) * f / frames)) + ')'); await shot(total / frames); }
    console.log('scene ' + (i + 1) + '/' + scenes.length + ' ' + sc.page + ' ' + frames + ' frames (' + sc.a.toFixed(2) + '-' + sc.b.toFixed(2) + ')');
  }
  ws.close(); edge.kill();
  const lastFile = /file '(.*)'/.exec(lst[lst.length - 1])[1];
  fs.writeFileSync(path.join(OUT, 'list.txt'), lst.join('\n') + "\nfile '" + lastFile + "'\n");
  fs.writeFileSync(path.join(OUT, 'make_video.bat'), '@echo off\r\ncd /d "%~dp0"\r\nset "FF=%~dp0..\\..\\ffmpeg\\bin\\ffmpeg.exe"\r\nif not exist "%FF%" ( echo ffmpeg.exe not found at %FF% & pause & exit /b )\r\n"%FF%" -y -f concat -safe 0 -i list.txt -i narration.wav -vf "fps=' + FPS + ',format=yuv420p" -c:v libx264 -crf 24 -c:a aac -shortest "ep' + num + '_draft.mp4"\r\necho.\r\necho Done: %~dp0ep' + num + '_draft.mp4\r\npause\r\n');
  console.log('episode ' + num + ' done: ' + n + ' frames');
}
main().catch(e => { console.error(e); process.exit(1); });
