// npm run rigs [glb ...] -- can Colin's clips be worn by somebody else?
//
// The plan is his: every one of these characters is rigged to a Mixamo skeleton, so rather
// than re-exporting 34 clips onto each of them, take the clips as they are and correct for
// the difference between the two BIND POSES -- the rotation offset from the base pose. That
// is exactly what three's own `SkeletonUtils.retargetClip` does, and it is already vendored.
//
// ROBITS ALREADY SHIPPED THIS AND ALREADY LEARNT THE HARD PART -- see its index.html:4627.
// The rest-delta form it A/B'd (q_t = q_restT * inv(q_restS) * q_animS) was measured a
// REGRESSION and turned off: the per-bone identity ignores the parent-chain term, so the
// correction compounds down each limb (arm divergence 4.6 -> 33 degrees). What ships there is
// rotation-only -- keep the quaternion tracks, drop position and scale. This tool exists to
// say which characters that will be enough for, not to justify writing something cleverer.
//
// What decides whether it works is not the idea, it is the DATA: how much of Colin's animated
// bone set each character actually has, and how far apart the two rest poses are. This prints
// both, per candidate, so "it will look weird" becomes a number before anything is built.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });

const qMul = (a, b) => [
  a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1],
  a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
  a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3],
  a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]];
const qInv = q => [-q[0], -q[1], -q[2], q[3]];
const qAng = q => 2 * Math.acos(Math.min(1, Math.abs(q[3])));   // the angle of a unit quaternion

async function read(f) {
  const doc = await io.read(f);
  const bones = new Map();          // name -> { rot, pos, parent }
  const nodes = doc.getRoot().listNodes();
  const parent = new Map();
  for (const n of nodes) for (const c of n.listChildren()) parent.set(c, n);
  for (const n of nodes) {
    const nm = n.getName() || '';
    if (!/^mixamorig/i.test(nm)) continue;
    bones.set(nm.replace(/[^A-Za-z0-9_]/g, '_'), { rot: n.getRotation(), pos: n.getTranslation(),
      parent: parent.get(n) ? (parent.get(n).getName() || '').replace(/[^A-Za-z0-9_]/g, '_') : null });
  }
  // the bones the clips actually drive, and which channels they drive
  const driven = new Map();
  for (const a of doc.getRoot().listAnimations()) {
    for (const ch of a.listChannels()) {
      const t = ch.getTargetNode(); if (!t) continue;
      const nm = (t.getName() || '').replace(/[^A-Za-z0-9_]/g, '_');
      const e = driven.get(nm) || new Set(); e.add(ch.getTargetPath()); driven.set(nm, e);
    }
  }
  // HIP HEIGHT MUST COME OFF THE WORLD MATRIX, NOT A SUM OF LOCAL TRANSLATIONS. The first
  // version of this walked up the chain adding `pos[1]`, which ignores every rotation and
  // scale on the way -- and Colin's armature is scaled 0.01 and turned a quarter turn, so it
  // reported his hips at 52.8 and three of the candidates at a NEGATIVE height. A tool that
  // measures the wrong quantity is worse than no tool: it was about to be used to pick the
  // scale every character is shown at.
  let hip = 0;
  for (const n of nodes) if ((n.getName() || '') === 'mixamorig_Hips' || (n.getName() || '') === 'mixamorigHips') {
    const M = n.getWorldMatrix(); hip = M[13]; break;
  }
  return { doc, bones, driven, hip, clips: doc.getRoot().listAnimations().length };
}

const src = await read('models/colin.glb');
const drivenBones = [...src.driven.keys()].filter(n => /^mixamorig/i.test(n));
const movers = drivenBones.filter(n => src.driven.get(n).has('translation'));
console.log('COLIN: ' + src.clips + ' clips driving ' + drivenBones.length + ' bones of ' + src.bones.size);
console.log('  bones with TRANSLATION keys (these carry proportion, and must not be copied across):');
console.log('   ', movers.join(', ') || '(none)');
console.log('  hips stand at ' + src.hip.toFixed(3) + ' m (world, so this is the real height)\n');

const files = process.argv.slice(2);
if (!files.length) { console.log('pass some glb paths'); process.exit(0); }
for (const f of files) {
  let t; try { t = await read(f); } catch (e) { console.log(f.padEnd(46), 'UNREADABLE'); continue; }
  const have = drivenBones.filter(n => t.bones.has(n));
  const missing = drivenBones.filter(n => !t.bones.has(n));
  // how far apart are the two BIND POSES -- this is the offset retargetClip has to undo
  let worst = 0, worstN = '', sum = 0, n = 0;
  for (const nm of have) {
    const d = qAng(qMul(qInv(src.bones.get(nm).rot), t.bones.get(nm).rot));
    sum += d; n++; if (d > worst) { worst = d; worstN = nm; }
  }
  const pc = (100 * have.length / drivenBones.length).toFixed(0);
  console.log(f.split('/').slice(-1)[0].replace('.glb', '').padEnd(20),
    'has ' + String(have.length).padStart(3) + '/' + drivenBones.length + ' (' + pc.padStart(3) + '%)',
    ' rest-pose offset  mean ' + (sum / Math.max(1, n) * 57.3).toFixed(1).padStart(5) + ' deg',
    ' worst ' + (worst * 57.3).toFixed(0).padStart(3) + ' deg (' + worstN.replace('mixamorig_', '') + ')',
    ' hips ' + t.hip.toFixed(2) + 'm -> x' + (t.hip ? (src.hip / t.hip).toFixed(2) : '?') + ' to match Colin');
  if (missing.length) console.log('    MISSING:', missing.map(x => x.replace('mixamorig_', '')).join(' ').slice(0, 150));
}
