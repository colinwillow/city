# City — working rules

Single-file Three.js r180 game in `index.html` (native ES modules, import map, no build
step). **Run `npm run bump` before every push** — it raises `BUILD` in both places and
rewrites `version.json`. Pages caches `index.html` for ten minutes and an iOS home-screen
app caches it harder, so a build that does not announce itself cannot be told apart from
the one before it. **Push straight to `main`** — the owner previews live on a phone.

The number is the big cyan figure top-left; it pulses three times on load. A running copy
polls `version.json` every 15s past the cache and puts a "build cN ready · tap" pill on
screen when the server has moved on, so he never has to guess whether a reload took.

## Verification budget

**The owner tests the game. You do not.** Make the change, `npm run bump`, run the ~1s
syntax gate (`npm run check:syntax`), push, and say "shipped unverified" **with the build
number** so he knows what to look for on the badge. No screenshots, no headless runs, no
playwright unless he asks for it by name.

## Layout

- `index.html` — everything: renderer + post chain (Plutopia's toon ramp, depth outline,
  bloom, ACES, grade), heightmap + box colliders, traffic, twin sticks, Colin, the board.
- `models/city.glb` — baked from `LowPoly_City_01.glb` by `npm run bake` (gltf-transform:
  welds and simplifies the heavy meshes, marks them `extras.flat` so the game recomputes
  flat normals). Re-run after touching the source GLB. The game falls back to the source
  file if the bake is missing.
- `models/colin.glb` — from the `colin` repo, re-exported by the owner. 34 clips: the gait
  (`idle_neutral`, `walk_fwd_neutral`, `run_fwd`), air (`jump_going_up`,
  `jump_coming_down`, `landing_roll`, `*_jump_init`, flips), board (`skate_idol_standing`,
  `skate_idol_crouch`, `skate_push_standing/crouch`, `skate_ollie_init_air`,
  `skate_ollie_air`, `skate_ollie_landing`), car hits (`flying_backwards`,
  `flying_forwards`), dances, waving. 42 face morphs on `head`.
- `vendor/` — three r180 (module + core), GLTFLoader, DRACOLoader + wasm, BufferGeometryUtils,
  SkeletonUtils. All from the glorp/robits repos.
- `tools/` — `syntax.mjs` (the gate), `bake.mjs`, `bump.mjs`, `skin.mjs` (every vertex's
  distance to its dominant bone — proved the rig clean), `inspect.mjs` (reads both
  GLBs: per-mesh UVs, skin weights, morph counts, and the upward-facing triangle heights
  of the bridge and elevated roads — this is how the deck/tower bug was found).
- `images/HDRI_02_galaxy_2K.jpg`, `models/fluffy_cloud*.glb` — from Plutopia. **The galaxy
  is the one he wants, not `HDRI_01` (the daylight sky beside it), and it has to be SEEN.**
  The panorama does two jobs: prefiltered by `PMREMGenerator` it is `scene.environment` (the
  sky reflection on the cars), and flat it is the backdrop the dome blends in at `SKY.envK`,
  which rides at .55 and is pushed to the shader every frame so the console can move it.
  Colin is opted out with `envMapIntensity = 0`. The cloud deck (`CLOUDS`, `stepClouds`) is
  Plutopia's: a LOCAL field kept near the player and recycled upwind, not a world-wide one.
  `SKY.wind` drives both the models and the dome's noise layer, so they always agree.
- `version.json` — written by `bump.mjs`; the running game polls it to detect its successor.
- `.github/workflows/pages.yml` — deploys the repo root. Harmless if Pages is set to
  "deploy from a branch" instead; both paths deploy the same commit.

## Landmines

- **NOTHING IN THIS GAME CUTS. EVERY CLIP CHANGE IS A BLEND.** `colinSet` used to hard-SET
  the weights on a hit stage change, on the argument that an impact is not something to ease
  into. That argument only ever applied to landing, and it made the mid-air pinball flip a
  jump cut from `flying_backwards` to `flying_forwards`. A stage change is a fast blend
  (`HIT.snapHL`, .038) — never an instant set.
- **THE SAME .284 RAD HID THE PANORAMA AS HID THE CLOUDS.** Sampling the equirect by true
  elevation put only the dim strip just above its equator on screen and never the band the
  image is about, so turning `SKY.envK` up changed nothing anyone could point at. The dome
  remaps the visible window onto the panorama's whole upper half (`SKY.envSpan`): a
  wide-angle view of it, not a geometrically exact one, because a 16 degree window cannot
  show a sky any other way.
- **A CLOUD IS PLACED IN ANGLE, NEVER IN METRES.** Twice the deck was invisible because its
  height and distance were picked in metres and the elevation was left to fall out of them.
  It never did. `CAM.el` is a constant .17 rad of downward pitch and the vertical fov is 52,
  so **the only sky on screen is the band from the horizon to .284 rad above it** — about
  16 degrees, and a cloud one degree over that edge is as invisible as one that never
  loaded. `CLOUDS.el` and `CLOUDS.wide` are radians; `cloudPlace` picks a distance in the
  ring and derives the height and the scale from them, so every cloud is on screen by
  construction. Move the ring freely; do not reintroduce a height in metres.
- **The census chip answers "did that asset arrive".** `cloud<n>/vis<n> env<0|1>` in the
  debug chip: `cloud0` means the GLBs never loaded, `cloud28/vis0` means they loaded and are
  off the edge of the frame, `env0` means the panorama never arrived. Those are three
  different bugs and they are one glance apart on the phone. **`· NO CLOUD GLB` / `· NO SKY
  JPG` also appear in the fps chip unasked**, because a `console.warn` is invisible on a
  phone and "you never put it in" and "it is in and it did not load" are the same picture
  from where he is standing.
- **Names are sanitised by GLTFLoader**: `road_a_02.001` arrives as `road_a_02001`,
  `travel agency` as `travel_agency`. Every category test in `buildCity` is a prefix regex.
- **Cars**: local −Z is up, local Y is the length; `CAR_FWD` says which end is the nose.
  Mirrored placements (scale −1) get their heading from `matrixWorld`, not the quaternion.
- **Ground is a REAL triangle collider now (`TRI`, `groundAt`), not the heightmap.** Every
  ground triangle — roads, land, grass, sand, parking, bridge, courts — is stored in world
  space in a 4 m grid and queried by point-in-triangle. It returns TWO answers: the highest
  surface at or below `y + step`, and the lowest above. That is what gives exact kerbs and
  ramps, and what lets him stand on the bridge *and* walk under it.
  The heightmap (`hmAt`, 1 m cells, bilinear) survives only as the fallback for park
  furniture and anything the collider has no triangle for. **Never max the two together** —
  combining an exact surface with a smeared one just puts the smear back.
  Buildings, trees, fences, props and cars are still axis-aligned boxes; a box top within
  `step` of the feet is a floor, which is how roofs work.
- **A CAR IS A CUSHION, NOT A WALL. `carHit` works along the CONTACT NORMAL.** The face is
  whichever of the two axes he is least deep into — nose or flank — and everything is
  expressed along the normal out of it: the closing speed that picks the tier, the
  restitution that sends him off it, and the direction of a launch. Only the normal
  component of his velocity is ever touched, so what he had ALONG a flank he keeps, and he
  comes off a car carrying his line instead of stopping against a box.
  Three things this must not lose:
  1. **The score is not either speed on its own.** `w` is the face's own speed along the
     normal, `-u` is his into it, and being hit is not the same event as running into
     something: `HIT.mine` (.45) is how much of his own approach counts. A car overtaking
     him in the next lane closes at nothing; skating hard into a parked flank ricochets and
     **keeps the board**; only a fast car, or a head-on, launches him.
  2. **`p.preVx/preVz`, set in `groundUnder`.** `resolveBoxes` deletes the into-surface
     component on the very frame of contact, and `carHit` runs after it in `stepTraffic` —
     so the approach speed the bounce needs is already gone by then. Every ricochet came out
     as a dead stop until this was stashed.
  3. **`u' - w = -e(u - w)` is a point mass off an infinitely heavy wall**, so a car doing
     11 hands him 2x its own speed. `HIT.push` caps it, and a ricochet may only ever ADD —
     if he is already leaving faster than the cushion would send him, it says nothing.
  The old box test ran from 1.2 m behind the car's CENTRE to 1.1 m past its nose, on the
  mistaken reading that `along` was measured from the tail. `hl`/`hw` are half extents about
  the centre: the back half of every car was intangible.
- **The skate push cycle is a function of speed and the CLIP IS TIME-SCALED TO MATCH.** A
  skater leaving a dead stop takes three or four quick hard pushes; one fixed 1.55 s cycle
  put the second shove a second and a half after the first, so the first 10 m/s took five
  seconds. `pushFast`/`pushEase` stretch the period from .60 s to `pushDur`, and `colinAnim`
  scales the push clip by `clipLen / pushPeriod` so the foot still meets the road on the
  frame the shove fires. That coupling is the point — do not just raise `pushV`.
- **Never scrub velocity with a bare `*= k` per frame.** `resolveBoxes` already removes only
  the component going INTO a surface, so a slide along a car keeps its speed by itself. The
  extra `vel *= .7` on top of it was an exponential with a tenth-of-a-second half life,
  which made the lightest touch of a wing a dead stop — and worse at a higher frame rate.
  `Math.exp(-k * dt)`, always.
- **Forward is `(sin h, cos h)`**, right is `(-fz, fx)`. Colin faces +Z in his file.
- **A walkable mesh contributes only its deck.** `bridge_a` is one mesh with a deck at
  7 m and towers at 17/28/36/45; rasterising the max made the tower tops the ground.
  Every walkable mesh is capped at `miny + DECK` (12 m) for that reason.
- **`colin.glb`'s `teeth` primitive has NO material index.** three hands it
  `createDefaultMaterial()` — untextured pure white — and it reaches a millimetre further
  forward than his face, so it punches through his lips. `buildColin` reassigns any
  material without a `map` to the head's. **Find the head material by MESH name, never by
  material name**: the c9 re-export renamed every material to `Material.00N` and a
  name-keyed lookup failed silently, putting the white teeth straight back.
- **`TRIM` trims clips in code** for frames the owner has already cut locally but not
  re-exported. A tail shortens `clip.duration`; a head sets `TRIM_IN[name]`, the second the
  action starts at. **Delete an entry the moment an export lands with the cut baked in**, or
  it is taken twice. Clips are 30 fps — measured, not assumed: every one has exactly
  `duration × 30` keyframes.
- **Animation is weights, not crossfades.** `colinAnim` asks for a set of clip weights each
  frame and `colinSet` damps toward it. A `crossFadeFrom` state machine has to know what it
  is coming *from*, which breaks the first time two transitions overlap. Clips in `ONCE`
  play once and hold their last frame, and rewind when their weight leaves zero.
- **NEVER ASK `action.isRunning()` WHETHER A CLIP STILL MATTERS — ASK ITS WEIGHT.** three
  ends a `LoopOnce` clip with `clampWhenFinished ? this.paused = true : this.enabled = false`,
  and `isRunning()` returns `enabled && !paused && ...`. So every clip in `ONCE` is *not
  running* from the instant it finishes. `colinSet` shut clips down inside
  `else if (a.isRunning())`, which meant a clip that reached its last frame before its state
  ended never got `setEffectiveWeight(0)` and never got stopped: it kept the 1.0 it was last
  given and went on applying its final frame **for the rest of the session**. `fall_to_back`
  is the one that showed — a lying-down pose blended at full weight into the walk, body
  tilted back, "stuck sideways" — but the roll, the ollie and both jump clips all had it.
- **Measure Colin with GEOMETRY bounds, never `Box3.setFromObject`.** A skinned mesh ignores
  its node transform, but `setFromObject` applies it anyway — his armature is scaled 0.01
  and turned a quarter turn, so the box came back a hundredth of his size and on its side.
  That was the feet-through-the-floor bug.
- **Right stick is yaw only** and `CAM.el` is a constant. Up/down on that pad is reserved
  for verbs, and nothing may be bound to it without asking.
- **Locomotion is Plutopia's model. Read `plutopia/index.html` (`const MOVE`, and the
  integration in `stepPlayer`) before touching it — do not rebuild it, and do not look at
  Peggy, which is the least developed of these games.** Robits is the other good one.
  Three separate ideas, and the moonwalk came from missing the third:
  1. The gather lives in `push` — how much of his acceleration he *has*, climbing from
     `push0` over `pushT` — with `accFall` thinning it again near top speed. Not in the
     target speed, and not in a momentum term.
  2. `heading` is the thumb, taken instantly. `faceH` is the body, coming round at
     `face0` on the spot and `face1` at a run. Colin is drawn at `faceH`.
  3. **`plantAt`/`plantFull`**: at a walk the legs push where the thumb says, at a run
     they push along `faceH`. Without this the velocity keeps answering the stick while
     the body has already turned, which *is* the moonwalk. `turnBrake` costs him speed
     through a hard turn, which is what plants the feet rather than just pointing them.
  Steering is rate-limited (`turn`) separately from acceleration.
- The gait blends three clips by measured speed (`GAIT`) — never add a run *flag*.
- **The camera leads where he is GOING, not where he is heading.** Plutopia's own notes
  record a "sliding" complaint there that was the camera's lead aiming at his heading,
  not the locomotion. Suspect the camera before re-tuning movement.
- **`Colin_Head_MIX` rides at weight 1.** It is the blend shape that turns the generic
  base head into his; the other 41 targets are visemes and stay at zero.
- **Downsampling needs more than one tap.** The bloom bright pass writes a buffer a third
  the width of its source; one bilinear tap at that ratio is nearly a point sample. It
  boxes five taps now, and the blur runs twice.
- **THE WHITE BALLS: THE TOON RAMP MUST NEVER FEED THE SPECULAR. Fourteen builds. Read it.**
  three's `V_GGX_SmithCorrelated` ends `0.5 / max( gv + gl, EPSILON )`, and both terms
  carry a factor of `dotNV`/`dotNL`. On a silhouette both go to zero, the denominator
  collapses onto `EPSILON` (1e-6) and V returns ~500000. Stock three is fine because the
  same `dotNL` multiplies the irradiance in front of it and cancels it exactly.
  `toonPatch` substituted the ramp into the ONE `dotNL` that feeds **both** lobes, and the
  ramp has `floor: .34` — so where the true dotNL was 0 the irradiance was still a third
  of full sun while V had already exploded. That product is the red one-pixel contour on
  his outline; the bloom turns each into a ball. The patch now adds `irradianceToon`
  alongside `irradiance` and uses it for the **diffuse line only**. There is also a hard
  `min(..., 4.0)` ceiling on both specular accumulators.
  It hits Colin and not the city because a dense curved mesh is nearly all silhouette at
  its edges; flat-shaded low-poly blocks have almost no grazing pixels. Plutopia never saw
  it for the same reason.
  **Wrong answers given first, so nobody repeats them:** the bloom (it only amplifies),
  the FXAA, the rim, the depth outline (a multiply toward dark — it can only darken), the
  white teeth, and a NaN from a cancelled skinned normal. All were argued from theory.
- **MEASURE THE BUFFER, DO NOT REASON ABOUT IT.** `/nan map` (badge mode 9) false-colours
  `rtScene` before any post: magenta = non-finite, red = luminance > 8, orange = > 2,
  grey = the real value. One screenshot of it ended fourteen builds of argument — the
  contour came back **red**, which said finite-and-enormous and killed every NaN theory at
  once. Reach for it first. `/no shadow` (8) and the census in the chip (points, sprites,
  lines, bone children, skinned meshes) answer the other two standing questions on device.
- **Make each toggle move ONE variable.** Two rounds were wasted because "no post" also
  forced the rim and outline off and changed the render resolution, so a clean frame there
  proved nothing.
- **FXAA is a display-space algorithm and `rtScene` is linear HDR.** Not the cause of the
  balls, but a real fault found on the way: the thresholds assume [0,1], so against a sky
  at 4.0 every edge read as infinite contrast. Taps are squashed through `x/(1+x)` before
  the comparison, the reach is four texels not eight, and the result is clamped per channel
  to the neighbourhood sampled.
- **`COLINM`** holds his material intent: roughness .95, metalness 0, and the base map fed
  back as a .30 emission (his Blender look). Emission lands after the toon ramp and after
  shadows, so it lifts his dark side without making him shiny.
- **Tap the build badge to cycle the render**, one variable each: 1 rim off, 2 outline off,
  3 fxaa off, 4 bloom off, 5 full res (no upscale), 6 no post, 7 flat Colin.
- **`tools/probe.mjs` rebuilds the heightmap offline** and prints profiles and pinholes.
  The bridge deck is continuous at ~6.3 over its whole span — it has been checked, so a
  fall-through there is not the heightmap. The deck is only ~21 m wide with water either
  side, and cars on it are solid boxes that can shove you off.
- **Colin's rig has been read and is clean**: `tools/skin.mjs` (no vertex >30 cm from its
  bone), normals all unit length, UVs in range, weights summing to 1. Do not re-theorise
  about torn geometry.
- Tunables live in `MOVE`, `SK8`, `CAM`, `TOON`, `LIGHT`, `POST` at the top; all exposed on
  `window.city` for the console.
