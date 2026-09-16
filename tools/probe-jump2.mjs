// JAM_PROBE=tools/probe-jump2.mjs npm run jam
//
// *"When you have a skateboard you can't double jump like you can otherwise, and I want that to
// still be in effect, because the double tap on the right stick is still open -- it doesn't do
// anything on the skateboard, so why not have that second jump that does a flip?"*
// Driven through the SHIPPED `stepJet` and `stepPlayer` (which dispatches to `stepSkate`) over
// the real collider. `probe-jump.mjs` is the same ladder ON FOOT, and the rows are meant to be
// read side by side: the board's answers have to match it.
//
// STATED GAP, the same one that harness has: `trickFlip` returns early when
// `colin.actions['front_flip']` is absent, and headless it is -- `npm run jam` cannot build a
// skin because DRACO wants a Worker. So the FLIP is not measured here. `p.jumps` and `vel.y`
// are the mechanic and they are real.
const G = globalThis.__shred;
const P = G.player, KIT = G.KIT, stick = G.stick, JET = G.JET, AIR = G.AIR, SK8 = G.SK8;
const DT = 1 / 60;

function step() { G.stepJet(DT); G.stepPlayer(DT); }
function reset() {
  P.pos.set(P.safe.x, P.safe.y + 1, P.safe.z);
  P.vel.set(0, 0, 0); P.speed = 0; P.grounded = true; P.jumps = 0; P.air = '';
  P.hit = ''; P.mel = ''; P.bar = null; P.hang = 0; P.lad = 0; P.rail = null;
  P.board = 1; P.popT = 0; P.trick = ''; P.trickT = 0; P.bRoll = P.bYaw = 0;
  P.pushing = false; P.pushT = 0; P.pushOff = 9;
  P.jump = 0; P.jetFlew = 0; P.jetArm = 0; P.jetWas = 0; P.jetK = 0; P.rHold = 0; P.fuel = 1;
  stick.L.down = 0; stick.L.x = stick.L.y = 0; stick.L.mag = 0;
  stick.R.down = 0; stick.R.x = stick.R.y = 0; stick.R.far = 0;
  for (let i = 0; i < 20; i++) step();
}
function padDown() { stick.R.down = 1; stick.R.x = 0; stick.R.y = 0; stick.R.far = 0; }
function padUp() { stick.R.down = 0; stick.R.x = stick.R.y = 0; stick.R.far = 0; P.jump = 1; }
function hold(sec) { padDown(); for (let i = 0; i < Math.round(sec / DT); i++) step(); }
function tap() { padDown(); step(); padUp(); step(); }
// the pop is a WIND-UP (`SK8.pop`), so he is still on the road for a few frames after the tap
function tapOut() { tap(); for (let i = 0; i < Math.round(SK8.pop / DT) + 2; i++) step(); }

function run(label, pack, script) {
  KIT.out.jet = pack ? 1 : 0;
  reset();
  console.log('  ' + label.padEnd(44) + script());
}
console.log('\nSK8.ollie ' + SK8.ollie + '   AIR.second ' + AIR.second
  + '   -> second jump ' + (SK8.ollie * AIR.second).toFixed(2) + ' m/s   AIR.jumps ' + AIR.jumps + '\n');

for (const pack of [0, 1]) {
  console.log(pack ? 'ON THE BOARD, JETPACK OUT' : 'ON THE BOARD, NO JETPACK');
  run('tap                 -> ollie', pack, () => {
    tapOut();
    return 'jumps ' + P.jumps + (P.jumps === 1 ? '' : ' *** WRONG')
      + '  airborne ' + (!P.grounded ? 'yes' : '*** NO') + '  vy ' + P.vel.y.toFixed(1);
  });
  run('tap, tap            -> DOUBLE JUMP + flip', pack, () => {
    tapOut(); for (let i = 0; i < 10; i++) step();
    const before = P.vel.y; tap();
    return 'jumps ' + P.jumps + (P.jumps === 2 ? '' : ' *** WRONG')
      + '  vy ' + before.toFixed(1) + ' -> ' + P.vel.y.toFixed(1)
      + '  flip "' + (P.trick || 'no clip headless') + '"';
  });
  run('tap, tap, tap       -> no third', pack, () => {
    tapOut(); for (let i = 0; i < 10; i++) step();
    tap(); for (let i = 0; i < 10; i++) step();
    const vy = P.vel.y; tap();
    return 'jumps ' + P.jumps + (P.jumps === 2 ? '' : ' *** WRONG')
      + '  vy ' + vy.toFixed(1) + ' -> ' + P.vel.y.toFixed(1) + ' (untouched)';
  });
  run('rolled off a kerb   -> nothing (never popped)', pack, () => {
    P.grounded = false; P.jumps = 0; P.vel.y = 0; P.pos.y += 3;
    step(); const vy = P.vel.y; tap();
    return 'jumps ' + P.jumps + (P.jumps === 0 ? '' : ' *** WRONG')
      + '  vy ' + vy.toFixed(1) + ' -> ' + P.vel.y.toFixed(1) + ' (falling)';
  });
  run('tap, HOLD 0.6s      -> the flight eats its release', pack, () => {
    tapOut(); for (let i = 0; i < 8; i++) step();
    hold(.6); const lit = P.jetK;
    padUp(); for (let i = 0; i < 3; i++) step();
    const want = pack ? 1 : 2;
    return 'jetK held ' + lit.toFixed(2) + '  jumps after release ' + P.jumps
      + '  (want ' + want + ')' + (P.jumps !== want ? '  *** WRONG' : '');
  });
  run('tap, tap, HOLD 0.6s -> jump, jump, THEN fly', pack, () => {
    tapOut(); for (let i = 0; i < 10; i++) step();
    tap(); for (let i = 0; i < 8; i++) step();
    const j = P.jumps; hold(.6);
    return 'jumps ' + j + (j === 2 ? '' : ' *** WRONG') + ' then jetK ' + P.jetK.toFixed(2)
      + (pack && P.jetK < .5 ? '  *** the pack never lit' : '');
  });
  console.log('');
}
