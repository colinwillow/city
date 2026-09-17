// JAM_PROBE=tools/probe-top.mjs npm run jam
//
// *"At the top of the ladder he gets stuck in a loop of trying to climb over it and then being on
// the ladder and then trying to climb over it."* -- plus the waypoints and the tap-only jump.
const G = globalThis.__shred;
const P = G.player, stick = G.stick, cam = G.cam, LAD = G.LAD, LADDERS = G.LADDERS, WAY = G.WAY, MOVE = G.MOVE;
const DT = 1 / 60;
// `stepWay` is in the FRAME loop, not in `stepPlayer` -- a probe that leaves it out is
// measuring a game with no waypoints in it, which cost a run.
const step = () => { G.stepJet(DT); G.stepPlayer(DT); G.stepWay(DT); };
function clear() {
  P.vel.set(0, 0, 0); P.speed = 0; P.grounded = true; P.jumps = 0; P.air = '';
  P.hit = ''; P.mel = ''; P.bar = null; P.hang = 0; P.lad = 0; P.rail = null; P.board = null;
  P.dance = ''; P.ship = 0; P.jump = 0; P.aim = 0; P.rollT = 0; P.climbT = 0;
  P.ladCool = 0; P.hangCool = 0; P.rHold = 0; P.charge = 0;
  stick.L.down = 0; stick.L.x = stick.L.y = 0; stick.L.mag = 0;
  stick.R.down = 0; stick.R.x = stick.R.y = 0; stick.R.far = 0;
}

console.log('\n--- THE TOP OF THE LADDER (the stick stays held, as it would in his hand) ---');
let loops = 0;
for (let i = 0; i < LADDERS.length; i++) {
  const L = LADDERS[i];
  clear();
  P.pos.set(L.x + L.nx * 3.2, L.y0 + .1, L.z + L.nz * 3.2);
  for (let k = 0; k < 60 && !P.grounded; k++) step();
  cam.az = Math.atan2(-L.nx, -L.nz);
  stick.L.down = 1; stick.L.x = 0; stick.L.y = -1; stick.L.mag = 1;   // and it is NEVER released
  // THE STICK IS RELEASED WHEN THE MANTLE ENDS (see probe-newpad): held for the whole run he
  // walks straight off the far edge of the roof, which is him obeying the harness, not a bug.
  let onLad = 0, relatch = 0, wasLad = 0, topped = 0, held = 1;
  for (let k = 0; k < Math.round(25 / DT); k++) {
    step();
    if (P.lad && !wasLad) { onLad++; if (topped) relatch++; }
    if (!P.lad && wasLad) topped = 1;
    if (topped && held && !P.hang) { held = 0; stick.L.down = 0; stick.L.x = stick.L.y = 0; stick.L.mag = 0; }
    wasLad = P.lad ? 1 : 0;
  }
  const deck = G.blobFloor ? 0 : 0;
  if (relatch) loops++;
  console.log('  ladder ' + i + '  latched ' + onLad + 'x'
    + (relatch ? '   *** RE-GRABBED ' + relatch + ' TIMES -- the loop' : '   once, correct')
    + '   ended y ' + P.pos.y.toFixed(1) + ' (ladder top ' + L.y1.toFixed(1) + ')'
    + '   ' + (P.lad ? 'ON THE LADDER ***' : P.hang ? 'mid-mantle' : 'on his feet ' + P.grounded));
}
console.log('  ' + loops + ' of ' + LADDERS.length + ' loop');

// THE TAP-vs-HOLD GATE LIVES IN THE PAD BINDING, and a probe that RE-IMPLEMENTS that test is
// measuring a rule the game does not have -- this repo's oldest mistake. It is left to the
// device. What can be stated here without restating anything: `p.vel.y = MOVE.jump` has no charge
// term in it any more, so there is exactly one jump height by construction.
console.log('\n--- WAYPOINTS ---');
clear();
P.pos.set(P.safe.x, P.safe.y + 1, P.safe.z);
for (let k = 0; k < 20; k++) step();
const n0 = WAY.list.length;
const w = G.wayAdd(P.pos.x + 14, P.pos.z);
console.log('  dropped one 14 m away: list ' + WAY.list.length + ', on the map '
  + G.MAP.marks.filter(m => m.tag === 'way').length
  + ', beam sits on the floor at y ' + w.y.toFixed(2));
// AND IT IS SPENT BY ARRIVING, measured in PLAN. Walked at across a real city he would be
// pathfinding round buildings, which is not what is under test -- he is put just outside the
// radius, then just inside it, and the step is what decides.
P.pos.set(w.x + WAY.r + 1.5, P.pos.y, w.z);
step();
const out = WAY.list.length;
P.pos.set(w.x + WAY.r * .5, P.pos.y, w.z);
step();
console.log('  standing ' + (WAY.r + 1.5).toFixed(1) + ' m off: ' + out + ' left (wanted 1)'
  + '   then ' + (WAY.r * .5).toFixed(1) + ' m: ' + WAY.list.length + ' left (wanted 0)'
  + '   map marks left ' + G.MAP.marks.filter(m => m.tag === 'way').length
  + (out === 1 && WAY.list.length === 0 ? '' : '   *** WRONG'));
// the cap
clear();
for (let i = 0; i < WAY.max + 3; i++) G.wayAdd(2000 + i * 40, 2000);
console.log('  dropped ' + (WAY.max + 3) + ' of them: ' + WAY.list.length + ' kept (cap ' + WAY.max + ')'
  + (WAY.list.length === WAY.max ? '' : '   *** WRONG'));
