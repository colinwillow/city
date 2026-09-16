// npm run wreck -- DOES THE SHIPPED `shatterTag` ACTUALLY FIND THE PIECES?
//
// The question "do I need to break the cars up in Cinema 4D first" is a question about the FILE,
// and `npm run cars` answers it by reading the file. This answers the other half: whether the
// function the GAME runs finds the same pieces in the same geometry. A tool that measures the
// asset is not a tool that measures the pipeline -- this repo has paid for that six times -- so
// `shatterTag` is LIFTED OUT OF index.html between the WRECK: markers and run verbatim.
import fs from 'fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';

const src = fs.readFileSync('index.html', 'utf8');
const m = src.match(/\/\/ WRECK:START[^\n]*\n([\s\S]*?)\/\/ WRECK:END/);
if (!m) { console.error('no WRECK: markers in index.html'); process.exit(1); }

// the surface `shatterTag` touches, and nothing more
const THREE = {
  BufferAttribute: class { constructor(a, n) { this.array = a; this.itemSize = n; this.count = a.length / n;
    this.getX = i => a[i * n]; this.getY = i => a[i * n + 1]; this.getZ = i => a[i * n + 2]; } },
  BufferGeometry: class { constructor() { this.attributes = {}; } setAttribute(k, v) { this.attributes[k] = v; } computeBoundingSphere() {} },
};
const carChunks = new Function('THREE', 'WeakMap', m[1] + '\nreturn carChunks;')(THREE, WeakMap);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule() });
const doc = await io.read(process.argv[2] || 'models/city.glb');
const isCar = n => /^(car|jeep|truck|tractor)/i.test(n);
const seen = new Map();
for (const n of doc.getRoot().listNodes()) {
  const me = n.getMesh(); if (!me || !isCar(n.getName()) || seen.has(me)) continue;
  seen.set(me, n.getName());
}
// a three-shaped geometry over the real vertex data
const geoOf = pr => {
  const P = pr.getAttribute('POSITION'), I = pr.getIndices();
  const pa = P.getArray();
  return {
    attributes: { position: { count: P.getCount(),
      getX: i => pa[i * 3], getY: i => pa[i * 3 + 1], getZ: i => pa[i * 3 + 2] } },
    index: I ? { count: I.getCount(), getX: i => I.getScalar(i) } : null,
    userData: {}, setAttribute(k, v) { this.attributes[k] = v; },
  };
};
console.log('the SHIPPED carChunks, run on the real car geometry\n');
let k = 0, worst = 0;
for (const [me, name] of seen) {
  const pr = me.listPrimitives()[0];
  const g = geoOf(pr);
  const parts = carChunks(g, 9);
  const n = g.attributes.position.count;
  // a piece count of 1 means the weld swallowed the whole car and it cannot come apart at all;
  // a count near the vertex count means it never welded and every triangle is its own confetti
  const p = parts.pieces;
  if (p < 3 || p > n / 6) { console.error('FAIL ' + name + ': ' + p + ' islands out of ' + n + ' verts'); process.exit(1); }
  // and every chunk has to carry real triangles, or a wreck is drawn as empty meshes
  let tot = 0;
  for (const c of parts) { const t = c.geo.attributes.position.count; if (!t) { console.error('FAIL ' + name + ': empty chunk'); process.exit(1); } tot += t; }
  // THE CHUNKS ARE DE-INDEXED and the source is indexed, so the number to match is the INDEX
  // count -- triangles x 3 -- and not the unique-vertex count. The first version of this check
  // compared those two and failed a function that was right, which is its own small lesson about
  // asserting on the number you happen to have rather than the one that means something.
  const want = g.index ? g.index.count : n;
  if (tot !== want) { console.error('FAIL ' + name + ': chunks hold ' + tot + ' of ' + want + ' triangle vertices'); process.exit(1); }
  worst = Math.max(worst, p);
  if (k++ < 8) console.log('  ' + name.padEnd(22) + ' verts ' + String(n).padStart(5)
    + '   islands ' + String(p).padStart(3) + '   -> ' + parts.length + ' chunks, '
    + parts.map(c => c.geo.attributes.position.count / 3).join('/') + ' tris');
}
console.log('\n' + seen.size + ' car meshes, all split. most islands on one car: ' + worst);
console.log('every chunk is a real mesh with real triangles, and they account for every vertex.');
