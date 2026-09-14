import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
const doc = await io.read('models/city.glb');
const isWalk = n => /^(land|green_|sand_|road_|parking_area|bridge|basketballcourt|park_[a-z]|farmstractures_11)/.test(n);
let walk = 0, all = 0, byCat = {};
for (const node of doc.getRoot().listNodes()) {
  const m = node.getMesh(); if (!m) continue;
  let t = 0;
  for (const p of m.listPrimitives()) t += (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3;
  all += t;
  const nm = node.getName();
  if (isWalk(nm)) { walk += t; const k = nm.replace(/[._]?\d+(\.\d+)?$/, '').replace(/\.\d+$/, ''); byCat[k] = (byCat[k] || 0) + t; }
}
console.log('placed triangles total', all | 0, '| walkable', walk | 0);
console.log('walkable by category:', Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,12).map(e=>e[0]+':'+(e[1]|0)).join('  '));
console.log('memory if stored as 9 floats/tri:', ((walk * 9 * 4) / 1048576).toFixed(1) + ' MB');
