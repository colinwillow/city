// npm run joints [glb ...] -- DOES THIS RIG CARRY A WEAPON JOINT, AND WHERE DOES IT POINT?
//
// "I can't remember if I added that blaster with the joint rigs or not" is a question the file
// answers in a second, and guessing at it has cost this project two builds of hand-nudging.
// It reports, for every file given (or every model in the repo by default):
//   * whether `weapon_root` / `weapon_tip` exist, and what they hang off
//   * the muzzle offset -- which is the BARREL AXIS, so it says which way the gun points
//   * and for two files, whether their weapon joints AGREE, which is the whole question when
//     a weapon is meant to drop onto a character's hand with no placement at all.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import { readdirSync, existsSync } from 'fs';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });

let files = process.argv.slice(2);
if (!files.length) {
  files = [];
  for (const d of ['models', 'models/chars']) {
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) if (f.endsWith('.glb')) files.push(d + '/' + f);
  }
}
const W = (M, v) => [M[0]*v[0]+M[4]*v[1]+M[8]*v[2]+M[12], M[1]*v[0]+M[5]*v[1]+M[9]*v[2]+M[13], M[2]*v[0]+M[6]*v[1]+M[10]*v[2]+M[14]];
const fmt = a => '(' + a.map(x => (+x).toFixed(3)).join(', ') + ')';
const seen = [];
for (const f of files) {
  let doc; try { doc = await io.read(f); } catch (e) { continue; }
  const root = doc.getRoot();
  const nodes = root.listNodes();
  const find = re => nodes.find(n => re.test(n.getName()));
  const wr = find(/^weapon_root$/i), wt = find(/^weapon_tip$/i);
  const anyW = nodes.filter(n => /weapon|gun|pistol|blaster/i.test(n.getName())).map(n => n.getName());
  if (!wr && !anyW.length) { console.log(f.padEnd(34) + '  -'); continue; }
  const par = wr && wr.getParentNode ? wr.getParentNode() : null;
  console.log(f);
  console.log('   weapon nodes: ' + (anyW.join(', ') || '(none)'));
  if (!wr) { console.log('   *** NO `weapon_root` -- nothing here to parent to ***\n'); continue; }
  const Mr = wr.getWorldMatrix();
  const rw = [Mr[12], Mr[13], Mr[14]];
  console.log('   weapon_root  parent ' + (par ? par.getName() : '(root)') + '   world ' + fmt(rw));
  let off = null;
  if (wt) {
    const Mt = wt.getWorldMatrix();
    off = [Mt[12] - rw[0], Mt[13] - rw[1], Mt[14] - rw[2]];
    const len = Math.hypot(...off);
    const ax = ['x', 'y', 'z'][off.map(Math.abs).indexOf(Math.max(...off.map(Math.abs)))];
    console.log('   weapon_tip   offset ' + fmt(off) + '   length ' + len.toFixed(3) +
      '   -> the barrel runs along ' + (off[{x:0,y:1,z:2}[ax]] < 0 ? '-' : '+') + ax.toUpperCase());
  } else console.log('   weapon_tip   *** MISSING -- no muzzle, so nothing knows which way it points ***');
  seen.push({ f, off, par: par ? par.getName() : '(root)' });
  console.log('');
}
// DO TWO OF THEM AGREE? A weapon drops onto a character with NO placement only if both files
// are built round the same joint pair -- the offsets equal, or equal with X mirrored, which is
// a left hand against a right one. That is the check that ended the police pistol's nudging.
const withOff = seen.filter(s => s.off);
if (withOff.length > 1) {
  console.log('do they agree? (equal, or equal-with-X-mirrored = a left hand against a right)');
  for (let i = 0; i < withOff.length; i++) for (let j = i + 1; j < withOff.length; j++) {
    const a = withOff[i], b = withOff[j];
    const d = Math.hypot(a.off[0] - b.off[0], a.off[1] - b.off[1], a.off[2] - b.off[2]);
    const dm = Math.hypot(a.off[0] + b.off[0], a.off[1] - b.off[1], a.off[2] - b.off[2]);
    // A TENTH OF THE BARREL, not two per cent of it. The police pistol and the officer are
    // 0.015 apart on a 0.24 barrel -- six per cent, which is the same joint exported twice and
    // is exactly the pair that is known to drop in with no placement at all. A tolerance that
    // calls that "no" is a tolerance that would have sent me back to nudging.
    const tol = .1 * Math.max(.05, Math.hypot(...a.off));
    const v = d < tol ? 'MATCH -- parent with identity, apply nothing'
            : dm < tol ? 'MATCH, X mirrored -- one is a left hand; still parent with identity'
            : 'no (' + d.toFixed(3) + ' apart, ' + dm.toFixed(3) + ' mirrored)';
    console.log('   ' + a.f.split('/').pop().padEnd(24) + ' vs ' + b.f.split('/').pop().padEnd(24) + ' ' + v);
  }
}
