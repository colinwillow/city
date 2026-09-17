// JAM_PROBE=tools/probe-pad.mjs npm run jam
//
// The roof he pointed at, pinned by his own chip: `BAR 43M@213,-57` puts him 43 m from that bar,
// and of every flat patch in the region exactly one is 43 m from it -- 243,-26 -- which is also
// 57 m from the ship, i.e. "like two buildings over". This finds the LADDER for it: a foot on
// flat open ground, which is the thing `npm run ladders` exists to stop anyone eyeballing.
const G = globalThis.__shred;
const PAD = { x: 243, z: -26 };

const roof = G.blobFloor(PAD.x, PAD.z, 4000);
console.log('\nthe roof: ' + PAD.x + ',' + PAD.z + '  y ' + roof.toFixed(2) + '\n');

// how far out the wall is on each bearing, and what the ground is doing there
const DIRS = [[0, 1, 'north +Z'], [0, -1, 'south -Z'], [1, 0, 'east +X'], [-1, 0, 'west -X']];
const OUT = [1.6, 3.0, 4.5];
let best = null;
for (const [dx, dz, name] of DIRS) {
  // walk out from the centre until the roof stops: that is the wall
  let edge = 0;
  for (let d = 0; d < 30; d += .5) {
    if (G.blobFloor(PAD.x + dx * d, PAD.z + dz * d, 4000) < roof - .6) { edge = d; break; }
  }
  if (!edge) { console.log('  ' + name.padEnd(9) + ' no edge within 30 m'); continue; }
  const row = [];
  let ok = null;
  for (const o of OUT) {
    const fx = PAD.x + dx * (edge + o), fz = PAD.z + dz * (edge + o);
    // FLAT AND OPEN: the four corners of a 1.4 m square have to agree, and it has to be near
    // street level rather than on a canopy or a neighbour's roof.
    let lo = 1e9, hi = -1e9;
    for (const a of [-.7, .7]) for (const b of [-.7, .7]) lo = Math.min(lo, G.blobFloor(fx + a, fz + b, roof)), hi = Math.max(hi, G.blobFloor(fx + a, fz + b, roof));
    const flat = hi - lo;
    row.push(o.toFixed(1) + 'm: y ' + hi.toFixed(2) + ' flat ' + flat.toFixed(2));
    if (!ok && flat < .2 && hi < 3) ok = { x: fx, y: hi, z: fz, out: o };
  }
  console.log('  ' + name.padEnd(9) + ' wall at ' + edge.toFixed(1) + ' m   ' + row.join('   ')
    + (ok ? '   <- USABLE' : ''));
  if (ok && !best) { best = ok; best.name = name; best.rot = Math.atan2(dx, dz); }
}
if (best) {
  console.log('\n  ladder foot  { x: ' + best.x.toFixed(1) + ', y: ' + best.y.toFixed(2)
    + ', z: ' + best.z.toFixed(1) + ', top: ' + roof.toFixed(2)
    + ', rot: ' + best.rot.toFixed(3) + ' }   on the ' + best.name + ' face');
  console.log('  rise ' + (roof - best.y).toFixed(1) + ' m'
    + '   -- a charge jump into a double reaches 10.2, so ' + (roof - best.y > 10.2 ? 'it NEEDS one' : 'it is already climbable and the ladder is a convenience'));
} else console.log('\n  *** no face has flat open ground -- this roof cannot take a ladder');
