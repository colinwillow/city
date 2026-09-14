// Where does each vertex sit relative to the bone that drives it?
// A vertex more than a hand's width from its own dominant bone is not skinned to
// anything sensible, and will be flung when that bone moves. Joint positions come
// from walking the node hierarchy (the same space the mesh data is authored in);
// the skinned vertices themselves ignore their node transform, per the glTF rule.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import fs from 'fs';

const F = process.argv[2] || 'models/colin.glb';
const b = fs.readFileSync(F); const jl = b.readUInt32LE(12); const J = JSON.parse(b.slice(20, 20 + jl).toString());
const N = J.nodes, parent = {};
N.forEach((n, i) => (n.children || []).forEach(c => parent[c] = i));
const qmul = (a, b2) => { const [ax,ay,az,aw]=a,[bx,by,bz,bw]=b2; return [aw*bx+ax*bw+ay*bz-az*by, aw*by-ax*bz+ay*bw+az*bx, aw*bz+ax*by-ay*bx+az*bw, aw*bw-ax*bx-ay*by-az*bz]; };
const qrot = (q, v) => { const [x,y,z,w]=q; const ix=w*v[0]+y*v[2]-z*v[1], iy=w*v[1]+z*v[0]-x*v[2], iz=w*v[2]+x*v[1]-y*v[0], iw=-x*v[0]-y*v[1]-z*v[2];
  return [ix*w+iw*-x+iy*-z-iz*-y, iy*w+iw*-y+iz*-x-ix*-z, iz*w+iw*-z+ix*-y-iy*-x]; };
const wcache = {};
function world(i) {
  if (wcache[i]) return wcache[i];
  const n = N[i], t = n.translation || [0,0,0], q = n.rotation || [0,0,0,1], s = n.scale || [1,1,1];
  if (parent[i] == null) return wcache[i] = { p: t, q, s };
  const P = world(parent[i]);
  const lp = qrot(P.q, [t[0]*P.s[0], t[1]*P.s[1], t[2]*P.s[2]]);
  return wcache[i] = { p: [P.p[0]+lp[0], P.p[1]+lp[1], P.p[2]+lp[2]], q: qmul(P.q, q), s: [P.s[0]*s[0], P.s[1]*s[1], P.s[2]*s[2]] };
}
const jointNodes = J.skins[0].joints;
const jn = jointNodes.map(i => N[i].name), jp = jointNodes.map(i => world(i).p);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
const doc = await io.read(F);
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  for (const p of mesh.listPrimitives()) {
    const pos = p.getAttribute('POSITION'), Ja = p.getAttribute('JOINTS_0'), Wa = p.getAttribute('WEIGHTS_0');
    if (!Ja) continue;
    const c = pos.getCount(); const v = [0,0,0], ej = [0,0,0,0], ew = [0,0,0,0];
    const hist = new Map(); let far = 0, farName = '', bad = 0; const badBones = new Map();
    for (let i = 0; i < c; i++) {
      pos.getElement(i, v); Ja.getElement(i, ej); Wa.getElement(i, ew);
      let bi = 0, bw = -1; for (let k = 0; k < 4; k++) if (ew[k] > bw) { bw = ew[k]; bi = ej[k]; }
      hist.set(jn[bi], (hist.get(jn[bi]) || 0) + 1);
      const q = jp[bi]; const d = Math.hypot(v[0]-q[0], v[1]-q[1], v[2]-q[2]);
      if (d > .30) { bad++; badBones.set(jn[bi], (badBones.get(jn[bi]) || 0) + 1); }
      if (d > far) { far = d; farName = jn[bi]; }
    }
    const top = [...hist.entries()].sort((a,b2)=>b2[1]-a[1]);
    console.log('\n' + node.getName().toUpperCase(), c + ' verts | worst ' + far.toFixed(2) + 'm from ' + farName.replace('mixamorig_','') + ' | >0.30m: ' + bad + ' (' + (100*bad/c).toFixed(1) + '%)');
    console.log('  bones:', top.slice(0, 8).map(e => e[0].replace('mixamorig_','') + ':' + e[1]).join(' '), top.length > 8 ? '(+' + (top.length-8) + ')' : '');
    if (bad) console.log('  STRAY via:', [...badBones.entries()].sort((a,b2)=>b2[1]-a[1]).slice(0, 8).map(e => e[0].replace('mixamorig_','') + ':' + e[1]).join(' '));
  }
}
