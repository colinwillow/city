// JAM_PROBE=tools/probe-lad2.mjs npm run jam
//
// TWO MEASUREMENTS THIS FILE'S OWN RULE SAYS NOT TO ARGUE ABOUT.
//
// 1. *"When he climbs the ladder he's facing towards the camera instead of facing the building."*
//    `ladGrab` sets `heading = atan2(-L.nx, -L.nz)`, and forward here is `(sin h, cos h)`, so on
//    paper that IS into the wall. **This file gets handedness backwards half the time when it
//    argues instead of running**, so the building is FOUND -- the tallest solid box near the
//    ladder -- and his forward is dotted against the direction to it.
// 2. *"The ship is still off the top of the tower... the tower is not flat, it has little
//    boxes."* The shipped `shipPad` searched against the real collider.
const G = globalThis.__shred;
const P = G.player, stick = G.stick, cam = G.cam, LAD = G.LAD, LADDERS = G.LADDERS, SHIP = G.SHIP;
const DT = 1 / 60;
const step = () => { G.stepJet(DT); G.stepPlayer(DT); };

console.log('\n--- WHICH WAY HE FACES ON A LADDER ---');
let wrong = 0;
for (let i = 0; i < LADDERS.length; i++) {
  const L = LADDERS[i];
  // FIND THE BUILDING rather than assume which side it is on: the tallest box within 6 m of the
  // ladder foot is the thing the ladder is bolted to.
  const box = []; G.stepBoxes && 0;
  const near = [];
  // gridQuery is not exported, so use the solids list the game already has
  for (const b of G.solids) {
    if (Math.abs((b.minx + b.maxx) / 2 - L.x) > 14 || Math.abs((b.minz + b.maxz) / 2 - L.z) > 14) continue;
    if (b.maxy - b.miny < 4) continue;
    near.push(b);
  }
  if (!near.length) { console.log('  ladder ' + i + ': no building found near it'); continue; }
  let tall = near[0];
  for (const b of near) if (b.maxy > tall.maxy) tall = b;
  const bx = (tall.minx + tall.maxx) / 2 - L.x, bz = (tall.minz + tall.maxz) / 2 - L.z;
  const bl = Math.hypot(bx, bz) || 1;
  // latch him on
  P.hit = ''; P.board = null; P.bar = null; P.hang = 0; P.lad = 0; P.mel = ''; P.ship = 0;
  P.ladCool = 0; P.vel.set(0, 0, 0); P.speed = 0;
  P.pos.set(L.x + L.nx * 3.2, L.y0 + .1, L.z + L.nz * 3.2);
  for (let k = 0; k < 40 && !P.grounded; k++) step();
  cam.az = Math.atan2(-L.nx, -L.nz);
  stick.L.down = 1; stick.L.x = 0; stick.L.y = -1; stick.L.mag = 1;
  for (let k = 0; k < 120 && !P.lad; k++) step();
  if (!P.lad) { console.log('  ladder ' + i + ': never latched'); continue; }
  for (let k = 0; k < 20; k++) step();
  const fx = Math.sin(P.faceH), fz = Math.cos(P.faceH);
  const dot = (fx * bx + fz * bz) / bl;                 // +1 = facing the building, -1 = away
  const bad = dot < 0;
  if (bad) wrong++;
  console.log('  ladder ' + i + ' at ' + L.x.toFixed(0) + ',' + L.z.toFixed(0)
    + '   facing-the-building ' + dot.toFixed(2)
    + (bad ? '   *** HE IS FACING AWAY -- out into the street' : '   facing it, correct'));
  P.lad = 0; P.ladCool = 0;
}
console.log('  ' + wrong + ' of ' + LADDERS.length + ' face the wrong way');

console.log('\n--- AND THE CLIP ONLY MOVES WHEN HE DOES ---');
{
  const L = LADDERS[0];
  P.lad = 0; P.ladCool = 0; P.hit = ''; P.vel.set(0, 0, 0);
  P.pos.set(L.x + L.nx * 3.2, L.y0 + .1, L.z + L.nz * 3.2);
  for (let k = 0; k < 40 && !P.grounded; k++) step();
  cam.az = Math.atan2(-L.nx, -L.nz);
  stick.L.down = 1; stick.L.x = 0; stick.L.y = -1; stick.L.mag = 1;
  for (let k = 0; k < 120 && !P.lad; k++) step();
  for (let k = 0; k < 20; k++) step();
  const moving = P.speed;
  stick.L.down = 0; stick.L.x = stick.L.y = 0; stick.L.mag = 0;
  for (let k = 0; k < 10; k++) step();
  console.log('  climbing: p.speed ' + moving.toFixed(2) + ' m/s   thumb off: ' + P.speed.toFixed(2)
    + '   (the clip is scaled by this, so 0 means the cycle HOLDS)'
    + (P.speed < .01 && moving > .5 ? '' : '   *** WRONG'));
}

console.log('\n--- THE SHIP PAD, THROUGH THE SHIPPED shipPad ---');
{
  const at = [298.2, 17.1, -13.1], half = 4.4 * .38;
  const here = [];
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++)
    here.push(G.blobFloor ? 0 : 0);
  const pad = G.shipPad(at[0], at[2], half, at[1]);
  console.log('  typed   ' + at[0].toFixed(1) + ',' + at[1].toFixed(2) + ',' + at[2].toFixed(1));
  console.log('  found   ' + pad.x.toFixed(1) + ',' + pad.y.toFixed(2) + ',' + pad.z.toFixed(1)
    + '   the roof disagrees with itself by ' + pad.flat.toFixed(2) + ' m under the hull'
    + '   moved ' + Math.hypot(pad.x - at[0], pad.z - at[2]).toFixed(1) + ' m, '
    + (pad.y - at[1] >= 0 ? '+' : '') + (pad.y - at[1]).toFixed(2) + ' m in height');
  console.log('  ' + (pad.flat < .25 ? 'flat enough to stand a ship on' : '*** still lumpy -- ' + pad.flat.toFixed(2) + ' m'));
}
