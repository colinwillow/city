// npm run gunpose -- WHERE DOES THE GUN ACTUALLY SIT WHILE HE IS STANDING THERE?
//
// *"I really cannot figure out why the blaster is wrong. I've corrected it five times. It's
// right in Cinema 4D, it's right in Blender."*
// Every check before this one measured the REST pose -- `npm run joints`, `npm run gun`, and
// the diffs I ran across his exports. **The rest pose is what he is looking at in Blender.**
// The game is never in it: a clip is playing on every frame, the hand bone moves, and
// `weapon_root` rides it. So this poses the rig with a real mixer, in the clip he is STANDING
// in, and reads where the mount ends up relative to his HAND and to his own height.
import fs from 'fs';
import { readFileSync } from 'fs';
if (!fs.existsSync('node_modules/three/package.json')) {
  fs.mkdirSync('node_modules/three', { recursive: true });
  fs.writeFileSync('node_modules/three/package.json', JSON.stringify({
    name: 'three', version: '0.180.0-vendored', type: 'module', main: 'index.js', exports: { '.': './index.js' } }, null, 2));
  fs.writeFileSync('node_modules/three/index.js', "export * from '../../vendor/three.module.min.js';\n");
}
const THREE = await import('three');
const { GLTFLoader } = await import('../vendor/GLTFLoader.js');
const { NodeIO } = await import('@gltf-transform/core');
const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
const draco3d = (await import('draco3dgltf')).default;
const gio = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
const TMP = 'tools/.gun-tmp/'; fs.mkdirSync(TMP, { recursive: true });
async function prep(f) {
  const out = TMP + f.split('/').pop();
  const doc = await gio.read(f);
  for (const t of doc.getRoot().listTextures()) t.dispose();
  for (const e of doc.getRoot().listExtensionsUsed()) if (/draco/i.test(e.extensionName)) e.dispose();
  await gio.write(out, doc); return out;
}
const loader = new GLTFLoader();
// slice by the buffer's OWN view -- readFileSync().buffer is the shared pool for a small file
const load = f => { const b = readFileSync(f); return new Promise((res, rej) =>
  loader.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '', res, rej)); };

const colin = await load(await prep('models/colin.glb'));
const blaster = await load(await prep('models/blaster.glb'));
const root = new THREE.Object3D(); root.add(colin.scene);

let hand = null, mount = null, tip = null, skinned = [];
colin.scene.traverse(o => {
  if (o.name === 'mixamorig_RightHand') hand = o;
  if (o.name === 'weapon_root') mount = o;
  if (o.name === 'weapon_tip') tip = o;
  if (o.isSkinnedMesh) skinned.push(o);
});
console.log('\nweapon_root hangs off: ' + (mount && mount.parent ? mount.parent.name : '*** nothing'));

const mixer = new THREE.AnimationMixer(colin.scene);
const v = new THREE.Vector3(), vh = new THREE.Vector3(), vm = new THREE.Vector3();
function skinBounds() {
  let lo = 1e9, hi = -1e9;
  for (const m of skinned) {
    const pos = m.geometry.attributes.position, st = Math.max(1, Math.floor(pos.count / 400));
    for (let i = 0; i < pos.count; i += st) {
      v.fromBufferAttribute(pos, i); m.applyBoneTransform(i, v); m.localToWorld(v);
      if (v.y < lo) lo = v.y; if (v.y > hi) hi = v.y;
    }
  }
  return { lo, hi };
}
console.log('\nclip                    mount height   as %% of him   distance from his RIGHT HAND');
for (const nm of ['idle_neutral', 'walk_fwd_neutral', 'run_fwd', 'rifle_idle_01']) {
  const clip = colin.animations.find(c => c.name === nm);
  if (!clip) { console.log('  ' + nm.padEnd(22) + '*** not in the file'); continue; }
  mixer.stopAllAction();
  const a = mixer.clipAction(clip); a.reset().play();
  mixer.setTime(clip.duration * .25);
  root.updateMatrixWorld(true);
  const b = skinBounds(), h = b.hi - b.lo;
  hand.getWorldPosition(vh); mount.getWorldPosition(vm);
  const frac = (vm.y - b.lo) / h;
  const d = vh.distanceTo(vm);
  console.log('  ' + nm.padEnd(22) + vm.y.toFixed(3).padStart(7) + '   ' + (frac * 100).toFixed(0).padStart(7) + '%'
    + '       ' + d.toFixed(3) + '  (' + (d / h * 100).toFixed(0) + '% of his height)'
    + (d / h > .12 ? '   *** NOT ON HIS HAND' : '   on his hand'));
}
// and where his hand actually is, for scale
{
  const clip = colin.animations.find(c => c.name === 'idle_neutral');
  mixer.stopAllAction(); mixer.clipAction(clip).reset().play(); mixer.setTime(clip.duration * .25);
  root.updateMatrixWorld(true);
  const b = skinBounds(), h = b.hi - b.lo;
  hand.getWorldPosition(vh);
  console.log('\n  in idle: his crown ' + b.hi.toFixed(3) + ', his soles ' + b.lo.toFixed(3)
    + ', his RIGHT HAND at ' + vh.y.toFixed(3) + ' = ' + (((vh.y - b.lo) / h) * 100).toFixed(0) + '% of his height');
  mount.getWorldPosition(vm);
  console.log('  and weapon_root at ' + vm.y.toFixed(3) + ' = ' + (((vm.y - b.lo) / h) * 100).toFixed(0) + '%');
  // the gun itself: its own file's weapon_root neutralised, parented to his
  let own = null; blaster.scene.traverse(o => { if (o.name === 'weapon_root') own = own || o; });
  blaster.scene.updateMatrixWorld(true);
  const fix = own.matrixWorld.clone().invert();
  const gm = blaster.scene.clone(true); gm.applyMatrix4(fix);
  const grp = new THREE.Group(); grp.add(gm); mount.add(grp);
  root.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(gm);
  const c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
  console.log('\n  THE GUN, mounted the way the game mounts it:');
  console.log('    size ' + sz.x.toFixed(3) + ' x ' + sz.y.toFixed(3) + ' x ' + sz.z.toFixed(3)
    + '   longest ' + Math.max(sz.x, sz.y, sz.z).toFixed(3) + ' (x1.273 on Colin = '
    + (Math.max(sz.x, sz.y, sz.z) * 1.273 * 100).toFixed(0) + ' cm)');
  console.log('    centre  ' + c.x.toFixed(3) + ', ' + c.y.toFixed(3) + ', ' + c.z.toFixed(3)
    + '   = ' + (((c.y - b.lo) / h) * 100).toFixed(0) + '% of his height');
  console.log('    his hand ' + vh.x.toFixed(3) + ', ' + vh.y.toFixed(3) + ', ' + vh.z.toFixed(3));
  console.log('    the gun\'s centre is ' + c.distanceTo(vh).toFixed(3) + ' from his hand ('
    + (c.distanceTo(vh) / h * 100).toFixed(0) + '% of his height)');
}
