// JAM_PROBE=tools/probe-jump.mjs npm run jam
//
// *"First tap jump, second tap if it's a tap it's a flip, a double jump -- but if the second one
// is a press and hold then it does the jetpack. That way you can do first jump, second jump and
// THEN jetpack."* Four gestures, driven through the SHIPPED `stepJet` and `stepPlayer` against
// the real collider, because the whole question is whether a tap and a hold on one pad stay
// told apart -- and c116 gave the air move to the pack rather than answer it.
const G = globalThis.__shred;
const P = G.player, KIT = G.KIT, stick = G.stick, JET = G.JET, AIR = G.AIR;
const DT = 1 / 60;

function reset() {
  P.pos.set(G.SPAWNX === undefined ? P.safe.x : P.safe.x, P.safe.y + 1, P.safe.z);
  P.vel.set(0, 0, 0); P.speed = 0; P.grounded = true; P.jumps = 0; P.air = '';
  P.hit = ''; P.mel = ''; P.bar = null; P.hang = 0; P.lad = 0; P.board = null;
  P.jump = 0; P.jetFlew = 0; P.jetArm = 0; P.jetWas = 0; P.jetK = 0; P.rHold = 0; P.fuel = 1;
  stick.R.down = 0; stick.R.x = stick.R.y = 0; stick.R.far = 0;
  for (let i = 0; i < 20; i++) step();          // settle him on the ground
}
function step() { G.stepJet(DT); G.stepPlayer(DT); }
// the pad, exactly as `bindStick` drives it: down, then a release that sets player.jump when
// the thumb was near the middle -- there is NO hold limit on that, which is the charge jump.
function padDown() { stick.R.down = 1; stick.R.x = 0; stick.R.y = 0; stick.R.far = 0; }
function padUp() { stick.R.down = 0; stick.R.x = stick.R.y = 0; stick.R.far = 0; P.jump = 1; }
function hold(sec) { padDown(); for (let i = 0; i < Math.round(sec / DT); i++) step(); }
function tap() { padDown(); step(); padUp(); step(); }

function run(label, pack, script) {
  KIT.out.jet = pack ? 1 : 0;
  reset();
  const log = script();
  console.log('  ' + label.padEnd(46) + log);
}
console.log('\nJET.from ' + JET.from + ' s   AIR.jumps ' + AIR.jumps + '\n');
for (const pack of [0, 1]) {
  console.log((pack ? 'WITH THE JETPACK OUT' : 'NO JETPACK (the control this has to match)'));
  run('tap                     -> jump', pack, () => {
    tap(); for (let i = 0; i < 6; i++) step();
    return 'jumps ' + P.jumps + '  airborne ' + (!P.grounded ? 'yes' : 'NO') + '  vy ' + P.vel.y.toFixed(1);
  });
  run('tap, tap                -> double jump + flip', pack, () => {
    tap(); for (let i = 0; i < 12; i++) step();
    tap(); for (let i = 0; i < 4; i++) step();
    // `airStart` returns early when `colin.actions[nm]` is absent, and headless it is -- so the
    // FLIP is a stated gap in this harness. `jumps` and `vy` are the mechanic and they are real.
    return 'jumps ' + P.jumps + (P.jumps === 2 ? '' : ' *** WRONG') + '  vy ' + P.vel.y.toFixed(1)
      + '  flip "' + (P.air || 'no clip headless') + '"  jetK ' + P.jetK.toFixed(2);
  });
  run('tap, HOLD 0.6s          -> jetpack, double UNSPENT', pack, () => {
    tap(); for (let i = 0; i < 12; i++) step();
    hold(.6);
    const lit = P.jetK;
    padUp(); for (let i = 0; i < 3; i++) step();
    // WITH NO PACK a hold-and-release IS the second jump and 2 is correct; with the pack out
    // the flight has to eat its own release, so 1 is correct. The two rows differ on purpose.
    return 'jetK while held ' + lit.toFixed(2) + '  jumps after release ' + P.jumps
      + '  (want ' + (pack ? 1 : 2) + ')' + (P.jumps !== (pack ? 1 : 2) ? '  *** WRONG' : '');
  });
  run('tap, tap, HOLD 0.6s     -> jump, jump, THEN fly', pack, () => {
    tap(); for (let i = 0; i < 12; i++) step();
    tap(); for (let i = 0; i < 8; i++) step();
    const j = P.jumps;
    hold(.6);
    return 'jumps ' + j + ' then jetK ' + P.jetK.toFixed(2)
      + (pack && P.jetK < .5 ? '  *** the pack never lit' : '');
  });
  console.log('');
}
