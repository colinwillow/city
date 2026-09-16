// JAM_PROBE=tools/probe-cop2.mjs npm run jam
//
// *"If I skate by a cop and melee, right now I bounce off the cop. I want to run through him
// instead of bouncing off his collider."* Whether he bounces is a velocity, so it is measured
// through the shipped `stepPlayer` -- the same path the board, the collider and `SK8.bounce`
// all live on. A synthetic officer, because a real one needs a DRACO Worker this container has
// not got; what is under test is `groundUnder`'s box list, not the GLB.
const G = globalThis.__shred;
const P = G.player, COP = G.COP, H = G.COLIN_HEIGHT;
const HOME = P.pos.clone();

function fakeCop(x, y, z) {
  return { x, y, z, h: 0, hp: COP.hp, st: 'idle', t: 0,
    box: { minx: x - COP.r, maxx: x + COP.r, minz: z - COP.r, maxz: z + COP.r, miny: y, maxy: y + H * .95 } };
}
function run(solid, label) {
  COP.solid = solid;
  P.board = true; P.rail = null; P.bar = null; P.hit = ''; P.mel = ''; P.hang = 0; P.lad = 0;
  P.grounded = true; P.braked = 0; P.turnT = 0; P.shoveT = 0; P.jump = 0;
  P.heading = 0; P.faceH = 0; P.pos.copy(HOME);
  P.vel.set(0, 0, 12); P.speed = 12;
  G.stick.L.down = 0; G.stick.L.x = 0; G.stick.L.y = 0; G.stick.L.mag = 0;
  G.stick.R.down = 0;
  // one officer standing 6 m down the road, dead ahead
  G.cops.length = 0; G.cops.push(fakeCop(HOME.x, HOME.y, HOME.z + 6));
  const z0 = P.pos.z, dt = 1 / 60;
  let minV = 1e9;
  for (let i = 0; i < Math.round(1.6 / dt); i++) {
    G.stepPlayer(dt);
    const v = P.vel.z;
    if (P.pos.z > z0 + 4 && P.pos.z < z0 + 8) minV = Math.min(minV, v);
  }
  const past = P.pos.z - z0;
  console.log('  ' + label.padEnd(22)
    + 'travelled ' + past.toFixed(2).padStart(6) + ' m'
    + '   slowest through him ' + (minV === 1e9 ? '  n/a' : minV.toFixed(2).padStart(6)) + ' m/s'
    + '   ends at ' + P.vel.z.toFixed(2).padStart(6) + ' m/s');
  return { past, minV, end: P.vel.z };
}
console.log('\nSKATING AT AN OFFICER 6 m AHEAD AT 12 m/s\n');
const a = run(1, 'COP.solid = 1 (was)');
const b = run(0, 'COP.solid = 0 (now)');
G.cops.length = 0;
console.log('');
if (b.past < a.past + 1) { console.log('*** he still does not get past him'); process.exit(1); }
if (b.end < 6) { console.log('*** he is still being stopped: ' + b.end.toFixed(2) + ' m/s'); process.exit(1); }
console.log('he rides straight through: ' + b.past.toFixed(1) + ' m against ' + a.past.toFixed(1)
  + ', and keeps ' + b.end.toFixed(1) + ' m/s against ' + a.end.toFixed(1) + '.');
