// npm run melee -- lift a few clips out of a character file and leave everything else behind.
//
// The melee set is Plutopia's alien's, and his file is 2.2 MB of mesh and texture that the
// boot path has no business fetching for five animations. A clip needs its target NODES to
// exist and nothing else, so this keeps the bone hierarchy and drops the meshes, the skins,
// the materials and the images. `npm run bump` hashes the result like any other asset.
//
// IT IS CUT TO ROTATION-ONLY HERE, NOT AT LOAD -- WITH ONE MEASURED EXCEPTION. A position
// track bakes the ALIEN's bone lengths, and pouring those into Colin stretches him to alien
// proportions -- the same reason `skinClips` keeps only quaternions. Doing it offline makes
// the file two thirds smaller and means no clip in it can ever be applied the wrong way by
// accident.
//
// THE EXCEPTION IS THE HIPS, AND DROPPING IT IS WHAT MADE HIM FLOAT. The hips translation is
// not a bone LENGTH, it is the body's height off the ground, and every one of these clips
// crouches: the punch drops the hips 7.8 units, the slide and the roll drop them 55. With the
// track gone the hips stay at Colin's REST height while the legs are folded underneath, so
// his soles hang in the air for the whole clip -- measured by `npm run wear` at
//     melee_punch_01  0.11 .. 0.21 m      melee_slash 0.09 .. 0.21      slide 0.09 .. 0.51
// which is exactly (restHips - correctHips) x Colin's unit scale, to the centimetre.
// So the Hips channel is KEPT and REMAPPED into Colin's units, both ends measured from the
// two files' own idle clips and nothing typed:
//     y' = colinStand + (y - alienStand) * (colinStand / alienStand)
// X and Z are frozen at Colin's own idle values -- the clips animate IN PLACE here, the
// travel is code-driven (`MELEE.slideV`, `p.melV`), and a borrowed root path would fight it.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import { prune, dedup } from '@gltf-transform/functions';
import { statSync } from 'fs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });

const SRC = process.argv[2] || '../plutopia/models/alien_orange.glb';
const OUT = process.argv[3] || 'models/chars/melee.glb';
const KEEP = new Set(['melee_punch_01', 'melee_slash', 'melee_round_kick', 'slide', 'roll']);

const doc = await io.read(SRC);
const root = doc.getRoot();

// THE TWO STANDING HEIGHTS, READ FIRST -- the alien's `idle` is disposed three lines below.
const hipsY = (d, clip) => {
  for (const a of d.getRoot().listAnimations()) {
    if (a.getName() !== clip) continue;
    for (const c of a.listChannels()) {
      if (c.getTargetPath() !== 'translation' || !/Hips$/.test(c.getTargetNode().getName())) continue;
      const v = c.getSampler().getOutput().getArray();
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (let i = 0; i + 2 < v.length; i += 3) { sx += v[i]; sy += v[i + 1]; sz += v[i + 2]; n++; }
      return [sx / n, sy / n, sz / n];
    }
  }
  return null;
};
const alienStand = hipsY(doc, 'idle');
const colinDoc = await io.read('models/colin.glb');
const colinStand = hipsY(colinDoc, 'idle_neutral');
if (!alienStand || !colinStand) throw new Error('no idle Hips translation to measure against');
const hipK = colinStand[1] / alienStand[1];
console.log('hips: alien idle ' + alienStand[1].toFixed(1) + '  colin idle ' + colinStand[1].toFixed(1) +
            '  -> x' + hipK.toFixed(3));

let dropped = 0;
for (const a of root.listAnimations()) if (!KEEP.has(a.getName())) {
  for (const sm of a.listSamplers()) sm.dispose();
  for (const c of a.listChannels()) c.dispose();
  a.dispose(); dropped++;
}
const kept = root.listAnimations().map(a => a.getName());
// rotation only: drop every translation and scale channel and the samplers behind them
// DISPOSING A CHANNEL DOES NOT DISPOSE ITS SAMPLER, and a sampler is where the keyframes
// actually live. The first cut dropped 25 clips and 680 channels and still weighed 1.33 MB,
// because every sampler behind them was still hanging off its animation holding its
// accessors. Disposing them explicitly is what lets prune see the bytes as garbage.
let chDrop = 0, sDrop = 0, hipFix = 0;
for (const a of root.listAnimations()) {
  for (const c of a.listChannels()) {
    const isHips = c.getTargetPath() === 'translation' && /Hips$/.test(c.getTargetNode().getName());
    if (isHips) {
      const acc = c.getSampler().getOutput(), v = Float32Array.from(acc.getArray());
      for (let i = 0; i + 2 < v.length; i += 3) {
        v[i] = colinStand[0];
        v[i + 1] = colinStand[1] + (v[i + 1] - alienStand[1]) * hipK;
        v[i + 2] = colinStand[2];
      }
      acc.setArray(v); hipFix++; continue;
    }
    if (c.getTargetPath() !== 'rotation') { c.dispose(); chDrop++; }
  }
  const used = new Set(a.listChannels().map(c => c.getSampler()));
  for (const sm of a.listSamplers()) if (!used.has(sm)) { sm.dispose(); sDrop++; }
}
for (const m of root.listMeshes()) m.dispose();
for (const s of root.listSkins()) s.dispose();
for (const m of root.listMaterials()) m.dispose();
for (const t of root.listTextures()) t.dispose();
// a node with no mesh and no animation channel pointing at it is dead weight
const live = new Set();
for (const a of root.listAnimations()) for (const c of a.listChannels()) { let n = c.getTargetNode(); while (n) { live.add(n); n = n.getParentNode ? n.getParentNode() : null; } }
for (const n of root.listNodes()) if (!live.has(n) && !n.listChildren().some(c => live.has(c))) n.dispose();
// WITHOUT prune THE BYTES STAY. Disposing an animation unhooks it; the accessors and the
// buffer views it used are still in the file, and the first cut came out at 1.84 MB of mostly
// nothing. prune drops what nothing references any more, dedup merges what is left.
await doc.transform(dedup(), prune({ keepAttributes: false, keepLeaves: false }));
await io.write(OUT, doc);
const mb = k => (statSync(k).size / 1048576).toFixed(2);
console.log('kept ' + kept.length + ' clips (' + kept.join(', ') + '), dropped ' + dropped + ' clips, ' + chDrop + ' position/scale channels and ' + sDrop + ' samplers; ' + hipFix + ' hips tracks remapped');
console.log(SRC + '  ' + mb(SRC) + ' MB   ->   ' + OUT + '  ' + mb(OUT) + ' MB');
