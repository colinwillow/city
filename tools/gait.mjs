// npm run gait [glb] -- IS THIS CLIP THE RIGHT LENGTH FOR THIS BODY, AND HOW MUCH DOES IT BOB?
//
// "It makes him go up and down really quickly" has two possible causes and they need different
// fixes, so guessing costs a round:
//   1. THE CYCLE IS TOO FAST. A clip is time-scaled by `speed / ref`, so one cycle takes
//      `dur * ref / speed` seconds. A borrowed clip of a DIFFERENT LENGTH therefore needs its
//      OWN reference speed or the feet land at the wrong rate -- and the right value has a
//      closed form, `ref = GAIT.ref * (colinDur / thisDur)`. c98 typed both by eye and got one
//      error in each direction.
//   2. THE HIPS MOVE TOO FAR. A clip retargeted from a taller rig keeps the SOURCE's vertical
//      excursion, and on a shorter body the same centimetres read as a bounce. This is the
//      melee clips' own landmine (`tools/melee.mjs` remaps the Hips channel) and the only
//      honest fix for a clip baked into colin.glb is in the export.
// Both are printed against Colin's own gait as the reference, because that is the thing they
// have to sit beside without looking wrong.
import { readFileSync } from 'fs';
const { NodeIO } = await import('@gltf-transform/core');
const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
const draco3d = (await import('draco3dgltf')).default;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule() });

const file = process.argv[2] || 'models/colin.glb';
const doc = await io.read(file);
const anims = doc.getRoot().listAnimations();

// The shipped references, read out of index.html rather than restated here.
const src = readFileSync('index.html', 'utf8');
const num = (block, key) => { const b = src.match(new RegExp('const ' + block + ' = \\{[\\s\\S]*?\\n\\};')); if (!b) return null;
  const m = b[0].match(new RegExp('\\b' + key + ':\\s*([0-9.]+)')); return m ? parseFloat(m[1]) : null; };
const GAIT = { walkRef: num('GAIT', 'walkRef'), runRef: num('GAIT', 'runRef') };
const WEAP = { walkRef: num('WEAP', 'walkRef'), runRef: num('WEAP', 'runRef') };

// Colin renders at COLIN_HEIGHT / his geometry span; measure it rather than typing it.
let lo = Infinity, hi = -Infinity;
for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
  const a = p.getAttribute('POSITION'); if (!a) continue;
  const mn = a.getMin([]), mx = a.getMax([]); lo = Math.min(lo, mn[1]); hi = Math.max(hi, mx[1]);
}
const MODEL = 1.75 / (hi - lo);
// AND THE HIPS CHANNEL IS NOT IN GEOMETRY UNITS. A skinned mesh's vertices are already in
// metres-ish (GLTFLoader binds with the identity), but a BONE's translation lives inside the
// armature, which in every one of these exports carries a hundredth scale. So a hips value of
// 50 is 0.5 m, not 50 m -- and the first version of this tool multiplied by the model scale
// alone and reported a walk cycle bobbing SIX METRES. Same class of error as `Box3` vs
// geometry bounds, one node up: measure the chain, do not assume it.
const parent = new Map();
for (const n of doc.getRoot().listNodes()) for (const c of n.listChildren()) parent.set(c, n);
const hips = doc.getRoot().listNodes().find(n => /Hips$/.test(n.getName() || ''));
let ARM = 1;
for (let c = hips ? parent.get(hips) : null; c; c = parent.get(c)) ARM *= c.getScale()[1];
const K = MODEL * ARM;

const dur = a => { let d = 0; for (const c of a.listChannels()) { const s = c.getSampler(); if (!s) continue;
  const t = s.getInput(); if (!t) continue; const v = t.getArray(); d = Math.max(d, v[v.length - 1]); } return d; };
const bob = a => {
  const c = a.listChannels().find(x => x.getTargetPath() === 'translation' && x.getTargetNode() && /Hips$/.test(x.getTargetNode().getName()));
  if (!c) return null;
  const v = c.getSampler().getOutput().getArray();
  let mn = 1e9, mx = -1e9, tr = 0;
  for (let i = 1; i + 1 < v.length; i += 3) { mn = Math.min(mn, v[i]); mx = Math.max(mx, v[i]); }
  const fx = v[0], fz = v[2], lx = v[v.length - 3], lz = v[v.length - 1];
  tr = Math.hypot(lx - fx, lz - fz);
  return { range: (mx - mn) * K, travel: tr * K, stand: mx * K };
};
const get = n => anims.find(a => a.getName() === n);

// EVERY BORROWED CLIP AGAINST THE ONE OF COLIN'S OWN IT HAS TO SIT BESIDE. The baseline is
// what decides the reference: a strafe and a run are both one stride, so both are measured
// against `run_fwd`; a ladder climb is a walk cycle's cadence.
const PAIRS = [
  ['idle    ', 'idle_neutral',     'rifle_idle_01',             null],
  ['walk    ', 'walk_fwd_neutral', 'rifle_walk_fwd_01',         'walkRef'],
  ['run     ', 'run_fwd',          'rifle_run',                 'runRef'],
  ['run aim ', 'run_fwd',          'rifle_run_aim',             'aimRunRef'],
  ['strafe L', 'run_fwd',          'rifle_strafe_left',         'strafeRef'],
  ['strafe R', 'run_fwd',          'rifle_strafe_right',        'strafeRef'],
  ['shoot   ', 'idle_neutral',     'rifle_shoot_stationary_01', null],
  ['ladder  ', 'walk_fwd_neutral', 'climb_ladder',              'LAD.rate'],
];
console.log(file + '   drawn x' + MODEL.toFixed(3) + ', armature x' + ARM.toFixed(4) + ' -> hips units are ' + K.toFixed(5) + ' m');
console.log('   Colin: idle ' + dur(get('idle_neutral')).toFixed(3) + 's  walk ' + dur(get('walk_fwd_neutral')).toFixed(3) +
  's (ref ' + GAIT.walkRef + ')  run ' + dur(get('run_fwd')).toFixed(3) + 's (ref ' + GAIT.runRef + ')');
console.log('\n                                  dur     hips bob   vs his own   in place?   ref it WANTS');
for (const [what, cn, rn, key] of PAIRS) {
  const a = get(rn), c = get(cn);
  if (!a) { console.log('  ' + what + '  ' + rn.padEnd(26) + 'MISSING'); continue; }
  const d = dur(a), b = bob(a), cb = bob(c), cd = dur(c);
  const base = /walk/.test(cn) ? GAIT.walkRef : GAIT.runRef;
  const want = key ? (base * (cd / d)).toFixed(2) : '  --  ';
  const ratio = (b && cb && cb.range > 1e-4) ? (b.range / cb.range).toFixed(1) + 'x' : ' -- ';
  console.log('  ' + what + '  ' + rn.padEnd(26) + d.toFixed(3) + 's  ' +
    (b ? (b.range * 100).toFixed(1).padStart(5) + ' cm' : '   --  ') + '   ' + ratio.padStart(6) + '      ' +
    (b ? (b.travel < .02 ? 'yes' : 'NO ' + b.travel.toFixed(2) + 'm') : '   ') + '      ' + want.padStart(7) +
    (key ? '   -> ' + key : ''));
}
const ci = bob(get('idle_neutral')), ri = bob(get('rifle_idle_01'));
if (ci && ri) {
  console.log('\nHIS OWN IDLE BOBS ' + (ci.range * 100).toFixed(1) + ' cm; the rifle idle bobs ' + (ri.range * 100).toFixed(1) +
    ' cm -- ' + (ri.range / Math.max(1e-6, ci.range)).toFixed(0) + 'x.');
  console.log('A reference speed cannot fix that: the cycle rate is the clip TIME, the bounce is');
  console.log('the clip CONTENT. If it reads as bobbing after the refs are right, it is the export.');
}
