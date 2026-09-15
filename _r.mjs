import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
const doc = await io.read('models/colin.glb');
const want = ['idle_neutral','walk_fwd_neutral','run_fwd','rifle_idle_01','rifle_walk_fwd_01','rifle_run_fwd_01','rifle_strafe_left','rifle_strafe_right','rifle_shoot_stationary_01'];
console.log('HIPS TRANSLATION per clip (file units; Colin renders at x0.01273)');
console.log('clip                        x range        y range        z range     TRAVEL');
for (const nm of want) {
  const a = doc.getRoot().listAnimations().find(x=>x.getName()===nm);
  if (!a) { console.log('  ' + nm + ' MISSING'); continue; }
  const ch = a.listChannels().find(c => c.getTargetPath()==='translation' && c.getTargetNode() && /Hips$/.test(c.getTargetNode().getName()));
  if (!ch) { console.log('  ' + nm.padEnd(26) + 'no hips translation track'); continue; }
  const v = ch.getSampler().getOutput().getArray();
  const mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9];
  for (let i=0;i+2<v.length;i+=3) for (let k=0;k<3;k++){ mn[k]=Math.min(mn[k],v[i+k]); mx[k]=Math.max(mx[k],v[i+k]); }
  const first=[v[0],v[1],v[2]], last=[v[v.length-3],v[v.length-2],v[v.length-1]];
  const travel = Math.hypot(last[0]-first[0], last[2]-first[2]);
  const r = k => (mx[k]-mn[k]).toFixed(1).padStart(6);
  console.log('  ' + nm.padEnd(26) + r(0) + '  ' + ('y '+mn[1].toFixed(1)+'..'+mx[1].toFixed(1)).padEnd(15) + r(2) + '   ' + travel.toFixed(1).padStart(6) + ' u = ' + (travel*0.01273).toFixed(3) + ' m');
}
