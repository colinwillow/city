import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });

// ---- 1. Colin's normals: a zero-length normal normalizes to NaN in the shader ----
const colin = await io.read('/home/user/city/models/colin.glb');
for (const node of colin.getRoot().listNodes()) {
  const m = node.getMesh(); if (!m) continue;
  for (const p of m.listPrimitives()) {
    const N = p.getAttribute('NORMAL'); if (!N) { console.log(node.getName(), 'NO NORMAL ATTRIBUTE'); continue; }
    const v = [0,0,0]; let zero = 0, nan = 0, short = 0, minLen = 9;
    for (let i = 0; i < N.getCount(); i++) { N.getElement(i, v);
      const L = Math.hypot(v[0], v[1], v[2]);
      if (!isFinite(L)) nan++; else if (L < 1e-6) zero++; else if (L < .5) short++;
      if (isFinite(L)) minLen = Math.min(minLen, L); }
    console.log(node.getName().padEnd(12), 'normals: zero', zero, 'nan', nan, 'short(<0.5)', short, 'min |n|', minLen.toFixed(4));
  }
}

// ---- 2. rebuild the game's heightmap and walk a line across the bridge ----
const city = await io.read('/home/user/city/models/city.glb');
const HM = { x0: -430, z0: -260, w: 1050, h: 650, res: 1 };
const A = new Float32Array(HM.w * HM.h).fill(-1e9), COV = new Uint8Array(HM.w * HM.h);
const DECK = 12;
const isWalk = n => /^(land|green_|sand_|road_|parking_area|bridge|basketballcourt|park_[a-z]|farmstractures_11)/.test(n);
const isWater = n => /^water_/.test(n);
function raster(ax,ay,az,bx,by,bz,cx,cy,cz,cap,water,tag) {
  const ux=bx-ax,uy=by-ay,uz=bz-az,vx=cx-ax,vy=cy-ay,vz=cz-az;
  const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx; const nl=Math.hypot(nx,ny,nz);
  if (nl<1e-9 || ny/nl < .35) return;
  const i0=Math.max(0,Math.floor((Math.min(ax,bx,cx)-HM.x0))), i1=Math.min(HM.w-1,Math.ceil((Math.max(ax,bx,cx)-HM.x0)));
  const k0=Math.max(0,Math.floor((Math.min(az,bz,cz)-HM.z0))), k1=Math.min(HM.h-1,Math.ceil((Math.max(az,bz,cz)-HM.z0)));
  const det=ux*vz-uz*vx; if (Math.abs(det)<1e-9) return;
  for (let k=k0;k<=k1;k++){ const pz=HM.z0+k+.5;
    for (let i=i0;i<=i1;i++){ const px=HM.x0+i+.5;
      const wx=px-ax, wz=pz-az; const s=(wx*vz-wz*vx)/det, t=(ux*wz-uz*wx)/det;
      if (s<-1e-4||t<-1e-4||s+t>1+1e-4) continue;
      const y=ay+s*uy+t*vy; if (y>cap) continue; const idx=k*HM.w+i;
      if (water) { if (A[idx] < y-.15) A[idx]=-3; } else if (y>A[idx]) { A[idx]=y; COV[idx]=1; }
    } }
}
const nodes = city.getRoot().listNodes().filter(n => n.getMesh());
const qrot=(q,a)=>{const[x,y,z,w]=q;const ix=w*a[0]+y*a[2]-z*a[1],iy=w*a[1]+z*a[0]-x*a[2],iz=w*a[2]+x*a[1]-y*a[0],iw=-x*a[0]-y*a[1]-z*a[2];
  return[ix*w+iw*-x+iy*-z-iz*-y,iy*w+iw*-y+iz*-x-ix*-z,iz*w+iw*-z+ix*-y-iy*-x];};
function each(node, cb) {
  const t=node.getTranslation(), s=node.getScale(), q=node.getRotation(); const v=[0,0,0];
  for (const p of node.getMesh().listPrimitives()) {
    const pos=p.getAttribute('POSITION'), idx=p.getIndices(); const n=idx?idx.getCount():pos.getCount();
    for (let i=0;i+2<n;i+=3){ const tri=[];
      for (let k=0;k<3;k++){ pos.getElement(idx?idx.getScalar(i+k):i+k, v);
        const r=qrot(q,[v[0]*s[0],v[1]*s[1],v[2]*s[2]]); tri.push([r[0]+t[0],r[1]+t[1],r[2]+t[2]]); }
      cb(tri); } }
}
const waters=[]; let bridgeTris=0;
for (const node of nodes) {
  const nm=node.getName();
  if (isWater(nm)) { waters.push(node); continue; }
  if (!isWalk(nm)) continue;
  let mny=1e9; each(node, tri=>{ for(const p of tri) mny=Math.min(mny,p[1]); });
  const cap = mny + (/^(park_|basketball|farmstractures)/.test(nm) ? .6 : DECK);
  if (/^bridge/.test(nm)) console.log('\nBRIDGE', nm, 'world miny', mny.toFixed(2), '-> cap', cap.toFixed(2));
  each(node, tri => { if (/^bridge/.test(nm)) bridgeTris++; raster(tri[0][0],tri[0][1],tri[0][2],tri[1][0],tri[1][1],tri[1][2],tri[2][0],tri[2][1],tri[2][2],cap,false,nm); });
}
for (const node of waters) each(node, tri => raster(tri[0][0],tri[0][1],tri[0][2],tri[1][0],tri[1][1],tri[1][2],tri[2][0],tri[2][1],tri[2][2],1e9,true,'w'));
const at=(x,z)=>{const i=Math.round(x-HM.x0-.5), k=Math.round(z-HM.z0-.5); const v=A[k*HM.w+i]; return v<-1e8?'--':v.toFixed(1);};
console.log('bridge triangles seen', bridgeTris);
console.log('\nheight across the bridge (z=75, x from 0 to 110):');
let row=''; for (let x=0;x<=110;x+=5) row += String(x).padStart(4)+':'+at(x,75).padStart(5); console.log(row);
console.log('\nalong the elevated highway (x=-356, z from 0 to 200):');
row=''; for (let z=0;z<=200;z+=10) row += String(z).padStart(4)+':'+at(-356,z).padStart(5); console.log(row);

// ---- 3. every hole: a cell more than a step below the lowest of its four neighbours ----
const holes = [];
for (let k = 1; k < HM.h - 1; k++) for (let i = 1; i < HM.w - 1; i++) {
  const o = k * HM.w + i, c = A[o]; if (c < -1e8) continue;
  const nb = [A[o-1], A[o+1], A[o-HM.w], A[o+HM.w]].filter(v => v > -1e8);
  if (nb.length < 4) continue;
  const lo = Math.min(...nb);
  if (lo - c > 1.0) holes.push([HM.x0 + i + .5, HM.z0 + k + .5, c, lo]);
}
console.log('\nholes (cell >1m below all four neighbours):', holes.length);
const near = holes.filter(h => h[0] > -60 && h[0] < 160 && h[1] > 40 && h[1] < 110);
console.log('  near the bridge/ramps:', near.length, near.slice(0, 14).map(h => `(${h[0]|0},${h[1]|0}) ${h[2].toFixed(1)} vs ${h[3].toFixed(1)}`).join('  '));
console.log('  elsewhere sample:', holes.slice(0, 10).map(h => `(${h[0]|0},${h[1]|0}) ${h[2].toFixed(1)} vs ${h[3].toFixed(1)}`).join('  '));
// the ramp and bridge at 1 m
console.log('\nramp+bridge at 1 m (z=75, x -40..20):');
let r2 = ''; for (let x = -40; x <= 20; x++) r2 += at(x, 75) + ' '; console.log(r2);
console.log('\nacross the deck (x=55, z 55..95):');
r2 = ''; for (let z = 55; z <= 95; z++) r2 += at(55, z) + ' '; console.log(r2);
