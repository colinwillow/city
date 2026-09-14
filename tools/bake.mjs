// Bakes LowPoly_City_01.glb into models/city.glb: same objects, same names, fewer
// triangles. The source is 7.5M triangles as placed (cars ~5-8k each, the park
// tiles 40k each), too much for a phone. Run: npm run bake  (~15s)
//
// The pack is flat-shaded: every face has its own vertices, so a simplifier can't
// collapse anything across a face edge. For the heavy categories the normals are
// dropped, positions welded, then simplified; the game recomputes FLAT normals for
// any mesh carrying extras.flat, so the look is unchanged.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weldPrimitive, draco, simplifyPrimitive } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import fs from 'fs';

const SRC = process.argv[2] || 'LowPoly_City_01.glb';
const OUT = process.argv[3] || 'models/city.glb';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
});
console.time('read'); const doc = await io.read(SRC); console.timeEnd('read');
const root = doc.getRoot();

const owner = new Map();
for (const n of root.listNodes()) { const m = n.getMesh(); if (m && !owner.has(m)) owner.set(m, n.getName()); }
const tris = p => (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3;
// [ratio, error] per category; error is relative to the mesh's own extent
const planFor = (name, t) => {
  if (/^(car|jeep|truck|tractor)_/.test(name)) return [0.25, 0.012];
  if (/^park_/.test(name)) return [0.2, 0.02];
  if (/^(skyscraper|nationalstadium|highlivingbuilding|bridge|hotel|hospital|school|businesscenter|government|factory)/.test(name)) return [0.4, 0.006];
  if (/^tree/.test(name)) return [0.5, 0.02];
  if (t > 3000) return [0.45, 0.008];
  if (t > 800) return [0.6, 0.008];
  return null;
};

let before = 0, after = 0, flat = 0;
await MeshoptSimplifier.ready;
console.time('simplify');
for (const mesh of root.listMeshes()) {
  const name = owner.get(mesh) || mesh.getName();
  let flagged = false;
  for (const prim of mesh.listPrimitives()) {
    const t0 = tris(prim); before += t0;
    const plan = planFor(name, t0);
    if (plan) {
      try {
        prim.setAttribute('NORMAL', null);
        for (const sem of prim.listSemantics()) if (/^(TANGENT|COLOR_)/.test(sem)) prim.setAttribute(sem, null);
        weldPrimitive(prim, { tolerance: 0.0005 });
        simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: plan[0], error: plan[1], lockBorder: false });
        flagged = true;
      } catch (e) { console.warn('simplify failed', name, e.message); }
    }
    after += tris(prim);
  }
  if (flagged) { mesh.setExtras({ ...(mesh.getExtras() || {}), flat: 1 }); flat++; }
}
console.timeEnd('simplify');
console.log('unique tris', before | 0, '->', after | 0, '| meshes flagged flat', flat);
await doc.transform(dedup(), prune(), draco({ method: 'edgebreaker', quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }));
console.time('write'); await io.write(OUT, doc); console.timeEnd('write');
console.log(OUT, (fs.statSync(OUT).size / 1048576).toFixed(1) + ' MB');
