// IS THE WINDING BACKWARDS, ARE THE NORMALS BACKWARDS, OR BOTH. They look identical in the
// viewport and they break completely different things:
//   winding reversed  -> the geometric normal points DOWN, and triAdd rejects a downward face
//                        as "not a floor". Nothing collides with it.
//   normals reversed  -> the stored vertex normal faces away from the sun, so it shades BLACK.
// A surface that is black AND has no collision has both, which is one mesh exported inside
// out. This counts each separately, per mesh, over the walkable geometry only.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
const doc = await io.read('models/city.glb');
const isWalk = n => /^(land|green_|sand_|road_|parking_area|bridge|basketballcourt|park_[a-z]|farmstractures_11)/.test(n);
const mul = (M, v) => [M[0]*v[0]+M[4]*v[1]+M[8]*v[2]+M[12], M[1]*v[0]+M[5]*v[1]+M[9]*v[2]+M[13], M[2]*v[0]+M[6]*v[1]+M[10]*v[2]+M[14]];
const rot = (M, v) => [M[0]*v[0]+M[4]*v[1]+M[8]*v[2], M[1]*v[0]+M[5]*v[1]+M[9]*v[2], M[2]*v[0]+M[6]*v[1]+M[10]*v[2]];
const bad = [];
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  const nm = (node.getName() || mesh.getName() || '').replace(/[^A-Za-z0-9_]/g, '_');
  if (!isWalk(nm)) continue;
  const M = node.getWorldMatrix();
  let up = 0, down = 0, steep = 0, disagree = 0, agree = 0;
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION'), nor = prim.getAttribute('NORMAL'), ind = prim.getIndices();
    const n = pos.getCount(), e = [0,0,0];
    const P = new Float64Array(n*3), N = nor ? new Float64Array(n*3) : null;
    for (let i=0;i<n;i++){ pos.getElement(i,e); const w=mul(M,e); P[i*3]=w[0];P[i*3+1]=w[1];P[i*3+2]=w[2];
      if (nor){ nor.getElement(i,e); const r=rot(M,e); N[i*3]=r[0];N[i*3+1]=r[1];N[i*3+2]=r[2]; } }
    const arr = ind ? ind.getArray() : null, cnt = ind ? ind.getCount() : n;
    for (let i=0;i+2<cnt;i+=3){
      const a=(arr?arr[i]:i)*3, b=(arr?arr[i+1]:i+1)*3, c=(arr?arr[i+2]:i+2)*3;
      const ux=P[b]-P[a], uy=P[b+1]-P[a+1], uz=P[b+2]-P[a+2];
      const vx=P[c]-P[a], vy=P[c+1]-P[a+1], vz=P[c+2]-P[a+2];
      const gx=uy*vz-uz*vy, gy=uz*vx-ux*vz, gz=ux*vy-uy*vx;
      const gl=Math.hypot(gx,gy,gz); if (gl<1e-12) continue;
      const ny=gy/gl;
      if (ny > .35) up++; else if (ny < -.35) down++; else steep++;
      if (N){ const d = (gx*N[a]+gy*N[a+1]+gz*N[a+2]); if (d < 0) disagree++; else agree++; }
    }
  }
  const tot = up+down+steep;
  if (!tot) continue;
  // a mesh is inside out when most of its ground faces point down, or when its stored normals
  // fight the winding
  // a slab HAS an underside, so plenty of down faces is normal. Inside out is when the
  // down faces outnumber the up ones, or the stored normals fight the winding.
  if (down > up || disagree > agree) bad.push({ nm, up, down, steep, disagree, agree, tot });
}
bad.sort((a,b)=>(b.down/(b.up||.5))-(a.down/(a.up||.5)));
if (!bad.length) console.log('every walkable mesh winds the right way and its normals agree with it.');
for (const b of bad) console.log(b.nm.padEnd(26),
  'faces up ' + String(b.up).padStart(6) + '  DOWN ' + String(b.down).padStart(6) + '  vertical ' + String(b.steep).padStart(5) +
  '   normals disagree with winding ' + b.disagree + '/' + (b.disagree + b.agree));
console.log('\n(down-facing ground faces are the ones triAdd throws away as "not a floor")');
