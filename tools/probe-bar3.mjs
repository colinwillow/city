// JAM_PROBE=tools/probe-bar3.mjs npm run jam
//
// TWO QUESTIONS, BOTH ABOUT WHAT HE REPORTED AT c153.
//  1. DOES THE CATCH SPIN HIM ROUND? Enter the same bar from both sides, and drop onto it from
//     above with no plane speed at all -- which is the case `along >= 0` could never answer and
//     is exactly what "he flipped direction so that he was facing towards me" is.
//  2. DOES THE CAMERA HOLD STILL? `stepCam` is the shipped function; drive a real swing through
//     it and read how far the lens actually travels per frame.
const G = globalThis.__shred;
const P = G.player, BAR = G.BAR, cam = G.cam;
const deg = r => (r * 180 / Math.PI);
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

const bar = G.bars.slice().sort((a, b) =>
  Math.hypot(a.x - P.pos.x, a.z - P.pos.z) - Math.hypot(b.x - P.pos.x, b.z - P.pos.z))[0];
if (!bar) { console.log('*** no bars'); process.exit(1); }
const fx = -bar.az, fz = bar.ax;
console.log('\nbar at ' + bar.x.toFixed(0) + ',' + bar.z.toFixed(0) + ' h' + bar.y.toFixed(1)
  + '   plane forward ' + fx.toFixed(2) + ',' + fz.toFixed(2));

function place(vx, vz, faceH) {
  P.bar = null; P.barCool = 0; P.hit = ''; P.hang = 0; P.lad = 0; P.board = null;
  P.grounded = false;
  P.pos.set(bar.x, bar.y - G.COLIN_HEIGHT * .92, bar.z);
  P.barPX = P.pos.x; P.barPY = P.pos.y; P.barPZ = P.pos.z;
  P.vel.set(vx, 0, vz); P.speed = Math.hypot(vx, vz); P.faceH = faceH;
  return G.barCatch();
}
// the bearing he SHOULD end up facing for each approach: the way he came in
console.log('\nENTRY FACING  (side +1 / -1, and the bearing he ends up on)');
const cases = [
  ['flying along +plane at 8 m/s', fx * 8, fz * 8, Math.atan2(fx, fz)],
  ['flying along -plane at 8 m/s', -fx * 8, -fz * 8, Math.atan2(-fx, -fz)],
  ['flying along +plane at 3 m/s', fx * 3, fz * 3, Math.atan2(fx, fz)],
  ['flying along -plane at 3 m/s', -fx * 3, -fz * 3, Math.atan2(-fx, -fz)],
  ['DROPPED on, facing +plane', 0, 0, Math.atan2(fx, fz)],
  ['DROPPED on, facing -plane', 0, 0, Math.atan2(-fx, -fz)],
  ['DROPPED on, 30 deg off +plane', 0, 0, Math.atan2(fx, fz) + .52],
  ['DROPPED on, 30 deg off -plane', 0, 0, Math.atan2(-fx, -fz) + .52],
  ['ALONG the bar (nothing in plane)', bar.ax * 6, bar.az * 6, Math.atan2(bar.ax, bar.az)],
];
let bad = 0;
for (const [label, vx, vz, faceH] of cases) {
  const want = faceH;
  if (!place(vx, vz, faceH)) { console.log('  ' + label.padEnd(34) + ' *** NO CATCH'); bad++; continue; }
  G.stepBar(1 / 60);
  const off = Math.abs(deg(wrap(P.faceH - want)));
  const flip = off > 90;
  console.log('  ' + label.padEnd(34) + ' side ' + (P.barSide > 0 ? '+1' : '-1')
    + '   ' + off.toFixed(0).padStart(3) + ' deg off the way he came'
    + (flip ? '   *** FLIPPED' : ''));
  if (flip) bad++;
}
console.log(bad ? '\n  *** ' + bad + ' case(s) turned him round' : '\n  none flipped');

// ---- the camera ----
console.log('\nCAMERA THROUGH A REAL GIANT SWING  (metres the lens moves per frame)');
place(fx * 8, fz * 8, Math.atan2(fx, fz));
P.barW = 6.5;                      // over the top, the worst case for a lens that follows him
cam.pos.set(0, 0, 0);              // let it seed itself
let px = 0, py = 0, pz = 0, worst = 0, total = 0, n = 0, azSpan = 0;
const az0 = null;
let azMin = Infinity, azMax = -Infinity;
for (let i = 0; i < 180; i++) {
  G.stepBar(1 / 60);
  G.stepCam(1 / 60);
  if (i > 30) {                    // past the ease-round
    const d = Math.hypot(cam.pos.x - px, cam.pos.y - py, cam.pos.z - pz);
    worst = Math.max(worst, d); total += d; n++;
    azMin = Math.min(azMin, cam.az); azMax = Math.max(azMax, cam.az);
  }
  px = cam.pos.x; py = cam.pos.y; pz = cam.pos.z;
}
console.log('  he swept ' + (P.barW).toFixed(1) + ' rad/s, position moved '
  + Math.hypot(P.pos.x - bar.x, P.pos.z - bar.z).toFixed(2) + ' m from the bar');
console.log('  lens worst frame ' + worst.toFixed(4) + ' m   mean ' + (total / n).toFixed(4) + ' m');
console.log('  bearing wandered ' + deg(azMax - azMin).toFixed(2) + ' deg over 2.5 s');
console.log('  lens is ' + Math.hypot(cam.pos.x - bar.x, cam.pos.z - bar.z).toFixed(1)
  + ' m out and ' + (cam.pos.y - bar.y).toFixed(1) + ' m above the bar');
console.log('  settled behind him? ' + deg(Math.abs(wrap(cam.az - P.barAz))).toFixed(2) + ' deg off the latch');
// WHY is it 1.7? ask camFree directly at the latched bearing, the way barAim did.
{
  const B = P.bar, ce = Math.cos(BAR.camEl), by = Math.sin(BAR.camEl);
  const az = P.barAz;
  const d = G.camFree(B.x, B.y + BAR.camLook, B.z, -Math.sin(az) * ce, by, -Math.cos(az) * ce, BAR.camDist);
  console.log('  camFree at the latch: ' + d.toFixed(2) + ' m   cam.dist ' + cam.dist.toFixed(2)
    + '   bar (' + B.x.toFixed(1) + ',' + B.y.toFixed(1) + ',' + B.z.toFixed(1) + ')');
  const az0 = Math.atan2(-B.az * P.barSide, B.ax * P.barSide);
  console.log('  latch is ' + deg(Math.abs(wrap(az - az0))).toFixed(0) + ' deg off behind-him');
}


// ---- and the SHOT ITSELF, over every bar, through the shipped catch and the shipped camera ----
console.log('\nTHE SHOT ON ALL ' + G.bars.length + ' BARS  (barAim searches, camFree decides)');
const out = [];
for (const b of G.bars) {
  const f2x = -b.az, f2z = b.ax;
  P.bar = null; P.barCool = 0; P.hit = ''; P.hang = 0; P.lad = 0; P.board = null; P.grounded = false;
  P.pos.set(b.x, b.y - G.COLIN_HEIGHT * .92, b.z);
  P.barPX = P.pos.x; P.barPY = P.pos.y; P.barPZ = P.pos.z;
  P.vel.set(f2x * 8, 0, f2z * 8); P.speed = 8; P.faceH = Math.atan2(f2x, f2z);
  if (!G.barCatch()) { continue; }
  const behind = Math.atan2(f2x * P.barSide, f2z * P.barSide);
  cam.az = P.barAz; cam.dist = 0; cam.pos.set(0, 0, 0);
  G.stepBar(1 / 60); G.stepCam(1 / 60);
  out.push({ d: cam.dist, dev: Math.abs(deg(wrap(P.barAz - behind))) });
}
const ds = out.map(o => o.d).sort((a, c) => a - c);
const dv = out.map(o => o.dev).sort((a, c) => a - c);
const qq = (v, f) => v[Math.min(v.length - 1, Math.floor(v.length * f))];
console.log('  boom      median ' + qq(ds, .5).toFixed(2) + ' m   worst ' + ds[0].toFixed(2)
  + '   under 4 m: ' + ds.filter(d => d < 4).length + '/' + out.length
  + '   at CAM.min: ' + ds.filter(d => d <= G.CAM.min + .01).length);
console.log('  bearing   ' + dv.filter(d => d < 1).length + '/' + out.length
  + ' dead behind him, median deviation ' + qq(dv, .5).toFixed(0) + ' deg, worst ' + dv[dv.length - 1].toFixed(0));
