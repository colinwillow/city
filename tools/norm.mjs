import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
const doc = await io.read(process.argv[2] || 'models/colin.glb');
for (const node of doc.getRoot().listNodes()) {
  const m = node.getMesh(); if (!m) continue;
  for (const p of m.listPrimitives()) {
    const N = p.getAttribute('NORMAL'), P = p.getAttribute('POSITION');
    const W = p.getAttribute('WEIGHTS_0'), U = p.getAttribute('TEXCOORD_0');
    const v = [0,0,0]; let zero = 0, nan = 0, minL = 9, maxL = 0, pnan = 0, wnan = 0, unan = 0;
    if (N) for (let i = 0; i < N.getCount(); i++) { N.getElement(i, v);
      const L = Math.hypot(v[0], v[1], v[2]);
      if (!isFinite(L)) nan++; else { if (L < 1e-6) zero++; minL = Math.min(minL, L); maxL = Math.max(maxL, L); } }
    for (let i = 0; i < P.getCount(); i++) { P.getElement(i, v); if (!isFinite(v[0]+v[1]+v[2])) pnan++; }
    if (U) { const e=[0,0]; for (let i=0;i<U.getCount();i++){ U.getElement(i,e); if(!isFinite(e[0]+e[1]))unan++; } }
    if (W) { const e=[0,0,0,0]; for (let i=0;i<W.getCount();i++){ W.getElement(i,e); const s=e[0]+e[1]+e[2]+e[3]; if(!isFinite(s)||s<1e-4)wnan++; } }
    console.log(node.getName().padEnd(12), 'normals zero', zero, 'nonfinite', nan, '|n| range', minL.toFixed(4) + '..' + maxL.toFixed(4),
      '| pos nonfinite', pnan, '| uv nonfinite', unan, '| bad weights', wnan, '| has NORMAL', !!N);
  }
}
