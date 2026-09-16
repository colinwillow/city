// npm run slash -- WHICH WAY DOES THE MELEE MARK ACTUALLY COME OUT?
//
// Third time this has been wrong (c80 sizes, c91 the screen-space roll, c153 the basis), and
// every time it was argued rather than measured. It is a pure projection question, so it has a
// number: put a real camera behind him, throw a punch, and read the mark's angle ON SCREEN.
//   0 deg  = horizontal, broadside, the full crescent visible
//   90 deg = standing on end, which is what "parallel to the camera" looks like
import fs from 'fs';
if (!fs.existsSync('node_modules/three/package.json')) {
  fs.mkdirSync('node_modules/three', { recursive: true });
  fs.writeFileSync('node_modules/three/package.json', JSON.stringify({
    name: 'three', version: '0.180.0-vendored', type: 'module', main: 'index.js', exports: { '.': './index.js' } }, null, 2));
  fs.writeFileSync('node_modules/three/index.js', "export * from '../../vendor/three.module.min.js';\n");
}
const THREE = await import('three');
const src = fs.readFileSync('index.html', 'utf8');
const m = src.match(/function slashScreenRoll\([\s\S]*?\n\}/);
if (!m) { console.error('slashScreenRoll not found'); process.exit(1); }

globalThis.innerWidth = 844; globalThis.innerHeight = 390;      // a phone in landscape
const camera = new THREE.PerspectiveCamera(52, 844 / 390, .1, 2000);
const _saA = new THREE.Vector3(), _saB = new THREE.Vector3();
const SLASH = { flat: .02, spread: .5 };
const roll = new Function('THREE', 'camera', '_saA', '_saB', 'SLASH', 'innerWidth', 'innerHeight',
  m[0] + '\nreturn slashScreenRoll;')(THREE, camera, _saA, _saB, SLASH, 844, 390);

// THE ORDINARY CASE, and the one that was broken: camera behind him, punch thrown forward.
// `CAM.el` is .17 rad of downward pitch and the boom is 6.4 m -- the real shot.
function put(camYaw, camEl, dist, px, pz) {
  camera.position.set(px - Math.sin(camYaw) * dist, 1.9 + Math.sin(camEl) * dist, pz - Math.cos(camYaw) * dist);
  camera.lookAt(px, 1.0, pz);
  camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
}
const deg = r => { let d = r * 180 / Math.PI; while (d > 90) d -= 180; while (d < -90) d += 180; return d; };
const rows = [
  ['punch straight away from the lens', 0, 0],
  ['punch away, camera 30 deg round',  .52, 0],
  ['punch away, camera 60 deg round',  1.05, 0],
  ['punch ACROSS the screen, L-to-R',  0, Math.PI / 2],
  ['punch ACROSS the screen, R-to-L',  0, -Math.PI / 2],
  ['punch back TOWARD the lens',       0, Math.PI],
];
console.log('\nthe mark on screen, 0 = horizontal/broadside, 90 = on end\n');
let worst = 0;
for (const [name, camYaw, blowOff] of rows) {
  put(camYaw, .17, 6.4, 0, 0);
  const h = blowOff;                        // he punches on this bearing
  const a = deg(roll(0, 1.0, 0, Math.sin(h), Math.cos(h), 0));
  const flag = Math.abs(a) > 55 ? '   <-- ON END' : '';
  worst = Math.max(worst, Math.abs(a));   // EVERY case should read broadside, not just the forward one
  console.log('  ' + name.padEnd(36) + (a >= 0 ? ' ' : '') + a.toFixed(1) + ' deg' + flag);
}
console.log('\nworst case of any: ' + worst.toFixed(1) + ' deg off horizontal');
if (worst > 55) { console.log('*** the mark still stands on end somewhere'); process.exit(1); }
console.log('every swing reads broadside, which is the ask.');
