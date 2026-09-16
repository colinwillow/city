// npm run aim -- DOES THE BARREL ACTUALLY POINT WHERE THE RETICLE IS?
//
// *"The aiming on the skateboard is not really aiming down the sight -- the tip of his gun is
// kind of to the right."* That is a question about an ANGLE, and an angle is measurable. Every
// previous version of this argument was settled by reasoning and the reasoning was wrong, so
// this poses the real rig, runs the SHIPPED `aimTwist` text between the TWIST markers, and
// reads the world bearing of the barrel off `weapon_root` -> `weapon_tip`.
//
// The barrel is a JOINT PAIR in the file, which is the whole reason this can be measured at
// all: `npm run joints` says colin's tip sits at (-0.562, 0, 0.099) off `weapon_root`, so the
// direction those two nodes make IS where the gun points, with nothing assumed.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
if (!existsSync('node_modules/three/package.json')) {
  mkdirSync('node_modules/three', { recursive: true });
  writeFileSync('node_modules/three/package.json', JSON.stringify({
    name: 'three', version: '0.180.0-vendored', type: 'module', main: 'index.js', exports: { '.': './index.js' } }, null, 2));
  writeFileSync('node_modules/three/index.js', "export * from '../../vendor/three.module.min.js';\n");
}
const THREE = await import('three');
const { GLTFLoader } = await import('../vendor/GLTFLoader.js');

const src = readFileSync('index.html', 'utf8');
const grab = (a, b) => { const m = src.match(new RegExp('/\\* ' + a + ' \\*/([\\s\\S]*?)/\\* ' + b + ' \\*/')); if (!m) { console.error('marker ' + a + ' not found'); process.exit(1); } return m[1]; };
const shippedSkin = grab('SKIN:START', 'SKIN:END');
const shippedTwist = grab('TWIST:START', 'TWIST:END');
// the real numbers, lifted rather than retyped
// LIFT A CONST OUT OF index.html BY MATCHING ITS BRACES. Retyping a config block into a
// harness is the copy that drifts, and this file has paid for that five times; evaluating the
// real declaration cannot drift by construction.
function lift(name) {
  const i = src.indexOf('const ' + name + ' = {');
  if (i < 0) { console.error('could not lift ' + name); process.exit(1); }
  let j = src.indexOf('{', i), d = 0, k = j;
  for (; k < src.length; k++) {
    const c = src[k];
    if (c === '{') d++; else if (c === '}') { d--; if (!d) break; }
  }
  return (0, eval)('(' + src.slice(j, k + 1) + ')');
}
const WEAP = lift('WEAP'), MELEE = lift('MELEE'), TRIM = lift('TRIM');
const TRIM_IN = {}, FPS = +(src.match(/const FPS = ([\d.]+)/) || [0, 30])[1];
const shippedDerive = grab('DERIVE:START', 'DERIVE:END');
console.log('WEAP.twist (from index.html): max ' + WEAP.twist.max + ' rad (' + (WEAP.twist.max * 180 / Math.PI).toFixed(0) + ' deg), ease ' + WEAP.twist.ease + '\n');

const { NodeIO } = await import('@gltf-transform/core');
const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
const draco3d = (await import('draco3dgltf')).default;
const gio = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
const TMP = 'tools/.aim-tmp/';
mkdirSync(TMP, { recursive: true });
async function prep(f) {
  const out = TMP + f.split('/').pop();
  const doc = await gio.read(f);
  for (const t of doc.getRoot().listTextures()) t.dispose();
  for (const e of doc.getRoot().listExtensionsUsed()) if (/draco/i.test(e.extensionName)) e.dispose();
  await gio.write(out, doc);
  return out;
}
const loader = new GLTFLoader();
// **`readFileSync(f).buffer` IS THE SHARED POOL FOR A SMALL FILE, NOT THE FILE.** Node allocates
// anything under ~4 KB out of an 8 KB pool, so `.buffer.slice(0)` starts at the beginning of the
// POOL and hands the loader whatever was sitting in it -- which parses as garbage. Every
// character GLB is megabytes and gets its own ArrayBuffer, so this was invisible until a 3 KB
// garment went through it. Slice by the buffer's OWN view.
const load = f => { const b = readFileSync(f); return new Promise((res, rej) =>
  loader.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '', res, rej)); };

const HTML = src;
const ROSTER = [...HTML.matchAll(/\{\s*key:\s*'([a-z0-9_]+)'\s*,\s*name:\s*'[^']*'\s*,\s*url:\s*'([^']+)'/gi)].map(m => ({ key: m[1], url: m[2] }));
const FILES = { melee: 'models/chars/melee.glb' };
for (const r of ROSTER) FILES[r.key] = r.url;
const gl = {};
for (const k in FILES) gl[k] = await load(await prep(FILES[k]));

const CHARS = { skins: {}, h: {}, cur: 'colin' };
const COLIN_HEIGHT = 1.75;
const colin = { clips: gl.colin.animations, model: null };
{
  const have = new Set(); gl.colin.scene.traverse(o => { if (o.name) have.add(o.name); });
  for (const c of gl.melee.animations) {
    if (colin.clips.some(x => x.name === c.name)) continue;
    c.tracks = c.tracks.filter(t => { const d = t.name.indexOf('.'); return have.has(d > 0 ? t.name.slice(0, d) : t.name); });
    colin.clips.push(c);
  }
}
// THE DERIVED FAMILIES ARE PART OF THE POOL THE GAME PLAYS, and `ownClips` calls them through a
// `typeof` guard -- so a harness without them silently measures a character in a pose the game
// never draws. The first run of this tool did exactly that and reported a 103-degree bias on
// Moussa that was really just "there is no aim pose in here". SIXTH time. Lifted now.
const derFn = new Function('THREE', 'WEAP', 'MELEE', 'TRIM', 'TRIM_IN', 'FPS',
  shippedDerive + '\n; return { trimClips, deriveClips };')(THREE, WEAP, MELEE, TRIM, TRIM_IN, FPS);
globalThis.trimClips = derFn.trimClips; globalThis.deriveClips = derFn.deriveClips;
derFn.trimClips(colin.clips); derFn.deriveClips(colin.clips);
const skinFn = new Function('THREE', 'CHARS', 'COLIN_HEIGHT', 'colin', 'TITLE', 'trimClips', 'deriveClips',
  shippedSkin + '\n; return { measureSkin, skinClips, sitSkin, stripPoses, ownClips };')(THREE, CHARS, COLIN_HEIGHT, colin, { hand: 'mixamorig_RightHand' }, derFn.trimClips, derFn.deriveClips);

// the shipped twist, with the surface it actually touches provided rather than reimplemented
const player = { board: 1, hit: '', aim: 1, turning: 1, aimH: 0, faceH: 0, twist: 0 };
const KIT = { out: { blaster: 1 } };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const wrapAngle = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
// THE REAL `damp`, because the correction loop is now a RATE and a harness that snapped it to
// its target would be measuring a controller the game does not have -- it would converge in one
// frame here and oscillate on the phone, or vice versa, and either way prove nothing.
const damp = (a, b, hl, dt) => b + (a - b) * Math.pow(2, -dt / Math.max(1e-6, hl));
const twistFn = new Function('THREE', 'CHARS', 'colin', 'player', 'KIT', 'WEAP', 'clamp', 'wrapAngle', 'damp',
  shippedTwist + '\n; return { aimTwist, aimUntwist, gearBone };')(THREE, CHARS, colin, player, KIT, WEAP, clamp, wrapAngle, damp);

const root = new THREE.Group();
const DEG = 180 / Math.PI;
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();

function run(key, gltf) {
  skinFn.stripPoses(gltf.scene, key);
  const skin = skinFn.measureSkin(gltf.scene, key);
  skinFn.ownClips(skin, gltf);
  CHARS.skins[key] = skin; CHARS.cur = key;
  colin.model = skin.model;
  root.add(skin.model);
  const mixer = new THREE.AnimationMixer(skin.model);
  const clips = skinFn.skinClips(skin, colin.clips);
  const byName = {};
  for (const c of clips) byName[c.name] = c;

  // THE POSE HE IS ACTUALLY IN WHILE RIDING AND AIMING: c115's upper-body override, the sighted
  // hold's spine-up tracks over a board clip's legs. A harness that measured a T-pose, or the
  // plain rifle idle, would be measuring a pose the game never draws.
  const upName = 'rifle_aim__up', legName = 'skate_idol_standing__legs';
  const play = n => { const c = byName[n]; if (!c) return null; const a = mixer.clipAction(c); a.reset(); a.setEffectiveWeight(1); a.play(); return a; };
  const up = play(upName), legs = play(legName) || play('skate_idol_standing');
  if (!up) console.log('   (no ' + upName + ' -- falling back to whatever the pool has)');
  mixer.update(0.016);

  let wr = null, wt = null, hips = null;
  skin.model.traverse(o => { if (o.name === 'weapon_root') wr = o; if (o.name === 'weapon_tip') wt = o; if (o.name === 'mixamorig_Hips') hips = o; });
  if (!wr || !wt) { console.log('   NO weapon_root/weapon_tip on ' + key + ' -- cannot measure a barrel'); root.remove(skin.model); return; }

  console.log('\n' + key.toUpperCase() + '   (board heading is 0, so every number below is degrees off the deck)');
  console.log('   asked   barrel   err    twist used   gun is  m right of centre');
  const rows = [];
  for (const deg of [0, 10, 20, 30, 45, 60, 75, 90]) {
    player.faceH = 0; player.aimH = deg / DEG; player.twist = 0; player.aimErr = 0; player.aimBar = undefined;
    // RUN THE LOOP, DO NOT POKE IT ONCE. The correction is a rate with a half-life, so one
    // frame measures the first step of a convergence rather than where it lands. Two seconds
    // at 60 Hz is what the thumb would hold it for.
    for (let f = 0; f < 120; f++) {
      twistFn.aimUntwist();
      mixer.setTime(0); mixer.update(0.016);
      twistFn.aimTwist(0.016);
      root.updateMatrixWorld(true);
    }
    wr.getWorldPosition(_a); wt.getWorldPosition(_b);
    _c.copy(_b).sub(_a);
    const barrel = Math.atan2(_c.x, _c.z) * DEG;
    // how far the grip sits to his RIGHT of the body line -- a parallel barrel offset sideways
    // still misses at short range, and it is the other candidate for "kind of to the right"
    hips.getWorldPosition(_c);
    const off = (_a.x - _c.x) * Math.cos(0) - (_a.z - _c.z) * Math.sin(0);
    rows.push({ deg, barrel, err: wrapAngle((barrel - deg) / DEG) * DEG, tw: player.twist * DEG, off });
    const r = rows[rows.length - 1];
    console.log('   ' + String(deg).padStart(5) + String(r.barrel.toFixed(1)).padStart(9) +
      String(r.err.toFixed(1)).padStart(7) + String(r.tw.toFixed(1)).padStart(13) + String(r.off.toFixed(3)).padStart(20));
  }
  const at0 = rows[0].err;
  console.log('   ---');
  console.log('   REST BIAS (asked 0): the barrel sits ' + at0.toFixed(1) + ' deg off the deck with no twist at all.');
  if (Math.abs(at0) > 4) console.log('   *** that is the "kind of to the right": it is the POSE, not the twist. ***');
  const slope = (rows[4].barrel - rows[0].barrel) / 45;
  console.log('   TRACKING: the barrel moves ' + slope.toFixed(2) + ' deg per degree asked (1.00 is perfect).');
  root.remove(skin.model);
}
for (const r of ROSTER) if (gl[r.key]) run(r.key, gl[r.key]);
