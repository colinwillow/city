// npm run ladders -- where does a ladder belong?
//
// Placing one by eye off a screenshot is how you get a ladder up the inside of a wall, or one
// whose foot is in the water. A ladder is only worth having where the jumps CANNOT reach: a
// charge jump into a double tops out at 8.04 m and the grab window adds 2.15, so anything
// under about 10.2 m is already climbable and does not want one.
//
// So: every building over that, with a wall face that has flat open GROUND in front of it,
// and the bearing of that face. Ground comes from the same road/land meshes the collider is
// built from, sampled on a grid, so "there is somewhere to stand" is measured rather than hoped.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
const doc = await io.read('models/city.glb');
const mul = (M, v) => [M[0]*v[0]+M[4]*v[1]+M[8]*v[2]+M[12], M[1]*v[0]+M[5]*v[1]+M[9]*v[2]+M[13], M[2]*v[0]+M[6]*v[1]+M[10]*v[2]+M[14]];
const REACH = Number(process.argv[2] || 10.2);

const isGround = n => /^(land|green_|sand_|road_|parking_area|basketballcourt|park_[a-z])/.test(n);
const isBuild  = n => /^(house|skyscraper|office|tower|building|shop|hotel|bank|mall|apart|travel|gasstation|market|milk|farmbuilding)/i.test(n);
const build = [], gcell = new Map(), G = 3;                    // ground presence on a 3 m grid
const gk = (i, k) => i * 100003 + k;
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  const nm = (node.getName() || mesh.getName() || '').replace(/[^A-Za-z0-9_]/g, '_');
  const g = isGround(nm), b = isBuild(nm);
  if (!g && !b) continue;
  const M = node.getWorldMatrix();
  let mnx=1e9,mnz=1e9,mxx=-1e9,mxz=-1e9,mny=1e9,mxy=-1e9;
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION'); const e=[0,0,0];
    for (let i=0;i<pos.getCount();i++) { pos.getElement(i,e); const w=mul(M,e);
      if(w[0]<mnx)mnx=w[0]; if(w[0]>mxx)mxx=w[0]; if(w[2]<mnz)mnz=w[2]; if(w[2]>mxz)mxz=w[2];
      if(w[1]<mny)mny=w[1]; if(w[1]>mxy)mxy=w[1];
      if (g) gcell.set(gk(Math.round(w[0]/G), Math.round(w[2]/G)), w[1]); }
  }
  if (b) build.push({ nm, mnx, mxx, mnz, mxz, mny, mxy, h: mxy - mny });
}
const ground = (x, z) => gcell.get(gk(Math.round(x/G), Math.round(z/G)));
const tall = build.filter(b => b.h > REACH).sort((a, b) => b.h - a.h);
console.log(build.length + ' buildings, ' + tall.length + ' of them over ' + REACH.toFixed(1) + ' m (what a charge jump into a double can already grab)\n');
const out = [];
for (const b of tall) {
  // the four faces, each probed a little way out from the middle of its wall
  const cx = (b.mnx + b.mxx) / 2, cz = (b.mnz + b.mxz) / 2;
  const faces = [
    { n: '+X', x: b.mxx, z: cz, nx: 1, nz: 0 }, { n: '-X', x: b.mnx, z: cz, nx: -1, nz: 0 },
    { n: '+Z', x: cx, z: b.mxz, nx: 0, nz: 1 }, { n: '-Z', x: cx, z: b.mnz, nx: 0, nz: -1 },
  ];
  let pick = null;
  for (const f of faces) {
    // three samples out from the wall: he needs somewhere to stand AND room to back off
    const ys = [1.6, 3.0, 4.5].map(d => ground(f.x + f.nx * d, f.z + f.nz * d));
    if (ys.some(y => y === undefined)) continue;
    const lo = Math.min(...ys), hi = Math.max(...ys);
    if (hi - lo > 1.2) continue;                              // not flat enough to stand on
    if (lo < .2) continue;                                    // water, or below the roads
    const score = Math.abs(lo - b.mny);                       // the foot should meet the base
    if (!pick || score < pick.score) pick = { f, y: lo, score };
  }
  if (!pick) { console.log('  ' + b.nm.slice(0,22).padEnd(22) + ' h ' + b.h.toFixed(1).padStart(5) + '   no face with open ground'); continue; }
  const f = pick.f;
  const rot = Math.atan2(f.nx, f.nz);                          // the way the ladder FACES (out of the wall)
  out.push({ nm: b.nm, x: +(f.x + f.nx * .35).toFixed(1), z: +(f.z + f.nz * .35).toFixed(1),
             y: +pick.y.toFixed(2), top: +b.mxy.toFixed(1), rot: +rot.toFixed(3), face: f.n });
  console.log('  ' + b.nm.slice(0,22).padEnd(22) + ' h ' + b.h.toFixed(1).padStart(5) +
              '   face ' + f.n + '   foot (' + out[out.length-1].x + ', ' + out[out.length-1].y + ', ' + out[out.length-1].z + ')  top ' + out[out.length-1].top);
}
console.log('\nLADDERS.spots:');
for (const o of out) console.log('  { x: ' + o.x + ', y: ' + o.y + ', z: ' + o.z + ', top: ' + o.top + ', rot: ' + o.rot + ' },   // ' + o.nm + ', ' + o.face);
