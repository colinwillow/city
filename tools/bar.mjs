// npm run bar -- WHAT DID HE ACTUALLY PUT IN THE FILE?
//
// *"I put the two weapon joints where the bar would go, so weapon_root and weapon_tip -- you
// would align those to the bar and then rotate the whole character around the centre of those."*
// That is a geometric claim about an export, and every number this mechanic needs is in it: the
// bar's axis, the swing radius, whether the pose is static enough to spin, and -- the one that
// bites -- whether moving those joints has broken the BLASTER, which has been parented to
// `weapon_root` since c96.
import fs from 'fs'; import path from 'path'; import os from 'os';
import { pathToFileURL } from 'url';
if (!fs.existsSync('node_modules/three/package.json')) {
  fs.mkdirSync('node_modules/three', { recursive: true });
  fs.writeFileSync('node_modules/three/package.json', JSON.stringify({
    name: 'three', version: '0.180.0-vendored', type: 'module', main: 'index.js', exports: { '.': './index.js' } }, null, 2));
  fs.writeFileSync('node_modules/three/index.js', "export * from '../../vendor/three.module.min.js';\n");
}
const THREE = await import('three');
const { GLTFLoader } = await import('../vendor/GLTFLoader.js');

// DRACO NEEDS A WORKER AND NODE HAS NONE, so the file is decompressed offline into a temp copy
// and the textures thrown away with it -- `wear.mjs`'s own trick, for the same reason. Nothing
// here cares how the triangles were packed; the bones and the clips are untouched by either.
const { NodeIO } = await import('@gltf-transform/core');
const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
const draco3d = (await import('draco3dgltf')).default;
const gio = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
const file = process.argv[2] || 'models/colin.glb';
const TMP = 'tools/.bar-tmp/'; fs.mkdirSync(TMP, { recursive: true });
const plain = TMP + file.split('/').pop();
{
  const doc = await gio.read(file);
  for (const t of doc.getRoot().listTextures()) t.dispose();
  for (const e of doc.getRoot().listExtensionsUsed()) if (/draco/i.test(e.extensionName)) e.dispose();
  await gio.write(plain, doc);
}
const buf = fs.readFileSync(plain);
const gltf = await new Promise((res, rej) =>
  new GLTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', res, rej));

const clips = gltf.animations;
console.log(file + ': ' + clips.length + ' clips\n');
const bar = clips.filter(c => /bar/i.test(c.name));
console.log('CLIPS WITH "BAR" IN THE NAME: ' + (bar.length ? bar.map(c => c.name + ' (' + c.duration.toFixed(2) + 's)').join(', ') : 'none'));
console.log('\nall clip names:');
console.log('  ' + clips.map(c => c.name).join('\n  '));

const scene = gltf.scene; scene.updateMatrixWorld(true);
const byName = {};
scene.traverse(o => { byName[o.name] = o; });
const root = byName['weapon_root'], tip = byName['weapon_tip'];
console.log('\nweapon_root parent : ' + (root ? (root.parent && root.parent.name) : 'ABSENT'));
console.log('weapon_tip  parent : ' + (tip ? (tip.parent && tip.parent.name) : 'ABSENT'));
if (!root || !tip) process.exit(1);

// which clips actually KEY those two joints? that is what says "he moved them for the bar"
console.log('\nclips that key weapon_root / weapon_tip:');
for (const c of clips) {
  const t = c.tracks.filter(tr => /^weapon_(root|tip)\./.test(tr.name));
  if (t.length) console.log('  ' + c.name.padEnd(28) + t.map(x => x.name.split('.').pop()).join(','));
}

const mixer = new THREE.AnimationMixer(scene);
const wr = new THREE.Vector3(), wt = new THREE.Vector3(), hips = new THREE.Vector3(), head = new THREE.Vector3();
const hipsB = byName['mixamorig_Hips'], headB = byName['mixamorig_Head'];
function sample(clip, n) {
  const a = mixer.clipAction(clip); mixer.stopAllAction(); a.reset(); a.play();
  const out = [];
  for (let i = 0; i < n; i++) {
    mixer.setTime(clip.duration * i / (n - 1));
    scene.updateMatrixWorld(true);
    root.getWorldPosition(wr); tip.getWorldPosition(wt);
    hipsB && hipsB.getWorldPosition(hips); headB && headB.getWorldPosition(head);
    out.push({ r: wr.clone(), t: wt.clone(), h: hips.clone(), hd: head.clone() });
  }
  a.stop();
  return out;
}
const span = v => { let mn = 1e9, mx = -1e9; for (const x of v) { mn = Math.min(mn, x); mx = Math.max(mx, x); } return mx - mn; };
for (const c of bar) {
  const s = sample(c, 25);
  const mid = s.map(f => f.r.clone().add(f.t).multiplyScalar(.5));
  console.log('\n--- ' + c.name + '  ' + c.duration.toFixed(2) + 's ---');
  console.log('  weapon_root   ' + s[0].r.toArray().map(v => v.toFixed(3)).join(', '));
  console.log('  weapon_tip    ' + s[0].t.toArray().map(v => v.toFixed(3)).join(', '));
  const ax = s[0].t.clone().sub(s[0].r);
  console.log('  the BAR AXIS  ' + ax.clone().normalize().toArray().map(v => v.toFixed(3)).join(', ')
    + '   length ' + ax.length().toFixed(3));
  // A BAR YOU ROTATE ABOUT HAS TO STAND STILL. If the midpoint wanders through the clip, the
  // pivot is moving and "rotate him about it" means something different every frame.
  console.log('  midpoint drift over the clip: '
    + span(mid.map(v => v.x)).toFixed(3) + ' x, ' + span(mid.map(v => v.y)).toFixed(3) + ' y, ' + span(mid.map(v => v.z)).toFixed(3) + ' z');
  // and the swing radius: how far the body hangs below the bar
  const d0 = s[0].h.distanceTo(mid[0]), dh = s[0].hd.distanceTo(mid[0]);
  console.log('  hips are ' + d0.toFixed(3) + ' from the bar, head ' + dh.toFixed(3)
    + '   (file units -- x1.273 for metres on Colin)');
}
// AND THE BLASTER. `weapon_root` has been the gun's mount since c96, so a joint that has moved
// in the REST pose is a gun that has moved with it.
scene.traverse(o => { if (o.isBone || o.isObject3D) { /* reset */ } });
mixer.stopAllAction(); mixer.setTime(0);
for (const o of scene.children) o.updateMatrixWorld(true);
