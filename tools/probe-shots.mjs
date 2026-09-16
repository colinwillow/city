// JAM_PROBE=tools/probe-shots.mjs npm run jam
//
// FOUR SHOTS INTO ONE CAR, WITH THE TRAFFIC RUNNING BETWEEN THEM -- which is the thing the
// single-shot probe did not do. *"Once you shoot them and they stop they start moving again,
// and even after they make the explosion noise they still start moving again."* That sentence
// is about state surviving across time, so the probe has to spend time.
const G = globalThis.__shred;
const step = (n, dt = 1 / 60) => { for (let i = 0; i < n; i++) G.stepTraffic(dt); };
const car = G.cars.find(c => c.inner && c.speed > 1) || G.cars[0];
const row = t => '    hp ' + String(car.hp).padStart(9) + '  dead ' + (car.dead ? 'Y' : 'n')
  + '  zap ' + (car.zap || 0).toFixed(2) + '  speed ' + car.speed.toFixed(2)
  + '  wreck ' + (car.wreck ? (car.wreck.blown ? 'BLOWN' : 'chunks ' + car.wreck.bits.length) : 'none')
  + (t ? '   ' + t : '');

console.log('\nfour shots into car ' + car.id + ', two seconds of traffic between each\n');
console.log(row('before'));
for (let shot = 1; shot <= 5; shot++) {
  const stage = G.carHurt(car, 0, 1);
  console.log('  shot ' + shot + ' -> stage ' + stage);
  console.log(row('just after'));
  step(120);                       // two seconds: longer than BOLT.stun, so a stun expires here
  console.log(row('+2.0s'));
  if (car.dead) break;
}
// AND THE THING THREE BUILDS HAVE NOW FAILED TO DO: DO THE PIECES ACTUALLY MOVE?
// The shader version verified perfectly here and never moved on the device. These are ordinary
// meshes with ordinary positions, so the question has an answer that can be printed.
if (car.wreck && car.wreck.bits.length) {
  const bits = car.wreck.bits;
  const at0 = bits.map(b => b.m.position.clone());
  for (let i = 0; i < 90; i++) G.stepWrecks(1 / 60);          // a second and a half of debris
  let far = 0, sum = 0;
  bits.forEach((b, i) => { const d = b.m.position.distanceTo(at0[i]); far = Math.max(far, d); sum += d; });
  console.log('\n  ' + bits.length + ' chunks, 1.5 s after the blast:');
  console.log('    moved on average ' + (sum / bits.length).toFixed(2) + ' m, furthest ' + far.toFixed(2) + ' m');
  console.log('    resting: ' + bits.filter(b => b.rest).length + ' of ' + bits.length);
  if (far < .5) console.log('    *** THE PIECES DID NOT MOVE');
  else if (far > 12) console.log('    *** THE PIECES LEFT THE POSTCODE -- that was the c145 bug');
  else console.log('    they came apart and landed near the car, which is the whole ask');
}

console.log('');
if (!car.dead) console.log('*** FOUR SHOTS AND IT NEVER BLEW UP -- the stage machine is the bug, not the shader');
else if (car.speed > .01) console.log('*** IT BLEW UP AND IS STILL MOVING at ' + car.speed.toFixed(2) + ' m/s');
else console.log('blown, stopped, and out of the traffic -- the stage machine is intact');
// AND WHAT `BOLT.stun` ACTUALLY IS, because "it starts moving again" may simply be the stun
// expiring on a car that is damaged but not dead -- which is correct behaviour nobody asked for.
console.log('\nBOLT.stun is ' + G.BOLT.stun + 's: a damaged-but-alive car is stunned for that long');
console.log('and then drives on. Four shots must therefore land inside ' + (G.BOLT.stun * 3).toFixed(1) + 's, or it is');
console.log('a moving target between every one of them.');
