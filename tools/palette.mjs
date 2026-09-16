// npm run palette [image] -- WHAT COLOURS IS THE KEY ART ACTUALLY MADE OF?
//
// *"Can we nudge the colours toward this palette so it feels like it matches -- I'm referring to
// the start screen image, it's in the repo so you should be able to sample it."*
// So sample it. Reading a palette off a picture by eye is the same mistake as placing a ramp off
// a screenshot, and this file has a tool for that too (`npm run spots`). `npm run sky` already
// measures an exposure off an image rather than guessing one; this measures a palette.
//
// It is a SATURATION-WEIGHTED HUE HISTOGRAM. Weighting by saturation matters more than anything
// else here: a poster is mostly midtones and sky, and counting every pixel equally reports the
// background rather than the palette. What an artist would call the colours of a picture are the
// ones carrying chroma, so those are the ones that get a vote.
import sharp from 'sharp';
const FILE = process.argv[2] || 'images/splash_screen_01.png';
const BINS = 72;                       // 5 degrees a bin

const { data, info } = await sharp(FILE).resize(420, 420, { fit: 'inside' })
  .raw().toBuffer({ resolveWithObject: true });
const ch = info.channels;
const hue = new Float64Array(BINS), sat = new Float64Array(BINS), val = new Float64Array(BINS);
let n = 0, grey = 0, sumV = 0, sumS = 0;
for (let i = 0; i < data.length; i += ch) {
  const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
  if (ch === 4 && data[i + 3] < 128) continue;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  n++; sumV += mx; sumS += mx ? d / mx : 0;
  if (mx < .06 || d / (mx || 1) < .10) { grey++; continue; }   // no hue worth counting
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h /= 6; if (h < 0) h += 1;
  const s = d / mx, w = s * s * mx;                            // chroma votes, and brighter chroma votes more
  const k = Math.min(BINS - 1, (h * BINS) | 0);
  hue[k] += w; sat[k] += s * w; val[k] += mx * w;
}
const tot = hue.reduce((a, b) => a + b, 0);
console.log(FILE + '  ' + info.width + 'x' + info.height + ' sampled, ' + n + ' px, ' +
  (100 * grey / n).toFixed(0) + '% of it neutral');
console.log('mean value ' + (sumV / n).toFixed(2) + ', mean saturation ' + (sumS / n).toFixed(2) + '\n');

// the peaks, smoothed round the circle so one wide family is not reported as three
const sm = new Float64Array(BINS);
for (let i = 0; i < BINS; i++) for (let k = -2; k <= 2; k++) sm[i] += hue[(i + k + BINS) % BINS] * (3 - Math.abs(k));
const peaks = [];
for (let i = 0; i < BINS; i++) {
  const a = sm[(i - 1 + BINS) % BINS], b = sm[i], c = sm[(i + 1) % BINS];
  if (b >= a && b > c && b > 0) peaks.push({ i, w: b });
}
peaks.sort((x, y) => y.w - x.w);
const hex = (h, s, v) => { const f = (k) => { const q = (k + h * 6) % 6;
  return Math.round(255 * v * (1 - s * Math.max(0, Math.min(1, Math.min(q, 4 - q))))).toString(16).padStart(2, '0'); };
  return '#' + f(5) + f(3) + f(1); };
console.log('the families it is made of, by chroma:');
const fam = [];
for (const p of peaks.slice(0, 6)) {
  const h = (p.i + .5) / BINS, s = sat[p.i] / (hue[p.i] || 1), v = val[p.i] / (hue[p.i] || 1);
  const share = 100 * p.w / sm.reduce((a, b) => a + b, 0);
  fam.push({ h, s, v, share });
  console.log('   hue ' + h.toFixed(3) + '  ' + hex(h, Math.min(1, s), Math.min(1, v)) +
    '   sat ' + s.toFixed(2) + '  val ' + v.toFixed(2) + '   ' + share.toFixed(0) + '% of the chroma');
}
// WHERE THE GAME'S PRIMARIES WOULD HAVE TO GO to land in those families. `PAL.shift` is
// [centre, amount, width] per family, and the amount is the distance from the primary to the
// nearest thing the ART actually contains -- which is the whole question being asked.
const wrap = d => d - Math.floor(d + .5);
const PRIM = [['red', 0], ['yellow', .1667], ['green', .3333], ['cyan', .5], ['blue', .6667], ['magenta', .8333]];
console.log('\nPAL.shift to pull each primary into the nearest family the art has:');
const out = [];
for (const [nm, h] of PRIM) {
  let best = null, bd = 9;
  for (const f of fam) { const d = wrap(f.h - h); if (Math.abs(d) < Math.abs(bd)) { bd = d; best = f; } }
  if (!best || Math.abs(bd) > .16) continue;             // nothing near it: leave that family alone
  out.push([+h.toFixed(4), +bd.toFixed(3), .10]);
  console.log('   ' + nm.padEnd(8) + ' ' + h.toFixed(3) + ' -> ' + (h + bd).toFixed(3) + '  (' + (bd > 0 ? '+' : '') + bd.toFixed(3) + ')');
}
console.log('\n  shift: ' + JSON.stringify(out).replace(/\],\[/g, '], [') + ',');
console.log('  satMax: ' + Math.min(.9, (sumS / n) * 1.9).toFixed(2) + ',   // 1.9x the art\'s own mean saturation');
