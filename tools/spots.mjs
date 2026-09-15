// WHERE IS THERE ROOM. Rebuilds enough of the world offline to answer one question: which
// flat, open, already-empty patches of ground are big enough to drop a skate park into.
// Guessing coordinates off a screenshot is how you end up with a half pipe inside a bank.
//
//   npm run spots            -- default 26 m square
//   npm run spots 34         -- ask for a bigger one
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
const doc = await io.read('models/city.glb');

const WANT = +(process.argv[2] || 26);          // metres of clear square wanted
const C = 2;                                     // cell size
const X0 = -440, Z0 = -280, W = 560, H = 380;    // cells, covering the TRI collider's range
const idx = (i, k) => k * W + i;
const hi = new Float32Array(W * H).fill(-Infinity);   // walkable surface height
const lo = new Float32Array(W * H).fill(Infinity);
const kind = new Uint8Array(W * H);              // 1 road, 2 good ground (park/lot/court/land)
const block = new Uint8Array(W * H);             // anything solid stands here

const isCar = n => /^(car|jeep|truck|tractor)_/.test(n);
const isWalk = n => /^(land|green_|sand_|road_|parking_area|bridge|basketballcourt|park_[a-z]|farmstractures_11)/.test(n);
// `land` is the whole terrain and matches everywhere, which is why ranking on it returned
// twenty-two thousand identical fields. A GOOD spot is a built surface someone would skate.
const good = n => /^(parking_area|basketballcourt|green_|park_[a-z])/.test(n);
const SPAWN = { x: -100.8, z: 0 };               // rank by how far he has to go to find it
const mul = (M, v) => [M[0]*v[0]+M[4]*v[1]+M[8]*v[2]+M[12], M[1]*v[0]+M[5]*v[1]+M[9]*v[2]+M[13], M[2]*v[0]+M[6]*v[1]+M[10]*v[2]+M[14]];

for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  const nm = (node.getName() || mesh.getName() || '').replace(/[^A-Za-z0-9_]/g, '_');
  if (isCar(nm) || /^(water_|airballoon|landscape)/.test(nm)) continue;
  const M = node.getWorldMatrix(), walk = isWalk(nm), e = [0, 0, 0];
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION'), ind = prim.getIndices();
    const n = pos.getCount(); const wv = new Float64Array(n * 3);
    for (let i = 0; i < n; i++) { pos.getElement(i, e); const w = mul(M, e); wv[i*3]=w[0]; wv[i*3+1]=w[1]; wv[i*3+2]=w[2]; }
    const arr = ind ? ind.getArray() : null, cnt = ind ? ind.getCount() : n;
    for (let i = 0; i + 2 < cnt; i += 3) {
      const a=(arr?arr[i]:i)*3, b=(arr?arr[i+1]:i+1)*3, c=(arr?arr[i+2]:i+2)*3;
      let i0=Math.floor((Math.min(wv[a],wv[b],wv[c])-X0)/C), i1=Math.floor((Math.max(wv[a],wv[b],wv[c])-X0)/C);
      let k0=Math.floor((Math.min(wv[a+2],wv[b+2],wv[c+2])-Z0)/C), k1=Math.floor((Math.max(wv[a+2],wv[b+2],wv[c+2])-Z0)/C);
      if (i1 < 0 || k1 < 0 || i0 >= W || k0 >= H) continue;
      i0=Math.max(0,i0); k0=Math.max(0,k0); i1=Math.min(W-1,i1); k1=Math.min(H-1,k1);
      const y0=Math.min(wv[a+1],wv[b+1],wv[c+1]), y1=Math.max(wv[a+1],wv[b+1],wv[c+1]);
      for (let k=k0;k<=k1;k++) for (let j=i0;j<=i1;j++) { const o=idx(j,k);
        if (walk) { if (y1 > hi[o]) hi[o]=y1; if (y0 < lo[o]) lo[o]=y0; if (!kind[o] || good(nm)) kind[o] = good(nm) ? 2 : 1; }
        else if (y1 > 0.35) block[o] = 1;      // anything standing proud of the ground
      }
    }
  }
}

// the best clear square: every cell walkable, unblocked, and within FLAT of the patch mean
const FLAT = .45, side = Math.ceil(WANT / C);
const hits = [];
for (let k = 0; k + side < H; k++) {
  for (let i = 0; i + side < W; i++) {
    let ok = true, sum = 0, mn = 1e9, mx = -1e9, nGood = 0;
    for (let b = 0; b < side && ok; b++) for (let a = 0; a < side; a++) {
      const o = idx(i + a, k + b);
      if (block[o] || hi[o] === -Infinity) { ok = false; break; }
      sum += hi[o]; if (hi[o] < mn) mn = hi[o]; if (hi[o] > mx) mx = hi[o];
      if (kind[o] === 2) nGood++;
    }
    if (!ok || mx - mn > FLAT) continue;
    const n = side * side;
    hits.push({ x: X0 + (i + side / 2) * C, z: Z0 + (k + side / 2) * C, y: sum / n,
                flat: mx - mn, good: nGood / n });
  }
}
// keep them apart so the list is distinct places rather than one place listed a hundred times
// near first, then how much of it is a built surface rather than bare land
for (const h of hits) h.d = Math.hypot(h.x - SPAWN.x, h.z - SPAWN.z);
hits.sort((a, b) => (b.good - a.good) || (a.d - b.d));
// `npm run spots 5 spread 8` -- eight places SPREAD ACROSS THE MAP rather than the eight
// nearest the spawn. Farthest-point sampling: take the best one, then repeatedly take whatever
// is furthest from everything already taken. The near-first list is the right answer for "where
// do I put a half pipe he will actually find"; it is the wrong one for anything that wants to
// be distributed, and asking it for six police spots put four of them in a rank eight metres
// apart on one verge, which is what he saw.
const SPREAD = process.argv.includes('spread') ? (+process.argv[process.argv.indexOf('spread') + 1] || 8) : 0;
const keep = [];
if (SPREAD) {
  const pool = hits.filter(h => h.good > .5);
  if (pool.length) {
    keep.push(pool[0]);
    while (keep.length < SPREAD && keep.length < pool.length) {
      let best = null, bd = -1;
      for (const h of pool) {
        let d = 1e9;
        for (const k of keep) d = Math.min(d, Math.hypot(k.x - h.x, k.z - h.z));
        if (d > bd) { bd = d; best = h; }
      }
      if (!best || bd < WANT * 2) break;
      keep.push(best);
    }
  }
} else
for (const h of hits) { if (keep.some(k => Math.hypot(k.x - h.x, k.z - h.z) < WANT * 1.6)) continue; keep.push(h); if (keep.length >= 12) break; }
console.log('clear ' + WANT + ' m squares, best first (good = fraction on park/lot/court rather than road)\n');
for (const h of keep) console.log('  x ' + h.x.toFixed(1).padStart(7) + '  z ' + h.z.toFixed(1).padStart(7) +
  '  y ' + h.y.toFixed(2).padStart(6) + '   flat ' + h.flat.toFixed(2) + '   good ' + (h.good * 100).toFixed(0).padStart(3) + '%   ' + h.d.toFixed(0).padStart(4) + ' m from spawn');
console.log('\n' + hits.length + ' candidate squares in total.');
