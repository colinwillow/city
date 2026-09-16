// Run through `JAM_PROBE=tools/probe-boom.mjs npm run jam`.
//
// DOES A SHOT ACTUALLY REACH THE SHADER? *"It didn't look like the pieces of the car moved at
// all with each hit... it never physically exploded."* Everything else in `carHurt` plainly ran
// (the sounds fired, the car stopped, it disappeared on time), so the failure is somewhere
// between the damage state and the vertices -- and there are four links in that chain. This
// walks all four on a REAL car in the REAL city, because guessing at them has already cost two
// wrong answers.
const G = globalThis.__shred;
const car = G.cars.find(c => c.inner) || G.cars[0];
const fail = m => { console.log('  *** ' + m); process.exitCode = 1; };

console.log('\nprobing one real car through the shipped carHurt\n');
console.log('  1. the car carries its inner mesh  : ' + (car.inner ? 'yes' : 'NO -- nothing can be swapped'));
if (!car.inner) { fail('car.inner is undefined'); process.exit(1); }
const mat0 = car.inner.material;

G.carHurt(car, 1, 0);

console.log('  2. wreck slot claimed              : ' + (car.wreck ? 'yes' : 'NO'));
console.log('  3. material swapped off cityMat    : ' + (car.inner.material !== mat0 ? 'yes' : 'NO -- still the shared city material'));
const g = car.inner.geometry;
console.log('  4. geometry tagged (aCen / aRnd)   : '
  + (g.attributes.aCen && g.attributes.aRnd ? 'yes, ' + g.userData.pieces + ' pieces' : 'NO'));
if (!car.wreck) fail('no wreck slot -- wreckInit never ran, or cityMat was null when it did');
if (car.inner.material === mat0) fail('material never swapped');
if (!g.attributes.aCen) fail('shatterTag did not tag the geometry');

// 5. THE SHADER ITSELF. `onBeforeCompile` is what the GPU would be handed, so invoke it exactly
// the way three does and read the text back -- this is the step no gate in this repo can see,
// because check:boot has no GPU and never compiles one.
const THREE = await import('three');
const sh = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
car.inner.material.onBeforeCompile(sh, { capabilities: {} });
const hasAttr = /attribute vec3 aCen/.test(sh.vertexShader);
const hasBody = /Rodrigues/.test(sh.vertexShader);
const hasUni  = !!sh.uniforms.uBreak;
console.log('  5. shader declares aCen            : ' + (hasAttr ? 'yes' : 'NO'));
console.log('  6. shader carries the shatter body : ' + (hasBody ? 'yes' : 'NO -- the splice found no #include <begin_vertex>'));
console.log('  7. uniforms wired (uBreak)         : ' + (hasUni ? 'yes, uBreak=' + sh.uniforms.uBreak.value.toFixed(3) : 'NO'));
if (!hasAttr) fail('the attribute declaration never made it in');
if (!hasBody) fail('the splice target was not found -- replace() silently did nothing');
if (!hasUni) fail('wreckPatch never attached its uniforms');

// 8. AND DOES THE MATHS ACTUALLY MOVE A VERTEX? Run the shader's own arithmetic in JS against
// the real attribute data. A shader that compiles and computes a zero offset looks exactly like
// one that never ran.
const pos = g.attributes.position, cen = g.attributes.aCen, rnd = g.attributes.aRnd;
const uB = car.wreck.uni.uBreak.value;
let moved = 0, worst = 0;
for (let i = 0; i < pos.count; i += 7) {
  const rx = pos.getX(i) - cen.getX(i), ry = pos.getY(i) - cen.getY(i), rz = pos.getZ(i) - cen.getZ(i);
  const ax = [rnd.getX(i) + .13, rnd.getY(i) + .41, rnd.getZ(i) + .27];
  const al = Math.hypot(...ax); ax.forEach((v, k) => ax[k] = v / al);
  const ang = uB * 9, c = Math.cos(ang), si = Math.sin(ang);
  const cr = [ax[1] * rz - ax[2] * ry, ax[2] * rx - ax[0] * rz, ax[0] * ry - ax[1] * rx];
  const d = ax[0] * rx + ax[1] * ry + ax[2] * rz;
  const nx = rx * c + cr[0] * si + ax[0] * d * (1 - c) + rnd.getX(i) * uB;
  const ny = ry * c + cr[1] * si + ax[1] * d * (1 - c) + rnd.getY(i) * uB;
  const nz = rz * c + cr[2] * si + ax[2] * d * (1 - c) + rnd.getZ(i) * uB;
  const dd = Math.hypot(nx - rx, ny - ry, nz - rz);
  if (dd > .004) moved++;
  worst = Math.max(worst, dd);
}
console.log('  8. stage-1 vertex motion           : worst ' + (worst * 100).toFixed(1) + ' cm, '
  + (moved / Math.ceil(pos.count / 7) * 100).toFixed(0) + '% of samples move');
console.log('\n  car bbox ' + [g.boundingBox ? (g.boundingBox.max.x - g.boundingBox.min.x) : 0].map(v => v.toFixed(2))
  + ' wide, uBreak ' + uB.toFixed(3) + ', uScl ' + car.wreck.uni.uScl.value.toFixed(3));
if (worst < .02) fail('stage 1 moves a vertex by less than 2 cm -- that is invisible, whatever the shader does');
console.log(process.exitCode ? '\nFAILED -- see the lines marked ***' : '\nevery link in the chain is intact');
