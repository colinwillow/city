// JAM_PROBE=tools/probe-bar5.mjs npm run jam
// WHERE CAN THE LENS ACTUALLY STAND? 43 of 67 bars pin the boom at CAM.min looking dead behind
// him, and lowering the aim did not move it -- so the blocker is not the arm, it is whatever the
// arm is BOLTED TO. `titleAimClear`'s rule: search the bearing rather than typing it. This sweeps
// the whole circle per bar through the SHIPPED `camFree` and says which offsets are clear.
const G = globalThis.__shred;
const P = G.player, BAR = G.BAR, CAM = G.CAM, bars = G.bars;
const N = bars.length, D2R = Math.PI / 180;

function boomFor(bar, az, look, want) {
  const ce = Math.cos(BAR.camEl);
  const bx = -Math.sin(az) * ce, by = Math.sin(BAR.camEl), bz = -Math.cos(az) * ce;
  return G.camFree(bar.x, bar.y + look, bar.z, bx, by, bz, want);
}
const WANT = BAR.camDist;
for (const look of [-.5, -1.4]) {
  console.log('\nLOOK ' + look.toFixed(1) + ' m under the bar, boom ' + WANT + ' m');
  console.log('  offset from behind-him     bars clear      median reach');
  for (const off of [0, 20, 40, 60, 90, 120, 150, 180]) {
    // take the better of the two signs at each magnitude, which is what a search would
    const ds = bars.map(b => {
      const az0 = Math.atan2(-b.az, b.ax);
      let best = 0;
      for (const s of (off === 0 || off === 180 ? [1] : [1, -1]))
        best = Math.max(best, boomFor(b, az0 + s * off * D2R, look, WANT));
      return best;
    }).sort((a, c) => a - c);
    const clear = ds.filter(d => d > WANT - .3).length;
    const ok = ds.filter(d => d >= 4).length;
    console.log('    +/-' + String(off).padStart(3) + ' deg           '
      + String(clear).padStart(3) + '/' + N + ' full, ' + String(ok).padStart(3) + '/' + N + ' over 4 m'
      + '     ' + ds[Math.floor(N / 2)].toFixed(2));
  }
}
// AND THE SEARCH ITSELF: take the first bearing that clears, in order of how little it deviates.
console.log('\nA SEARCH (first bearing clearing 4 m, order 0, +/-20, +/-40 ... 180):');
for (const look of [-.5, -1.4]) {
  const found = [], devs = [];
  for (const b of bars) {
    const az0 = Math.atan2(-b.az, b.ax);
    let got = 0, dev = 999;
    outer: for (const off of [0, 20, 40, 60, 90, 120, 150, 180])
      for (const s of (off === 0 || off === 180 ? [1] : [1, -1])) {
        const d = boomFor(b, az0 + s * off * D2R, look, WANT);
        if (d >= 4) { got = d; dev = off; break outer; }
      }
    if (got) { found.push(got); devs.push(dev); }
  }
  devs.sort((a, c) => a - c);
  console.log('  look ' + look.toFixed(1) + ': ' + found.length + '/' + N + ' bars get a shot over 4 m'
    + '   deviation median ' + (devs[Math.floor(devs.length / 2)] || 0) + ' deg, worst ' + (devs[devs.length - 1] || 0));
  const hist = {};
  for (const d of devs) hist[d] = (hist[d] || 0) + 1;
  console.log('    ' + Object.entries(hist).map(([k, v]) => k + 'deg:' + v).join('  '));
}
