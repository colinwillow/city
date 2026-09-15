// npm run cross -- the junction standoffs, run against the REAL decision function.
// It lifts `crossGive` and `TRAF` straight out of index.html between the CROSS markers and
// evaluates that text, so this measures the shipped rule rather than a restatement of it --
// which is the mistake `normals.mjs` made about `normGeo` and which cost a build.
import { readFileSync } from 'fs';
const src = readFileSync('index.html', 'utf8');
const fn = src.match(/\/\* CROSS:START \*\/([\s\S]*?)\/\* CROSS:END \*\//);
const tr = src.match(/const TRAF = \{[\s\S]*?\n\};/);
if (!fn || !tr) { console.error('markers not found'); process.exit(1); }
const crossGive = new Function(fn[1] + '; return crossGive;')();
const TRAF = new Function(tr[0].replace('const TRAF', 'const T') + '; return T;')();

const DIRS = { N: [0, 1], S: [0, -1], E: [1, 0], W: [-1, 0] };
const LANE = 2.88;   // laneOffset() on a 12 m road: w * .24. Cars keep RIGHT, right = (-fz, fx).
// a car drives toward the origin from `d` metres away down its own approach, IN ITS LANE --
// without the offset the N and S cars share one line and every head-on reads as a collision.
function make(dir, dist, id, v0) {
  const [ux, uz] = DIRS[dir], rx = -uz * LANE, rz = ux * LANE;
  return { id, x: -ux * dist + rx, z: -uz * dist + rz, fx: ux, fz: uz, speed: v0, stop: 0, top: 12, done: false, dir };
}
function sim(cars, rule, T = 14) {
  const dt = 1 / 60; let t = 0, worstGap = 1e9, inBox = 0, cleared = 0;
  const waited = new Map(cars.filter(c => c.top > 0 || c.wake !== undefined).map(c => [c.id, 0]));
  for (; t < T; t += dt) {
    for (const c of cars) {
      if (c.wake !== undefined && t >= c.wake) { c.top = 12; c.wake = undefined; }
      c.stop = c.speed < .5 ? c.stop + dt : 0;
      if (c.speed < .5 && c.top > 0 && waited.has(c.id)) waited.set(c.id, waited.get(c.id) + dt);
      let cap = c.top, qd = 1e9, qv = 0;
      // the queue ahead in my own lane, exactly as stepTraffic gathers it -- this is what
      // feeds `blocked`, and without it the don't-block-the-box branch is never exercised.
      for (const o of cars) {
        if (o === c) continue;
        const ox = o.x - c.x, oz = o.z - c.z;
        const ahead = ox * c.fx + oz * c.fz, side = ox * -c.fz + oz * c.fx;
        if (o.fx * c.fx + o.fz * c.fz > .55 && ahead > 0 && Math.abs(side) < 2.6) {
          cap = Math.min(cap, Math.max(0, o.speed + (ahead - TRAF.gap) * .9));
          if (ahead < qd) { qd = ahead; qv = o.speed; }
        }
      }
      for (const o of cars) {
        if (o === c) continue;
        const ox = o.x - c.x, oz = o.z - c.z;
        const ahead = ox * c.fx + oz * c.fz, side = ox * -c.fz + oz * c.fx;
        if (o.fx * c.fx + o.fz * c.fz > .55 && ahead > 0 && Math.abs(side) < 2.6) continue;
        const den = c.fx * o.fz - c.fz * o.fx;
        if (Math.abs(den) < TRAF.para) continue;
        const ta = (ox * o.fz - oz * o.fx) / den, tb = (ox * c.fz - oz * c.fx) / den;
        if (ta < -TRAF.r || tb < -TRAF.r || ta > TRAF.reach || tb > TRAF.reach) continue;
        let give;
        if (rule === 'right') {
          // THE OLD RULE, for comparison: give way to the car on your right, with the same
          // stuck escape hatch. Anti-symmetric on a pair -- and that is all it is.
          const rx = -c.fz, rz = c.fx, side = ox * rx + oz * rz;
          give = !(c.stop > TRAF.stuck) && side > 0;
        } else give = crossGive(ta, c.speed, tb, o.speed, c.id, o.id, c.stop, o.stop, qv < 1.6 && qd - ta < TRAF.clear, TRAF);
        if (!give) continue;
        cap = Math.min(cap, rule === 'right'
          ? Math.max(0, (Math.hypot(ox, oz) - 2 * TRAF.r) * .8)          // old: brake for the CAR
          : Math.sqrt(2 * TRAF.yieldA * Math.max(0, ta - TRAF.zone)));   // new: stop on the LINE
      }
      c.speed = cap < c.speed ? Math.max(cap, c.speed - TRAF.brake * dt) : Math.min(cap, c.speed + TRAF.acc * dt);
      c.x += c.fx * c.speed * dt; c.z += c.fz * c.speed * dt;
    }
    for (const c of cars) {
      // IN THE BOX means stopped ON SOMEBODY'S CROSSING POINT -- not merely near the middle.
      // A car halted on its own stop line is doing the right thing and must not be counted.
      if (c.speed < .5) for (const o of cars) {
        if (o === c) continue;
        const den = c.fx * o.fz - c.fz * o.fx; if (Math.abs(den) < TRAF.para) continue;
        const ta = ((o.x - c.x) * o.fz - (o.z - c.z) * o.fx) / den;
        if (Math.abs(ta) < 3.5) { inBox++; break; }
      }
      if (!c.done && (c.x * c.fx + c.z * c.fz) > 12) { c.done = true; cleared = t; }
    }
    for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
      const g = Math.hypot(cars[i].x - cars[j].x, cars[i].z - cars[j].z);
      if (g < worstGap) worstGap = g;
    }
  }
  // a car parked with top 0 is scenery, not a participant: it can never clear and must not
  // be allowed to report the scenario as a failure.
  const all = cars.every(c => c.done);
  return { all, cleared: all ? cleared : Infinity, worstGap, inBox: inBox / 60,
           maxWait: Math.max(...waited.values()) };
}
const cases = [
  ['two cars, 90 deg, equal',        () => [make('N', 25, 0, 10), make('E', 25, 1, 10)]],
  ['two cars, 90 deg, one closer',   () => [make('N', 18, 0, 10), make('E', 28, 1, 10)]],
  ['FOUR-WAY, dead symmetric',       () => [make('N', 25, 0, 10), make('E', 25, 1, 10), make('S', 25, 2, 10), make('W', 25, 3, 10)]],
  ['four-way, jittered',             () => [make('N', 22, 0, 9), make('E', 26, 1, 11), make('S', 24, 2, 10), make('W', 28, 3, 8)]],
  ['three-way T',                    () => [make('N', 24, 0, 10), make('E', 20, 1, 12), make('W', 30, 2, 9)]],
  ['EIGHT, two per approach',        () => [make('N', 22, 0, 10), make('N', 36, 1, 10), make('E', 25, 2, 10), make('E', 40, 3, 10),
                                            make('S', 24, 4, 10), make('S', 38, 5, 10), make('W', 27, 6, 10), make('W', 42, 7, 10)]],
  ['TWELVE, three per approach',     () => { const a = []; let i = 0; for (const d of ['N','E','S','W']) for (let k = 0; k < 3; k++) a.push(make(d, 20 + k * 14 + i, i++, 10)); return a; }],
  // a stalled car sitting just past the junction on the N car's exit. Nobody may enter a box
  // they cannot leave: right of way is permission to CROSS, not permission to stop halfway.
  // A stalled car just past the junction on the N car's exit, which pulls away after 5 s.
  // Nobody may enter a box they cannot leave -- right of way is permission to CROSS, not
  // permission to stop halfway -- and everything must recover once the road clears.
  ['exit blocked, clears at 5s',     () => { const a = [make('N', 26, 0, 10), make('E', 30, 1, 10)];
                                            const j = make('N', -9, 2, 0); j.top = 0; j.wake = 5; a.push(j); return a; }],
];
const pad = (s, n) => String(s).padEnd(n);
const num = (v, n = 6) => (v === Infinity ? 'NEVER' : v.toFixed(2)).padStart(n);
for (const rule of ['right', 'fcfs']) {
  console.log(`\n=== ${rule === 'right' ? 'OLD: give way to the right, brake for the car' : 'NEW: first come first served, stop on the line'} ===`);
  console.log(pad('case', 30), '  all through   clear(s)   min gap   stopped-in-box(s)  worst wait');
  for (const [name, mk] of cases) {
    const r = sim(mk(), rule);
    console.log(pad(name, 30), pad(r.all ? '  yes' : '  NO ', 13), num(r.cleared), '  ', num(r.worstGap), '     ', num(r.inBox), '        ', num(r.maxWait));
  }
}
