// npm run jam -- WHY IS THE TRAFFIC STOPPING? Answered by running the REAL city, headless.
//
// `npm run dens` killed "too many cars" (14% occupancy). `npm run cross` killed the crossing
// rule and then the two shapes it had been missing. Three hypotheses measured, three wrong --
// so the next move is not a fourth guess, it is to build the actual map and watch it.
//
// This is `check:boot` with a REAL fetch. That gate deliberately lets every asset fail, because
// it is about the MODULE coming up; give the same headless page a `fetch` that reads from disk
// and a file:// base to resolve against, and `init()` runs to completion: the real city.glb,
// the real road graph, the real 266 cars, the real `stepTraffic`. Nothing here restates a rule.
//
// It drives `stepTraffic` at a fixed dt, so the numbers do not depend on how fast this machine
// is, and reports what the game's own chip reports -- how many cars are stuck and WHICH RULE is
// holding each one -- plus the worst knots, by coordinate, so the answer is walkable to.
import fs from 'fs'; import os from 'os'; import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

const SECS = +(process.argv[2] || 90);
const DT = 1 / 60;

// the vendored-three shim, same reason and same wording as boot.mjs
if (!fs.existsSync('node_modules/three/package.json')) {
  fs.mkdirSync('node_modules/three', { recursive: true });
  fs.writeFileSync('node_modules/three/package.json', JSON.stringify({
    name: 'three', version: '0.180.0-vendored', type: 'module', main: 'index.js', exports: { '.': './index.js' } }, null, 2));
  fs.writeFileSync('node_modules/three/index.js', "export * from '../../vendor/three.module.min.js';\n");
}

const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!m) { console.error('no module script'); process.exit(1); }

const TMP = path.join(os.tmpdir(), 'city-jam');
fs.mkdirSync(TMP, { recursive: true });
const ROOT = pathToFileURL(process.cwd() + '/').href;

// ---- the three shim (GL classes faked; everything else is the real vendored build) ----
const boot = fs.readFileSync('tools/boot.mjs', 'utf8');
const shim = boot.match(/fs\.writeFileSync\(path\.join\(TMP, 'three-shim\.mjs'\), `([\s\S]*?)`\);/);
if (!shim) { console.error('could not lift the three shim out of tools/boot.mjs'); process.exit(1); }
fs.writeFileSync(path.join(TMP, 'three-shim.mjs'),
  shim[1].replace(/\$\{ROOT\}/g, ROOT).replace(/\\`/g, '`').replace(/\\\$/g, '$'));

// ---- the headless page, LIFTED from boot.mjs between its markers rather than copied ----
const a = boot.indexOf('// STUBS:START'), b = boot.indexOf('// STUBS:END');
if (a < 0 || b < 0) { console.error('no STUBS markers in tools/boot.mjs'); process.exit(1); }
// eslint-disable-next-line no-eval
(0, eval)(boot.slice(a, b));

// ---- ...and the two things this harness needs that that one deliberately does not ----
// A REAL BASE, so every `A('models/city.glb')` resolves to a file on disk instead of throwing
// the ERR_INVALID_URL that check:boot filters out.
globalThis.location = { href: ROOT, search: '', hash: '', reload() {} };
// AN `<img>` THAT NEVER FIRES `load` IS WHY NOTHING BUILT. GLTFLoader resolves the GLB's
// embedded textures before it resolves the parse, through `ImageLoader` -> an img element ->
// a blob URL. boot.mjs's img is inert, which is right for a gate that exits after 400 ms and
// is a SILENT HANG for a harness that waits: no throw, no rejection, no progress, for ever.
// Nothing here needs the pixels -- the road graph is geometry and node names -- so the image
// just has to say it arrived.
const img = () => {
  const el = { width: 4, height: 4, complete: true, _l: [], style: {},
    addEventListener(k, f) { if (k === 'load') this._l.push(f); }, removeEventListener() {},
    setAttribute() {}, removeAttribute() {}, getAttribute: () => null };
  Object.defineProperty(el, 'src', { set(v) { setTimeout(() => {
    if (el.onload) el.onload({ target: el });
    for (const f of el._l) f({ target: el });
  }, 0); }, get() { return ''; }, configurable: true });
  return el;
};
globalThis.Image = class { constructor() { return img(); } };
globalThis.createImageBitmap = async () => ({ width: 4, height: 4, close() {} });
const D = globalThis.document;
const _ns = D.createElementNS.bind(D);
D.createElementNS = (n, t) => (String(t).toLowerCase() === 'img' ? img() : _ns(n, t));
const _ce = D.createElement.bind(D);
D.createElement = t => (String(t).toLowerCase() === 'img' ? img() : _ce(t));
globalThis.URL.createObjectURL = () => 'blob:jam'; globalThis.URL.revokeObjectURL = () => {};
globalThis.Blob = globalThis.Blob || class { constructor() {} };
// AND `Request`, BECAUSE THREE BUILDS ITS OWN. `FileLoader` does `fetch(new Request(url, ...))`
// with the raw relative string, so node's real `Request` throws ERR_INVALID_URL before my
// `fetch` is ever reached -- which reads exactly like the asset never arriving.
globalThis.Request = class { constructor(url, init) { this.url = String(url && url.url || url); Object.assign(this, init || {}); } };
globalThis.Headers = class { constructor() {} get() { return null; } has() { return false; } };
// DRACO NEEDS A WORKER AND NODE HAS NONE. `models/city.glb` is draco-compressed and
// `DRACOLoader` decodes on a Worker built from a Blob URL, which does not exist here -- so the
// city is decompressed ONCE, offline, into a temp copy and served in its place. Same geometry,
// same node names, same road graph: only the compression differs, and nothing in the traffic
// rules can tell. Cheaper and far more honest than faking a Worker.
const PLAIN = path.join(TMP, 'city-plain.glb');
{
  const { NodeIO } = await import('@gltf-transform/core');
  const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
  const draco = await import('draco3dgltf');
  const src = 'models/city.glb';
  if (!fs.existsSync(PLAIN) || fs.statSync(PLAIN).mtimeMs < fs.statSync(src).mtimeMs) {
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
      'draco3d.decoder': await draco.default.createDecoderModule() });
    const doc = await io.read(src);
    doc.getRoot().listExtensionsUsed().forEach(e => { if (/draco/i.test(e.extensionName)) e.dispose(); });
    await io.write(PLAIN, doc);
    console.log('decompressed ' + src + ' -> ' + (fs.statSync(PLAIN).size / 1e6).toFixed(1) + ' MB (draco needs a Worker)');
  }
}
globalThis.fetch = async (req) => {
  const raw = String(req && req.url || req).split('?')[0];
  let f = fileURLToPath(new URL(raw, ROOT));
  if (/models[/\\]city\.glb$/.test(f)) f = PLAIN;
  const buf = await fs.promises.readFile(f);
  return {
    ok: true, status: 200, headers: new globalThis.Headers(),
    arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    json: async () => JSON.parse(buf.toString('utf8')),
    text: async () => buf.toString('utf8'),
  };
};

let src = m[1].replace(/(from\s*)['"]three['"]/g, `$1'${pathToFileURL(path.join(TMP, 'three-shim.mjs')).href}'`);
src = src.replace(/(from\s*)['"]\.\/vendor\//g, `$1'${ROOT}vendor/`);
const f = path.join(TMP, 'jam.mjs');
fs.writeFileSync(f, src);

// AN UNHANDLED REJECTION INSIDE `init()` LEAVES IT HANGING WITH NOTHING ON STDOUT, which from
// out here is indistinguishable from a slow load. boot.mjs learnt this; so does this.
process.on('unhandledRejection', e => console.error('[reject]', (e && e.stack) || e));
process.on('uncaughtException', e => console.error('[throw]', (e && e.stack) || e));
const quiet = console.warn; console.warn = (...a) => { if (process.env.JAM_LOUD) quiet(...a); };
await import(pathToFileURL(f).href + '?t=' + Date.now());

// WAIT FOR THE CARS, NOT FOR `ready`. `ready` is set at the END of `init()`, after Colin, the
// melee clips and the cloud models -- none of which any traffic rule has ever heard of. The
// road graph and the cars are built long before that, and waiting on the whole boot means one
// missing character asset reports as "the city never loaded" when the thing under test is up.
const G = globalThis.shred;
const t0 = Date.now();
let spin = 0;
while (!G.cars.length && Date.now() - t0 < 180000) {
  await new Promise(r => setTimeout(r, 100));
  if (++spin % 50 === 0) console.log(`  ...${((Date.now() - t0) / 1000).toFixed(0)}s  tiles ${G.tiles.length}  solids ${G.solids.length}  cars ${G.cars.length}`);
}
console.warn = quiet;
if (!G.cars.length) { console.error('no cars -- the road graph never built. JAM_LOUD=1 to see why.'); process.exit(1); }
if (!G.ready) console.log('(the rest of the boot is still going -- irrelevant to traffic)');

const cars = G.cars, JAM = G.JAM, TRAF = G.TRAF;
console.log(`city up: ${cars.length} cars, ${G.tiles.length} road tiles, ${G.solids.length} solid boxes`);
// A HOOK, SO THERE IS ONE COPY OF THIS SCAFFOLDING AND NOT TWO (c146). Booting the real city
// headless is the expensive part and it is worth reusing for any question that needs a real car,
// a real collider or a real material -- `JAM_PROBE=tools/probe-x.mjs npm run jam` hands the
// module's own globals to another file instead of running the traffic sim. Duplicating this
// preamble into a second tool is the mistake `normals.mjs` made, two directories over.
if (process.env.JAM_PROBE) {
  globalThis.__shred = G;
  await import(pathToFileURL(path.resolve(process.env.JAM_PROBE)).href + '?t=' + Date.now());
  process.exit(0);
}
console.log(`stepping ${SECS}s of traffic at ${(1 / DT).toFixed(0)} Hz (JAM.at ${JAM.at}s, TRAF.stuck ${TRAF.stuck}s)\n`);
console.log('    t   stuck   follow  cross  blocked  MUTUAL   worst knot');

const rows = [];
for (let i = 0, t = 0; t < SECS; i++, t += DT) {
  G.stepTraffic(DT);
  JAM.t = 9; G.jamScan(DT);                       // force a scan on the frames we report
  if (i % Math.round(5 / DT) === 0 && i) {
    rows.push({ t, n: JAM.n, f: JAM.f, x: JAM.x2, b: JAM.b, m: JAM.m, kx: JAM.x, kz: JAM.z });
    const r = rows[rows.length - 1];
    console.log(`${t.toFixed(0).padStart(5)}${String(r.n).padStart(8)}${String(r.f).padStart(9)}` +
      `${String(r.x).padStart(7)}${String(r.b).padStart(9)}${String(r.m).padStart(8)}   ` +
      (r.n ? `${r.kx.toFixed(0)},${r.kz.toFixed(0)}` : '-'));
  }
}

// ---- WHO IS AT THE HEAD? A follow lock is not a fault in the queue, it is a fault in the car
// at the front of it, so the reasons have to be walked up the `led` chain to mean anything.
{
  const head = {}, len = [];
  for (const c of cars) {
    if (c.stop < JAM.at || c.why !== 'follow') continue;
    let h = c, n = 0, seen = new Set();
    while (h.why === 'follow' && h.led && !seen.has(h)) { seen.add(h); h = h.led; n++; if (n > 200) break; }
    len.push(n);
    const k = h.stop < JAM.at ? h.why + ' (MOVING)' : h.why;
    head[k] = (head[k] || 0) + 1;
  }
  len.sort((a, b) => a - b);
  console.log('\nwalking every follow-stuck car up its queue to the car at the FRONT:');
  for (const k of Object.keys(head).sort((a, b) => head[b] - head[a]))
    console.log(`   ${String(head[k]).padStart(4)} queued behind a head that is: ${k}`);
  if (len.length) console.log(`   queue depth: median ${len[len.length >> 1]}, worst ${len[len.length - 1]}`);
}
// ---- the verdict, in the terms the fixes differ by ----
const last = rows.slice(-4), avg = k => last.reduce((s, r) => s + r[k], 0) / Math.max(1, last.length);
const n = avg('n');
console.log(`\nsettled (last 20s): ${n.toFixed(0)} of ${cars.length} cars stuck >${JAM.at}s` +
  `  -- follow ${avg('f').toFixed(0)}, cross ${avg('x').toFixed(0)}, blocked ${avg('b').toFixed(0)}, MUTUAL ${avg('m').toFixed(0)}`);
if (!n) console.log('nothing is jamming in this run -- raise the seconds, or it needs the player in it.');
else {
  const f = avg('f'), x = avg('x'), b = avg('b'), mu = avg('m');
  if (mu > n * .04) console.log('MUTUAL is the one that cannot be anything else: two cars each queued behind\n' +
    'the OTHER. The follow path has no failsafe at all -- `TRAF.stuck` lives only inside\n' +
    '`crossGive` -- so nothing in the file releases that, ever.');
  else if (f > x + b) console.log('FOLLOW dominates: they are queued behind each other, so the fault is at the HEAD\n' +
    'of the queues, not in the queue. Look at what the leaders are doing.');
  else if (b > x) console.log('BLOCKED dominates: the do-not-enter-the-box test is refusing junctions. That is\n' +
    'c64\'s shape -- check `qd > ta` and that the failsafe still outranks it.');
  else console.log('CROSS dominates: the priority rule is holding them. `npm run cross` is where that lives.');
}
process.exit(0);
