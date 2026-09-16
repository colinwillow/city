// JAM_PROBE=tools/probe-box.mjs npm run jam
//
// *"One will be next to me, I'm not even really near it, trying to shoot something else, and
// when I shoot it the car gets hit even though I didn't shoot at the car at all."*
// The bolt's car test was `hypot(dx,dz) > R + o.hl` -- a CIRCLE of radius `hl`, the car's half
// LENGTH -- so this measures the window it actually presented against the car's real footprint,
// on the real cars in the real city.
const G = globalThis.__shred;
const cars = G.cars, BOLT = G.BOLT;
const R = BOLT.rad !== undefined ? BOLT.rad : 1.4;
console.log('\nbolt radius ' + R.toFixed(2) + ' m,  ' + cars.length + ' cars');
let hl = 0, hw = 0, n = 0;
for (const c of cars) { if (c.hl === undefined) continue; hl += c.hl; hw += c.hw; n++; }
hl /= n; hw /= n;
console.log('  the average car: ' + (hl * 2).toFixed(2) + ' m long x ' + (hw * 2).toFixed(2) + ' m wide');
console.log('\nHOW WIDE THE HIT WINDOW WAS, ACROSS THE CAR\'S FLANK:');
console.log('   OLD  a circle on the long axis   ' + (2 * (hl + R)).toFixed(2) + ' m across');
console.log('   NEW  the car\'s own box          ' + (2 * (hw + R)).toFixed(2) + ' m across');
console.log('   -> ' + ((hl + R) / (hw + R)).toFixed(2) + 'x narrower off the flank, which is where he was shooting past');
// AND HOW FAR OFF A FLANK A SHOT USED TO SCORE. This is the number he actually felt.
console.log('\n   a bolt passing the flank scored a hit out to ' + (hl + R).toFixed(2)
  + ' m from the centreline,\n   where the metal ends at ' + hw.toFixed(2) + ' m -- so up to '
  + (hl + R - hw).toFixed(2) + ' m of clear air read as a hit.');
// the area, which is the honest "how much phantom was there" figure
const oldA = Math.PI * (hl + R) * (hl + R), newA = 4 * (hl + R) * (hw + R);
console.log('\n   footprint the bolt could be stopped by: ' + oldA.toFixed(1) + ' m2  ->  '
  + newA.toFixed(1) + ' m2   (' + (oldA / newA).toFixed(2) + 'x)');
