// npm run wear -- does a borrowed skin actually STAND UP when it wears Colin's clips?
//
// This runs the REAL pipeline, not a restatement of it: `skinClips` and the armature capture
// are lifted out of index.html between the SKIN markers and evaluated, against the real
// GLBs loaded by the real vendored GLTFLoader and driven by a real AnimationMixer. Every
// check before this one measured the ASSET -- bone names, rest poses, node scales -- and all
// four came back clean while two of the three characters were lying in the road. An asset
// that is fine is not a pipeline that works; that lesson is written three times in CLAUDE.md
// and this tool exists because I ignored it three times in one afternoon.
//
// Textures are stripped into /tmp first (see the npm script): GLTFLoader wants an image
// decoder for them and nothing here cares what colour anybody is.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
// THE IMPORT MAP, FOR NODE. `vendor/GLTFLoader.js` imports the bare specifier 'three', which
// the page resolves through its <script type="importmap"> and node cannot resolve at all.
// A three-line shim package pointing back at the VENDORED build is the whole fix -- and it
// has to be the vendored one, because testing r180's loader against some other r180 is the
// same class of mistake as testing a copy of the code.
if (!existsSync('node_modules/three/package.json')) {
  mkdirSync('node_modules/three', { recursive: true });
  writeFileSync('node_modules/three/package.json', JSON.stringify({
    name: 'three', version: '0.180.0-vendored', type: 'module', main: 'index.js', exports: { '.': './index.js' } }, null, 2));
  writeFileSync('node_modules/three/index.js', "export * from '../../vendor/three.module.min.js';\n");
}
const THREE = await import('three');
const { GLTFLoader } = await import('../vendor/GLTFLoader.js');
global.THREE = THREE;

const src = readFileSync('index.html', 'utf8');
const grab = (a, b) => { const m = src.match(new RegExp('/\\* ' + a + ' \\*/([\\s\\S]*?)/\\* ' + b + ' \\*/')); if (!m) { console.error('marker ' + a + ' not found'); process.exit(1); } return m[1]; };
const shipped = grab('SKIN:START', 'SKIN:END');

// Prepared copies: textures and Draco both go. GLTFLoader wants an image decoder for one and
// a wasm decoder for the other, and nothing here cares what colour anybody is or how the
// triangles were packed -- the bones, the skins and the clips are untouched by either.
const { NodeIO } = await import('@gltf-transform/core');
const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
const draco3d = (await import('draco3dgltf')).default;
const gio = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
const TMP = 'tools/.wear-tmp/';
mkdirSync(TMP, { recursive: true });
async function prep(f) {
  const out = TMP + f.split('/').pop();
  const doc = await gio.read(f);
  for (const t of doc.getRoot().listTextures()) t.dispose();
  for (const e of doc.getRoot().listExtensionsUsed()) if (/draco/i.test(e.extensionName)) e.dispose();
  await gio.write(out, doc);
  return out;
}
const loader = new GLTFLoader();
const load = f => new Promise((res, rej) => loader.parse(readFileSync(f).buffer.slice(0), '', res, rej));
const FILES = { colin: 'models/colin.glb', robot: 'models/chars/robot.glb',
                moussa_robit: 'models/chars/moussa_robit.glb', alien_orange: 'models/chars/alien_orange.glb',
                melee: 'models/chars/melee.glb' };
const gl = {};
for (const k in FILES) gl[k] = await load(await prep(FILES[k]));

// the shipped text needs these names in scope
const CHARS = { skins: {}, h: {} };
const COLIN_HEIGHT = 1.75;
const colin = { clips: gl.colin.animations };
// THE BORROWED CLIPS ARE PART OF COLIN'S POOL AT RUNTIME (`buildColin`), so a harness that
// loads only colin.glb measures a pool the game never has -- which is how the first run
// reported every melee clip "absent".
{
  const have = new Set(); gl.colin.scene.traverse(o => { if (o.name) have.add(o.name); });
  for (const c of gl.melee.animations) {
    if (colin.clips.some(x => x.name === c.name)) continue;
    c.tracks = c.tracks.filter(t => { const d = t.name.indexOf('.'); return have.has(d > 0 ? t.name.slice(0, d) : t.name); });
    colin.clips.push(c);
  }
}
const fn = new Function('THREE', 'CHARS', 'COLIN_HEIGHT', 'colin', 'TITLE',
  shipped + '\n; return { measureSkin, skinClips, sitSkin };')(THREE, CHARS, COLIN_HEIGHT, colin, { hand: 'mixamorig_RightHand' });

const ANKLE = { v: 0 }, YAW = { v: 0 };
const root = new THREE.Group();
function check(key, gltf) {
  const skin = fn.measureSkin(gltf.scene, key);
  CHARS.skins[key] = skin;
  root.add(skin.model);
  const mixer = new THREE.AnimationMixer(skin.model);
  const clips = fn.skinClips(skin, colin.clips);
  // EVERY CLIP, NOT JUST THE IDLE. `sitSkin` lifts him by what ONE pose says; if another clip
  // sits the body somewhere else relative to the root he floats or sinks for the whole of it,
  // and that is exactly the complaint. Play each one and read the soles.
  if (key === 'colin') {
    const mx = new THREE.AnimationMixer(skin.model);
    console.log('   sole height per clip (idle is the one sitSkin measured):');
    // ONLY A GROUND CLIP CAN FLOAT. A flip's lowest vertex RISES as he tucks -- that is the
    // trick, not a fault -- so flagging it reads as a bug that is not there.
    const AIR = new Set(['front_flip', 'back_flip', 'jump_going_up']);
    for (const nm of ['idle_neutral', 'walk_fwd_neutral', 'run_fwd', 'melee_punch_01', 'melee_slash', 'melee_round_kick', 'slide', 'roll', 'front_flip', 'back_flip', 'jump_going_up']) {
      const c = clips.find(x => x.name === nm); if (!c) { console.log('      ' + nm.padEnd(18) + ' (absent)'); continue; }
      const a = mx.clipAction(c); mx.stopAllAction(); a.reset().play(); a.setEffectiveWeight(1);
      let lo = 1e9, hi = -1e9, t = 0;
      for (let i = 0; i < 12; i++) {
        mx.setTime(c.duration * i / 11); skin.model.updateMatrixWorld(true);
        let y = 1e9;
        skin.model.traverse(o => { if (!o.isSkinnedMesh) return;
          const pos = o.geometry.attributes.position, st = Math.max(1, Math.floor(pos.count / 150)), v = new THREE.Vector3();
          for (let j = 0; j < pos.count; j += st) { o.applyBoneTransform(j, v.fromBufferAttribute(pos, j)); o.localToWorld(v); if (v.y < y) y = v.y; } });
        if (y < lo) lo = y; if (y > hi) hi = y; t += y;
      }
      const mean = t / 12;
      console.log('      ' + nm.padEnd(18) + ' soles ' + lo.toFixed(2) + ' .. ' + hi.toFixed(2) +
        '   mean ' + mean.toFixed(2) + (AIR.has(nm) ? '   (air)' : lo > .06 ? '   *** FLOATING ' + lo.toFixed(2) + ' m ***' : mean < -.2 ? '   *** SUNK ***' : ''));
      a.stop();
    }
    mx.stopAllAction();
  }
  const idle = clips.find(c => c.name === 'idle_neutral');
  const a = mixer.clipAction(idle); a.play(); a.setEffectiveWeight(1);
  mixer.update(0);
  fn.sitSkin(skin);            // the shipped lift, on the shipped pose
  mixer.update(0.5);
  root.updateMatrixWorld(true);
  // MEASURE WHAT IS RENDERED, NOT WHERE THE BONES ARE. The first version of this read bone
  // world positions and called the robot upright while he was buried head-down in the road:
  // his bones live under an armature the MESH does not share, and the inverse bind matrices
  // reconcile the two only at the vertices. `applyBoneTransform` is three's own skinning for
  // one vertex -- the same sum the shader does -- so this is the picture, not the rig.
  const pts = [];
  skin.model.traverse(o => {
    if (!o.isSkinnedMesh) return;
    const pos = o.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 400));
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += step) {
      const bindY = pos.getY(i);
      o.applyBoneTransform(i, v.fromBufferAttribute(pos, i));
      o.localToWorld(v);
      pts.push({ bindY, y: v.y, x: v.x, z: v.z });
    }
  });
  // WHICH WAY IS HE POINTING? Not from the bones -- they sit in an armature frame the mesh
  // does not share -- and not from a bind-space axis either, since nothing promises two rigs
  // were authored down the same one. His HANDS are unambiguous: find the vertex each hand
  // bone dominates, skin it, and the left-to-right vector between them is his shoulder line.
  // Facing is that turned a quarter, and the answer is a yaw RELATIVE TO COLIN, so whatever
  // convention his file uses cancels.
  function bonePoint(boneName) {
    let best = null, bw = 0;
    skin.model.traverse(o => {
      if (!o.isSkinnedMesh || !o.skeleton) return;
      const bi = o.skeleton.bones.findIndex(b => b.name === boneName); if (bi < 0) return;
      const si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight;
      for (let i = 0; i < si.count; i++) {
        const idx = [si.getX(i), si.getY(i), si.getZ(i), si.getW(i)], wt = [sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i)];
        for (let j = 0; j < 4; j++) if (idx[j] === bi && wt[j] > bw) { bw = wt[j]; best = { o, i }; }
      }
    });
    if (!best) return null;
    const v = new THREE.Vector3();
    best.o.applyBoneTransform(best.i, v.fromBufferAttribute(best.o.geometry.attributes.position, best.i));
    return best.o.localToWorld(v);
  }
  // A fallback chain, because the robot's HANDS are not the dominant weight on any vertex --
  // his forearms carry them -- and a probe that silently finds nothing reports no yaw at all.
  let lh = null, rh = null, via = '';
  for (const pair of [['LeftHand', 'RightHand'], ['LeftForeArm', 'RightForeArm'], ['LeftArm', 'RightArm'], ['LeftUpLeg', 'RightUpLeg']]) {
    lh = bonePoint('mixamorig_' + pair[0]); rh = bonePoint('mixamorig_' + pair[1]);
    if (lh && rh && lh.distanceTo(rh) > .05) { via = pair[0].replace('Left', ''); break; }
    lh = rh = null;
  }
  let yaw = null;
  if (lh && rh) yaw = Math.atan2(lh.x - rh.x, lh.z - rh.z);
  pts.sort((a, b) => a.bindY - b.bindY);
  const n = pts.length, lowQ = pts.slice(0, Math.max(1, n * .05 | 0)), hiQ = pts.slice(n - Math.max(1, n * .05 | 0));
  const mean = a => a.reduce((s, p) => s + p.y, 0) / a.length;
  const sole = mean(lowQ), crown = mean(hiQ);
  let yLo = 1e9, yHi = -1e9; for (const p of pts) { if (p.y < yLo) yLo = p.y; if (p.y > yHi) yHi = p.y; }
  const kept = clips.reduce((t, c) => t + c.tracks.length, 0), had = colin.clips.reduce((t, c) => t + c.tracks.length, 0);
  console.log('\n' + key.toUpperCase());
  console.log('   tracks kept ' + kept + ' / ' + had + '   scale x' + skin.model.scale.x.toFixed(3) + '   lift y=' + skin.model.position.y.toFixed(3) + '   ' + pts.length + ' vertices skinned');
  console.log('   rendered y ' + yLo.toFixed(2) + ' .. ' + yHi.toFixed(2) + '  (' + (yHi - yLo).toFixed(2) + ' m tall)');
  console.log('   his SOLES render at ' + sole.toFixed(2) + ' and his CROWN at ' + crown.toFixed(2) +
              '  -> ' + (crown > sole ? 'UPRIGHT' : '*** UPSIDE DOWN ***'));
  if (yaw !== null) {
    if (key === 'colin') YAW.v = yaw;
    let d = (yaw - YAW.v) * 180 / Math.PI; while (d > 180) d -= 360; while (d < -180) d += 360;
    console.log('   left-right axis via ' + via + ': ' + (yaw * 180 / Math.PI).toFixed(0) + ' deg' +
      (key === 'colin' ? '  (the reference)' : '   -> he is turned ' + d.toFixed(0) + ' deg from Colin' +
        (Math.abs(d) > 20 ? '   *** needs spin ' + (-d).toFixed(0) + ' deg ***' : '   facing right')));
  }
  if (Math.abs(yLo) > .12) console.log('   *** ' + (yLo > 0 ? 'FLOATING ' + yLo.toFixed(2) + ' m ABOVE' : 'SUNK ' + (-yLo).toFixed(2) + ' m BELOW') + ' THE GROUND ***');
  root.remove(skin.model);
}
check('colin', gl.colin);
check('robot', gl.robot);
check('moussa', gl.moussa_robit);
check('alien', gl.alien_orange);
