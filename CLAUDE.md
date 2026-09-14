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
  `sky.mjs` (`npm run sky [image]`) — the exposure a panorama wants, measured over the visible
  band rather than guessed. `normals.mjs` (`npm run normals`) — up-facing vs down-facing vs
  normals-disagreeing per walkable mesh; this is what found the mirrored bridge ramp.
  `spots.mjs` (`npm run spots [m]`) — rebuilds the ground offline and lists the flat, open,
  unbuilt squares of that size, nearest the spawn first. **Placing anything by eye off a
  screenshot is how you get a half pipe inside a bank.** `rails.mjs` (`npm run rails`) — runs
  the game's own rail clustering over a ramp file and prints what falls out, so "how many
  grind rails are there and how long" is answered before a mechanic is built on it.
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
  **NEVER PUT A QUERY STRING ON AN `apple-touch-icon` HREF. iOS DROPS THE LINK ENTIRELY.**
  A phone that has seen `icons/apple-touch-icon.png` keeps what it has for ever and a
  home-screen shortcut keeps it harder still, so the file has to arrive under a new URL — but
  `?v=3`, the obvious way to do that, is the one way that cannot work here: the cache-buster
  meant to make the new icon appear is what made NO icon appear, and the home screen fell back
  to a screenshot of the page. **The version goes in the FILENAME** (`apple-touch-icon-v3.png`,
  `icon-192-v3.png`), which is a new URL with no query. `V` at the top of `tools/icons.mjs`;
  raise it with the art, re-run, and repoint `index.html` and the manifest.
  Even then iOS only re-reads it when the shortcut is removed and re-added — and the page
  itself is cached for ten minutes, so hard-reload before adding it or the phone re-reads the
  OLD head.
- `models/ramps/skate_ramps_fun_boxes.glb` — four ramps in one file, two materials:
  `ramp_color` and `metal`. **`metal` is only ever a grind rail or coping**, which is what the
  rail extractor keys on. Split by node name, re-centred on their own footprints, and placed
  by `PARK.spots` at coordinates `npm run spots` found. Their triangles go into the SAME
  triangle collider as the roads, so a ramp is a surface he rolls up rather than a box he
  stops against, and `stepSkate`'s slope term does the rest with no new code.
  Their materials come with them and are toon shaded for free —
  `MeshStandardMaterial.prototype.onBeforeCompile` is the patch, so anything loaded anywhere
  gets it without being told.
- `models/skateboard.glb` — his own deck, 3k tris, two materials (`skateboard` textured,
  `grip`). It arrives **5.5 cm long**, so `buildBoard` scales it, and BOTH numbers are measured
  off the geometry rather than typed: the scale from the long horizontal axis, and the deck
  height from the **area-weighted centre of everything facing up**, which on a skateboard is
  the flat of the grip. The bounding-box top is the KICKTAILS — standing him on those puts him
  three centimetres in the air. Measured: ×14.55 to 0.80 m, deck at 0.100 m above the wheels
  (the procedural stand-in assumed .11). A re-export at any size lands right with no edit.
  The Group is the same object as the procedural board, so nothing that positions, yaws, leans,
  kickflips or shove-its it changes — and the procedural one stays as the fallback if the load
  fails. The chip reports `deck0.10`, or `deck0.11(proc)` if it is still the stand-in.
- `version.json` — written by `bump.mjs`; the running game polls it to detect its successor.
- `.github/workflows/pages.yml` — deploys the repo root. Harmless if Pages is set to
  "deploy from a branch" instead; both paths deploy the same commit.

## Landmines

- **NOTHING IN THIS GAME CUTS. EVERY CLIP CHANGE IS A BLEND.** `colinSet` used to hard-SET
  the weights on a hit stage change, on the argument that an impact is not something to ease
  into. That argument only ever applied to landing, and it made the mid-air pinball flip a
  jump cut from `flying_backwards` to `flying_forwards`. A stage change is a fast blend
  (`HIT.snapHL`, .038) — never an instant set.
- **THE SKY IS `images/hdr_toon_03.png` (his own painted one).** `ENV.galaxy` and `ENV.day`
  still hold the two Plutopia panoramas to flip back to.
  **`SKY.envB` BELONGS TO THE IMAGE, NOT TO THE GAME, AND IT IS A MEASUREMENT.** `npm run sky
  [image]` measures the mean linear luminance over the only band this camera can see — the
  horizon to .284 rad, about 16°, and nothing else — and prints the exposure for a target.
  Two skies four stops apart both look fine in a viewer and only one looks like a sky in here:
      HDRI_02_galaxy   mean .031 linear  ->  envB 6 to reach .19 and read as a starfield
      hdr_toon_03      mean .380 linear  ->  TWELVE TIMES brighter, envB 1.9 to reach .72
  **Re-measure after every swap** — he repaints and re-uploads under the same name, and the
  exposure belongs to the image.
  At the galaxy's 6 the painted sky renders at a mean of 2.15, over `POST.bloomTh` across the
  WHOLE sky — a white smear, not a picture. **Re-measure on every new sky.**
  **`t.colorSpace` must be set BEFORE `PMREMGenerator.fromEquirectangular`, not after.**
  The prefilter reads the texture as it finds it and `TextureLoader` hands one back tagged
  linear, so every sRGB value went into the environment map undecoded. Invisible on a dark
  galaxy; on a bright sky it is a white reflection on every car instead of a sky one.
- **(the galaxy's own notes, kept because the mechanism is the same):**
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
- **ASSET URLS CARRY A CONTENT HASH, WRITTEN BY `npm run bump`. HE REPLACES FILES IN PLACE.**
  He repaints a sky, re-exports `colin.glb`, re-cuts a sound — same folder, same filename, new
  contents — and a phone that already has that URL keeps what it has for ever. Nothing is
  baked, the file really did change, the browser simply never asked again. From where he sits
  that is indistinguishable from the game ignoring him, and it has cost several rounds.
  Hand-bumped constants (`SFXV`, `MUSICV`, `IMGV`) worked only when somebody remembered, and
  **"somebody remembered" is not a mechanism.** Stamping `BUILD` on everything works too and
  re-downloads fifteen megabytes on every push.
  So `bump.mjs` writes the sha1 of each file's CONTENTS into the `ASSETS` block in
  `index.html`, and **every runtime asset URL goes through `A(path)`**. A file that changed
  gets a new URL and arrives; a file that did not keeps its URL and stays cached. The bump
  prints which ones moved, because "I replaced it and nothing happened" is the bug it prevents.
  **`icons/` is deliberately NOT in it** — iOS drops an `apple-touch-icon` link whose href
  carries a query string, so those version their FILENAME instead.
  Add a new asset folder to `DIRS` in `bump.mjs` and load it through `A()`, or it will go
  stale silently.
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
- **MIRRORING IS NOT A CAR PROBLEM, IT IS A WHOLE-CITY PROBLEM. 174 WALKABLE MESHES ARE
  PLACED WITH A NEGATIVE DETERMINANT** — parking lots, roads, and the ramp up onto the bridge.
  A mirrored placement reverses the winding, so the DECK faces down, and `triAdd` throws a
  downward face away as "not a floor": the collider was handed the underside and the deck was
  never in it. `rasterMesh` swaps two indices when `matrixWorld.determinant() < 0`.
  Found by counting, not looking: `npm run normals` reports up-facing vs down-facing per mesh,
  and `road_c_02_003` came back 233 up / 367 down while its unmirrored siblings `_002` and
  `_004` came back 367 / 233 — the same numbers, swapped.
  **DO NOT NEGATE THE NORMALS IN `normGeo`. c52 DID AND IT PAINTED 174 MESHES BLACK.**
  The winding reversal there and `applyMatrix4`'s normal matrix already agree: a pure
  reflection's inverse-transpose is itself, so the stored normal survives the mirror pointing
  the same way the re-wound face does. Negating on top points the shading normal INTO the
  ground. **What made that mistake pass was a measurement that did not test the code** —
  `normals.mjs` compares the RAW file's winding against the transformed normal, which of
  course disagrees, because it never models `normGeo`'s own reversal. Verified properly the
  second time by running the mirror, the reversal and the normal matrix on one triangle and
  taking the dot: **+1, they agree.** A tool that measures the asset is not a tool that
  measures the pipeline.
- **`landscape` IS WALKABLE AND MUST STAY WALKABLE** — those shells are the hillsides and he
  runs up them. c52 excluded them because `landscape_005` reads 3 up-facing triangles against
  436 down, which looked like a broken mesh. It is not: it is MIRRORED (determinant −1124), and
  `rasterMesh`'s determinant flip two lines further down already puts it the right way up. The
  exclusion took the hills away for a problem that was already solved.
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
  **Two things had to be right before this actually worked, and both were wrong until c52:**
  1. **A triangle's bounding box is not its shape.** A beam quad is two big triangles, and one
     running from the base of a post to the far end of an arm has a box covering the whole
     span — so every cell under the arm was told the metal reaches the ground. The box still
     picks the CELLS; the height over each comes from the triangle's PLANE, clamped back
     inside the triangle's own range. A vertical face has no useful plane in y and keeps its
     full span, which is correct.
  2. **A cell must AGREE with the run it joins, not merely fail to enlarge it.** The merge
     asked whether adding a cell grew the run's span — and swallowing a short arm cell
     (3.5..6.2) into a full-height post run (0..6.2) grows it by nothing, so the first arm
     cell beside the post joined the post, the next joined that, and the whole arm came out as
     one box reaching the ground. That is why c44 split the gantries and you still walked into
     them. The test is `|cell.lo − run.lo| < tol && |cell.hi − run.hi| < tol`.
  Measured with `npm run cols` (and `node tools/cols.mjs <regex>` for one mesh in detail):
  844 meshes → 30k boxes, ~650 ms of rasterise, **1255 of them with their bottom above 2.2 m,
  across 172 meshes** — against 658 across 107 before the two fixes. The cell size GROWS to fit `COLS.max` rather than the mesh
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
- **A PUSH IS A STROKE, NOT A STEP.** Each shove used to land its whole delta-v on ONE FRAME,
  so the speedometer read 9, 9, 9, 13, 13, 13 — a staircase, which is not what a foot hitting
  the road does. The same total is spread over `SK8.shoveDur` on a half sine, strongest
  mid-stroke: the integral of `(π/2)·sin(πu)` over one cycle is exactly 1, so the top speed,
  the taper and everything else tuned around the impulse are untouched. Measured: biggest
  one-frame jump **5.39 m/s → 0.35 m/s**, top speed 23.6 → 24.1. The sawtooth between pushes
  is meant to be there — pushes ARE discrete events. It was the instant jump that read wrong.
- **PINBALL OFF A WALL (`SK8.bounce`).** `resolveBoxes` only ever removed the component going
  INTO a surface, which is right for a slide and completely wrong for meeting a building
  square: all of his speed was normal to it, all of it was deleted, and he stopped dead. It
  takes a restitution now and sends that component back out — the same cushion a car already
  got through `carHit`, finally applied to static geometry. **The tangential component is
  never touched either way**, so a shallow graze along a shopfront costs nothing and a square
  hit comes off it at half speed. `SK8.scuff` came down to 1.2 to stop the two fighting.
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
  body flip carrying the board round. **THE LENGTH MUST BE ON Z AND THAT IS NOT NEGOTIABLE** —
  a board whose long axis came in on X would kickflip end over end. `buildBoard` gives one a
  quarter turn if it arrives that way, which is a line there rather than a rewrite here. `bRoll`/`bYaw` are radians REMAINING, `bRollA`/`bYawA`
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
  **HE DOES NOT PUSH BACKWARDS, THOUGH.** A fakie push with no fakie clip is a man shoving at
  the road behind him, which reads as nonsense. Asking the board to lead with its tail starts
  a HALF CAB instead (`SK8.turnDur`, on `turn_left`/`turn_right`): the heading comes round 180°
  and he rides away forwards. **The heading turns and the VELOCITY does not** — same rule as
  the air spin, applied below the rebuild — so he keeps his line through it.
  Delete that branch the day switch clips land; riding fakie is a real thing to be able to do,
  and `skate_push_fakie` is the clip that makes it honest.
  **The deck LAGS him through it** (`SK8.turnLag`), because what he pictured was the feet
  shuffling round on top of a board that stays put. That cannot be literally true if he is to
  ride away the other way, but most of the read is in the order: he turns, the deck follows.
- **A RAIL IS THE TOP EDGE OF THE METAL, FOUND NOT AUTHORED.** `railsFrom` takes every vertex
  within `GRIND.lip` of the top of a `metal` primitive, clusters them by XZ proximity (a rail
  broken up by its own uprights is still one rail), and fits each run with a line by PCA on
  the 2×2 XZ covariance — exact for a straight rail, the chord for a curve. Verified with
  `npm run rails` before any of the mechanic was written: **1 rail per ramp, 4–6 m, at
  2.4–2.8 m** — no junk and no over-segmentation. If a future ramp file gives twenty rails per
  ramp, `lip` and `link` are the two numbers to move.
- **GRINDING IS DELIBERATE, NOT AUTOMATIC.** A tap on the right pad *in the air* over a rail
  catches it; the same tap on the ground still ollies, so there is no new control. Riding past
  a rail must never snag him. On it he is locked to the line, loses `GRIND.drag` per second,
  and leaves when he runs out of rail, runs out of speed, or taps off — and a tap off is an
  ollie out, which is the one part that has to feel deliberate. No balance meter yet, and no
  grind clip: `skate_idol_crouch` stands in because it is the only board pose with his knees
  bent and it reads far better on a rail than the ollie hang.
- **THERE IS NO JUMP WIND-UP CLIP IN THE AIR, AND THERE MUST NOT BE.** `run_jump_init` and
  `idle_jump_init` used to play for the first .19 s of a jump. They are CROUCHES, and a crouch
  belongs before he leaves the ground, not after — played in the air it is two poses that do
  not follow one another, landed on top of a run already at full stride. Straight from the gait
  into `jump_going_up` reads better than either half did. `GAIT.windUp` is the hook for when
  there IS a crouch clip: name one and `colinAnim` blends it in on the GROUND, weighted by how
  loaded `p.charge` is, which is where those two clips were always trying to be.
- **HOLD THE RIGHT PAD ON FOOT AND HE WINDS UP.** The same thumb that taps to jump: held it is
  a sprint AND a charge, and letting go is a jump scaled by how long it was held. One input
  doing two things that belong together — you run at something and leap it. The forward part of
  the launch goes along his TRAVEL, not his facing, so a wind-up on the spot just goes up.
      charge   0%   top 9.0 m/s   jump 2.81 m high, 1.06 s,  9.5 m far
      charge  50%   top 11.5      jump 4.11 m       1.28 s, 17.9 m
      charge 100%   top 14.0      jump 5.66 m       1.51 s, 28.5 m
  On the board that thumb is still the ollie, so the wind-up is on foot only.
- **THE MAP (`MAP`, `buildMap`, `drawMap`) IS A SCHEMATIC, NOT A RADAR.** The whole city at
  once, north up, because the question it answers is "where is the park from here" and he
  could not find the ramps at all. **The road network IS the map** — `tiles` already holds
  every road slab's footprint, so it costs nothing to draw. The static half goes into an
  offscreen canvas ONCE and the frame only blits it and puts an arrow on top, at `MAP.every`
  rather than every frame, because none of it moves. `pointer-events: none` so it can never
  eat a thumb; `city.MAP.on = 0` hides it.
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
- **THE SEE-THROUGH HOLE (`holePatch`, `stepHole`), ported from Plutopia.** A dithered
  `discard` through anything that is BOTH closer to the lens than Colin AND inside a circle
  around him on screen. It lives in the shared material shader, not per object, because the
  city is merged into a few dozen big meshes on ONE material — there is no object to fade.
  Four things about it are load-bearing:
  1. **An instance `onBeforeCompile` shadows the prototype's completely.** That is why Colin
     is never cut: his materials set their own hook for `uSpec` and so miss `holePatch`
     entirely, which is exactly right since he is the thing the hole exists to reveal. Do not
     "fix" it by chaining. Anything else that must stay solid sets `userData.noHole` — the
     board (it is under his feet) and the clouds.
  2. **All three tests are ramps, never pass/fail.** The circle is one; the other two are
     STRAIGHT LINES — the cut at his feet is horizontal in screen space and the depth cut is a
     plane — so against something broad like a wall the circle never gets a look in and what
     you would see is two lines crossing, which is a box.
  3. **The floor cut exists because a kerb he is standing on the far edge of is closer to the
     lens than he is.** Without it the ground under his feet dithers away and he stands on a
     hole. Nothing BELOW his feet can be hiding him.
  4. **THE OUTLINE MUST BE MASKED OFF IT.** A discarded fragment writes no depth, so every
     pixel the hole throws away leaves the depth of whatever was behind it — and a 4×4 dither
     of near and far is, to a second derivative, thousands of tiny silhouettes. Unmasked, the
     depth outline stops drawing the building and starts drawing the dither. The composite
     rebuilds the hole's three tests in UV space (`uHoleUV/RU/ZC/LoU`) and uses the MINIMUM of
     its five depth samples, because at a discarded pixel the centre belongs to the far side
     and testing only that keeps half the checkerboard.
  `city.HOLE.on = 0` turns it off — worth trying first if the frame rate drops, since a
  `discard` can cost early-Z on a mobile GPU.
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
  3 fxaa off, 4 bloom off, 5 full res (no upscale), 6 no post, 7 flat Colin, 8 sun only,
  9 nan map, **10 no shadow, 11 no hole**. A big dark region is either a shadow or it is
  shading, and those are different bugs — one tap on 10 says which, which is worth more than
  any amount of reading.
- **`tools/probe.mjs` rebuilds the heightmap offline** and prints profiles and pinholes.
  The bridge deck is continuous at ~6.3 over its whole span — it has been checked, so a
  fall-through there is not the heightmap. The deck is only ~21 m wide with water either
  side, and cars on it are solid boxes that can shove you off.
- **Colin's rig has been read and is clean**: `tools/skin.mjs` (no vertex >30 cm from its
  bone), normals all unit length, UVs in range, weights summing to 1. Do not re-theorise
  about torn geometry.
- Tunables live in `MOVE`, `SK8`, `CAM`, `TOON`, `LIGHT`, `POST` at the top; all exposed on
  `window.city` for the console.
