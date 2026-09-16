// JAM_PROBE=tools/probe-push.mjs npm run jam
//
// *"The push sound is offset from the push. It's like it goes in between where it needs to go --
// if he's pushing every second or so, the sound effect is in the in-between space."*
// It measures the SOUND, because the sound is the complaint: `snd.push` is wrapped and every call
// is recorded with the phase of the push cycle it landed on. `p.pushT` IS that phase now and the
// clip is put on it once a cycle, so "where in the clip was his foot" needs no model in here --
// which is the whole reason the clock was made a phase. `npm run push` says where the plant is.
const G = globalThis.__shred;
const P = G.player, SK8 = G.SK8, snd = G.snd;
const HOME = P.pos.clone();
function aimCam() { G.cam.az = P.heading; G.cam.el = 0.17; }

const hits = [];
const real = snd.push;
let T = 0;
snd.push = function () { hits.push({ t: T, ph: P.pushT, period: P.pushPeriod, v: P.speed }); };

function run(secs, label) {
  hits.length = 0; T = 0;
  P.board = true; P.rail = null; P.bar = null; P.hit = ''; P.mel = ''; P.hang = 0; P.lad = 0;
  P.grounded = true; P.braked = 0; P.turnT = 0; P.turnRem = 0; P.crouch = 0;
  P.pushing = false; P.pushT = 0; P.pushSync = 0; P.pushNm = ''; P.shoveT = 0; P.jump = 0;
  P.heading = 0; P.faceH = 0; P.pos.copy(HOME); P.vel.set(0, 0, 0); P.speed = 0;
  aimCam();
  G.stick.L.x = 0; G.stick.L.y = -1; G.stick.L.mag = 1; G.stick.L.down = 1;   // thumb FORWARD
  const dt = 1 / 60;
  for (let i = 0; i < Math.round(secs / dt); i++) { aimCam(); G.stepPlayer(dt); T += dt; }
  const plant = SK8.pushPlant.skate_push_standing;
  console.log('\n' + label);
  console.log('  the plant is at phase ' + plant.toFixed(2) + ' of the cycle (npm run push, measured off the clip)\n');
  console.log('   #    at      gap   period  speed    phase of the cycle the SOUND fired on');
  let worst = 0;
  hits.forEach((h, i) => {
    const off = Math.abs(((h.ph - plant + 1.5) % 1) - .5);
    worst = Math.max(worst, off);
    console.log('  ' + String(i).padStart(2) + '  ' + h.t.toFixed(2) + 's'
      + (i ? (h.t - hits[i - 1].t).toFixed(2) : '  -').padStart(8)
      + h.period.toFixed(2).padStart(8) + h.v.toFixed(1).padStart(7)
      + h.ph.toFixed(3).padStart(10)
      + ('   ' + (off * 100).toFixed(1) + '% off the plant').padStart(26)
      + (off > .08 ? '   <-- IN THE GAP (' + (off * h.period).toFixed(2) + 's)' : ''));
  });
  console.log('\n  worst: ' + (worst * 100).toFixed(1) + '% of a cycle off the plant');
  return worst;
}
const w = run(9, 'HOLDING FORWARD FROM A DEAD STOP -- where every push sound lands in the cycle');
console.log('\n  FOR COMPARISON, what shipped through c170: the shove fired at the TOP of the cycle,');
console.log('  phase 0.000 -- ' + (SK8.pushPlant.skate_push_standing * 100).toFixed(0) + '% of a cycle before the foot reached the road, which is');
console.log('  ' + (SK8.pushPlant.skate_push_standing * SK8.pushFast).toFixed(2) + 's at the standstill cycle and '
  + (SK8.pushPlant.skate_push_standing * SK8.pushDur).toFixed(2) + 's at the cruise.');
console.log('\n' + (w < .02 ? 'PASS: every push sound is on the plant.' : 'FAIL: ' + (w * 100).toFixed(0) + '% off.'));
snd.push = real;
