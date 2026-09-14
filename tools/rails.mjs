// WHAT COMES OUT OF THE METAL. Runs the same clustering and line fit the game does over the
// ramp file, so "how many grind rails are there and how long are they" is answered before a
// mechanic is built on top of it rather than after. Placement is irrelevant here -- the rails
// are rigid, so their count and length are the same wherever the ramp is dropped.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
const doc = await io.read(process.argv[2] || 'models/ramps/skate_ramps_fun_boxes.glb');
const G = { lip: .22, link: 1.5, minLen: 2.0 };
const mul = (M, v) => [M[0]*v[0]+M[4]*v[1]+M[8]*v[2]+M[12], M[1]*v[0]+M[5]*v[1]+M[9]*v[2]+M[13], M[2]*v[0]+M[6]*v[1]+M[10]*v[2]+M[14]];

let total = 0;
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  const M = node.getWorldMatrix();
  const out = [];
  for (const prim of mesh.listPrimitives()) {
    const mat = prim.getMaterial();
    if (!mat || !/metal/i.test(mat.getName())) continue;
    const pos = prim.getAttribute('POSITION'), n = pos.getCount(), e = [0, 0, 0];
    const pts = new Float64Array(n * 3); let top = -Infinity;
    for (let i = 0; i < n; i++) { pos.getElement(i, e); const w = mul(M, e); pts[i*3]=w[0]; pts[i*3+1]=w[1]; pts[i*3+2]=w[2]; if (w[1] > top) top = w[1]; }
    const keep = []; for (let i = 0; i < n; i++) if (pts[i*3+1] > top - G.lip) keep.push(i);
    const used = new Uint8Array(keep.length);
    for (let a = 0; a < keep.length; a++) {
      if (used[a]) continue;
      const run = [keep[a]]; used[a] = 1;
      for (let grew = 1; grew;) { grew = 0;
        for (let b = 0; b < keep.length; b++) { if (used[b]) continue; const i = keep[b]*3;
          for (const j0 of run) { const j = j0*3;
            if (Math.hypot(pts[i]-pts[j], pts[i+2]-pts[j+2]) <= G.link) { run.push(keep[b]); used[b]=1; grew=1; break; } } } }
      if (run.length < 4) continue;
      let mx=0,mz=0,my=0; for (const i of run){mx+=pts[i*3];my+=pts[i*3+1];mz+=pts[i*3+2];}
      mx/=run.length; my/=run.length; mz/=run.length;
      let sxx=0,sxz=0,szz=0;
      for (const i of run){const dx=pts[i*3]-mx, dz=pts[i*3+2]-mz; sxx+=dx*dx; sxz+=dx*dz; szz+=dz*dz;}
      const tr=sxx+szz, det=sxx*szz-sxz*sxz, ev=tr/2+Math.sqrt(Math.max(0,tr*tr/4-det));
      let ux=sxz, uz=ev-sxx; if (Math.hypot(ux,uz)<1e-6){ux=ev-szz;uz=sxz;}
      const ul=Math.hypot(ux,uz)||1; ux/=ul; uz/=ul;
      let lo=Infinity,hi=-Infinity;
      for (const i of run){const t=(pts[i*3]-mx)*ux+(pts[i*3+2]-mz)*uz; if(t<lo)lo=t; if(t>hi)hi=t;}
      const len = hi-lo;
      out.push({ len, y: my, pts: run.length, kept: keep.length, taken: len >= G.minLen });
    }
  }
  if (!out.length) { console.log(('[' + node.getName() + ']').padEnd(24), 'no metal'); continue; }
  const taken = out.filter(r => r.taken);
  total += taken.length;
  console.log(('[' + node.getName() + ']').padEnd(24), taken.length + ' rails kept of ' + out.length + ' runs   ' +
    out.map(r => r.len.toFixed(1) + 'm@y' + r.y.toFixed(2) + (r.taken ? '' : ' (too short)')).join('  '));
}
console.log('\n' + total + ' rails per copy of the file. Each spot in PARK.spots places one ramp.');
