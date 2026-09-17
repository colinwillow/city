// JAM_PROBE=tools/probe-roofs.mjs npm run jam
//
// *"You could put the ship on this roof. It's completely flat, there's plenty of room. It's like
// two buildings over from where the ship currently is. I'll have to put a ladder up to it."*
//
// WHICH ROOF, MEASURED. The chip in his shot reads `BAR 43M@213,-57`, so he is within 43 m of
// that bar, and the ship is at 298,-13 -- the building is between them. Rather than read a
// position off a picture (which is how you get a half pipe inside a bank), every flat patch in
// that region is found against the REAL collider and reported with its area, its height and how
// much it disagrees with itself.
const G = globalThis.__shred;
const SHIP = G.SHIP, LADDERS = G.LADDERS;
const STEP = 1.5;                       // the sweep, in metres
const NEED = 9;                         // the ship is 4.4 m; a pad wants a good margin round it
const FLAT = 0.12;                      // metres of disagreement still called flat

// the region: a box round the bar he was near and the ship's own roof, with room either side
const X0 = 150, X1 = 340, Z0 = -120, Z1 = 40;

console.log('\nsweeping ' + (X1 - X0) + ' x ' + (Z1 - Z0) + ' m at ' + STEP + ' m'
  + '   (the ship is at ' + SHIP.at.map(v => v.toFixed(0)).join(',') + ')\n');

const W = Math.round((X1 - X0) / STEP), H = Math.round((Z1 - Z0) / STEP);
const f = new Float32Array(W * H);
for (let i = 0; i < W; i++) for (let k = 0; k < H; k++) {
  f[k * W + i] = G.blobFloor(X0 + i * STEP, Z0 + k * STEP, 4000);
}
// a cell is ROOF if it is well above the street, and a patch is flat if its neighbours agree
const seen = new Uint8Array(W * H);
const out = [];
for (let i = 1; i < W - 1; i++) for (let k = 1; k < H - 1; k++) {
  const c = k * W + i;
  if (seen[c] || f[c] < 6) continue;
  // flood the level patch this cell belongs to
  const q = [c]; seen[c] = 1; const cells = [];
  while (q.length) {
    const p = q.pop(); cells.push(p);
    const pi = p % W, pk = (p - pi) / W;
    for (const [di, dk] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const ni = pi + di, nk = pk + dk;
      if (ni < 0 || nk < 0 || ni >= W || nk >= H) continue;
      const n = nk * W + ni;
      if (seen[n] || Math.abs(f[n] - f[p]) > FLAT) continue;
      seen[n] = 1; q.push(n);
    }
  }
  if (cells.length * STEP * STEP < NEED * NEED * .7) continue;
  let lo = 1e9, hi = -1e9, sx = 0, sz = 0, mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9;
  for (const p of cells) {
    const pi = p % W, pk = (p - pi) / W, x = X0 + pi * STEP, z = Z0 + pk * STEP;
    lo = Math.min(lo, f[p]); hi = Math.max(hi, f[p]); sx += x; sz += z;
    mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mnz = Math.min(mnz, z); mxz = Math.max(mxz, z);
  }
  out.push({ x: sx / cells.length, z: sz / cells.length, y: hi, flat: hi - lo,
    area: cells.length * STEP * STEP, w: mxx - mnx, d: mxz - mnz, n: cells.length });
}
// THE LARGEST SQUARE THAT FITS is what matters, not the raw area: an L of walkway is not a pad.
out.sort((a, b) => Math.min(b.w, b.d) - Math.min(a.w, a.d));
console.log('flat patches over 6 m up, at least ' + NEED + ' m across:\n');
for (const p of out.slice(0, 10)) {
  const dShip = Math.hypot(p.x - SHIP.at[0], p.z - SHIP.at[2]);
  const bar = Math.hypot(p.x - 213, p.z - -57);
  let lad = 1e9; for (const l of LADDERS) lad = Math.min(lad, Math.hypot(l.x - p.x, l.z - p.z));
  console.log('  ' + p.x.toFixed(0).padStart(5) + ',' + p.z.toFixed(0).padStart(5)
    + '  y ' + p.y.toFixed(2).padStart(6)
    + '   ' + p.w.toFixed(0).padStart(3) + ' x ' + p.d.toFixed(0).padStart(3) + ' m'
    + '   flat to ' + p.flat.toFixed(3)
    + '   ' + dShip.toFixed(0).padStart(4) + ' m from the ship'
    + '   ' + bar.toFixed(0).padStart(4) + ' m from that bar'
    + '   nearest ladder ' + (lad > 900 ? '--' : lad.toFixed(0) + ' m'));
}
console.log('\n(the ship needs about ' + NEED + ' m square; "two buildings over" from 298,-13'
  + ' and near the bar at 213,-57 is the one he is standing on)');
