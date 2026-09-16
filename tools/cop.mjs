// npm run cop -- what did the police officer and the pistol actually arrive as, and where
// does the gun land when it is hung off his hand?
//
// Same discipline as `npm run wear`: the REAL vendored GLTFLoader, a REAL AnimationMixer and
// REAL skinned vertices. Reading the GLB with gltf-transform answers none of this, because
// GLTFLoader rebinds every skin with the IDENTITY matrix and that is the step that decides
// what size a thing comes out. The pistol is the case in point -- its geometry is +/-15 units
// while its own bones are in metres, so the file says two different things about its size and
// only the loader settles which one wins.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
if (!existsSync('node_modules/three/package.json')) {
  mkdirSync('node_modules/three', { recursive: true });
  writeFileSync('node_modules/three/package.json', JSON.stringify({
    name: 'three', version: '0.180.0-vendored', type: 'module', main: 'index.js', exports: { '.': './index.js' } }, null, 2));
  writeFileSync('node_modules/three/index.js', "export * from '../../vendor/three.module.min.js';\n");
}
const THREE = await import('three');
const { GLTFLoader } = await import('../vendor/GLTFLoader.js');
const { NodeIO } = await import('@gltf-transform/core');
const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
const draco3d = (await import('draco3dgltf')).default;
const gio = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
const TMP = 'tools/.cop-tmp/'; mkdirSync(TMP, { recursive: true });
async function prep(f) {
  const out = TMP + f.split('/').pop();
  const doc = await gio.read(f);
  for (const t of doc.getRoot().listTextures()) t.dispose();
  for (const e of doc.getRoot().listExtensionsUsed()) if (/draco/i.test(e.extensionName)) e.dispose();
  await gio.write(out, doc); return out;
}
const loader = new GLTFLoader();
// **`readFileSync(f).buffer` IS THE SHARED POOL FOR A SMALL FILE, NOT THE FILE.** Node allocates
// anything under ~4 KB out of an 8 KB pool, so `.buffer.slice(0)` starts at the beginning of the
// POOL and hands the loader whatever was sitting in it -- which parses as garbage. Every
// character GLB is megabytes and gets its own ArrayBuffer, so this was invisible until a 3 KB
// garment went through it. Slice by the buffer's OWN view.
const load = f => { const b = readFileSync(f); return new Promise((res, rej) =>
  loader.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '', res, rej)); };
// THE FILE IS AN ARGUMENT, because there is more than one officer export now and a tool that
// measures a file the game does not load is this repo's oldest mistake. `npm run cop [glb]`.
const COPFILE = process.argv[2] || 'models/police_officer_toon.glb';
const cop = await load(await prep(COPFILE));
const gun = await load(await prep('models/pistol.glb'));

// SKIN REAL VERTICES. Bone world positions are not the answer: `npm run wear`'s first version
// read those and pronounced the robot upright while he was buried head-down.
const _v = new THREE.Vector3();
function skinBounds(root, step = 1) {
  root.updateMatrixWorld(true);
  const lo = new THREE.Vector3(1e9, 1e9, 1e9), hi = new THREE.Vector3(-1e9, -1e9, -1e9);
  let n = 0;
  root.traverse(o => {
    if (!o.isSkinnedMesh) return;
    const pos = o.geometry.attributes.position, st = Math.max(1, Math.floor(pos.count / 400) * step);
    for (let i = 0; i < pos.count; i += st) {
      o.applyBoneTransform(i, _v.fromBufferAttribute(pos, i)); o.localToWorld(_v);
      lo.min(_v); hi.max(_v); n++;
    }
  });
  return { lo, hi, n };
}
const fmt = v => '(' + v.x.toFixed(3) + ', ' + v.y.toFixed(3) + ', ' + v.z.toFixed(3) + ')';

console.log('=== the officer, as the loader builds him ===');
const cb = skinBounds(cop.scene);
console.log('  skinned bounds ' + fmt(cb.lo) + ' .. ' + fmt(cb.hi));
console.log('  HEIGHT ' + (cb.hi.y - cb.lo.y).toFixed(3) + ' m in file units  -> scale to 1.75 = x' +
            (1.75 / (cb.hi.y - cb.lo.y)).toFixed(3) + '   (Colin is 1.315 -> x1.331)');
console.log('  soles at ' + cb.lo.y.toFixed(3) + (Math.abs(cb.lo.y) < .02 ? '   -> already on the floor, no sitSkin lift needed' : '   *** NEEDS A LIFT ***'));

console.log('\n=== the pistol ===');
const gb = skinBounds(gun.scene);
console.log('  skinned bounds ' + fmt(gb.lo) + ' .. ' + fmt(gb.hi));
const glen = Math.max(gb.hi.x - gb.lo.x, gb.hi.y - gb.lo.y, gb.hi.z - gb.lo.z);
console.log('  LONGEST AXIS ' + glen.toFixed(3) + ' m  -- a pistol is about 0.19 m, so x' + (0.19 / glen).toFixed(3));
let tip = null, wroot = null;
gun.scene.traverse(o => { if (o.name === 'weapon_tip') tip = o; if (o.name === 'weapon_root') wroot = o; });
gun.scene.updateMatrixWorld(true);
if (wroot) console.log('  weapon_root world ' + fmt(wroot.getWorldPosition(new THREE.Vector3())));
if (tip) console.log('  weapon_tip  world ' + fmt(tip.getWorldPosition(new THREE.Vector3())) +
  '   -- the muzzle, which is where a shot starts and what the barrel points along');

console.log('\n=== his hand, through the clips ===');
let hand = null; cop.scene.traverse(o => { if (o.name === 'mixamorig_RightHand') hand = o; });
const mx = new THREE.AnimationMixer(cop.scene);
const clips = cop.animations.slice().sort((a, b) => a.name.localeCompare(b.name));
const AIR = new Set(['knock_down_back', 'knock_down_front', 'get_up_back', 'get_up_front', 'hit_while_shooting']);
console.log('  clip                          dur    soles lo..hi      hand y      travel(m)');
for (const c of clips) {
  const a = mx.clipAction(c); mx.stopAllAction(); a.reset().play(); a.setEffectiveWeight(1);
  let slo = 1e9, shi = -1e9, hlo = 1e9, hhi = -1e9;
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3();
  for (let i = 0; i < 10; i++) {
    mx.setTime(c.duration * i / 9); cop.scene.updateMatrixWorld(true);
    const b = skinBounds(cop.scene, 3);
    if (b.lo.y < slo) slo = b.lo.y; if (b.lo.y > shi) shi = b.lo.y;
    if (hand) { const h = hand.getWorldPosition(new THREE.Vector3()); if (h.y < hlo) hlo = h.y; if (h.y > hhi) hhi = h.y; }
    const hips = cop.scene.getObjectByName('mixamorig_Hips');
    if (hips) { const w = hips.getWorldPosition(new THREE.Vector3()); if (i === 0) p0.copy(w); p1.copy(w); }
  }
  const travel = Math.hypot(p1.x - p0.x, p1.z - p0.z);
  console.log('  ' + c.name.padEnd(26) + c.duration.toFixed(2) + 's  ' +
    slo.toFixed(2) + '..' + shi.toFixed(2) + '   ' + hlo.toFixed(2) + '..' + hhi.toFixed(2) +
    '    ' + travel.toFixed(2) + (travel > .05 ? '  <- ROOT MOTION' : '') +
    (!AIR.has(c.name) && slo > .05 ? '   *** FLOATS ***' : ''));
  a.stop();
}
mx.stopAllAction();

console.log('\n=== the pistol, object by object ===');
gun.scene.updateMatrixWorld(true);
gun.scene.traverse(o => {
  const p = o.getWorldPosition(new THREE.Vector3()), s = o.getWorldScale(new THREE.Vector3());
  console.log('  ' + (o.type + '        ').slice(0, 13) + (o.name || '(anon)').padEnd(16) +
    ' world ' + fmt(p) + ' scale ' + s.x.toFixed(3) +
    (o.geometry ? '  geo ' + o.geometry.attributes.position.count + 'v' : ''));
  if (o.geometry) {
    o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox;
    const w = b.clone().applyMatrix4(o.matrixWorld);
    console.log('      geo bounds ' + fmt(b.min) + ' .. ' + fmt(b.max));
    console.log('      WORLD      ' + fmt(w.min) + ' .. ' + fmt(w.max) +
      '   longest ' + Math.max(w.max.x - w.min.x, w.max.y - w.min.y, w.max.z - w.min.z).toFixed(3) + ' m');
  }
});

console.log('\n=== the officer\'s own non-bone nodes, and any weapon joint ===');
cop.scene.updateMatrixWorld(true);
let wj = null;
cop.scene.traverse(o => {
  if (/weapon|gun|pistol/i.test(o.name)) {
    if (!wj) wj = o;
    const p = o.getWorldPosition(new THREE.Vector3()), s = o.getWorldScale(new THREE.Vector3());
    console.log('  ' + (o.type + '      ').slice(0, 9) + o.name.padEnd(22) + ' world ' + fmt(p) +
      ' scale ' + s.x.toFixed(4) + '  parent ' + (o.parent ? o.parent.name : '-'));
  }
});
if (!wj) console.log('  (none -- still no weapon joint on this export)');
else {
  const mx2 = new THREE.AnimationMixer(cop.scene);
  for (const nm of ['draw_weapon', 'shoot_pistol', 'idle_01']) {
    const c = cop.animations.find(a => a.name === nm); if (!c) continue;
    const a = mx2.clipAction(c); mx2.stopAllAction(); a.reset().play(); a.setEffectiveWeight(1);
    mx2.setTime(c.duration * .9); cop.scene.updateMatrixWorld(true);
    console.log('  ' + nm.padEnd(16) + ' at 90%: weapon joint ' + fmt(wj.getWorldPosition(new THREE.Vector3())));
    a.stop();
  }
}

// ---------------------------------------------------------------------------------------
// WHICH WAY IS HE LYING? "One of those combos is reversed so he does a 180 on the ground
// between getting up" -- a question about where the BODY points at one instant of a clip, and
// the only honest way to answer it is to pose the real rig and look at the real vertices.
//
// The bearing is the horizontal hips->head vector: face down or face up, that is the way the
// body is laid out on the floor. A knock-down ENDS somewhere and the matching get-up STARTS
// somewhere, and if those two disagree by about 180 degrees he snaps round between them.
{
  const mixer = new THREE.AnimationMixer(cop.scene);
  const byName = {}; for (const c of cop.animations) byName[c.name] = c;
  const bone = n => { let b = null; cop.scene.traverse(o => { if (!b && o.isBone && new RegExp(n + '$', 'i').test(o.name)) b = o; }); return b; };
  const hips = bone('Hips'), head = bone('Head');
  const pose = (clip, t) => {
    mixer.stopAllAction();
    const a = mixer.clipAction(clip); a.reset(); a.play(); a.paused = true; a.time = t;
    mixer.update(0); cop.scene.updateMatrixWorld(true);
    const h = new THREE.Vector3(), p = new THREE.Vector3();
    hips.getWorldPosition(p); head.getWorldPosition(h);
    const dx = h.x - p.x, dz = h.z - p.z;
    return { deg: Math.atan2(dx, dz) * 180 / Math.PI, flat: Math.hypot(dx, dz), rise: h.y - p.y };
  };
  const wrap = d => { while (d > 180) d -= 360; while (d < -180) d += 360; return d; };
  console.log('\n=== which way is he lying? (horizontal hips->head bearing) ===');
  const rows = [];
  for (const [nm, where] of [['knock_down_front', 'end'], ['knock_down_back', 'end'],
                             ['get_up_front', 'start'], ['get_up_back', 'start']]) {
    const c = byName[nm];
    if (!c) { console.log('  ' + nm.padEnd(20) + 'MISSING'); continue; }
    const t = where === 'end' ? Math.max(0, c.duration - 1 / 30) : 0;
    const r = pose(c, t);
    rows.push([nm, r]);
    console.log('  ' + nm.padEnd(20) + where.padEnd(6) + 'bearing ' + r.deg.toFixed(1).padStart(7) + ' deg   ' +
      'flat ' + r.flat.toFixed(3) + '  rise ' + r.rise.toFixed(3) + (r.rise > .25 ? '  (still upright)' : ''));
  }
  const get = n => (rows.find(r => r[0] === n) || [])[1];
  console.log('\n  the two pairings the game uses:');
  for (const [d, u] of [['knock_down_front', 'get_up_front'], ['knock_down_back', 'get_up_back']]) {
    const a = get(d), b = get(u);
    if (!a || !b) continue;
    const off = Math.abs(wrap(b.deg - a.deg));
    console.log('    ' + d + ' -> ' + u + '   off by ' + off.toFixed(1).padStart(6) + ' deg   ' +
      (off > 120 ? '*** REVERSED -- he spins 180 on the floor ***' : off > 45 ? '(noticeably off)' : 'agrees'));
  }
}
