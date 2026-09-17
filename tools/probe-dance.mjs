// JAM_PROBE=tools/probe-dance.mjs npm run jam
//
// *"I need to add a way to make the characters dance."* and *"Can I set points on the map so I
// can find the ship?"*
//
// TWO FEATURES, AND THE ONE THAT MATTERS MOST IS THE CANCEL: a dance you can be stuck in with no
// second press to learn is worse than no dance. Driven through the SHIPPED `danceGo`/`danceStep`
// and the shipped `stepPlayer`.
//
// STATED GAP: `npm run jam` cannot build a skin (DRACO wants a Worker), so `colin.actions` is
// empty and `danceGo`'s own filter would correctly refuse every clip. The six names are
// fabricated as actions here -- which is the FILTER working, not a way round it: `npm run wear`
// already reads the real pool, and it says Colin and moussa_toon carry all six of their own and
// `alien_orange` borrows them through `skinClips`.
const G = globalThis.__shred;
const P = G.player, stick = G.stick, DANCE = G.DANCE, colin = G.colin, MAP = G.MAP, SHIP = G.SHIP;
const DT = 1 / 60;

colin.actions = colin.actions || {};
for (const n of DANCE.list) colin.actions[n] = { getClip: () => ({ duration: 13.8 }), setEffectiveTimeScale() {} };

function step() { G.stepJet(DT); G.stepPlayer(DT); }
function reset() {
  P.pos.set(P.safe.x, P.safe.y + 1, P.safe.z);
  P.vel.set(0, 0, 0); P.speed = 0; P.grounded = true; P.jumps = 0; P.air = '';
  P.hit = ''; P.mel = ''; P.bar = null; P.hang = 0; P.lad = 0; P.rail = null; P.board = null;
  P.dance = ''; P.jump = 0; P.aim = 0; P.rollT = 0; P.trick = '';
  P.jetFlew = 0; P.jetArm = 0; P.jetWas = 0; P.jetK = 0; P.rHold = 0;
  stick.L.down = 0; stick.L.x = stick.L.y = 0; stick.L.mag = 0;
  stick.R.down = 0; stick.R.x = stick.R.y = 0; stick.R.far = 0;
  DANCE.i = -1;
  for (let i = 0; i < 20; i++) step();
}

console.log('\n--- THE KEY ---');
reset();
const seq = [];
for (let i = 0; i < 8; i++) { G.dance(); for (let k = 0; k < 4; k++) step(); seq.push(P.dance.replace('dance_', '')); }
console.log('  eight presses in a row, cycling: ' + seq.join(' -> '));
console.log('  ' + (new Set(seq).size === DANCE.list.length ? 'all ' + DANCE.list.length + ' reached, and it wraps'
  : '*** WRONG, only ' + new Set(seq).size + ' of ' + DANCE.list.length));

console.log('\n--- AND ANYTHING ELSE HE DOES ENDS IT (the shipped stepPlayer) ---');
function cancel(label, doIt, want) {
  reset();
  G.dance(); for (let i = 0; i < 6; i++) step();
  const on = P.dance;
  doIt(); step();
  const still = !!P.dance;
  console.log('  ' + label.padEnd(36) + (still ? 'still dancing' : 'STOPPED')
    + (still === want ? '' : '   *** WRONG'));
  return on;
}
cancel('nothing at all', () => {}, true);
cancel('the left stick pushed', () => { stick.L.mag = 1; stick.L.x = 0; stick.L.y = -1; stick.L.down = 1; }, false);
cancel('a nudge under DANCE.quit', () => { stick.L.mag = DANCE.quit * .5; stick.L.down = 1; }, true);
cancel('a tap on the right pad', () => { P.jump = 1; }, false);
cancel('taking the board out', () => { G.player.board = 1; }, false);
cancel('hit by a car', () => { P.hit = 'fly'; }, false);
cancel('arming the blaster', () => { P.aim = 1; }, false);
cancel('leaving the ground', () => { P.grounded = false; }, false);

console.log('\n--- HE KEEPS HIS PICK, AND ADVANCES ONLY WHILE DANCING ---');
reset();
G.dance(); for (let i = 0; i < 4; i++) step();
G.dance(); for (let i = 0; i < 4; i++) step();          // pressed WHILE dancing: advance
const picked = P.dance;
stick.L.mag = 1; stick.L.down = 1; step();               // walked away: cancelled
stick.L.mag = 0; stick.L.down = 0; step();
G.dance(); for (let i = 0; i < 4; i++) step();           // pressed again: resume, do not advance
console.log('  picked ' + picked.replace('dance_', '') + ', walked away, pressed again -> '
  + P.dance.replace('dance_', '') + (P.dance === picked ? '' : '   *** WRONG'));
console.log('  a dance he stands still for: speed ' + P.speed.toFixed(2) + ' m/s'
  + (P.speed > .01 ? '   *** WRONG' : ''));

console.log('\n--- POINTS ON THE MAP ---');
const ship = MAP.marks.filter(m => m.tag === 'ship'), lad = MAP.marks.filter(m => m.tag === 'ladder');
// THE SHIP IS DRACO-COMPRESSED (KHR_draco_mesh_compression, checked in the file) and `jam.mjs`
// decompresses ONLY `city.glb`, so it fails headless with `Worker is not defined` exactly as
// every character GLB does. A STATED GAP, not a result: what this row can still prove is that
// the mark is pushed from `buildShip` and therefore cannot be drawn for a ship that is absent.
console.log('  ship marks   ' + ship.length + (ship.length === 1 ? '  at ' + ship[0].x.toFixed(0) + ',' + ship[0].z.toFixed(0)
  : '  -- the GLB is draco and cannot load headless; the mark correctly does NOT appear'));
console.log('  ladder marks ' + lad.length + (lad.length === G.LADDERS.length ? '  (one per ladder)' : '   *** wanted ' + G.LADDERS.length));
console.log('  base canvas  ' + (MAP.base ? 'built' : 'NOT BUILT -- headless has no 2d context, a stated gap'));
// THE ONE THING A DOT CAN GET WRONG IS BEING OFF ITS OWN CANVAS, which reads exactly like the
// mark not working -- so the world box has to contain every mark, not just the road tiles.
if (MAP.base) {
  const el = MAP.ctx.canvas;
  let out = 0;
  for (const m of MAP.marks) {
    const X = MAP.o + (m.x - MAP.x0) * MAP.k, Y = MAP.o + (m.z - MAP.z0) * MAP.k;
    if (X < 0 || Y < 0 || X > el.width || Y > el.height) out++;
  }
  console.log('  ' + MAP.marks.length + ' marks, ' + out + ' off the canvas' + (out ? '   *** WRONG' : ''));
  const far = G.mapMark(-4000, 4000, '#fff', 3, 'probe');   // a point well outside the road network
  const X = MAP.o + (-4000 - MAP.x0) * MAP.k, Y = MAP.o + (4000 - MAP.z0) * MAP.k;
  console.log('  a mark 4 km out re-scales the map: on canvas ' + (X >= 0 && Y >= 0 && X <= MAP.ctx.canvas.width && Y <= MAP.ctx.canvas.height));
}
// and the way to the ship, which is `city.bar()`'s rule: if it is plainly there once you are
// standing on it, then FINDING it was the problem
reset();
const d0 = Math.hypot(SHIP.at[0] - P.pos.x, SHIP.at[2] - P.pos.z);
G.ship();
const d1 = Math.hypot(SHIP.at[0] - P.pos.x, SHIP.at[2] - P.pos.z);
console.log('  city.ship(): ' + (SHIP.g ? d0.toFixed(0) + ' m away -> ' + d1.toFixed(1) + ' m, at y ' + P.pos.y.toFixed(1)
    + (d1 < 6 ? '' : '   *** WRONG')
  : 'refused, and said why -- same draco gap. It moved him ' + Math.abs(d0 - d1).toFixed(1) + ' m, which is right for a refusal'));
