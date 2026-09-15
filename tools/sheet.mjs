// npm run sheet -- RENDER THE EFFECT SHEET AND LOOK AT IT.
//
// "What are those electric tree branches" is a question about what is IN a texture, and the
// texture is drawn in code at runtime. Reading that code three times did not settle it, so
// this runs the SHIPPED `fxTex` text between the FX markers against a real 2D canvas and
// writes the sheet out as a PNG, with the bank windows marked on a second copy. One look ends
// the argument, which is the `/nan map` rule: measure the buffer, do not reason about it.
import { readFileSync, writeFileSync } from 'fs';
import { createCanvas } from '@napi-rs/canvas';

const src = readFileSync('index.html', 'utf8');
const grab = (a, b) => { const m = src.match(new RegExp('/\\* ' + a + ' \\*/([\\s\\S]*?)/\\* ' + b + ' \\*/')); if (!m) { console.error('marker ' + a + ' not found'); process.exit(1); } return m[1]; };

// the FX block, verbatim
const shipped = grab('FX:START', 'FX:END');
const THREE = { CanvasTexture: class { constructor(c) { this.image = c; } }, LinearFilter: 1, SRGBColorSpace: 'srgb' };
const document = { createElement: () => createCanvas(1, 1) };
const fn = new Function('THREE', 'document', shipped + '\n; return { fxTex, FX };')(THREE, {
  createElement: (k) => {
    const c = createCanvas(8, 8);
    // the shipped code sets width/height after creating it; @napi-rs honours that
    return c;
  },
});
const { fxTex, FX } = fn;
const tex = fxTex();
const cv = tex.image;
writeFileSync('tools/fx-sheet.png', cv.encodeSync('png'));
console.log('wrote tools/fx-sheet.png  ' + cv.width + 'x' + cv.height + '  (' + FX.cols + ' cols, ' + (FX.cols * FX.cols) + ' cells)');

// ...and a labelled copy, so a bank can be checked against what is actually painted there.
const S = FX.cell, N = FX.cols;
const out = createCanvas(cv.width, cv.height + 40);
const g = out.getContext('2d');
g.fillStyle = '#101018'; g.fillRect(0, 0, out.width, out.height);
g.drawImage(cv, 0, 40);
g.font = 'bold 22px sans-serif'; g.fillStyle = '#9df7ff';
g.fillText(Object.entries(FX.bank).map(([k, v]) => k + ' ' + v[0] + '+' + v[1]).join('   '), 8, 27);
g.font = 'bold 20px sans-serif';
for (let f = 0; f < N * N; f++) {
  const x = (f % N) * S, y = ((f / N) | 0) * S + 40;
  g.strokeStyle = 'rgba(157,247,255,.35)'; g.lineWidth = 1; g.strokeRect(x, y, S, S);
  g.fillStyle = '#ffe08a'; g.fillText(String(f), x + 5, y + 21);
}
// the jet window boxed, because that is the one being asked about
for (const [k, col] of [['jet', '#6cff8a'], ['puff', '#ff6cf0']]) {
  const b = FX.bank[k]; if (!b) continue;
  g.strokeStyle = col; g.lineWidth = 4;
  for (let i = b[0]; i < b[0] + b[1]; i++) g.strokeRect((i % N) * S + 2, ((i / N) | 0) * S + 42, S - 4, S - 4);
}
writeFileSync('tools/fx-sheet-banks.png', out.encodeSync('png'));
console.log('wrote tools/fx-sheet-banks.png  -- jet boxed green, puff boxed pink');
