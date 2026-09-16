// WHAT IS A CAR, GEOMETRICALLY? Read the shipped city.glb directly -- the repo's own rule
// (read the asset before building on it), and the question "do I have to break it up in
// Cinema 4D first" is a question about the FILE.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule() });
const doc = await io.read('models/city.glb');
const root = doc.getRoot();

const isCar = n => /^(car|jeep|truck|tractor)/i.test(n);
const seen = new Map();
for (const n of root.listNodes()) {
  const m = n.getMesh(); if (!m) continue;
  if (!isCar(n.getName())) continue;
  if (seen.has(m)) continue;
  seen.set(m, n.getName());
}
console.log('distinct car MESHES in the file: ' + seen.size + '\n');

// connected components over shared vertex INDICES -- which is what "can it be pulled apart
// without authoring" actually asks
function comps(pos, idx) {
  const n = pos.getCount();
  const par = new Int32Array(n); for (let i = 0; i < n; i++) par[i] = i;
  const find = a => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) par[b] = a; };
  // weld by position first: a flat-shaded export splits every face, so raw indices say
  // "every triangle is its own island" and that answer is about the EXPORT, not the shape
  const key = new Map(); const rep = new Int32Array(n);
  const p = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    pos.getElement(i, p);
    const k = p.map(v => Math.round(v * 2000)).join(',');
    if (!key.has(k)) key.set(k, i);
    rep[i] = key.get(k);
  }
  const cnt = idx ? idx.getCount() : n;
  for (let i = 0; i + 2 < cnt; i += 3) {
    const a = rep[idx ? idx.getScalar(i) : i], b = rep[idx ? idx.getScalar(i + 1) : i + 1], c = rep[idx ? idx.getScalar(i + 2) : i + 2];
    uni(a, b); uni(b, c);
  }
  const grp = new Map();
  for (let i = 0; i + 2 < cnt; i += 3) {
    const r = find(rep[idx ? idx.getScalar(i) : i]);
    grp.set(r, (grp.get(r) || 0) + 1);
  }
  return [...grp.values()].sort((a, b) => b - a);
}

let k = 0;
for (const [m, name] of seen) {
  if (k++ >= 8) break;
  const prims = m.listPrimitives();
  let tris = 0;
  for (const pr of prims) tris += (pr.getIndices() ? pr.getIndices().getCount() : pr.getAttribute('POSITION').getCount()) / 3;
  const per = prims.map(pr => {
    const c = comps(pr.getAttribute('POSITION'), pr.getIndices());
    return c;
  });
  const all = per.flat().sort((a, b) => b - a);
  console.log(name.padEnd(22) + ' prims ' + String(prims.length).padStart(2)
    + '  tris ' + String(Math.round(tris)).padStart(5)
    + '  islands ' + String(all.length).padStart(3)
    + '  biggest ' + all.slice(0, 6).join('/'));
}
