import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });

const doc = await io.read('models/colin.glb');
for (const n of doc.getRoot().listNodes()) {
  const m = n.getMesh(); if (!m) continue;
  for (const p of m.listPrimitives()) {
    const pos = p.getAttribute('POSITION'), uv = p.getAttribute('TEXCOORD_0'), w = p.getAttribute('WEIGHTS_0'), jt = p.getAttribute('JOINTS_0');
    const c = pos.getCount();
    let uvmin = [9, 9], uvmax = [-9, -9]; const e = [0, 0];
    if (uv) for (let i = 0; i < c; i++) { uv.getElement(i, e); for (let k = 0; k < 2; k++) { uvmin[k] = Math.min(uvmin[k], e[k]); uvmax[k] = Math.max(uvmax[k], e[k]); } }
    let badW = 0, zeroW = 0, maxJ = 0; const ew = [0, 0, 0, 0], ej = [0, 0, 0, 0];
    if (w) for (let i = 0; i < c; i++) { w.getElement(i, ew); jt.getElement(i, ej);
      const s = ew[0] + ew[1] + ew[2] + ew[3]; if (Math.abs(s - 1) > .02) badW++; if (s < 1e-5) zeroW++;
      for (let k = 0; k < 4; k++) if (ew[k] > 0) maxJ = Math.max(maxJ, ej[k]); }
    const tg = p.listTargets();
    let dmax = 0;
    for (const t of tg) { const tp = t.getAttribute('POSITION'); if (!tp) continue; if (tp.getCount() !== c) { dmax = -1; break; }
      for (let i = 0; i < c; i += 7) { tp.getElement(i, e.length === 2 ? [0,0,0] : e); } }
    console.log(n.getName().padEnd(12), 'v' + String(c).padEnd(6),
      'uv[' + uvmin.map(v => v.toFixed(2)) + '..' + uvmax.map(v => v.toFixed(2)) + ']',
      'badWeightSum', badW, 'zeroWeight', zeroW, 'maxJointIdx', maxJ,
      'targets', tg.length, tg.length ? 'targetCounts ' + [...new Set(tg.map(t => t.getAttribute('POSITION') ? t.getAttribute('POSITION').getCount() : 'none'))].join('/') : '');
  }
}
console.log('skin joints', doc.getRoot().listSkins().map(s => s.listJoints().length));

// --- the bridge / elevated road: where is the deck, and what else is up there ---
const city = await io.read('LowPoly_City_01.glb');
const v = [0, 0, 0];
for (const node of city.getRoot().listNodes()) {
  const nm = node.getName(); if (!/^(bridge|road_c)/.test(nm)) continue;
  const m = node.getMesh(); if (!m) continue;
  const M = node.getWorldMatrix ? null : null;
  const t = node.getTranslation(), s = node.getScale(), q = node.getRotation();
  const rot = (q, a) => { const [x, y, z, w] = q; const ix = w*a[0]+y*a[2]-z*a[1], iy = w*a[1]+z*a[0]-x*a[2], iz = w*a[2]+x*a[1]-y*a[0], iw = -x*a[0]-y*a[1]-z*a[2];
    return [ix*w+iw*-x+iy*-z-iz*-y, iy*w+iw*-y+iz*-x-ix*-z, iz*w+iw*-z+ix*-y-iy*-x]; };
  const hist = new Map();
  for (const p of m.listPrimitives()) {
    const pos = p.getAttribute('POSITION'), idx = p.getIndices();
    const n = idx ? idx.getCount() : pos.getCount();
    for (let i = 0; i + 2 < n; i += 3) {
      const tri = [];
      for (let k = 0; k < 3; k++) { pos.getElement(idx ? idx.getScalar(i + k) : i + k, v);
        const r = rot(q, [v[0]*s[0], v[1]*s[1], v[2]*s[2]]); tri.push([r[0]+t[0], r[1]+t[1], r[2]+t[2]]); }
      const ux = tri[1][0]-tri[0][0], uy = tri[1][1]-tri[0][1], uz = tri[1][2]-tri[0][2];
      const vx = tri[2][0]-tri[0][0], vy = tri[2][1]-tri[0][1], vz = tri[2][2]-tri[0][2];
      const ny = uz*vx - ux*vz, nl = Math.hypot(uy*vz-uz*vy, ny, ux*vy-uy*vx);
      if (nl < 1e-9 || Math.abs(ny)/nl < .35) continue;          // same test the game uses
      const y = Math.round((tri[0][1]+tri[1][1]+tri[2][1]) / 3);
      hist.set(y, (hist.get(y) || 0) + 1);
    }
  }
  const top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  console.log(nm.padEnd(14), 'upward-facing tri heights (y:count):', top.map(e => e[0] + ':' + e[1]).join(' '));
}
