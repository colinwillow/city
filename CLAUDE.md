# Shredworld — working rules

**The game is called SHREDWORLD** (c104). The repo, the folder and `models/city.glb` are still
`city` and that is fine — the city is the setting, Shredworld is the game. The three
`localStorage` keys are STILL `city.kit` / `city.char` / `city.opt` **and must stay that way**:
renaming them wipes his saved character, his kit slot and every setting on his phone, which is
a worse first impression of a rename than not renaming them. `window.shred` is the console
handle now, with `window.city` kept as an alias so nothing typed before this build breaks.

Single-file Three.js r180 game in `index.html` (native ES modules, import map, no build
step). **Run `npm run bump` before every push** — it raises `BUILD` in both places and
rewrites `version.json`. Pages caches `index.html` for ten minutes and an iOS home-screen
app caches it harder, so a build that does not announce itself cannot be told apart from
the one before it. **Push straight to `main`** — the owner previews live on a phone.

The number is the big cyan figure top-left; it pulses three times on load. A running copy
polls `version.json` every 15s past the cache and puts a "build cN ready · tap" pill on
screen when the server has moved on, so he never has to guess whether a reload took.

## Verification budget

**The owner tests the game. You do not.** Make the change, `npm run bump`, run **`npm run
check`** (the ~1s syntax gate plus the ~3s boot gate), push, and say "shipped unverified"
**with the build number** so he knows what to look for on the badge. No screenshots, no
playwright unless he asks for it by name.

**`npm run check:boot` EXISTS BECAUSE `check:syntax` ONLY PARSES.** It cannot see a `const`
read above its own declaration, a throw at module top level, or a missing identifier — and all
three of those are a BLANK PAGE: the boot card sits for ever at the text it was BORN with
("loading the city"), `init()` never runs, and **nothing on screen or in a phone's console says
why**. c92 shipped exactly that and cost a round. Plutopia lost a whole build to the same class
of fault and wrote `check:intro` for it; this is City's, and it is not optional.
It runs the REAL module: `three` resolves to the VENDORED build through a shim that swaps
`WebGLRenderer`, `WebGLRenderTarget` and `PMREMGenerator` for fakes, because a headless node has
no GL context and those are the only things in the file that need one. The DOM, the canvases,
the audio and `localStorage` are stubbed to the surface the file actually touches.
**The asset failures are the environment, not the code** — node has no relative-URL base, so
every `loadGLB` rejects with `ERR_INVALID_URL`. Those are filtered; anything else that rejects
is a real fault, which is how a throw inside `init()` reaches the boot card in the real game.
**And it exits hard**, because once the module is up `init()` waits on fetches that will never
resolve, and a gate whose pass looks like a hang is a gate nobody runs.

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
  **c96 brought it to 46 and added the WEAPON JOINTS.** `weapon_root` on `mixamorig_RightHand`
  with `weapon_tip` at (-0.562, 0, 0.099) — **the same pair `blaster.glb` is built round, to
  three decimal places**, so `npm run joints models/colin.glb models/blaster.glb` reads MATCH
  and the blaster parents with IDENTITY: no scale, no offset, no rotation. The officer's pistol
  taught this a build earlier; `weapFit` was already written to take the joint the moment one
  appeared, so the export needed no code change at all to land the gun in his hand.
  The six new clips are `rifle_idle_01`, `rifle_walk_fwd_01`, `rifle_run_fwd_01`,
  `rifle_strafe_left/right` and `rifle_shoot_stationary_01` — arriving in the SAME commit as
  the joint, which is not a coincidence: they are what `WEAP.clip` was a hook for.
  **Nothing was lost in the re-export** (diffed old against new: 0 clips gone, 6 gained) and
  **`back_flip` is still 53 frames**, so `TRIM.back_flip = { start: 12 }` STAYS. Check that
  every time: the rule is to delete a TRIM entry the moment an export bakes the cut in, and
  deleting it while the frames are still there takes the crouch back.
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
  **A RAMP IS A FLOOR, NOT A SOLID, AND THAT IS ON PURPOSE.** `triAdd` rejects steep faces, so
  a ramp's SIDE WALLS are not in the collider: meet one side-on and you pass straight through
  it, roll at it up the slope and you ride it. "I went through it and then I was able to drive
  on it" is that, working as designed — the alternative is a box you stop dead against.
  **And the ramps carry NO TEXTURES AT ALL**: `skate_ramps_fun_boxes.glb` has zero images and
  two flat-colour materials, `ramp_color` (0.42, 0.32, 0.17) and `metal` (0.13). Untextured is
  the asset, not the pipeline.
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
- **FOLLOWING AND CROSSING ARE TWO DIFFERENT PROBLEMS.** Following is longitudinal — a car
  in my lane going my way, match its speed at a gap. Crossing is not: at a junction the other
  car is at ninety degrees and its heading says nothing about whether we are going to meet.
- **CARS ON FIXED PATHS DO NOT NEED 2D AVOIDANCE. THEY NEED THE POINT WHERE THE PATHS CROSS.**
  The old code found the moment of closest approach and then capped speed by the distance to
  the OTHER CAR — so a car giving way crept forward until it was on top of the car it was
  yielding to, which means **it stopped inside the junction**. Every car doing the correct
  thing ended up parked in the box, and that is the pile-up he reported.
  Solve the two rays instead. With `den = fx*ofz - fz*ofx` (which is `sin` of the angle
  between them, so `|den| < TRAF.para` means they are not crossing at all — head-on and
  same-direction both fall out here, and they are in different lanes anyway):
      ta = (ox*ofz - oz*ofx) / den     my distance ALONG MY PATH to the crossing
      tb = (ox*fz  - oz*fx ) / den     his, along his
  The yielder brakes to a stop line `TRAF.zone` SHORT of it on `v = sqrt(2·a·d)` — the
  physics, not a linear taper that either slams on late or rolls through. The box stays
  empty, so the car with right of way has somewhere to be.
  **The planning decel (`yieldA` 5.5) is deliberately under the real one (`brake` 14)**, which
  is what makes the profile self-correcting: a highway car too fast to plan a comfortable stop
  inside `reach` still makes the line, just harder.
- **PRIORITY MUST BE A TOTAL ORDER. GIVE WAY TO THE RIGHT IS NOT ONE.** It is anti-symmetric
  on a PAIR and that is all it is — which the old note in this file claimed as proof and which
  proves nothing about three cars or eight. Four cars at a four-way each have a car on their
  right, so all four yield and nothing moves; the stuck timer then releases them all at once.
  `crossGive` is **first come, first served on predicted arrival time**, ties inside
  `TRAF.slot` broken by the lower `car.id`. Arbitrary, but *stable* — and stable is the
  property that matters, because a tiebreak that flips is two cars alternately lurching.
  A total order cannot close a cycle, so somebody always has the right of way.
  It is also self-reinforcing: a yielder that slows raises its own arrival time and goes on
  yielding, while the car with priority accelerates and keeps it.
- **RIGHT OF WAY IS PERMISSION TO CROSS, NEVER PERMISSION TO STOP HALFWAY (`TRAF.clear`).**
  If the queue ahead is stationary and its tail is inside the junction, entering strands a car
  in everybody else's path and the jam stops being local. `blocked` outranks even the stuck
  failsafe. And `ta < TRAF.commit` is checked FIRST: once he is that close he is already in
  it, and stopping there IS the pile-up.
- **`npm run cross` RUNS THE SHIPPED RULE, NOT A RESTATEMENT OF IT.** It lifts `crossGive`
  and `TRAF` out of `index.html` between the `CROSS:START/END` markers and evaluates that
  text — because a tool that measures a copy of the code is the mistake `normals.mjs` made
  about `normGeo`, and it cost a build. Eight standoffs, old rule against new:
      EIGHT, two per approach     old NEVER clears, 45.5 s stopped in the box -> 7.3 s, 0.00
      TWELVE, three per approach  old NEVER clears, 45.7 s in the box         -> 9.3 s, 0.00
      four-way jittered           old min gap 1.23 m (a near miss)            -> 5.10 m
  **Two things in that harness are load-bearing and were both wrong first time.** Cars must be
  placed IN THEIR LANE (`laneOffset` is 2.88 m on a 12 m road) — without the offset the N and
  S cars share one line, every head-on reads as a collision, and the four-way deadlocked for
  a reason that does not exist. And "in the box" must mean **stopped on somebody's crossing
  point**, not merely near the middle: a car halted on its own stop line is doing the right
  thing and must not be counted.
- **THE FAILSAFE MUST OUTRANK `blocked`, AND FOR ONE BUILD IT OUTRANKED NOTHING.** c64 tested
  `blocked` first in `crossGive`, and `blocked` returns an unconditional yield — so a car that
  could not enter the box never reached the stuck timer, and the thing blocking it was another
  car in exactly that state. That is not a jam that clears slowly, it is a jam with no exit,
  and it spreads: every car stopped behind a stopped car becomes the reason for the next one.
  It cost **a whole map of stationary traffic**.
  **And `blocked` needs `qd > ta`.** Blocking the box means the obstruction is PAST the
  crossing; a stopped car BEFORE it is just a queue you are joining anyway. Without that half,
  every car in every queue refused every junction it could see — which, with the failsafe
  unreachable underneath, is the whole map at once.
  **`npm run cross` asserts the release property directly against the shipped rule**, as a
  five-row truth table, because no four-car standoff can reproduce a deadlock that needs a
  queue feeding a queue. The row that matters is "blocked box, waited out the stuck timer →
  goes". `stuck` came back down to 2.2 once it was reachable again.
- **"THE CARS ARE JAMMING" IS AN IMPRESSION, AND `npm run dens` KILLED THE OBVIOUS ANSWER.**
  Fewer cars is the first thing anyone reaches for and it cannot be the fix here:
      197 driving cars (266 in the file, 69 parked or props)   15831 lane-metres of road
      a car in a queue holds its own 4.9 m + TRAF.gap 6.5 = 11.4 m
      -> OCCUPANCY 14%, and 80 m of headway per car
  At 14% a jam is not congestion, it is a rule doing something wrong in one place. The tool
  prints the table at 100/80/70/60/50% so the argument does not have to be had again.
- **AND THE RULE IS NOT IT EITHER — `npm run cross` NOW TESTS THE SHAPES IT WAS MISSING.**
  Every case in that harness used to be ONE isolated junction with cars driving dead straight,
  which are the two things this city is not. Added and all clearing:
      CORRIDOR 3/5 junctions at 12 m   -- `npm run junc` says 27 of 40 boxes are closer than
                                          that, so a car downtown has SEVERAL crossings inside
                                          `TRAF.reach` at once and `crossGive` is per-PAIR
      queue behind a car TURNING       -- mid-turn a car's heading is 45 deg off its road,
                                          which is exactly where the FOLLOW test (`dot > .55`)
                                          lets go and the CROSSING test takes over
  Both clear with no stopped-in-box time. **Three hypotheses measured and all three wrong** —
  which is worth more than shipping the fourth one on a hunch.
- **SO THE GAME COUNTS IT (`JAM`, `jamScan`).** What is left is something no offline tool can
  see, and what would settle it is not more reasoning but WHERE: one knot of eight cars round
  a bad tile and the whole map crawling are different bugs and they look identical from a
  phone. A car stopped longer than `JAM.at` is stuck; past `JAM.show` of them the fps chip
  says `· JAM n@x,z` unasked, the same way `· NO CLOUD GLB` does, with the coordinate of the
  biggest knot in `JAM.cell`-metre buckets. `npm run spots` prints coordinates in the same
  frame, so the number is walkable to.
- **`npm run junc` SAYS WHY THERE ARE NO TRAFFIC LIGHTS.** A junction-reservation or signal
  scheme — the obvious answer, and a real one — needs junctions, and this road graph has none
  to find. 489 road slabs, 171 of them with both axes present, and **99% of those touch
  another**: cluster them and you get 40 boxes whose radii run to 135 m, one of them 38 tiles,
  with 27 of the 40 having under 12 m of clear road to the next. A signal on that is one car
  at a time across a third of the city. The graph is a soup of 12 m slabs, not a set of
  intersections, which is exactly why the algorithm has to be per-pair and geometric.
- Cars have **their own grid cell (`CARCELL` 16)**, not the solids' 8: four hundred cars each
  asking their neighbours twice a frame is the one place in this file where the bucket size
  shows up in the frame time. **The crossing query is 28 m, not 18** — it has to see far
  enough to stop (17.7 m at top speed plus the stop line) — and that is roughly 25 cells
  against 16, the one deliberate cost of all this.
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
- **ONLY A CAR'S NOSE CAN LAUNCH HIM, AND THAT PUT `hard` OUT OF REACH.** `w` is the car's
  speed along the CONTACT NORMAL, and on a flank that normal is perpendicular to the way the
  car is going — so a side-swipe scores near zero however fast it is, which is right. But a
  car tops out at `hy*(0.8..1.2)`, 9.6 to 14.4 in town, and the junction rules slow it further:
  against `hard: 12` the launch existed on paper and never once fired. **9** is the number at
  which a car at cruising speed that noses into him puts him on the road while one crawling out
  of a junction still only shoulders him. `graze` came to 5.5 with it.
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
- **A MORPH TARGET'S DONOR OBJECT IS NOT PART OF THE CHARACTER, AND c96's COLIN SHIPPED 48 OF
  THEM (`stripPoses`).** A face rig authored in Blender keeps one whole spare head per blend
  shape — every `*_MIX` viseme, every brow, `Cross_Eyed`, `Look_Up` — and an exporter asked for
  the SCENE rather than for the character writes them all out as ordinary meshes beside him,
  under `Poses__head` / `Poses__eyes`. They are the shapes the 42 morph targets were built
  FROM; the targets live inside the head primitive and do not need them, so they are residue:
      6 skinned meshes,  31644 tris  — Colin
     48 loose meshes,   362510 tris  — the donors, ELEVEN TIMES his whole body
  Every one has **no material index** (three gives those pure white), is **not skinned** so it
  never follows a bone, and hangs under a group at y = +4871 / −9839 in armature units — 49 m
  over his head and 98 m under the road, riding his root for ever.
  **AND IT DOES NOT MERELY LOOK WRONG, IT BREAKS THE GAME OUTRIGHT.** `measureSkin` takes his
  scale from the geometry bounds of every mesh it can see, and the donors read −5.433..183.694
  against Colin's own 0.003..1.378. **Measured both ways through the real loader rather than
  argued:**
      without the strip   geometry -5.433..183.694  ->  x0.009   he renders 0.01 m TALL
      with the strip      geometry  0.003..1.378    ->  x1.273   he renders 1.65 m
  A one-centimetre speck on the road, with the white-teeth rule painting 48 giant faces in his
  head texture on the way past. **A re-export can do this to you with no warning and no error.**
  **THE TEST IS SKINNING, NOT THE NAME.** `Poses__head` is this exporter's word for it and the
  next one will choose another. The property that makes a donor a donor is structural: it has
  no skin, so it cannot follow the skeleton, so it CANNOT be part of a character — it would
  stand still while he walked away. Only applied to files that HAVE skinned meshes, which
  leaves `blaster.glb` and `pistol.glb` (all-loose by construction) untouched. Surveyed across
  every character file in the repo: Colin is the only one with any.
  **`npm run wear` HAD TO BE TAUGHT THE GAME'S ORDER TO SEE IT.** The harness called
  `measureSkin` on the raw scene; `buildSkin` strips first and then measures. A harness that
  measures a path the game does not take is the `normals.mjs` / `normGeo` mistake, and this
  file has now paid for it three times. It calls `stripPoses` first, which is how both numbers
  above were obtained.
  **HE FIXED IT AT THE SOURCE ONE BUILD LATER** — the c97 export is 6 skinned meshes, 0 loose,
  31644 tris, bounds 0.003..1.319, every clip byte-identical in duration and none lost. So
  `stripPoses` is a no-op on it and stays anyway: he re-exports constantly and says himself
  that Cinema 4D adds them every time he imports.
  **AND REMOVING THEM LEFT THREE CLIPS BEHIND.** `Mesh.002Action` / `Mesh.003Action` /
  `Mesh.004Action`, one frame each, a single `weights` track on `teeth`, `eyes` and `head`.
  Nothing names them so nothing plays them — and the `head` one is a landmine regardless,
  because a `weights` track writes ALL 42 morph influences and would zero `Colin_Head_MIX`,
  the shape that makes the generic base head HIS. `buildColin` keeps only clips that drive a
  BONE: a morph-weights-only clip is a Blender action, not an animation, and this game has no
  use for one.
- **THE ARMED GAIT IS THE WHOLE TIME HE IS CARRYING IT (`gunOut`), NOT `p.aim`.** `p.aim` is
  only live from the moment the trigger arms, which is a fraction of a second before a shot;
  a man walking around with a blaster does not swing his arms the rest of the time. It is also
  not bare `KIT.on`, which is true of the jetpack too. Same three-clip blend on the same
  measured speed as the ordinary gait — only WHICH three clips changes — so `walkAt`, `runAt`
  and the time scaling all keep meaning what they meant, and a missing clip or an empty name
  falls straight back. **The recoil is COMPRESSED to `WEAP.fireHold`, the melee strike's rule**:
  `rifle_shoot_stationary_01` is 1.13 s against a .42 s cooldown, so at 1x he is still
  finishing his last shot when the next one leaves. And **`p.fireT` ticks OUTSIDE the armed
  gate** — a recoil that only counts down while the gun is out welds itself on at full weight
  the moment he stows it mid-shot, which is the `isRunning()` landmine's shape one state along.
- **`colin.glb`'s `teeth` primitive has NO material index.** three hands it
  `createDefaultMaterial()` — untextured pure white — and it reaches a millimetre further
  forward than his face, so it punches through his lips. `buildColin` reassigns any
  material without a `map` to the head's. **Find the head material by MESH name, never by
  material name**: the c9 re-export renamed every material to `Material.00N` and a
  name-keyed lookup failed silently, putting the white teeth straight back.
- **`TRIM` trims clips in code** for frames the owner has already cut locally but not
  re-exported. **`back_flip` loses its first 12 frames** — the clip is authored as a STANDING
  back flip, so it opens with a crouch and a push off the floor, and played on a double jump
  that reads as him jumping off nothing a second time. Everything downstream measures off
  `clipLen`, which subtracts `TRIM_IN`, so `airStart`'s time-scaling and the board trick both
  stretch what is LEFT (1.77 → 1.37) and nothing else needed touching. A tail shortens `clip.duration`; a head sets `TRIM_IN[name]`, the second the
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
  - **A FLICK IS A FAST MOVE *AND THEN A RELEASE*, AND BOTH HALVES ARE THE GATE.** Two
    earlier versions each had one half and neither worked. Judged on `pointerup` alone it is
    dead on the left pad: that thumb is already down and holding a direction when the trick
    is wanted, so the time since `pointerdown` is always past any window and the gesture can
    never once fire. Judged on the pad's own travel alone — which shipped through c77 — it
    fires MID-HOLD: every fast correction of a steering thumb reads as a trick, and **a
    press-and-hold cannot be told from a swipe at all**, which is what he reported.
    So the travel ARMS it (`FLICK.at` of the radius inside `FLICK.within`) and the lift
    FIRES it, if the lift comes inside `FLICK.let` **of the travel, never of the
    pointerdown** — that is the part the `pointerup` version could not do. A thumb four
    seconds into a steering hold still flicks; a thumb that sweeps and then stays down never
    does, however fast the sweep was. A later sweep in the same touch re-arms with its own
    direction and clock, so the flick that counts is the last one before the thumb came off,
    and a fired flick eats the tap and the release so nothing else on that pad goes off on
    the same lift. The history is seeded at the CENTRE on pointerdown, because on an absolute
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
  **THE TURN IS THE SHORTEST WAY ROUND AND IT IS MEASURED, NOT A FIXED HALF TURN.** It used
  to be a flat `Math.PI` in the direction of `rel`, which broke twice: he swept a full 180
  however far off he actually was, and he ended that 180 still `rel` out, so the thumb only
  half-decided where he finished. Worse, it was a CLIFF at 90 degrees, which is what he felt
  as "one way it takes the short path and the other way the long one" -- tabled before and
  after, held stick, both signs:
      landed  89 deg out ->  89 swept      landed 100 deg out -> 259 swept, 180 worst
  A hair either side of the boundary, three times the rotation. `ang` is already the signed
  shortest rotation from his nose to the thumb, so it is the whole answer: its SIZE is
  `turnRem`, its SIGN is `turnSide`, and `turnT`/`turnFull` scale with it at the same
  `PI/turnDur` rate. Now swept == the landing angle at every offset and the offset never
  once grows. **`p.turnFull`, not `SK8.turnDur`, drives the deck lag's phase** -- the
  constant would finish the sine before a short turn had finished.
  **STEERING IS `ang`, NEVER `rel`.** `rel` decides `braking` and the push cycle; it must not
  decide the turn. Steering by it brought his TAIL round to the thumb -- the far side of the
  circle -- so a stick held behind him while he scrubbed speed rotated him AWAY from where it
  pointed and the half cab afterwards undid it (259 swept at 6 m/s, against 99 now).
  **`turnSide > 0` IS A TURN TO THE LEFT.** Heading grows +Z toward +X and his right is
  `(-fz, fx)`, so +X is his left; the clip was picked as `turn_right` for a positive side,
  which played him spinning against the way the board and the world were going.
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
      charge   0%   top  9.0 m/s   jump 2.81 m high, 1.06 s,  9.5 m far
      charge  50%   top 13.3       jump 4.11 m       1.28 s, 20.2 m
      charge 100%   top 17.6       jump 5.66 m       1.51 s, 33.8 m
  On the board that thumb is still the ollie, so the wind-up is on foot only.
  **THE SPRINT RIDES ON `p.rHold`, NOT ON `p.charge`, AND ON `charge` IT NEVER ONCE FIRED.**
  `p.charge` only builds while `stick.R.far < .35` — a thumb RESTING on the pad, because past
  that the pad is a camera look and a look must not also be a wind-up. That gate is right for
  the JUMP, which is a wind-up and a release. It is wrong for the sprint, because holding the
  pad *and pushing it* is exactly what a thumb does while you are running somewhere — and
  **`far` is a HIGH-WATER MARK for the whole touch**, so one look anywhere in the hold kills
  the charge for the rest of it and the ceiling never leaves 9 m/s. Raising `MOVE.sprint`
  could not have fixed that and did not: c79 went 1.55 → 1.95 and he reported no change at
  all, which is the tell — a number that moves nothing is not the number. `p.rHold` was
  already sitting there as "how long the right pad has been down", with no `far` test on it.
  The jump charge keeps its own gate; only the ceiling moved.
  **AND THE THIRD BUG WAS `accFall`, WHICH IS THE ONE THAT ACTUALLY HELD HIM AT 9 m/s.**
  `accFall` thins the acceleration out as he nears top speed — and it measured against the
  BASE ceiling, `sp0 / MOVE.max`. So the instant he passed 9 m/s the ramp sat at its floor of
  `1 − .93 = .07` and his acceleration was `24 × .07 = 1.68 m/s²`. **The target had been going
  up since c79 and the acceleration that has to get him there was pinned at 7% the whole
  time.** Two builds of real fixes landed on top of it and he reported no change to either,
  which is exactly right — neither of them was this. Simulated against the shipped constants:
      OLD (vs MOVE.max)   sprint x1.00  target  9.0 m/s   reached in 1.57 s
      OLD (vs MOVE.max)   sprint x3.00  target 27.0 m/s   NEVER (12 s and still climbing)
      NEW (vs want)       sprint x1.00  target  9.0 m/s   reached in 1.57 s
      NEW (vs want)       sprint x3.00  target 27.0 m/s   reached in 4.33 s
  It measures against `want` — the speed he is actually being asked for. **The ordinary
  walk-to-run is identical to the frame**, which is the check that says the fix cannot have
  disturbed the locomotion it sits inside.
  **`CAM.rush` WAS NEVER BROKEN AND HAD SIMPLY NEVER BEEN REACHED.** The speed effect he asked
  for — a widening lens plus the radial blur in the composite (`uRush`), Plutopia's own — has
  been in the file all along, on a curve starting at 8 m/s. On foot he was pinned at 9 by the
  bug above, so it has never once been off the floor while running. Fixing the acceleration is
  what turns it on; `rush0`/`rushSpan`/`rushK` are the curve, and it has to cover a sprint on
  foot as well as 24 m/s on the board. **Suspect the thing that feeds an effect before the
  effect.**
  **`MOVE.sprint` AND `GAIT.tsHi` MOVE TOGETHER OR THE FEET SLIDE.** The run clip is scaled by
  `speed / GAIT.runRef`, so a ceiling of 17.6 m/s wants **3.7x** and the cap is what he
  actually gets. 1.7 was already under the OLD ceiling of 14 — he had been sliding at full
  charge for several builds — and it went to 2.4 with the sprint, which covers 11.5 m/s
  honestly and keeps the rest readable. **There is no sprint clip, and that is the real fix**;
  `run_fwd` played at 3.7x is a cartoon scramble, so the cap is deliberately short of keeping
  up rather than absurdly past it.
- **BORROWED CHARACTERS: THE RETARGET IS ROTATION-ONLY, AND THE CLEVERER ONE IS A TRAP.**
  Every candidate in `robits/` and `plutopia/` is rigged to a Mixamo skeleton, so Colin's 40
  clips can be worn by them without re-exporting anything. `npm run rigs [glb ...]` measures
  whether that will work before any of it is built — bone overlap against the 65 bones Colin's
  clips actually drive, the rest-pose offset per bone, and the hip height:
      robot (robits hero)   25/65   rest offset mean 12.4 deg, worst 91 (Hips)   hips 0.74 m
      moussa_robit          41/65   mean 15.6, worst 91 (Hips)                   hips 0.57 m
      alien_robit           49/65   mean 11.0                                    hips 0.73 m
      cybergirl             41/65   mean 10.1                                    hips 0.86 m
      alien_orange (pluto)  65/65   mean  0.0 — the same bind pose as Colin
      creature_green        57/65   mean  0.0
                                                          (Colin's own hips: 0.528 m)
  **EVERY MISSING BONE IS A FINGER.** Not one candidate lacks a spine, arm, leg or head bone,
  which is why this works at all: `_filterClipToScene` drops the tracks whose target is not in
  the skin and nobody will ever see a finger curl on a skateboard at eight metres.
  **ROBITS ALREADY PAID FOR THE HARD PART — READ ITS NOTE AT `index.html:4627` BEFORE
  IMPROVING ANYTHING.** The obvious retarget, and the one that sounds right, is the rest-pose
  delta `q_target = q_restT · inv(q_restS) · q_animS`. Robits shipped it, A/B'd it and turned
  it **off**: the per-bone form ignores the PARENT-CHAIN term (`inv(restParentT)·restParentS`),
  so the correction compounds down each limb — it splayed Moussa bow-legged and twisted his
  arms inward, **arm divergence 4.6° → 33°**, even though the spine and thigh improved. What
  actually ships there is `_retargetRotationOnly`: keep the `.quaternion` tracks, drop every
  `.position` and `.scale` one, because a position track bakes the SOURCE's bone lengths and
  applied to another skeleton it stretches it. That is a track filter — no resampling, no
  per-keyframe maths — so it costs nothing at load, which is the other reason to prefer it.
  Locomotion here is code-driven and the clips animate in place, so dropping the hips
  translation is free.
  **AND THE MEASUREMENT AGREES WITH THE VERDICT:** the Plutopia characters read 0.0° of
  rest-pose offset from Colin, so for them a rest-delta would be a no-op anyway; the robits
  ones read 10–19° with 91° at the Hips, and robits drives those rotation-only and it works.
  **Do not re-derive the rest-delta without the parent term.**
  **The hips are NOT a reliable scale reference for every rig.** `alien_orange` reports its
  hips at −0.02 m because that rig's scaling lives somewhere other than the chain the tool
  walks. Two rigs out of eight come back nonsense, so a per-character scale has to be measured
  off the skinned mesh's GEOMETRY bounds — and never off `Box3.setFromObject`, for the reason
  three hundred lines up.
  **THE ROOT CORRECTION IS MEASURED, NOT DERIVED. FOUR DERIVATIONS IN A ROW WERE WRONG.**
  A wrong Hips rotation rotates everything below it RIGIDLY about the hips, so the difference
  between two armature conventions is ONE constant rotation — and finding it on paper failed
  every time. c69 shipped `A_skin⁻¹·A_colin` (preserve the Hips' WORLD rotation, which is what
  the obvious derivation gives) and hung the robot and Moussa upside down under the road. Then
  `A_colin⁻¹·A_skin` — upright, full height, and still buried 1.9 m. Then `rest_skin·rest_colin⁻¹`
  and the full conjugation `P·(q·r_c⁻¹)·P⁻¹·r_s` — both identical to the first, because with
  `A_c ≈ I`, `r_c ≈ I` and `r_s = A_s⁻¹` all three collapse to the same expression on these rigs.
  **`npm run wearfit` searches all 24 axis-aligned rotations against a real mixer and a real
  skinning pass** and reports which stand the character up at full height without drifting:
      robot   Rx90*Ry270  ->  1.86 m, drift 0.001 m over the clip   hipQ [-.5, .5, .5, -.5]
      moussa  Rx90*Ry90   ->  1.73 m, drift 0.004 m                 hipQ [.5, .5, .5, .5]
      alien   identity    ->  it already shares Colin's convention
  11 of 66 work for each robits rig, and **every hand-rolled candidate was a rotation about X**,
  so none of them could ever have found one. Drop a new character in `models/chars/`, run the
  tool, paste the line into `HIPFIX`.
  **STANDING HIM UP LEAVES HIM FREE TO FACE ANY OF FOUR WAYS (`SPIN`).** The rotation above
  settles which way is up and nothing else, and the two robits rigs came up quarter-turned in
  OPPOSITE directions. A yaw on the model wrapper is the whole fix: a rigid turn about his own
  axis, composing with `colin.root`'s `faceH` by simple addition since both are Y rotations,
  and unable to disturb either the retarget or the lift (a Y turn moves nothing in Y).
  `npm run wear` measures it — it finds the vertex each HAND bone dominates, skins both, and
  reports the left-to-right shoulder line as a yaw **relative to Colin**, so his own file's
  convention cancels. Measured +83° and −88° rather than exactly ±90 because an idle does not
  hold the arms symmetrically; the true value is plainly the quarter turn.
  **The probe needs a fallback chain.** The robot's hands are not the heaviest weight on any
  vertex — his forearms carry them — so the first version found nothing and reported no yaw at
  all, which reads exactly like "he is facing the right way". Hand → forearm → arm → upper leg.
  **AND THE RESIDUAL IS A CONSTANT LIFT, WHICH IS WHY ONE NUMBER IS ENOUGH.** Rotating about
  an origin the mesh does not share leaves a vertical offset; that it is CONSTANT is the
  measured part (0.001 m of drift), so `sitSkin` skins three hundred vertices of the pose he
  actually stands in and lifts by what they say. Nothing is typed per character — the robot
  came out needing 1.96 m and the alien 0.83 m, and neither is in the source.
  **EVERY CHECK THAT MEASURED THE ASSET SAID ALL FOUR RIGS WERE FINE** — bone overlap, rest
  poses, node scales, hip heights, name sanitising — while two of the three were lying in the
  road. An offline quaternion check even *agreed* with the wrong correction (0.7° residual at
  rest) because it carried the same transpose error as the reasoning did. `npm run wear` loads
  the real GLBs with the vendored GLTFLoader, runs the shipped `measureSkin`/`skinClips`/
  `sitSkin` text between the `SKIN:START/END` markers, drives a real `AnimationMixer` and
  **skins real vertices with `applyBoneTransform`** — because its first version read BONE world
  positions and pronounced the robot upright while he was buried head-down (his bones live
  under an armature the mesh does not share; only the vertices reconcile the two).
  It needs `node_modules/three` to resolve the loader's bare `three` import and writes that
  shim itself, pointing at the VENDORED build.
  **`GLTFLoader` binds every skin with the IDENTITY matrix**, so at rest a vertex's world
  position IS its geometry position for any file it opens — the Colin measurement in
  `buildSkin` generalises with nothing typed per rig. Everyone is scaled to `COLIN_HEIGHT`
  (`CHARS.h` per key to change that): the collider, the camera, the deck and the hand grip
  are all tuned to him.
  `models/chars/` holds the borrowed skins and is in `bump.mjs`'s `DIRS`. The chip shows the
  worn skin's key when it is not Colin, and `NO SKIN n` when a load failed.
  **`tools/rigs.mjs` measures the hips off the WORLD MATRIX.** Its first version summed the
  local translations up the parent chain, which ignores every rotation and scale on the way:
  it put Colin's hips at 52.8 and three candidates at a NEGATIVE height, and that number was
  about to pick the scale every character is drawn at.
- **LADDERS GO WHERE THE JUMPS CANNOT REACH, AND `npm run ladders` FINDS THEM.** A charge jump
  into a double tops out at 8.04 m and the grab window adds 2.15, so **anything under 10.2 m
  is already climbable and does not want a ladder**. The tool takes every building over that,
  probes its four faces at 1.6/3.0/4.5 m out for **flat open ground** sampled off the same land
  and road meshes the collider is built from, and emits the foot, the top and the bearing.
  A ladder whose foot is in the water or up the inside of a wall is what placing one by eye
  off a screenshot gets you — the same reason `npm run spots` exists.
      9 candidates. 6 placed: hotel_a 17.1 m, travel_agency 13.8, four house_05 at 11.1.
      3 LEFT OUT ON PURPOSE: the 51 m skyscrapers are a 13.3 s climb with nothing happening.
  Their feet are measured and sitting commented in `LAD.spots` for the day there is a lift or
  a jetpack. The placed ones climb in 2.8 to 4.4 s.
  **The geometry is procedural and merged** — two rails and a rung every `LAD.rung`, one draw
  call per ladder on `cityMat`, so it is toon shaded for free.
  **A LADDER IS NOT IN THE COLLIDER.** It is a thing you latch to, not a wall you stop against,
  and rails thin enough to look right are thin enough to catch a foot on.
  **Up and down come from the thumb's component ALONG THE WALL, never its raw Y.** The stick is
  in world space and the camera can be anywhere, so "up" is the thumb pushed INTO the wall and
  "down" is it pulled away. Walking into one latches; there is no button.
  **Topping out hands him to the ledge hang's own mantle** (`p.hang` + `climbT`), so a ladder
  ends the way a ledge does and there is ONE piece of code that puts him on a roof.
  **No climb clip exists**: `walk_fwd_neutral` quickened stands in, because a walk cycle facing
  a wall is legs on rungs and arms reaching. Same stand-in rule as the grind and the hang.
- **A LEDGE IS THE TOP EDGE OF A SOLID BOX — FOUND, NEVER AUTHORED (`HANG`, `ledgeGrab`).**
  The same idea as the grind rails: the city is already thirty thousand boxes in a grid, so
  every roof, wall top, balcony and shopfront in it is a ledge for free and nothing is placed
  by hand.
  **The closest point on the box's FOOTPRINT gives the distance to the face AND its outward
  normal in one step** — `clamp(pos, min, max)` per axis, then the vector from that point to
  him. No per-face tests, right whichever side he comes at, and **being inside the footprint
  returns nothing**, which is what stops him grabbing the roof he is standing on.
  **A ledge belongs to something TALL (`HANG.tall`).** Every kerb, bollard and planter is a
  box with a top; without the height gate he grabs all of them, and most of the city's boxes
  are ankle furniture.
  **Head clearance is checked BEFORE the grab, not after.** A lip with a wall on top of it is
  a lip he would climb into.
  **The mantle goes UP FIRST, THEN IN.** Lerping straight to the target drags him diagonally
  THROUGH the parapet he is climbing over; over the top and then across is what a mantle is.
  **Letting go gives the second jump back**, so a bad grab costs a moment rather than a life.
  **NO HANG CLIP AND NO CLIMB CLIP EXIST.** `jump_going_up` stands in for both, exactly the
  way `skate_idol_crouch` stands in for the grind — it is the one pose with his arms up, and
  reaching is what a hang and a mantle both are. `HANG.clip` is where real ones go.
  **The reach is what the jumps are for**, and it lines up with the city by arithmetic rather
  than by luck — `HANG.hi` is 2.15 m above his feet at the moment of the grab:
      plain jump       apex 2.81 m  ->  grabs a ledge up to  4.96 m
      jump + double    apex 5.19 m  ->                       7.34 m
      charge + double  apex 8.04 m  ->                      10.19 m   (houses are 7–11 m)
  So a roof needs the charged double, and a balcony does not. **No shimmy along the ledge
  yet** — that is the obvious next piece.
- **THE SECOND JUMP IS THE FLIP (`AIR`, `airStart`).** One move is better than two, so the
  double jump and the air flip are the same thing: tap the right pad again in the air and he
  kicks off nothing and goes over. A FLICK picks which way over — up front, down back, the
  same way round as on the board — and spends the same jump; it is the tap with a direction
  on it, not a separate move.
  **`p.jumps > 0` is the gate, so falling off a building grants nothing.** The second jump
  exists only if he actually took the first; `coyote` still covers the first 0.12 s off a
  ledge, and after that a man who walked off a roof has no flip in him.
  **The kick is SET, not added.** Adding to whatever he had sends a double off the top of a
  charge jump into orbit and one off the bottom of a fall nowhere. Setting it makes the second
  jump the same height whenever it is spent, which is what makes it a reliable save.
  **The flip fills the air he has left**, the board tricks' rule: `front_flip` is 0.80 s and
  `back_flip` 1.77, so at 1x one finishes a third of the way up and the other could never be
  landed. Measured at `second: .92`:
      tapped at the apex   apex 5.19 m, 1.21 s of air, flip over 1.09 s (back x1.63)
      tapped falling late  apex 2.98 m, 1.03 s,        flip over 0.93 s (back x1.90)
  `.84` was the first try and squeezed the back flip to **x2.17**, which is the number that
  moved it. Front is the default because it is the shorter clip and the one a plain tap gets.
  **`fill` came down to .72 afterwards, because a flip that takes the whole jump READS as
  slow** even though it is, strictly, the right length: the rotation wants to be over before
  the apex, and the rest of the air is his to aim the landing with. `max` came down to 1.05
  with it so a long hang cannot stretch one flip across two seconds.
  **A charge jump into a double reaches 8.0 m**, against houses at 7–11 — that is deliberate,
  and it is what the ledge hangs and the ladders will be built on top of.
- **MELEE IS ON FOOT AND IT COSTS NO NEW CONTROL (`MELEE`, `meleeGo`, `stepMelee`).**
  Both pads already flick on the board; on foot neither did. **Right pad flick = a strike,
  left pad flick = a dodge roll**, which keeps each pad meaning the same thing it means on the
  board (the right one is the verb, the left one is the body).
  **A CHAIN, NOT A BUTTON.** Each flick inside `MELEE.window` takes the next of three
  escalating strikes; let it lapse and the next flick opens at the first again.
  **A slide tackle is not a fourth strike, it is a different OPENING.** Above `runAt` the first
  strike becomes the tackle and the punches follow from there, so running at somebody and
  hitting melee is one move rather than two decisions.
  **`stepMelee` is `stepRoll` with a different clip** — speed bleeding off across the clip,
  gravity and the ground collider still running, leaving the ground handing him straight back
  to the air code. Copying that shape is why it needed no new physics.
  **The tail of every strike is cancellable (`MELEE.hold`).** Holding the whole clip makes a
  three-punch chain feel like three seconds of watching; past `hold`, a thumb on the pad takes
  him out of the recovery, which is what makes each link in the chain a decision.
  **A dodge roll is the only thing in the game that makes him unhittable** (`p.melI`, tested
  at the top of `carHit`) — without i-frames a roll is a slower walk with a nicer clip.
- **THE SLASH MARK IS DRAWN ON THE PICTURE, NOT PLACED IN THE WORLD (`SLASH`, `slashArc`).**
  Ported whole from Plutopia, and its first version's mistake is the entire lesson: a ring in
  the world is the obvious build and it is wrong. A `RingGeometry` lies in its own XY plane,
  so turning it by his heading puts its NORMAL along the swing — the arc ends up drawn in the
  plane facing the direction of travel with the crescent's opening pinned to his local right,
  which reads as sideways from every camera angle. A slash mark is a mark **on the picture**,
  which is what the ones in comics and in every stylised game are, so it is a camera-facing
  sprite with a roll in SCREEN space. It cannot be edge-on and it cannot face the wrong way.
  That is also what lets his own art drop in: a PNG at `SLASH.url` replaces the canvas one.
  **ONE FILLED SHAPE, NOT A RUN OF STROKES.** Walking the arc in fifty segments and stroking
  each at its own width looks tapered in the source and is not — every round cap overlaps its
  neighbour, source-over accumulates the alpha at each join, and out comes a white slab with a
  ragged edge. Tracing both edges of the ribbon and filling it once gives a real taper and a
  point at each end. Thickest a third of the way in, not dead centre: symmetric reads as a
  shape somebody placed, off-centre reads as one pass of a brush.
  **NOT ADDITIVE.** Additive over a lit street has nowhere to go but white: the mark saturates,
  clears `POST.bloomTh` and comes back out of the bloom chain as a glowing lump.
  **AND IT FIRES ON THE CONTACT FRAME (`MELEE.at`), NEVER ON THE INPUT.** Drawing it on the
  flick puts the picture a third of a second before the hand gets there, and a swing and its
  consequence arriving as two events is what "you cannot actually hit things" looks like from
  outside. Per clip, because a round kick connects later in its arc than a jab. The dodge roll
  leaves no mark — it is not a strike.
- **THE HIPS TRANSLATION IS NOT A BONE LENGTH, AND DROPPING IT IS WHAT MADE HIM FLOAT.**
  `tools/melee.mjs` cut the borrowed clips to rotation-only — right for every other track,
  wrong for this one. The hips translation is the body's HEIGHT OFF THE GROUND and every one
  of these clips crouches: the punch drops the hips 7.8 units, the slide and the roll drop
  them 55. With the track gone the hips stay at Colin's REST height while the legs are folded
  underneath, so his soles hang in the air for the whole clip. **Measured, not guessed** —
  `npm run wear` plays each clip through a real mixer and reads the lowest skinned vertex:
      melee_punch_01  0.11 .. 0.21 m      melee_slash 0.09 .. 0.21      slide 0.09 .. 0.51
  which is `(restHips − correctHips) × Colin's unit scale` to the centimetre. So the Hips
  channel is KEPT and REMAPPED into Colin's units, both ends measured from the two files' own
  idle clips and nothing typed: `y' = colinStand + (y − alienStand)·(colinStand/alienStand)`,
  76.3 → 50.6, ×0.663. X and Z are frozen at Colin's own idle values — these clips animate IN
  PLACE and the travel is code-driven (`MELEE.lunge`, `slideV`), so a borrowed root path would
  fight it. After: **0.01 .. 0.03** across all five.
  **`npm run wear` HAD TO LOAD `melee.glb` TOO.** Its first run reported every melee clip
  "absent", because the borrowed clips are appended to `colin.clips` by `buildColin` at
  RUNTIME and a harness that opens only `colin.glb` is measuring a pool the game never has.
  Same mistake as `normals.mjs` and `normGeo`, one directory over.
  **Only a GROUND clip can float.** A flip's lowest vertex RISES as he tucks — `front_flip`
  reads 0.00 .. 0.79 and that is the trick, not a fault. The harness flags air clips
  separately or it reports a bug that is not there.
  **The borrowed SKINS still drop it** — `skinClips` keeps quaternions only — so the robot,
  Moussa and the alien float on these clips (and on Colin's own `landing_roll`) exactly as
  Colin did. Fixing it there is not a scaled copy of this: their rest Hips translation puts
  the height on a DIFFERENT AXIS (the robot's is `0, 0.25, −73.6`), which is the same trap
  `HIPFIX` exists for, so the offset would have to go on the model group's world Y rather
  than on the bone. Every skin is drawn at `COLIN_HEIGHT`, so that offset is the same number
  in metres for all of them — which is the cheap way in when it is wanted.
- **A STRIKE TAKES A FIXED TIME; THE CLIP IS COMPRESSED TO IT.** The three melee clips run
  0.92, 1.38 and 1.33 s at 1x, so a three-punch chain was three and a half seconds of
  watching — "it feels really laggy". `MELEE.strike`/`slideDur`/`rollDur` are the beat and
  `colinScale` stretches the clip to fit, which is the board tricks' own rule turned round:
  there the clip is STRETCHED to the air he has left, here it is COMPRESSED to something the
  thumb can keep up with.
  **AND HE HOLDS HIS SPEED BEFORE HE SCRUBS IT (`MELEE.carry`).** A flat linear bleed puts
  the average at half the launch speed, so every metre of travel has to be bought with a
  speed spike at the front — which reads as a rocket, not a tackle. Full speed for the first
  45% and linear to zero after it averages .725 instead of .5: 45% further for the same
  launch, and it is what a slide actually looks like.
      strike   1.10 m over 0.92 s   ->   1.67 m over 0.58 s
      roll     4.48 m over 1.21 s   ->   5.37 m over 0.78 s
      tackle   5.19 m over 1.29 s   ->  10.80 m over 1.15 s   (entering at 7 m/s)
  The tackle is the "about double as far" it was asked for, bought mostly by the profile
  rather than by the launch: 8.05 → 12.95 m/s, not 8.05 → 21.
- **BORROWED CLIPS GO INTO COLIN'S OWN POOL, NOT A SECOND PATH.** `npm run melee` lifts five
  clips out of Plutopia's alien into `models/chars/melee.glb` and `buildColin` appends them to
  `colin.clips`, so every skin picks them up through `skinClips` unchanged — same filter, same
  `HIPFIX`. The alien shares Colin's bind pose exactly (0.0°, measured), which is what makes
  that legitimate.
  **The extractor cuts them to ROTATION-ONLY offline**, for the same reason `skinClips` does:
  a position track bakes the ALIEN's bone lengths and Colin takes the pool RAW. Doing it in
  the file means no clip in it can ever be applied the wrong way by accident.
  **`2.22 MB → 0.18 MB`, and the last order of magnitude is a trap.** Disposing an animation
  or a channel does not dispose its SAMPLER, and a sampler is where the keyframes live — the
  first cut dropped 25 clips and 680 channels and still weighed 1.33 MB with prune reporting
  four accessors removed. Dispose the samplers explicitly and prune frees 4978.
  **A borrowed clip carries the lender's PROPS.** The alien's rig has `weapon` and
  `weapon_direction`, which are not bones and which Colin has no equivalent of (66 of 68
  targets are shared). An unresolvable track is a console warning per clip per skin and no
  animation, so `buildColin` filters them once against Colin's own node names.
- **THE POLICE (`COP`, `buildCops`, `stepCops`) HAVE THEIR OWN RIG AND THEIR OWN CLIPS, WHICH
  IS WHY NONE OF THE BORROWED-CHARACTER MACHINERY IS INVOLVED.** Every other skin in this game
  wears COLIN'S clips and needs `skinClips`, `HIPFIX`, `SPIN` and `sitSkin` to do it. The
  officer arrived with sixteen animations of his own, so he needs none of that — and
  **`npm run cop` says so with numbers rather than by assumption**, through the real vendored
  loader, a real mixer and real skinned vertices:
      height 0.868 in file units      -> x2.016 to reach COLIN_HEIGHT
      soles at 0.000 in EVERY ground clip   -> no `sitSkin` lift to measure
      travel 0.00 m in every clip           -> they animate IN PLACE; locomotion is code-driven
      58 joints, all mixamorig, height on Y -> the same convention Colin uses, no HIPFIX
  If a future export floats or walks away from itself, that tool is where it shows. It also
  prints hand height and root motion per clip, which is what a new clip has to be checked for.
  **THE PISTOL IS PARENTED TO THE HAND BONE, AND IT IS THE ONE PLACE THE BOARD'S RULE DOES NOT
  APPLY.** The title card hangs the deck off the hand's WORLD MATRIX because parenting to a
  bone scaled 0.01 would draw it a hundredth of its size. The pistol is already authored
  inside a 0.01 armature of its own, so its mesh in bone-local space comes out at the size it
  was drawn. Parenting also means it follows `draw_weapon` and `shoot_pistol` for free, which
  a world matrix would not.
  **ITS SIZE IS MEASURED, THE SKATEBOARD'S OWN RULE.** `npm run cop` reads the gun at 0.303 m
  through the real loader, and against an officer scaled x2.016 that lands at 0.61 m — a
  carbine. `COP.gunLen` is what a pistol is and `buildCops` divides to get there, so a
  re-export at any size lands right with no edit.
  **HIS RE-EXPORT CARRIES THE JOINT, AND THAT ENDED EVERY GUESS IN HERE (c85).** The c82 file
  was 58 bones and every one of them `mixamorig_`, so the two files shared no placement and the
  grip had to be hand-nudged. The new one has `weapon_root` and `weapon_tip` **on the LEFT
  hand** — he is left-handed, which no amount of reasoning would have produced — and they are
  the same pair the pistol file is built round. Measured through the real loader:
      officer  weapon_root (0.440, 0.461, 0.001)   weapon_tip (0.673, 0.454, 0.055)
      pistol   weapon_root (0, 0, 0)               weapon_tip (-0.233, 0.008, 0.054)
  Same offset, X mirrored, because one is a left hand. **So the alignment is already done**:
  the pistol mesh keeps its own local transform, is parented to the officer's joint, and no
  scale, offset or rotation is applied at all. `COP.gunLen` defaults to 0 = as authored, and
  `COP.gun` + `city.gunFit()` survive only as overrides for nudging the art.
  **And `weapon_tip` is the muzzle as a BONE**, so it rides the draw and the recoil: where the
  round leaves from is read off the rig without `copShoot` knowing those clips exist.
  **When a rig arrives with the joint, use the joint.** Two builds of hand-placement went away
  the moment it did.
  **`weapon_tip` IS THE MUZZLE** and is in the file for exactly that, so nothing about where
  the barrel points is typed in the game.
  **EVERY STATE HAS AN END THAT DOES NOT DEPEND ON THE PLAYER** — `HIT`'s own rule for Colin.
  `idle` → `chase` → `draw` → `armed` → shooting, with `hit` ×3 → `down` → `up` → back to the
  chase. An officer you can wedge into a state he cannot leave is worse than one who gives up
  too early.
  **The gun appears when the hand gets to it**, part-way through `draw_weapon` — not on the
  frame the state changed. Same rule as the slash mark and the melee blow.
  **`get_up_front` is 7.67 s at 1x**, which is a nap; `COP.upRate` is the beat the state runs
  at. **A bullet re-uses the car's own knock-down** (`p.hit = 'fly'`) rather than opening a
  second damage system to keep in step with the first.
  **A punch lands on the contact frame** — `copsPunched` is called from the same line in
  `stepMelee` that draws the slash, because they are one event.
  **`skinWeights`'s T-pose fallback had to stop being `idle_neutral`.** It now takes the
  fallback as an argument: the police do not have that clip, so the escape hatch that exists
  to prevent a T-pose would have landed straight in one.
  **They are always stepped, including on the title card** — a mixer that never updates is a
  bind pose, so skipping them there put six men in the T-pose on the street behind the logo.
  `idle` refuses to notice the player while `TITLE.on`, which is the right way to do it.
  **Placed by `npm run spots 4`**, not by eye — same rule as the ramps.
  **The chip says `· NO COP GLB` / `· NO PISTOL GLB` unasked**, because a console warning is
  invisible on a phone.
- **HEAT: A POLICE OFFICER WHO SHOOTS ON SIGHT IS NOT A CITY, IT IS A SHOOTING GALLERY.**
  c82 shipped six officers who noticed you at 24 m and unloaded indefinitely, and the game is
  SKATING — the police have to be part of the street rather than a reason to stay off it. So
  they are indifferent until you give them a reason, and the reason accumulates: a star system,
  because that is the shape everybody already reads without being told.
      0      they mosey -- patrol a short beat, stop, look about, walk on. They do not see you.
      >= 1   whoever is near enough comes after you, on foot
      >= 2   they draw and shoot -- **and `d < COP.range` gates the trigger separately**, so a
             round is never fired across the map at somebody merely known about
      >= 3   they call it in: everyone inside `callIn` joins, not just the one you touched
  **And it FALLS on its own** once nobody has seen you for `calm`, so a scrape is a scrape
  rather than a life sentence and getting away is a real move. `HEAT.punch/down/zap/bolt` is
  what each thing you do is worth. **The stars are in the chip**, because a wanted level you
  cannot see is one you cannot play around, and "why is everyone shooting me" is the question
  it exists to answer before it is asked.
- **NO TWO OFFICERS THE SAME.** Six identical men doing the identical thing on the identical
  frame is what "they all have the exact same behavior" looks like, and it is one line of
  variation away from a street: `react` (how long he takes to notice), `nerve` (how close he
  will get, and how fast) and `cadence` (how often he fires), plus a `wake` state so they do
  not all turn on the same frame. **None of these change what he DOES** — only how quickly and
  how close — so the state machine stays one thing to reason about.
- **`npm run spots ... spread N` EXISTS BECAUSE NEAREST-FIRST IS THE WRONG SORT FOR ANYTHING
  DISTRIBUTED.** `spots` ranks by distance from the spawn, which is exactly right for "where
  do I put a half pipe he will actually find" and put four police in a rank eight metres apart
  in his face. `spread` is farthest-point sampling over the same candidates: take the best,
  then repeatedly take whatever is furthest from everything already taken. The police spots are
  one within a walk of the spawn and seven scattered from 297 m to 767 m out.
- **THEIR ROUNDS ARE SLOW ENOUGH TO SEE AND TO DODGE (`SHOT`).** A hitscan bullet is a number
  that happens to you; a round crossing ten metres in half a second is a thing on screen you
  can read and steer off, which is the difference between being shot at and being in a fight.
  It is also the only honest way to have police in a skating game: **the answer to being shot
  at should be to move, and you cannot move out of the way of an instant.**
  **The lead is deliberately short and the spread deliberately wide.** A pistol that solves the
  intercept is a pistol you cannot dodge; he aims at where you are now plus a fraction of where
  you are going, so standing still is punished and moving is rewarded.
  **`range` is the other half of "the bullets don't just go infinitely"** — they stop, and the
  ground stops them too, which is what makes cover mean something.
  **AND SO DOES EVERYTHING SOLID (`shotBox`, c87).** A round that passes through a car is not
  cover, it is scenery — c85's only tested the ground height, so standing behind a car did
  nothing. This city is thirty thousand AXIS-ALIGNED boxes in a grid, which makes the whole
  thing three overlaps and a smallest-penetration test: **the axis it is least deep into is the
  face it came in by**, so that face IS the normal and the reflection is one sign flip. (Same
  reasoning `carHit` uses to pick a car's nose from its flank.) `bounce` is what a ricochet
  costs it and `ric` how many it gets — and **after the first it cannot hurt you**, because a
  ricochet you never saw coming and could not have dodged is a cheap shot, and the whole point
  of a slow round is that it is dodgeable.
  **AND HE CHECKS HE CAN SEE YOU BEFORE HE FIRES (`copSees`).** Bouncing the round off the car
  is only half of it; the other half is that he should not be emptying a magazine into the boot
  of it. A dozen samples down the line against the same boxes — coarse on purpose, because it
  runs per officer per shot and a round that clips a lamp post on the way is not the failure a
  wall is. Checked on the DECISION to fire, not every frame; blocked, he looks again in .35 s
  rather than spinning on it.
- **A COP WALKS ON `resolveBoxes`, THE PLAYER'S OWN RESOLVER.** He was walking through cars and
  buildings because the only thing tested was the GROUND HEIGHT under his next step — which a
  car roof is not, and a wall's footprint is not either. It takes a position, the boxes near
  it, and pushes the position out of them; reusing it is the whole point, because a cop-shaped
  second physics path is a second physics path to keep in step with the first. A wall he is
  pressed into costs him his speed, so he does not grind along it at a run with his legs going. A dodge roll's i-frames
  cover them like everything else. A hit goes straight into the car's own knock-down rather
  than opening a second damage system.
- **THE CARD EFFECTS (`FX`, `fxTex`, `fxPop`), PLUTOPIA'S, PORTED WHOLE — AND THE STUTTER IS
  THE STYLE.** Flat cards playing a hand-drawn sheet at `FX.fps` and HOLDING each drawing for
  three film frames — 24 over 3 — which is how animation has drawn smoke and impacts for
  eighty years and is the one thing a smooth particle system cannot do.
  **ONE SHEET, ONE MATERIAL, ONE DRAW CALL, and a BANK IS ONLY A WINDOW INTO IT.** Start two
  frames in and the crack at the front is simply not played, so the same run of drawings gives
  several effects: `jet` and `puff` are the same twelve cells three frames apart, `boom` and
  `hit` likewise. **Adding a look to a new weapon is a row of drawing in `fxTex` plus a line in
  `FX.bank`, never a second particle system.** 7×7 = 49 cells: a burn (0–11, no word), a punch
  (12–23, POW), a hit (24–35, BOOM), the plasma (36–48, ZAP). NO STROKED LINES ANYWHERE — see below.
  **THE WORD BELONGS WHERE THERE IS ONE EVENT TO NAME.** Plutopia's own note, and it was learnt
  by over-applying it there: a motor running is not a punchline, and an onomatopoeia four times
  a second is a joke told four times a second. **The jetpack has no word**; a punch landing, a
  bolt arriving and a car being stopped do.
  **A word is DRAWN, not typeset** — a fat dark outline under a hot fill, so it survives being
  forty pixels across on a phone and still reads as ink laid on top of the render.
  **A blob is ONE FILL, not a run of strokes**, the slash mark's lesson again: overlapping
  round caps accumulate alpha at every join and come out as a slab.
  **`gl_PointSize` IS DERIVED, NOT TUNED**: half the framebuffer height over the tangent of
  half the vertical lens, so a card is `aSize` world metres. A tuned constant would change size
  whenever the fov does — and **the fov here MOVES**, because `CAM.rush` widens it with speed.
  **`frustumCulled = false`** because the buffer holds WORLD positions and its origin means
  nothing; **`userData.noHole`** because the see-through hole must never dither an effect.
  **`city.fx('boom')` fires one at head height** so the sheet can be looked at without having
  to be shot — the same hook Plutopia's `isle.pop()` is, and for the same reason: a drawn effect
  is a look-at-it decision and it should not need a fight to see one. **`city.fxSheet(url)`**
  swaps his own PNG in live and rebuilds; the banks are cell WINDOWS, so a sheet laid out the
  same way drops straight in.
  Wired to: the cop's muzzle (at `weapon_tip`, so it is right through the draw and the recoil),
  a round stopping or ricocheting, a round hitting him, the blaster's muzzle, a bolt landing, a
  car being zapped, a punch landing on an officer, and the jetpack's putt.
- **I INVENTED A THIRTEENTH EFFECT IN A VOCABULARY THE SHEET DOES NOT HAVE, AND IT WAS THE
  WHOLE COMPLAINT.** *"I don't even know what are those like branches of a tree electric tree
  branches, they look nothing like each other."* He was right. Plutopia's sheet is thirty-six
  cells and **not one stroked line appears in any of them** — every drawing on it is a filled
  star, a filled blob, or a drawn word. The `arcs` helper, the forked cyan lightning and the
  whole plasma row were MINE, on the reasoning that "electricity is a line and smoke is a
  mass". The reasoning is fine and the result is not: a cold forked line drawn 2.4 m across and
  laid over a road does not read as *a car was zapped*, it reads as a bug. **Gone.** The plasma
  row is the same three beats as every other one — a cold burst, ZAP, smoke going cool.
  **This is the c91 lesson a second time and the shape is identical**: the ported parts were
  right (`smoke` is byte-identical to Plutopia's, `JET.puff`/`blast`/`drift` are its numbers
  x.625 to two decimals) and **the part I added on top is what looked wrong**. When a thing is
  being ported, the additions are the first suspects, not the last.
- **AND THE JET ROW WAS NOT ITS FRAME SPLIT EITHER.** Plutopia spends 2 frames on the crack,
  3 on flame and **SEVEN on smoke**; mine spent 3, 3 and six — a quarter less cloud on a
  twelve-frame bank, and the cloud is the entire thing you look at. `puff` is its `[2,10]`, not
  `[3,9]`, and `FX.size` is its 2.6 x .625 = 1.63 rather than a rounded 1.5.
- **`npm run sheet` RENDERS THE SHEET AND LABELS IT (`FX:START/END`).** "What is that drawing"
  is a question about the contents of a texture that is generated in code at runtime, and
  reading that code three times did not settle it. The tool runs the SHIPPED `fxTex` against a
  real 2D canvas (`@napi-rs/canvas`, dev-only) and writes two PNGs: the sheet, and a copy with
  every cell numbered and each bank's window boxed. **One look ends the argument** — it is
  `/nan map`'s rule applied to a texture instead of a framebuffer: measure the buffer, do not
  reason about it. It also proved the jet bank was drawing a burn and not arcs, which ruled out
  the obvious hypothesis before any of it was changed.
- **AN UNRELATED `npm i` USED TO BREAK `check:boot`, AND IT FAILED LOOKING EXACTLY LIKE THE
  BUG IT CATCHES.** `wear.mjs` writes the bare-`three` shim that `vendor/GLTFLoader.js` needs;
  installing anything at all rewrites `node_modules` and takes it away, and the gate then dies
  with a module-not-found that reads as a blank page. `boot.mjs` writes its own shim now. **A
  gate that cries wolf after an unrelated install is a gate nobody runs.**
- **THE JETPACK PUTTS, IT DOES NOT JET (`JET.every`).** A continuous stream is a shader effect;
  a rhythm of discrete puffs is drawn animation, and that is the difference between a motor and
  a jet of gas. The FIRST card is the ignition bank, every one after it is `puff` — the same
  drawings three frames in, so the crack is not played twice. They come out of the PACK's own
  world position (`gear.jet` knows where it is) and are thrown down and behind him, because a
  puff that hangs where it was born reads as a sticker rather than as exhaust.
- **`city.slash({roll, r, y, size})` FIRES ONE AND LETS HIM LOOK AT IT.** The melee marks came
  out "turned, and only going to the side instead of in front of him" — **which is the second
  game in a row that has happened in**, and both times the fix was to look at one and adjust,
  because what is being matched is what the ANIMATION looks like and not where a bone went.
  There is nothing to derive. So there is a way to fire one on demand without throwing a punch
  first, and it prints the numbers to keep. `roll` is SCREEN-space radians (0 = horizontal);
  `MELEE.fxR`/`fxY` are where it sits, as fractions of his height.
- **THE KIT IS ONE BUTTON, NOT THREE (`KIT`, the key where Board used to be).** A phone has two
  thumbs and a HUD full of keys is a HUD you cannot play through, so Plutopia's arrangement
  ports whole: **TAP** and the thing in your hand goes on or off, **PRESS AND HOLD** and the
  rest of the kit fans out round it on an arc — slide onto one, let go, that is what you have.
  No second tap and no lifting off in between.
  **The whole gesture is ONE pointer stream on the key, captured**, so the slots never receive
  an event of their own: the thumb is OVER the arc rather than on it, and hit-testing the
  rects is what "over" means. **By TRUE DISTANCE, because they sit on an arc** — the
  horizontal-gap test that is right for a row picks the wrong slot on a curve, where two of
  them can share an x. Sliding back onto the key keeps whatever was marked, so there is never
  a moment where letting go does nothing and you cannot tell why, and opening highlights what
  is already in his hand so it reads as a branch rather than an empty menu.
  **A ring winds round the key while the hold counts**, because a long press and a slow tap are
  otherwise the same thing right up until one of them surprises you.
  The board keeps its own code path — it is a whole locomotion mode, not a held object — so
  the key routes to `toggleBoard` for that slot and to the gear for the rest.
  **`KIT.on` HAS EXACTLY ONE OWNER, AND c84 GAVE IT THREE.** It means "the CURRENT slot is
  deployed". `toggleBoard` and `dropBoard` were also writing it, and they mean "he is on a
  skateboard" — two different facts sharing one variable, which went wrong three ways at once
  and looked like three separate bugs:
      * equipping the blaster WHILE ON THE BOARD called `toggleBoard` to dismount, which then
        set `KIT.on = 0` and un-equipped the thing just equipped;
      * `dropBoard` runs on every knock-down — a car, a bullet, a bail — so being hit put the
        blaster or the jetpack away;
      * and `gearShow` reads `KIT.on`, so whatever WAS visible went invisible on that press,
        which reads as "I picked the blaster and it took the jetpack away".
  **The board's deployed state is DERIVED, never mirrored**: `kitOut()` returns `player.board`
  for that slot and `KIT.on` for the rest. One fact, one place.
  **The chip says what is in his hand** (`· blaster OUT` / `· blaster away`), because "the
  blaster doesn't work" and "the blaster is not equipped" are different bugs that look
  identical from a phone. **And the charge ring shows dim the moment it is out**, not only
  while charging — a pad that looks identical armed and unarmed is a control nobody finds, and
  an invisible control reads exactly as a broken one.
- **THE BLASTER'S TRIGGER IS A FULL PULL, HELD (`WEAP`, `stepAim`), AND ALL FOUR GATES EARN
  THEIR KEEP.** Plutopia's, whole, because each one rules out a different way of firing by
  accident and dropping any of them brings that way back:
      fireAt  .80   how far up the pad it arms -- a nudge cannot reach it
      keepAt  .50   and how far back DOWN to stand down. The GAP is hysteresis: a thumb
                    rolling inward as it lifts must not cancel the shot you meant, and
                    without it a full pull only fires from exactly full stretch
      armT    .10   how long it has to be up there -- a flick to the top and straight back
                    is not a shot however far it went
      fireArc 1.05  how far off straight up it may be and still be a trigger
  **That last one is what lets this share a pad that is already full.** A tap is still a jump
  (`far` never reaches .80), a hold near the middle is still the sprint and the charge-jump,
  and only a deliberate push UP is the trigger. **While charging, left and right STEER him** —
  the whole pad becomes the aim once it is committed, which is what makes "hold up, sweep,
  let go" one gesture instead of three.
  **`stepAim` RUNS BEFORE `stepPlayer`**, so a thumb holding a charge is not also read as a
  sprint. And **the melee flick had to be gated on it**: the trigger is a long push up, which
  travels far enough and fast enough to arm the flick detector too, so without `p.aim` every
  shot also threw a punch.
  **WHEN THE RIG HAS THE JOINT, USE THE JOINT — AND CHANGE NOTHING ELSE.** That is what
  happened with the police pistol at c86 and it ended two builds of nudging in one line: the
  officer's export grew `weapon_root`, `pistol.glb` is built round the same node, so the
  alignment is ALREADY DONE and the right answer is to parent with identity and apply no
  scale, offset or rotation at all.
  `weapFit` looks for `weapon_root` on whatever skin is worn, every time one is worn, and
  takes it the moment it appears — **so the export that adds it needs no code change**. Until
  then `WEAP.fit` is the hand offset and `WEAP.len` the size, which is the only honest thing
  to do when nothing in either file says where the grip goes. `city.weapFit()` re-applies both,
  and **the chip says `· NO WEAPON JOINT`** while it is still hand-placed, because "it is in
  the wrong place" and "his rig has no joint yet" are different problems that look identical
  from a phone. `WEAP.clip` is the hook for a shoot animation the day there is one.
- **A WEAPON FILE'S OWN RIG IS NOT THE WEARER'S, AND APPLYING BOTH IS WHY THE BLASTER WAS
  INVISIBLE (`npm run gun`).** `blaster.glb` is `Scene > Armature > weapon_root > mesh`, and
  that Armature carries the hundredth scale every one of these exports has. `attachGear` cloned
  the WHOLE SCENE and `weapFit` parented it onto Colin's `weapon_root` — which is already inside
  HIS hundredth-scaled armature — so the 0.01 was applied twice. Measured through the real
  loader against the shipped `measureSkin`:
      blaster.glb is 0.730 m in its own file
      (a) whole scene onto the joint      0.9 cm   1/184 of a 1.71 m man
      (b) neutralised above weapon_root  93.0 cm   54% of his height, a carbine
  **The chip said `blaster OUT` and it WAS out.** Nine millimetres wide, which from a phone is
  indistinguishable from never having loaded — and the muzzle flash comes off `weapon_tip`, a
  BONE, so the shots, the charge ball and the bolts all kept working and hid it.
  **THE POLICE PISTOL NEVER HAD THIS, AND THE DIFFERENCE IS THE WHOLE LESSON.** `buildCops`
  takes the MESH off the joint and adds that, so it only ever carried the transforms BELOW
  `weapon_root`. Two mounts in one file for the same idea and only one of them right; the fix
  makes the blaster agree with the pistol. One matrix, computed in `attachGear`: the inverse of
  the file's own chain down to `weapon_root`, so that node lands at identity and the art sits
  exactly where the joint says. `fitOne`'s hand fallback is untouched — it normalises by
  bounding box and overwrites the transform anyway.
  **"As authored" means PROPORTIONAL TO THE WEARER, not absolute**: 0.730 m becomes 0.930 on
  Colin because his armature is 1.273x (he is scaled up to `COLIN_HEIGHT`). That is the same
  arithmetic the pistol does on an officer at 2.016x, and `WEAP.fit.s` + `city.weapFit()` is
  the dial if the art wants shortening.
  **AND THE TOOL'S FIRST ANSWER WAS 73 METRES, WHICH IS WORTH WRITING DOWN.** It computed the
  neutralising matrix AFTER unparenting the group — and three does not clear a `matrixWorld`
  when you unparent, so the wearer's own scale leaked into the inverse. `attachGear` computes
  it at LOAD time on a fresh clone that has never been parented, and the harness has to do it
  at the same moment or it is measuring a state the game never has.
- **THE AIM IS A TURN STICK AND THE CAMERA EASES IN BEHIND IT — PLUTOPIA'S, AND c84..c101 HAD
  NONE OF IT.** *"When you hold up on the right stick he needs to aim down the sight and the
  camera needs to be centered on what he's aiming at. Right now holding up just makes him — I
  don't know how to describe it."* What shipped was `p.heading -= sx * aimTurn * dt`: a raw
  rate straight onto his heading with the camera left pointing wherever it already was. The gun
  swung and the picture did not, so there was never anything centred on anything.
  **IT IS ONE FEEDBACK LOOP AND EVERYTHING FALLS OUT OF IT:**
      the stick is read in the camera's LIVE frame, never one latched when the aim began;
      the camera eases in BEHIND that aim at `camEase`, capped at `aimTurn`;
      so an off-centre stick SWEEPS him round at a rate set by how far off centre it is, and
      returning the stick to centre stops the sweep and leaves him facing the new direction.
  Latched instead of live, the frame is whatever he was facing when he raised the gun and it
  never moves — pushing right swings the aim right and releasing hands him back the original
  forward. **A turn is never a turn, only a lean he has to keep holding**, which is exactly the
  thing he could not describe.
  **ANY direction past `aimAt` turns him** — that is how you look around with the gun out — and
  only a push within `fireArc` of straight UP arms a shot. One control, two jobs.
  **AND THE CAMERA HAS TO LET GO OF THE PAD (`p.turning`).** `stepCam`'s yaw drag on the same
  thumb in the same frame is two writers fighting over `cam.az`; the loop never settles and the
  picture shakes. It stands down while the aim is live.
  **`p.heading` LIKEWISE HAD TO BE GATED ON `turning`, NOT `aim`.** The pad steers from
  `aimAt` onward, well before the trigger arms, so gating on `aim` let the left thumb overwrite
  the heading for the whole of the look and the camera eased onto a bearing his body was being
  pulled off.
  **THE ONE THING THAT DOES NOT PORT IS THE ANGLE FORMULA, AND IT WOULD HAVE BEEN A HALF TURN
  OUT.** Plutopia's `cam.az` is the bearing from the player TO the camera; City's is the
  direction the camera LOOKS — which is why its step reads `cd = (aimH + PI) - cam.az` and
  City's reads `cd = aimH - cam.az`. Copying its `atan2(sa*ry + ca*rx, ...)` across would have
  had him aiming behind himself. The stick goes through **City's own `stickWorld` mapping**,
  the convention this file already has. *Two engines' camera conventions are not interchangeable
  even when the mechanic is.*
- **THE LOCK IS AN ASSIST, NOT A LOCK, AND IT LIVES IN WHETHER SOMETHING LOCKS AT ALL.**
  `WEAP.lock` = `{ cone .38, range 44, pull 5.0, grab .58, taper .55, keep .55 }` — Plutopia's,
  with only `range` scaled (its 70 x .625; everything else is a fraction or a rate).
  A 22-degree cone is narrow enough that pointing at open ground locks nothing and the bolt
  goes exactly where the stick pointed. **But once the reticle is ON something the shot has to
  go to it**, or the mark is drawing a promise the gun does not keep, which is worse than no
  assist at all.
  **The target is chosen from the TRUE stick heading, never the corrected one.** Feeding the
  corrected heading back in is a loop: once the aim has swung onto something, the test for what
  to aim at is being made from a bearing already glued to it, and pointing the stick elsewhere
  cannot shake it off.
  **The ease ACCUMULATES while the aim is held** rather than being a fraction reapplied to a
  fresh stick reading each frame — that version leaves a held aim five degrees off the target.
  **And the bolt leaves on the eased heading, NOT the target's centre.** Snapping at the
  instant of firing makes every shot a guaranteed hit on whatever is nearest and the rest of
  the world unshootable.
  **Whatever is already locked keeps it on a wider cone and a discount (`keep`)**, so the mark
  does not flicker between two things standing shoulder to shoulder. Scored uniformly across
  police and cars rather than police-first: nearest-and-straightest is what the thumb is
  actually pointing at, and a priority order pulls the mark off the car in front of him onto an
  officer forty metres away.
  **THE RETICLE IS NOT DECORATION.** An aim assist you cannot see is one you cannot trust — the
  mark IS the promise, so it has to be on the thing before the shot leaves. Four ticks round a
  gap rather than a dot, because a dot on an officer at forty metres is one pixel and what has
  to read is WHICH THING is marked. `pointer-events: none` without exception: it sits in the
  middle of the play area.
- **WHILE THE GUN IS OUT THE RIGHT PAD IS THE GUN, AND NOTHING ELSE.** `p.rHold` is "how long
  that pad has been down" and it feeds the SPRINT — so holding the pad up to charge a shot was
  also winding him to x3 top speed while `stepAim` steered him with the same thumb. Aiming
  launched him across the street sideways: *"when you have your rifle equipped the locomotion
  gets all messed up, he gets locked in"*.
  **THE COMMENT ABOVE `stepAim` CLAIMED THE ORDERING ALREADY PREVENTED THIS** — "runs BEFORE
  stepPlayer, so a thumb holding a charge is not also read as a sprint". It does not and never
  did: `rHold` is counted in `stepFoot` off `stick.R.down` alone and has never once looked at
  `p.aim`. **A protection asserted only in a comment is not a protection**, and this file now
  has two of those (the other was `KIT.on`'s "one owner").
  The melee flick is already suppressed exactly this way in `boardFlick`, so this is the rule
  that pad already follows, applied to the meaning that was still leaking through. The charge
  jump stands down with it. **A tap is still a jump** — that is a separate event, not `rHold`.
- **`npm run gait` SAYS WHETHER A BORROWED GAIT CLIP FITS THIS BODY, AND IT IS TWO SEPARATE
  QUESTIONS.** *"It makes him go up and down really quickly"* has two causes that need
  different fixes, so guessing costs a round:
  1. **THE CYCLE RATE, WHICH HAS A CLOSED FORM.** A clip is time-scaled by `speed / ref`, so
     one cycle takes `dur * ref / speed` — which means a clip of a DIFFERENT LENGTH needs its
     own reference or the feet land at the wrong rate: `ref = GAIT.ref * (colinDur / thisDur)`.
     c98 typed both by eye and got **one error in each direction**:
         run    rifle 0.533 s vs run_fwd 0.667   -> ref 6.00, shipped 4.4   36% TOO FAST
         walk   rifle 1.333 s vs walk_fwd 1.067  -> ref 1.24, shipped 1.7   37% too slow
     The c100 export renamed and re-cut them, so every one is measured again and the tool now
     walks the whole set against whichever of Colin's own clips it has to sit beside:
         run 4.57   run aim 5.33   walk 1.24   strafe L 4.36 / R 4.57   ladder 1.98
     **The two strafes differ by 5% and get their own number.** Eyeballing one value here is
     exactly what produced two errors in opposite directions last time.
  2. **THE HIPS EXCURSION, WHICH IS THE EXPORT AND NOTHING ELSE.** A clip retargeted off a
     taller rig keeps the SOURCE's vertical travel, and the same centimetres on a shorter body
     read as a bounce. Measured against his own gait as the only reference that matters:
         idle   his 0.3 cm    rifle 5.5 cm    SEVENTEEN TIMES, on a clip where he is standing still
         walk   his 6.4 cm    rifle 8.5 cm
         run    his 6.7 cm    rifle 14.6 cm   more than double
     **AND HE FIXED IT AT THE SOURCE**: the c100 `rifle_run` bobs 3.9 cm, 0.6x his own run --
     so that half was the export, exactly as the tool said, and the idle is the one left
     (5.5 cm against 0.3, still 17x).
     **A reference speed cannot fix this** — the cycle rate is the clip's TIME and the bounce is
     its CONTENT. For a borrowed clip the remap is `tools/melee.mjs`'s job; for one baked into
     `colin.glb` the only honest fix is the export, which is what the tool says so nobody
     spends a build tuning a number that cannot reach it.
  **AND ITS FIRST RUN REPORTED A WALK CYCLE BOBBING SIX METRES.** The hips channel is not in
  geometry units: a skinned vertex is already near metres (GLTFLoader binds with the identity)
  but a BONE's translation lives inside the armature, which carries the hundredth scale. The
  tool multiplied by the model scale alone and was out by 100x. Same class as `Box3` against
  geometry bounds, one node up — measure the chain, never assume it.
- **THE AUTO-FOLLOW IS THE BOARD'S AND NOWHERE ELSE (c105).** It fired on speed alone, so it
  chased him round on foot too. *"When you run around the camera should not follow your
  direction — the character should run around freely and only the right stick orbits the
  camera. That is unique to the skateboard."* And the reason is the difference between the two:
  **a board goes where it points**, so the lens wants to be behind it and letting go of the pad
  should not leave you looking at its side. **On foot he turns on the spot**, in any direction
  the left thumb picks, and a lens that swings in behind every one of those turns means the
  world spins whenever he does. One condition — `player.board &&` — and the ground/air split
  inside it still holds.
  `stepAim`'s camera ease is NOT this and must stay: that is the aim loop, it only runs while
  the trigger pad is live, and it is the thing that centres the shot.
- **HOLDING A CHARGE HE IS BRACED, NOT AT EASE (`WEAP.aimPose`).** `rifle_idle_01` is the gun
  DOWN and him standing about, and that is what played while a shot spun up — with the sighted
  pose only appearing AFTER the release, when the shoot clip finally ran. **Exactly backwards**,
  and he said so: *"he's like looking down the sight of the gun, he should be, but he's not
  until you release the trigger."*
  **THE FIRST FRAME OF THE SHOOT CLIP IS THE SAME RIG ALREADY SIGHTED**, so trimming that clip
  to its first key gives the hold for free and IN REGISTER — the shot then continues from the
  very frame the hold was sitting on, so there is no seam at the release.
  **TRIMMED RATHER THAN PAUSED**, which is Plutopia's note and the reason this is a clip and
  not an action flag: a paused action still has a duration the mixer walks, and **one keyframe
  cannot drift**. `duration` is .1 rather than 0 because a zero-length clip on repeat divides
  by its own length.
  Built in `buildColin` BEFORE `buildSkin`, so it is in the pool before any skin clones it and
  every borrowed character gets it through `skinClips` unchanged.
  **AND IT ONLY APPLIES STANDING STILL.** Moving, it means nothing extra — the walk, the
  run-aim and the strafes already hold the gun up. So it is one line splitting the "not moving"
  share of the blend, in both branches, rather than a state: a weight like every other weight
  here, easing in and out with the rest instead of cutting.
- **AIMED, THE LEGS ANSWER THE ANGLE AND NOT THE SPEED — WHICH IS WHAT THE STRAFES ARE FOR.**
  The ordinary armed gait is the three-clip speed blend like any other. The AIMED one cannot
  be: while the trigger is held he faces the shot and travels wherever the thumb says (`plant`
  is zero, see below), so "how fast" no longer picks the clip — "which way, relative to his
  nose" does. Forward is `rifle_run_aim`, sideways is the strafe for that side, still is the
  idle, and the blend is `|cos|` against `|sin|` of the angle between travel and `faceH`.
  It falls straight out of the facing rule rather than being a second system.
  **+X IS HIS LEFT**, so a positive sine is a strafe to the LEFT — heading grows +Z toward +X
  and his right is `(-fz, fx)`. Written down because that argument comes out backwards half
  the time.
  **THE GAP IS BACKWARDS (`WEAP.aimBack`, empty).** There is no backpedal clip, so retreating
  under aim plays the forward one and the feet go the wrong way. Same hook and same reason as
  `GAIT.sprint` and `HANG.clip`: name a clip and it blends in.
- **THE LADDER HAS ITS OWN CLIP NOW (c100), AND ITS RATE COMES FROM THE RUNGS.** `climb_ladder`
  replaces four builds of `walk_fwd_neutral` quickened. The time scale is NOT typed: one cycle
  is one hand-over-hand pair, so it covers `LAD.cycle` rungs of `LAD.rung` metres and plays at
  `speed * clipLen / rise` — which puts his hands on the bars at whatever climb speed is set
  and survives a re-export of any length. `LAD.cycle` is the one dial if the feet skate.
  **`LAD.speed` (3.8 m/s) asks for x4.6 and is capped at `tsMax`**: that is a genuinely fast
  climb and the clip cannot sell it, so the clip leads and the last of the speed is bought
  honestly rather than as a blur. `LAD.fallback` is what it uses if an export drops the clip.
- **HOLDING A SHOT, HE FACES THE SHOT — AND THAT IS THREE CHANGES THAT ARE ONE IDEA.**
  `stepAim` turns `p.heading` with the pad, so while the trigger is held: the left thumb must
  not also write `heading` (two writers, whichever ran last wins the frame); `faceH` comes
  round at the ON THE SPOT rate rather than the running one, because a man levelling a rifle
  turns to face it rather than leaning into it over two seconds; and **`plant` goes to zero**.
  `plant` is what swings the velocity onto his facing as he speeds up — right for running and
  exactly wrong here, since it would drag every step round to point down the barrel. At zero he
  goes where the thumb says while facing the shot, which is a STRAFE, and
  `rifle_strafe_left/right` are already in the pool for the day they are drawn.
- **THE CHIP SAYS HOW BIG THE GUN ACTUALLY IS (`gunSize`), IN CENTIMETRES.** "Still no blaster"
  is THREE bugs wearing one face and they are identical from a phone — it never loaded, it
  loaded at the wrong size, or it is the right size in the wrong place. c98 fixed one of them
  (nine millimetres, the armature scale applied twice) and nothing on screen could say whether
  that was the one. Now:
      · NO BLASTER GLB   the file never arrived
      · gun1cm           still double-scaled
      · gun93cm          right size, so the fault is placement or culling and not this
  Same rule as `cloud0` / `cloud28 vis0` / `env0`: **put the number that tells them apart on
  the screen, because a console warning is invisible on a phone.**
- **THE KIT IS THREE PLAIN KEYS IN A ROW NOW, NOT A RADIAL MENU.** The fan was one button doing
  two jobs — tap to toggle, press-and-hold to choose — and *"let's just get rid of the Swiss
  Army button thing"*. A long press is a gesture you have to be told about; three keys say what
  they are by being on screen. One tap: press the key for what you want, and if it is already
  what you are holding the press puts it away.
  **THEY GO ABOVE THE STICKS, AND THAT IS ARITHMETIC RATHER THAN TASTE.** The pads are 132 px
  wide and sit 20 px from each edge, so on a phone there is about **110 px** between them —
  which will not hold three keys at any size worth pressing. The band over them is empty and
  both thumbs reach it.
  **`body.title #kitRow .key{pointer-events:none}` IS LOAD-BEARING.** `body.title .key` fades
  every key out on the card, but `#kitRow .key` wins on specificity for `pointer-events`, so
  without it three invisible buttons sit over the title screen taking thumbs — the `#startB`
  landmine one element over.
- **`npm run joints [glb ...]` ANSWERS "DOES THIS RIG CARRY A WEAPON JOINT" IN A SECOND.**
  "I can't remember if I added that blaster with the joint rigs or not" is a question the file
  answers, and guessing at it cost two builds of hand-nudging. It reports `weapon_root` /
  `weapon_tip`, what they hang off, and the muzzle offset — **which is the BARREL AXIS**, so it
  also says which way the gun points. With no argument it sweeps `models/` and `models/chars/`.
      blaster.glb        weapon_root at the armature, tip -0.562,0,0.099  -> barrel along -X
      pistol.glb         tip -0.233, 0.008, 0.054                         -> barrel along -X
      police_officer     weapon_root on mixamorig_LeftHand, tip +0.233    -> barrel along +X
      colin.glb          weapon_root on mixamorig_RightHand, tip -0.562,0,0.099 (c96)
  **And it says whether two files AGREE**, which is the whole question when a weapon is meant
  to drop onto a character with no placement: equal, or equal with X mirrored (a left hand
  against a right). The officer and his pistol read 0.015 apart on a 0.24 barrel — **six per
  cent, the same joint exported twice** — so the tolerance is a tenth of the barrel, not two
  per cent of it. A tolerance that called that pair "no" would have sent me back to nudging.
- **THE BLASTER IS PLUTOPIA'S, PORTED — AND c84 SHIPPED A PARAPHRASE OF IT, WHICH IS NOT THE
  SAME THING.** One flat sphere and a slash mark where the original is: a HEAD that is a stack
  of three additive sprites (violet corona, cyan body, white-hot core) so it reads as a ball
  wrapped in haze rather than a disc; a COMET TAIL of six shrinking sprites down its own −Z; a
  CRACKLE of seven hot pips thrown to new places every frame with half of them dark, which at
  thirty frames a second is what electricity looks like for the cost of moving a few sprites;
  and a TRAIL of twelve sprites left at WORLD positions along the path, so the shot draws a
  streak of cooling plasma behind it rather than only carrying a comet with it.
  **A CHARGE BALL WINDS UP AT THE MUZZLE** (`stepChargeFx`) — core, halo, five motes on a
  SHRINKING spiral and three flickering licks. That the spiral closes in is the whole read: it
  says the shot is getting bigger without a number on screen.
  **NOT PARENTED TO THE BONE.** The bone is in the skeleton's 0.01-scaled space and a sprite
  hung off it inherits a scale that depends on how big the model happened to be. It rides in
  WORLD space at the muzzle, sized in metres like the bolt it becomes.
  **NO LIGHT ON THE BOLT.** Adding and removing a `PointLight` relights every material in the
  scene, and a shot a second would recompile the world mid-stride. The bursts carry the flash.
  **TWO HALF-STEPS PER FRAME.** At fifty metres a second a whole frame is most of a metre,
  wide enough for a bolt to pass clean through a police officer.
  **A MUZZLE FLASH IS TWO BURSTS AND A LANDING IS SIX** — hot and small over cool and wide,
  plus a scatter of sparks. A single sprite going out is a dot; the stack is what makes it
  read as a detonation.
  **EVERY LENGTH IS PLUTOPIA'S TIMES .625**, because its alien is 2.8 m and Colin is 1.75:
  speed 76→48, rad 2.2→1.4, ride 2.6→1.1, climb 44→28, grace 1.8→1.1. **`zaps` and `trail`
  are COUNTS, not lengths**, so they come over unchanged. A borrowed effect only reads the
  same if it keeps its relationship to the body that fires it.
  **And `JET.up` keeps its RATIO to gravity, not its value** — 46 against 32 there is 1.44, so
  28.8 against this game's 20. A number copied across two different gravities means something
  else.
- **THE JETPACK'S FIRST PUFF IS THE BANG.** `jet` starts at frame 0 of the sheet — the crack —
  and every one after it starts at the flame (`puff`). That is the ignition and the
  putt-putt-putt after it, and it is the whole shape of the effect; without the distinction it
  is one drawing flickering. The scatter is a random angle and radius about him, because a
  column of cards stacked on one spot reads as one card.
- **`FX.t` ADVANCES AT THE TOP OF THE FRAME.** It used to tick inside `fxStep`, at the END, so
  every card spawned during the frame was born a sixtieth of a second in the future — `vAge <
  0.0` discards, and the frame that got dropped was the first one: the spark.
- **A COP IS A SOLID, AND HE WAS NOT ONE AT ALL.** `gridQuery` is the static grid, built once
  at load, so an officer who walks is not in it — which is why you stood inside them. The box
  goes on the cop and is handed to the PLAYER's collider every frame the way a car's is: same
  code, no second path. **`yaw` is left OFF** — `resolveBoxes` would test him in his own frame
  like a car, and a man is round; an axis-aligned box the width of his shoulders is closer to
  the truth than an oriented one that swings as he turns.
- **AND THE PUNCH WAS MEASURED FROM THE WRONG POINT.** `copsPunched` was handed the SLASH
  MARK's position — already a metre in front of his chest — and asked for anything within
  reach of THAT, in front of THAT. An officer standing right on top of him is BEHIND that
  point, so **the one case that matters most failed every time**. It is a cone about the
  PLAYER now, `MELEE.arc` wide, with anything inside `COP.r` hit whichever way he is pointing,
  because that close there is no meaningful direction left.
- **THE ROLL IS A SCREEN-SPACE ANGLE AND THIS CAMERA ORBITS — WHICH NO PER-CLIP CONSTANT CAN
  EVER FIX.** Plutopia's camera keeps a fairly constant relationship to the player, so a fixed
  roll reads there. `cam.az` here swings the whole way round, so **the same constant means a
  different thing on screen every time you turn the lens** — which is exactly "sometimes
  vertical, sometimes horizontal, never going the way the blow is going".
  So the swing is PROJECTED (`slashScreenRoll`): two points a metre apart along the blow,
  through the real camera matrix, and the angle between them in NDC is which way the punch
  travels ON SCREEN. The crescent is drawn bulging along +X, so rolling it to that angle puts
  its leading edge where the fist is going, from any camera angle, **by construction**.
  `SLASH.roll` stops being an absolute and becomes a per-clip OFFSET from it — which is what
  it was always trying to be.
  **When the blow comes straight at or away from the lens** the projection is near zero and its
  angle is noise, so the offset takes over with a `spread` of scatter — correct, because a
  punch thrown directly away from you has no direction on screen to lie along, and a FIXED roll
  there reads as welded: three punches in a chain leaving the identical mark in the identical
  place.
- **AND THE SIZES NEEDED THE .625 TOO, WHICH c91 FORGOT.** `SLASH.r` is a LENGTH IN WORLD
  UNITS, so copying Plutopia's 1.9 verbatim put a 2 m crescent beside a 1.75 m man. Its 1.6 is
  .57 of its 2.8 m alien; 1.5 on Colin is .86 of him — **half again too big**, which is most of
  what "not lined up" actually looks like on screen. Scaled: r 1.19, strike .94, slide 1.13.
  **Every borrowed length needs the scale; only counts and fractions come over raw.**
- **THE SLASH MARKS NEEDED PLUTOPIA'S NUMBERS, NOT APPROXIMATIONS OF THEM.** c80 shipped
  life .2 against .24, r 1.5 against 1.9, peak .92 against .9, rolls −.28/−1.0/.4 against
  −.25/−.95/.35 — close enough to look deliberate and wrong enough to read as "turned". And
  the PLACEMENT was picked rather than derived: Plutopia draws at `MELEE.reach * .62` out of a
  3.4 reach on a 2.8 m body (= **.753 of his height**) and `RIG.height * .58` up; mine were
  .95 and .62, a mark half a body too far out and too high. The contact fractions are its
  `MELEE.hit` too — .32/.48/.31/.19, measured there against these same alien clips.
- **THE BOLT RIDES THE GROUND, IT DOES NOT FLY A LINE (`BOLT`, `stepBolts`).** `ride` metres
  over whatever is under it, climbing at `climb` and settling at `fall`, so a shot goes over a
  kerb and down into a dip and carries on instead of burying itself in the first thing that is
  not flat. A slope steeper than it can climb still stops it, which is right — plasma should
  splash on a wall.
  **A ZAPPED CAR NEEDED NO NEW CASE ANYWHERE IN THE TRAFFIC RULES.** `car.zap` caps its speed
  at zero for `BOLT.stun` seconds and that is the whole mechanic: a stopped car is exactly
  what `blocked` and the stuck failsafe already know how to route round. One field.
- **THE JETPACK (`JET`, `stepJet`) HANGS OFF THE SPINE BONE, FOUND BY PATTERN.** Every skin
  here is a Mixamo rig but they do not all spell the spine the same way, and a name that is
  merely absent gives a silent no-jetpack rather than an error, so `JET.bone` is an ordered
  list of patterns and the earliest match wins.
  **`up` is deliberately over `MOVE.g`** so he climbs while it burns, and `cap` is what stops
  that being a launch: it is a ride.
  **HOLD THE PAD AND HE FLIES, WHEREVER THE THUMB IS.** The first version also wanted the
  thumb near the middle, which is the wrong test twice over: `stick.R.far` is a HIGH-WATER MARK
  for the whole touch, so one look would have killed the thrust for the rest of it (the bug
  that held the sprint at 9 m/s for three builds) — and even the *instantaneous* magnitude
  fights the camera, because that pad is still the look and you cannot fly and see where you
  are going at once. The gate is just "held past the tap": a TAP still jumps, a HOLD flies, and
  a drag does both, which is what flying wants.
  **AND IT REPLACES THE DOUBLE JUMP.** One thumb cannot mean both — a tap in the air would
  spend the second jump on a flip at the exact moment the hold is meant to be lighting the
  motor, and the two would fight every time you flew out of a jump. While the pack is out the
  second jump is simply not there: the pack IS the air move.
- **EVERY PIECE OF KIT IS PARENTED TO A BONE, AND THAT IS RIGHT HERE FOR THE REASON THE TITLE
  CARD'S BOARD IS NOT.** The board is hung off the hand's WORLD MATRIX because there is no
  holding clip and it has to be placed, scaled and turned by hand every frame anyway. A piece
  of kit is authored to be held, and parenting means it follows every clip for free — the arm
  swing of the run, the tuck of a flip — which a world matrix would have to be told about.
  The 0.01 armature scale is not a problem as long as the thing hung on it is **sized in the
  BONE's units**, which `fitOne` measures off the geometry and divides, the skateboard's rule.
  **And the model is re-centred on its own bounds first**: the blaster's origin is not its
  middle (geometry −74.9..25.0 on X, barrel along −X), so without that the offsets would be
  nudging a point outside the model.
  **`wear` calls `gearRehome`.** Every character owns his own root, so a piece parented to
  Colin's hand stays on Colin's hand when the robot walks on — which reads as the gun being
  left behind on a man who has gone.
  **`weapFit()` is NOT called at load time**: the gear finishes loading three awaits before
  Colin does, so there is no hand to hang it on yet. `wear` is the one place that knows.
- **TWO VOICES, AND FREDOKA WAS NEITHER.** *"The fonts we've chosen, they're very like, I don't
  know, three year-old."* He is right and the diagnosis is specific: Fredoka is a ROUNDED
  friendly face — soft terminals, wide counters, no edge — and against spray-paint key art it
  reads as a children's app. **The art carries the personality, so the HUD does not have to
  shout; it has to look like it belongs on the same poster.**
      --disp   BUNGEE             urban signage: squared, heavy, made to be read small and
                                  from an angle. The street voice, and it goes on the FEW BIG
                                  THINGS -- the start button, the update pill, panel headings,
                                  the build number -- where there is room for personality.
      --ui     BARLOW CONDENSED   does the work: keys, labels, chips, the speedo. Condensed is
                                  the POINT -- `JETPACK` has to fit inside a 58 px key and the
                                  build chip has to carry `c104 · 29 FPS · 203 DC · ★★ ·
                                  JET OUT · JAM 117@430,178` on one line of a phone.
  **BUNGEE IS WIDE AND THE SIZES HAD TO COME DOWN TO PAY FOR IT.** `SHREDWORLD` is ten heavy
  squared letters; at the old 38px with .18em of tracking it overflows a phone. Every place the
  display face landed lost a few points and nearly all of its letter-spacing. A display face
  swapped in at the previous size is a display face that overflows.
  **`display=swap`**, so a font on a slow connection can never hold the first paint.
  **And the poster's palette is in `:root`** (`--hot`, `--sun`, `--sky`), so the HUD and the art
  are the same object rather than two designs sharing a screen. The keys and the button take a
  **flat bottom edge** rather than a soft halo, because the poster's letters are drawn with a
  hard shadow under them and a blur sits in a different world from that; pressing one takes the
  edge away, which is the whole animation and costs nothing.
- **THE WORDMARK IS ART, NOT TYPE (`TITLE_ART`).** `images/shredworld_title_02.png` — drawn,
  outlined, spattered, with a planet in the O. No font sets that, so the card stopped trying:
  the DOM `<h1>Skate<i>City</i></h1>` is an `<img>` now. `shredworld_title_01.png` is the other
  cut and `city.TITLE.art` is not the switch — it is the `TITLE_ART` constant, one line.
  **IT IS CAPPED IN BOTH AXES.** The art is 2129x739, near 3:1, so sizing on width alone puts
  it off the top of a landscape phone; `width: min(92vw,720px)` with `max-height: 34vh` is what
  makes one rule cover both ways round.
  **It is fetched on the same breath as the splash**, at the top of the module rather than when
  the card appears, so it is decoded and waiting when the boot card lifts instead of popping in
  a beat late.
- **THE SPLASH (`BOOT`, `images/splash_screen_01.png`) IS THE LOADING SCREEN, AND THE ONLY REAL
  DECISION IN IT IS `min`.** His key art — 941x1672 portrait, the SHREDWORLD wordmark, Colin
  over a ramp with the officer and an alien. Three things:
  0. **IT IS THE WEBP (c106): 2.65 MB -> 270 KB for the same picture**, on the one asset that
     is first on the wire and the first thing anybody looks at. The PNG stays as `BOOT.png` and
     is worth its two lines — a phone that cannot decode WebP would otherwise show a blank card
     for the whole load, and blank is indistinguishable from a bug.
     **The wordmark is still a PNG** because it needs the alpha; lossy WebP with alpha at ~1200
     wide would take its 2.09 MB to about 80 KB the same way.
  1. **IT FADES IN AND NEVER BLOCKS THE FIRST PAINT.** 2.65 MB is not something to hold the
     first frame on. The gradient and the bar are up immediately the way they always were, and
     the poster arrives over the top whenever it arrives. The fetch is started at the TOP of
     the module rather than in `init()`, which is three awaits and fifteen megabytes of GLB
     away — this is the first thing anybody looks at, so it should be on the wire first.
  2. **`min` (1.5 s) EXISTS BECAUSE A CARD THAT FLASHES PAST IS ONE NOBODY SEES.** On a warm
     cache the whole load can be under a second, and a splash that is gone before the eye
     reaches it is indistinguishable from never having been added — which is the same failure
     as the sky shipped at .55, three builds running. It is timed from the moment the art is
     LIT, not from page load, so a slow arrival is not also a long wait afterwards; and a hold
     is skipped entirely if the art never came, because a blank hold is only a delay.
  3. **`object-position: 50% 28%`, ABOVE CENTRE.** The art is portrait and its wordmark is at
     the top; a landscape phone crops the vertical, and centred it would take the logo off.
  The bar and the message sit UNDER the art on a scrim rather than across it, so they never
  cross a face, and `#bootH1` ("City") is only the stand-in until the art lands — it fades out
  when the poster carries its own wordmark. **`images/` is in `bump.mjs`'s `DIRS`**, so the
  splash goes through `A()` and a repaint under the same filename actually arrives.
  **THE ART SAYS SHREDWORLD AND THE TITLE CARD SAYS SKATECITY.** Not resolved here — the card,
  the `<title>`, the manifest and the icons all still say City.
- **THE TITLE CARD IS THE GAME, NOT A SECOND SCENE (`TITLE`, `titleFrame`, `camAim`).**
  Plutopia builds a whole disposable planet for its card (`DIO.*`) because its world is
  procedural and the shot wants something that does not exist in play. This one already has
  the shot in it — he is stood in the street with his deck, the traffic is running, the clouds
  are going over — so the card is **the ordinary scene, the ordinary post chain, a different
  CAMERA**, and the DOM is only type on glass. The player is the one thing suspended, and only
  because he is being posed rather than driven.
  - **He stands where he SPAWNS, so START is a camera move and not a teleport.** The street on
    the card is the street he starts in. That is the whole reason to do it in the live scene.
  - **THE SHOT IS AIMED, AND THE BEARING IS MEASURED.** The spawn is the farm edge: nothing
    near it is over 11 m. The eight buildings over 14 m are all downtown, centred on
    (245, 67), which from (−100.8, 0) is **atan2(345.8, 67) = 1.379 rad, 352 m out**. At that
    range a 51 m tower stands 8.2° up and `FogExp2(.0021)` leaves it 42% hazed — a skyline on
    the horizon, which is the look. `az` is 1.34 rather than 1.379 so the ±.26 sway cannot
    push it off the near edge: **a phone held PORTRAIT has only .24 rad of half-frame across**,
    against .77 in landscape.
  - **THE SUN IS NOT IN FRAME AND CANNOT BE.** `LIGHT.sunDir` is 1.004 rad round — near enough
    the same way, which is why he reads as backlit — but **57° UP**, against a lens that sees
    to +21°. Craning up to find the disc points the camera at nothing but sky. The "sun" here
    is the warm part of his painted panorama behind the skyline. **Do not chase the disc.**
  - **A HELD SHOT THAT SWAYS, NEVER AN ORBIT** — Plutopia learnt that one expensively. Half a
    full turn is spent round the back of the subject, so the composition the card exists FOR
    is on screen half the time and you are never looking at the good frame.
  - **THE DECK IS HUNG OFF THE HAND BONE'S WORLD MATRIX, NEVER PARENTED TO IT.** There is no
    holding clip — `idle_neutral` just has his arms down — so `titleBoard` reads
    `mixamorig_RightHand` each frame. Adding the board as a CHILD of a bone is the trap: his
    armature is scaled 0.01, so it would come out a hundredth of its size. Euler `YXZ` is
    `Ry·Rx·Rz`, so the X term stands the deck up (its length is on local Z) and the Y term
    then swings it with him — that order is what keeps it vertical whichever way he faces.
    It stays in his hand THROUGH the descent and goes away when the camera arrives; dropping
    it on the press pops it out of frame dead centre, the one moment he is looking at it.
    **The hook for "he starts on the board" is one line in `startGame`.**
  - **CHANGING CHARACTER IS A CHANGING OF THE GUARD (`PARADE`).** The one you have walks out of
    frame and the one you picked walks in from the other side. That is why **every skin owns
    its own root group, always in the scene** — one shared root can only hold one character,
    and for a second and a half there are two of them on the street. `colin.root` is an alias
    for whichever root is current, so `poseColin` never learns any of this happened, and each
    skin keeps its own mixer, actions AND clip weights (`skin.cw`) so switching back is
    instant; a shared weight table would tell the new skin's idle it was already at 1.0 while
    its action sat stopped at zero.
    **A FIXED DURATION, NOT A FIXED SPEED, AND THE GAIT FALLS OUT OF IT.** How far off screen
    is a MEASUREMENT — `tan(fov/2)·aspect·dist` — and it is four times bigger in landscape
    than in portrait: **3.7 m against 10.9 m**, which at one speed is 1.3 s against 3.8 s, and
    a menu that takes four seconds to answer is a menu you stop using. Pick the time, derive
    the speed, and blend walk into run on `GAIT`'s own thresholds: 2.5 m/s and a brisk walk in
    portrait, 7.3 m/s and a full run in landscape, both clips time-scaled so nobody's feet
    slide. A typed 6 m would have him stroll to the middle distance and stop there.
    **The motion is LINEAR**, for the same reason — the clip is scaled to the speed, so easing
    the ends is the feet sliding. The arrival is sold by the turn to camera and the blend.
    **Every walker is independent**, with its own from/to and clock, so tapping through four
    characters is four people crossing rather than four hard cuts: a new pick turns whoever is
    walking IN into somebody walking OUT *from where he has got to*, and never teleports.
    **The deck stays on the mark.** There is one board and handing it between two people ten
    metres apart is a teleport, so it stands itself up on the road and waits for its rider.
    **Swipe listens on `window` with capture**, because `#title` is `pointer-events: none` by
    design and must stay that way — it can never be allowed to eat a thumb. A swipe LEFT pulls
    the next one in from the right, the way every row of things on a phone works; the chips
    take their direction from where they sit in the row, so picking one to the right always
    slides the row left. Arrow keys do the same. `pickChar` is the one entry point and lights
    the chip on the press rather than when the bytes land — `want` is what you asked for,
    `cur` is who is actually standing there.
  - **THE START BUTTON IS THE AUDIO GESTURE, and that is worth more than the button.** A
    browser will not build an `AudioContext` outside one, so until c65 his first ollie was
    also the thing that started the decode. Now the fetch, the decode and the theme all land
    on a press he was always going to make.
  - **`pointer-events` goes on `#title.on`, never on `#startB`.** An invisible button over the
    boot card is still a button: it started the game underneath the loading screen.
  - The build badge deliberately stays visible on the card — it is how he tells one build from
    the one before it, and it is wanted MOST on the first screen.
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
  **`GAIT.sprint` IS THE HOOK FOR A SPRINT CLIP AND IT IS EMPTY UNTIL THERE IS ONE**, written
  the same way `GAIT.windUp` is: name a clip and `colinAnim` blends it in over `run_fwd` past
  `sprintAt` on its own reference speed, and the run clip gives way rather than being stretched.
  Until then `run_fwd` is time-scaled and `tsHi` (2.9) is the ceiling — at a 27 m/s sprint the
  clip wants **5.6x** and gets 2.9, so the feet do slide at the very top. A run played at 5.6x
  is a cartoon scramble, so the cap is deliberately short of keeping up and **the camera is
  what sells the speed instead**. A real sprint clip is the honest fix and it is one word here.
- **THE SPEEDO SAT ON TOP OF THE BUILD CHIP AND ATE WHAT THE BUILD CHIP IS FOR.** `#build`
  grows with whatever `missing()` has to say — `NO CLOUD GLB`, `NO COP GLB`, `JAM n@x,z` — and
  a centred `#speed` overlapped exactly that tail, so in the one screenshot that ever reported
  a jam the coordinate was unreadable. The speedo moved down a line; **the top-left gutter
  belongs to the build chip**, and anything added to `missing()` has to stay readable there.
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
- **A SHADOW IS NOT ALLOWED TO BE A HOLE (`SHADE.k`), AND PLUTOPIA'S VERDICT IS WHY.**
  A projected shadow map removes the WHOLE of the sun. Against `LIGHT.sun` 3.4 with `hemi`
  1.6 that leaves a surface under a third of its lit value, and on a toon ramp with a hard
  band edge it reads as a hole cut in the picture rather than as shade. It is also
  indistinguishable from the phone from a mesh whose normals are wrong — *"the up ramp to the
  bridge is just black and I can't tell if it's shading or shadow"* is exactly that, and it is
  a fair complaint about the picture as much as about the diagnosis.
  **Plutopia threw the shadow map away entirely** and used painted ground pools plus a blob
  under each character, on precisely this reasoning: harsh projected shadows kill a painterly
  look. That does not port whole — its ground is procedural terrain with a shader we own to
  paint into, and this city's ground is an imported GLB. **What ports is the verdict.**
  So the shadow stays and stops being a hole: `sun.shadow.intensity` is three's own per-light
  dial for how much of the light a shadow may remove, so at `SHADE.k` (.38) a shadow is a soft
  tinted darkening and a shadowed wall still shows its own shading underneath. No shader patch
  — r180 already carries `shadowIntensity` as a uniform.
  **ONE OR THE OTHER, NEVER BOTH — c79 SHIPPED BOTH AND THAT WAS A MISREADING.** Plutopia's
  arrangement was: real shadows OFF, static things on a baked map, moving things on discs
  INSTEAD. c79 added the disc alongside a live shadow map, which gives every character two
  shadows and looks exactly like what it is. `SHADE.mode` picks one — `'map'` (the default,
  and the one he kept), `'blob'` (turns `sun.castShadow` off and draws the discs), `'off'`
  (neither). `blobStep` is gated on it as well, so nothing can draw both again.
  **`applyShade()` IS SEPARATE FROM `applyDbg` BECAUSE `applyDbg` ONLY RUNS ON A BADGE TAP.**
  These two lines lived in `applyDbg`, so moving `SHADE.k` from the console or a slider did
  nothing at all until you also tapped the build number — which is indistinguishable from the
  setting not existing. **The `'map'`/`'off'` pair is also the diagnosis**: if the black ramp
  lifts it was a shadow; if it stays black it is shading, and they are different bugs.
- **THE CONTACT BLOB (`BLOB`, `blobStep`), the half of Plutopia's answer that DOES port.**
  What grounds a thing is the dark under it, and the contact under his feet is the one thing
  a projected shadow map is genuinely bad at. Four things are load-bearing:
  1. **GREYSCALE, NOT ALPHA.** three's `alphamap_fragment` reads the GREEN channel of the map,
     not its alpha — so a white disc that fades out in ALPHA is, to that shader, a white disc:
     opaque everywhere, and the blob comes out a hard square. The falloff lives in the colour.
     Plutopia paid for this one too and it is written down there.
  2. **THE FLOOR HE IS OVER, NOT THE GROUND.** On a car roof or a balcony the blob belongs on
     the roof, not on the road four metres under it — and up there is exactly where it is
     doing the most work, because nothing else tells you where you are. `blobFloor` takes the
     triangle collider AND the solid boxes, like `groundUnder`, but **read-only**:
     `groundUnder` cannot be reused because `resolveBoxes` PUSHES the position it is handed.
  3. **It spreads and thins with height.** How big and how faint IS the answer to "how high am
     I", which is the question a jump asks and the one a projected shadow answers worst.
     `fade` (12) has to clear the highest jump — a charge into a double reaches 8.0 m — or the
     mark goes out at the moment he is highest and has least idea where he is. Plutopia's
     first `fade` was 9 against a 9.8 m jump, for the same reason.
  4. **`userData.noHole` and `depthWrite: false`.** It is under his feet, so the see-through
     hole must never dither it, and it must never write depth over the ground it lies on.
  It walks `CHARS.skins` rather than `colin.root`, because during a `PARADE` there are two
  characters on the street and one blob would follow neither.
  **IT IS OFF BY DEFAULT AND IT IS AN ALTERNATIVE TO THE SHADOW MAP, NOT AN ADDITION TO IT** —
  see `SHADE.mode` above. Two shadows on one character is what shipping both looks like.
- **Tap the build badge to cycle the render**, one variable each: 1 rim off, 2 outline off,
  3 fxaa off, 4 bloom off, 5 full res (no upscale), 6 no post, 7 flat Colin, 8 sun only,
  9 nan map, **10 no shadow, 11 no hole**. A big dark region is either a shadow or it is
  shading, and those are different bugs — one tap on 10 says which, which is worth more than
  any amount of reading. **THE CYCLE WAS `% 10` WHILE `DBGN` HAD TWELVE ENTRIES**, so the two
  modes written up here as the answer to that very question could not be reached by tapping.
  It is `% DBGN.length`; add a mode and it is reachable.
- **THE SETTINGS PANEL (`OPT`, the gear beside the mute key).** Everything worth arguing about
  is a number at the top of this file, and until c81 the only way to move one was a push — a
  ten-minute Pages cache and a reload for a value he could have decided in three seconds by
  looking at it. Half of these ARE look-at-it decisions ("a little lighter", "one or the
  other"). The badge cycle is the diagnostic half of this; the panel is the taste half.
  **HIS PICKS ARE THE DEFAULTS NOW** (c83): shadows `map` at .32, blob .62, toon bands 3 /
  floor .40 / rim .54, bloom .35 at 1.45, outline .60, sky 1.9, sprint x3. `localStorage`
  already holds them on his phone, so baking them in changes nothing he sees — it is so a
  fresh device starts where he likes it and so the constants in the file tell the truth.
  **It writes the LIVE objects, not a copy** (`SHADE`, `BLOB`, `TOON`, `POST`, `HOLE`, `MAP`,
  `SKY`, `MOVE`), so there is no second source of truth and the console still works alongside
  it. Remembered in `localStorage`, because a setting you re-pick after every reload is one
  nobody uses twice.
  **THE ROWS FOR `rim`, `outline` AND `bloom` WRITE THE `*0` BASELINE, NOT THE LIVE VALUE** —
  `applyDbg` restores all three from `TOON.rim0` / `POST.outline0` / `POST.bloom0`, so a panel
  that wrote the live value would be silently undone by the next tap on the build badge.
  **AND `POST.bloomTh` NEEDED A PER-FRAME PUSH.** `brightMat` took it once at construction, so
  the threshold was the one `POST` value that could never be moved at runtime by anything.
  **AND `kitStart()` IS THE SAME, FOR THE SAME REASON — c92 FORGOT AND IT WAS A BLANK PAGE.**
  `kitPaint` asks `kitOut()` whether the current thing is deployed, and for the board that is
  `player.board` — a `const` declared hundreds of lines further down, so calling it at module
  top level reads it inside its temporal dead zone. **That is the third time in this file and
  the second this week**, which is why `npm run check:boot` now exists: every one of them is
  invisible to the syntax gate and indistinguishable from a dead game.
  **`optStart()` IS CALLED AT THE BOTTOM OF THE FILE, NOT WHERE THE PANEL IS DEFINED.**
  `optLoad` runs the setters and two of them call `applyDbg`, which reads `buildNEl` — a
  `const` declared a thousand lines further down and therefore in its temporal dead zone up
  there. A throw is a blank page. (Plutopia's own first landmine, one repo over.)
- **`tools/probe.mjs` rebuilds the heightmap offline** and prints profiles and pinholes.
  The bridge deck is continuous at ~6.3 over its whole span — it has been checked, so a
  fall-through there is not the heightmap. The deck is only ~21 m wide with water either
  side, and cars on it are solid boxes that can shove you off.
- **Colin's rig has been read and is clean**: `tools/skin.mjs` (no vertex >30 cm from its
  bone), normals all unit length, UVs in range, weights summing to 1. Do not re-theorise
  about torn geometry.
- Tunables live in `MOVE`, `SK8`, `CAM`, `TOON`, `LIGHT`, `POST` at the top; all exposed on
  `window.city` for the console.
