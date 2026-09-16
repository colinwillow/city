// JAM_PROBE=tools/probe-flip.mjs npm run jam
//
// *"I did a double jump, which does a flip, and then used my jetpack in the air, and it held the
// end of the flip rather than going back to the skateboard idle... we could probably shave some
// off the end of the flip animation, because he lands on the ground and we don't want it -- he's
// above the skateboard, it's just floating below him."*
//
// TWO MEASUREMENTS, BOTH THROUGH SHIPPED CODE: how much of the clip `trickFlip` asks for, and
// how long `stepSkate` keeps `p.trick` set.
//
// **THE FAKE ACTION IS WHAT MAKES THE FIRST ONE POSSIBLE.** `npm run jam` cannot build a skin --
// DRACO wants a Worker -- so `colin.actions` is empty, `trickFlip` returns early on the missing
// clip and NOTHING about the flip happens at all (that is the stated gap `probe-jump2.mjs` has).
// `clipLen` and `colinScale` between them touch exactly two methods, so an object carrying the
// REAL duration out of `models/colin.glb` lets the shipped function run and hands back the time
// scale it chose. `front_flip` is the one measured because it has no `TRIM` entry, so `clipLen`
// headless (where `TRIM_IN` is empty) is the same number it is in the game; `back_flip` loses
// 0.400 s off its head first and the arithmetic below applies to what is LEFT.
const G = globalThis.__shred;
const P = G.player, KIT = G.KIT, stick = G.stick, SK8 = G.SK8, TRICK = G.TRICK, colin = G.colin;
const DT = 1 / 60;
const FLIP = 0.800;                      // models/colin.glb, read with @gltf-transform: 24 frames

let scale = 1;
colin.actions = colin.actions || {};
colin.actions['front_flip'] = { getClip: () => ({ duration: FLIP }), setEffectiveTimeScale(s) { scale = s; } };

function step() { G.stepJet(DT); G.stepPlayer(DT); }
function reset() {
  P.pos.set(P.safe.x, P.safe.y + 1, P.safe.z);
  P.vel.set(0, 0, 0); P.speed = 0; P.grounded = true; P.jumps = 0; P.air = '';
  P.hit = ''; P.mel = ''; P.bar = null; P.hang = 0; P.lad = 0; P.rail = null;
  P.board = 1; P.popT = 0; P.trick = ''; P.trickT = 0; P.trickDur = 0; P.bRoll = P.bYaw = 0;
  P.pushing = false; P.pushT = 0; P.pushOff = 9;
  P.jump = 0; P.jetFlew = 0; P.jetArm = 0; P.jetWas = 0; P.jetK = 0; P.rHold = 0; P.fuel = 1;
  stick.L.down = 0; stick.L.x = stick.L.y = 0; stick.L.mag = 0;
  stick.R.down = 0; stick.R.x = stick.R.y = 0; stick.R.far = 0;
  for (let i = 0; i < 20; i++) step();
}
function padDown() { stick.R.down = 1; stick.R.x = 0; stick.R.y = 0; stick.R.far = 0; }
function padUp() { stick.R.down = 0; stick.R.x = stick.R.y = 0; stick.R.far = 0; P.jump = 1; }
function tap() { padDown(); step(); padUp(); step(); }
function tapOut() { tap(); for (let i = 0; i < Math.round(SK8.pop / DT) + 2; i++) step(); }

console.log('\nfront_flip ' + FLIP.toFixed(3) + 's   TRICK.tail ' + TRICK.tail + '\n');

// ---- 1. HOW MUCH OF THE CLIP IS PLAYED, through the shipped `trickFlip` ----
// The scale is what decides it: over `trickDur` seconds of real time an action at `scale`
// covers `scale * trickDur` SECONDS OF CLIP, and the tail past that is never reached.
console.log('what `trickFlip` asks for (the shipped function, via colinScale):');
for (const tail of [1, TRICK.tail]) {
  const was = TRICK.tail; TRICK.tail = tail;
  KIT.out.jet = 0; reset();
  tapOut(); for (let i = 0; i < 10; i++) step();
  tap();
  const played = scale * P.trickDur;
  console.log('  tail ' + tail.toFixed(2) + '   trickDur ' + P.trickDur.toFixed(3) + 's'
    + '   timeScale ' + scale.toFixed(3)
    + '   -> plays ' + played.toFixed(3) + 's of clip, CUTS ' + (FLIP - played).toFixed(3)
    + 's (' + Math.round((FLIP - played) * 30) + ' frames)'
    + (Math.abs(played - FLIP * tail) > 1e-6 ? '  *** WRONG' : ''));
  TRICK.tail = was;
}

// ---- 2. HOW LONG `p.trick` SURVIVES, through the shipped `stepSkate` ----
// c179 cleared it only on LANDING, so a flight longer than the flip held the clip's last frame
// for the rest of it. The jetpack is simply the longest flight there is.
function fly(pack, label) {
  KIT.out.jet = pack ? 1 : 0; reset();
  tapOut(); for (let i = 0; i < 10; i++) step();
  tap();                                   // the double jump: this is where the flip starts
  const dur = P.trickDur;
  let heldT = 0, sawClear = -1, clearAt = 0, air = 0, peak = 0;
  if (pack) padDown();                     // and hold: the motor lights, so the flight is long
  for (let i = 0; i < Math.round(4 / DT); i++) {
    step();
    air += DT; peak = Math.max(peak, P.jetK);
    if (P.trick) heldT += DT; else if (sawClear < 0) { sawClear = i; clearAt = heldT; }
    if (P.grounded) break;
  }
  if (pack) padUp();
  console.log('  ' + label.padEnd(34)
    + 'airtime ' + air.toFixed(2) + 's (peak jetK ' + peak.toFixed(2) + ')'
    + '   flip asked for ' + (sawClear < 0 ? air : clearAt).toFixed(2) + 's of it'
    + (sawClear < 0 ? '   *** NEVER CLEARED -- holding the last frame'
       : '   then the BOARD POSE for ' + (air - clearAt).toFixed(2) + 's'));
}
console.log('\nhow long the flip clip is asked for (the shipped stepSkate):');
fly(0, 'double jump, no pack');
fly(1, 'double jump then the JETPACK');
