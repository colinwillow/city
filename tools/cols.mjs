import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
const doc = await io.read('models/city.glb');
const COLS = { cell: .7, max: 16384, tris: 40000, flat: .80, most: .90, tol: .45 };
const _lo = new Float32Array(COLS.max), _hi = new Float32Array(COLS.max);
const isCar = n => /^(car|jeep|truck|tractor)_/.test(n);
const isWalk = n => /^(land|green_|sand_|road_|parking_area|bridge|basketballcourt|park_[a-z]|farmstractures_11)/.test(n);
const mul = (M, v) => [M[0]*v[0]+M[4]*v[1]+M[8]*v[2]+M[12], M[1]*v[0]+M[5]*v[1]+M[9]*v[2]+M[13], M[2]*v[0]+M[6]*v[1]+M[10]*v[2]+M[14]];
let over = 0; const overNm = new Set(); let boxes = 0, split = 0, kept = 0, worst = [], t0 = Date.now(), tris = 0;
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  const nm = (node.getName() || mesh.getName() || '').replace(/[^A-Za-z0-9_]/g, '_');
  if (isCar(nm) || isWalk(nm) || /^water_/.test(nm) || /^tree/.test(nm) || /^(airballoon|landscape)/.test(nm)) continue;
  const M = node.getWorldMatrix();
  // world verts + bbox
  const P = []; let mnx=1e9,mny=1e9,mnz=1e9,mxx=-1e9,mxy=-1e9,mxz=-1e9, cnt=0;
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION'), idx = prim.getIndices();
    const n = pos.getCount(); const wv = new Float64Array(n*3); const e=[0,0,0];
    for (let i=0;i<n;i++){ pos.getElement(i,e); const w=mul(M,e); wv[i*3]=w[0]; wv[i*3+1]=w[1]; wv[i*3+2]=w[2];
      if(w[0]<mnx)mnx=w[0]; if(w[1]<mny)mny=w[1]; if(w[2]<mnz)mnz=w[2];
      if(w[0]>mxx)mxx=w[0]; if(w[1]>mxy)mxy=w[1]; if(w[2]>mxz)mxz=w[2]; }
    const ind = idx ? idx.getArray() : null; const c = idx ? idx.getCount() : n; cnt += c;
    P.push({ wv, ind, c });
  }
  tris += cnt/3;
  const sx = mxx-mnx, sz = mxz-mnz, sy = mxy-mny;
  if (cnt > COLS.tris*3 || sy < .8 || !(sx>0) || !(sz>0)) { boxes++; kept++; continue; }
  let cell = COLS.cell, w = Math.ceil(sx/cell), d = Math.ceil(sz/cell);
  while (w*d > COLS.max) { cell *= 1.4; w = Math.ceil(sx/cell); d = Math.ceil(sz/cell); }
  w=Math.max(1,w); d=Math.max(1,d); const N=w*d;
  for (let i=0;i<N;i++){_lo[i]=Infinity;_hi[i]=-Infinity;}
  for (const {wv, ind, c} of P) for (let i=0;i+2<c;i+=3) {
    const a=(ind?ind[i]:i)*3, b2=(ind?ind[i+1]:i+1)*3, c2=(ind?ind[i+2]:i+2)*3;
    const y0=Math.min(wv[a+1],wv[b2+1],wv[c2+1]), y1=Math.max(wv[a+1],wv[b2+1],wv[c2+1]);
    let i0=((Math.min(wv[a],wv[b2],wv[c2])-mnx)/cell)|0, i1=((Math.max(wv[a],wv[b2],wv[c2])-mnx)/cell)|0;
    let k0=((Math.min(wv[a+2],wv[b2+2],wv[c2+2])-mnz)/cell)|0, k1=((Math.max(wv[a+2],wv[b2+2],wv[c2+2])-mnz)/cell)|0;
    if(i0<0)i0=0; if(i1>w-1)i1=w-1; if(k0<0)k0=0; if(k1>d-1)k1=d-1;
    for(let k=k0;k<=k1;k++){const row=k*w; for(let j=i0;j<=i1;j++){const o=row+j; if(y0<_lo[o])_lo[o]=y0; if(y1>_hi[o])_hi[o]=y1;}}
  }
  let cov=0, prism=0;
  for(let o=0;o<N;o++) if(_hi[o]>-Infinity){cov++; if(_hi[o]-_lo[o]>=COLS.flat*sy)prism++;}
  if(!cov || prism>=cov*COLS.most){ boxes++; kept++; continue; }
  let made=0;
  for(let k=0;k<d;k++){ const row=k*w; let j=0;
    while(j<w){ if(_hi[row+j]===-Infinity){j++;continue;}
      let lo=_lo[row+j],hi=_hi[row+j],e=j;
      while(e+1<w){ const o2=row+e+1; if(_hi[o2]===-Infinity)break;
        const nlo=Math.min(lo,_lo[o2]),nhi=Math.max(hi,_hi[o2]);
        if(nhi-nlo>hi-lo+COLS.tol)break; lo=nlo;hi=nhi;e++; }
      if (lo > 2.2) over++; if (lo > 2.2) overNm.add(nm);
      made++; j=e+1; } }
  boxes+=made; split++;
  worst.push([nm, made, cell.toFixed(2)]);
}
console.log('solid meshes seen  :', kept+split, ' tris', tris|0);
console.log('kept their box     :', kept);
console.log('split into columns :', split);
console.log('TOTAL solid boxes  :', boxes, '   (was', kept+split, '- one per mesh)');
console.log('rasterise time     :', (Date.now()-t0)+'ms  (node; the browser does the same work at boot)');
console.log('boxes whose BOTTOM is above 2.2 m (walk-under air that used to be solid):', over, 'across', overNm.size, 'meshes');
console.log('  e.g.', [...overNm].slice(0,16).join(', '));
worst.sort((a,b)=>b[1]-a[1]);
console.log('most boxes from one mesh:', worst.slice(0,10).map(x=>x[0]+' '+x[1]+'@'+x[2]+'m').join('  '));
