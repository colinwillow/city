// JAM_PROBE=tools/probe-bar6.mjs npm run jam
//
// *"It's way slower than I wanted to go -- I want him to start gaining speed quite a bit
// quicker."* How long a held thumb takes to get him round is a number, so it is measured
// through the shipped `stepBar` rather than felt for. A "giant" is |barA| passing pi.
const G = globalThis.__shred;
const P = G.player, BAR = G.BAR;
const bar = G.bars.slice().sort((a, b) =>
  Math.hypot(a.x - P.pos.x, a.z - P.pos.z) - Math.hypot(b.x - P.pos.x, b.z - P.pos.z))[0];
if (!bar) { console.log('*** no bars'); process.exit(1); }

function hang(hold) {
  P.bar = bar; P.barA = 0; P.barW = 0; P.barT = 0; P.barRel = 0; P.barSide = 1; P.pumping = 0;
  P.jump = 0; P.hit = ''; P.board = false;
  G.stick.R.down = hold ? 1 : 0; G.stick.R.x = 0; G.stick.R.y = 0; G.stick.R.mag = 0;
  G.stick.L.down = 0; G.stick.L.x = 0; G.stick.L.y = 0; G.stick.L.mag = 0;
}
function build(hold, secs, label) {
  hang(hold);
  const dt = 1 / 60;
  let over = -1, half = -1, peakW = 0, sawPump = 0, unwrapped = 0, last = 0;
  for (let i = 0; i < Math.round(secs / dt); i++) {
    G.stepBar(dt);
    // `barA` is wrapped, so the giant is counted on the unwrapped angle
    let d = P.barA - last; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    unwrapped += d; last = P.barA;
    peakW = Math.max(peakW, Math.abs(P.barW));
    if (P.pumping) sawPump = 1;
    if (half < 0 && Math.abs(unwrapped) >= Math.PI / 2) half = i * dt;
    if (over < 0 && Math.abs(unwrapped) >= Math.PI) over = i * dt;
  }
  console.log('  ' + label.padEnd(26)
    + 'level with the bar at ' + (half >= 0 ? half.toFixed(2) + 's' : ' never').padStart(7)
    + '   OVER THE TOP at ' + (over >= 0 ? over.toFixed(2) + 's' : ' never').padStart(7)
    + '   peak w ' + peakW.toFixed(2) + ' rad/s'
    + (hold && !sawPump ? '   *** the kip never showed' : ''));
  return { half, over, peakW };
}
console.log('\nFROM A DEAD HANG, THUMB HELD ON THE RIGHT PAD\n');
const a = build(1, 12, 'holding');
const b = build(0, 12, 'not holding (must not)');
console.log('\nTHE SWIPE LETS GO, AND ONLY THE SWIPE\n');
hang(1);
for (let i = 0; i < 120; i++) G.stepBar(1 / 60);
const w0 = P.barW;
P.jump = 1; G.stepBar(1 / 60);
console.log('  a TAP (player.jump)   still on the bar? ' + (P.bar ? 'yes' : '*** NO -- a tap let go'));
G.boardFlick ? G.boardFlick(0, -1) : null;
console.log('  a SWIPE               ' + (G.boardFlick ? (P.barRel > 0 ? 'released, on w ' + w0.toFixed(2) : '*** did NOT release') : '(boardFlick not exported -- checked in the game)'));
console.log('');
if (a.over < 0) { console.log('*** a held thumb never gets him over the top'); process.exit(1); }
if (a.over > 4) { console.log('*** still slow: ' + a.over.toFixed(2) + 's to the top'); process.exit(1); }
if (b.over >= 0) { console.log('*** he goes over with nothing held'); process.exit(1); }
console.log('a held thumb puts him over the top in ' + a.over.toFixed(2) + 's, and nothing happens without it.');
