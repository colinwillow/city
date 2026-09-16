// npm run push -- WHERE IN THE PUSH CLIP DOES THE FOOT ACTUALLY MEET THE ROAD?
//
// *"The push sound is offset from the push. It goes in between where it needs to go -- if he's
// pushing every second or so, the sound effect is in the in-between space."*
// `SK8.pushPlant` has sat in this file since the push cycle was built, with a comment saying the
// shove fires where the foot is on the road -- and NOTHING EVER READ IT. The shove fired at the
// TOP of the cycle, where the foot is still up on the board, so the sound landed a fraction of a
// cycle before the thing it is the sound of. That fraction is what this measures, rather than
// keeping the 0.42 somebody once typed.
//
// The free foot is the one with the bigger vertical excursion -- measured, not named, because a
// re-export could push off the other side. Touchdown is where it first comes within `NEAR` of its
// own floor; that is the frame the stroke begins and the frame the scrape is heard.
import fs from 'fs';
if (!fs.existsSync('node_modules/three/package.json')) {
  fs.mkdirSync('node_modules/three', { recursive: true });
  fs.writeFileSync('node_modules/three/package.json', JSON.stringify({
    name: 'three', version: '0.180.0-vendored', type: 'module', main: 'index.js', exports: { '.': './index.js' } }, null, 2));
  fs.writeFileSync('node_modules/three/index.js', "export * from '../../vendor/three.module.min.js';\n");
}
const THREE = await import('three');
const { GLTFLoader } = await import('../vendor/GLTFLoader.js');
const { NodeIO } = await import('@gltf-transform/core');
const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
const draco3d = (await import('draco3dgltf')).default;
const gio = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });

const file = process.argv[2] || 'models/colin.glb';
const TMP = 'tools/.push-tmp/'; fs.mkdirSync(TMP, { recursive: true });
const plain = TMP + file.split('/').pop();
{
  const doc = await gio.read(file);
  for (const t of doc.getRoot().listTextures()) t.dispose();
  for (const e of doc.getRoot().listExtensionsUsed()) if (/draco/i.test(e.extensionName)) e.dispose();
  await gio.write(plain, doc);
}
const buf = fs.readFileSync(plain);
const gltf = await new Promise((res, rej) =>
  new GLTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', res, rej));

const scene = gltf.scene; scene.updateMatrixWorld(true);
const by = {}; scene.traverse(o => { by[o.name] = o; });
// the two ends of each leg. A toe reaches the road; a foot bone is the ankle and still moves
// with it, so either answers the question and the toe answers it more sharply.
const pick = (a, b) => by[a] || by[b];
const LEG = { L: pick('mixamorig_LeftToeBase', 'mixamorig_LeftFoot'), R: pick('mixamorig_RightToeBase', 'mixamorig_RightFoot') };
if (!LEG.L || !LEG.R) { console.error('no toe/foot bones on this rig'); process.exit(1); }
console.log(file + '\n  feet: ' + Object.entries(LEG).map(([k, o]) => k + '=' + o.name).join('  '));

const mixer = new THREE.AnimationMixer(scene);
const STEPS = 240, NEAR = +(process.env.NEAR || .15);           // 15% of the excursion up from the floor is still "down"
const names = process.argv.slice(3).length ? process.argv.slice(3) : ['skate_push_standing', 'skate_push_crouch'];
const _v = new THREE.Vector3();
for (const nm of names) {
  const clip = gltf.animations.find(c => c.name === nm);
  if (!clip) { console.log('\n' + nm + ': ABSENT'); continue; }
  const act = mixer.clipAction(clip); act.reset(); act.play(); act.setEffectiveWeight(1);
  const y = { L: [], R: [] };
  for (let i = 0; i < STEPS; i++) {
    mixer.setTime(clip.duration * i / STEPS);
    scene.updateMatrixWorld(true);
    for (const k of ['L', 'R']) y[k].push(LEG[k].getWorldPosition(_v).y);
  }
  act.stop();
  const span = k => Math.max(...y[k]) - Math.min(...y[k]);
  const free = span('L') >= span('R') ? 'L' : 'R';
  const on = span(free) === span('L') ? 'R' : 'L';
  const lo = Math.min(...y[free]), hi = Math.max(...y[free]), gate = lo + (hi - lo) * NEAR;
  const down = y[free].map(v => v <= gate);
  // the contact RUN, read circularly -- the clip loops, so a plant that straddles the seam is
  // one contact and not two.
  // THE LONGEST RUN, NOT THE FIRST, and that is not fussiness -- the first version took the
  // first dip under the gate and came back with a 0.025-of-a-cycle "contact" that is a wobble
  // on the way past. The free foot rides ON THE DECK for most of the cycle, so the trace is a
  // long plateau with one kick UP and one dip DOWN to the road, and the dip is the one that
  // lasts. Read circularly, because a plant that straddles the clip's seam is one contact.
  let start = -1, len = 0;
  for (let i = 0; i < STEPS; i++) {
    if (!down[i] || down[(i - 1 + STEPS) % STEPS]) continue;
    let n = 0; while (n < STEPS && down[(i + n) % STEPS]) n++;
    if (n > len) { len = n; start = i; }
  }
  const low = y[free].indexOf(lo) / STEPS;
  console.log('\n' + nm + '  ' + clip.duration.toFixed(3) + 's');
  console.log('  free foot ' + free + ' (excursion ' + span(free).toFixed(1) + ' units)   board foot ' + on + ' (' + span(on).toFixed(1) + ')');
  console.log('  ' + y[free].filter((_, i) => i % 5 === 0).map(v => ' .:-=+*#%@'[Math.min(9, Math.floor((v - lo) / (hi - lo) * 9.99))]).join(''));
  if (start < 0) { console.log('  the free foot never comes down -- no plant in this clip'); continue; }
  console.log('  TOUCHDOWN at phase ' + (start / STEPS).toFixed(3) + '   lift-off ' + (((start + len) % STEPS) / STEPS).toFixed(3)
    + '   lowest ' + low.toFixed(3));
  console.log('  contact lasts ' + (len / STEPS).toFixed(3) + ' of the cycle  = '
    + (len / STEPS * 1.55).toFixed(2) + 's at the cruising 1.55s cycle, ' + (len / STEPS * .60).toFixed(2) + 's at 0.60s');
  console.log('  >> SK8.pushPlant = ' + (start / STEPS).toFixed(2));
}
process.exit(0);
