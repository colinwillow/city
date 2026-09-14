// What does the animated `root` node actually do in each clip? If it translates, the clip
// carries root motion, and root motion fights a physics-driven position.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
const doc = await io.read('models/colin.glb');
const skin = doc.getRoot().listSkins()[0];
const joints = new Set(skin.listJoints().map(j => j.getName()));
console.log('skin joints:', skin.listJoints().length, '| "root" is a joint:', joints.has('root'));
const parentOf = new Map();
for (const nd of doc.getRoot().listNodes()) for (const ch of nd.listChildren()) parentOf.set(ch.getName(), nd.getName());
console.log('hierarchy: root parent =', parentOf.get('root'), '| Hips parent =', parentOf.get('mixamorig_Hips'));
for (const anim of doc.getRoot().listAnimations()) {
  if (!/fall_|get_up|flying|landing_roll|idle_neutral|walk_fwd_neutral/.test(anim.getName())) continue;
  for (const ch of anim.listChannels()) {
    const tn = ch.getTargetNode(); if (!tn || tn.getName() !== 'root' || ch.getTargetPath() !== 'translation') continue;
    const out = ch.getSampler().getOutput(); const v = [0,0,0];
    let mn = [9e9,9e9,9e9], mx = [-9e9,-9e9,-9e9];
    for (let i = 0; i < out.getCount(); i++) { out.getElement(i, v); for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], v[k]); mx[k] = Math.max(mx[k], v[k]); } }
    console.log(anim.getName().padEnd(20),
      'root xyz range  x ' + (mx[0]-mn[0]).toFixed(3) + '  y ' + mn[1].toFixed(3) + '..' + mx[1].toFixed(3) + '  z ' + (mx[2]-mn[2]).toFixed(3));
  }
}

console.log('\nhips height through each clip (bind-space units):');
for (const anim of doc.getRoot().listAnimations()) {
  if (!/fall_|get_up|flying|landing_roll|idle_neutral/.test(anim.getName())) continue;
  for (const ch of anim.listChannels()) {
    const tn = ch.getTargetNode(); if (!tn || tn.getName() !== 'mixamorig_Hips' || ch.getTargetPath() !== 'translation') continue;
    const out = ch.getSampler().getOutput(); const v = [0,0,0];
    let mn = 9e9, mx = -9e9, first = 0, last = 0;
    for (let i = 0; i < out.getCount(); i++) { out.getElement(i, v); mn = Math.min(mn, v[1]); mx = Math.max(mx, v[1]); if (i === 0) first = v[1]; last = v[1]; }
    console.log('  ' + anim.getName().padEnd(20) + 'y ' + mn.toFixed(1) + '..' + mx.toFixed(1) + '   start ' + first.toFixed(1) + ' -> end ' + last.toFixed(1));
  }
}
