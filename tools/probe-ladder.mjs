// JAM_PROBE=tools/probe-ladder.mjs npm run jam
//
// *"I still can't use the ladders. I thought the whole point was we put the climbing animations
// in there so you could climb ladders."*
//
// The ladders are PROCEDURAL -- two rails and a rung every `LAD.rung`, built from `LAD.spots`
// with no GLB anywhere -- so unlike anything to do with a skin, this is a feature `npm run jam`
// can drive end to end against the real city and the real collider.
const G = globalThis.__shred;
const P = G.player, stick = G.stick, cam = G.cam, LAD = G.LAD, LADDERS = G.LADDERS;
const DT = 1 / 60;

function step() { G.stepJet(DT); G.stepPlayer(DT); }
function clear() {
  P.vel.set(0, 0, 0); P.speed = 0; P.grounded = true; P.jumps = 0; P.air = '';
  P.hit = ''; P.mel = ''; P.bar = null; P.hang = 0; P.lad = 0; P.rail = null; P.board = null;
  P.dance = ''; P.jump = 0; P.aim = 0; P.rollT = 0; P.trick = ''; P.ladCool = 0; P.hangCool = 0;
  P.climbT = 0; P.jetFlew = 0; P.jetArm = 0; P.jetWas = 0; P.jetK = 0; P.rHold = 0;
  stick.L.down = 0; stick.L.x = stick.L.y = 0; stick.L.mag = 0;
  stick.R.down = 0; stick.R.x = stick.R.y = 0; stick.R.far = 0;
}
// THE THUMB HAS TO POINT INTO THE WALL, and the pad is read in the CAMERA's frame -- so the
// honest way to drive it is to put the lens on that bearing and push the stick forward, which
// is what a player does. `stickWorld` maps up-the-screen to ly -= 1 (c163's own note).
function pushInto(L) {
  cam.az = Math.atan2(-L.nx, -L.nz);
  stick.L.down = 1; stick.L.x = 0; stick.L.y = -1; stick.L.mag = 1;
}
// STAND HIM ON THE GROUND, AND THE SETTLING HAS TO HAPPEN OUTSIDE `LAD.grab` (this cost a run).
// `ladGrab` deliberately catches a man who is merely FALLING past a ladder -- that is what makes
// a jump onto a fire escape work -- so dropping him 10 cm inside the grab radius and calling the
// result "standing there" latches him on frame one and reports a bug that is not there. He is
// settled three metres out and only then moved in, keeping the y the collider gave him.
function settled(L) {
  clear();
  P.pos.set(L.x + L.nx * 3.2, L.y0 + .1, L.z + L.nz * 3.2);
  for (let i = 0; i < 60 && !P.grounded; i++) step();
  for (let i = 0; i < 6; i++) step();
  return P.grounded;
}
function placeAt(L, out) {
  settled(L);
  P.pos.x = L.x + L.nx * out; P.pos.z = L.z + L.nz * out;
}

console.log('\n' + LADDERS.length + ' ladders   LAD.grab ' + LAD.grab + '   hold ' + LAD.hold
  + '   speed ' + LAD.speed + '   lip ' + LAD.lip + '\n');

let pass = 0, n = 0;
for (let i = 0; i < LADDERS.length; i++) {
  const L = LADDERS[i];
  const rise = L.y1 - L.y0;
  placeAt(L, LAD.grab * .8);
  const y0 = P.pos.y;
  pushInto(L);
  // WALK AT IT. No button -- the ladder is a place, and pushing toward a place is how you get
  // to it -- so the only input in this whole case is the stick held forward.
  let got = -1;
  for (let k = 0; k < 120 && got < 0; k++) { step(); if (P.lad) got = k; }
  // and keep holding: he should climb, top out, and be handed to the ledge mantle
  let topT = -1, peak = P.pos.y;
  for (let k = 0; k < Math.round(12 / DT); k++) {
    step(); peak = Math.max(peak, P.pos.y);
    if (!P.lad) { topT = k; break; }
  }
  const up = peak - y0;
  const ok = got >= 0 && topT >= 0 && up > rise * .8;
  n++; if (ok) pass++;
  console.log('  ladder ' + i + ' at ' + L.x.toFixed(0) + ',' + L.z.toFixed(0)
    + '  rise ' + rise.toFixed(1) + 'm'
    + '   latched ' + (got < 0 ? 'NEVER' : 'in ' + (got * DT).toFixed(2) + 's')
    + '   climbed ' + up.toFixed(1) + 'm in ' + (topT < 0 ? '--' : (topT * DT).toFixed(2) + 's')
    + '   -> ' + (P.hang ? 'the mantle' : P.lad ? 'still on it' : 'let go')
    + (ok ? '' : '   *** WRONG'));
}
console.log('\n  ' + pass + ' of ' + n + ' climbable\n');

// ---- THE TWO NEGATIVE CASES ARE UNRESOLVED, AND THE TRACE SAYS WHY ----
// Both report `grounded false`, and the frame trace shows him held at y 0.39 while the real
// collider floor at that spot is 0.00: `LAD.spots` records a foot about 0.4 m ABOVE the ground
// the collider actually has there. So placing him at the recorded foot puts him in the air, and
// `ladGrab`'s deliberate catch-a-man-falling-past-it branch fires -- which is the feature
// working, not a bug, but it means these two rows do not yet test what they claim.
// A player WALKING up to a ladder is at the real floor and grounded every frame, which is what
// the six rows above measure and why they pass. Left as a STATED GAP rather than a silent one:
// the placement has to come from the collider, not from `LAD.spots`.
// AND WALKING PAST ONE MUST NOT SNAG HIM -- the grind rail's rule, one place along.
{
  const L = LADDERS[0];
  const gnd0 = settled(L); placeAt(L, LAD.hold + .05);
  cam.az = Math.atan2(-L.nz, L.nx);           // ninety degrees off: along the wall, not into it
  stick.L.down = 1; stick.L.x = 0; stick.L.y = -1; stick.L.mag = 1;
  let snag = 0, gnd = P.grounded, dot = 0;
  for (let k = 0; k < 90; k++) {
    const sw = G.stick && G.stickWorld ? G.stickWorld() : null;
    if (sw) dot = (sw.x * -L.nx + sw.z * -L.nz);
    gnd = P.grounded;
    step(); if (P.lad) { snag = 1; break; }
  }
  console.log('  walking ALONG the wall past a ladder: ' + (snag ? '*** SNAGGED' : 'not caught, correct')
    + '   (grounded ' + gnd + ', thumb-into-wall ' + dot.toFixed(2) + ' vs the .25 gate)');
}
// and a thumb off the stick entirely, standing right at the foot
{
  const L = LADDERS[0];
  const ok0 = settled(L);
  const trace = ['settled(3.2m out) grounded=' + ok0 + ' y=' + P.pos.y.toFixed(2)];
  placeAt(L, LAD.hold + .05);
  for (let k = 0; k < 4; k++) { trace.push('f' + k + ' gnd=' + P.grounded + ' y=' + P.pos.y.toFixed(2) + ' lad=' + P.lad); step(); }
  console.log('  trace: ' + trace.join('  |  '));
  clear(); settled(L); placeAt(L, LAD.hold + .05);
  let snag = 0, gnd = P.grounded, y = P.pos.y;
  for (let k = 0; k < 90; k++) { gnd = P.grounded; y = P.pos.y; step(); if (P.lad) { snag = 1; break; } }
  console.log('  standing at the foot with no input:  ' + (snag ? '*** GRABBED ANYWAY' : 'not caught, correct')
    + '   (grounded ' + gnd + ', y ' + y.toFixed(2) + ' vs the foot at ' + L.y0.toFixed(2) + ')');
}
