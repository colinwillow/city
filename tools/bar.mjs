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
// AND THE HANDS, WHICH ARE THE OTHER CANDIDATE PAIR. If the weapon joints have to go back to
// being the gun's, this is what marks the bar instead -- so the question is whether his GRIP
// holds still enough to rotate about. See `BAR.mark`.
const lh = byName['mixamorig_LeftHand'], rh = byName['mixamorig_RightHand'];
function handSample(clip, n) {
  const a = mixer.clipAction(clip); mixer.stopAllAction(); a.reset(); a.play();
  const out = [];
  const L = new THREE.Vector3(), R = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    mixer.setTime(clip.duration * i / (n - 1));
    scene.updateMatrixWorld(true);
    lh.getWorldPosition(L); rh.getWorldPosition(R);
    out.push({ l: L.clone(), r: R.clone(), m: L.clone().add(R).multiplyScalar(.5) });
  }
  a.stop();
  return out;
}
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
  if (lh && rh) {
    const h = handSample(c, 25);
    const hax = h[0].r.clone().sub(h[0].l);
    console.log('  HANDS: axis ' + hax.clone().normalize().toArray().map(v => v.toFixed(3)).join(', ')
      + '  span ' + hax.length().toFixed(3)
      + '   midpoint drift ' + span(h.map(v => v.m.x)).toFixed(3) + ' / '
      + span(h.map(v => v.m.y)).toFixed(3) + ' / ' + span(h.map(v => v.m.z)).toFixed(3));
  }
}
// AND THE GUN, WHICH IS THE OTHER JOB THESE TWO JOINTS HOLD DOWN (c151).
// *"I didn't realise that keyframing their position -- because their position wasn't keyframed
// in the T-pose -- moved it in ALL positions, which made the gun messed up in every pose."*
// A node's local transform IS its rest pose, and a clip that does not key a channel leaves that
// channel at rest. So keying `position` in the bar clips only, with the rig sitting in the bar
// pose, writes the BAR position as the node's default -- and every other clip, keying nothing,
// inherits it. One pair of joints, two jobs, and they fight.
// This is what tells the two files apart: in a NEUTRAL clip the joint should be ON his hand.
const hand = byName['mixamorig_RightHand'];
const neutral = clips.find(c => c.name === 'idle_neutral') || clips.find(c => /idle/i.test(c.name));
if (hand && neutral) {
  const s = sample(neutral, 9);
  const hw = new THREE.Vector3();
  mixer.stopAllAction();
  const a = mixer.clipAction(neutral); a.reset(); a.play(); mixer.setTime(0); scene.updateMatrixWorld(true);
  hand.getWorldPosition(hw); root.getWorldPosition(wr); tip.getWorldPosition(wt);
  const off = wr.distanceTo(hw);
  console.log('\n--- THE GUN, in ' + neutral.name + ' ---');
  console.log('  right hand    ' + hw.toArray().map(v => v.toFixed(3)).join(', '));
  console.log('  weapon_root   ' + wr.toArray().map(v => v.toFixed(3)).join(', '));
  console.log('  offset from the hand: ' + off.toFixed(3) + ' file units ('
    + (off * 1.273 * 100).toFixed(0) + ' cm on Colin)');
  const barrel = wt.clone().sub(wr);
  console.log('  barrel        ' + barrel.clone().normalize().toArray().map(v => v.toFixed(3)).join(', ')
    + '   length ' + barrel.length().toFixed(3));
  console.log(off < .12
    ? '  -> THE GUN IS FINE: the joint is on his hand where the blaster mounts.'
    : '  -> *** THE GUN IS BROKEN HERE: the joint has been dragged ' + (off * 1.273 * 100).toFixed(0)
      + ' cm off his hand,\n     which is where the blaster would hang.');
  a.stop();
}
// AND THE BLASTER. `weapon_root` has been the gun's mount since c96, so a joint that has moved
// in the REST pose is a gun that has moved with it.
scene.traverse(o => { if (o.isBone || o.isObject3D) { /* reset */ } });
mixer.stopAllAction(); mixer.setTime(0);
for (const o of scene.children) o.updateMatrixWorld(true);

// ---------------------------------------------------------------------------------------
// WHERE DOES HE ACTUALLY END UP ON THE BAR? (c164)
// *"He's upside down... it's like he's rotating around his middle point."* Two claims, and both
// are positions in space rather than opinions. This runs the SHIPPED `barPlace` -- lifted
// between the `BARPOSE:` markers, never restated -- against the real rig in the real hang clip
// and reads where his HANDS, his HEAD and his FEET land relative to the bar.
// ---------------------------------------------------------------------------------------
const barSrc = fs.readFileSync('index.html', 'utf8');
const mk = barSrc.match(/\/\* BARPOSE:START \*\/([\s\S]*?)\/\* BARPOSE:END \*\//);
if (!mk) { console.error('BARPOSE markers not found'); process.exit(1); }
const barPlace = new Function('THREE', mk[1] + '\nreturn barPlace;')(THREE);

const nodeBy = {};
gltf.scene.traverse(o => { if (o.name) nodeBy[o.name] = o; });
const hang = clips.find(c => c.name === 'bar_hang_idle');
const need = ['mixamorig_LeftHand', 'mixamorig_RightHand', 'mixamorig_Head', 'mixamorig_LeftToeBase', 'mixamorig_Hips'];
const miss = need.filter(n => !nodeBy[n]);
if (!hang || miss.length) { console.log('\n(skipping the placement check: ' + (hang ? 'no ' + miss.join(', ') : 'no bar_hang_idle') + ')'); }
else {
  // A SYNTHETIC BAR ALONG +X at 4 m, which makes the swing plane +/-Z and every number readable.
  const B = { x: 0, y: 4, z: 0, ax: 1, az: 0 };
  const root = new THREE.Group(); root.add(gltf.scene); root.updateMatrixWorld(true);
  const jr = nodeBy['mixamorig_LeftHand'], jt = nodeBy['mixamorig_RightHand'];
  const P = n => { const v = new THREE.Vector3(); nodeBy[n].getWorldPosition(v); return v; };
  mixer.stopAllAction();
  const act = mixer.clipAction(hang); act.reset(); act.play(); mixer.setTime(0);

  console.log('\nTHE HANG CLIP ITSELF  (is it a hang at all -- are his hands above his head?)');
  root.quaternion.identity(); root.position.set(0, 0, 0); root.updateMatrixWorld(true);
  const h0 = P('mixamorig_LeftHand').y, hd0 = P('mixamorig_Head').y, ft0 = P('mixamorig_LeftToeBase').y;
  console.log('   hands ' + h0.toFixed(3) + '   head ' + hd0.toFixed(3) + '   toes ' + ft0.toFixed(3)
    + '   -> ' + (h0 > hd0 && hd0 > ft0 ? 'HANGING: hands over head over feet' : '*** NOT a hang pose'));

  console.log('\nTHROUGH THE SHIPPED `barPlace`, bar along +X at y=4, swing plane +/-Z');
  console.log('   `stepBar` puts his centre of mass at +Z*len*sin(a), so at a>0 his BODY must be at +Z too\n');
  let worstGrip = 0, agree = 0, n = 0;
  for (const deg of [0, 45, 90, 135, 180, -45, -90]) {
    const a = deg * Math.PI / 180;
    barPlace(root, jr, jt, B, a, 0);
    const L = P('mixamorig_LeftHand'), R = P('mixamorig_RightHand');
    const mid = L.clone().add(R).multiplyScalar(.5);
    const head = P('mixamorig_Head'), toe = P('mixamorig_LeftToeBase'), hips = P('mixamorig_Hips');
    const grip = mid.distanceTo(new THREE.Vector3(B.x, B.y, B.z));
    worstGrip = Math.max(worstGrip, grip);
    const wantZ = Math.sin(a);                      // the sign `stepBar` is driving him with
    const gotZ = hips.z - B.z;
    const ok = Math.abs(wantZ) < .05 || Math.sign(gotZ) === Math.sign(wantZ);
    if (ok) agree++; n++;
    console.log('   a ' + String(deg).padStart(4) + ' deg   grip off bar ' + grip.toFixed(4)
      + '   hips ' + (hips.y - B.y >= 0 ? '+' : '') + (hips.y - B.y).toFixed(2) + 'y '
      + (gotZ >= 0 ? '+' : '') + gotZ.toFixed(2) + 'z'
      + '   head ' + (head.y - B.y).toFixed(2) + '   toes ' + (toe.y - B.y).toFixed(2)
      + '   ' + (ok ? '' : '*** swings the WRONG WAY'));
  }
  console.log('\n   worst grip-to-bar ' + worstGrip.toFixed(4) + ' m   (the pivot IS his hands if this is ~0)');
  console.log('   swing side agrees with the physics in ' + agree + '/' + n + ' cases');
  if (worstGrip > .02) { console.log('*** he does not pivot about his hands'); process.exit(1); }
  if (agree < n) { console.log('*** the body swings against the pendulum driving it'); process.exit(1); }
  console.log('   he hangs by his hands and swings the way `stepBar` is pushing him.');
}
