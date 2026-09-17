// npm run check:opt -- DOES THE MODULE STILL COME UP WITH A FULL `localStorage`?
//
// `optStart(); kitStart();` run at module scope, ABOVE the `init()` IIFE, and `optLoad` calls
// EVERY saved row's setter. `check:boot` stubs `localStorage` EMPTY, so `optApply` applies
// nothing and that whole path -- the one his phone takes on every single boot -- has never once
// been executed by a gate. A throw there is `init()` never running and a boot card stuck for ever
// at the text it was born with, which is exactly the failure `check:boot` exists for, one line
// above where it can see.
//
// PASS 1 boots with an empty store and asks the live panel what it holds (`optDump`).
// PASS 2 writes that back and boots again -- which is his phone.
// PASS 3 does it with the rows SHUFFLED into junk types, because a store written by an older
// build can hold a value this build's setter does not expect, and "it works on a fresh device"
// is the shape of every bug this file has ever paid for twice.
import fs from 'fs'; import path from 'path'; import os from 'os';
import { pathToFileURL } from 'url';

const boot = fs.readFileSync('tools/boot.mjs', 'utf8');
const a = boot.indexOf('// STUBS:START'), b = boot.indexOf('// STUBS:END');
if (a < 0 || b < 0) { console.error('no STUBS markers in tools/boot.mjs'); process.exit(1); }

const TMP = path.join(os.tmpdir(), 'city-optboot');
fs.mkdirSync(TMP, { recursive: true });
const ROOT = pathToFileURL(process.cwd() + '/').href;
if (!fs.existsSync('node_modules/three/package.json')) {
  fs.mkdirSync('node_modules/three', { recursive: true });
  fs.writeFileSync('node_modules/three/package.json', JSON.stringify({
    name: 'three', version: '0.180.0-vendored', type: 'module', main: 'index.js', exports: { '.': './index.js' } }, null, 2));
  fs.writeFileSync('node_modules/three/index.js', "export * from '../../vendor/three.module.min.js';\n");
}
const shim = boot.match(/fs\.writeFileSync\(path\.join\(TMP, 'three-shim\.mjs'\), `([\s\S]*?)`\);/);
if (!shim) { console.error('could not lift the three shim'); process.exit(1); }
fs.writeFileSync(path.join(TMP, 'three-shim.mjs'),
  shim[1].replace(/\$\{ROOT\}/g, ROOT).replace(/\\`/g, '`').replace(/\\\$/g, '$'));

const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
let src = m[1].replace(/(from\s*)['"]three['"]/g, `$1'${pathToFileURL(path.join(TMP, 'three-shim.mjs')).href}'`);
src = src.replace(/(from\s*)['"]\.\/vendor\//g, `$1'${ROOT}vendor/`);
const f = path.join(TMP, 'mod.mjs');
fs.writeFileSync(f, src);

let bad = 0;
const quiet = console.warn, qlog = console.log;
async function pass(label, seed) {
  // the headless page, fresh each time
  // eslint-disable-next-line no-eval
  (0, eval)(boot.slice(a, b));
  for (const k in seed) globalThis.localStorage.setItem(k, seed[k]);
  let threw = null;
  const onErr = e => { threw = threw || e; };
  process.once('uncaughtException', onErr);
  console.warn = () => {}; console.log = () => {};
  // AND IT HAS TO EXIT HARD, `check:boot`'s own rule: once the module is up, `init()` waits on
  // fetches that never resolve and c188's watchdog re-arms a timer for ever, so a harness that
  // merely stops importing never stops running -- and a gate whose pass looks like a hang is a
  // gate nobody runs.
  try {
    await Promise.race([
      import(pathToFileURL(f).href + '?t=' + Date.now() + Math.random()),
      new Promise((_, rj) => setTimeout(() => rj(new Error('module did not evaluate in 20s')), 20000)),
    ]);
  } catch (e) { threw = e; }
  console.warn = quiet; console.log = qlog;
  process.removeListener('uncaughtException', onErr);
  const up = !!(globalThis.shred && globalThis.shred.player);
  if (threw || !up) { bad++; console.log('  ' + label.padEnd(34) + 'FAILED' + (threw ? ' -- ' + ((threw && threw.message) || threw) : ' -- module did not finish')); }
  else console.log('  ' + label.padEnd(34) + 'module up');
  return globalThis.shred;
}

console.log('\nboot with a populated localStorage -- the one path no gate has ever run\n');
const g1 = await pass('empty store (the old gate)', {});
if (!g1) process.exit(1);
// what his phone actually holds: every row the panel has, by label
const live = {};
for (const r of g1.OPT.rows || []) {}
// `optDump` PRINTS the panel, it does not return it -- so the text is captured rather than the
// return value. A harness that reads the wrong half of a function measures nothing and says
// "ok", which is this repo's oldest mistake and it happened here on the first run: it fell
// back to an EMPTY key and the two cases below tested nothing at all.
let txt = '';
const cap = console.log; console.log = (...x) => { txt += x.join(' ') + '\n'; };
try { g1.opt && g1.opt(); } catch (e) {}
console.log = cap;
let full = null;
try { full = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1)); } catch (e) {}
if (!full) { console.log('  *** could not read the live panel -- this harness is not testing what it claims'); process.exit(1); }
const store = JSON.stringify(full);
const rows = Object.keys(JSON.parse(store)).filter(k => k !== '__v');
console.log('  ' + rows.length + ' saved rows\n');

await pass('his store, every row', {
  'city.opt': store,
  'city.kit': JSON.stringify({ blaster: 1, jet: 1, board: 1 }),
  'city.char': 'moussa_toon',
  'city.marks': JSON.stringify([{ x: 12, z: -30, c: '#ffd76a', r: 4 }]),
});
// A STORE FROM AN OLDER BUILD, which is what he actually has: no version, and a row whose
// value is the wrong TYPE because the row changed shape under it.
const old = JSON.parse(store); delete old.__v;
for (const k of rows.slice(0, 6)) old[k] = (typeof old[k] === 'number') ? String(old[k]) : 0;
await pass('an OLD store, wrong types', {
  'city.opt': JSON.stringify(old),
  'city.kit': 'blaster',                       // the pre-c113 value: a bare slot NAME
  'city.char': 'a_character_that_is_gone',
  'city.marks': 'not json at all',
});

console.log('');
if (bad) { console.log('FAILED: ' + bad + ' of 3 -- a store on his phone can stop the module coming up.'); process.exit(1); }
console.log('opt boot ok -- the module comes up with a full store, an old one and a junk one');
process.exit(0);
