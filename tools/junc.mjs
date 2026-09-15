// npm run junc -- rebuilds the road tile graph exactly as buildCity does and reports what a
// junction actually IS in this city: the degree histogram, how many conflict zones there
// are, how big they are, and how far apart. Placing a stop line by eye off a screenshot is
// how you get one in the middle of a straight.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
const doc = await io.read('models/city.glb');
const mul = (M, v) => [M[0]*v[0]+M[4]*v[1]+M[8]*v[2]+M[12], M[1]*v[0]+M[5]*v[1]+M[9]*v[2]+M[13], M[2]*v[0]+M[6]*v[1]+M[10]*v[2]+M[14]];
const tiles = [];
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  const nm = (node.getName() || mesh.getName() || '').replace(/[^A-Za-z0-9_]/g, '_');
  if (!/^road_/.test(nm)) continue;
  const M = node.getWorldMatrix();
  let mnx=1e9,mny=1e9,mnz=1e9,mxx=-1e9,mxy=-1e9,mxz=-1e9;
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION'); const e=[0,0,0];
    for (let i=0;i<pos.getCount();i++){ pos.getElement(i,e); const w=mul(M,e);
      if(w[0]<mnx)mnx=w[0]; if(w[1]<mny)mny=w[1]; if(w[2]<mnz)mnz=w[2];
      if(w[0]>mxx)mxx=w[0]; if(w[1]>mxy)mxy=w[1]; if(w[2]>mxz)mxz=w[2]; }
  }
  tiles.push({ nm, cx:(mnx+mxx)/2, cz:(mnz+mxz)/2, minx:mnx, maxx:mxx, minz:mnz, maxz:mxz,
               sx:mxx-mnx, sz:mxz-mnz, top:mxy, ramp:/^road_c_02/.test(nm), nb:[] });
}
for (let i=0;i<tiles.length;i++) for (let j=i+1;j<tiles.length;j++){
  const a=tiles[i],b=tiles[j];
  if (a.minx-.8<b.maxx && a.maxx+.8>b.minx && a.minz-.8<b.maxz && a.maxz+.8>b.minz && (a.ramp||b.ramp||Math.abs(a.top-b.top)<2.5)) { a.nb.push(b); b.nb.push(a); }
}
const deg = {};
for (const t of tiles) deg[t.nb.length] = (deg[t.nb.length]||0)+1;
console.log('road tiles', tiles.length);
console.log('degree:', Object.keys(deg).sort((a,b)=>a-b).map(k=>`${k}:${deg[k]}`).join('  '));

// a junction is a tile whose neighbours are NOT all on one line through it
const ax = t => { const s=new Set(); for(const n of t.nb){ const dx=n.cx-t.cx, dz=n.cz-t.cz;
  s.add(Math.abs(dx)>Math.abs(dz) ? (dx>0?'+X':'-X') : (dz>0?'+Z':'-Z')); } return s; };
let junc = [], through = 0;
for (const t of tiles) {
  const s = ax(t);
  const both = (s.has('+X')||s.has('-X')) && (s.has('+Z')||s.has('-Z'));
  if (both) junc.push(t); else through++;
}
console.log('conflict tiles (both axes present):', junc.length, ' straight/through:', through);
const sz = junc.map(t=>Math.max(t.sx,t.sz)).sort((a,b)=>a-b);
const q = p => sz.length ? sz[Math.min(sz.length-1, Math.floor(p*sz.length))].toFixed(1) : '-';
console.log('conflict tile size  min', q(0), ' p50', q(.5), ' p90', q(.9), ' max', q(.999));
const tsz = tiles.map(t=>Math.max(t.sx,t.sz)).sort((a,b)=>a-b);
console.log('ALL tile size       min', tsz[0].toFixed(1), ' p50', tsz[tsz.length>>1].toFixed(1), ' max', tsz[tsz.length-1].toFixed(1));
// how many conflict tiles are adjacent to another conflict tile (would merge into one box)
const J = new Set(junc);
let touching = 0; for (const t of junc) if (t.nb.some(n=>J.has(n))) touching++;
console.log('conflict tiles adjacent to another:', touching, `(${(100*touching/Math.max(1,junc.length)).toFixed(0)}%)`);
// nearest-neighbour spacing between conflict tiles
const d = [];
for (const t of junc) { let best=1e9; for (const o of junc) if (o!==t) { const dd=Math.hypot(o.cx-t.cx,o.cz-t.cz); if(dd<best)best=dd; } if(best<1e9) d.push(best); }
d.sort((a,b)=>a-b);
if (d.length) console.log('conflict spacing    min', d[0].toFixed(1), ' p50', d[d.length>>1].toFixed(1), ' p90', d[Math.floor(d.length*.9)].toFixed(1));

// ---- CLUSTER. A real intersection here is several tiles, not one: 99% of conflict tiles
// touch another. Union adjacent conflict tiles into ONE box, or a car would have to claim
// three zones in a row to cross one junction -- which is how you build a deadlock.
const par = new Map(); const find = a => { while (par.get(a) !== a) { par.set(a, par.get(par.get(a))); a = par.get(a); } return a; };
for (const t of junc) par.set(t, t);
for (const t of junc) for (const n of t.nb) if (J.has(n)) { const a=find(t), b=find(n); if (a!==b) par.set(a,b); }
const groups = new Map();
for (const t of junc) { const r = find(t); let g = groups.get(r); if (!g) groups.set(r, g=[]); g.push(t); }
console.log('\n--- clustered ---');
console.log('junction boxes:', groups.size, 'from', junc.length, 'conflict tiles');
const boxes = [...groups.values()].map(g => {
  let mnx=1e9,mxx=-1e9,mnz=1e9,mxz=-1e9;
  for (const t of g) { if(t.minx<mnx)mnx=t.minx; if(t.maxx>mxx)mxx=t.maxx; if(t.minz<mnz)mnz=t.minz; if(t.maxz>mxz)mxz=t.maxz; }
  return { n:g.length, cx:(mnx+mxx)/2, cz:(mnz+mxz)/2, sx:mxx-mnx, sz:mxz-mnz, r:Math.max(mxx-mnx,mxz-mnz)/2 };
});
const cnt = {}; for (const b of boxes) cnt[b.n]=(cnt[b.n]||0)+1;
console.log('tiles per box:', Object.keys(cnt).sort((a,b)=>a-b).map(k=>`${k}:${cnt[k]}`).join('  '));
const rs = boxes.map(b=>b.r).sort((a,b)=>a-b);
console.log('box radius   min', rs[0].toFixed(1), ' p50', rs[rs.length>>1].toFixed(1), ' p90', rs[Math.floor(rs.length*.9)].toFixed(1), ' max', rs[rs.length-1].toFixed(1));
const bd = [];
for (const b of boxes) { let best=1e9; for (const o of boxes) if (o!==b) { const dd=Math.hypot(o.cx-b.cx,o.cz-b.cz)-b.r-o.r; if(dd<best)best=dd; } if(best<1e9) bd.push(best); }
bd.sort((a,b)=>a-b);
console.log('CLEAR ROAD between boxes  min', bd[0].toFixed(1), ' p10', bd[Math.floor(bd.length*.1)].toFixed(1), ' p50', bd[bd.length>>1].toFixed(1), ' p90', bd[Math.floor(bd.length*.9)].toFixed(1));
console.log('boxes with < 12 m of clear road to the next:', bd.filter(v=>v<12).length, 'of', bd.length);
