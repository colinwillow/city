// JAM_PROBE=tools/probe-melee.mjs npm run jam
//
// TWO COMPLAINTS, ONE PROBE, BOTH THROUGH THE SHIPPED CODE.
//   A. *"When he slides it gives him a bit of velocity and then when I'm running he's sliding
//      around like he's ice-skating afterwards."*  -> how long a tackle's leftover takes to
//      answer the thumb, driven through the real `stepPlayer` over the real collider.
//   B. *"If you flick towards the cop there will be a little bit of aim assist."*  -> does
//      `meleeLock` pick the man the flick was aimed at, stay quiet when it was not, and does
//      the speed it solves for actually LAND him on the target.
const G = globalThis.__shred;
const P = G.player, MOVE = G.MOVE, MELEE = G.MELEE, stick = G.stick, cops = G.cops;
const DT = 1 / 60, D = 180 / Math.PI;
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

function stand() {
  P.pos.copy(P.safe); P.pos.y += 1;
  P.vel.set(0, 0, 0); P.speed = 0; P.grounded = true; P.jumps = 0;
  P.hit = ''; P.mel = ''; P.melT = 0; P.rollT = 0; P.bar = null; P.hang = 0; P.lad = 0;
  P.board = null; P.jump = 0; P.goT = 0; P.aim = 0; P.rHold = 0;
  stick.L.down = 0; stick.L.x = stick.L.y = 0; stick.R.down = 0; stick.R.x = stick.R.y = 0;
  for (let i = 0; i < 30; i++) G.stepPlayer(DT);
}
// the thumb, in WORLD terms: `stickWorld` maps the pad through cam.az, so park the camera
// and push the pad straight up -- what matters here is that it is a fixed world direction.
function push(on) { stick.L.down = on ? 1 : 0; stick.L.x = 0; stick.L.y = on ? -1 : 0; }

console.log('\n--- A. COMING OUT OF A TACKLE ---');
console.log('the OLD deceleration, straight off the shipped constants:');
{
  // ramp = 1 - accFall * smooth(0,1, sp0/ceil); at a leftover well over a walking `want` that
  // smooth saturates, and `push` is at its floor because stepMelee set goT = 0.
  const floor = 1 - MOVE.accFall;
  console.log('   MOVE.acc ' + MOVE.acc + ' x (1 - accFall ' + MOVE.accFall + ') x push0 ' + MOVE.push0
    + '  =  ' + (MOVE.acc * floor * MOVE.push0).toFixed(2) + ' m/s^2');
  console.log('   -> 11 m/s of tackle takes ' + (11 / (MOVE.acc * floor * MOVE.push0)).toFixed(1) + ' s to bleed off');
  console.log('   NEW: the negative half takes the full ' + MOVE.acc + ' m/s^2 -> '
    + (11 / MOVE.acc).toFixed(2) + ' s');
}
stand();
G.cam.az = 0;
// leave a tackle exactly as `stepMelee` does: speed along melH, thumb somewhere else
const LEFT = 11;
P.vel.set(LEFT, 0, 0); P.speed = LEFT; P.heading = P.faceH = Math.PI / 2;   // travelling +X
P.goT = MOVE.pushT * .5;
push(1);
let tAlign = -1, tSlow = -1;
for (let i = 0; i < 240; i++) {
  G.stepPlayer(DT);
  const sp = Math.hypot(P.vel.x, P.vel.z);
  const trav = Math.atan2(P.vel.x, P.vel.z);
  const want = G.stickWorld ? null : null;
  const off = Math.abs(wrap(trav - 0)) * D;        // the thumb is +Z here
  if (tAlign < 0 && sp > .3 && off < 15) tAlign = i * DT;
  if (tSlow < 0 && sp <= MOVE.max * 1.05) tSlow = i * DT;
  if (tAlign >= 0 && tSlow >= 0) break;
}
console.log('  from 11 m/s sideways, thumb held the other way:');
console.log('    down to a normal run in ' + (tSlow < 0 ? '*** never' : tSlow.toFixed(2) + ' s')
  + ',  travelling where the thumb points in ' + (tAlign < 0 ? '*** never' : tAlign.toFixed(2) + ' s'));

console.log('\n--- B. THE FLICK LOCK ---');
console.log('MELEE.lock ' + JSON.stringify(MELEE.lock));
const SAVE = cops.slice();
cops.length = 0;
function putCop(bear, dist) {
  stand();
  cops.length = 0;
  cops.push({ x: P.pos.x + Math.sin(bear) * dist, z: P.pos.z + Math.cos(bear) * dist, y: P.pos.y, st: 'idle' });
  return cops[0];
}
const cases = [
  ['dead ahead, 5 m', 0, 5, 0],
  ['20 deg off, 5 m', 0, 5, 20 / D],
  ['29 deg off, 5 m', 0, 5, 29 / D],
  ['35 deg off, 5 m  (outside the cone)', 0, 5, 35 / D],
  ['behind him, 5 m', 0, 5, Math.PI],
  ['dead ahead but 14 m  (out of range)', 0, 14, 0],
  ['dead ahead, 1.5 m', 0, 1.5, 0],
];
for (const [label, bear, dist, off] of cases) {
  const c = putCop(bear, dist);
  const h = bear + off;
  const eff = MELEE.strike * (1 - (1 - MELEE.carry) * .5);
  const t = G.meleeLock(h, Math.min(MELEE.lock.range, MELEE.lock.maxV * eff));
  let line = t ? 'LOCKS' : 'no lock';
  if (t) {
    const got = Math.atan2(t.x - P.pos.x, t.z - P.pos.z);
    line += ', turns him ' + (Math.abs(wrap(got - h)) * D).toFixed(0) + ' deg onto him';
  }
  console.log('  ' + label.padEnd(38) + line);
}
// and TWO cops: the straighter one wins, not the nearer
stand(); cops.length = 0;
cops.push({ x: P.pos.x + Math.sin(.45) * 2.5, z: P.pos.z + Math.cos(.45) * 2.5, y: P.pos.y, st: 'idle', tag: 'near but 26 deg off' });
cops.push({ x: P.pos.x, z: P.pos.z + 5, y: P.pos.y, st: 'idle', tag: 'further but dead ahead' });
{ const eff = MELEE.strike * (1 - (1 - MELEE.carry) * .5);
  console.log('  two of them, flick straight ahead      -> '
    + ((G.meleeLock(0, Math.min(MELEE.lock.range, MELEE.lock.maxV * eff)) || {}).tag || 'nothing')); }

console.log('\n--- does the lock actually LAND him on the man? ---');
// ASSERTED AGAINST THE SHIPPED HIT TEST, not against a number invented here. `copsPunched`
// takes anything inside `COP.reach + COP.r` in the arc, so that is what "in reach" means; the
// first version of this line used COP.r + 1.2 and called a clean hit short by nine centimetres.
console.log('  (a punch reaches ' + (G.COP.reach + G.COP.r).toFixed(2) + ' m -- COP.reach + COP.r)');
for (const dist of [1.5, 2.5, 4, 5.4, 6]) {
  const c = putCop(0, dist);
  const effD = MELEE.strike * (1 - (1 - MELEE.carry) * .5);
  if (dist > Math.min(MELEE.lock.range, MELEE.lock.maxV * effD)) {
    console.log('  cop at ' + dist.toFixed(1) + ' m  ->  OUT OF ACQUIRE RANGE for a strike, no lock (correct)');
    continue;
  }
  // meleeGo needs clips the harness has not got, so its ARITHMETIC is run here against the
  // shipped constants and then driven through the REAL `stepMelee`.
  const dur = MELEE.strike;
  const d = dist * MELEE.lock.reach;
  const need = d / Math.max(.01, dur * (1 - (1 - MELEE.carry) * .5));
  const melV = Math.min(Math.max(MELEE.lunge, need), MELEE.lock.maxV);
  P.mel = MELEE.chain[0]; P.melT = P.melDur = dur; P.melV = melV; P.melH = 0;
  P.melLock = c;                 // the lock is what moves the contact frame -- that is the test
  P.melFx = 0;
  P.melI = 0; P.melAir = 0;
  const x0 = P.pos.x, z0 = P.pos.z;
  const at = MELEE.at[MELEE.chain[0]] !== undefined ? MELEE.at[MELEE.chain[0]] : .38;
  let gap = null;
  for (let i = 0; i < 200 && P.mel; i++) {
    // the contact block draws a mark and punches a cop, and neither has a real scene or a real
    // officer here -- what is under test is WHEN it fires, so a throw out of the body is caught
    // and the frame is still the answer.
    try { G.stepMelee(DT, 0); } catch (e) { if (gap === null) gap = Math.hypot(c.x - P.pos.x, c.z - P.pos.z); P.melFx = 1; P.melT = Math.max(0, P.melT - DT); if (P.melT <= 0) P.mel = ''; }
    if (gap === null && P.melFx) gap = Math.hypot(c.x - P.pos.x, c.z - P.pos.z);
  }
  const trav = Math.hypot(P.pos.x - x0, P.pos.z - z0);
  console.log('  cop at ' + dist.toFixed(1) + ' m  ->  melV ' + melV.toFixed(1)
    + '   travelled ' + trav.toFixed(2) + ' m   gap at the CONTACT frame ' + (gap === null ? '?' : gap.toFixed(2) + ' m')
    + (gap !== null && gap <= G.COP.reach + G.COP.r ? '   HITS' : '   *** MISSES'));
}
cops.length = 0; for (const c of SAVE) cops.push(c);
