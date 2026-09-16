// JAM_PROBE=tools/probe-cop3.mjs npm run jam
//
// *"It looks like we entirely removed the collider and I don't think that's how it should be. It
// should be like a state machine... if I'm just fighting him with the swipes on the ground, or
// just walking around, I still want to collide with him and I still want him to stop me. But if
// you're riding and you hit him or melee him, it just sends him flying instead of ricocheting me."*
// Four cases, one line each, through the shipped `stepPlayer`, `copGhost`, `copPlough` and
// `copsPunched` over the real collider.
//
// THE OFFICER IS FABRICATED AND THAT IS A STATED GAP. `npm run jam` cannot build a character skin
// -- every character GLB is draco and `DRACOLoader` wants a Worker a headless node has not got --
// so `cops` comes back empty. What is under test here is not the model: it is whether his BOX
// reaches the player's resolver, which reads `c.box`, `c.st` and `c.x/z` and nothing else. Those
// are real. Anything about the clips belongs in `npm run cop`.
const G = globalThis.__shred;
const P = G.player, COP = G.COP, cops = G.cops, CH = G.COLIN_HEIGHT;
const HOME = P.pos.clone();
cops.length = 0;
const C = { x: 0, y: HOME.y, z: 0, h: Math.PI, st: 'idle', t: 0, hp: COP.hp, speed: 0,
  vx: 0, vz: 0, vy: 0, spin: 0, alert: 0, clip: '', nerve: 1, react: 0, cadence: 1,
  actions: { [COP.clips.flyF]: 1, [COP.clips.flyB]: 1 },
  box: { minx: 0, maxx: 0, miny: 0, maxy: 0, minz: 0, maxz: 0 } };
cops.push(C);

function place(ahead) {
  C.x = HOME.x; C.z = HOME.z + ahead; C.y = HOME.y; C.h = Math.PI;
  C.st = 'idle'; C.t = 0; C.hp = COP.hp; C.speed = 0; C.vx = C.vz = C.vy = 0; C.alert = 0;
  C.box.minx = C.x - .35; C.box.maxx = C.x + .35;
  C.box.minz = C.z - .35; C.box.maxz = C.z + .35;
  C.box.miny = C.y; C.box.maxy = C.y + CH * .95;
}
function reset(board, v, push) {
  P.board = board; P.rail = null; P.bar = null; P.hit = ''; P.mel = ''; P.melStep = 0; P.melT = 0;
  P.hang = 0; P.lad = 0; P.grounded = true; P.braked = 0; P.turnT = 0; P.turnRem = 0; P.copPass = 0;
  P.pushing = false; P.pushT = 0; P.jump = 0; P.jumps = 0; P.melEntry = 0; P.melLock = null;
  P.heading = 0; P.faceH = 0; P.pos.copy(HOME); P.vel.set(0, 0, v); P.speed = v;
  G.cam.az = 0; G.cam.el = .17;
  // NO THUMB. Held forward he accelerates into a sprint, and a sprint is past `flyV` -- which
  // would turn "walking into him" into "arriving with something" and measure the wrong case.
  G.stick.L.x = 0; G.stick.L.y = push ? -1 : 0; G.stick.L.mag = push ? 1 : 0; G.stick.L.down = push ? 1 : 0;
  G.stick.R.down = 0; G.stick.R.x = 0; G.stick.R.y = 0; G.stick.R.mag = 0; G.stick.R.far = 0;
}
function run(label, { board, v, melee, push, ahead = 4, secs = 2.5 }) {
  place(ahead); reset(board, v, push);
  const dt = 1 / 60;
  // `meleeGo` BAILS HEADLESS -- its last gate is `colin.actions[nm]` and there is no skin here,
  // which is the same stated gap `probe-jump` has about the flip. So the strike state is set the
  // way `meleeGo` sets it. What is under test is `copGhost` and `copsPunched`, not `meleeGo`.
  if (melee) {
    // AND IT HAS TO PICK THE MOVE THE WAY `meleeGo` PICKS IT. The first version always threw the
    // standing JAB at `MELEE.lunge` 4.0 whatever the entry speed was, so 12 m/s and 15 m/s covered
    // the identical 0.73 m, never reached the officer at 2.2 m, and read as "the sprint does not
    // plough" when the sprint had simply never arrived. Above `runAt` it is the TACKLE, and a
    // tackle keeps `slideV` of the speed he came in with -- which is the whole reason it travels.
    const M = G.MELEE;
    P.melEntry = P.speed;
    const slide = P.speed > M.runAt;
    P.mel = slide ? M.slide : M.chain[0];
    P.melT = P.melDur = slide ? M.slideDur : M.strike;
    P.melV = board ? 0 : slide ? Math.max(P.speed * M.slideV, M.runAt) : M.lunge;
    P.melH = 0; P.melI = 0; P.melFx = 0; P.melLock = null; P.melHit = 0;   // melFx is HAS-FIRED
  }
  let through = false, near = 99;
  for (let i = 0; i < Math.round(secs / dt); i++) {
    G.stepPlayer(dt);
    if (C.st !== 'fly') near = Math.min(near, C.z - P.pos.z);
    if (P.pos.z > C.z + .15) through = true;
  }
  const flew = C.st === 'fly' || C.st === 'down' || C.st === 'out' || C.st === 'up';
  console.log('  ' + label.padEnd(38)
    + (through ? 'WENT THROUGH him' : 'stopped ' + near.toFixed(2) + 'm short').padEnd(22)
    + 'cop ' + (C.st === 'fly' ? 'FLYING' : flew ? 'DOWN' : 'standing, hp ' + C.hp).padEnd(18)
    + 'speed ' + v.toFixed(0) + ' -> ' + Math.hypot(P.vel.x, P.vel.z).toFixed(1));
  return { through, flew, st: C.st, hp: C.hp };
}
console.log('\nWALKING / RUNNING INTO A STANDING OFFICER -- he has to STOP you\n');
const a = run('on foot, 2 m/s, no melee', { board: false, v: 2, ahead: 3.0, push: 1, secs: 4 });
const b = run('on foot, 6 m/s, no melee', { board: false, v: 6, ahead: 3.0, push: 1, secs: 4 });
console.log('\nFIGHTING HIM ON THE SPOT -- still solid, and still the hp chain\n');
const c = run('standing punch', { board: false, v: 0, melee: true, ahead: 1.6 });
console.log('\nARRIVING WITH SOMETHING -- he FLIES and must not bounce you back\n');
const d = run('riding in at 14, no melee', { board: true, v: 14 });
const e = run('riding in at 14 AND melee', { board: true, v: 14, melee: true });
const f = run('on foot at 12 AND melee', { board: false, v: 12, melee: true, ahead: 2.2 });
const g2 = run('on foot SPRINTING at 15 + melee', { board: false, v: 15, melee: true, ahead: 2.2 });

// ---- THE STANDING FIGHT IS A SEQUENCE (c175) ----
// *"Blow to the head, blow to the body, third one sends him a little bit."* `copHit` picked from
// all four hit clips at RANDOM, so the same three punches gave a different order every time and
// none of them built. The clips are stubbed here (no skin headless) purely so the chain's own
// name test passes; what is under test is the ORDER and what the third blow does.
console.log('\nTHREE PUNCHES ON THE SPOT -- head, body, then he goes\n');
{
  // `p.melEntry` LATCHES AND IS NOT CLEARED BY STANDING STILL -- left over from the row
  // above it, the first punch here read as a run-up and launched him, which is c174
  // working exactly as written and the probe forgetting to put its own state back.
  place(2.0); reset(false, 0); P.melEntry = 0;
  for (const nm of COP.clips.chain) C.actions[nm] = 1;
  for (const nm of COP.clips.hits) C.actions[nm] = 1;
  C.actions[COP.clips.flyF] = 1; C.actions[COP.clips.flyB] = 1;
  for (let i = 1; i <= 3; i++) {
    G.copsPunched(P.pos.x, P.pos.z, 0);
    console.log('  punch ' + i + '   clip ' + String(C.clip).padEnd(18) + 'state ' + String(C.st).padEnd(6) + '  hp ' + C.hp);
  }
}
const chainOK = C.st === 'fly' || C.st === 'down';

const ok = !a.through && !b.through && !c.through && c.hp < COP.hp
  // ON FOOT A TACKLE HITS HIM (c176) -- only the board and a real sprint go through.
  && d.through && d.flew && e.flew && !f.through && f.flew && g2.through && chainOK;
console.log('\n' + (ok
  ? 'PASS: a wall when you walk into him, a target when you arrive with something.'
  : 'FAIL: ' + JSON.stringify({ a, b, c, d, e, f })));
