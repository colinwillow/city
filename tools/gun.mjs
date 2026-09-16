// npm run gun -- WHERE DOES THE WEAPON ACTUALLY END UP, AND HOW BIG IS IT?
//
// "There's no blaster visible when you take it out" is three different bugs that look
// identical from a phone: it is somewhere else, it is the wrong size, or it was never made
// visible. Reasoning about a scene graph three transforms deep is how c84 and c86 each lost a
// build to hand-nudging, so this loads the REAL GLBs with the vendored loader, runs the
// SHIPPED `measureSkin` text between the SKIN markers, performs the shipped mount, and reads
// the blaster's world-space bounding box off the result.
//
// The number that matters is its LENGTH IN METRES next to a 1.75 m man. A gun that measures
// in centimetres is invisible on a phone and indistinguishable from one that never loaded.
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

const { NodeIO } = await import('@gltf-transform/core');
const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
const draco3d = (await import('draco3dgltf')).default;
const gio = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
const TMP = 'tools/.gun-tmp/';
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

const COLIN_HEIGHT = 1.75;
const CHARS = { skins: {}, h: {} };
const colin = { clips: [] };
const TITLE = { hand: 'mixamorig_RightHand' };
const fn = new Function('THREE', 'CHARS', 'COLIN_HEIGHT', 'colin', 'TITLE',
  grab('SKIN:START', 'SKIN:END') + '\n; return { measureSkin, stripPoses };')(THREE, CHARS, COLIN_HEIGHT, colin, TITLE);

const box = new THREE.Box3(), size = new THREE.Vector3(), ctr = new THREE.Vector3();
function span(o) { o.updateWorldMatrix(true, true); box.setFromObject(o); box.getSize(size); box.getCenter(ctr);
  return { len: Math.max(size.x, size.y, size.z), size: size.clone(), ctr: ctr.clone() }; }

const charFile = process.argv[2] || 'models/colin.glb';
const gunFiles = process.argv.slice(3);
const guns = gunFiles.length ? gunFiles : ['models/blaster.glb'];

const cg = await load(await prep(charFile));
fn.stripPoses(cg.scene, 'colin');
const skin = fn.measureSkin(cg.scene, 'colin');
// THE MODEL GOES UNDER A ROOT, exactly as `buildSkin` does -- the scale and the lift both
// live on `skin.model`, and a measurement taken before it is parented is a measurement of a
// scene the game never renders.
const root = new THREE.Group(); root.add(skin.model); root.updateMatrixWorld(true);
const him = span(skin.model);
console.log(charFile + '   drawn ' + him.size.y.toFixed(2) + ' m tall');

let mount = null, hand = null;
skin.model.traverse(o => {
  if (o.name === 'weapon_root') mount = mount || o;
  if (o.name === 'mixamorig_RightHand') hand = o;
});
if (!mount) { console.log('   NO weapon_root on this rig -- the game falls back to fitOne on the hand'); }
else {
  mount.updateWorldMatrix(true, false);
  const ms = mount.getWorldScale(new THREE.Vector3());
  console.log('   weapon_root world scale ' + ms.x.toFixed(5) + '  (a child of it is drawn at this multiple of its own units)');
}

for (const gf of guns) {
  const gg = await load(await prep(gf));
  const model = gg.scene.clone(true);
  const raw = span(model);
  console.log('\n' + gf);
  console.log('   as it sits in its own file: ' + raw.len.toFixed(3) + ' m along its longest axis');
  if (!mount) continue;
  // THE NEUTRALISING MATRIX IS COMPUTED HERE, ON THE FRESH CLONE, BEFORE ANYTHING IS PARENTED
  // -- which is where `attachGear` computes it too, at load time. Taking it later reads a
  // STALE `matrixWorld` off the group (three does not clear one when you unparent), so the
  // wearer's own scale leaks into the inverse and the answer comes back 78x too big. The first
  // version of this tool did exactly that and reported 73 metres.
  let own = null; model.traverse(o => { if (o.name === 'weapon_root') own = own || o; });
  let fix = null;
  if (own) { model.updateMatrixWorld(true); fix = own.matrixWorld.clone().invert(); }
  const verdict = v => (v > .15 && v < 1.4 ? 'PLAUSIBLE -- reads as a weapon' : 'WRONG -- this will look like nothing at all');
  // THE TWO MOUNTS THIS FILE HAS FOR THE SAME IDEA. They are not the same operation and only
  // one of them was ever right, which is exactly why this tool exists.
  //  (a) WHOLE SCENE onto the joint -- what `attachGear` did through c96 for the blaster. It
  //      carries the weapon file's OWN Armature, and that Armature has the hundredth scale
  //      every one of these exports has, so the wearer's hundredth scale is applied twice.
  //  (b) NEUTRALISED above its own `weapon_root` -- c98's fix, and the same thing `buildCops`
  //      has always done by taking the MESH off the joint rather than the scene.
  const g = new THREE.Group(); g.add(model);
  model.position.set(0, 0, 0); model.rotation.set(0, 0, 0); model.scale.setScalar(1);
  mount.add(g); root.updateMatrixWorld(true);
  const w = span(g);
  console.log('   (a) whole scene onto the joint      ' + (w.len * 100).toFixed(1).padStart(8) + ' cm   1/' + Math.round(him.size.y / Math.max(1e-9, w.len)) + ' of him');
  console.log('       ' + verdict(w.len));
  if (fix) {
    model.position.set(0, 0, 0); model.rotation.set(0, 0, 0); model.scale.setScalar(1);
    model.applyMatrix4(fix);
    root.updateMatrixWorld(true);
    const w2 = span(g);
    console.log('   (b) neutralised above weapon_root  ' + (w2.len * 100).toFixed(1).padStart(8) + ' cm   ' + (w2.len / him.size.y * 100).toFixed(0) + '% of his height');
    console.log('       ' + verdict(w2.len));
    console.log('       centre ' + [w2.ctr.x, w2.ctr.y, w2.ctr.z].map(v => v.toFixed(3)).join(', '));
    g.parent.remove(g);
  } else console.log("   (no weapon_root inside the weapon file)");
}
