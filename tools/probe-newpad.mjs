// JAM_PROBE=tools/probe-newpad.mjs npm run jam
// The move, end to end: the pad the ship settles on, the new ladder, and that it is climbable.
const G = globalThis.__shred;
const P = G.player, stick = G.stick, cam = G.cam, SHIP = G.SHIP, LADDERS = G.LADDERS, LAD = G.LAD;
const DT = 1 / 60;
const step = () => { G.stepJet(DT); G.stepPlayer(DT); G.stepWay(DT); };

console.log('\n--- THE PAD THE SHIP WILL SETTLE ON (the shipped shipPad) ---');
const at = [243, 11.83, -26];
const pad = G.shipPad(at[0], at[2], 4.4 * .38, at[1]);
console.log('  asked   ' + at.join(', '));
console.log('  found   ' + pad.x.toFixed(1) + ', ' + pad.y.toFixed(2) + ', ' + pad.z.toFixed(1)
  + '   disagreement under the hull ' + pad.flat.toFixed(3) + ' m'
  + '   moved ' + Math.hypot(pad.x - at[0], pad.z - at[2]).toFixed(1) + ' m'
  + (pad.flat < .05 ? '   -- dead flat' : pad.flat < .25 ? '   -- good' : '   *** lumpy'));

console.log('\n--- THE NEW LADDER ---');
const L = LADDERS.find(l => Math.hypot(l.x - 243, l.z - -18.5) < 2);
if (!L) { console.log('  *** not built'); }
else {
  console.log('  at ' + L.x.toFixed(0) + ',' + L.z.toFixed(0)
    + '   foot y ' + L.y0.toFixed(2) + '   top y ' + L.y1.toFixed(2)
    + '   rise ' + (L.y1 - L.y0).toFixed(1) + ' m'
    + '   normal ' + L.nx.toFixed(2) + ',' + L.nz.toFixed(2));
  console.log('  ' + Math.hypot(L.x - pad.x, L.z - pad.z).toFixed(1) + ' m from the pad');
  // and climb it, stick held, exactly as a player would
  P.vel.set(0, 0, 0); P.speed = 0; P.grounded = true; P.jumps = 0; P.air = '';
  P.hit = ''; P.mel = ''; P.bar = null; P.hang = 0; P.lad = 0; P.board = null; P.ship = 0;
  P.ladCool = 0; P.hangCool = 0; P.climbT = 0; P.dance = '';
  P.pos.set(L.x + L.nx * 3.2, L.y0 + .1, L.z + L.nz * 3.2);
  for (let k = 0; k < 60 && !P.grounded; k++) step();
  cam.az = Math.atan2(-L.nx, -L.nz);
  stick.L.down = 1; stick.L.x = 0; stick.L.y = -1; stick.L.mag = 1;
  // **AND THE STICK IS RELEASED THE MOMENT THE MANTLE ENDS, WHICH COST A RUN.** Held for the
  // whole 25 s he tops out and then WALKS FORWARD off the far side of a 14 m roof -- the probe
  // read `ended y 0.75, 38 m from the pad` and I wrote that up as "he mantles and falls off the
  // building". He does not; the harness was still pushing him. A player holds the stick to climb
  // and lets go when he is up, so that is what this does now.
  let latch = 0, wasLad = 0, relatch = 0, topped = 0, held = 1;
  for (let k = 0; k < Math.round(25 / DT); k++) {
    step();
    if (P.lad && !wasLad) { latch++; if (topped) relatch++; }
    if (!P.lad && wasLad) topped = 1;
    if (topped && held && !P.hang) { held = 0; stick.L.down = 0; stick.L.x = stick.L.y = 0; stick.L.mag = 0; }
    wasLad = P.lad ? 1 : 0;
  }
  console.log('  climbed with the stick held for 25 s: latched ' + latch + 'x'
    + (relatch ? '   *** RE-GRABBED ' + relatch : '   once')
    + '   ended y ' + P.pos.y.toFixed(2) + '   grounded ' + P.grounded
    + '   ' + Math.hypot(P.pos.x - pad.x, P.pos.z - pad.z).toFixed(1) + ' m from the pad'
    + (P.pos.y > L.y1 - 1 && P.grounded ? '   -- ON THE ROOF' : '   *** he is not on the roof'));
}
