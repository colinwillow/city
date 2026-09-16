// A SEARCH, because four derivations in a row were wrong. The Hips track needs some
// q -> X * q * Y. Rather than reason about which X and Y, try every pairing of the
// quaternions actually available and ask the real mixer which one stands him up, at the
// right height, ON the ground, and STAYS there across the clip.
import { readFileSync, mkdirSync, existsSync, writeFileSync } from 'fs';
if (!existsSync('node_modules/three/package.json')) {
  mkdirSync('node_modules/three', { recursive: true });
  writeFileSync('node_modules/three/package.json', JSON.stringify({ name:'three', version:'0.180.0-vendored', type:'module', main:'index.js', exports:{'.':'./index.js'} }));
  writeFileSync('node_modules/three/index.js', "export * from '../../vendor/three.module.min.js';\n");
}
const THREE = await import('three');
const { GLTFLoader } = await import('../vendor/GLTFLoader.js');
const { retargetClip } = await import('../vendor/SkeletonUtils.js');
const { NodeIO } = await import('@gltf-transform/core');
const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
const draco3d = (await import('draco3dgltf')).default;
const gio = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
const TMP='tools/.wear-tmp/'; mkdirSync(TMP,{recursive:true});
async function prep(f){ const out=TMP+f.split('/').pop(); const d=await gio.read(f);
  for(const t of d.getRoot().listTextures()) t.dispose();
  for(const e of d.getRoot().listExtensionsUsed()) if(/draco/i.test(e.extensionName)) e.dispose();
  await gio.write(out,d); return out; }
const loader=new GLTFLoader();
// **`readFileSync(f).buffer` IS THE SHARED POOL FOR A SMALL FILE, NOT THE FILE.** Node allocates
// anything under ~4 KB out of an 8 KB pool, so `.buffer.slice(0)` starts at the beginning of the
// POOL and hands the loader whatever was sitting in it -- which parses as garbage. Every
// character GLB is megabytes and gets its own ArrayBuffer, so this was invisible until a 3 KB
// garment went through it. Slice by the buffer's OWN view.
const load = f => { const b = readFileSync(f); return new Promise((res, rej) =>
  loader.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '', res, rej)); };
const FILES={colin:'models/colin.glb',robot:'models/chars/robot.glb',moussa:'models/chars/moussa_robit.glb',alien:'models/chars/alien_orange.glb'};
const gl={}; for(const k in FILES) gl[k]=await load(await prep(FILES[k]));

function rig(gltf,key){ const model=gltf.scene; model.updateMatrixWorld(true);
  const hips=model.getObjectByName('mixamorig_Hips');
  const A=new THREE.Quaternion(); if(hips&&hips.parent) hips.parent.getWorldQuaternion(A);
  const r=hips?hips.quaternion.clone():new THREE.Quaternion();
  let lo=Infinity,hi=-Infinity; model.traverse(o=>{ if(!o.isMesh||!o.geometry)return;
    if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
    lo=Math.min(lo,o.geometry.boundingBox.min.y); hi=Math.max(hi,o.geometry.boundingBox.max.y); });
  const k=hi>lo?1.75/(hi-lo):1; model.scale.multiplyScalar(k); model.position.y=-lo*k; model.updateMatrixWorld(true);
  const names=new Set(); model.traverse(o=>{ if(o.name)names.add(o.name); });
  return {key,model,A,r,names}; }
const C=rig(gl.colin,'colin');
const clipsC=gl.colin.animations;
const root=new THREE.Group(); root.add(C.model);

function build(skin,pre,post){ const _q=new THREE.Quaternion(), out=[];
  for(const src of clipsC){ const tr=[];
    for(const t of src.tracks){ const d=t.name.indexOf('.'); const n=d>0?t.name.slice(0,d):t.name;
      if(!skin.names.has(n)||!/\.quaternion$/.test(t.name))continue;
      const c=t.clone();
      if(n==='mixamorig_Hips'){ const v=c.values;
        for(let i=0;i+3<v.length;i+=4){ _q.set(v[i],v[i+1],v[i+2],v[i+3]);
          if(pre)_q.premultiply(pre); if(post)_q.multiply(post);
          v[i]=_q.x;v[i+1]=_q.y;v[i+2]=_q.z;v[i+3]=_q.w; } }
      tr.push(c); }
    out.push(new THREE.AnimationClip(src.name,src.duration,tr)); }
  return out; }
function sample(skin,clips,ts){ const mixer=new THREE.AnimationMixer(skin.model);
  const idle=clips.find(c=>c.name==='idle_neutral'); const a=mixer.clipAction(idle); a.play(); a.setEffectiveWeight(1);
  const res=[]; let prev=0;
  for(const t of ts){ mixer.update(t-prev); prev=t; root.updateMatrixWorld(true);
    const pts=[]; skin.model.traverse(o=>{ if(!o.isSkinnedMesh)return;
      const pos=o.geometry.attributes.position, step=Math.max(1,Math.floor(pos.count/250)); const v=new THREE.Vector3();
      for(let i=0;i<pos.count;i+=step){ o.applyBoneTransform(i,v.fromBufferAttribute(pos,i)); o.localToWorld(v); pts.push({b:pos.getY(i),y:v.y}); } });
    pts.sort((p,q)=>p.b-q.b); const n=pts.length, q=Math.max(1,n*.05|0);
    const m=a2=>a2.reduce((s,p)=>s+p.y,0)/a2.length;
    let lo=1e9,hi=-1e9; for(const p of pts){ if(p.y<lo)lo=p.y; if(p.y>hi)hi=p.y; }
    res.push({sole:m(pts.slice(0,q)),crown:m(pts.slice(n-q)),lo,hi}); }
  mixer.stopAllAction(); return res; }
const TS=[0,.3,.7,1.2,2.0];
const ref=sample(C,clipsC,TS);
console.log('COLIN reference: soles', ref.map(r=>r.sole.toFixed(2)).join(' '), ' crown', ref.map(r=>r.crown.toFixed(2)).join(' '), ' bottom', ref.map(r=>r.lo.toFixed(2)).join(' '));
root.remove(C.model);

// THE OCTAHEDRAL GROUP. An error in the Hips' local rotation rotates everything below it
// RIGIDLY about the hips, so whatever is wrong is one constant rotation -- and the earlier
// search only ever tried rotations about X, because every quaternion in the rig happened to
// be one. These are all 24 axis-aligned orientations, tried as a premultiply.
const AXES=[[1,0,0],[0,1,0],[0,0,1]];
const cands=[];
for(const ax of AXES) for(const deg of [0,90,180,270]){
  const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...ax), deg*Math.PI/180);
  cands.push({n:(deg?('R'+'xyz'[AXES.indexOf(ax)]+deg):'identity'),q});
}
for(const a of AXES) for(const b of AXES){ if(a===b)continue;
  for(const d1 of [90,180,270]) for(const d2 of [90,180,270]){
    const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...a),d1*Math.PI/180)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...b),d2*Math.PI/180));
    cands.push({n:'R'+'xyz'[AXES.indexOf(a)]+d1+'*R'+'xyz'[AXES.indexOf(b)]+d2,q}); } }
for (const key of ['robot','moussa','alien']) {
  const S=rig(gl[key],key); root.add(S.model);
  const hits=[];
  for(const c of cands){
    const res=sample(S,build(S,c.q,null),TS);
    const up=res.every(r=>r.crown>r.sole+.4);
    const h=res[0].hi-res[0].lo, tall=res.every(r=>r.hi-r.lo>1.4&&r.hi-r.lo<2.2);
    const drift=Math.max(...res.map(r=>r.lo))-Math.min(...res.map(r=>r.lo));
    const lo=res[0].lo;
    if(up&&tall&&drift<.35) hits.push({n:c.n,h,lo,drift,q:c.q});
  }
  hits.sort((a,b)=>Math.abs(a.lo)-Math.abs(b.lo));
  console.log('\n'+key.toUpperCase()+': '+hits.length+' of '+cands.length+' rotations stand him up at full height');
  for(const o of hits.slice(0,3)) console.log('    premultiply '+o.n.padEnd(14)+' height '+o.h.toFixed(2)+' m, feet at y='+o.lo.toFixed(2)+', drift '+o.drift.toFixed(3));
  if(hits.length){ const b=hits[0]; console.log('    ---> hipQ: ['+[b.q.x,b.q.y,b.q.z,b.q.w].map(v=>Number(v.toFixed(6))).join(', ')+']'); }
  root.remove(S.model);
}
