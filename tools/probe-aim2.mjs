// JAM_PROBE=tools/probe-aim2.mjs npm run jam
//
// *"The aimer does this flickering thing and I think it's a height thing... I want the aim a
// little less sensitive... and I'm toying with re-adding a small aim assist, but only on the cop.
// In other games I've had this problem where the aimer locks onto them but then when you release,
// the character doesn't actually shoot at the aimer -- I wanna make sure that's all working."*
// Three numbers, all through the shipped `stepAim`, `aimPoint`, `pickTarget` and `shotH` over the
// real collider. The officer is fabricated for the reason `probe-cop3` states: no skin headless,
// and what is under test is `c.x/c.z/c.y`, which are real.
const G = globalThis.__shred;
const P = G.player, W = G.WEAP, cops = G.cops, CH = G.COLIN_HEIGHT;
const HOME = P.pos.clone();
const deg = r => r * 180 / Math.PI;
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

// THE BLASTER HAS TO BE OUT. `stepAim`'s first gate is `KIT.out.blaster` and it returns before
// anything else -- the probe's first run armed nothing, locked nothing and damped nothing, and
// read as three separate failures rather than as one early return.
G.KIT.out.blaster = 1;
function aimHold(h) {                       // the pad pushed straight up, in the camera's frame
  G.cam.az = h; G.cam.el = .17;
  G.stick.R.down = 1; G.stick.R.x = 0; G.stick.R.y = -1; G.stick.R.mag = 1; G.stick.R.far = 1;
}
function reset(board, v, h) {
  P.board = board; P.rail = null; P.bar = null; P.hit = ''; P.mel = ''; P.hang = 0; P.lad = 0;
  P.grounded = true; P.heading = h; P.faceH = h; P.aim = 0; P.aimT = 0; P.aimAdj = 0; P.aimH = h;
  P.armT = 0; P.chg = 0; P.lock = null; P.rHold = 1;
  P.pos.copy(HOME); P.vel.set(Math.sin(h) * v, 0, Math.cos(h) * v); P.speed = v;
  G.stick.L.down = 0; G.stick.L.x = 0; G.stick.L.y = 0; G.stick.L.mag = 0;
  aimHold(h);
}

// ---------- 1. THE HEIGHT FLICKER ----------
function jitter(label, easeY, v) {
  const keep = W.aimEaseY; W.aimEaseY = easeY;
  reset(true, v, 0);
  const dt = 1 / 60; let prev = null, sum = 0, worst = 0, n = 0;
  for (let i = 0; i < 300; i++) {
    aimHold(0);
    G.stepAim(dt); G.stepPlayer(dt);
    const m = G.aimPoint(P.aimH, dt);
    if (i > 30 && prev !== null) { const d = Math.abs(m.y - prev); sum += d; worst = Math.max(worst, d); n++; }
    prev = m.y;
  }
  W.aimEaseY = keep;
  console.log('  ' + label.padEnd(30) + 'mean ' + (sum / Math.max(1, n) * 100).toFixed(2) + ' cm/frame'
    + '   worst ' + (worst * 100).toFixed(1) + ' cm');
  return sum / Math.max(1, n);
}
console.log('\nTHE MARK\'S HEIGHT WHILE RIDING AT 14 m/s -- how much it moves UP AND DOWN per frame\n');
const before = jitter('c174 (one ease, ' + W.aimEase + ')', W.aimEase, 14);
const after = jitter('c175 (ease up ' + W.aimEaseY + ')', W.aimEaseY, 14);

// ---------- 2. THE ASSIST, AND 3. DOES THE SHOT GO TO THE MARK ----------
function aimRun(offDeg, dist, board, on) {
  const keep = W.lock.on; W.lock.on = on;
  cops.length = 0;
  const h = 0, a = h + offDeg * Math.PI / 180;
  const C = { x: HOME.x + Math.sin(a) * dist, y: HOME.y, z: HOME.z + Math.cos(a) * dist,
    h: Math.PI, st: 'idle', t: 0, hp: 3, speed: 0, vx: 0, vz: 0, vy: 0, alert: 0, clip: '',
    actions: {}, box: { minx: 0, maxx: 0, miny: 0, maxy: 0, minz: 0, maxz: 0 } };
  cops.push(C);
  reset(board, board ? 10 : 0, h);
  const dt = 1 / 60;
  for (let i = 0; i < 120; i++) { aimHold(h); G.stepAim(dt); G.stepPlayer(dt); }
  const toCop = Math.atan2(C.x - P.pos.x, C.z - P.pos.z);
  const m = G.aimPoint(P.aimH, dt);
  const markH = Math.atan2(m.x - P.pos.x, m.z - P.pos.z);
  const err = Math.abs(deg(wrap(P.aimH - toCop)));
  const gap = Math.abs(deg(wrap(markH - G.shotH())));
  const lock = !!P.lock;
  W.lock.on = keep;
  return { err, gap, lock };
}
// BOTH WAYS ROUND, because on the board he COVERS GROUND while the aim is held -- 10 m/s for two
// seconds is twenty metres, so the officer's true bearing has moved on its own and an absolute
// "ends N degrees off" says nothing. The assist's help is the DIFFERENCE, so it is measured
// against the same run with the assist off.
function assist(label, offDeg, dist, board) {
  const off = aimRun(offDeg, dist, board, 0);
  const on = aimRun(offDeg, dist, board, 1);
  console.log('  ' + label.padEnd(30)
    + 'off him: ' + off.err.toFixed(1).padStart(5) + ' deg -> ' + on.err.toFixed(1).padStart(5)
    + (on.lock ? '   LOCKED' : '   no lock').padEnd(11)
    + '   MARK vs SHOT ' + on.gap.toFixed(2) + ' deg');
  return { helped: off.err - on.err, gap: Math.max(off.gap, on.gap), lock: on.lock, off: off.err };
}
console.log('\nTHE ASSIST, AND WHETHER THE BOLT GOES WHERE THE MARK IS\n');
const r = [];
r.push(assist('standing, 6 deg off', 6, 20, false));
r.push(assist('standing, 12 deg off', 12, 20, false));
r.push(assist('standing, 25 deg off (outside)', 25, 20, false));
r.push(assist('riding at 10, 8 deg off', 8, 40, true));
r.push(assist('nobody in range', 6, 200, false));
console.log('\n  the cone is ' + deg(W.lock.cone).toFixed(0) + ' deg, so 25 deg off must NOT lock,');
console.log('  and "MARK vs SHOT" is the whole question: the reticle and the bolt are one bearing.');
const gapOK = r.every(x => x.gap < .5);
const pullOK = r[0].helped > 2 && r[1].helped > 4 && !r[2].lock && r[2].helped < .01 && !r[4].lock;
console.log('\n' + (gapOK && pullOK && after < before * .75
  ? 'PASS: the mark IS the shot, the assist helps inside the cone only, and the height is steadier.'
  : 'FAIL: ' + JSON.stringify({ gapOK, pullOK, before, after })));
