// JAM_PROBE=tools/probe-fly.mjs npm run jam
//
// *"To be able to fly, it would be nice."* The flight model, driven through the SHIPPED
// `shipPilot`/`stepShip` over the REAL city and the REAL collider.
//
// STATED GAP: `models/alien_ship_orange.glb` is draco-compressed and `jam.mjs` decompresses only
// `city.glb`, so `buildShip` never runs headless. The hull is fabricated here -- a Group, a box
// and an empty bone table -- which is exactly the shape `buildShip` produces and is all the
// flight code reads. What that CANNOT test is the joints (gear, nozzles, hatch, flames), because
// there are no bones to turn; those degrade to no-ops by construction and belong on the device.
// The PHYSICS, the collider and the landing are the parts under test and they are real.
const G = globalThis.__shred;
const P = G.player, stick = G.stick, SHIP = G.SHIP, PILOT = G.PILOT, cam = G.cam;
const DT = 1 / 60;

// a hull where the real one parks: hotel_a's roof
const Group = G.cityGroup.constructor, V3 = P.pos.constructor;
SHIP.g = new Group();
SHIP.bones = {}; SHIP.gearRest = {}; SHIP.flames = null; SHIP.hatchRest = 0;
SHIP.size = 4.4;
SHIP.box = { minx: 0, maxx: 0, minz: 0, maxz: 0, miny: 0, maxy: 0, hl: 2.2, hw: 1.5, hh: 1.4 };
SHIP.pos = new V3(SHIP.at[0], SHIP.at[1], SHIP.at[2]);
SHIP.vel = new V3();
SHIP.heading = SHIP.yaw;
SHIP.ctl = { throttle: 0, yaw: 0, pitch: 0, strafe: 0, gear: 0 };
SHIP.sm = { throttle: 0, yaw: 0, pitch: 0, strafe: 0, gear: 0 };

function step() { G.stepPlayer(DT); G.stepShip(DT); }
function pads(fwd, str, yaw, up) {
  stick.L.down = (fwd || str) ? 1 : 0; stick.L.x = str; stick.L.y = -fwd; stick.L.mag = Math.hypot(str, fwd);
  stick.R.down = (yaw || up) ? 1 : 0; stick.R.x = yaw; stick.R.y = -up; stick.R.far = Math.hypot(yaw, up);
}
function park() {
  P.ship = 0; P.hit = ''; P.board = null; P.bar = null; P.hang = 0; P.lad = 0; P.mel = '';
  SHIP.at[0] = 298.2; SHIP.at[1] = 17.1; SHIP.at[2] = -13.1; SHIP.yaw = -.85;
  SHIP.pos.set(SHIP.at[0], SHIP.at[1], SHIP.at[2]); SHIP.vel.set(0, 0, 0);
  SHIP.heading = SHIP.yaw; SHIP.yawRate = 0; SHIP.grounded = 1; SHIP.power = 0; SHIP.air = 0;
  P.pos.set(SHIP.at[0] + 2, SHIP.at[1] + .2, SHIP.at[2]);
  P.vel.set(0, 0, 0); P.speed = 0; P.grounded = true;
  pads(0, 0, 0, 0);
  for (let i = 0; i < 4; i++) step();
}
const alt = () => SHIP.pos.y - (G.hmAt(SHIP.pos.x, SHIP.pos.z));
const spd = () => Math.hypot(SHIP.vel.x, SHIP.vel.z);

console.log('\nPILOT thrust ' + PILOT.thrust + ' drag ' + PILOT.drag
  + '  -> top speed thrust/drag = ' + (PILOT.thrust / PILOT.drag).toFixed(0) + ' m/s'
  + '   spool ' + PILOT.spoolT + 's\n');

console.log('--- BOARDING ---');
park();
const far = (() => { P.pos.set(SHIP.at[0] + 40, SHIP.at[1], SHIP.at[2]); return G.board(); })();
console.log('  40 m away        -> ' + (far ? '*** BOARDED ANYWAY' : 'refused, correct'));
park();
console.log('  2 m away         -> ' + (G.board() ? 'aboard' : '*** REFUSED') + ', player hidden ' + !G.colin.root.visible);

console.log('\n--- LIFT-OFF: the jets spool, then it unsticks all at once ---');
let lift = -1;
for (let i = 0; i < Math.round(6 / DT); i++) { pads(0, 0, 0, 1); step(); if (!SHIP.grounded && lift < 0) lift = i; }
console.log('  held up: off the ground at ' + (lift * DT).toFixed(2) + 's (spoolT ' + PILOT.spoolT + ')'
  + '   climbed to ' + alt().toFixed(1) + ' m'
  + ((lift * DT) > PILOT.spoolT - .2 && alt() > 10 ? '' : '   *** WRONG'));

console.log('\n--- THRUST AND COAST: one drag in, another out ---');
let t5 = -1, t30 = -1;
for (let i = 0; i < Math.round(20 / DT); i++) {
  pads(1, 0, 0, 0); step();
  if (t5 < 0 && spd() > 5) t5 = i;
  if (t30 < 0 && spd() > 30) t30 = i;
}
const top = spd();
console.log('  held forward 20s: 5 m/s at ' + (t5 * DT).toFixed(1) + 's, 30 at ' + (t30 * DT).toFixed(1)
  + 's, reached ' + top.toFixed(1) + ' m/s' + (top > 40 ? '' : '   *** WRONG'));
let coast = 0;
for (let i = 0; i < Math.round(6 / DT); i++) { pads(0, 0, 0, 0); step(); coast = spd(); }
console.log('  let go for 6s:    ' + top.toFixed(1) + ' -> ' + coast.toFixed(1) + ' m/s'
  + '  (at the cruise drag alone it would still be ' + (top * Math.exp(-PILOT.drag * 6)).toFixed(1) + ')'
  + (coast < top * .4 ? '' : '   *** it is not shedding it'));

console.log('\n--- TURNING: the rate builds, and carries on for a beat ---');
const h0 = SHIP.heading;
for (let i = 0; i < Math.round(2 / DT); i++) { pads(0, 0, 1, 0); step(); }
const rate = SHIP.yawRate;
for (let i = 0; i < Math.round(1 / DT); i++) { pads(0, 0, 0, 0); step(); }
console.log('  2s of turn: rate ' + rate.toFixed(2) + ' rad/s, swept '
  + (Math.abs(SHIP.heading - h0) * 57.3).toFixed(0) + ' deg, still '
  + (Math.abs(SHIP.yawRate) * 57.3).toFixed(0) + ' deg/s a second after letting go'
  + (Math.abs(rate) > .5 ? '' : '   *** WRONG'));

console.log('\n--- THE CITY IS SOLID TO IT ---');
// fly it at the tallest thing near the spawn at full tilt and see whether it comes out the far side
park(); G.board();
SHIP.grounded = 0; SHIP.power = 1;
SHIP.pos.set(245, 12, 40); SHIP.heading = 0; SHIP.vel.set(0, 0, 40);
let inside = 0, minY = 1e9;
for (let i = 0; i < Math.round(4 / DT); i++) {
  pads(1, 0, 0, 0); step();
  const q = []; G.stepBoxes && 0;
  minY = Math.min(minY, SHIP.pos.y);
}
console.log('  driven downtown at 40 m/s for 4s: ended at '
  + SHIP.pos.x.toFixed(0) + ',' + SHIP.pos.z.toFixed(0) + ' y ' + SHIP.pos.y.toFixed(1)
  + '  speed ' + spd().toFixed(1) + ' (a clean run would be ~' + (40 * 4) + ' m of travel)');

console.log('\n--- LANDING: a settle, not a stop ---');
park(); G.board();
SHIP.grounded = 0; SHIP.power = 1; SHIP.pos.y = SHIP.at[1] + 40; SHIP.vel.set(0, 0, 0);
let downT = -1, worst = 0, touch = 0, gearAt = -1;
for (let i = 0; i < Math.round(20 / DT); i++) {
  pads(0, 0, 0, -1); touch = SHIP.vel.y; step();
  worst = Math.min(worst, SHIP.vel.y);
  if (gearAt < 0 && SHIP.ctl.gear < .5) gearAt = i;
  if (SHIP.grounded) { downT = i; break; }
}
// TOUCHDOWN is the number that matters, not the worst of the whole fall: free-fall from 40 m is
// SUPPOSED to be fast, and the flare's whole job is to have bled it off by the time it arrives.
console.log('  dropped 40 m onto the roof: down in ' + (downT < 0 ? 'NEVER ***' : (downT * DT).toFixed(1) + 's')
  + '   fastest of the fall ' + worst.toFixed(1) + ', TOUCHDOWN ' + touch.toFixed(2) + ' m/s'
  + (touch < -PILOT.land ? '   *** it should have bounced' : '')
  + '   gear down at ' + (gearAt < 0 ? 'NEVER ***' : (gearAt * DT).toFixed(1) + 's')
  + '   lives at ' + SHIP.at.map(v => v.toFixed(0)).join(','));

console.log('\n--- LEAVING ---');
const ok = G.leave();
for (let i = 0; i < 90; i++) step();
console.log('  stepped out: ' + (ok ? '' : '*** REFUSED ') + 'visible ' + G.colin.root.visible
  + ', on his feet ' + P.grounded + ' at y ' + P.pos.y.toFixed(1)
  + ', ' + Math.hypot(P.pos.x - SHIP.pos.x, P.pos.z - SHIP.pos.z).toFixed(1) + ' m from the hull');
