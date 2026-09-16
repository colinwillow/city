// JAM_PROBE=tools/probe-bar.mjs npm run jam
//
// ARE THERE ANY BARS, AND DOES THE SWING DO WHAT HE DESCRIBED? Both questions are about the real
// city and the shipped code, and `npm run rails` set the precedent: measure what falls out of an
// extractor BEFORE a mechanic is built on top of it.
const G = globalThis.__shred;
const bars = G.bars, BAR = G.BAR, P = G.player;
console.log('\nbars found in the city: ' + bars.length);
if (!bars.length) { console.log('*** NONE -- the thresholds in BAR do not match anything in `solids`'); process.exit(1); }
const hs = bars.map(b => b.y).sort((a, b) => a - b);
const ls = bars.map(b => b.half * 2).sort((a, b) => a - b);
const q = (v, f) => v[Math.min(v.length - 1, Math.floor(v.length * f))];
console.log('  height  min ' + hs[0].toFixed(1) + '  median ' + q(hs, .5).toFixed(1) + '  max ' + hs[hs.length - 1].toFixed(1) + ' m');
console.log('  length  min ' + ls[0].toFixed(1) + '  median ' + q(ls, .5).toFixed(1) + '  max ' + ls[ls.length - 1].toFixed(1) + ' m');
console.log('  along X: ' + bars.filter(b => b.ax).length + '   along Z: ' + bars.filter(b => b.az).length);
// the nearest few to the spawn, so he can go and find one
const near = bars.map(b => ({ b, d: Math.hypot(b.x - P.pos.x, b.z - P.pos.z) })).sort((a, c) => a.d - c.d).slice(0, 6);
console.log('\n  nearest to the spawn:');
for (const n of near) console.log('    ' + n.d.toFixed(0).padStart(4) + ' m away at ' + n.b.x.toFixed(0) + ',' + n.b.z.toFixed(0)
  + '  height ' + n.b.y.toFixed(1) + '  length ' + (n.b.half * 2).toFixed(1));

// THE SWING, driven through the SHIPPED stepBar rather than a restatement of it.
console.log('\npumping, through the shipped stepBar (stick held forward the whole time):');
const b = near[0].b;
P.pos.set(b.x, b.y - 1, b.z); P.vel.set(0, 0, 0); P.grounded = false;
P.hit = ''; P.hang = 0; P.lad = 0; P.barCool = 0; P.bar = null;
G.barCatch();
if (!P.bar) { console.log('*** barCatch refused a bar he is standing inside'); process.exit(1); }
// hold the stick forward, in the swing plane
const fx = -P.bar.az, fz = P.bar.ax;
G.stick.L.down = 1; G.stick.L.x = 0; G.stick.L.y = -1;
let over = 0, t = 0;
for (let i = 0; i < 60 * 14; i++, t += 1 / 60) {
  const a0 = P.barA;
  G.stepBar(1 / 60);
  if (Math.abs(a0) > 2.6 && Math.abs(P.barA) < .6 && Math.sign(a0) === Math.sign(P.barW)) over++;
  if (i % 120 === 119) console.log('    t ' + t.toFixed(1) + 's   swing ' + (Math.abs(P.barA) * 57.3).toFixed(0).padStart(3)
    + ' deg   w ' + P.barW.toFixed(2) + ' rad/s' + (Math.abs(P.barW) > 3.2 ? '   GOING OVER' : ''));
}
console.log('\n  after 14 s of holding forward: w = ' + P.barW.toFixed(2) + ' rad/s');
if (Math.abs(P.barW) < 1.5) console.log('  *** it never built up -- BAR.pump is too small or the sign is wrong');
else if (Math.abs(P.barW) > 3.0) console.log('  he is giants-ing round the bar, which is the ask');
else console.log('  he swings but never gets over -- BAR.pump or BAR.wMax wants raising');
