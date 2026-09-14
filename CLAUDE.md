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
  of the bridge and elevated roads — this is how the deck/tower bug was found),
  `cols.mjs` (`npm run cols`) — runs the column splitter offline over `city.glb` and prints
  how many solid boxes come out, how long the rasterise takes, and how many of them float
  above head height. That last number is the one that says whether you can walk under a
  gantry; it went 0 → 658 across 107 meshes when the splitter landed.
- `images/HDRI_02_galaxy_2K.jpg`, `models/fluffy_cloud*.glb` — from Plutopia. **The galaxy
  is the one he wants, not `HDRI_01` (the daylight sky beside it), and it has to be SEEN.**
  The panorama does two jobs: prefiltered by `PMREMGenerator` it is `scene.environment` (the
  sky reflection on the cars), and flat it is the backdrop the dome blends in at `SKY.envK`,
  which rides at .55 and is pushed to the shader every frame so the console can move it.
  Colin is opted out with `envMapIntensity = 0`. The cloud deck (`CLOUDS`, `stepClouds`) is
  Plutopia's: a LOCAL field kept near the player and recycled upwind, not a world-wide one.
  `SKY.wind` drives both the models and the dome's noise layer, so they always agree.
- `audio/` — sixteen effects and two songs, all borrowed from Plutopia/Robits: six swooshes
  (jumps, body flips, board tricks), four metal clangs (the three car tiers, told apart by
  weight and pitch rather than by three files), two bamboo (the deck landing), two box breaks
  (a bail), `plutopia_song_03/04` (the two trade rather than loop). **The cars, the horns and
  the rolling wheels are HIS to record.** The roll is a synth stand-in — brown noise through a
  bandpass whose gain and centre follow his speed (`WHEELS`) — and it is marked as one.
- `icons/` — `npm run icons [src]` (`tools/icons.mjs`, needs `sharp`) turns one square
  artwork into 1024/512/192 and the 180 px `apple-touch-icon`. It does two things a plain
  resize does not, and both matter: it **crops the margin** (generated app-icon art arrives
  with the rounded corners already drawn and white space outside them, and iOS masks the icon
  itself — ship that and you get a rounded icon inset in a white square with a second rounded
  shape inside it), and it **flattens** onto the artwork's own corner colour, because iOS
  composites a transparent PNG onto black rather than onto the home screen.
  **Every icon URL carries `?v=`.** A phone that has seen `icons/apple-touch-icon.png` keeps
  what it has for ever and a home-screen shortcut keeps it harder still, so replacing the file
  in place changes nothing anyone can see. Raise the number with the art — and even then iOS
  only re-reads it when the shortcut is removed and re-added.
- `version.json` — written by `bump.mjs`; the running game polls it to detect its successor.
- `.github/workflows/pages.yml` — deploys the repo root. Harmless if Pages is set to
  "deploy from a branch" instead; both paths deploy the same commit.

## Landmines

- **NOTHING IN THIS GAME CUTS. EVERY CLIP CHANGE IS A BLEND.** `colinSet` used to hard-SET
  the weights on a hit stage change, on the argument that an impact is not something to ease
  into. That argument only ever applied to landing, and it made the mid-air pinball flip a
  jump cut from `flying_backwards` to `flying_forwards`. A stage change is a fast blend
  (`HIT.snapHL`, .038) — never an instant set.
- **`images/HDRI_02_galaxy_2K.jpg` IS THE SKY.** Not a tint on a gradient, not the
  environment map only — `SKY.envK` is 1 and at 1 the panorama replaces the dome's colour
  entirely above the horizon. Three rounds were lost to shipping it at .55 and .62 mixed
  into a blue gradient and reporting that as "put in"; from the phone that is
  indistinguishable from never having added it, and he said so three times.
  **`SKY.envB` (6) is the part that is easy to miss.** The image is a night galaxy: sRGB →
  linear puts its mean near .03 against a gradient sky sitting near .8, so at exposure 1 it
  renders near-black and looks like nothing happened. At 6 the mean lands near .19 and the
  stars reach 6, which is over the bloom threshold, so they flare.
  The sampling is honest equirect by true elevation — measured, not assumed: the image's
  brightest band is 5–23° above the horizon, which is exactly the window this camera sees
  (`scratchpad` decode with `jpeg-js`, 20 bands of mean luminance). An earlier build
  remapped the elevation to compensate for a problem that did not exist.
  The procedural noise cloud layer fades out as `envK` comes up — two skies stacked is
  neither — but the cloud MODELS are geometry and still drift across it.
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
- **SOUND IS `SFX`, PORTED FROM PLUTOPIA, AND TWO OF ITS IDEAS ARE LOAD-BEARING.**
  1. **Two-stage load.** A browser will not build an `AudioContext` outside a gesture but it
     will happily fetch, so the bytes come down at page load and decode on the first touch.
     The first ollie then HAS a sound instead of being the thing that starts the download.
     The music is fetched in `init()` instead — 4.5 MB has no business on the boot path.
  2. **Edge trimming (`SFX.edge`).** An exported effect is usually a short noise sitting
     inside a long file: silence, the event, a tail of nothing. Played from zero that is a
     sound with a delay bolted to the front, and nothing on the trigger side can fix it.
  Plus: `?v=SFXV` / `?v=MUSICV` on every URL, **not the build number** — stamping every push
  on eighteen files re-downloads all of them against the same connection the GLBs are on.
  Bump them by hand when a file is replaced in place. `play()` returns TRUE when it refuses a
  sound (voice cap or per-key gap), because a caller reading false plays the synth fallback
  and would put the pile-up back as beeps.
  `navigator.audioSession.type = 'playback'` is what makes a phone with the ring switch on
  audible at all — which is also why there is a mute key in the HUD.
- **Names are sanitised by GLTFLoader**: `road_a_02.001` arrives as `road_a_02001`,
  `travel agency` as `travel_agency`. Every category test in `buildCity` is a prefix regex.
- **Cars**: local −Z is up, local Y is the length; `CAR_FWD` says which end is the nose.
  Mirrored placements (scale −1) get their heading from `matrixWorld`, not the quaternion.
- **FOLLOWING AND CROSSING ARE TWO DIFFERENT PROBLEMS AND ONLY ONE WAS SOLVED.** Following is
  longitudinal — a car in my lane going my way, match its speed at a gap. Crossing is not: at
  a junction the other car is at ninety degrees and its heading says nothing about whether we
  are going to meet, so the old test ("is he pointing roughly the way I am?") threw away every
  crossing car. That is why they drove through each other — they were never looking. It
  PREDICTS now: constant velocity, closest approach, conflict if the two would come inside a
  car's width within `TRAF.look`.
  **Priority is GIVE WAY TO THE RIGHT**, which settles a pair without either car knowing what
  the other decided — two that both yield is a deadlock and two that both go is a crash. The
  rule is anti-symmetric on a real crossing (verified numerically, not argued: exactly one of
  each pair yields). `TRAF.stuck` is the escape hatch — a car sat still that long takes
  priority whatever give-way says, so a four-way standoff creeps out of itself.
  A second pass pushes overlapping cars apart, because the rule above is a driver and drivers
  get it wrong; each pair is seen from both sides so each pushes half.
  Cars have **their own grid cell (`CARCELL` 16)**, not the solids' 8: four hundred cars each
  asking their neighbours twice a frame is the one place in this file where the bucket size
  shows up in the frame time.
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
- **A MESH IS NOT A BOX, AND THAT IS WHY YOU COULD NOT WALK UNDER A SIGN.** Every solid mesh
  used to contribute its bounding box and nothing else. A gantry, a traffic light, an
  overhanging shopfront: all of them are a thin post plus something out in the air, and their
  bounding box is a SLAB from the pavement to the top of the overhang across its whole reach.
  `solidAdd` rasterises each solid mesh into COLUMNS instead — an XZ grid whose cells hold the
  lowest and highest triangle over them — then:
  - a mesh whose columns nearly all span its full height IS its bounding box (that is what a
    building is) and **collapses back to one**, which is most of them and costs nothing;
  - anything else is emitted as runs of columns merged along X, so the post stays solid to the
    ground, the arm is solid only where the arm is, and the air under it is air.
  Measured with `npm run cols`: 844 meshes → 14.6k boxes, ~350 ms of rasterise, 658 of them
  with their bottom above 2.2 m. The cell size GROWS to fit `COLS.max` rather than the mesh
  being skipped, so a stadium gets coarse columns and a bollard fine ones.
  **The tree hack stays and must stay**: a canopy rasterised honestly is a solid ceiling at
  head height, and a trunk box is the right abstraction for a tree. The equivalent street-sign
  hack is gone — it threw the sign away and put a 70 cm post wherever the mesh origin happened
  to be.
- **CARS ARE ORIENTED BOXES (`b.yaw`), NOT THE AABB OF A ROTATED ONE.** The axis-aligned
  bounds of a car at 45° are forty per cent bigger than the car along BOTH axes — that is the
  phantom hit, where the box touches you and the mesh plainly does not. `resolveBoxes` tests
  any box carrying a `yaw` in its own frame, and its roof is a floor on its real footprint,
  which is what makes standing on one possible. The AABB is still there as the broad phase.
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
- **THE CONTROL MAP. Read this before touching either pad.**
  - **Left pad — steering and the BODY.** Hold it to steer (ground) or spin (air). Flick up
    = front flip, flick down = back flip. Left/right are never flicks: you hold them.
  - **Right pad — the camera on the ground, the BOARD in the air.** Tap = ollie. Drag =
    camera yaw, **ground only**. Flick up = kickflip, down = 360 flip (a kickflip and a
    shove at once, which is what a varial is), left/right = the two pop shove-its.
  - **A FLICK IS A FAST MOVE, NOT A RELEASE.** It used to be judged on `pointerup`, which
    cannot work for the left pad: that thumb is already down and holding a direction when
    the trick is wanted, so `held` was always past the window and the gesture could never
    have fired. It is measured on the pad's own travel — more than `FLICK.at` of its radius
    covered inside `FLICK.within` — so it fires mid-hold, and a slow drag still never
    reaches it. The history is seeded at the CENTRE on pointerdown, because on an absolute
    pad a thumb slammed onto the top edge is a flick and a delta from where it landed says
    the stick never moved.
- **IN THE AIR THE STICK IS A RATE, NOT A TARGET.** `steer` is the angle between the thumb
  and his nose, which is exactly right on the ground: he comes round until he is pointing
  where you asked and then stops, because the wheels have arrived. Held over in the air the
  same number is a 45° turn and then nothing, when what was asked for was to keep spinning.
  The air branch reads the pad's OWN X axis and turns at that rate for as long as it is held,
  which never runs out. Do not "fix" this back into `steer`. **The sign is negated** — heading
  grows from +Z toward +X, so a thumb pushed right spun him left. That was checked on the
  device rather than derived; the handedness argument comes out backwards half the time.
- **AIR YAW BEATS GROUND YAW, AND THE CAMERA LETS GO.** `SK8.spin` is 9.5 rad/s — a 360 in
  .66 s against 5.0 s at ground cruising rate — because in the air nothing is holding him.
  And `stepCam` forces `cam.idle = 0` while he is airborne on the board, so the auto-follow
  never fires: the follow is what makes riding pleasant on the ground and exactly what makes
  a spin unreadable in the air, since the lens comes round with him and nothing appears to
  have happened except that you are dizzy. `CAM.idle` then delays its return on landing.
- **EVERY AIR ROTATION IS APPLIED AFTER THE VELOCITY IS REBUILT ON THE HEADING.** This is
  the one that will be broken by accident. `stepSkate` turns the heading and then puts the
  velocity back on it, which is right on the ground where the wheels are what steers — do it
  that way in the air and his TRAJECTORY comes round with him. A spin turns the board under
  a line that keeps going, which is also the only thing that makes landing switch mean
  anything. `if (p.grounded) p.heading += turn;` up top, the air version below the rebuild.
  The switch reversal (`along < -.5`) is likewise ground-only: in the air he is just turning.
- **Board tricks are pure geometry, no clip.** The deck runs along its local Z, so with Euler
  `YXZ`: `rotation.z` is the kickflip axis, `rotation.y` is the shove, `rotation.x` is the
  body flip carrying the board round. `bRoll`/`bYaw` are radians REMAINING, `bRollA`/`bYawA`
  what has been applied. **Wrap the applied pair on landing** or a landed 360 visibly settles
  back through a whole turn on the road. Colin holds the ordinary air pose through all of it.
- **The trick fills the jump; the clip is stretched to fit the air he has left.** An ollie is
  1.26 s of air, `back_flip` is 1.77 s of clip and `front_flip` is 0.80 — at 1x the backflip
  could never once have been landed and the frontflip would finish a third of the way up.
  `trickDur` comes from the ballistics at the moment of the flick and the clip is scaled to
  it. Landing under `TRICK.land` of the way round, or with more than ~.9 rad of board
  rotation left, scrubs speed.
- **`SK8.bailAng` already forgives a 180**: it folds the angle with `min(off, PI - off)`, so
  landing switch costs nothing. Do not "fix" that.
- **FAKIE IS A DIRECTION OF TRAVEL, NOT A MISTAKE.** The ground controls used to be written
  entirely against the NOSE — push only when the stick pointed along it, brake when the stick
  opposed it, no steering at all past .72π. Land a 180 and every one of those is backwards:
  the stick pointing where you are already rolling reads as a brake, the stick you would steer
  with does nothing, and the board is welded facing the camera while you shove at the air.
  The stick picks an END instead, and everything downstream works the same for either:
  - `dir` — which end of the board the thumb is nearer to (+1 nose, −1 tail);
  - `rel` — its angle off THAT end, which is what steering always actually wanted.
  A push along the tail is a fakie push and accelerates him. **A brake is the stick against
  his TRAVEL, never against his nose**, and it stops being a brake below `SK8.fakieAt` so the
  same held stick turns into a push the other way — which is what dragging a foot to a stop
  and then shoving off the other way is, done with one input.
  **The `along < -.5` steering reversal had to GO with it.** It existed only to undo measuring
  against the nose while travelling backwards; `rel` is already measured off the leading end,
  so keeping both would have flipped it twice. Verified as a table before shipping, not argued.
  No fakie clips exist yet — he rides and pushes on the forward ones, which reads correctly
  for the stance and wrong for the push foot. `skate_push_fakie` is the clip to add.
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
