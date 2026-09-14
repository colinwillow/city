// WHAT EXPOSURE DOES THIS SKY WANT. The panorama is the dome's whole colour at SKY.envK 1, so
// SKY.envB belongs to the IMAGE, not to the game -- and it is not a taste number, it is a
// measurement. Two skies four stops apart both look fine in a viewer and only one of them
// looks like a sky in the game.
//
// The only part of the image that matters is the band this camera can see. CAM.el is a
// constant .17 rad of downward pitch and the vertical fov is 52, so the visible sky is the
// horizon to .284 rad above it -- about 16 degrees -- and NOTHING ELSE. Measuring the whole
// panorama would average in a zenith nobody will ever look at.
//
//   npm run sky                      -- the sky currently wired up
//   npm run sky images/whatever.png
import sharp from 'sharp';
import { existsSync, readFileSync } from 'fs';

let src = process.argv[2];
if (!src) {                                   // whatever index.html is pointing at
  const m = readFileSync('index.html', 'utf8').match(/const ENV = \{ url: '([^']+)'/);
  src = m ? m[1] : 'images/hdr_toon_03.png';
  console.log('(reading the sky index.html is using: ' + src + ')\n');
}
if (!existsSync(src)) { console.error('no such image: ' + src); process.exit(1); }

const TOP = 52 / 2 * Math.PI / 180 - .17;     // half the vertical fov, minus the camera's pitch
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels;
if (Math.abs(W / H - 2) > .02) console.warn('WARNING: ' + W + 'x' + H + ' is not 2:1 -- an equirect sky must be.');
const s2l = v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
const lum = i => .2126 * s2l(data[i]) + .7152 * s2l(data[i + 1]) + .0722 * s2l(data[i + 2]);

// v of an elevation in an equirect: v = .5 - asin(sin el)/PI, and row 0 is the zenith
const vAt = el => .5 - el / Math.PI;
const y0 = Math.max(0, Math.floor(vAt(TOP) * H)), y1 = Math.min(H - 1, Math.floor(vAt(0) * H));
let sum = 0, n = 0, peak = 0, over = 0;
for (let y = y0; y <= y1; y++) for (let x = 0; x < W; x += 2) {
  const l = lum((y * W + x) * C); sum += l; n++; if (l > peak) peak = l;
}
const mean = sum / n;
console.log(src + '  ' + W + 'x' + H);
console.log('visible band: horizon to ' + (TOP * 57.3).toFixed(1) + ' deg  (rows ' + y0 + '..' + y1 + ' of ' + H + ')');
console.log('  mean linear ' + mean.toFixed(4) + '   brightest pixel ' + peak.toFixed(3));
console.log('\nBLOOM threshold is POST.bloomTh = 1.45. A sky whose MEAN is over it is a white smear.');
console.log('target mean   envB    sky mean    brightest    verdict');
for (const t of [.55, .72, .9, 1.1]) {
  const b = t / mean;
  const pk = peak * b;
  const v = t > 1.45 ? 'THE WHOLE SKY BLOOMS' : pk > 1.45 ? 'highlights flare -- good' : 'nothing flares';
  console.log('   ' + t.toFixed(2) + '       ' + b.toFixed(2).padStart(5) + '     ' + t.toFixed(2) + '        ' + pk.toFixed(2).padStart(5) + '      ' + v);
}
console.log('\n.72 is about where the old gradient horizon sat, and is the default recommendation.');
console.log('Set SKY.envB in index.html, or city.SKY.envB live.');
