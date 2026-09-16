// JAM_PROBE=tools/probe-box2.mjs npm run jam
//
// *"I need to see the collider. I need a debug code to turn on the collider."* Asked three
// times, so the first question is whether c161's view WORKS and he could not find it, or
// whether it is broken -- which is the oldest distinction in this file and the only one worth
// measuring first. It calls the SHIPPED `stepBoxes` and reads the draw ranges it wrote.
const G = globalThis.__shred;
const P = G.player, BOXES = G.BOXES;
// stand him next to a real car, which is what he is complaining about
const car = G.cars.slice().sort((a, b) =>
  Math.hypot(a.x - P.pos.x, a.z - P.pos.z) - Math.hypot(b.x - P.pos.x, b.z - P.pos.z))[0];
P.pos.set(car.x + 3, car.y + 1, car.z);
// AND THE WORLD HAS TO HAVE BEEN STEPPED. `carGrid` is rebuilt inside `stepTraffic` and an
// officer has no `y` until `stepCops` gives him one -- so a probe that calls `stepBoxes` on a
// freshly booted city measures a state the game never has, which is this repo's oldest mistake
// and it cost this tool its first run (0 / 0 / 0, and none of it real).
for (let i = 0; i < 60; i++) { G.stepTraffic(1 / 60); G.stepCops && G.stepCops(1 / 60); }
P.pos.set(car.x + 3, car.y + 1, car.z);
console.log('\nstanding 3 m from a car at ' + car.x.toFixed(0) + ',' + car.z.toFixed(0)
  + '   hl ' + car.hl.toFixed(2) + '  hw ' + car.hw.toFixed(2) + '  hh ' + car.hh.toFixed(2)
  + '  lift ' + (car.lift === undefined ? 'MISSING' : car.lift.toFixed(2)));

BOXES.on = 0; G.stepBoxes();
BOXES.on = 1; G.stepBoxes();
const names = ['cars', 'solids', 'police'];
let i = 0, bad = 0, drew = 0;
for (const m of G.scene.children.filter(o => o.isLineSegments)) {
  const r = m.geometry.drawRange.count, pos = m.geometry.attributes.position.array;
  let nan = 0;
  for (let k = 0; k < r * 3; k++) if (!Number.isFinite(pos[k])) nan++;
  console.log('  ' + (names[i] || 'line ' + i).padEnd(9) + 'visible ' + (m.visible ? 'yes' : 'NO ')
    + '   vertices ' + String(r).padStart(5) + '   non-finite ' + nan + (nan ? '  *** NOTHING WILL DRAW' : ''));
  if (nan) bad++;
  if (r > 0 && m.visible) drew++;
  i++;
}
// AND WHERE THE CAR BOX ACTUALLY SITS, against the box the collider really uses.
const a = G.scene.children.filter(o => o.isLineSegments)[0].geometry.attributes.position.array;
let lo = Infinity, hi = -Infinity;
for (let k = 1; k < G.scene.children.filter(o => o.isLineSegments)[0].geometry.drawRange.count * 3; k += 3) {
  lo = Math.min(lo, a[k]); hi = Math.max(hi, a[k]);
}
console.log('\n  drawn car boxes span y ' + lo.toFixed(2) + ' .. ' + hi.toFixed(2));
console.log('  the collider says    y ' + car.box.miny.toFixed(2) + ' .. ' + car.box.maxy.toFixed(2)
  + '   (this car)');
console.log('');
if (bad) { console.log('*** the collider view writes non-finite vertices'); process.exit(1); }
if (drew < 2) { console.log('*** the collider view drew nothing'); process.exit(1); }
console.log('the collider view works: ' + drew + ' of 3 families drawing. If he cannot see it, it is FINDING it.');
