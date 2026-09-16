// JAM_PROBE=tools/probe-carcop.mjs npm run jam
//
// *"I think the cars should be able to hit the cop -- right now if I shoot the cop and he's on
// the ground and a car drives over, nothing happens. I wanna be able to shoot people into the
// cars, and if they hit the car the car sends them flying just like it sends me flying."*
// Driven through the SHIPPED `stepTraffic` (which is what calls `copsCarHit`) on a REAL car in
// the real city, one frame per case.
//
// STATED GAP, the same one `probe-cop3.mjs` has: `npm run jam` cannot build a character skin --
// DRACO wants a Worker -- so `cops` comes back EMPTY and the officer here is fabricated. What is
// under test is not the model but whether a car's own oriented box reaches him, and that reads
// `c.x/y/z`, `c.st` and `c.carCool` and nothing else. `copFly` falls back to the old fold
// headless (no `c.actions`), so a launch shows as st 'down' rather than 'fly' -- the STATE
// CHANGE is the measurement, and which clip plays belongs in `npm run cop`.
const G = globalThis.__shred;
const cars = G.cars, cops = G.cops, COP = G.COP, HEAT = G.HEAT, H = G.COLIN_HEIGHT;
const DT = 1 / 60;

console.log('\ndriving cars in the city: ' + cars.length
  + '   TRAF.share ' + G.TRAF.share + '   COP.carV ' + COP.carV + '   carCool ' + COP.carCool + '\n');

// park him out of the way: `stepTraffic` also runs `carHit` within 12 m of the player
G.player.pos.set(9e4, 0, 9e4);
G.COP.on = 1;

// the fastest car with room round it, so one frame of traffic cannot move a neighbour onto him
let car = null;
for (const c of cars) if (c.speed > 6 && (!car || c.speed > car.speed)) car = c;
if (!car) { console.log('FAIL  no moving car'); }

function fake(st) {
  const c = { id: 0, key: 'cop', st, t: 0, hp: COP.hp, h: 0, speed: 0, carCool: 0,
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, alert: 0, clip: '',
    actions: { [COP.clips.flyF]: 1, [COP.clips.flyB]: 1 },
    root: { position: { set() {} }, rotation: {} }, cw: {}, box: null };
  cops.length = 0; cops.push(c); return c;
}
// put him where the case wants him, in the car's OWN frame: `along` down the bonnet,
// `side` across it. That is the frame the test is made in, so it is the frame to place in.
function put(c, along, side, dy) {
  const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
  c.x = car.x + fx * along - fz * side;
  c.z = car.z + fz * along + fx * side;
  c.y = car.y + (dy || 0);
}
function run(label, st, along, side, dy, speed, want) {
  const c = fake(st);
  const keep = car.speed;
  if (speed !== null) car.speed = speed;
  put(c, along, side, dy);
  const h0 = HEAT.n;
  G.stepTraffic(DT);
  car.speed = keep;
  const hit = c.hp === 0;
  const ok = hit === want;
  console.log('  ' + label.padEnd(44)
    + (hit ? 'FLIES  st ' + c.st + '  up ' + c.vy.toFixed(1) + '  along ' + Math.hypot(c.vx, c.vz).toFixed(1)
           : 'untouched')
    + (ok ? '' : '   *** WRONG, wanted ' + (want ? 'a hit' : 'no hit'))
    + (HEAT.n !== h0 ? '   *** HEAT ROSE ' + h0 + ' -> ' + HEAT.n : ''));
}

console.log('the test car: speed ' + car.speed.toFixed(1) + ' m/s, ' + (car.hl * 2).toFixed(2)
  + ' m long x ' + (car.hw * 2).toFixed(2) + ' wide\n');

run('standing in the lane          -> flies', 'chase', 0.0, 0, 0, null, true);
run('standing at the bonnet        -> flies', 'chase', car.hl * .9, 0, 0, null, true);
run('DOWN in the lane (the ask)    -> punted', 'down', 0.0, 0, 0, null, true);
run('getting up in the lane        -> punted', 'up', 0.0, 0, 0, null, true);
run('a car length ahead            -> no hit', 'chase', car.hl + COP.r + 1.2, 0, 0, null, false);
run('level with it, 2 m to the SIDE-> no hit', 'chase', 0.0, car.hw + COP.r + 1.2, 0, null, false);
run('on a roof 4 m over it         -> no hit', 'chase', 0.0, 0, 4, null, false);
run('a STOPPED car on top of him   -> no hit', 'chase', 0.0, 0, 0, 0, false);
run('a car crawling at carV - 0.4  -> no hit', 'chase', 0.0, 0, 0, COP.carV - .4, false);

// AND IT MUST NOT RE-FIRE WHILE THE CAR SITS ON HIM -- `carCool` is the whole reason a knot of
// traffic over a prone man is a punt down the road rather than a body vibrating in place.
{
  const c = fake('chase');
  put(c, 0, 0, 0);
  let n = 0;
  for (let i = 0; i < 30; i++) { c.hp = COP.hp; G.stepTraffic(DT); if (c.hp === 0) n++; put(c, 0, 0, 0); }
  console.log('  ' + 'held under the car for 0.5 s'.padEnd(44) + n + ' launch' + (n === 1 ? '' : 'es')
    + (n === 1 ? '' : '   *** WRONG, wanted 1'));
}
cops.length = 0;
