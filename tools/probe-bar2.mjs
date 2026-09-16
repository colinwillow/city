// JAM_PROBE=tools/probe-bar2.mjs npm run jam
// Does the catch actually fire from a realistic approach, and does city.bar() work?
const G = globalThis.__shred;
const P = G.player, BAR = G.BAR, COLIN_HEIGHT = G.COLIN_HEIGHT;
console.log('\nbars: ' + G.bars.length + '   BAR.grab ' + BAR.grab + '   BAR.show ' + BAR.show);
if (!G.bars.length) process.exit(1);

// 1. the one-command test
const b = G.bar();
console.log('  city.bar() -> ' + (P.bar ? 'ON THE BAR' : '*** DID NOT CATCH'));
if (!P.bar) process.exit(1);
P.bar = null; P.barCool = 0;

// 2. a realistic flying approach: come at it at board speed, from one side, at hand height
let caught = 0, tried = 0;
for (const r of G.bars.slice(0, 40)) {
  for (const sp of [8, 16, 24]) {
    tried++;
    const fx = -r.az, fz = r.ax;                        // across the bar
    P.bar = null; P.barCool = 0; P.hit = ''; P.hang = 0; P.lad = 0; P.grounded = false;
    // start 3 m back, hands level with the bar
    P.pos.set(r.x - fx * 3, r.y - COLIN_HEIGHT * .92, r.z - fz * 3);
    P.vel.set(fx * sp, 0, fz * sp);
    P.barPX = P.pos.x; P.barPY = P.pos.y; P.barPZ = P.pos.z;
    for (let i = 0; i < 40 && !P.bar; i++) {
      P.barPX = P.pos.x; P.barPY = P.pos.y; P.barPZ = P.pos.z;
      P.pos.x += P.vel.x / 60; P.pos.z += P.vel.z / 60;
      G.barCatch();
    }
    if (P.bar) caught++;
  }
}
console.log('\n  flying straight at a bar at hand height, 8 / 16 / 24 m/s:');
console.log('    caught ' + caught + ' of ' + tried + '  (' + (caught / tried * 100).toFixed(0) + '%)');
if (caught < tried * .9) console.log('    *** the window is still too tight, or the sweep is not working');
else console.log('    the catch is reliable from a straight approach');
