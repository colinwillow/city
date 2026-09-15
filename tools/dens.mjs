// npm run dens -- how many cars the city actually puts on the road, and how much road there
// is to put them on. `npm run cross` already proves the crossing RULE clears every standoff
// it is given; what it cannot see is DENSITY, because it places four to twelve cars at one
// junction. A jam that no rule can fix is a road with more car on it than gap.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule() });
const doc = await io.read('models/city.glb');
const mul = (M, v) => [M[0]*v[0]+M[4]*v[1]+M[8]*v[2]+M[12], M[1]*v[0]+M[5]*v[1]+M[9]*v[2]+M[13], M[2]*v[0]+M[6]*v[1]+M[10]*v[2]+M[14]];
const bounds = (node, mesh) => {
  const M = node.getWorldMatrix();
  let mnx=1e9,mny=1e9,mnz=1e9,mxx=-1e9,mxy=-1e9,mxz=-1e9;
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION'); const e=[0,0,0];
    for (let i=0;i<pos.getCount();i++){ pos.getElement(i,e); const w=mul(M,e);
      if(w[0]<mnx)mnx=w[0]; if(w[1]<mny)mny=w[1]; if(w[2]<mnz)mnz=w[2];
      if(w[0]>mxx)mxx=w[0]; if(w[1]>mxy)mxy=w[1]; if(w[2]>mxz)mxz=w[2]; }
  }
  return { mnx,mny,mnz,mxx,mxy,mxz, cx:(mnx+mxx)/2, cy:(mny+mxy)/2, cz:(mnz+mxz)/2 };
};
const tiles = [], carsRaw = [];
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  const nm = (node.getName() || mesh.getName() || '').replace(/[^A-Za-z0-9_]/g, '_');
  if (/^road_/.test(nm)) {
    const b = bounds(node, mesh);
    tiles.push({ nm, ...b, sx:b.mxx-b.mnx, sz:b.mxz-b.mnz, ramp:/^road_c_02/.test(nm), nb:[] });
  } else if (/^(car|truck|van|bus|tractor)/.test(nm)) {
    const b = bounds(node, mesh);
    carsRaw.push({ nm, x:b.cx, z:b.cz, len: Math.max(b.mxx-b.mnx, b.mxz-b.mnz) });
  }
}
for (let i=0;i<tiles.length;i++) for (let j=i+1;j<tiles.length;j++){
  const a=tiles[i],b=tiles[j];
  if (a.mnx-.8<b.mxx && a.mxx+.8>b.mnx && a.mnz-.8<b.mxz && a.mxz+.8>b.mnz && (a.ramp||b.ramp||Math.abs(a.mxy-b.mxy)<2.5)) { a.nb.push(b); b.nb.push(a); }
}
// buildCity's own test: on a road tile with at least one neighbour, and not a tractor
let driving = 0, parked = 0, lenSum = 0;
for (const c of carsRaw) {
  const t = tiles.find(t => c.x >= t.mnx-.5 && c.x <= t.mxx+.5 && c.z >= t.mnz-.5 && c.z <= t.mxz+.5);
  if (!t || t.nb.length === 0 || /^tractor/.test(c.nm)) { parked++; continue; }
  driving++; lenSum += c.len;
}
// road length: each tile is a slab; its LENGTH is its long side, and the game runs TWO lanes
// down it (car.lane is 0 or 1), so the lane-metres available are 2x the centreline.
let road = 0; for (const t of tiles) if (t.nb.length) road += Math.max(t.sx, t.sz);
const lane = road * 2;
const TRAF = { gap: 6.5 };
const carLen = lenSum / Math.max(1, driving);
console.log('road tiles', tiles.length, ' connected', tiles.filter(t=>t.nb.length).length);
console.log('cars in the file', carsRaw.length, ' -> DRIVING', driving, ' parked/props', parked);
console.log('centreline road', road.toFixed(0), 'm   ->', lane.toFixed(0), 'lane-metres (two lanes a slab)');
console.log('mean car length', carLen.toFixed(1), 'm');
const need = driving * (carLen + TRAF.gap);
console.log('');
console.log('a car in a queue occupies its own length + TRAF.gap =', (carLen + TRAF.gap).toFixed(1), 'm');
console.log('  ' + driving + ' of them need ' + need.toFixed(0) + ' lane-metres to STAND STILL nose to tail');
console.log('  the city has ' + lane.toFixed(0) + '  ->  OCCUPANCY ' + (100*need/lane).toFixed(0) + '%');
console.log('');
console.log('  headway per car: ' + (lane/driving).toFixed(1) + ' m   (TRAF.gap is ' + TRAF.gap + ', a car is ' + carLen.toFixed(1) + ')');
for (const frac of [1, .8, .7, .6, .5]) {
  const n = Math.round(driving*frac);
  console.log(('   keep ' + (frac*100).toFixed(0) + '%').padEnd(14) + String(n).padStart(4) + ' cars   headway ' +
    (lane/n).toFixed(1) + ' m   occupancy ' + (100*n*(carLen+TRAF.gap)/lane).toFixed(0) + '%');
}
