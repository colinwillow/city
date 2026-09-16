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
const THREE = { BufferAttribute: class { constructor(a, n) { this.array = a; this.itemSize = n; this.count = a.length / n; } } };
const WeakSetReal = WeakSet;
const shatterTag = new Function('THREE', 'WeakSet', m[1] + '\nreturn shatterTag;')(THREE, WeakSetReal);

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
console.log('the SHIPPED shatterTag, run on the real car geometry\n');
let k = 0, worst = 0;
for (const [me, name] of seen) {
  const pr = me.listPrimitives()[0];
  const g = geoOf(pr);
  shatterTag(g);
  const n = g.attributes.position.count;
  const ok = g.attributes.aCen && g.attributes.aCen.count === n && g.attributes.aRnd && g.attributes.aRnd.count === n;
  if (!ok) { console.error('FAIL ' + name + ': attributes missing or wrong length'); process.exit(1); }
  // a piece count of 1 means the weld swallowed the whole car and it will scale rather than
  // shatter; a count near the vertex count means it never welded at all and it is confetti
  const p = g.userData.pieces;
  if (p < 3 || p > n / 6) { console.error('FAIL ' + name + ': ' + p + ' pieces out of ' + n + ' verts'); process.exit(1); }
  worst = Math.max(worst, p);
  if (k++ < 8) console.log('  ' + name.padEnd(22) + ' verts ' + String(n).padStart(5) + '   PIECES ' + String(p).padStart(3));
}
console.log('\n' + seen.size + ' car meshes, all split. most pieces on one car: ' + worst);
console.log('every vertex carries its piece centroid and one shared random -- so a piece moves as a piece.');
