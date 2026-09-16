// JAM_PROBE=tools/probe-brake.mjs npm run jam
//
// *"When you're on your skateboard and you pull down on the left stick, it should slow you
// down. But instead, it turns you."*
// One question, and it is a number rather than an opinion: hold the thumb dead against his
// travel and read (a) how much his HEADING moves and (b) whether the speed actually reaches
// zero. It drives the SHIPPED `stepSkate` -- no restatement of the rule anywhere in here.
const G = globalThis.__shred;
const P = G.player, SK8 = G.SK8;
const HOME = P.pos.clone();          // wherever the boot left him -- the spawn, and it is flat road
const deg = r => r * 180 / Math.PI;
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

// `stickWorld` reads the pad in the CAMERA's frame, so the camera has to be behind him or
// "pull down" means something else -- the same trap `stepBar`'s pump had.
function aimCam() { G.cam.az = P.heading; G.cam.el = 0.17; }

function run(v0, padX, padY, secs, label) {
  P.board = true; P.rail = null; P.bar = null; P.hit = ''; P.mel = ''; P.hang = 0; P.lad = 0;
  P.grounded = true; P.braked = 0; P.turnT = 0; P.turnRem = 0;
  P.pushing = false; P.pushT = 0; P.shoveT = 0; P.jump = 0;
  P.heading = 0; P.faceH = 0;
  P.pos.copy(HOME);
  P.vel.set(0, 0, v0);                      // rolling along +Z, which IS his nose at heading 0
  P.speed = v0;
  const h0 = P.heading;
  aimCam();
  G.stick.L.x = padX; G.stick.L.y = padY; G.stick.L.mag = Math.hypot(padX, padY); G.stick.L.down = 1;
  const dt = 1 / 60;
  let worstYaw = 0, stopT = -1;
  for (let i = 0; i < Math.round(secs / dt); i++) {
    aimCam();                                // the lens stays put; only the board is under test
    G.stepPlayer(dt);                        // the REAL top-level path, not stepSkate in isolation
    worstYaw = Math.max(worstYaw, Math.abs(deg(wrap(P.heading - h0))));
    const sp = Math.hypot(P.vel.x, P.vel.z);
    if (stopT < 0 && sp < .3) stopT = i * dt;
  }
  const sp = Math.hypot(P.vel.x, P.vel.z);
  console.log('  ' + label.padEnd(34)
    + 'yaw worst ' + worstYaw.toFixed(1).padStart(6) + ' deg'
    + '   speed ' + v0.toFixed(1) + ' -> ' + sp.toFixed(2)
    + (stopT >= 0 ? '   stopped at ' + stopT.toFixed(2) + 's' : '   NEVER STOPPED'));
  return { worstYaw, sp, stopT };
}
G.stick.L.down = 1;
// `stickWorld` maps `w`/up to ly -= 1, so the pad's +Y is DOWN THE SCREEN -- pulling back is
// (0, +1). Worth writing down: the first run of this probe had it the other way round and
// reported the brake accelerating him to 21 m/s, which is the push working perfectly.
console.log('\nHOLDING THE THUMB STRAIGHT BACK  (pad 0,+1 -- dead against his travel)\n');
const a = run(15, 0, 1, 4.0, 'from 15 m/s');
const b = run(8, 0, 1, 4.0, 'from 8 m/s');
const c = run(4, 0, 1, 4.0, 'from 4 m/s');
console.log('\nAND SLIGHTLY OFF, because a thumb is never exact\n');
const d = run(15, .25, .97, 4.0, 'from 15 m/s, 15 deg off');
const e = run(15, -.25, .97, 4.0, 'from 15 m/s, 15 deg the other way');
console.log('\nTHE CONTROLS THAT MUST NOT HAVE CHANGED\n');
const f = run(8, 0, -1, 2.0, 'thumb FORWARD (a push)');
const g = run(8, 1, 0, 2.0, 'thumb RIGHT (a turn)');

const bad = [a, b, c, d, e].filter(r => r.worstYaw > 12 || r.stopT < 0);
console.log('');
if (bad.length) { console.log('*** ' + bad.length + ' brake case(s) still turn him or never stop'); process.exit(1); }
if (f.sp <= 8.1) { console.log('*** the forward push no longer accelerates (' + f.sp.toFixed(2) + ')'); process.exit(1); }
if (g.worstYaw < 30) { console.log('*** a sideways thumb no longer steers (' + g.worstYaw.toFixed(1) + ' deg)'); process.exit(1); }
console.log('a held brake slows him to a stop and does not turn him; the push and the turn are untouched.');
