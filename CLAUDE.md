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
- **HIS OWN SKATEBOARD, RECORDED (c124) — AND THE ROLL IS THE ONE THIS FILE HAD BEEN WAITING
  FOR.** `audio/skateboarding_sound_effects/`: an ollie (0.21 s), a landing (0.29 s), a push
  (0.44 s) and two rolling loops (2.06 s and 4.81 s). The note above that said the rolling
  wheels were HIS to record and that the synth was a stand-in is discharged.
      ollie    -> `snd.ollie`, over the borrowed swoosh
      landing  -> `snd.land(k, true)`, over the bamboo
      start    -> `snd.push`, WHICH HAD NO SOUND AT ALL -- the push was silent and the
                  speedometer just went up. It fires inside `shove()`, on the frame the stroke
                  begins, the slash mark's rule: the sound and the thing it is the sound OF
                  have to be one event.
      riding   -> `WHEELS`, a looping source rather than a `play()`
  **THE FILENAMES ARE LEFT EXACTLY AS UPLOADED**, `.mp4` in the middle of three of them and all.
  A tidy-up here is a 404 the next time he drops the same files in, and `A()` keys on the path.
  **TWO PATHS AND THE REAL ONE WINS.** The brown-noise synth is NOT deleted — a phone that
  failed one fetch should still have wheels, which is the procedural skateboard's rule — and it
  stands itself down the moment the recording is up, or both roll at once.
  **A SAMPLE FOLLOWS SPEED WITH ITS PLAYBACK RATE**, which is the honest analogue of what the
  synth did with a bandpass centre: a wheel turning faster IS the recording played faster, with
  the gain riding on top. Grind takes the rate to `grindRate` the way the synth took the filter
  to 2.2 kHz.
  **AND A LOOP POINT HAS TO BE A ZERO CROSSING OR IT TICKS**, once every time round, for ever.
  `SFX.edge` already says where the sound starts and stops; `WHEELS.zc` walks from each of those
  to the nearest sample actually crossing zero. Most of a click gone for a dozen lines — and if
  one is still audible at the seam, a crossfading PAIR of sources is the fix, not a different
  edge.
  **`sample()` IS TRIED ON EVERY `set()`, NOT ONCE AT LOAD.** The buffer decodes asynchronously,
  so the first seconds of a session legitimately have no recording yet and must still have
  wheels. `city.WHEELS.pick = 1` takes the other recording.
  **THE CHIP SAYS `rollREC` OR `rollsyn`**, because "is that the real wheel sound" is a question
  a phone cannot answer by ear, and "the file never arrived" and "it arrived and the loop is
  wrong" are different bugs. `deck0.11(proc)` and `gun1cm`'s rule, one asset along.
  **`audio/skateboarding_sound_effects` HAD TO GO INTO `bump.mjs`'s `DIRS`** — `readdirSync` is
  not recursive, so a new folder is a new entry or every file in it goes stale silently.
- **A SONG STREAMS, IT IS NOT DECODED — AND THAT IS WHAT WAS KILLING THE PHONE (c133).**
  *"Every time I choose a character the app crashes and resets."* Nothing in the pick path was
  at fault and a headless harness driving `pickChar` across the whole roster threw nothing.
  `decodeAudioData` hands back FLOAT32 PCM and holds it for the session. Measured on his own two:
      shredworld_song_01   3.1 min, 48 kHz stereo   ->    70 MB
      shredworld_song_02   3.7 min, 48 kHz stereo   ->    86 MB
      9.8 MB of mp3 on disk                         ->   157 MB HELD
  On top of the city, five character skins and the render targets that is over the line, and iOS
  does not throw — **it kills the tab, which comes back as the game reloading**. That is also the
  "camera teleports and the others are gone" he described: he was watching a RELOAD.
  **AND THE TRIGGER IS WHY IT LOOKED LIKE THE CHARACTER PICK.** `SFX.wake()` is bound to
  `pointerdown` WITH CAPTURE, so the FIRST TOUCH ANYWHERE builds the context and decodes — and
  on the title card the first touch is a chip. **The pick was the trigger and never the cause**,
  which is exactly why nothing in it could be found to blame. A crash that follows an action
  reliably is not evidence that the action caused it.
  **THE SPLIT IS THE RULE: EFFECTS DECODE, SONGS STREAM.** An effect is kilobytes, needs
  sample-accurate retriggering and needs `SFX.edge`'s trimming; a song is megabytes, plays once
  and needs none of that. It is an `<audio>` element through a `MediaElementAudioSourceNode` now
  — the browser holds seconds rather than minutes, and the bus, the fades and the two-track
  handover are gain nodes either way, so nothing above it changed.
  **`createMediaElementSource` MAY BE CALLED ONCE PER ELEMENT, FOR EVER.** A second call throws
  and takes the theme down with it, so the node is cached on the element.
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
- **`npm run jam` BUILDS THE REAL CITY HEADLESS AND WATCHES IT JAM (c121).** Four hypotheses
  had now been measured and all four were wrong; the fifth was not going to be a guess either.
  This is `check:boot` WITH A REAL `fetch` — the same headless page (lifted between that file's
  `STUBS:START/END` markers, so there is one copy and not two to keep in step), a `file://`
  base, and a disk-backed fetch. `init()` then runs for real: the real `city.glb`, the real
  road graph, 341 real cars, the real `stepTraffic` at a fixed 60 Hz. Nothing in it restates a
  rule.
  **THREE THINGS HAD TO BE STUBBED AND EACH ONE FAILED SILENTLY:**
  1. **`Request`.** three's `FileLoader` does `fetch(new Request(url))` with a RELATIVE string,
     so node's real `Request` throws `ERR_INVALID_URL` before any custom `fetch` is reached.
  2. **DRACO.** `city.glb` is compressed and `DRACOLoader` decodes on a Worker built from a
     Blob URL. The city is decompressed ONCE offline into a temp copy and served in its place —
     same geometry, same names, same graph, and no Worker to fake.
  3. **`<img>`.** GLTFLoader resolves the GLB's embedded TEXTURES before it resolves the parse.
     boot.mjs's inert img is right for a gate that exits after 400 ms and is **a silent hang**
     for a harness that waits: no throw, no rejection, no progress, for ever. That one cost
     three runs and is the thing to suspect first if this ever stops building.
  **AND IT WAITS FOR THE CARS, NOT FOR `ready`.** `ready` is set at the END of `init()`, after
  Colin and the clouds — none of which any traffic rule has heard of. Waiting on the whole boot
  reports "the city never loaded" when the thing under test has been up for a minute.
- **THE JAM WAS A THROUGHPUT COLLAPSE, NOT A DEADLOCK — AND THE FAILSAFE WAS CANCELLED BY ITS
  OWN SUCCESS (c121, `TRAF.commitT`).** `c.stop` resets the instant a car is over .5 m/s. So
  the stuck failsafe released a car, the car crept forward, **its timer went to zero**, it was
  now the LEAST stuck car at that junction, it yielded to everyone again, and it waited another
  `stuck` seconds to move another car length. Service rate at every junction fell to roughly
  one car per 2.2 s, arrivals stayed above that, and the count climbed for ever.
  **THAT IS WHY IT LOOKED LIKE A DEADLOCK AND WAS NOT ONE.** A deadlock settles; this grew
  monotonically — 0 at t=15 to 154 at t=90 and still going — which is the signature of a queue,
  not a lock. Measured, with every follow-stuck car walked up its `led` chain to the car at the
  front:
      OLD   154 stuck of 341   follow 111, cross 32, blocked 11
            83 queued behind a head that was CROSS, 13 behind BLOCKED, queue depth median 2
      NEW    43 stuck of 341   follow 43, cross 0, blocked 0
            EVERY head MOVING -- what is left is ordinary congestion, and it plateaus
  `myGo` is the remaining grant: once the failsafe releases a car it STAYS released until it is
  through, which is what "permission to cross" already meant everywhere else in this file.
  **MY OWN HYPOTHESIS WAS WRONG TOO, AND THE TOOL IS WHAT KILLED IT.** Mutual follow-lock — two
  cars each reading the other as ahead-and-in-lane, which the `dot > .55` test makes
  geometrically reachable at every angle, on a path with no failsafe at all — reads **MUTUAL 0**
  in every run. It was a good story and it is not what happens. Five hypotheses, five wrong,
  and the sixth was a measurement rather than a sixth story.
  **THE CARS SAY WHY THEY ARE STOPPED NOW (`c.why`), IN THE CHIP.** `JAM 43@-218,95 f43x0b0m0`
  — follow / cross / blocked / MUTUAL. Which letter is big IS the diagnosis, and the four call
  for completely different fixes. `/nan map`'s rule applied to traffic: record it, do not
  reason about it.
  **AND `npm run cross` DOES NOT TEST THE GRANT.** It calls `crossGive` with ten arguments, so
  `myGo` arrives `undefined` and every case there measures the rule with no grant outstanding —
  which is right for what those cases are about (the priority rule in isolation) and is a real
  gap in coverage of the shipped behaviour. Pass an eleventh argument there before trusting it
  on anything to do with the failsafe.
- **THERE ARE 341 DRIVING CARS, NOT THE 197 THE DENSITY NOTE ASSUMES.** `npm run dens`'s 14%
  occupancy was computed against 197, and the count has nearly doubled since. At 341 it is
  **25%**, which is a different regime — so "fewer cars" stopped being obviously wrong somewhere
  between those two builds, and the old note should not be quoted at him as though it settled
  it. Re-run `dens` before repeating that argument.
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
- **PRESETS ARE THE PANEL UNDER A DIFFERENT KEY (c141, `optStore`/`optRecall`, `OPT_DEF`).**
  *"We can save our current preset and then play with these presets."* `optSave` already
  serialises every row by its LABEL, so a preset needed no second schema: three slots plus the
  file's own defaults, and a row added tomorrow is in every slot saved after it and absent
  (which `optApply` skips) from every slot saved before.
  **`OPT_DEF` IS CAPTURED BEFORE `optLoad` EVER RUNS.** Read a moment later it is whatever is in
  `localStorage`, which is the opposite of a default -- and "get me back to how it shipped" is
  the slot that earns its place, because a reload cannot give it to you any more.
  **TWO ROWS, NOT A MODE.** A "save" button you arm and then a slot you press is a state you can
  be in without knowing it; a Load row and a Save row say what they do by being two rows.
  **AND `optSave` USED TO CALL `r[2]()` ON EVERY NON-HEADING ROW**, which is a getter for a
  slider and an ACTION for a preset button -- so without `OPT_VAL` gating it by type, saving the
  settings would have fired every preset in the panel. **A row type that is not a value is not a
  value everywhere, not only where it is drawn.**
  **The dead `Tooth` row is gone.** `PAINT.grain` has done nothing since c139 took it out of the
  shader, and a slider that moves nothing is indistinguishable from a broken one.
- **A GREY FLOOR WITH ITS COLLIDER STILL IN IT IS A CHUNK THAT FAILED TO MERGE (c142).**
  *"The assets aren't there, I don't know, they're like not loading. It's all grey. And I'm
  running into invisible collider."* Every one of those is one bug, and it was mine from c141.
  **THERE ARE TWO PLACES GEOMETRY GOES INTO A CHUNK AND I TAGGED ONE.** The statics, and every
  PARKED CAR. So every bucket with a parked car in it held one member with a different attribute
  set; `mergeGeometries` returns **null** for that; and `if (!merged) continue` threw away the
  whole 64 x 64 m bucket. The COLLIDER is built earlier, off the raw meshes, so it survived
  intact -- which is exactly why it reads as invisible walls over a grey floor rather than as a
  missing file. The parked cars are in the residential and parking blocks, so the holes were
  where he spawns and the distant skyline was fine, which is the picture in both screenshots.
  **AND THE CHIP SAID NOTHING, which is the worse half.** `missing()` carries `NO CLOUD GLB`,
  `NO COP GLB`, `NO BLASTER GLB` -- a hole in the WORLD outranks all of them and had no line.
  `· LOST n CHUNKS` now, plus a console warn, plus `CITY.lost`.
  **THE FIX IS WHERE, NOT WHAT.** `roadTag` is called from the MERGE LOOP, where every member of
  every bucket goes past exactly once, and the road-ness rides on `geometry.userData.road` until
  then. A third push site tomorrow cannot reintroduce this. **An invariant every producer has to
  remember is not an invariant** -- the same sentence as `p.rHold` being counted inside
  `stepFoot`, and as a protection asserted only in a comment.
  **`npm run jam` IS WHAT PROVES IT**, because it builds the REAL city headless through the real
  loader and the shipped `buildCity`. Neither gate can see this: `check:syntax` parses and
  `check:boot` never gets a city to merge. **A change to `buildCity` wants `npm run jam`.**
  Measured, c141 against c142, same file, same loader:
      c141   35 buckets rejected by mergeGeometries   -- OVER A THIRD OF THE CITY, drawn as
                                                         nothing, collided with as normal
      c142    0 rejected, 96 chunks, 2808 statics     -- and a chip line if it ever happens again
- **THE ROADS GET THEIR OWN PAINT AMOUNT (c141, `PAINT.road`, `aRoad`).** *"I don't know if I
  like the effects on the roads, but everything else looks really nice."* A road is the one
  surface in this city you see FROM ABOVE, at a shallow angle, across a hundred metres at once
  -- so the same 34 m tile that reads as brush work on a wall reads as BLOTCHES on tarmac, and
  no other surface in the game is looked at that way.
  **IT IS A VERTEX ATTRIBUTE, BECAUSE THERE IS NO OBJECT LEFT TO ASK.** The city is a few dozen
  merged meshes on ONE material; a per-surface dial has to ride in the geometry. Four bytes a
  vertex against a second material, a second merge bucket and a second draw call per chunk.
  **AND IT NEEDS NO DEFINE, BECAUSE ABSENT MEANS ZERO MEANS UNCHANGED.** `aRoad` is 1 on tarmac
  and simply not present on the cars, props, ramps, ladders and clouds, so they are painted
  exactly as before. **It has to go on ALL the chunk geometries and not only the road ones** --
  `mergeGeometries` refuses a bucket whose members do not share an attribute set, and a silently
  dropped chunk is a hole in the city.
  **THREE DOES NOT ZERO A MISSING ATTRIBUTE, IT SKIPS IT** -- which leaves the GENERIC vertex
  attrib holding whatever the last draw that did use it set, so a car drawn after a road slab
  could inherit the road's flag for a frame. `MeshStandardMaterial.prototype.defaultAttributeValues`
  is the one line that closes it.
- **THE AIM MARK'S FLICKER WAS c137's CAMERA PROBE, ONE SYSTEM OVER (c141).** *"The aimer still
  does this flickering thing -- I don't know if it's locking onto stuff or if it's jumping up and
  down."* **The lock has been OFF since c136, so it was never that**, and saying so is what left
  only one candidate. `aimPoint` walks the bolt's path in fixed 2.2 m steps and returns the last
  CLEAR one, so its answer only ever takes values 2.2 m apart -- and he is MOVING, so the phase
  of the walk slides under him and the break lands a step earlier or later from frame to frame.
  The mark jumps two metres along the shot, and on a camera pitched down that is up and down on
  screen.
  **Identical fault, identical fix: bisect.** Four more grid lookups and the number is
  continuous. **A quantised probe is fine for a yes/no and wrong the moment something continuous
  is drawn from it** -- that is now twice in this file, and it is the thing to check first
  whenever something that should glide instead steps.
  **PLUS A DAMP (`WEAP.aimEase`), for the other half**: `y` takes whatever surface the last
  sample landed on, and a kerb sampled a centimetre either way flips it. A mark is a PICTURE, so
  easing it costs nothing. **Seeded rather than eased on the first frame** (`_apT`, cleared when
  the reticle hides), or it slides in from wherever the gun was last pointed, which reads as the
  reticle chasing rather than appearing.
- **THE RIGHT PAD MEANS ONE THING NOW: TAP JUMPS, FLICK STRIKES, HOLD CHARGES (c141, `meleeAir`).**
  *"When you're not riding a skateboard and you jump in the air and you flick the right stick he
  should do the slide tackle forward, almost like a flying kick."* On the ground that flick has
  been a punch since c93; in the air it was picking which way he went over, so the pad meant
  "strike" on the road and "flip" one metre above it.
  **IT REUSES `MELEE.slide`**, the grind's own rule: that clip is already a body thrown forward
  legs-first, which is what a flying kick IS, and a pose that reads right is worth more than a
  pose that is named right.
  **IT COSTS NO JUMP.** Spending the double would put it in direct competition with the flip on
  the same thumb and the pad would be answering two questions with one gesture again. One per
  airtime (`p.airKick`) is what stops it being a flutter kick across the city.
  **A FLICK STRAIGHT DOWN IS STILL THE BACK FLIP**, because there is no other way to ask for one
  and "over backwards" is not a gesture anybody reads as a kick forward. The FRONT flip is what a
  plain tap already gets, so nothing was lost: the gesture that moved is up-and-sideways, which
  was falling into `dy < 0 ? front : back` and giving a BACK flip for a SIDEWAYS flick --
  arbitrary rather than designed, which is exactly what made it the free slot.
  **AND ITS END IS THE OPPOSITE TEST.** Every other strike ends the moment he leaves the ground;
  this one ends the moment he MEETS it, so `stepMelee`'s condition had to BRANCH rather than gain
  a clause, or the kick would cancel itself on the frame it began. It does not scrub either --
  `MELEE.carry` is a body dragging on tarmac and there is no tarmac up here, so he holds the
  drive and GRAVITY ends the move, which is `copFly`'s rule.

- **A SLOW CONNECTION IS NOT A MISSING FILE, AND FOR TWENTY BUILDS THEY WERE THE SAME CODE PATH
  (c140, `LOADT`, `bootAsk`).** *"I loaded up the game, it took a really long time and then none
  of the characters were rendered -- it was just see-through, just nothing there."*
  Every `loadGLB` in `init()` sits in a `try` whose `catch` is a `console.warn`. That is exactly
  right for "this asset is not in the repo" and exactly wrong for "the phone lost signal for a
  second in the middle of a ten-megabyte download", and **the two are indistinguishable from the
  call site** -- one wants to carry on without the thing, the other wants to ask again.
  **AND COLIN'S FAILURE TOOK THE WHOLE ROSTER WITH IT.** `lineFill` is gated on `colin.ready`,
  rightly, because `skinClips` builds every other character out of HIS pool. So one dropped
  fetch is not one missing character -- it is ALL of them, an empty street, and a boot that goes
  on to set `ready` and lift the card as though nothing had happened.
  So the TRANSPORT retries (`LOADT.tries` goes per file, backing off) and only a file that fails
  all of them reaches the caller as missing; and the two loads there is no game without -- the
  city and Colin -- **WAIT** rather than warn. `bootAsk` says what did not arrive, counts down,
  comes round again on its own so spotty service heals with nothing done, and takes a tap to go
  sooner. **A failure you cannot act on is a hang**, which is `check:boot`'s own argument about a
  card stuck at the text it was born with.
  **`CHARS.failed` IS A BACKOFF NOW, NOT A TOMBSTONE.** Retrying a missing file every frame is a
  request storm that looks identical to the file being slow, which is why the mark exists -- but
  a permanent one costs him that character for the session over one bad moment.
- **THE LOADING BAR WENT PAST 100%, AND `e.loaded / e.total` IS NOT A FRACTION (c140).**
  *"It loads to like some random number, 134%, 124%, 156%, kind of random."* Two faults:
  1. **`total` IS THE COMPRESSED LENGTH.** It is the `Content-Length` header; the stream hands
     back DECOMPRESSED bytes. A GLB that gzips to two thirds therefore reads 150% at the end,
     and the bar runs off the end of its own track. Those are his numbers exactly.
  2. **IT WAS PER FILE**, so it could never mean "the boot" -- every file restarted it at zero
     and what stayed on screen was whichever one happened to finish last. Worse, three places
     called `setBoot(..., 1)` mid-boot, so it hit 100% before the streets were even built.
  Clamped, monotone (a bar that retreats reads as a failure), and each file spends its fraction
  inside ONE SLOT of `PROG.total` -- the number of `loadGLB` calls `init()` makes. If that count
  drifts the bar is still monotone and still clamped, and the final `setBoot('drop in', 1)`
  forces it home.

- **A STUCK STICK IS ALWAYS A MISSING `pointerup` (c138, `STICKS`, `stickWatch`).** *"Sometimes
  my joystick gets stuck, I don't know what causes this."* The thumb has gone and the pad never
  heard: `out.down` stays 1, `out.x/y` keep whatever they last were, and the game goes on
  steering, sprinting or charging for ever. **There is no single cause to find** -- there are
  several ways an up goes missing on a phone, so all of them are closed and a net goes under.
  1. **A SECOND FINGER ON THE SAME PAD USED TO OVERWRITE `id`**, after which the FIRST finger's
     up no longer matched and was thrown away. Whichever order the browser delivered them in,
     the pad could end up held by a thumb that was not there. A stick has one thumb by
     definition; a second touch on it is simply not ours.
  2. **`setPointerCapture` THROWS IF THE POINTER HAS ALREADY GONE** -- and it was called AFTER
     `id` was set, so the throw left the pad tracking an id whose up had been and gone.
  3. **THE UP WENT SOMEWHERE ELSE.** Capture can be lost without `lostpointercapture` reaching
     us, so the WINDOW hears every up and cancel in the CAPTURE phase -- which runs before any
     target handler and cannot be stopped by one -- and hands it to whichever pad owns that id.
  4. **THE APP WENT AWAY MID-TOUCH.** Backgrounding a phone with a thumb down delivers nothing
     on the way out and nothing on the way back. This is the one that produces a stick parked at
     full deflection with no finger anywhere near it. `blur` / `pagehide` / `visibilitychange`
     let every pad go.
  5. **AND A WATCHDOG, because the four above are a list of causes and this is a CLASS.** A
     pointer with no move, up or cancel for `STICK_IDLE` is not a thumb. Six seconds, and
     deliberately long: holding a stick dead still IS something people do, and dropping a real
     hold is far worse than a stuck stick that clears itself.
  **RELEASING IS NOT A TAP AND NOT A FLICK.** `release` is `end` with no gesture fired -- letting
  go because the thumb is gone must not ollie him.
- **AN UNDECLARED ASSIGNMENT IN A MODULE IS A REFERENCE ERROR, AND `npm run check:boot` CAUGHT
  IT.** `STICK_IDLE = 6;` with no `const` -- a blank page, invisible to the syntax gate, exactly
  the class that gate exists for. Fourth time it has paid for itself.
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
- **A CHARACTER WHO BRINGS HIS OWN ANIMATIONS DRIVES HIMSELF WITH THEM (c123, `ownClips`).**
  *"He has all of Colin's animations baked into his own GLB and those are offset for his
  proportions exactly... he should be using his own animations. Is he not right now?"* He was
  not. c122 measured his rig, pronounced it clean and then threw all 48 of his clips away.
  **AND THE RETARGET IS ONLY EVER SECOND BEST, BY CONSTRUCTION.** `skinClips` has to drop every
  `.position` track because those bake COLIN'S bone lengths — **including the Hips, which is the
  body's height off the ground**, and every crouch, roll, slide and landing in the set uses it.
  That is the landmine `tools/melee.mjs` already paid for once ("the legs fold underneath and
  his soles hang in the air"), and wearing borrowed clips re-creates it on every borrowed skin.
  Measured, before and after:
      moussa_toon  tracks kept 3594 / 10127  ->  10122 / 10127     lift -0.048 -> -0.021
                   48 of his OWN clips, 5 borrowed (the melee set, which he has not drawn)
  **THE TEST IS STRUCTURAL AND IT IS THE GAIT.** `alien_orange` ships 30 of Plutopia's clips and
  twelve of those names collide with Colin's, so a bare name match would have given it a
  borrowed walk under its own run — mixed provenance, which is the thing this change exists to
  END rather than to relocate. A pool has to carry `idle_neutral`, `walk_fwd_neutral` and
  `run_fwd` to be an animation set at all: `GAIT.walkRef`/`runRef` ARE their cycle rates, and
  everything else is measured against them. Robot (91 clips), alien (30) and moussa_robit (0)
  are all unchanged, and the log says which and why for each.
  **Per-clip fallback under that gate**, so a partial custom set works the day there is one:
  name the clips you have redone and the rest keep coming from Colin.
  **HIS OWN CLIPS ARE USED RAW** — no track filter, no `HIPFIX`. Both of those exist to survive
  wearing ANOTHER skeleton's animation and neither means anything for a clip authored on this
  one.
  **AND THEY GET THE SAME TRIM AND THE SAME DERIVED FAMILIES.** `trimClips` and `deriveClips`
  are functions over a POOL now, not over `colin.clips` — his `back_flip` opens with the same
  standing crouch, and he needs his own `rifle_aim`, his own `__up`/`__legs` clones and his own
  backpedal or he rides with Colin's legs under his own arms.
  **A CLIP OF A DIFFERENT LENGTH NEEDS A DIFFERENT REFERENCE SPEED** — `npm run gait`'s closed
  form, `ref = GAIT.ref * (colinDur / thisDur)`. Eyeballing that put the rifle run 36% too fast
  and the walk 37% too slow in one build, so a own clip more than 5% off Colin's says so at load
  with the multiplier it wants. moussa_toon's 48 are identical to the frame, so every reference
  speed in the file still means what it meant.
  **THE REMAINING GAP ON HIM IS FIVE CLIPS**: `melee_punch_01`, `melee_slash`,
  `melee_round_kick`, `slide`, `roll` — Plutopia's alien's, borrowed, and therefore still
  rotation-only and still missing their hips translation. Those five are the ones that will
  read worst on him, and drawing them is what closes it.
- **`npm run wear` BUILDS ITS SKIN WITH `measureSkin`, NOT `buildSkin` — SO THE CAPTURE HAD TO
  BE A SHIPPED FUNCTION (c123).** Written inline in `buildSkin`, `skin.own` is a step the
  harness never performs, and it then reported every character wearing borrowed clips whether
  they were or not — **the `normals.mjs` / `normGeo` mistake for the FIFTH time in this repo**,
  always the same shape: the harness runs a path the game does not. `ownClips(skin, gltf)` lives
  inside the `SKIN:` markers and both call it.
  **`trimClips`/`deriveClips` are OUTSIDE those markers**, so the lifted text has neither and
  they are called through a `typeof` guard. The harness therefore measures the CAPTURE — which
  clips a character drives and what his soles do on them — and the two derived families are
  covered in the game by `npm run check:boot`. **A stated gap, not a silent one**; move them
  inside the markers the day the harness has to test them.
- **`moussa_toon` IS THE BEST-CASE RIG IN HERE, AND EVERY TOOL SAID SO BEFORE ANYTHING WAS
  BUILT (c122).** He needed one roster line and not one typed constant:
      65/65 of the bones Colin's clips drive, rest-pose offset mean 0.0 deg / worst 0 deg
        -> he shares Colin's bind pose EXACTLY, like `alien_orange`. No `HIPFIX`, and the
           rest-delta everyone reaches for first would be a no-op on him anyway.
      2 skinned meshes, 0 loose donor meshes   -> `stripPoses` has nothing to do
      scale x1.178, lift y=-0.048, 1.71 m tall, soles 0.05 / crown 1.69  -> UPRIGHT
      left-right axis 90 deg against Colin's 88   -> 2 deg, idle asymmetry, so no `SPIN`
  **AND HIS `weapon_root` CHAIN IS BYTE-FOR-BYTE COLIN'S**, down to the `Armature[0.01]` at the
  top — checked rather than assumed, because a weapon file parented with identity onto an
  armature at 1.0 instead of 0.01 is the **73-metre** bug `npm run gun` found, one rig over.
  Same chain means the blaster lands proportional: 0.730 m x his 1.178 = 0.86 m, against 0.93
  on Colin.
  **He also ships 48 clips of his own**, which nothing uses — every skin wears Colin's pool
  through `skinClips`, and a second path for one character is a second path to keep in step.
- **`npm run wear` READS THE ROSTER OUT OF `CHARS.list`, NOT A COPY OF IT (c122).** It kept its
  own hand-written `FILES` map, so the first run after a character was added measured the four
  it already knew about and **said nothing at all about the new one** — no error, no omission
  notice, just a report that looked complete. A harness that measures a set the game does not
  have is the `normals.mjs` / `normGeo` mistake, and **that is the fourth time in this file**.
  It parses `CHARS.list` out of `index.html` now, so the roster cannot drift again.
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
- **THE HIGH BAR (c148, `BAR`, `barsFrom`, `barCatch`, `stepBar`, `poseBar`).** *"Picture a
  gymnast. I constantly run into the street lights and they just reject me and bank-shot me
  backwards -- maybe instead you just immediately go into a swing."*
  **HE BUILT THE HARD PART INTO THE EXPORT, AND `npm run bar` CONFIRMED IT.** *"I put the two
  weapon joints where the bar would go."* Measured through the real loader and a real mixer:
      bar_hang_idle 4.73s   axis (0.999, 0.001, -0.033) -- dead horizontal, along +X
                            midpoint drift 0.012 / 0.005 / 0.034 across the WHOLE clip
      bar_pump      0.80s   hips 0.857 below the bar, head 0.384  (x1.273 -> 1.09 m / 0.49 m)
      bar_release   0.40s   -- A THIRD CLIP HE HAD FORGOTTEN HE MADE
  A pivot that wanders a centimetre and a half over five seconds IS a fixed pivot.
  **AND NOTHING BROKE: `weapon_root` IS STILL ON `mixamorig_RightHand`.** The joints did not move
  to the bar -- his HANDS did, and the joints went with them. That is the joint doing its job,
  not a hack, and the blaster mount is untouched. Worth checking every time, because a rig change
  under a mount this file depends on would be silent.
  **THE PLACEMENT IS MEASURED EVERY FRAME, NOT TYPED.** Pose him, read where the two joints
  actually ended up in world space, slide the root by the difference. Nothing in the file knows
  how far his hands sit above his feet, so a re-export at any height lands right -- `buildBoard`'s
  rule, one rig over. **And the orientation must be a QUATERNION**: `rotation.x` on an XYZ root is
  a WORLD pitch, which is the swing axis only for a bar that happens to lie along X.
  **THE SWING IS A REAL PENDULUM** (`w' = -(g/L) sin a`), and that is worth more than a tuned
  curve for one reason: **the giant needs no special case.** Past the top the same equation keeps
  the angle climbing; under it he falls back. The 360 is not a state, it is what enough energy
  looks like.
  **PUMPING: HE ASKED WHICH OF TWO AND THE ANSWER IS BOTH.** Energy is added only while the stick
  AGREES with the way he is already swinging -- which is what pumping physically is. Holding
  forward builds on every forward half; alternating with the swing builds on both and gets him
  over in half the time. One rule, both of his options, and it teaches itself.
  **BUT THAT RULE CANNOT START FROM REST, AND THE PROBE IS WHAT CAUGHT IT.** "Agrees with the
  swing" multiplied by a swing of exactly zero is zero, so a bar caught from a dead hang hangs
  FOR EVER however hard you push -- `JAM_PROBE=tools/probe-bar.mjs` read **w = 0.00 after fourteen
  seconds** of holding forward. Below `BAR.kick` the thumb picks the direction instead. Driven
  rather than argued, which is the only reason it was not shipped.
- **THE PUSH CLIP IS A LOOP AND THE SCRAPE WAS ARRIVING BEFORE IT (c177, `SK8.pushBlend`,
  `SK8.pushGrace`, `pushAct`, `PUSHDRIFT`).** *"It plays the first sound when you push the left
  stick forward, which is not really quite when he pushes. It seems like the animation is on a
  consistent rhythmic loop and the sound fires every time I push the stick -- they don't line
  up. And once I stop skating, start skating, stop skating, it plays the sound and bases all the
  additional ones off that."* **His reading of the mechanism is exactly right** -- the clip IS a
  free loop and the scrape IS fired per cycle -- and there were three reasons they came apart.
  **1. THE POSE TOOK A SIXTH OF A SECOND TO EXIST.** The sound fires at full volume on the frame
  the stroke begins, correctly, because it is the scrape. The CLIP starts at weight zero and
  `skinWeights` damps it in at .055 -- so the first push of every start was HEARD about 150 ms
  before anything on screen moved. Nothing cuts (the file's rule stands): `BLENDIN` gives the push
  clip a much shorter half-life, on the way IN only, which is `HIT.snapHL`'s precedent one state
  along. **The `__legs` clones are in that regex too**, or the rule silently stops applying in the
  one state the blaster is out.
  **2. EVERY RELEASE RESTARTED THE CYCLE AND FIRED A SCRAPE.** A thumb that came off and went back
  on was a new push at the plant, whatever the clip was in the middle of -- so a jiggled stick was
  four sounds, four re-seeds of the animation, and a new rhythm each time with no relation to the
  one before it. That is his "stop skating, start skating" sentence exactly. Inside `pushGrace`
  the phase CARRIES ON: `p.pushOff` is how long the thumb has been off, the phase is kept rather
  than zeroed, and coming back inside the window adds no sound and re-seeds nothing.
  **3. THE SYNC WAS WRITING TO AN ACTION WITH NO WEIGHT.** c171's once-a-cycle seek wrote
  `colin.actions[pushClip(p)]` -- and riding with the blaster out, c115 swaps every `skate_*` clip
  for its `__legs` clone, so the thing being seeked was not the thing being drawn and the visible
  clip free-ran. `pushAct` asks which of the pair carries the WEIGHT, which is `colinSet`'s own
  rule everywhere else: ask the weight, never the name. The seek now writes both.
  Driven through the shipped `stepSkate` with `snd.push` wrapped (`JAM_PROBE=tools/probe-push.mjs`),
  two seconds on and a moment off, over and over at 14 m/s:
      released 0.10 s   6 scrapes   gaps 1.55 1.67 1.67 1.67 1.55   worst 0.7% off the plant
      released 0.30 s   6 scrapes   gaps 1.55 1.87 1.87 1.87 1.55   worst 0.7%
      released 0.80 s   7 scrapes   gaps 1.55 1.27 1.57 1.23 ...    worst 1.1%   <- past the grace
  The third row is correct: past `pushGrace` taking the stick again IS a fresh push and lands one
  at once. Inside it, the beat is the beat it already had.
  **AND THE CHIP CAN NOW SAY WHETHER THEY AGREE (`· PUSHDRIFT`).** "Do the foot and the scrape
  line up" is a question about two clocks on a phone, and it is the one place neither gate nor
  probe can look: **no harness in this repo can build a skin**, so the clip's real phase had never
  once been read while the game was running -- which is why three builds of push fixes were all
  reasoned rather than seen. Silent when they agree, `rollREC`'s rule; and if it ever shows a
  number, that number IS the diagnosis.
- **A MAN HAS WEIGHT, AND THE LUNGE WAS DELETING EVERY IMPACT BEFORE IT COULD BE FELT (c176,
  `p.melHit`, `MELEE.thud`, `COP.footPlough`).** *"He doesn't feel like he has any weight. Your
  character sort of goes through him and the cop goes flying -- that's not what I'm going for. I
  want it to feel like you hit something heavy, like you hit a wall, every time you melee him. If
  you have appropriate speed -- skateboarding, or running really fast -- maybe it slows you down a
  little but doesn't completely stop you. Below that it should feel solid."*
  **TWO FAULTS, AND THE SECOND ONE IS WHY EVEN A SOLID OFFICER FELT LIKE NOTHING.**
  **1. A STRIKE ON ITS OWN WAS COUNTING AS SPEED.** c174 ghosted any strike thrown above `flyV` 7
  -- and a slide tackle is by definition above `MELEE.runAt` 4.6 and usually well past 7, so on
  foot nearly every tackle went straight through him. The melee clause is gone: only real travel
  opens him up, and the test is one predicate both the collider and the plough read.
      on the board past `ploughV` 8       you plough -- the one he asked to keep
      on foot past `footPlough` 13        a genuine sprint, not a run and not a lunge
      anything else                       he is a WALL, whatever you are throwing at him
  A plain run is 9 and a charged sprint tops near 17.6, so 13 is "running really fast" and nothing
  under it. **And it reads `melEntry` mid-strike, never `p.speed`** -- c174's own lesson, because
  `stepMelee` rewrites the velocity from `melV` every frame.
  **2. THE LUNGE REWRITES THE VELOCITY EVERY FRAME, SO THE COLLIDER COULD NEVER STOP HIM.**
  `resolveBoxes` pushed him out of the man and the very next line put the speed straight back --
  he ground along the officer with the impact deleted before it could be felt. **No collider of
  any kind could have read as heavy through that**, which is why making him solid at c174/c175 was
  necessary and not sufficient. `p.melHit` latches off `g.wall` -- **the resolver's OWN answer,
  not a second test** -- so the lunge stops driving and what is left is `MELEE.thud` bled off with
  `Math.exp(-k*dt)`. Writing `sin(melH) * 0` instead would erase the bounce on the next frame and
  the thud would last exactly one, which is indistinguishable from no thud.
  **AND IT IS GENERAL RATHER THAN AN OFFICER SPECIAL CASE**: a lunge into a BUILDING stops the
  same way, which is right and costs nothing.
  **`copPlough` READS `copGhostWant` NOW.** If you are going THROUGH him you knock him through --
  one fact, not two speed tests to keep in step. That is also what fixed the last hole: c174's
  plough was `p.board` only, so a 15 m/s foot tackle sailed clean through a standing officer and
  did nothing at all -- *cop standing, hp 3* while the player went past.
  Eight cases through the shipped `stepPlayer` over the real collider:
      on foot 2 and 6 m/s, no melee     stopped 0.73 m short   standing     <- contact
      standing punch                    stopped 0.73 m short   hp 3 -> 2
      riding in at 14                   WENT THROUGH him       FLYING       14 -> 10.0
      riding in at 14 + melee           WENT THROUGH him       FLYING
      **on foot at 12 + melee (tackle)  stopped 0.73 m short   FLYING**     <- hit something heavy
      on foot SPRINTING at 15 + melee   WENT THROUGH him       FLYING
  **AND THE PROBE THREW THE WRONG MOVE FOR TWO RUNS.** It always set the standing JAB at
  `MELEE.lunge` 4.0 whatever the entry speed was, so 12 and 15 m/s both covered the identical
  0.73 m, never reached the officer at 2.2 m, and read as "the sprint does not plough" when the
  sprint had simply never arrived. Above `runAt` it is the TACKLE and a tackle keeps `slideV` of
  the speed he came in with -- which is the whole reason it travels. **A harness that picks a
  different move than `meleeGo` picks is measuring a game that does not exist.**
- **A SAVED SETTING OUTRANKS EVERY FUTURE DEFAULT, FOR EVER -- AND THAT IS HOW c174 DID NOTHING
  (c175, `OPT.ver`, `OPT_FRESH`).** *"When I'm walking around a cop I still can't collide with
  him."* c174 turned `COP.solid` back on, measured it six ways and shipped -- and **his phone had
  `"Cops solid": false` sitting in `city.opt` since c169**, because `optSave` writes EVERY row on
  every drag and `optLoad` applies the lot at boot. No edit to this file could ever have reached
  him. He was right both times and the code was right the second time; the STORE was in the way.
  **c163 PREDICTED THIS IN WRITING** -- *a saved slider can hold the blaster where no export can
  reach it* -- and the answer there was a chip line, which is why that one was caught in a build
  and this one cost five. `· COPS GHOST` now, for exactly the same reason.
  **SO THE STORE CARRIES A VERSION.** Older than the build, and the rows named in `OPT_FRESH` --
  and only those -- are dropped and take the file's new default; everything else he has tuned is
  kept, which is the whole point of not simply clearing the key. **Bump `ver` and name the row in
  the SAME commit that changes a default, or the change does not ship.**
  **A NEW ROW NEEDS NOTHING**, because there is no stored value for it and `optApply` skips what
  it does not find. Naming one in `OPT_FRESH` would throw away his tuning for nothing.
- **THE STANDING FIGHT IS A SEQUENCE, NOT A SHUFFLE (c175, `COP.clips.chain`).** *"Are we even
  utilising the cop's animations -- blow to the head, blow to the body? I want those to happen
  when you melee: first one head, second one body, third one sends him a little bit."*
  We had all four `hit_*` clips and picked one **at random**, which is exactly why it never read
  as a combination: the same three punches came out in a different order every time and none of
  them built. `COP.hp` is 3 and always was, so the chain is already as long as the fight:
      punch 1   hit_head          state hit    hp 2
      punch 2   hit_body          state hit    hp 1
      punch 3   flying_backwards  state fly    hp 0     <- `copFly` at `COP.fly.last`
  **AND THE THIRD SENDS HIM RATHER THAN FOLDING HIM.** He used to drop where he stood, which
  reads as a hitpoint running out rather than as the end of a fight. `copFly` already existed and
  already hands him to the same `down` -> `up` states the fold did, so the change is which
  function is called and how hard -- `fly.last` .55 is well under a plasma bolt's launch, which
  is the "a little bit". **It adds its own `HEAT.down`, so `copHit` must not add it twice.**
  `hits` stays as the pool for anything past the chain, and the chain falls back to it per index,
  so a longer `hp` tomorrow is not a crash.
  **AND THE PROBE'S FIRST RUN LAUNCHED HIM ON PUNCH ONE**, because `p.melEntry` LATCHES and the
  row before it had left 12 m/s there -- c174 working exactly as written, and the harness
  forgetting to put its own state back. Reset every latch a case reads, not just the obvious ones.
- **THE RETICLE AND THE BOLT ARE ONE BEARING NOW, AND THEY WERE NOT (c175,
  `JAM_PROBE=tools/probe-aim2.mjs`).** *"In other games I've had this problem where the aimer
  locks onto them but then when you release, the character doesn't actually shoot at the aimer --
  I wanna make sure that's all working."* **It was exactly that here, by construction.**
  `reticShow(p.lock, ...)` drew the mark AT THE LOCKED OBJECT while the bolt left on `p.aimH`,
  which the assist only ever pulls `grab` of the way there -- so at .58 the mark sat on the man
  and the shot went 42% of the error wide, every single time.
  **AND THE FILE ARGUED BOTH SIDES OF IT.** c112: *the mark IS the promise, so it has to be on
  the thing before the shot leaves.* Also c112: *the bolt leaves on the eased heading, NOT the
  target's centre.* Those are the same sentence pointing in opposite directions, and nothing
  reconciled them for thirteen builds.
  **THE MARK IS DRAWN FROM `p.aimH` AND NOTHING ELSE.** `shotH()` returns the same `aimH`, so the
  promise is kept BY CONSTRUCTION rather than by two places agreeing -- and `grab` went .58 -> .85
  so the assist lands the mark ON him rather than near him. The lock is now only the reticle's
  LOOK (warm and tight against cool and breathing), which is what says the gun has something.
  Measured through the shipped `stepAim` over the real collider, five cases, **MARK vs SHOT 0.00
  degrees in every one**, standing and riding.
- **THE ASSIST IS BACK, POLICE ONLY, AND THE CARS WERE THE WHOLE c136 COMPLAINT (c175).**
  *"I'm toying with re-adding a small aim assist, but only on players like the cop -- no cars. If
  your aim isn't super precise but you're just to the left or right of him, it'll lock onto him.
  It's an assist, not a complete lock."* c136 turned it off because *a 22-degree cone at 44 m
  almost always contains SOMETHING* -- and that something was one of **four hundred cars**. Eight
  officers is a different world, so `lock.cops` skips the car loop entirely and the numbers come
  in: cone .38 -> .24 (22 deg -> 14), range 44 -> 34, pull 5.0 -> 4.0.
  Driven both ways round -- the same run with the assist off, because on the board he covers
  twenty metres while the aim is held and an absolute "ends N degrees off" says nothing:
      standing,  6 deg off   ->  1.9   LOCKED
      standing, 12 deg off   ->  5.8   LOCKED
      standing, 25 deg off   -> 25.0   no lock   <- outside the cone, untouched
      riding,  8 deg off     -> 14.9 deg becomes 11.6, LOCKED
      nobody in range        ->  6.0   no lock
  It closes about half to two thirds of a miss inside the cone and does nothing outside it, which
  is "subtle" measured rather than asserted.
- **THE MARK'S HEIGHT GETS ITS OWN HALF-LIFE (c175, `WEAP.aimEaseY`).** *"There's a little flicker
  up and down -- I don't know if it's catching onto things farther away. Maybe just ease that."*
  The remaining jitter is not noise, it is not the lock, and no finer probe can remove it: it is
  **real and discontinuous**. One frame the walk stops at a kerb and `y` is the kerb's foot; the
  next it clears and `y` is the road forty metres on. A jump in the world, so only a filter helps.
  **And the mark's JOB is to say where the shot lands in PLAN.** Its height is a detail, and it is
  the only axis a camera pitched down turns into visible bobbing, so it gets its own number while
  the bearing keeps the quick one. Riding at 14 m/s across the real city:
      c174  one ease (.045)    mean 0.27 cm/frame   worst 6.9 cm
      c175  ease up (.22)      mean 0.13 cm/frame   worst 2.2 cm
- **AND THE BEARING IS DAMPED RATHER THAN GEARED (c175, `WEAP.aimSmooth`).** *"I want the
  sensitivity of the aim to be a little less sensitive -- it's hard on a small device to aim
  really precisely."* The pad is ABSOLUTE: the thumb's bearing IS the world bearing, so at the top
  of a 132 px pad ten pixels sideways is nine degrees, and at forty metres that is six metres of
  miss. **There is no gain to lower**, and inventing one breaks "you point where you point",
  which is c101's whole mechanic. So the mapping is untouched and the RESULT is damped: the same
  bearing, arrived at over a breath. A shaky thumb stops showing, a real sweep still lands inside
  a tenth of a second, and `aimSmooth: 0` is the old behaviour exactly.
- **AND `stepAim` RETURNS ON `KIT.out.blaster` BEFORE ANYTHING ELSE, WHICH COST THE PROBE A RUN.**
  Its first version armed nothing, locked nothing and damped nothing, and read as three separate
  failures -- one early return. **When a harness reports several things broken at once, suspect
  one gate above all of them.**
- **A MAN IS A WALL UNTIL YOU ARRIVE WITH ENOUGH TO KNOCK HIM DOWN (c174, `copGhost`,
  `copPlough`, `p.melEntry`).** *"It looks like we entirely removed the collider and I don't think
  that's how it should be. It should be like a state machine... if I'm just fighting him with the
  swipes on the ground, or just walking around, I still wanna be able to collide with him and I
  still want him to stop me -- right now it's like he's not a physical object. But if you're
  riding and you hit him or melee him, it just sends him flying instead of ricocheting me."*
  **c169 TURNED THE COLLIDER OFF OUTRIGHT AND THAT WENT TOO FAR.** Its finding was real -- the
  push-out was pinballing him off an officer on the board -- and the fix was a master switch when
  what the case wanted was a CASE. He named the shape himself, and it is one predicate:
      walking, running, standing, fighting on the spot   SOLID. He stops you, and the hp chain runs
      a strike thrown above `flyV`, or riding past `ploughV`   you go THROUGH him and he FLIES
      already down, getting up, or in the air           you step OVER him, never into him
  *"If I have to give one up, I'd prefer to run into him"* -- so solid is the default now and the
  ghost is the exception, which is the opposite way round from c169. `COP.solid = 0` is c169.
  **ONLY A BLOW THAT LAUNCHES HIM GOES THROUGH HIM, and that is the line c169 got wrong.** It
  ghosted EVERY strike on the argument that the push-out interrupts the lunge `MELEE.lock` aimed --
  but a lunge stopped at the man's own surface has ARRIVED: `COP.reach + COP.r` is 2.82 m and the
  punch lands from 0.73. A standing fight needs the wall; only the strike that sends him flying
  needs him out of the way to do it.
  **`p.melEntry` IS LATCHED IN `meleeGo` AND READ NOWHERE ELSE, BECAUSE `p.speed` LIES DURING A
  STRIKE.** `stepMelee` rewrites the velocity from `melV` every frame, and a lock solving for a
  distant man can put that at `MELEE.lock.maxV` **13** -- so reading it live would call a standing
  jab thrown across the room "arriving at speed" and launch him. The entry speed is the honest
  measure of *"if you're riding or running and you melee"*, and the frame of the flick is the one
  moment it is still on the clock.
  **A DODGE ROLL IS NOT A STRIKE** and stays solid at any speed: it is a move AWAY from somebody.
  **AND THE GHOST LINGERS (`COP.pass`).** Without it the frame a strike ends is the frame the
  resolver finds him standing inside a man and shoves him out, which reads as being spat out.
  **THE PLOUGH TAKES ITS DIRECTION FROM HIS VELOCITY**, not from the geometry of a contact where
  the two things are on top of each other -- `copFly`'s own rule -- and it costs `ploughCost` of
  his speed WITHOUT touching its direction, which is the whole difference from the pinball.
  Driven through the shipped `stepPlayer` over the real collider (`JAM_PROBE=tools/probe-cop3.mjs`):
      on foot 2 m/s, no melee     stopped 0.73 m short   standing     <- .38 radius + .35 box: contact
      on foot 6 m/s, no melee     stopped 0.73 m short   standing
      standing punch              stopped 0.73 m short   hp 3 -> 2    <- solid AND the chain
      riding in at 14             WENT THROUGH him       FLYING       14 -> 10.0
      riding in at 14 + melee     WENT THROUGH him       FLYING       14 -> 11.7
      on foot at 12 + melee       ---                    FLYING       the running clothesline
  **THE OFFICER IN THAT PROBE IS FABRICATED AND IT IS A STATED GAP.** `npm run jam` cannot build a
  character skin (draco wants a Worker), so `cops` comes back empty -- and what is under test is
  not the model but whether his BOX reaches the player's resolver, which reads `c.box`, `c.st` and
  `c.x/z` and nothing else. **`meleeGo` also bails headless** on `colin.actions[nm]`, so the strike
  state is set the way it sets it; anything about the clips belongs in `npm run cop`.
  **AND `p.melFx` IS HAS-FIRED, NOT WANTS-TO-FIRE.** The probe set it to 1 to mean "throw a punch"
  and suppressed every contact, which read as the collider swallowing the blow. Two runs lost to a
  flag read backwards.
- **HIS JETPACK, RECORDED (c173, `JETSND`), AND IT IS `WHEELS` ONE MOTOR ALONG.** *"added jetpack
  sounds"* -- `audio/jetpack_sound/`: combust (0.97 s), ongoing (6.69 s) and release (0.99 s),
  which is exactly the right three, because a motor is an IGNITION, a burn that lasts as long as
  the thumb is down, and a SHUTDOWN. **A one-shot can do none of the middle one** -- it ends early
  on a long flight and runs past a short one -- which is the same argument that made the rolling
  wheels and the blaster's charge hum looping sources rather than `play()` calls.
  **THE EDGES COME OFF `want`, NOT OFF `p.jetK`.** `jetK` is damped over `JET.ease`, so a release
  read off it lands about half a second after the thumb left: the sound of a thing that already
  happened. `want` is the DECISION; the gain and the playback rate ride `jetK`, so it still spools
  up and down. Same split as the charge ball reading `p.chg` while the trigger reads `p.aim`.
  **IT IS CALLED FROM BOTH OF `stepJet`'s PATHS, beside `jetFlameStep`**, and for the same reason
  that one is: a motor that stops being told is a motor still running. Stowing the pack mid-flight
  has to shut it up, and that is the early return.
  **AND `WHEELS.zc` IS CALLED, NOT COPIED.** A loop point that is not a zero crossing ticks, once
  every time round, for ever -- and there is one walk that finds one, on WHEELS, called from here.
  **`audio/jetpack_sound` HAD TO GO INTO `bump.mjs`'s `DIRS`**, which is the standing tax on a new
  folder: `readdirSync` is not recursive, so the first bump after his push read 60 files and said
  "none changed" while three new ones sat there unhashed. 63 and 3 CHANGED once it was added.
- **`npm run sfx` SAYS WHETHER A RECORDING STARTS ON ITS OWN EVENT (c172).** It runs the SHIPPED
  `SFX.edge`, lifted between the `EDGE:` markers, with the shipped `hit`/`pre` beside it -- a tool
  with its own copy of the rule is this repo's oldest mistake and it has been made eight times.
  It prints, per file, the window `edge` will play, where the event actually is, and the DEAD AIR
  between them; past about 60 ms that is audible as a delay, and it is invisible from a phone.
  **A LOOP IS NAMED RATHER THAN FLAGGED**: "half the peak" is an onset test and a continuous roll
  or burn has no onset, so `skateboarding_riding` reads 1910 ms of "dead air" and means nothing.
  A report that cries wolf on a file that is fine is a report nobody reads.
  Needs `npm i -D mpg123-decoder` and says so rather than throwing.
- **THE PUSH SOUND LANDED HALF A CYCLE BEFORE THE PUSH, AND `SK8.pushPlant` WAS NEVER READ BY
  ANYTHING (c171, `npm run push`, `JAM_PROBE=tools/probe-push.mjs`).** *"The push sound is offset
  from the push. It's like it goes in between where it needs to go -- if he's pushing every second
  or so, the sound effect is in the in-between space."* Three separate faults, and the first one
  is the whole complaint.
  **1. THE SHOVE FIRED AT THE TOP OF THE CYCLE, WHERE HIS FOOT IS STILL ON THE DECK.**
  `SK8.pushPlant: .42` has sat in this file since the push cycle was built, with the comment above
  it saying *the shove fires at the point in that cycle where his foot is actually on the road* --
  and `grep` returns ONE line for it, its own declaration. **A behaviour asserted only in a comment
  is not a behaviour**, which is the fifth time in this file, and this one was audible.
  Measured off the real clip through a real mixer (`npm run push`, the free foot found by
  excursion rather than by name, touchdown = the LONGEST run within 15% of its own floor):
      skate_push_standing  1.567s   touchdown phase 0.46   contact 0.11 of the cycle
      skate_push_crouch    1.467s   touchdown phase 0.56   contact 0.16
  So the scrape was heard **0.28 s early at a standstill and 0.71 s early at the cruise**, which
  on a 1.55 s cycle is squarely between two pushes. His sentence, exactly.
  **The first version of that tool took the FIRST dip under the gate and reported 0.22 with a
  contact lasting 0.025 of a cycle** -- a wobble on the way past. The free foot rides ON the deck
  for most of the cycle, so the trace is a long plateau with one kick UP and one dip DOWN, and the
  dip is the one that LASTS. Longest run, read circularly. It is stable at gates of .10 and .15
  and falls apart at .25, which is where it starts swallowing the plateau.
  **2. TWO CLOCKS, AND THEY CANNOT AGREE WHILE HE IS ACCELERATING.** `p.pushT` accumulated RAW
  SECONDS and was compared against `p.pushPeriod` -- which moves with speed, .60 at a standstill
  to 1.55 at a cruise. The clip meanwhile advances by `dt / period` through its own timeScale,
  which is the honest phase integral. `T/P(now)` and `integral dt/P(t)` are the same number only
  while P is constant, and it never is. The comment claimed *"its clock is the very phase the
  shove is fired from, so the foot and the push cannot drift apart"* -- same landmine, one line
  over. `p.pushT` IS the phase now, in [0,1), so there is one clock and nothing to drift.
  **AND THE CLIP IS PUT ON IT ONCE A CYCLE, NOT EVERY FRAME.** `skinWeights` rewinds an action to
  zero the moment its weight comes off the floor, and that happens again every time `p.crouch`
  crosses .5 and swaps which push clip is playing, mid-cycle. One write at the start of a push and
  one at each wrap; writing an action's time from a counter EVERY frame is what an earlier build
  did and it got stuck. It sits after `colinSet`, because that is where the rewind happens.
  **THE FIRST PUSH STILL LANDS AT ONCE** -- the cycle is STARTED at the plant (`p.pushT = plant`,
  and `p.pushSync` puts the clip there too, so the foot is already down). Waiting a plant's worth
  of wind-up would be honest and it is also a quarter of a second of nothing happening when the
  thumb goes down, and a skater leaving a dead stop already has a foot on the road.
  **3. AND `SFX.edge` WAS OPENING ON ROOM TONE, NOT ON THE EVENT.** It found the first sample over
  an ABSOLUTE floor (.005, about -46 dBFS), which on a real recording is the room and the shoe
  moving through the air. Measured on his own four:
      skateboarding_start    edge opened 0.029s, the SCRAPE is at 0.130   -> 101 ms bolted on
      skateboarding_ollie                0.029                  0.076     ->  46 ms
      skateboarding_landing              0.029                  0.074     ->  44 ms
  A tenth of a second of nothing in front of the push, which is exactly the thing that note says
  nothing on the trigger side can fix. The onset is found RELATIVE to the file's own peak now
  (`SFX.hit` .25, with `SFX.pre` 30 ms of run-up kept so the attack survives); the absolute floor
  stays as the outer bound and as the tail, and the start can only ever move LATER, so a file that
  opens on its own event is untouched. **Tabled over all 25 effects before shipping** -- every
  borrowed one moves by 0 to 18 ms, the push by 68, the rolling loop by 103 (which is a loop and
  only starts further into its own steady part).
  **`JAM_PROBE=tools/probe-push.mjs` WRAPS `snd.push` AND READS THE PHASE IT FIRED ON**, which is
  the complaint measured rather than the mechanism described. Holding forward from a dead stop:
      c170   every sound at phase 0.000   = 46% of a cycle before the foot, 0.28s to 0.71s early
      c171   0.460 / 0.474 / 0.463 / 0.472 / 0.463 ...   worst 1.4% of a cycle, which is one frame
  and `npm run jam`'s brake probe reads the push as 8.0 -> 15.72 against c170's 15.73, so the
  impulse per cycle, the top speed and the turn are all untouched: only the phase moved.
  **AND THE PROBE'S FIRST VERSION INVENTED A DOUBLE PUSH.** It detected a shove by watching
  `p.shoveT` rise, which also ticks on its own, and reported two sounds a cycle that do not exist.
  Wrapping the function that makes the noise is the only thing that answers a question about noise.
- **MUSIC AND EFFECTS ARE TWO SWITCHES NOW, AND THE SPLIT IS A BUS (c170, `musicSet`, `sfxSet`,
  `SFX.bus`).** *"I think there's a button to mute the music, but I'd like to mute the music
  without muting the sound effects -- sometimes I wanna do screen records and I wanna record the
  sound effects, so later I can composite the clips over the same song that's in the game, and
  that way the song doesn't cut."* The reason the split has to exist is in the sentence: a
  capture with the game's own music baked into it can never be laid back under that same music,
  because the two copies do not line up.
  **`SFX.on` ALONE WAS NEVER ENOUGH, WHICH IS WHY THE OLD SWITCH LANDED ON THE MASTER.** `play()`
  already refuses every one-shot while it is false -- but the WHEELS and the blaster's CHARGE HUM
  are looping sources started once, not `play` calls, and they would carry on underneath for ever.
  So the master stops being the mute: `SFX.bus` carries the effects, the synth fallbacks and both
  loops, `MUSIC.gain` hangs off the master beside it, and either can go to zero alone.
  **A MUTED SONG IS PAUSED, NOT TURNED DOWN.** It is a streamed `<audio>` element (c133), so one
  left running under a zero gain goes on pulling megabytes down a phone connection to be thrown
  away -- and paused it keeps its POSITION, so unmuting picks the track up rather than restarting
  it. The bus goes to zero as well, because `pause()` is not sample accurate and a few
  milliseconds of music at the top of a recording is the frame he would have to cut out again.
  **THE NOTE KEY KEEPS THE JOB HE ALREADY THOUGHT IT HAD.** *"I think there's a button to mute
  the music"* -- there was, and it muted everything. It is in the same place with the same glyph
  and now does what he thought; the speaker beside it is the new one. A key that quietly changed
  meaning under him would have been the worse half of this. **Two keys rather than a three-way
  cycle**, which is `optStore`'s own rule: a mode you can be in without knowing it is worse than
  two controls that say what they are by being two controls. The gear moved 48 px right to keep
  the two audio keys adjacent.
  **AND THE PRESS CALLS `optSave`**, so a mute survives a reload -- he reloads for every build,
  and a mute he has to re-press on each one is a mute that does not work. The Audio rows in the
  panel read and write the same `MUSIC.on` / `SFX.on` the keys do, so the two cannot disagree.
  `city.music()` / `city.sfx()` from the console, plus Music vol and Effects vol.
- **A MAN IS A TARGET, NOT A WALL (c169, `COP.solid`).** *"If I skate by a cop and melee, right
  now I bounce off the cop. I want to run through him instead of bouncing off his collider. I
  wanna be able to hit the cops a bunch instead of flying and not bounce off."*
  **TWO THINGS WERE DOING THAT AND THEY ARE THE SAME LINE** -- the one in `groundUnder` that
  pushes every nearby officer's box into the PLAYER's resolver. On the board `SK8.bounce` gives
  every solid a restitution, so an officer was a bollard to pinball off; and on foot the push-out
  interrupts the lunge `MELEE.lock` had just aimed at him, so **the one case the lock exists for
  -- arriving ON the man -- was the case the collider prevented.**
  Measured through the shipped `stepPlayer`, skating at an officer 6 m ahead at 12 m/s:
      COP.solid 1 (was)   travelled  -1.38 m   ends at  -5.52 m/s   <- BEHIND where he started
      COP.solid 0 (now)   travelled  18.15 m   ends at  10.73 m/s
  He was not slowed by the officer, he was **fired backwards off him**, which is why the melee
  chain could never land twice.
  **THE SWITCH IS ONE-SIDED BY CONSTRUCTION**, which is the only reason it is one line: a cop
  walks on `resolveBoxes` too, but against his OWN list inside `stepCops`, and `groundUnder` is
  the player's alone. So the police still collide with the world and with each other.
  **AND `COP.r` STILL MEANS HIS BODY** everywhere it matters -- the punch cone, the bullet, the
  aim lock and the amber box in the collider view all read it. Nothing about hitting him changed;
  only whether he stops you. `COP.solid = 1`, or the Cops solid row, puts the wall back.
- **YES, THE SETTINGS SAVE -- AND `city.opt()` IS HOW THEY REACH ME (c169).** *"Do my preferences
  save when I edit something in the settings? Maybe I need to send you the startup preferences."*
  They save: `optSave` runs on **every slider drag, every toggle and every preset**, straight into
  `localStorage` under `city.opt`, and `optLoad` applies it at boot. There is nothing to remember
  and nothing to lose.
  **BUT THEY SAVE ON HIS PHONE**, which is exactly why a fresh device starts on the file's
  defaults and why the constants in this file drift out of agreement with what he is actually
  looking at -- c83 is the last time they were reconciled. `city.opt()` prints the live panel as
  JSON; paste it back and it becomes what everybody starts with. `city.grip()`'s rule applied to
  the whole panel, and the answer to a question he should not have had to ask.
- **THE KIT KEYS RING THE RIGHT STICK (c168, `KIT.ring`, `KIT.slots[].at`).** *"Put the
  skateboard directly above the right stick and the blaster directly to the left of it, and the
  jetpack in the middle of those two -- if you were to draw a greater circle around the right
  stick they all land on that circle. The blaster is at 9 o'clock and the skateboard is at 12."*
  A clock position is an angle, so it is one number per slot: `at` 90 is twelve o'clock, 180 is
  nine. **The jetpack is the BISECTOR at 135** -- half past ten -- rather than the 150 he called
  it: *"in the middle of those two"* is the instruction and an even arc is what it draws.
  `at: 150` is one number if he wants it tighter to the blaster.
  **THE ROW IS A ZERO-SIZE ANCHOR ON THE STICK'S OWN CENTRE**, not a position of its own: 20 px
  in plus half of 132, and 26 up plus the same, with the SAME `env(safe-area-inset-*)` terms the
  pad uses -- so the keys cannot drift off the circle on a notched phone, which two independently
  written positions would eventually do. `right` and `bottom` grow LEFT and UP from it, so the
  angle maps onto them with no sign to get backwards, and the 29 is half a key because those
  properties place an EDGE and what is being placed is a middle.
  **AND THE RADIUS IS ARITHMETIC RATHER THAN TASTE**, which is the same argument that put the row
  above the pads in the first place. Computed rather than eyeballed:
      board    right  -29.0  bottom   81.0     centre  86 from the right edge, 202 from the bottom
      jet      right   48.8  bottom   48.8     centre 164, 170
      blaster  right   81.0  bottom  -29.0     centre 196,  92  -- level with the stick's centre
      clearance from the right pad's rim  15 px
      and on a 390 px phone held PORTRAIT, the nine o'clock key clears the LEFT pad by 13 px
  That last line is the binding constraint and it is why `ring` is 110 rather than larger.
  **`body.title #kitRow .key{pointer-events:none}` STILL HAS TO WIN**, and it still does --
  `#kitRow .key` gained `position:absolute` but no change to specificity, so three invisible
  buttons cannot take a thumb through the title card. That is the `#startB` landmine and it is
  checked on every layout change here.
- **NO BAR CLIP EVER PLAYED, AND IT WAS NEVER THE CLIPS (c167).** *"None of the animations ever
  play for when he's swinging around the pole. I explicitly told you I have two animations for
  that -- pole idle and pole pump -- neither of those play. He's just in what looks like a regular
  idle pose, and since he's an idle pose his hands are right at his hips, so therefore he's
  spinning around his hips."*
  **EVERY WORD OF THAT IS THE SYMPTOM OF ONE LINE.** `stepPlayer`'s two bar branches read
      if (player.bar) { stepBar(dt); poseColin(dt); return; }
  -- they pose him and RETURN, so **`colinAnim` was skipped for the entire time he was on a
  bar**. That is the only function that sets clip weights, so the mixer kept whatever it last
  had, which is `idle_neutral` at 1. He hangs in the idle pose for ever; `bar_hang_idle` and
  `bar_pump` never reach weight at all; and `BAR.mark`'s hand pair is therefore measured **at his
  hips**, which is the pivot he described. **The placement was never wrong and the export was
  never wrong.** One `colinAnim(dt)` in each branch.
  **FOURTH TIME: WHEN A FEATURE DOES NOTHING, CHECK WHERE IT IS CALLED BEFORE WHAT IT DOES** --
  and it is c150's own lesson, in the very branch whose comment records learning it.
  **AND `npm run bar` COULD NOT SEE IT, WHICH IS THE PART WORTH KEEPING.** That harness poses
  `bar_hang_idle` ITSELF and then runs `barPlace`, so it measured a path the game never takes and
  reported `grip off bar 0.0000` to four decimals while the game had him by the hips. **The tool
  was right about the arithmetic and the arithmetic was never the question** -- the
  `normals.mjs` / `normGeo` mistake in its purest form, and the eighth time this repo has paid
  for it. Three builds of bar fixes (c154's facing, c164's swing sign) were real and none of them
  could ever have shown, because nothing was animating underneath them.
  **SO THE GATE CHECKS THE SHAPE NOW.** `tools/syntax.mjs` fails any line that calls `poseColin`
  and returns without `colinAnim` or `colinSet` beside it. It is crude, it is a source-shape
  test rather than a behavioural one, and it costs nothing and always runs -- which is the whole
  argument, because no offline harness in this repo can build a skin (`npm run jam` has no Worker
  for DRACO) and so none of them can ever test this by playing it. Verified by reverting the fix
  in a copy: `line 10025: poses and returns without setting clip weights`.
  **AND THE SPIN IS FASTER** (`wMax` 7 -> 11, `pump` 7.5 -> 11): 1.75 turns a second against 1.1,
  and 12 m/s at the hands against 7.6. Through the shipped `stepBar`, from a dead hang:
      level with the bar 1.55s -> 0.78s      over the top 2.20s -> 1.92s      peak w 11.00
  Both are sliders (Bar pump / Bar top speed / Bar drag), because how fast a giant should go is
  a look-at-it decision and those belong on the phone.
- **THE NEW OFFICER AND THE NEW PISTOL (c166).** *"I updated a new version of the pistol that
  goes with a new version of the cop. It's a different animation style. He should have all the
  same animations. I just stole them from the other one and kinda adjusted them, but he's a new
  guy so you'll need to inspect that and use him instead of the old cop."*
  `models/police_officer_toon.glb`, and `models/pistol.glb` replaced in place. **All sixteen clip
  names are identical to the old export**, diffed with `npm run cop` on both files -- so
  `COP.clips` needed no change and neither did the state machine. What moved:
      height   0.868 -> 0.859 file units   ->  x2.016 -> x2.038, and `buildCops` MEASURES it
      soles    0.000 -> 0.002 in every ground clip   ->  still no `sitSkin` lift to apply
      travel   0.00 m in every clip        ->  still animates in place, locomotion code-driven
      weapon_root on mixamorig_RIGHTHand   ->  c85's officer was LEFT-handed. This one is not.
      knock_down_front -> get_up_front  174.1 deg out, back pair 14.0   ->  `COP.flip` STAYS
      get_up_front  7.67 s -> 3.04 s     idle_01  8.38 -> 3.04    hit_while_shooting 3.63 -> 3.04
  **THE HAND SWAP COST NOTHING, AND THAT IS c85 BEING PAID BACK.** The mount finds `weapon_root`
  BY NAME, so an officer who changed hands between exports needed no code change at all -- which
  is exactly the property that ended two builds of hand-nudging when the joint first appeared.
  **AND `COP.upRate` HAD TO COME DOWN TO 1, WHICH IS `TRIM`'S RULE ONE SYSTEM OVER.** It cuts the
  get-up state short at `clipLen / upRate`, and 2.6 existed only because `get_up_front` was
  **7.67 s at 1x, which is a nap**. His new export cuts it to 3.04 s and the old divisor would
  end the state 1.17 s in -- 38% of the way through a man standing up. **Delete the compensation
  the moment the export bakes the cut in**, or it is taken twice. The beat barely moves:
      front   old  out 2.4 + 7.67/2.6 = 5.35 s      new  2.4 + 3.04 = 5.44 s
      back    old  out 2.4 + 2.75/2.6 = 3.46 s      new  2.4 + 2.75 = 5.15 s
  The back one is the 1.7 s that changed, and it changed because 1.06 s of a 2.75 s get-up is a
  man snapping upright rather than getting up. A flat RATE means two different beats on two
  different clip lengths; letting each finish is one rule.
  **AND NO ROOT->TIP AIM ON THE PISTOL, WHICH IS A DECISION RATHER THAN AN OMISSION.** c165 added
  one for the blaster because Colin's barrel axis and the blaster file's are 76.7 degrees apart.
  Here `npm run joints` reads the officer's tip offset as `(-0.249, 0.000, 0.000)` and the
  pistol's as `(-0.249, -0.000, -0.000)` -- **MATCH, to three decimals** -- so the correction
  would be an identity matrix and a second thing to keep in step. That tool is what catches it if
  a future export drifts: it prints MATCH or it does not.
  **`npm run cop` TAKES THE FILE AS AN ARGUMENT NOW.** It hard-coded `models/police_officer.glb`,
  and there is more than one officer export in the repo -- a tool that measures a file the game
  does not load is this repo's oldest mistake, and it was one line from making it again.
  `models/police_officer.glb` stays in the repo and is still measurable that way.
- **THE BLASTER: HIS JOINTS WERE RIGHT AND THE MOUNT ONLY USED ONE OF THEM (c165, `WEAP.aimTip`).**
  *"Are you gonna correct the blaster or am I? My two joints are correct. You're rigging the
  blaster based on the rotation of the blaster root, but if you were to attach the blaster to the
  root and then POINT IT AT THE TIP, then you would get the perfect rotation."*
  **He is exactly right, and it took five re-exports to get here because every check I ran asked
  the wrong question.** c158 measured whether the joints MOVED, c162 measured where `weapon_root`
  sits (on his hand, 5% of his height, in every clip) -- both fine, both irrelevant. The mount
  parented with identity, which carries the BLASTER FILE's own convention onto his joint and
  **throws `weapon_tip` away**: it was read for the muzzle flash and never for the DIRECTION,
  which is the thing it is for. `npm run gunpose` reads both axes in the mount's own local space:
      blaster.glb   weapon_root -> weapon_tip   -0.985,  0.000,  0.174
      colin.glb     weapon_root -> weapon_tip   -0.396,  0.009, -0.918
      BETWEEN THEM  **76.7 degrees**
      after the minimal rotation `weapFit` now applies:  0.000 degrees off
  **NO RE-EXPORT COULD EVER HAVE FIXED THAT**, which is why he was right to keep pushing back and
  why "they look identical" and "the joint is on his hand" were both true and both useless. A
  file cannot correct a mount that is ignoring half of what the file says.
  **ATTACH TO THE ROOT, THEN TURN UNTIL THE BARREL LIES ON ROOT->TIP.** Both directions are taken
  in the MOUNT's local space (`worldToLocal` on the two tip positions, scale-safe because the
  mount origin is that space's zero), so the correction is a pure rotation about `weapon_root` --
  which is `barPlace`'s rule one mount along, and it means the export stops being something this
  code has an opinion about.
  **A MINIMAL ROTATION, so whatever roll the art had is kept**, and `WEAP.grip`'s three angles now
  ride ON TOP in the AIMED frame -- which is what finally makes "Grip roll" roll the BARREL.
  **ONE-SHOT RATHER THAN PER FRAME, AND c162 IS WHY THAT IS SOUND**: the marker tracks are
  stripped at load, so root->tip is a constant of the rest pose and cannot drift under a clip.
  `WEAP.aimTip = 0` (or the Aim barrel at tip row) puts the old behaviour back for an A/B.
- **AND THE COLLIDER VIEW WAS DRAWING 78 cm ABOVE THE COLLIDER (c165).** *"I need to see the
  collider. I need to see the collider. I need a debug code to turn on the collider."* Three
  times, and it has existed since c161 -- on tap **TWELVE** of the build badge and buried two
  thirds of the way down the settings list. **A control he cannot find is a control that does not
  exist**, which is this file's own rule about the charge ring, applied to the one thing he was
  asking for in order to check my work.
  **AND IT WAS WRONG WHERE IT MATTERED MOST.** The car box was drawn from `c.y` upward, and the
  real collider is `c.y - c.lift` upward -- **`lift` is 0.78 m, half a car** -- so the wire box
  floated above the thing it was supposed to be describing. It comes off `c.box.miny/maxy` now,
  which IS the collider, so it cannot drift from it again. **A debug view that disagrees with the
  thing it draws is worse than no debug view**, because it is a second thing to be wrong.
  So: the FIRST row of the settings panel under a `Debug` heading (the gear is next to the
  badge), `city.boxes()` in the console, and **the chip says `· COLLIDERS`** when it is on --
  because "did the toggle take" must not be something he has to infer from whether boxes
  appeared. Badge tap 12 still works and is still the diagnostic half.
- **THE BAR IS A HOLD AND A SWIPE NOW, AND THE CAMERA IS FREE AGAIN (c164, `npm run bar`'s
  placement check, `JAM_PROBE=tools/probe-bar6.mjs`).** *"I actually think the camera should still
  be able to orbit. The way we solve his ability to swing is: if you're holding down on the right
  stick, that's how he starts pumping, rather than needing to push a direction -- because if we
  can orbit the camera, the problem is that the direction would be relative. Then to fly off it
  you swipe the right stick, which will launch him. Also it's way slower than I wanted."*
  **HIS DIAGNOSIS IS THE WHOLE FIX AND IT IS EXACTLY RIGHT.** The old pump dotted a
  CAMERA-RELATIVE thumb against the swing plane, so what counted as "forward" changed every time
  the lens moved -- which is precisely why c154 had to LATCH the bearing, and why the camera and
  the control were stuck in each other's way. **A hold has no frame to be relative to**, so the
  two stop fighting and the orbit costs nothing: the same thumb pumps and orbits at once.
      pump     the right pad HELD. From rest he swings the way he FACES (a direction he always
               has); after that always WITH the swing, so every half builds.
      launch   a SWIPE, through `boardFlick`, where every other verb on that pad lives. It has
               to be: the pad is held to pump now and a tap is a short hold, so a tap that also
               let go would fire every time a thumb bounced.
      camera   `barAim`'s searched bearing swings the shot in over `BAR.camSettle` -- which is
               what stops it starting inside a wall -- and after that this branch stops writing
               `cam.az` at all, so the ordinary drag is the only writer.
  **AND "ALWAYS ADDS" IS MOST OF THE SPEED.** "Only while the thumb agrees with the swing" was
  the physically honest rule and it threw half of every cycle away unless you alternated in time
  with him -- a thing to learn rather than a thing to do. Driven through the shipped `stepBar`:
      holding      level with the bar at 1.55 s, OVER THE TOP at 2.20 s, peak w 7.00 (the cap)
      not holding  never, and peak w 0.00 -- nothing happens on its own
      a TAP        still on the bar        a SWIPE   released, on w -1.85
  **AND THE KIP PLAYS WHILE HE PUMPS, NOT WHEN HE IS ALREADY FAST.** *"I don't ever see him doing
  the pump animation."* It was gated on `barW` past `wGo` alone, so it needed a real swing before
  it ever appeared -- on a swing that was slow to get there for the reason above. **The clip is
  the ACTION, not the speed**: a thumb on the pad shows it at once and `colinSet` eases it in.
- **AND THE BODY WAS SWINGING AGAINST THE PHYSICS DRIVING IT (c164, `barPlace`).** *"It's like
  he's rotating around his middle point."* `stepBar` puts his centre of mass at
  `+forward * len * sin(a)` with `forward = (-B.az, B.ax)`; a right-handed rotation of
  `(0, -len, 0)` about `(B.ax, 0, B.az)` by `+a` sends it **the other way**. So the pendulum
  pushed him one way round and the model turned the other, which is a mirror image at every
  angle except the bottom -- and at the top of a giant it is a body inverted about the wrong
  point. `-barA`, and **measured rather than argued**, because this file gets handedness
  backwards half the time when it reasons about it.
  **SO THE ANSWER TO "SHOULD I REDO THE ANIMATIONS ORBITING HIS ROOT" IS NO.** *"I wonder if I
  should just redo the animations orbiting around his root, which would allow the entire rotation
  to work better -- the problem would then just be blending the animations."* He is right that it
  would be a blending problem, and he does not have to pay it: the placement is already measured
  off `BAR.mark` and it is EXACT. `npm run bar` runs the shipped `barPlace` (lifted between the
  `BARPOSE:` markers) against the real rig in the real hang clip:
      the hang clip   hands 1.253, head 0.926, toes -0.101  -> hands over head over feet, a hang
      a 0 / 45 / 90 / 135 / 180 / -45 / -90 deg   grip off the bar 0.0000 m at EVERY angle
      the swing side agrees with `stepBar` in 7/7  (it was 2/7 before the sign)
  **He pivots about his HANDS to four decimal places**, so a clip authored around the root would
  hand the code a rotation it is already doing and the two would compound. The mark's whole job
  is to say where the bar is RELATIVE to him (c149); that is the property that makes the export
  something this code has no opinion about, and it is worth keeping.
  **WHAT THAT MEASUREMENT DOES NOT EXPLAIN is the pose in his screenshot** -- head below the bar
  with the feet above it, which no rigid rotation about the hands produces from this clip. The
  sign was real and is fixed; if it still reads folded after c164 the next suspect is a clip left
  welded at weight 1 by the `isRunning()` landmine, and the chip census is where that shows.
- **`poseBar`'s GEOMETRY IS A FUNCTION NOW (`barPlace`, `BARPOSE:` markers).** It was inline and
  reached for `player`, `colin` and `CHARS`, so no harness could drive it and the sign above went
  four builds unmeasured. It takes a root, two marker nodes, the bar and two angles, and
  `npm run bar` runs that text. **A harness that measures a copy of the code is this repo's
  oldest mistake** -- this is the seventh time it has been worth the refactor to avoid it.
- **PULLING BACK BRAKED AND FULL-LOCK STEERED AT THE SAME TIME (c163, `p.braked`,
  `JAM_PROBE=tools/probe-brake.mjs`).** *"When you're on your skateboard and you pull down on the
  left stick, it should slow you down -- maybe I'll even put in a little skid animation so we can
  have a stop, but for now it just slows you down. Instead, it turns you."*
  **ONE STICK WAS ANSWERING TWO QUESTIONS.** `steer = clamp(ang / .9, -1, 1) * s.mag` was computed
  unconditionally, above the `braking` test -- so a thumb pulled straight back reads |ang| ~ pi,
  saturates that clamp at FULL LOCK, and he carves round hard while the brake scrubs underneath
  it. **And at exactly pi the SIGN of `ang` is whatever rounding says**, so which way he swings is
  noise. Then the heading comes round toward the thumb, `dir` flips to +1, the brake stops being a
  brake and the push block takes over -- so a held brake was a 180 carve into an acceleration,
  which is his sentence exactly.
  **A HELD BRAKE IS A BRAKE UNTIL THE THUMB LEAVES IT.** One latch answers all three halves: no
  steering, no half cab at `fakieAt`, no fakie push at the bottom. He decelerates, stops, and
  stays stopped -- which is the "for now it just slows you down" he asked for, and the skid clip
  drops into it later with no rule change.
  **AND THE LATCH CANNOT BE HUNG ON `dir`, WHICH IS A KNIFE EDGE AT NINETY DEGREES.** `dir` is
  `fwdC >= 0`, and a thumb held exactly sideways puts `fwdC` at +/-1e-17 -- so "is he leading with
  the tail" is decided by rounding. **My first version latched on that and the probe caught it on
  frame two**: `braked 1` during a pure right-hand turn, and the steering dead for the rest of the
  session. The zone is `fwdC < -.35`, the same margin the push already demands the other way.
  **AND THE PROBE'S OWN FIRST RUN HAD THE PAD UPSIDE DOWN**, reporting the brake accelerating him
  to 21 m/s -- which is the PUSH working perfectly. `stickWorld` maps `w`/up to `ly -= 1`, so the
  pad's +Y is DOWN THE SCREEN and pulling back is `(0, +1)`. Written down because it is the same
  handedness trap this file gets wrong half the time when it is argued instead of run.
  Driven through the shipped `stepPlayer` over the real collider, before and after:
      thumb straight back, 15 / 8 / 4 m/s   yaw 0.0 deg, stopped at 1.53 / 0.82 / 0.40 s
      15 deg off either way                 yaw 0.0 deg, stopped at 1.58 s
      thumb FORWARD (a push)                8.0 -> 15.73, untouched
      thumb RIGHT (a turn)                  179.4 deg in 2 s -- still a real carve
- **AND A SAVED SLIDER CAN HOLD THE BLASTER WHERE NO EXPORT CAN REACH IT (c163, `GRIP OFF`).**
  c158 put `WEAP.grip` on seven rows of the settings panel, and `optSave` writes every row into
  `city.opt` -- so **one nudge while experimenting is baked into that phone for ever** and
  reapplied by `optLoad` on every boot. From where he is standing that is indistinguishable from
  "the export did not update", because no re-export can ever move it, which is exactly the
  complaint that has now been made five times. The chip says `· GRIP OFF` when the grip is not
  identity and is silent when it is -- `gun93cm`'s rule, one cause along. `city.grip({x:0, y:0,
  z:0, rx:0, ry:0, rz:0, s:1})` clears it, and so does the Defaults preset.
- **"ARE YOU JUST NOT USING THE MODELS I'M PUSHING?" -- WE ARE, AND THE GUN'S OFFSET WAS NEVER IN
  `colin.glb` (c162, `npm run gunpose`, `markClips`).** *"I really cannot figure out why the
  blaster is wrong. I've corrected it five times. It's right in Cinema 4D, it's right in Blender.
  I've pushed it four or five times."* Three separate answers, and none of them is the one he
  was afraid of.
  **1. ONLY ONE OF THOSE PUSHES EVER CHANGED A FILE.** `git log -- models/colin.glb` stops at
  `834d408` (c155, my copy of his `6370ce9 "fixed colin"`). Every commit after it is **EMPTY --
  zero files.** So four of the five corrections never left his machine, which is a REAL bug and
  it is in the upload, not in the game. That is worth checking first every time, and it takes one
  command.
  **2. THE JOINT HE KEEPS CORRECTING IS ALREADY RIGHT.** Every previous check here measured the
  REST pose -- `npm run joints`, `npm run gun`, the export diffs -- **and the rest pose is exactly
  what he is looking at in Blender.** The game is never in it: a clip plays on every frame, the
  hand bone moves, and `weapon_root` rides it. So `npm run gunpose` poses the rig with a real
  mixer in the clip he is STANDING in and reads where the mount ends up:
      idle_neutral  weapon_root 0.479 (37% of his height)   his RIGHT HAND 0.506 (39%)
      walk / run / rifle_idle -- all four clips: 0.062 from the hand, **5% of his height**
  Six centimetres off his palm, in every clip. **The grip is on his hand and his export is fine.**
  **3. SO THE OFFSET LIVES IN `blaster.glb`, WHICH IS THE FILE HE HAS NOT BEEN CORRECTING.**
  `attachGear` neutralises that file's own chain above `weapon_root` and parents with identity
  (c98), so where the gun sits relative to the grip is **entirely the blaster's mesh-to-marker
  transform**. Mounted the way the game mounts it, its centre lands 0.322 from his hand -- a
  quarter of his height, mostly +Z and +X, which is the gun projecting forward and across his
  body. **Correcting Colin can never move that, however many times it is done.** Two ways out and
  both are open: move the mesh relative to `weapon_root` in `blaster.glb`, or dial it live on the
  phone with c158's **Blaster grip** sliders and send back the `city.grip()` line to bake in.
  **AND THE LATENT HALF IS NOW REAL.** c158 checked that all 51 clips key both markers, found them
  inert, and wrote down that they were "still a loaded gun". They are not inert any more --
  measured, worst rotation put on `weapon_root` per clip:
      bar_release 139.2 deg   bar_pump 83.2..103.2   bar_hang_idle 76.7   walk_fwd_swagger 57.5
      idle_neutral 0.0        walk_fwd_neutral 0.0   run_fwd 0.0
  Standing still the gun is where he rigged it; swinging on a bar it is **139 degrees out**, which
  is why nothing in his idle screenshots could ever show it. That is c151's landmine wearing its
  other face: there the keys spread INTO the rest pose, here what is left is the tracks.
  **A MOUNT MARKER'S REST POSE IS THE PLACEMENT, SO A CLIP MUST NEVER MOVE ONE.** Both markers are
  children of his right hand, so the hand's own animation already carries them -- a track ON the
  marker is the gun moving inside his fist. `markClips` strips them over the POOL, beside
  `trimClips` and `deriveClips`, so a character driving his OWN clips is covered by the same line
  (Moussa's `weapon_root` chain is byte-for-byte Colin's). **The rest pose is the one thing he can
  see in Blender, so it is the one thing that has to win.**
  **AND THE BAR DOES NOT CARE**, because c151 already took it off these markers: `BAR.mark` is
  `bar_root`/`bar_tip` then the HANDS, and the hands are bones whose animation is the whole point.
- **THE BOLT TESTED A CIRCLE ON THE CAR'S LONG AXIS (c161).** *"I think the vehicle colliders are
  way too big -- one will be next to me, I'm not even really near it, trying to shoot something
  else, and when I shoot there's a big flat line and the car gets hit even though I didn't shoot
  at the car at all."* He is right, and the line says exactly how wrong:
      if (Math.hypot(o.x - this.x, o.z - this.z) > R + o.hl) continue;
  `hl` is the car's half **LENGTH**. So the test was a CIRCLE of that radius about the centre,
  whichever way the car was pointing. Measured on the 341 real cars in the real city
  (`JAM_PROBE=tools/probe-box.mjs`), against a 1.40 m bolt:
      the average car                     5.02 m long x 2.09 m wide
      OLD  a circle on the long axis      7.82 m of hit window across its flank
      NEW  the car's own box              4.89 m
      **a bolt scored a hit out to 3.91 m from the centreline, where the metal ends at 1.05 --
      so up to 2.86 m of CLEAR AIR read as a hit**, which is most of a lane.
  **THIS FILE ALREADY HAD THE NOTE, ONE SYSTEM OVER.** *Cars are oriented boxes, not the AABB of
  a rotated one -- that is the phantom hit, where the box touches you and the mesh plainly does
  not.* `carHit` and `resolveBoxes` have both tested in the car's own frame since c50-something;
  **the bolt was the one thing left using a radius**, and a circle is worse than the AABB that
  note was written about. Same frame, same `hl`/`hw` half extents, so the three cannot drift.
- **AND HE CAN SEE THE COLLIDERS NOW (c161, `BOXES`, badge mode 12).** *"Is there a debug code for
  the collider? I wanna see them."* He should be able to, and the fact that he was RIGHT is the
  argument: no amount of describing a hit test is worth one look at it. `/nan map`'s rule applied
  to geometry instead of to a framebuffer -- measure the buffer, do not reason about it.
  **CARS ARE DRAWN IN THEIR OWN FRAME**, yawed, because an axis-aligned wire box round a car at 45
  degrees would show the phantom rather than the collider and answer the wrong question. Three
  families in three colours: cars pink, the static grid green, the police amber -- the police
  being separate because they are a box handed to the player's resolver every frame rather than a
  member of the static grid, so a wrong one is wrong THERE and nowhere else.
  It rebuilds only while it is on, and the static grid is taken from `gridQuery` around HIM
  rather than drawn whole -- thirty thousand boxes is not a thing to put in a buffer. `BOXES.on`,
  or the Show colliders row in settings, or tap the badge to 12.
- **A SHOT CAR TAKES THE HIT (c161, `WRECK.kick`).** *"When you shoot the cars they should kind of
  get a little kickback."* Integrated into `c.x/c.z` in `stepTraffic`, not drawn as an offset on
  the group -- so the collider, the traffic grid and the picture move together and there is no
  second position to keep in step. A shot car has `speed = 0` and `zap = 1e9` since c147, so
  nothing else is driving it and the nudge is all there is.
  **`Math.exp(-k*dt)`, never a bare `*= k`**, and the distance is `kick / kickDrag` -- about 1.6 m
  in TOTAL however long it is on screen. That arithmetic is the one c146 paid for with debris that
  left the postcode: **a launch speed means nothing without the clock beside it.** The jolt is a
  ROLL on its springs rather than a hop, because a car that takes off from a plasma bolt reads as
  a bug and not as recoil. It takes its direction from `hx,hz`, the bolt's OWN velocity, which is
  the direction already stored -- `copFly`'s rule about not deriving one from the geometry of an
  impact where the two things are on top of each other.
- **THE BLASTER HUMS WHILE IT CHARGES (c161, `CHARGE`), AND IT IS `WHEELS` ONE WEAPON ALONG.**
  *"I need a charge noise for the laser -- when you're holding it, it hums."* A charge is not a
  `play()`: it is ON for as long as the thumb is up, it RISES, and it stops when the shot leaves.
  A one-shot sample can do none of that -- it ends early on a long hold and runs past a short one
  -- which is exactly why the rolling wheels are a looping source and not an effect.
  **TWO PATHS AND THE REAL ONE WINS**, the skateboard's rule: the synth is a capacitor whine (two
  detuned saws under a lowpass that opens, where the DETUNE is what makes it read as electrical
  rather than as a note) and it stands itself down the moment a recording decodes. Drop one at
  `CHARGE.file`, run `npm run bump`, and nothing in the code changes.
  **`robits/audio/powerup_01.mp3` IS THE WRONG SHAPE** even though it is the right idea -- it is a
  one-shot RISE, and a hold wants a few seconds that LOOP.
  It is driven off `p.chg`, the same number `stepChargeFx` draws the ball from, so the sound and
  the picture can never disagree about how full the shot is.
- **YES, WEBP DOES TRANSPARENCY -- AND IT IS THE RIGHT DEFAULT FOR ANYTHING DRAWN (c161).**
  *"Does WebP do transparency? I did them as PNGs but I'm wondering if in future I should do WebP
  for things with transparency."* It does, lossily, and it is a big win. Measured on his own art
  with `sharp` at quality 82 / alphaQuality 90:
      shredworld_title_02   2129x739   2042 KB  ->  348 KB   5.9x
      shredworld_title_01   2172x724   1762 KB  ->  249 KB   7.1x
      the three name cards   256 wide   37-50 KB -> 10-12 KB  4x
  **The wordmark is the one that pays** -- 1.7 MB off the screen that loads FIRST, which is the
  same argument the splash's 2.65 MB -> 270 KB was made on at c106. It ships as WebP now with the
  PNG under it on an `onerror`, `BOOT.png`'s rule: a phone that cannot decode WebP would show
  nothing where the title is, and blank is indistinguishable from a bug.
  **The name cards stay PNG.** 100 KB is not worth a second path, and they already degrade to
  text by design if they fail. **Export drawn art as WebP from here on; keep PNG only where the
  file is small enough not to matter.**
- **THE SLASH MARK LIES IN THE WORLD, FLAT -- AND FOR FOUR BUILDS I WAS ARGUING ABOUT THE WRONG
  AXIS (c160, `SLASH.lay`, `slashOrient`).** *"They're always parallel to the camera where they
  should be perpendicular. If you were looking at a top-down view of the top of the character's
  head, the swipe would be parallel to the ground. Right now they just look like they're going up
  forward."*
  **c91 BUILT IT AS A `THREE.Sprite`, WHICH IS CAMERA-FACING BY DEFINITION.** So the crescent
  always lay in the SCREEN plane, and every fix after it -- c153's projected roll, c91's own
  per-clip constants, and the tool I wrote to measure them -- was choosing which way a mark lay
  **on the glass**. That is the wrong question. A horizontal swing is a horizontal arc **in the
  world**, seen in perspective, and no amount of rolling a billboard will ever produce one.
  Three rounds of this were spent making a flat sticker point in a better direction.
  **AND c91'S OWN LESSON WAS HALF RIGHT, WHICH IS WHY IT SURVIVED SO LONG.** Its note says a
  `RingGeometry` turned by his heading puts the NORMAL along the swing -- edge-on, reads as
  nothing -- and that is true. The answer to it was never *make it a billboard*; it was **lay it
  FLAT**: normal along world UP, yawed about Y so the crescent's bulge points where the fist is
  going. It is a `Mesh` on a `PlaneGeometry` now, not a sprite.
  **THE YAW IS `h - PI/2`, SOLVED RATHER THAN GUESSED.** Laid flat, the card's local +X maps to
  world +X; `Ry(a)` takes it to `(cos a, 0, -sin a)`, and forward in this game is `(sin h, cos h)`.
  Solve: `cos a = sin h`, `-sin a = cos h`, so `a = h - PI/2`. Written down because this file gets
  handedness backwards half the time when it is argued, and `npm run slash` now confirms it
  against the shipped `slashOrient`:
      normal 0.0 deg off world up at every bearing; bulge 0.00 deg off the blow
      at `tilt` .30 the normal reads 17.2 deg, which is the tip and nothing else
  **`SLASH.tilt` EXISTS BECAUSE THE PLAY CAMERA IS ONLY 12 DEGREES ABOVE THE MARK.** Perfectly
  flat, the arc foreshortens to about a fifth of its height and reads as a line; a few degrees of
  tip keeps it an arc without standing it back up. It is a dial in the settings panel, beside a
  `Flat | Card` switch -- a look is his call and nothing is deleted, which is `FX.style`'s rule.
  **AND `slashAim` IS WHY NO CALLER KNOWS WHICH MODE IT IS IN.** The flat mark is placed by the
  world heading and its per-clip `roll` becomes a YAW about the blow; the card mark still wants
  `slashScreenRoll`'s projected screen angle. One function decides, in one place, so the three
  call sites are identical in both modes.
  **The material had to stay tone-mapped.** A `SpriteMaterial` tone-maps by default and so does a
  `MeshBasicMaterial`; setting `toneMapped: false` on the way past would have made this a change
  of BRIGHTNESS as well as of orientation, and then neither could be judged -- the badge cycle's
  own rule about moving one variable at a time.
- **HE SKATED OUT OF EVERY TACKLE, AND `accFall` WAS GATING THE BRAKES (c159).** *"There's a
  thing that happens when I melee -- if he slides it gives him a bit of velocity, and then when
  I'm running he's sliding around like he's ice-skating afterwards. I don't mind him getting a
  little velocity from a slide tackle, but on his feet he should still just run like normal."*
  **THE NUMBER IS WORSE THAN IT SOUNDS.** `ramp` is `1 - accFall * smooth(0, 1, sp0/ceil)`, and
  `rate` fed BOTH halves of the along-velocity change -- speeding up and slowing down. Coming out
  of a tackle he carries ten or eleven metres a second while the thumb asks for a walk, so that
  smooth saturates and `push` is at its floor (`stepMelee` had just set `goT = 0`):
      MOVE.acc 24  x  (1 - accFall .93)  x  push0 .3  =  **0.50 m/s^2**
      -> 11 m/s of tackle takes **21.8 SECONDS** to bleed off
  Twenty-two seconds of a man on ice, which is exactly what he described and is far past what I
  would have guessed from reading it. **`accFall` is about how fast he can SPEED UP, and slowing
  down is not accelerating** -- one sign test, and the negative half takes the full rate:
      down to a normal run in 0.05 s, travelling where the thumb points in 0.38 s
  **AND `goT = 0` ON MELEE EXIT WAS THE OTHER HALF.** That is a standing start, handed to a man
  still carrying the tackle's speed -- his legs are under him coming out of a strike, so it takes
  `stepRoll`'s own cancel value instead. The fix that matters is the sign test; this is the beat
  of sluggishness behind it.
  **IT ALSO MAKES `turnBrake` MEAN WHAT IT SAYS.** A hard turn lowers `want`, which puts `along`
  negative -- so it now costs him speed immediately rather than over the next four strides, which
  is what "plants the feet" was always describing.
- **A MELEE FLICK AT SOMEBODY LOCKS ON, AND THE LOCK HAS TO DELIVER HIM (c159, `meleeLock`).**
  *"When you melee flick with the right stick, if you're generally trying to flick towards another
  character like the cop, there will be a little bit of aim assist -- it basically locks onto him
  and shoots you towards him so that you perfectly melee towards him."*
  **BOTH HALVES, AND THE SECOND IS THE ONE THAT MAKES IT READ LIKE THE OTHER GAMES.** Aiming at
  him is not enough: a punch thrown at exactly the right bearing from four metres still hits air.
  So the lock also solves `melV` for the gap -- `carry` holds full speed for 45% and bleeds after,
  so a move covers `melV * melDur * .725`, and that inverts.
  **AND IT CANNOT GO GRABBY THE WAY `WEAP.lock` DID.** That one is a per-frame loop over four
  hundred cars and eight officers, which is why it is off. This is ONE SHOT, taken on the frame of
  the flick and never revisited, over the POLICE only -- there is nothing for it to flicker
  between. Not on a dodge roll (that is a move AWAY from somebody) and not on the board (c118:
  `stepSkate` owns the heading).
  **`dot - d * k` IS NOT "STRAIGHTEST WINS, NEAREST BREAKS THE TIE", WHATEVER THE COMMENT SAYS.**
  The harness put a cop 3 m away at 26 degrees against one 7 m away dead ahead and the NEAR one
  won -- by four thousandths. The honest question is *how far off the line of the flick is he*,
  which is `d * sin(angle)` **in metres**; `near` then says what a metre of distance is worth
  against a metre of miss. Same units on both terms, and it behaves the way the sentence reads.
  **AND THE ACQUIRE RANGE IS WHAT THE MOVE CAN COVER, NOT A TYPED NUMBER.** A flat 9.5 m locked a
  JAB onto a man six metres off and then could not get him there -- `strike` is 0.58 s, so even at
  `maxV` that is 5.5 m, and the probe read *gap at the CONTACT frame 3.40 m*. **A lock that turns
  him toward somebody he cannot reach is worse than no lock**, which is `WEAP.lock`'s own rule
  about a mark the gun does not keep. The range is `maxV * melDur * .725` clamped to `range`, so a
  punch acquires inside 5.5 m and a tackle inside 9.5, and every lock is deliverable by
  construction.
  **AND WHEN HE IS LOCKED, THE CONTACT FRAME IS WHEN HE ARRIVES.** `MELEE.at` is where the fist
  lands IN THE CLIP, about a third of the way in -- right for a jab thrown on the spot and wrong
  for a lunge still closing four metres. The probe read it exactly: `melV` solved to put him ON
  the man, and the blow fired with **a 1.81 m gap**, a swing at the air he was about to arrive
  in. **The picture and its consequence have to be ONE event** -- the slash mark's own rule, and
  the reason the blow was moved off the input frame in the first place. A locked strike swings
  when he gets there, and swings anyway at `lockAt` if he never does. An unlocked strike is
  untouched. Measured after, at every distance inside the range:
      cop at 1.5 / 2.5 / 4.0 / 5.4 m  ->  gap at the contact frame 1.43 / 1.70 / 1.63 / 1.74 m
      a punch reaches COP.reach + COP.r = 2.82 m, so every one of them connects
  **AND THE PROBE'S OWN PASS MARK WAS WRONG BEFORE THAT.** It asserted `COP.r + 1.2` -- a number
  I invented -- and called a clean hit short by nine centimetres. The threshold has to be the one
  `copsPunched` actually uses, or the harness is measuring a rule the game does not have, which
  is this repo's oldest mistake wearing its smallest hat.
  `JAM_PROBE=tools/probe-melee.mjs` drives the shipped `meleeLock` and the shipped `stepMelee`
  over the real collider: the cone, the two-target tiebreak, and the gap at the CONTACT frame.
- **HIS DRAWN NAME PLATES ARE IN (c159).** c143 wrote the hook as `images/name_<key>.png` and he
  exported `colin_name_256.png` / `moussa_name_256.png` / `zorp_name_256.png` -- so `CHARS.art`
  is what that field is for, one line each and none of his files renamed. **And the alien is
  called ZORP**, which his own artwork is what says: the plate IS the name, and the text under it
  was only ever the stand-in for a plate nobody had drawn yet.
- **"WHY ISN'T THE MODEL UPDATING?" -- IT DID, AND THE GUN STILL LOOKED WRONG (c158, `WEAP.grip`).**
  *"I don't understand why the model isn't updating. The blaster is not being held correctly, so
  I corrected all the joints -- I've done this like four times now and you're telling me they're
  exactly the same, but they're definitely not."* He was right to push back, and the git history
  settles it rather than either of us guessing:
      6370ce9  "fixed colin"                 -> models/chars/colin.glb CHANGED. It landed.
      834d408  c155                          -> copied onto models/colin.glb, which the game loads
      1477224, 4d73add  the two after it     -> **EMPTY COMMITS. Zero files.** Nothing uploaded.
  And the joint really did move -- measured across his fix, in armature units:
      weapon_root   t (2.99, -11.43, 2.32) -> (2.02, 2.80, 5.11)     CHANGED
                    r  identical, to four decimal places             NOT changed
      weapon_tip    t and r both changed
  **SO ONE OF HIS FOUR CORRECTIONS IS LIVE AND THE OTHERS NEVER LEFT HIS MACHINE**, and what
  landed moved the grip's POSITION and not its ROTATION. Saying "they are identical" was true of
  the two files on disk and false about what he had been asking, and it sent him back to Blender
  a fourth time for a problem the repo could have answered in one command.
  **THE REAL FAULT IS THAT HE COULD NOT JUDGE IT WITHOUT AN EXPORT.** `weapFit`'s joint path read
  `WEAP.fit.s` and threw the other six numbers away, so the ONLY way to move the gun in his hand
  was to re-rig, export, push, wait out the cache and look. **That is the loop `city.slash()` was
  built to end one effect over** -- *what is being matched is what the ANIMATION looks like, and
  there is nothing to derive.* `WEAP.grip` is a live offset, rotation and scale about
  `weapon_root`, on seven sliders in the settings panel, with `city.grip({...})` printing the line
  to paste back. Identity by default, so it is a dial and never a correction applied behind him.
  **`WEAP.grip` IS NOT `WEAP.fit`, AND SHARING ONE OBJECT WOULD HAVE BEEN THE `KIT.on` BUG AGAIN.**
  `fit` belongs to the HAND fallback and carries `ry: PI/2`, which exists only because a hand
  joint's forward is +Z while the barrel runs along -X. Applied on the joint path that constant
  swings the gun ninety degrees off what he is looking at -- one variable, two meanings.
  **AND THE MOUNT ITSELF MEASURES CLEAN**, which is why this is placement and not scale:
      npm run gun   neutralised above weapon_root -> 98.1 cm, 57% of his height, PLAUSIBLE
      npm run joints  colin tip len 0.647 vs blaster 0.571 -- 0.096 apart, and that is the MUZZLE
  **`weapon_tip` DOES NOT MOVE THE GUN.** It is the muzzle marker: `tipAt` reads it for the flash
  and the charge ball, and nothing about where the gun SITS comes from it. `weapon_root`'s own
  transform on the hand is the whole placement. Worth saying out loud, because "correct the
  joints" naturally means both and only one of them is the grip.
  **AND ALL 51 CLIPS KEY BOTH MARKERS** -- translation, rotation and scale, 306 channels. Checked
  rather than assumed after c151: they drive the same values the rest pose holds, so today they
  are inert. **They are still a loaded gun**: c151 is exactly what happens when one of them
  disagrees, and a marker that is animated cannot be corrected by editing its rest pose. If the
  grip ever stops answering `WEAP.grip`, strip those tracks at load before looking anywhere else.
- **WHAT A CHARACTER WEARS RIDES HIS OWN JOINTS (c157, `CHARS.list[].wear`, `wearFit`).**
  *"I added a Senegal flag model. It's just a simple plane. I rigged it to the same spine joint
  that it would go on on Moussa -- it goes along the back of his shirt, but it should be placed
  so all you have to do is rig it to the same joint that makes up his body."*
  He did all of it in the export. The roster gains one `wear:` field and **nothing about where it
  sits is typed in the game**: the file names the joint and carries the placement.
  **A `skins` BLOCK IS NOT A SKINNED MESH, AND I READ THE WRONG FIELD FIRST.** The file has
  `skins[0]` naming `mixamorig_Spine2`, which I took as "a skinned mesh on one joint" and wrote a
  skeleton swap for. It is not: the primitive carries POSITION, NORMAL and TEXCOORD_0 with **no
  `JOINTS_0`/`WEIGHTS_0`**, and the `graphic` node has **no `skin` reference at all** -- Blender
  writes the armature out beside a mesh that is merely parented to it. **The reference ON THE
  MESH is the fact.** That is `stripPoses`' own rule (the structural property, not the name or
  the neighbouring block) applied one field over, and the probe is what caught it: it reported
  `not rigged -- it cannot follow him` on a file I had just described as rigged.
  **SO IT IS PLACED RIGIDLY ON THE JOINT, WHICH IS THE BLASTER'S RULE AND NEEDS NO WEIGHTS.**
  `inverse(fileJoint.matrixWorld) * mesh.matrixWorld` is the whole computation -- the file's own
  chain above `mixamorig_Spine2` comes off and what is left is exactly where he drew the plane
  relative to that bone. Parented, so it follows every clip for free.
      as AUTHORED 0.130 x 0.088 m  ->  as WORN 0.158 x 0.112, x1.217 against his own x1.178
  **The mount applies no scale of its own**, so it is the size he drew and a re-export at any
  size lands right with no edit -- the skateboard's rule. (13 x 9 cm is a shirt PATCH; if he
  wants it across the whole back, that is a bigger plane in Blender and no code change.)
  **AND A GARMENT THAT IS WEIGHT-PAINTED STILL WORKS**, because that is the general case and cost
  six lines: its bones are re-looked-up BY NAME on the wearer and only the SKELETON is swapped, so
  a cape across three spine bones drops in unchanged. **`bind()` is never called on that path** --
  without a bindMatrix it runs `calculateInverses()`, which REPLACES the file's inverse binds with
  ones measured off wherever the wearer's bones are standing at that instant, and the authored
  placement is silently gone.
  It goes under `skin.model` BEFORE `dressSkin` runs, so it is toon shaded, unpainted and shadowed
  by the same pass his own meshes are, with no second path to keep in step. The chip carries
  `NO WEAR GLB` / `WEAR NO MESH` / `WEAR NO JOINT` and is silent when it is on, because from a
  phone all of those look like "his flag isn't there" and so does standing in front of him.
  **THE TEST THAT MATTERS IS THE LAST ONE**: a garment mounted to the wrong thing renders in
  exactly the right place standing still, so `npm run wear` **turns his Spine2 by 57 degrees and
  reads the flag again** -- 0.093 m of travel is it following the bone.
- **`npm run jam` CANNOT BUILD A CHARACTER SKIN, AND THE SKIN HARNESS IS `npm run wear` (c157).**
  The first garment probe was written as a `JAM_PROBE` and every character load failed with
  `Worker is not defined` -- `jam.mjs` decompresses ONLY `city.glb` offline, and every character
  GLB is draco too, so `DRACOLoader` reaches for a Worker that a headless node has not got. That
  is also why `probe-jump.mjs` reports the flip as *"no clip headless"*: `airStart` returns early
  with no `colin.actions`, and the jump numbers beside it are real.
  **So: anything about the CITY goes through `npm run jam`, anything about a SKIN goes through
  `npm run wear`**, which already decompresses per file into `tools/.wear-tmp/`. `wearFit` is
  lifted between the `WEAR:` markers there, and **its `WEARS` table is handed back rather than
  shadowed** -- a second table in the harness is one the shipped function never reads, so every
  character would report `nofile` and the tool would look like it was working.
- **`readFileSync(f).buffer` IS THE SHARED POOL FOR A SMALL FILE, NOT THE FILE (c157).** Five
  tools opened their GLBs with `readFileSync(f).buffer.slice(0)`. Node allocates anything under
  about 4 KB out of an 8 KB pool, so `.buffer` is the POOL and the file sits at some `byteOffset`
  -- slicing from 0 hands the loader whatever was in the pool before it, which came back as
  `Unexpected token '/', "/ex"... is not valid JSON`. **Every character GLB is megabytes and gets
  its own ArrayBuffer, so this was invisible for a year and only a 3 KB garment exposed it.**
  Fixed in `aim.mjs`, `cop.mjs`, `gun.mjs`, `wear.mjs` and `wearfit.mjs`: slice by the buffer's
  own `byteOffset`/`byteLength`. Worth knowing before the next small asset is measured.
- **THE DOUBLE JUMP COMES BACK WITH THE PACK OUT, AND A TAP IS NOT A HOLD (c156, `p.jetFlew`).**
  *"I want a tap to always -- first tap jump, second tap if it's a tap it's a flip, a double jump,
  but if the second one is a press and hold then it does the jetpack. That way you can do first
  jump, second jump and THEN jetpack, that'll be a fun effect."*
  **c116 GAVE THE WHOLE AIR MOVE TO THE PACK ON AN ARGUMENT THAT WAS ONLY HALF TRUE.** It said one
  thumb cannot mean both -- and it can, because a TAP and a HOLD are two different gestures and
  this pad has told them apart since the trigger was built (`fireAt` held for `armT` is the same
  separation, and so is the flick). What c116 was actually missing is the OTHER half of that rule.
  **THE RIGHT PAD SETS `player.jump` FROM `onRel` WITH NO HOLD LIMIT, AND THAT IS DELIBERATE** --
  it is the charge jump, which is a wind-up and a release by design. So the release of a FLIGHT
  reads as a jump too, and letting go at the top of one would spend the double on the way out.
  `p.jetFlew` is "a fired flick eats the tap" one gesture along: the flag is set where the motor
  actually lights, so it cannot disagree with whether he flew.
  **AND IT IS CONSUMED PER RELEASE, NOT PER FRAME -- WHICH THE FIRST VERSION GOT WRONG AND THE
  PROBE CAUGHT.** I cleared it beside `p.jump = 0`, which reads as one-shot and is not: that line
  runs EVERY frame, so the flag set during the hold was wiped a sixtieth of a second later and
  was long gone by the time the thumb came off. It reads `jetK 0.87` and `jumps 2` -- the pack
  lit AND the release still spent the double, which is the exact bug this flag exists to stop.
  It is tied to a `p.jump` now (`if (p.jump) p.jetFlew = 0;`), so the release it ate is the one
  that clears it: it can eat exactly one, and a stale flag can never reach a later jump from the
  keyboard or anywhere else. A fresh press clears it too, and so does landing.
  **A FLAG CLEARED ON AN UNCONDITIONAL LINE IS NOT ONE-SHOT, IT IS PER-FRAME**, and the two are
  indistinguishable when you are reading rather than running -- the same shape as a protection
  asserted only in a comment.
  **AND OUT OF FUEL IT FALLS BACK TO BEING A JUMP FOR FREE**: `want` stays 0, nothing is marked,
  the release jumps. That is the right behaviour and it needed no case of its own.
  The sequence he asked for, driven through the shipped `stepJet`/`stepPlayer`
  (`JAM_PROBE=tools/probe-jump.mjs`), pack out and pack away, and identical in both:
      tap                  -> jump
      tap, tap             -> double jump AND the flip
      tap, HOLD            -> the pack lights and the double is still unspent
      tap, tap, HOLD       -> jump, jump, THEN fly   (jumps 2, then jetK 0.87)
  **THE FLIP ITSELF IS A STATED GAP IN THAT HARNESS**: `airStart` returns early when
  `colin.actions[nm]` is absent and headless it is, so `p.air` reads empty in every row. What the
  probe measures is `p.jumps` and `p.vel.y` -- the mechanic -- and the flip is covered on device
  by its being the same call the no-pack case has always made.
- **HE RE-EXPORTS `models/chars/colin.glb` AND THE GAME LOADS `models/colin.glb` (c155).**
  His "fixed colin" commit -- the arm on the bar clips he said he would redo -- landed on
  `models/chars/colin.glb` alone, and `init()` loads `models/colin.glb`. The two were made
  identical at c151 and had silently diverged again, so the fix would have been in the repo and
  not in the game: **exactly the shape of bug the asset hashes exist to prevent, one directory
  over.** Copied across, and checked through the real loader rather than assumed:
      51 clips, all three bar clips present   back_flip still 53 frames -> TRIM.back_flip STAYS
      weapon_root still on mixamorig_RightHand, barrel along -X, 0.647 long -- the GUN, not a
      bar grip, so c151's separation holds (0.096 from the blaster against a 0.571 barrel; the
      tolerance calls that "no" and the shape of it plainly says otherwise -- worth a nudge in a
      future export, not a blocker)
  **TWO FILES FOR ONE CHARACTER IS THE STANDING HAZARD.** `npm run wear` reads `CHARS.list` and
  measures the `chars/` copy; the game loads the other. Until one of them goes, **check they
  match after every export of his** -- `md5sum models/colin.glb models/chars/colin.glb`.
- **THE BAR HAS ITS OWN CAMERA, AND THE CATCH STOPPED SPINNING HIM ROUND (c154).** *"I found
  swing pole! Problem now is the camera gets all messed up... when I jumped onto the pole he
  flipped direction so that he was facing towards me, where he should be able to enter from
  either direction. And we need a special camera for when he's on a pole, so that it's behind
  him and it stays stationary, maybe with a little bit of aim."* Two separate faults.
  **1. THE FACING.** `p.barSide = along >= 0 ? 1 : -1`, where `along` is his speed IN THE SWING
  PLANE. That is exactly right for flying across a bar at pace and it is **NOISE** for the case
  he was actually playing -- dropping onto one from above, where the plane speed is roughly zero
  and its SIGN is whatever rounding says. `>= 0` then picked +1 every single time, so half of all
  drop-on catches turned him round. Over `BAR.faceV` the approach decides; under it his own NOSE
  does, which is a direction he always has, so **there is no case left where nothing answers it.**
  **2. THE CAMERA WAS LOOKING AT THE PLAYER, WHICH ON A BAR IS NOT A PLACE.** Every line of
  `stepCam` is written against `player.pos`, and on a bar that is a point going round a circle at
  up to `wMax` 7 rad/s -- so the boom is whipped round with him and a giant is unreadable. **It
  looks at the BAR instead**, which cannot move by construction, and that one substitution is
  most of the fix: nothing had to be damped harder to buy it. Measured through the shipped
  `stepCam` on a real 6.5 rad/s giant:
      lens worst frame 0.0004 m, mean 0.0002 m, bearing wandered 0.00 deg over 2.5 s
  **AND BEHIND HIM IS WHAT THE CONTROL NEEDS, not only what he asked for.** `stickWorld` reads
  the pad in the CAMERA's frame and the pump dots that against the plane forward -- so a
  broadside lens puts the pump on left-and-right and leaves the forward thumb doing nothing at
  all. Catching a bar with the camera anywhere would have made the pump mean a different thing
  every time.
  **THE BEARING IS LATCHED, NOT FOLLOWED (`p.barAz`).** An auto-follow would be a second writer
  on `cam.az` and would undo his aim the instant the thumb lifted; a drag on the right pad MOVES
  THE LATCH, so the nudge sticks and the ease only ever serves the swing-round on the catch.
  That is the `KIT.on` rule -- one fact, one owner -- applied to a bearing.
  **3. AND THEN THE BOOM WAS PINNED AT `CAM.min` ON EVERY BAR IN THE CITY, WHICH THE FIRST
  MEASUREMENT CAUGHT AND NO AMOUNT OF READING WOULD HAVE.** Looking at the bar with the lens 1.7 m
  from his chest is not a shot; it is a close-up of a shoulder, and it is what would have shipped.
  **A BAR IS A SOLID BOX**, so a look point tucked just under one starts `camFree`'s probe inside
  that box. Swept over all 67 bars through the shipped `camFree`, the WHOLE circle of bearings:
      look -0.5    0 of 67 reach 4 m, AT ANY BEARING AT ALL   <- every bar, every direction
      look -1.4   24 of 67 dead behind him, and 66 of 67 once the bearing is searched too
  So it aims at the HANG (`camLook` -1.4), which clears the arm and is where he spends most of
  his time anyway -- the top of a giant is still only 2.5 m up against a 3.5 m half-frame.
  **AND THE BEARING IS SEARCHED, NOT SET (`barAim`)**, which is `titleAimClear`'s rule exactly:
  that function exists because the title camera's bearing was aimed on paper and put the lens
  inside a house. A bar is bolted to a post or a facade and behind-him is INTO it on half of
  them, so it tries behind him, then further round either way, and takes the first bearing with
  real room -- or the roomiest if none has any, which still beats taking the first by default.
  A broadside or front-on lens is a perfectly good shot of a swing, and nothing about the CONTROL
  depends on which side it lands: `stickWorld` reads the pad in the camera's frame, so the pump
  always answers the thumb pointing where he should go.
  **4. AND NINETY DEGREES IS NOT ON THE LADDER, WHICH THE HARNESS FOUND BY DISAGREEING WITH
  ITSELF.** The first search picked +/-90 for 21 of the 67, and on the very bar the probe swung,
  `camFree` said **7.20 m at the latched bearing while the running camera sat at 1.70** -- the
  same function, the same look point, the same `want`, 0.0005 rad apart. That tiny gap is the
  whole tell: **a quarter turn off the swing plane points the lens straight down the BAR'S OWN
  AXIS**, so the boom runs the length of the arm grazing it, and which side of the metal it
  passes is decided by where the ease happens to settle. A shot that flips to a close-up as it
  arrives. Gone from the ladder on that structural argument, not as a fudge.
  **AND A BEARING IS TESTED ACROSS THE RANGE IT OCCUPIES, NEVER AT ITS CENTRE (`BARJIT`).** That
  is `titleAimClear`'s own sentence, which it learnt when a bearing clear in the middle of the
  sway breathed into a wall two seconds later; here the range is the SETTLE. Measured over all 67
  through the shipped path, before and after:
      +/-90 allowed, centre only    0/67 under 4 m on paper -- and 1.70 m in the running camera
      +/-90 gone, settle tested     63/67 get the full 7.2 m boom, worst 2.47, NONE at CAM.min
  The four that never find 4 m are boxed in on every side and take the roomiest bearing there is,
  which is the honest answer and still beats taking the first by default.
  **`camEl` IS NEARLY LEVEL** for the same reason the shot exists: this game's usual .17 rad of
  downward pitch foreshortens the circle into a line, which is the one shape it must not be.
  **`npm run jam` with `tools/probe-bar3.mjs` DRIVES THE SHIPPED `barCatch`, `stepBar` AND
  `stepCam`** -- nine approach cases (both directions at 8 and 3 m/s, four drop-ons with no plane
  speed at all, one along the bar), a real 6.5 rad/s giant, and then the shot on every bar in the
  city. The drop-ons are the four the old facing rule could not answer, and they are the ones he
  was hitting. `tools/probe-bar5.mjs` is the other half: it sweeps the whole circle of bearings
  over every bar and prints the table above, which is what to re-run if `camLook`, `camDist` or
  the ladder is ever retuned.
- **ONE MARKER PAIR CANNOT HOLD TWO JOBS, AND `npm run joints` PROVED IT (c151).** *"I didn't
  realise that keyframing their position -- because their position wasn't keyframed in the T-pose
  -- moved it in ALL positions, which made the gun messed up in every pose. Then I corrected the
  gun, which in turn messed up the hang ones."* Exactly right, and it is a loop with no exit
  while both jobs share `weapon_root`/`weapon_tip`. Measured across his two exports:
      models/colin.glb (was live)  tip (0.029, 0.007, 0.326)  len 0.327  +Z   0.633 from blaster
      models/chars/colin.glb       tip (-0.592, 0.004, 0.171) len 0.616  -X   0.078 from blaster
      models/blaster.glb           tip (-0.562, 0.000, 0.099) len 0.571  -X
  **The shipped build had the BAR GRIP where the muzzle should be** -- 0.327 wide and horizontal,
  which is a bar, not a barrel. His corrected export is 0.078 away, the gun restored.
  **WHY IT SPREAD: A NODE'S LOCAL TRANSFORM IS ITS REST POSE.** A clip that does not key a
  channel leaves that channel at rest -- so keying `position` in the bar clips ALONE, with the
  rig sitting in the bar pose, writes the bar position as the node's default and every other clip
  inherits it. **If a marker must not move, never key its position; if it must, key it in every
  clip including the neutral.**
  **SO THE BAR STOPPED ASKING FOR THEM.** The hands are already on the bar in those clips and
  measured just as still: midpoint drift **0.011 / 0.004 / 0.028** across the 4.73 s hang against
  the joints' own 0.012 / 0.005 / 0.034. Nothing is lost, and the weapon joints go back to being
  the gun's and only the gun's. `bar_root`/`bar_tip` is first in `BAR.mark` as the hook for a
  dedicated pair -- name them and they are taken with no code change, `weapFit`'s rule.
- **AND THE MARKER'S AXIS IS TURNED ONTO THE BAR, NOT ASSUMED TO MATCH IT (c151).** The weapon
  joints were authored dead horizontal -- (0.999, 0.001, -0.033) -- so putting the midpoint on the
  bar was enough. **His hands read (-0.881, -0.469, 0.065), tilted twenty-eight degrees**, because
  a grip is authored to look right and not to be a ruler. `poseBar` aligns the measured axis to
  the bar's before the swing, so the pair can be any two nodes in any orientation: **the export
  stops being something this code has an opinion about.** The sense is picked by dot product --
  a bar has no near end, so it takes whichever way round turns him less.
- **THE CATCH RAN AFTER THE COLLIDER, WHICH IS THE ONE THING IT MUST NOT DO (c150).** *"How do
  I initiate a swing? I'm trying to swing around a light pole."* He could not, and it was not
  aim: `barCatch` sat BELOW `stepSkate`/`stepFoot` in `stepPlayer`, so `resolveBoxes` had already
  bounced him off the lamp post before the catch was tested -- it then measured a man travelling
  backwards away from the bar. **That bounce is the exact thing this feature exists to replace**,
  and it was still winning every time.
  **THE COMMENT ABOVE IT SAID "runs BEFORE the collider" THE WHOLE TIME.** Third time in this
  file, after `stepAim`'s ordering claim and `KIT.on`'s "exactly one owner": **writing a
  protection down is not implementing it, and the two are indistinguishable when you are reading
  rather than running.** When a feature does nothing, check WHERE it is called before checking
  what it does.
- **THE BARS ARE DRAWN NOW, BECAUSE THE TWO BUGS HAD TO BE SEPARATED (c152).** *"I can't tell
  if I can't find what I can swing on, or if I'm trying to swing on it and it's not working."*
  That sentence is this file's oldest complaint about itself -- `cloud0` against `cloud28/vis0`,
  `NO BLASTER GLB` against `gun1cm` -- and the answer has always been the same: put the thing
  that tells them apart where he can see it. All 67 are a thin bright tube on one merged
  geometry, one draw call, unlit so they read at any distance. **`BAR.show` is on by default
  while the feature is new and is meant to be turned off**; it is the diagnostic half, the way
  the badge cycle is.
  **AND `city.bar()` PUTS HIM ON THE NEAREST ONE.** If that swings and the street does not, the
  mechanic works and FINDING is the problem -- which is the whole question he could not answer.
  Same rule as `city.boom()` and `city.fx('boom')`.
  **THE CATCH IS SWEPT, NOT SAMPLED.** At twenty metres a second a frame is a third of a metre,
  so testing only where he IS lets a fast pass straddle the bar with neither end inside the
  window -- the bolt gets two half-steps a frame for exactly this reason. Three points along the
  frame's travel, and `grab` went .95 -> 1.35. Measured through the shipped `barCatch`, flying
  straight at 40 bars at 8 / 16 / 24 m/s: **120 of 120, 100%.**
- **AND 67 BARS IN A CITY OF LAMP POSTS IS A FINDING PROBLEM (c150).** Nothing on screen told him
  which pole was catchable, and most are not. The map draws them (the ramps' own argument -- it
  exists because he could not find those either) and the chip carries `BAR 34m@-78,-44 h5.9`,
  which is `JAM n@x,z`'s idiom: a count and a coordinate `npm run spots` prints in the same frame,
  so it is walkable to. On the bar it reads `BAR w2.3` instead, which is the swing rate -- so
  "am I near one", "which way do I go" and "is my pumping working" are all one glance.
- **NOTHING IS PARENTED TO THE BAR, AND NOTHING NEEDS TO BE (c149).** *"I don't know how you
  rotate all of the joints around that point considering they're not a child of that joint --
  maybe I should've used the root."* **He should not, and his first instinct was the right one.**
  The joints are never rotated. THE ROOT is rotated, which turns the whole skeleton rigidly
  because the root is already everything's parent -- and then the root is TRANSLATED by
  `barCentre - jointMidpoint`, measured after the fact. Rotate, then slide: the standard way to
  turn a thing about a point it does not contain, and because the slide is measured rather than
  derived it does not matter where the mark sits relative to the root.
  **AND THAT IS EXACTLY WHY THE MARK MUST NOT BE THE ROOT.** Putting it there would force the
  root up to the bar -- and then every OTHER clip's root is in the air, which is the thing he
  deliberately avoided so the gait clips blend. The mark's whole job is to say where the bar is
  RELATIVE to him; it has no other duty, so it belongs anywhere convenient and nowhere load-
  bearing.
  **`BAR.mark` IS AN ORDERED LIST, AND THE HANDS ARE A REAL FALLBACK.** *"You could also just use
  the hand joints, doesn't really matter."* Correct -- so both work. The weapon joints go first
  because they measured STILL (1.2 cm of drift across the 4.7 s hang) where his actual hands
  shuffle through the kip. **And only Colin's export has them**: every borrowed skin is a Mixamo
  rig with `mixamorig_LeftHand`/`RightHand` and nothing else, so without the fallback Moussa and
  the alien would hang wherever the clip left them.
- **EVERY BAR IS FOUND, NEVER AUTHORED -- AND ALL 67 RUN ALONG X, WHICH IS THE SPLITTER (c148).**
  A lamp arm and a sign gantry are already boxes high in the air, long one way and thin the other:
  67 of them, heights 2.9 to 5.9 m (median 3.1), lengths 1.4 to 7.7 m, nearest 50 m from the
  spawn. **But `solidAdd` merges its column runs along X**, so a Z-facing arm comes out as a row
  of cell-wide boxes that no length test can tell from a sign panel -- the only threshold that
  catches them also catches all 679 overhead boxes. **Z-facing arms are therefore not catchable,
  and that is a stated gap rather than a silent one**; the real fix is merging along both axes in
  `solidAdd`, which is its own build.
  **AND `barJoin` NEEDED A LENGTH CAP.** Its first run welded a whole roof edge into a single
  **71.3 m** "bar". Past `BAR.maxLen` it is a building, not something you swing on.
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
- **A STRIKE GOES WHERE THE FLICK POINTED, AND THAT DIRECTION WAS BEING THROWN AWAY.**
  `boardFlick` is handed `(dx, dy)` — the pad travel that fired the gesture — and used it for
  the air flips while `meleeGo` ignored it entirely, so a punch went wherever he already
  happened to be pointing. *"If I melee up and to the right he should turn and melee that
  direction."* `meleeGo(kind, h)` takes a world heading now and he snaps onto it before the
  clip starts. The old fallbacks stay for the cases with no direction in them — travel first,
  then facing — because a lapsed thumb has none at all.
  **AND IT GOES THROUGH `cam.az` (`flickH`), NEVER RAW.** The pad is in SCREEN space and the
  camera can be anywhere, so "up and to the right" is a different bearing every time the lens
  moves. Same mapping and same convention as `stickWorld`, in one function, so the flick and
  the stick can never disagree about which way is forward.
- **THE BLASTER HAS PLUTOPIA'S OWN VOICE NOW, AND `snd.trick()` WAS STANDING IN.** That is a
  deck tick — a skateboard noise on a plasma cannon. `blaster_sound_01/02.mp3` come over with
  the two numbers that matter: **louder AND LOWER as the charge fills**
  (`.42 + c*.22` gain, `1.10 - c*.26` rate). The pitch is the half that does the work — it is
  what makes a big shot read as heavy rather than as merely a bigger noise, and dropping it is
  the whole difference between a second sound and the same gun working harder.
- **A STRIKE THROWN FROM A MOVING BOARD IS UPPER BODY ONLY (c118).** On foot a strike OWNS the
  body — it lunges, bleeds its speed off and runs its own gravity, which is `stepRoll`'s shape
  and why it needed no new physics. Riding, all of that belongs to `stepSkate`, and **a lunge
  would stop the deck dead under him**. A skater does not stop to punch. So `stepMelee` takes a
  `ride` flag: the clock and the contact frame, none of the movement — and the swing itself
  comes out of c115's override, the strike's spine-up tracks over the board's legs. The whole
  feature is a flag and a clip clone because that machinery already existed.
  **IT IS CALLED FROM `stepPlayer`, AFTER THE BOARD STEP**, so his position is the one the mark
  and the punch cone are measured from. `stepFoot` hands over to `stepMelee` and returns; the
  board cannot, because the board still has to be driving.
  **THE GESTURE COST NOTHING, AND THAT IS WHY IT FITS.** Board tricks are AIR-only — a kickflip
  is something you do off the ground — so a grounded flick on the right pad was doing nothing
  at all, which made it the one free gesture left on a pad that is otherwise full. It works
  with the blaster out for the same reason melee does on foot: the gate is `p.aim` alone and a
  flick is over long before a trigger arms.
  **AND HE CANNOT TURN TO IT.** `stepSkate` owns the heading, so the strike goes where he is
  RIDING and the flick only says *now*. Writing `p.heading` there would carve the board
  sideways on every punch — the same rule that stops the aim steering him while riding.
- **THE BOLT LEAVES ON `p.aimH`, NOT ON `p.faceH` (c119, `shotH`).** *"If I release when the
  aimer is on something it doesn't really shoot at the aimer."* The reticle is drawn from
  `p.aimH` — the eased, lock-assisted bearing the aim loop settles on — and `boltFire`,
  `muzzleAt` and the charge ball were all built off his FACING instead.
  **ON FOOT THAT ONLY LAGGED**, which is a few degrees and reads as sloppy aim: `stepAim` sets
  `p.heading = p.aimH` on release and `faceH` eases onto `heading` over `face0`/`face1`.
  **ON THE BOARD IT IS UNRELATED**, which is why he could see it. c113 deliberately stopped the
  aim writing `p.heading` while riding — `stepSkate` owns it, and a second writer would carve
  the deck toward whatever you looked at — so `faceH` there is purely the direction of travel
  and the shot went down the board instead of down the sight.
  **A MARK THE GUN DOES NOT KEEP IS WORSE THAN NO ASSIST AT ALL**, which is `WEAP.lock`'s own
  rule one step further on, and the same shape as the slash mark firing on the input frame
  rather than the contact frame: the picture and its consequence have to be ONE event.
  `shotH()` is the single answer — `p.aimH` while the aim is live (`p.aim || p.turning`),
  `p.faceH` otherwise — and the muzzle offset, the flash, the charge ball and the bolt all read
  it, so they cannot disagree about which way the gun is pointing.
- **THE AIM LOOP RUNS SLOWER ON THE BOARD (`WEAP.ride`).** *"The aimer zips around."* Two things
  feed that and both are speed: the camera sweeps in behind the aim while he is ALSO being
  carried across the ground at twenty metres a second, so a target's bearing changes on its own
  before the thumb has moved — and the assist then chases that moving bearing. Same loop,
  gentler gains. **Multipliers rather than a second set of numbers**, so the day `camEase` or
  `grab` is retuned this follows instead of quietly drifting out of agreement with it.
  **`ride.grab` toward 0 is the dial for "a standing reticle that does not lock so much"** — it
  leaves the lock and the mark exactly where they are and just stops the shot being led.
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
- **HE FLEW BACK DOWN THE BARREL, AND THE COMMENT ABOVE IT SAID OTHERWISE.** `dx,dz` runs
  bolt->cop, so `-dx,-dz` runs cop->BOLT — the launch sent him at whoever fired it. The line
  above it claimed `-dx,-dz` was "the way the shot was going"; it was the exact opposite, and
  writing the claim down did not make it true.
  **THE BOLT'S OWN VELOCITY IS THE ANSWER AND NEEDS NO DERIVING.** At the moment of impact the
  bolt is on top of him, so `dx,dz` is a small noisy vector whose bearing is whatever rounding
  says — `this.vx,this.vz` is the way the shot was ACTUALLY travelling, which is the thing that
  sentence was reaching for all along. **When a direction is already stored, do not recover it
  from geometry.**
  `copFly(c, blowH)` takes the way the blow TRAVELS, the same convention `copHit` already takes
  from `copsPunched` — which is why the punch was right and only the bolt was wrong.
- **ONE OF THE FOUR KNOCK-DOWN COMBINATIONS IS AUTHORED THE OTHER WAY ROUND, AND `npm run cop`
  SAYS WHICH (`COP.flip`).** *"He does a 180 on the ground between getting up."* He did, on one
  pair. The tool poses the real rig and reads the horizontal hips->head bearing where the
  knock-down ENDS against where the matching get-up STARTS:
      knock_down_front -> get_up_front    174.0 deg out   *** reversed ***
      knock_down_back  -> get_up_back      14.6 deg out   agrees
  Turning HIM by pi as the get-up begins is the whole fix: the clip's own orientation then
  takes over from a body already lying the way it expects.
  **MEASURED RATHER THAN GUESSED, and that is not pedantry here** — "one of them is flipped" is
  four possibilities, three of which make it worse, and every one of them looks equally
  plausible from the code. The same tool answers it again after any re-export.
- **OUT COLD, WITH STARS (`COP.out`, `COP.stars`, `copStars`).** He was back on his feet half a
  second after the knock-down clip finished, which reads as a man TRIPPING rather than a man
  being knocked out. `out` is the beat he lies there — and the stars are what make that pause
  read as a STATE instead of a delay. Oldest shorthand in animation, and it is doing real work:
  without them a longer lie-down is just a slower get-up.
  **A FAT DARK OUTLINE UNDER A HOT FILL**, which is the rule the effect sheet's word follows —
  it has to survive being twenty pixels across on a phone and still read as ink laid on top of
  the render. **NOT ADDITIVE**, for the slash mark's reason: additive over a lit street has
  nowhere to go but white, clears `POST.bloomTh` and comes back out of the bloom chain as a
  glowing lump.
  **`depthTest` STAYS ON.** Stars that punch through a wall are worse than stars his own
  shoulder hides half of — and the half his body occludes is exactly what puts them BEHIND his
  head rather than pasted over it.
  Built the first time an officer needs one rather than at load: eight men times three sprites
  is nothing, but building them up front makes every officer pay for a state most never reach.
- **RETREATING UNDER AIM IS THE FORWARD CLIP RUN BACKWARDS (`WEAP.aimBack`), AND IT HAD TO BE A
  CLONE.** The hook sat empty for three builds and the forward run played while he backed away
  — a moonwalk with a rifle. Two things make it work:
  1. **`Math.abs(cos)` FOLDED FORWARD AND BACK TOGETHER.** Split into two shares, the retreat
     takes the negative half, and nothing is thresholded: walking diagonally backwards is
     genuinely part retreat and part strafe, which is what stops it snapping between them.
  2. **IT IS A CLONE OF `aimRun`, NOT THE SAME ACTION REVERSED.** Diagonal retreat needs both
     carrying weight ON THE SAME FRAME, and one action cannot play forwards and backwards at
     once. Plutopia's `rifleBack` is the same clone for the same reason.
  The reversal itself is then one **negative `colinScale`** at the blend, on the same reference
  as the forward clip — it is the same clip, only the direction of travel through it changes.
- **HE GOT UP WITH ONE HIT POINT, SO EVERY OFFICER AFTER HIS FIRST KNOCK-DOWN WAS A ONE-PUNCH
  MAN.** `COP.hp` is three and always was, and `copHit` already counted down through the four
  `hit_*` clips — but the `up` state set `c.hp = 1`, so the three-hit chain existed for exactly
  one fight per officer per session. *"Every time he gets hit he falls down"* is that. Back on
  his feet is back to full.
- **A FLICK IS A PUNCH EVEN WITH THE GUN OUT; ONLY A COMMITTED SHOT STOPS IT.** The gate was
  `p.aim || KIT.cur === 'blaster'` and the second half took melee away from anyone carrying a
  blaster. `p.aim` alone is the whole test, and **the two gestures separate themselves**:
  arming needs `fireAt` .80 held for `armT` .10 s, and a flick is over long before that. So a
  quick flick of that pad is a punch and a deliberate push-and-hold is a shot — which is the
  same mistake, and the same fix, as the sprint gate one build earlier. **Twice now the guard
  has been written against CARRYING the gun when the thing to guard against is FIRING it.**
- **A PLASMA BOLT LAUNCHES HIM, IT DOES NOT FOLD HIM (`COP.fly`, `copFly`).** A body that goes
  over a bonnet reads as hit; one that folds on the spot reads as a hitpoint being deducted.
  Ballistic, and **the GROUND ends it rather than a timer** — a timer drops him through a roof
  he was thrown onto and leaves him hanging over a hole he was thrown into. He lands in the
  matching knock-down and gets up from it, so the existing `down`/`up` states carry the rest
  and nothing new had to be invented past the arc itself.
  **COLIN'S AIR CLIPS, BORROWED (`copsLearnFlight`), AND THIS IS THE ONE PLACE THE POLICE DO
  TOUCH THE BORROWED-CHARACTER MACHINERY.** The officer has no air clips at all. `npm run cop`
  measured his rig at 58 mixamorig joints with the height on Y — **the same convention Colin
  uses, which is exactly why he needs no `HIPFIX`** — so `flying_backwards` / `flying_forwards`
  drop onto that skeleton with nothing but `skinClips`' own track filter: drop what the skin
  does not have, keep ONLY the quaternions, because a `.position` track bakes Colin's bone
  lengths and would stretch him. Losing the hips translation costs nothing because he is drawn
  at his own scale and the launch is code-driven.
  **IT IS CALLED AFTER `buildColin`, NOT IN `buildCops`** — the cops are built three awaits
  earlier and `colin.clips` does not exist yet when they are.
  **And it falls back to the old fold** if the clips are not there, so a cop with no Colin is a
  cop who still goes down rather than a cop who freezes.
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
  mark IS the promise, so it has to be on the thing before the shot leaves.
  **AND IT SHOWS WHENEVER THE TRIGGER IS ARMED, NOT ONLY WHEN SOMETHING LOCKS (c112).** It used
  to appear only on a lock, so pointing at open ground gave no mark at all — and open ground is
  most of the city. **A gun you cannot aim at a wall is a gun you can only aim at people.**
  **WHERE IT SITS WITH NO LOCK IS WALKED, NOT RAYCAST (`aimPoint`).** The bolt does not fly a
  straight line — it RIDES `BOLT.ride` over whatever is under it — so a straight ray puts the
  mark through a rise the shot will go over, and on the far side of a dip it will follow down
  into. It walks the bolt's own path in `step` metres, stopping on anything solid or on a rise
  steeper than the bolt can climb. Coarse on purpose: a mark a metre out on a sixty-metre shot
  is invisible, a mark on the wrong side of a wall is not.
  **LOCKED IS A DIFFERENT MARK, NOT A BRIGHTER ONE.** It goes warm, the brackets snap in and
  hold rather than breathing, and the whole thing tightens — so "the gun has something" and
  "the gun is pointed at dirt" are told apart at a glance rather than by comparing brightness
  to a memory of what it looked like a second ago.
  **THE ART IS PLUTOPIA'S**: four layers turning at different rates about one centre — a dashed
  ring, arrows the other way, brackets that breathe, a diamond that pulses. **Turning is the
  whole trick**; a static mark reads as a dead overlay. None of it costs a frame, because CSS
  animation runs off the compositor and the only thing the loop writes is the position.
  `transform-box: view-box` is load-bearing — without it each group spins about its own tight
  bounding box rather than the shared middle, and the layers wobble apart.
  `pointer-events: none` without exception: it sits in the middle of the play area.
- **A COMMITTED SHOT STANDS THE SPRINT DOWN; CARRYING THE GUN DOES NOT (c108 fixed c98).** `p.rHold` is "how long
  that pad has been down" and it feeds the SPRINT — so holding the pad up to charge a shot was
  also winding him to x3 top speed while `stepAim` steered him with the same thumb. Aiming
  launched him across the street sideways: *"when you have your rifle equipped the locomotion
  gets all messed up, he gets locked in"*.
  **THE COMMENT ABOVE `stepAim` CLAIMED THE ORDERING ALREADY PREVENTED THIS** — "runs BEFORE
  stepPlayer, so a thumb holding a charge is not also read as a sprint". It does not and never
  did: `rHold` is counted in `stepFoot` off `stick.R.down` alone and has never once looked at
  `p.aim`. **A protection asserted only in a comment is not a protection**, and this file now
  has two of those (the other was `KIT.on`'s "one owner").
  The charge jump stands down with it. **A tap is still a jump** — a separate event, not `rHold`.
  **AND c98 GATED IT ON THE WRONG HALF.** It used `gunOut()`, so merely equipping the blaster
  took the sprint away: *"I didn't mean he can't run fast when he has a blaster, I just meant
  if you've already initiated a shot."* Holding the pad is how you sprint and it is also how
  you steer the aim, and **those two do not actually fight** — one reads how LONG the thumb has
  been down, the other reads WHERE it is. Only `p.aim` takes the sprint away now.
  The same over-reach had taken the charge jump off anyone holding a blaster, and there it was
  redundant as well as wrong: `wantC` needs `far < .35` and arming needs `.80`, so the crouch
  and the trigger can barely overlap in the first place.
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
- **RIDING AND SHOOTING IS AN OVERRIDE, NOT A BLEND (c115), AND PLUTOPIA PAID FOR THAT
  DISTINCTION.** Its note, and it is the whole thing: laying a hold pose ON TOP of a gait gives
  the arms the gait's swing PLUS the pose, so they flip about, and the spine gets twisted
  twice. **Averaging two clips that both key an arm does not give one arm doing both things; it
  gives a shrug.** Additive was its first attempt and it was wrong.
  So nothing is allowed to fight over a track. Two clone families, and between them every bone
  is claimed exactly once:
      `__up`     the gun pose with ONLY spine-up tracks — arms, shoulders, neck, head, spine
      `__legs`   a board clip with every spine-up track REMOVED — hips, legs, the bounce
  Played together at full weight they compose into one body: he rides with his legs and holds
  the gun with his arms, and neither half knows the other is there.
  **HIPS STAYS WITH THE LEGS.** It is not a spine-up bone, and its POSITION is what carries the
  whole body's travel and bounce — handing it to the pose nails him to one height.
  **THE SWAP HAPPENS AFTER THE BOARD BRANCH HAS HAD ITS SAY**, not inside it, so every weight
  AND EVERY TIME SCALE it worked out is preserved. That second part is load-bearing: **the push
  clip is the CLOCK for the shove** (see `SK8`), so a leg clone that did not inherit its scale
  would put his foot on the road on the wrong frame and the whole push cycle would drift.
  **Every `skate_*` clip gets a leg clone**, so this holds through a push and in the air as
  well as standing still — and which pose is up follows the state: the sighted hold while
  charging, the recoil while `fireT` runs, the rifle idle otherwise.
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
- **EVERY SLOT IS ITS OWN SWITCH (c113). THE KIT WAS A RADIO BUTTON AND IT SHOULD NEVER HAVE
  BEEN ONE.** `cur` + `on` meant one thing in his hand and whether it was out, so taking the
  blaster put the jetpack away and no sequence of presses gave you both. *"I want to be able to
  use the accessories at the same time."* There is no current slot now — three booleans and a
  key each, and **nothing is put away on your behalf**.
  That also deletes a whole class of bug by construction: `KIT.on` was the variable
  `toggleBoard` and `dropBoard` kept writing to, and **a variable that no longer exists cannot
  have three owners**. The board's state is still DERIVED from `player.board` rather than
  stored beside the other two — one fact, one place, which is the c89 rule surviving the
  rewrite.
  **THE BLASTER FIRES FROM THE BOARD, AND THE ONE THING THAT HAD TO GIVE IS THE STEERING.**
  `stepSkate` owns the heading while riding — the wheels are what steer — so a second writer
  would carve him toward whatever he looked at. The aim still drives the shot and the camera;
  it just stops driving the body. (There is no riding-and-shooting POSE, so he holds the
  ordinary board stance: the mechanic works, the animation is a gap.)
  **AND THE PACK BURNS ON THE BOARD TOO (c114) — THE HOVERBOARD.** The worry was that the
  thrust writes `p.vel.y` and `p.grounded` while `stepSkate` also owns them. **The ORDER is
  what makes it safe**: `stepJet` runs BEFORE `stepPlayer`, so the lift is added to the
  velocity and `stepSkate` then integrates it with its own gravity and its own ground snap.
  The jet proposes, the skate physics disposes, and there is no second integrator anywhere.
  **A hover landing is safe because a skate landing does not BAIL** — it scrubs speed on a
  sideways or half-finished one and hands him back. Checked before enabling it rather than
  after: a hoverboard that drops the deck every time you set down is not a hoverboard.
  **`JET.board` IS TWO MULTIPLIERS, NOT A SECOND TUNING PASS.** A jetpack on foot is a CLIMB;
  under a board it wants to be a HOVER, or the deck becomes a lift and the skating stops being
  the point. `up` x.78 keeps the thrust above gravity (22.5 against `SK8.g` 20, a ratio of 1.12
  against the 1.44 he gets on foot) so he still climbs, slowly, and `cap` x.55 holds the top of
  that climb to a drift. Multipliers rather than their own numbers, so the day `up` is retuned
  the hoverboard follows it instead of quietly falling out of agreement with it.
  **`SK8.g` IS 20, THE SAME AS `MOVE.g`** — which is the only reason this is two multipliers
  and not a re-derivation. Check that before copying any other airborne number across.
  **The second jump stays a foot thing.** `p.jumps = 1` spends the double so a tap cannot also
  flip him; riding, that tap is the ollie and the rail catch, which `stepSkate` owns.
  **THE BLASTER ALREADY FIRED WHILE FLYING** and needed nothing — `stepAim`'s gate never
  mentioned the jetpack, which is what independent slots buys. Releasing the trigger does end
  the thrust, because the release IS the thumb leaving the pad; `JET.ease` makes that a .16 s
  fade rather than a cut, so a shot costs a little altitude instead of dropping him.
  **AND `p.rHold` MEANS ONE THING AGAIN.** c108 put the aim test in `rHold` itself, which was
  the right rule in the wrong place: with both out it also cut the THRUST the instant you
  pushed up to charge, and dropping out of the sky because you aimed is not a trade anybody
  asked for. `rHold` is how long the pad has been down, full stop; the sprint applies its own
  condition where the sprint is computed. **A shared quantity with a caller's condition baked
  into it is the same mistake as a variable with three owners, one level down.**
  **The old `localStorage` value was a slot NAME and the new one is three flags**, so a phone
  upgrading into this build hands back a bare string. Parsed defensively rather than migrated:
  worst case he starts with nothing deployed, which is one press to fix and cannot throw.
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
- **THE MELEE MARK STOOD ON END, AND IT WAS THE COMMON CASE (c153, `npm run slash`).** *"The
  swipe marks are still weirdly parallel to the camera, whereas they should be perpendicular."*
  c91 rolled the mark to the BLOW'S own direction on screen -- and the camera in this game sits
  BEHIND him while he punches FORWARD, so the blow points almost straight into the lens. That is
  the degenerate branch: it projects to a tiny near-vertical smear, `atan2` returns about +/-90
  degrees, and the crescent comes out standing on end pointing away down the view axis. **The
  case c91 treated as rare is the one that happens every time.**
  **THE MARK FOLLOWS THE HAND WHEN THE HAND HAS A DIRECTION ON SCREEN, AND THE SWEEP WHEN IT DOES
  NOT.** A hook travelling across the picture does leave a crescent along its own path -- that
  half of c91 was right. Only the forward punch needed a second answer, and the horizontal
  PERPENDICULAR to the blow is it. **The two are at right angles in the WORLD and cannot both lie
  down the view axis**, so whichever projects longer is always well conditioned and there is no
  degenerate case left. The random `SLASH.spread` fallback is gone: it existed only to scatter
  the bad case out of sight.
  **`npm run slash` PUTS A REAL CAMERA BEHIND HIM AND READS THE ANGLE**, 0 = broadside and
  90 = on end. It also caught my FIRST fix, which flipped the rule the other way and made every
  sideways hook stand on end instead -- traded one broken case for another, and I would have
  shipped it. Third time this mark has been wrong and the first time it was measured:
      punch away from the lens    c91 stood on end   ->   0.0 deg
      camera 30 / 60 deg round                       ->  -9.6 / 9.6
      punch across the screen, either way            ->   0.0
      worst case of any  9.6 deg, against 80-90 before
- **A MAN ON THE GROUND IS STILL A BODY (c153).** *"I wanna be able to shoot the officer even
  when he's on the ground, and hit him and kick him around -- I want him to not be untouchable."*
  He was untouchable in **three** separate places: `copFly`, `copHit` and `pickTarget` all
  returned early on `down`/`up`, so a knocked-down officer could not be shot, punched or even
  locked onto, and the fight simply stopped.
  **A BLOW ON A PRONE MAN IS A PUNT, NOT A STAGGER.** No `hit_*` clip -- that would stand him up
  to play it -- so it reuses `copFly` at `COP.fly.punt`: he skids, keeps his knock-down pose, and
  the lie-down clock restarts, which means kicking him along the road works for as long as you
  like and he still eventually gets up. Nothing new was invented; the existing `down` -> `up`
  states carry it, which is the same reason the bolt's knock-down reused the car's.
  **AND THE HANG TIME IS `fly.up`, NOT `fly.back`.** 7.4 -> 9.6, which at `fly.g` 20 is 0.96 s of
  air against 0.74. More `back` is a longer skid, not a longer flight.
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
  **THE FIRST TAP IS THE JUMP, THE SECOND TAP HELD IS THE PACK (c116).** It used to be any hold
  at all, wherever the thumb was — fine while the pack was the only thing on that pad. c113
  took the aim test out of `p.rHold` (rightly: it was cutting the thrust mid-flight), and the
  two then collided on the ONE gesture the blaster needs most: *"now you press up, which is
  what is supposed to initiate blaster."*
  **Requiring him to be AIRBORNE separates them completely and costs no new control:**
      on the ground   a hold is the blaster's charge and the sprint, and nothing else
      in the air      a hold is thrust, whichever way the thumb is pointing
  So the sequence is the one he already plays — tap to jump, then press and hold to fly — and
  on the board it is tap to OLLIE and then hold to fly, which is the same gesture and needed no
  case of its own. Holding UP in the air is now a jetpack AND a charged shot at once, because
  the two gates no longer overlap on the ground where the choice has to be made.
  **AND `p.rHold` HAD TO BE COUNTED FOR BOTH BODIES (c117).** It was incremented inside
  `stepFoot`, which only runs when he is NOT on the board — so riding, the clock never started
  and `rHold > JET.from` could never once be true. *"I'm still unable to fire my jetpack when I
  skate."* **Not a gate that said no: a clock that was never running.** It lives above the
  board/foot branch in `stepPlayer` now, so both paths read a current value.
  **That is the second time a shared quantity has been wrong because of WHERE it was updated**
  (the first was the aim test baked into `rHold` itself). A number several systems read should
  be maintained somewhere all of them run, not inside whichever one happened to need it first.
  **THE PRESS HAS TO BEGIN IN THE AIR (`jetArm`).** `!p.grounded` alone would light the motor
  for a thumb that was already down and then walked off a kerb — a sprint that turns into
  flight at the edge of a pavement. It arms on the frame the pad goes down, only if he is off
  the ground at that moment.
  **AND TWO THINGS ABOUT THAT EDGE DETECTOR ARE LOAD-BEARING.** It lives ABOVE the early
  return, because an edge detector that stops running goes stale — equip the pack mid-hold and
  it would see no new press and fire on a thumb already down. And it DISARMS the moment he is
  grounded, or a hold carried through a landing keeps its arming and the next frame on the road
  has `down`, `rHold` and `jetArm` all true, which is the ground thrust this change exists to
  remove, straight back.
  **`far` IS NEVER TESTED**, and the first version's `rm < .55` was wrong twice over: it is a
  HIGH-WATER MARK for the whole touch, so one look would have killed the thrust for the rest of
  it (the bug that held the sprint at 9 m/s for three builds) — and even the *instantaneous*
  magnitude fights the camera, because that pad is still the look and you cannot fly and see
  where you are going at once.
  **AND IT REPLACES THE DOUBLE JUMP.** One thumb cannot mean both — a tap in the air would
  spend the second jump on a flip at the exact moment the hold is meant to be lighting the
  motor, and the two would fight every time you flew out of a jump. While the pack is out the
  second jump is simply not there: the pack IS the air move.
- **THE JETPACK HAS NO NULLS IN IT, AND THE FILE SAYS SO (c120).** *"I have nulls or roots
  where the tips of the jets are."* Read through the real loader, `models/alien_jetpack.glb` is
  **ONE node, one Tripo mesh, 0 skins, 0 animations** — no markers of any kind. `blaster.glb`
  has `weapon_root`/`weapon_tip`; the jetpack was never given the same treatment, so whatever
  export carries those nulls has not been pushed.
  **SO THE CODE WAS WRITTEN TO TAKE THEM THE MOMENT THEY APPEAR**, which is `weapFit`'s own
  rule and the reason the c96 Colin export needed no code change at all: `JET.tip` is a pattern
  (`jet|nozzle|thrust|exhaust|flame`), `attachGear` collects every match, and until one exists
  the nozzle is **MEASURED** — the bottom-centre of the pack's own WORLD bounds, taken live so
  it survives `fitOne`'s scale, `JET.at`'s nudge and whatever bone the pack landed on.
  **THE TEST IS THAT A LOCATOR HAS NO MESH.** An empty is a marker and a mesh is art — the same
  structural test `stripPoses` uses — so a mesh called `jetpack` can never be read as a nozzle
  and the next exporter is free to spell the name differently.
  **AND A FLAME IS NOT A CARD.** A card is a drawing that plays once and dies; a flame is ON for
  as long as the motor burns. So it is the CHARGE BALL's machinery — a stack of additive
  sprites at one point, flickering, scaled by `p.jetK` — and NOT a new vocabulary invented for
  it, which is the c101 "electric tree branches" lesson standing. The flicker is the crackle's
  own rule: at thirty frames a second a value thrown somewhere new every frame IS what fire
  looks like, for the cost of writing a scale. It is hung BELOW the nozzle by half its length,
  because a sprite is centred on its origin and one drawn at the joint comes half out of the
  top of the pack.
- **THE PUFFS CAME OUT OF THE MIDDLE OF HIS BACK (c120).** *"They kind of just go over him."*
  The spawn was `gear.jet`'s group centre less a typed 12 cm — and the pack is worn at CHEST
  height, so a 1.44 m card (nearly as tall as he is) was being born across his shoulders. Two
  things, and both were measurements waiting to be taken: it comes out of the NOZZLE now (a
  quarter of a metre lower, and where the flame is), and `JET.puff` is .92 rather than 1.44.
  `JET.blast` came down with it — the ignition crack has to stay bigger than the putts.
- **THE EFFECT LOOK IS A SWITCH, NOT AN ARGUMENT (`FX.style`).** *"Plutopia is more like a cozy
  play game, this is kind of different, so I'm not sure that the flat style is for me — but
  maybe it is."* That is a look-at-it decision and it belongs on the phone, not in a rewrite:
      cards   the hand-drawn sheet -- stutters on 3s, and it is the ONLY one with the WORDS
      glow    additive plasma, hot core cooling outward: no outline, no stutter, NO WORDS
      both    layered, worth one look before deciding
  It rides the SAME `fxPop` call every effect already goes through, so a second look cost a
  branch and a colour table rather than a second particle system — and **nothing is deleted**,
  so it stays a comparison rather than a build. `city.FX.style`, or the Effects row in settings.
  **LOSING THE WORDS IS THE REAL TRADE** and it is the thing to judge: POW / BOOM / ZAP are
  drawn INTO the sheet, so they cannot survive a vocabulary that has no drawing in it.
  `burst` carries a velocity now, with the cards' own drag, or exhaust in the glow style would
  expand where it was born and read as a flash instead of as a plume.
- **THE BOARD'S STRIKE IS ON THE RIGHT PAD, AND c118 PUT IT ON THE LEFT (c120).** *"You did the
  wrong stick for melee."* The left pad is the one that STEERS the board, so every hard
  correction of a steering thumb threw a punch — and it was spent on the one gesture that could
  not be spared. **THE PADS HAVE TO MEAN THE SAME THING ON THE BOARD AS ON FOOT**: the left pad
  is the BODY, the right pad is the VERB. Break that and neither pad means anything you can
  carry from one to the other.
  **FLICK ONLY, so the right pad keeps both its other jobs** — a DRAG is still the camera and a
  PUSH AND HOLD is still the trigger. The three separate themselves by construction: arming
  needs `fireAt` .80 held for `armT` .10 s and a flick is over long before that, which is the
  same separation that already lets melee and the blaster share this pad on foot.
  **`p.aim` ALONE IS THE GATE, NEVER `KIT.out.blaster`.** That is the THIRD time a guard here
  has been written against CARRYING the gun when the thing to guard against is FIRING it.
- **`fitOne` WAS NOT IDEMPOTENT, AND THAT IS WHY THE JETPACK VANISHED ON MOUSSA (c126).**
  *"The jetpack doesn't show up on Moussa."* It is not the bone lookup — his spine is spelt
  `mixamorig_Spine2` exactly like Colin's, checked. It is the MEASUREMENT.
  `m.updateMatrixWorld(true)` walks UP the chain. On the FIRST call nothing is parented yet, so
  the box comes back in the model's own file units and the arithmetic is right. On a RE-fit —
  which is every `wear`, through `gearRehome` — `slot.g` is still hanging off the PREVIOUS
  character's bone, so the same box comes back in WORLD METRES: `len` is ~0.5 instead of ~30,
  `k` is out by the whole armature scale, and the pack is fitted at something like **thirty
  metres**, centred on his spine. The camera is inside it and there is nothing to see, which is
  indistinguishable from it never having loaded.
  **THE BLASTER NEVER HAD IT, for the reason the police pistol never had c98's**: its branch
  resets the model and applies `fix` instead of ever measuring. Two mounts for one idea and only
  one of them right — the same sentence as c98, one build along.
  **A SLOT'S SIZE IS A PROPERTY OF THE ART**, and it must not depend on who was wearing it a
  moment ago, so `fitOne` DETACHES before measuring. (three does not clear `matrixWorld` on
  unparent — which is what made `npm run gun` first answer 73 metres — hence the explicit update
  after the detach.)
  **AND THE CHIP SAYS `jet52cm` / `jet3000cm` / `NO JET GLB`**, the gun's own rule: "it doesn't
  show up" is three bugs wearing one face and the number is the only thing that tells them apart
  from a phone.
- **THE GUN FOLLOWS THE RETICLE WHILE HE RIDES, BY PIVOTING THE SPINE (c126, `aimTwist`).**
  `stepSkate` owns the heading — the wheels are what steer — so since c113 the aim has been
  forbidden from touching `p.heading` while riding. That is correct and it looks wrong: the shot
  goes where the mark is (c119) while his BODY goes on facing down the deck, so the barrel and
  the reticle visibly disagree. The gap is exactly `wrapAngle(p.aimH - p.faceH)`, and the spine
  is what takes it up.
  **ONE ROTATION ABOUT WORLD Y, CONJUGATED INTO EACH BONE'S PARENT FRAME** — `local' = P⁻¹ Q P
  local`. Doing it in the bone's OWN space needs to know which local axis is up, which is a
  different answer on every rig and is precisely the class of assumption `HIPFIX` exists because
  of. This way it is rig-agnostic and it STACKS on whatever the clip was doing rather than
  replacing it.
  **SPINE1 AND SPINE2, NEVER THE HIPS.** The legs belong to the board and must not come round
  with the gun — the same split `__legs` already draws.
  **THE PARENT CHAIN IS RE-READ PER BONE**, because each twist moves the next one's frame;
  applying both against one stale `P` is a shear rather than a turn.
  **APPLIED AFTER `colin.mixer.update`**, so it is an edit on top of the pose — and the mixer
  rewrites the bones from the clips every frame, which is what stops it accumulating.
- **THE SPINE TWIST UNRAVELLED, AND `premultiply` IS WHY (c128).** *"He like unravelled -- the
  spine just started rotating."* A relative edit on a bone is only safe if something rewrites
  that bone from scratch every frame. The mixer does that ONLY for bones the playing clips have
  TRACKS for -- and riding with the blaster out, the clips are c115's `__legs` clones, **which
  have every spine-up track REMOVED by construction**. So on precisely the state this feature
  exists for, nothing drives Spine1/Spine2, last frame's twist is still sitting on them, and the
  next one stacks: a few degrees a frame at 60 Hz, which is a bone spinning.
  **THE FIX IS TO TAKE IT OFF BEFORE THE MIXER, NOT AFTER.** `aimUntwist()` runs first and is
  correct without having to know which case it is in: if the mixer owns the bone it overwrites
  this and nothing is lost, and if it does not, the bone is back at the pose the twist started
  from. Anything that premultiplies a bone in this file needs the same pairing.
- **`npm run aim` MEASURES WHERE THE BARREL ACTUALLY POINTS, AND IT ENDED A GUESS I WAS ABOUT TO
  SHIP (c128).** *"The tip of his gun is kind of to the right -- you might need to measure it
  yourself."* He was right to say so. It poses the real rig in the real riding-and-aiming pose
  (c115's upper-body override), runs the SHIPPED `aimTwist` between the `TWIST:` markers, and
  reads the world bearing of `weapon_root` -> `weapon_tip`, which IS where the gun points and is
  in the file for exactly that.
      the twist TRACKED PERFECTLY -- 1.00 degrees of barrel per degree asked, on both rigs
      but the aim POSE holds the rifle across his body:  colin -20.5 deg, moussa_toon -22.8
  **NOT A MOUSSA BUG** — the two agree within two degrees. Turning the chest to the mark points
  the CHEST at the mark and leaves the gun twenty degrees off it, for ever, on everybody. Every
  hypothesis I had before running this (the hand offset, the clamp, a sign error) was wrong.
  **SO THE LOOP IS CLOSED ON THE BARREL AND NOTHING IS TYPED.** The bias is a property of the
  ANIMATION: it differs per character, it would differ again on a re-export, and it moves during
  the recoil. Reading where the barrel ended up last frame and folding the residual back in
  converges on "the gun is on the mark" whatever the pose does — no calibration step, no
  measured constant, and it keeps working when he redraws the clip.
  **TWO THINGS ABOUT THAT LOOP WERE WRONG FIRST TIME, AND THE HARNESS CAUGHT BOTH:**
  1. **The early return skipped the measurement.** `if (|twist| < .002) return` meant the
     barrel was never read at a dead-ahead aim, so the loop never started in the one case that
     has to work.
  2. **The clamp went on the total.** `max` means "how far a man turns at the waist" and it is
     measured from the gun pointing down the deck, not from the pose's own bias — clamping the
     sum spent a third of the budget undoing the pose and left him unable to aim past 45
     degrees at all. It clamps the REQUEST and adds the correction after.
  **AND `fixMax` IS SIZED TO THE BIAS AND NO MORE.** An integrator with a long leash does not
  respect `max` at all: at .9 rad it wound him **110 degrees at the waist** to line up a
  90-degree shot. At .45 the barrel is exact to 60 degrees and lags past that, which is honest —
  and the SHOT still leaves on `p.aimH` (c119) either way, so what is lost out there is the look
  of it and never the accuracy.
  **THE HARNESS HAD TO RUN THE LOOP, NOT POKE IT ONCE**, and had to use the real `damp` rather
  than snapping to target — a controller measured for one frame, or with its rate removed, is a
  controller the game does not have.
  **AND ITS FIRST RUN MEASURED THE WRONG POSE.** `ownClips` calls `trimClips`/`deriveClips`
  through a `typeof` guard, and those live outside the `SKIN:` markers — so the harness built
  Moussa with no `rifle_aim__up` in his pool at all and reported a 103-degree bias that was
  really "there is no aim pose in here". **Sixth time** this exact mistake has been made in this
  repo. They are behind `DERIVE:` markers now and both tools lift them.
- **WHICH LOOK IT IS, IS HIS CALL (c139, `WEAP.flash`, `JET.look`).** He asked four times to
  experiment with the blaster's flash and the jetpack's exhaust, and four times I shipped MY pick
  of one and wrote up why it was right. **A taste decision does not belong in a commit** -- it
  belongs on a switch, which is exactly the argument `SHADE.mode` and the whole settings panel
  were built on, and I did not apply it to the thing being asked about. Four named looks each,
  live on the phone, no rebuild:
      WEAP.flash  plasma | tight | card | both
      JET.look    flame  | cards | glow | both
  `flame` is the thruster with no cloud at all, which is also the cheapest of the four.
- **THE CHARGE BALL WAS GUESSING WHERE THE BARREL IS (c139).** *"It doesn't follow the gun,
  especially when I'm on the skateboard and I turn to the side -- that weapon_tip joint is where
  the tip of the gun should be, that's what I thought you would use."* Exactly right. It called
  `muzzleAt`, which OVERRIDES x and z with `player.pos + faceH * reach` -- a deliberate
  body-clearance hack, correct for the BOLT (a shot must not be born inside whatever he is
  standing next to) and nonsense for a ball sitting on the barrel. Riding, `faceH` is the BOARD's
  direction and the gun is somewhere else entirely, which is precisely why turning sideways is
  when it comes off. `tipAt` has read the joint since c126; the charge ball was the last thing in
  the file still guessing.
- **A PLASMA MUZZLE FLASH IS NOT A SMOKE CARD (c126, `muzzleFlash`, `tipAt`).** *"When you shoot
  the blaster it shows the jetpack particle cards and it kind of just lays over the blast and
  you can't really see the blast itself."* `fxPop('flash')` is the JETPACK'S ignition bank — a
  1.63 m hand-drawn crack and a cloud — fired at point blank on a plasma rifle.
  **This is the c101 lesson pointing the other way for once**: there my addition was wrong and
  the ported part was right; here the CARD was the borrowed thing and the bolt's own sprites
  were right all along. Same question either way — which vocabulary does this belong to.
  So it is `BOLT.hue0`/`hue1`, the same cyan and violet the shot is made of: a white throat, a
  body, a cool edge, and a cone of pips thrown ALONG THE BARREL so it reads as pressure leaving
  rather than as a ball appearing. `burst` has carried a velocity since c120, which is what lets
  the sparks actually go somewhere.
  **AND IT COMES OFF `weapon_tip`, NOT off `muzzleAt`.** That function deliberately pushes the
  bolt out to `WEAP.out` so a shot is not born inside whatever he is standing next to — right
  for the BOLT and wrong for the FLASH, which belongs exactly on the hole it comes out of.
  The COP's pistol keeps its card: a real gun firing a real round is what that drawing is for.
- **THE JET FLAME IS BLUE, AND THERE ARE TWO OF THEM (c126).** The c120 flame was orange — a
  campfire palette on a thruster. A hot gas flame is the other end of the scale: near-white at
  the throat, cyan through the middle, deep blue at the coolest edge, and NARROWER, because fire
  spreads and a jet is a column.
  **AND ONE FLAME DOWN THE MIDDLE OF HIS BACK IS A ROCKET, NOT A JETPACK.** `models/alien_jetpack.glb`
  STILL has no nulls in it — re-read at c126: one node, one Tripo mesh, 0 skins — so the pair is
  placed off the measured centre along HIS OWN right vector (`faceH`), which keeps them across
  his back whichever way he turns, at `JET.nozAt` of the pack's MEASURED size rather than a typed
  offset. The moment an export carries the joints, `JET.tip` takes them and this fallback stops
  being reached.
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
  - **THE CARD IS A LINE-UP NOW (`LINE`, `lineStep`, c131).** *"All of the characters should
    stand on the start screen -- Colin in the middle, Moussa one side, the alien the other --
    and everybody who is not selected is slightly back."*
    **THIS COST ALMOST NOTHING BECAUSE `PARADE` HAD ALREADY PAID FOR IT.** "Every character owns
    his own root, always in the scene" was written so TWO of them could be on the street during
    a swap; having all five is the same property, used harder. `colin.root` is still an alias
    for whoever is current, so `poseColin` still never learns any of this happened.
    **THE LAYOUT IS DERIVED FROM THE SHOT, NOT TYPED.** The line runs along the CAMERA'S right
    and is centred on the roster, so it stays square to `TITLE.az` whatever that is set to, and
    adding a character shuffles everybody out by half a gap instead of growing the row off one
    end. The unselected stand back AND angled inward — that inward angle is the whole difference
    between a group and a police line-up, and it is what makes three read as his "triangle"
    while eight read as a line, with no second case.
    **AND `poseColin` IS NOT CALLED ON THE CARD ANY MORE.** It puts the current character
    wherever the PLAYER is, which is a second writer on the same root — whichever ran last would
    win the frame.
    **THE CURRENT SKIN'S MIXER MUST NOT BE UPDATED HERE.** `frame()` already updates
    `colin.mixer`, and that IS this skin's mixer when it is the one worn: driving it in the
    line-up as well advances his clips TWICE a frame, so the man you have selected idles at
    double speed and nobody else does.
    **`wear` HAS TO RUN AGAIN AFTER `TITLE.on` GOES FALSE.** It owns that visibility, and run
    before the flag flips it decides everybody is still standing there — and they would be, for
    the whole game, rooted at the spawn.
    **THEY LOAD IN BEHIND THE CARD, ONE AT A TIME (`lineFill`).** Five skins is twenty-three
    megabytes and none of it belongs on the boot path: the card comes up with whoever was worn
    last time and the rest take their places as they land. Which is also exactly what "when you
    unlock more characters they will be on there" looks like, with nothing extra to build. A
    failure is REMEMBERED, because retrying a missing file every frame is a request storm that
    looks identical to the file being slow.
    **THE SHIP GOES OVER (`SHIPFLY`)** — a clone, because the real one is parked on a roof four
    hundred metres away and moving it would mean putting it back. It crosses on the camera's own
    right axis, so it is in frame BY CONSTRUCTION whatever `TITLE.az` is: the clouds' rule, that
    anything meant to be SEEN is placed in the frame's terms and never in metres.
    `startParade` stays for the case it was written for — no line-up, one man, walking in from
    off frame — and `LINE.on = 0` gets you back to it.
- **THE CHARACTERS ARE THE MENU, SO THE ROW OF CHIPS HAD TO GO (c143, `charAtScreen`,
  `nameShow`).** *"I don't want the buttons. I just wanna be able to click on the character, or
  swipe left, swipe right, and whoever's name is selected."* He is right and the reason is worth
  writing down: the whole point of doing the card IN THE LIVE SCENE is that the thing being
  chosen is on screen at full size. A row of pills under it is a SECOND, worse copy of a control
  the picture already had -- and it pulls the eye off the subject to do it.
  **TAP-TO-PICK IS PROJECTED, NOT RAYCAST**, which is `camFree`'s argument in another room: a ray
  against five skinned meshes has to skin them first, and the question is "which of these five
  did he mean", not "which triangle". `lineStep` already writes every root's world position every
  frame, so projecting five points and taking the nearest IS the answer -- and it is forgiving in
  a way a ray is not, which is what matters when the target is forty pixels wide and a thumb is
  sixty. Measured to CHEST height, because the feet are the part of him a tap is least likely to
  land on.
  **IT HANGS OFF THE SWIPE'S OWN POINTER STREAM**, after the swipe test, so a tap and a swipe can
  never both fire. A second listener would have had to re-derive that exclusion and get it right.
  **AND A TAP ON A BUTTON, THE SETTINGS PANEL, A KIT KEY OR A STICK IS NOT A TAP ON A CHARACTER.**
  The handler is on `window` WITH CAPTURE -- which is what makes it work at all, since `#title`
  is `pointer-events: none` by design -- and capture runs BEFORE the panel's own
  `stopPropagation`, so the exclusions have to be listed here rather than relied on downstream.
- **A NAME IS ART, NOT TYPE (c143, `CHARS.art`).** *"I'm gonna make each of their names with the
  same graphical thing as the title, cause I don't like just text font bubble, it just looks low
  rent."* Same verdict as `TITLE_ART`, one element along: no font sets what he draws, and a pill
  in a UI face next to spray-paint key art reads as a web form.
  So the plate is an `<img>` first and type second. **Drop `images/name_<key>.png` in, run
  `npm run bump`, and it appears with no code change** -- `weapFit`'s rule applied to the HUD:
  write it to take the asset the moment one exists. `CHARS.art` overrides the path per character.
  **A MISSING PNG IS NOT A BROKEN NAME.** The image only becomes `lit` on a successful load, so a
  character whose art is not drawn yet reads exactly as he did before rather than as a gap --
  which is `BOOT.png`'s reason for existing two hundred lines up.
  **IT FADES RATHER THAN CUTS**, and the fade is also what covers the beat where the skin behind
  it is still coming down the wire. `_nameFor` is what the plate is showing, checked again on the
  far side of that fade: without it, two quick swipes land the second name and then the first.
- **THE TITLE CAMERA POPPED BECAUSE ITS BOOM WAS NEVER EASED (c137).** *"It pops to a zoomed-in
  position, then pops in a bit more, then pops out. I think it's because cars are driving by."*
  **IT IS NOT THE CARS** -- `camFree` probes `gridQuery`, which is the STATIC grid built once at
  load. Moving traffic is not in it and cannot be (that is why a car's box is handed to the
  player's resolver separately every frame). Parked cars are, but they do not move. A good
  hypothesis, and ruling it out is what pointed at the real one.
  **TWO CAUSES, BOTH MINE, BOTH FROM c131.**
  1. **THE PROBE WAS QUANTISED.** Walking in fixed `CAM.probe` steps and returning the last
     clear one means the answer only ever takes values 0.6 m apart -- so as the shot sways past
     a wall the boom comes back 6.4, 5.8, 5.2, 5.8 and the picture JUMPS sixty centimetres at a
     time. It bisects between the last clear sample and the first blocked one now: four more
     grid queries, and a continuous number, which is what anything that moves over it needs.
  2. **AND `camAim` APPLIED IT RAW.** `stepCam` has damped its boom since c129 -- snap in, ease
     out -- and the title camera, which is the one that sways across geometry on purpose, had
     none of it. Same rule, and **only while the card is held**: the descent interpolates its own
     distance and a second filter on top would lag the arrival, which is two writers on one
     number a level down.
  The sway itself was never the problem: `sweep` .26 rad is a 30-degree ping-pong on an 18 s
  period, which is what he described wanting.
- **`TITLE.az` WAS TYPED AND THE LENS ENDED UP INSIDE A HOUSE (c134, `titleAimClear`).**
  *"There's just this giant geometry including the camera view."* The bearing was aimed at the
  skyline on paper — measured, but measured for what is in FRONT of the shot and never for what
  is behind the lens. The spawn has a house there, so `camClear` pulled the boom to its minimum
  and the whole frame was one wall, with the line-up standing perfectly well behind three metres
  of building.
  **SO IT IS SEARCHED AT LOAD, NOT SET.** The aimed bearing first, then further either side, and
  the first that is clear wins — **checked across the WHOLE SWAY**, because a bearing that is
  clear at the centre is one that breathes into the wall two seconds later. That is the same
  shape as clamping a total instead of a request: test the range the thing actually occupies.
  `npm run spots`' rule is why it is searched at all — placing a camera by eye off a screenshot
  is how you get one inside a bank.
- **A PICK THAT LANDS WHILE ITS SKIN IS LOADING HAS TO COMPLETE (c134).** `pickChar` bails when
  the key is already loading, which — now the card loads everybody in the background — is most
  of the time. Without `lineFill` finishing the pick itself, tapping a chip while its skin is in
  flight sets `want`, lights the chip and then silently never becomes `cur`.
- **`npm run title` DRIVES THE CARD HEADLESS.** It boots the real module, runs `titleFrame` and
  then picks every character through the same `pickChar` a chip press goes through. Neither the
  syntax gate nor the boot gate can see any of this: both stop at `init()`, and the frame loop
  is a no-op stub in them. It is what proved the crash was NOT in the pick path, which is what
  sent me to look at memory instead.
- **`camClear` AND `camFree` WERE THE SAME FUNCTION (c131).** c129 wrote the play camera's boom
  probe without noticing the title camera had had one since c65. They answer one question, so
  there is one of them now: `camClear` delegates. The newer body is strictly better — 0.6 m
  steps rather than seven samples at 12%, so it cannot step over a railing, and it honours
  `CAM.min`. **Two functions answering one question is two things to keep in step**, which is
  the same argument as a variable with three owners and a harness with its own roster.
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
- **TWO OF THE FOUR "RAMPS" ARE NOT RAMPS, AND BOTH NEAR SPOTS HAD ONE (c136).** *"I'm unable
  to ride on the skate jump ramps that we put in."* Measured through the file **with the node's
  own +90 deg X rotation applied** -- and that is the whole reason it was never caught, because
  without it every one of them reads plausibly:
      ramp_fun_box_01   13.00 x 1.62 tall x 7.63 deep    a fun box
      ramp_fun_box_04   10.34 x 2.83 tall x 2.84 deep    a ramp
      ramp_fun_box_02    5.90 x 1.43 tall x 0.13 DEEP    a thirteen-centimetre PANEL
      ramp_fun_box_03    4.20 x 1.83 tall x 0.15 deep    the same, shorter
  `_02` and `_03` are flat panels standing on edge — a grind rail and a wall-ride, not anything
  you roll up. Every face on them is vertical, `triAdd` rejects a vertical face as "not a floor"
  (correctly), so **there is nothing there to ride**. They were four of the six placements
  INCLUDING BOTH of the pair nearest the spawn — the two he would meet first were the two with
  no rideable surface on them at all.
  **THE ASSET WAS NEVER THE PROBLEM AND THE COLLIDER WAS NEVER THE PROBLEM.** `npm run rails`
  measured these four at the start and reported a clean rail off each, which is true and which
  says nothing about whether you can ride one. A measurement that answers a different question
  than the one being asked is worth less than no measurement at all.
- **AND THE PAINT PATTERN IS A TEXTURE TOO (c139).** *"We're down to about 20 per second and it
  seems like it was introduced when we started texture painting."* He is right, and the honest
  answer is that this pass was **fourteen `sin()` a fragment across the whole screen to evaluate
  a function of POSITION** -- which is a texture, the same argument the palette LUT won one build
  earlier and which I did not then apply to the pass next to it. It bakes once in JS and costs
  two fetches.
  **TWO FETCHES, AND THE SECOND IS NOT WASTE.** One tile repeating every `PAINT.tile` metres
  across a flat road is a visible grid -- the graph-paper failure the domain warp exists to
  prevent, reintroduced by the fix for it. The second sample is the same tile at an irrational
  scale and an odd angle, so the two never line up again and the repeat has no period you can
  see.
  **`PAINT.grain` IS GONE RATHER THAN OFF.** A fine tooth is exactly the frequency a baked tile
  cannot hold without moire, so there is nowhere cheap to put it any more.
  **THE CARD IS HEAVIER THAN THE GAME, AND THAT IS NOT WARMING UP.** *"The start screen seems to
  struggle more than the actual gameplay, which is the reverse of what you'd expect."* It is
  real: the card has EVERY character loaded and skinned and visible, plus the ship clone, plus
  `lineFill` pulling the next skin down in the background -- and `startGame` disposes all of that
  (c135). Fewer things on screen in play than on the menu is the correct explanation and it is
  also the measurement that says a skin is expensive.
- **A LOOK-UP TEXTURE IS WHAT A FUNCTION OF ONE VARIABLE COSTS (c136).** *"Whatever we've done
  made it a little bit slower."* `palPatch` was walking SIX gaussian families per fragment -- an
  `exp` and a wrap each -- over the whole screen, to evaluate a function of hue alone. That is a
  texture: 256 samples across the circle, baked in JS whenever a number moves, `RepeatWrapping`
  to carry the seam at zero, 16 bits across two channels because 256 steps of hue bands visibly
  on a wide gradient. The fragment cost collapses to one fetch.
  **THE SATURATION GATE STAYS IN THE SHADER** because it is a function of the OTHER axis, and a
  2D table to absorb one `smoothstep` is a bigger texture and a worse cache for nothing saved.
  **AND `PAINT.grain` IS OFF BY DEFAULT** -- one more value-noise sample, four of that pass's
  fourteen `sin()`, for the least visible of the four things it does.
  **NO BACKTICKS INSIDE A SHADER STRING.** The whole block is a template literal and a backtick
  in a COMMENT closes it -- which is a syntax error a hundred lines later, in a different
  function, pointing at a line that is fine.
- **THE AIM ASSIST IS OFF (c136).** *"It keeps locking onto everything and it won't be what
  you're trying to shoot at -- it finds something in the distance and it glitches."*
  Plutopia's numbers are right FOR PLUTOPIA, where the things worth shooting are sparse. This
  city is four hundred cars and eight officers, so a 22-degree cone at 44 m almost always
  contains SOMETHING, and the mark snapping between two of them at forty metres is the
  glitching. **An assist that is always on is not an assist, it is a hand on the wheel.**
  Nothing is deleted: `WEAP.lock.on = 1` brings the whole loop back exactly as it was.
  **A ported number is only as good as the shape of the world it was tuned in** -- the third
  time that has been the answer, after the see-through hole's radius and the jetpack's palette.
- **AND A PLASMA BOLT LANDING IS NOT A CARTOON EXPLOSION (c136).** *"Even when the beam hits
  something it does the smoke and says POW and it's really big and it just envelops whatever it
  hits."* `boom` is the drawn bank -- a star, the word, debris going grey -- at 1.6 m across on a
  point-blank impact. **This is the c126 lesson one event later**: the MUZZLE stopped being a
  card then and the IMPACT did not. Same treatment, same reason: the bolt's own colours thrown
  along the way it was travelling, with a much smaller card underneath it.
  `FX.impact` scales every impact card and is deliberately separate from `FX.size` -- the
  jetpack's puffs are a CLOUD and want to be broad, a hit is a point event that must not cover
  the thing it happened to.
- **`npm run palette` READS THE PALETTE OFF HIS OWN KEY ART (c135).** *"Can we nudge the colours
  toward this palette -- the start screen image, it's in the repo so you should be able to sample
  it."* So sample it. Reading a palette off a picture by eye is the same mistake as placing a
  ramp off a screenshot, and `npm run sky` already measures an exposure rather than guessing one.
  **IT IS A SATURATION-WEIGHTED HUE HISTOGRAM, and the weighting is the part that matters.** A
  poster is mostly midtones and sky; counting every pixel equally reports the BACKGROUND rather
  than the palette. What an artist means by the colours of a picture are the ones carrying
  chroma, so those are the ones that get a vote. `images/splash_screen_01.png`:
      hue .576  #4fa4ed  sky blue     11% of the chroma   <- the dominant family
      hue .063  #c27c52  warm tan      6%
      hue .924  #9e476f  rose          minor
      hue .785  #a94bcf  purple        minor
      mean value .68, mean saturation .40, 9% of it neutral
  A blue-and-warm-tan COMPLEMENTARY poster with purple and rose in the corners — which is not
  what c130 reasoned its way to (rose / amber / teal / violet), and the measurement is the one
  that gets shipped.
  **THE ART HAS NO GREEN IN IT AT ALL**, nearest family 0.24 away, and that is the one entry that
  is a judgement rather than a measurement: pulling the whole landscape that far would be
  INVENTING a colour rather than matching one. Green goes to teal — out of primary, heading
  toward the dominant blue, stopping well short of becoming it. Said out loud because everything
  either side of it in that array is measured and this one is not.
  **`satMax` COMES OFF THE SAME READING**: the art's own mean saturation is .40, so a ceiling near
  twice that is a world that can be as chromatic as the poster and no more.
  `city.PAL.set('poster')` is this, `'plutopia'` is the c130 reasoned set, `'raw'` is off.
- **HIDING A SKIN FREES NOTHING (c135, `dropSkins`).** *"I got through the character selection,
  started playing and then it crashed again."* Streaming the music took 157 MB off the session
  and it still went. `wear` only makes the other characters INVISIBLE, and a hidden mesh costs
  exactly what a drawn one does everywhere except the GPU's vertex fetch: geometry, textures, a
  skeleton, a mixer and its own clone of every clip in the pool, all resident for a game that
  will only ever draw one of them.
  **SO THEY ARE RELEASED WHEN THE CARD GOES**, and that is safe because nothing is lost:
  `pickChar` already loads a skin the first time it is asked for, so a disposed character simply
  comes back from disk, and the card is the only thing that ever asks.
  **AND THE BOOT POSTER GOES WITH THEM.** `#boot` only ever got a class that fades it out, so its
  `<img>` sat in the document for ever holding a 941x1672 decode — 6.3 MB for a screen that has
  gone. The title card already removes itself; this one never did.
  **ROBIT AND MOUSSA BOT ARE OFF THE ROSTER.** They were the jury-rigged tests the
  borrowed-character machinery was proved on and they served that purpose; three skins instead of
  five is the cheapest memory there is. Both files stay in the repo and are still measured by
  `npm run wear`, so a line brings either back.
- **THE PALETTE (`PAL`, `palPatch`) IS A HUE-VS-HUE CURVE, AND THE TWO OBVIOUS DESIGNS ARE BOTH
  WRONG (c130).** *"It feels very McDonald's -- red and yellow. Tint the green, tint the red,
  tint the blue."* The source GLB is full of raw primaries and no amount of lighting rescues one.
  **BOTH ANCHOR SCHEMES FAILED, AND THEY FAILED IN OPPOSITE DIRECTIONS** — checked in node
  against real colours rather than shipped and looked at, which is the only reason either was
  caught:
      NEAREST ANCHOR      strong, and DISCONTINUOUS. Primary red went rose while a brick two
                          hundredths of a hue away went amber -- so the grade pushed
                          near-identical colours APART at every boundary between anchors.
      WEIGHTED ANCHORS    continuous, and it CANCELS exactly where it matters. Red sits between
                          the rose and amber anchors, both pull equally hard in opposite
                          directions, and primary red -- the entire complaint -- moved 0.004
                          and stayed primary. Raising the sharpness does not fix it; the two
                          distances are genuinely almost equal.
  **SO IT IS A FEW INDEPENDENT GAUSSIAN NUDGES ON THE HUE WHEEL**, which is literally what he
  asked for and is how a hue-vs-hue curve works in any grading tool: no anchors, no boundaries,
  nothing to cancel, and every family separately art-directable. Measured at `pull` 1:
      #ff0000 primary red -> #ff6197 rose      #d92121 McDonald's red -> #d95280
      #ffff00 primary yel -> #ffd761 gold      #00ff00 primary green  -> #61ffc4 mint
      #0000ff primary blu -> #9a61ff violet    #5999e6 sky blue       -> #646ae6 periwinkle
      #57575c road grey   -> UNCHANGED
  **THE HUE DISTANCE MUST WRAP.** Without it every red is judged to be a long way from a family
  centred at zero, and the reds are the whole point.
  **AND THE SHIFT IS SCALED BY SATURATION.** A grey has no hue, and tinting one is how a neutral
  road turns lilac — which is why the road above comes out untouched and the grass does not.
  **THE CHROMA CAP IS HALF THE PAINTERLY READ ON ITS OWN.** A painter mixing from a limited
  palette physically cannot reach full chroma; a renderer that can is what "too chromatic" means
  as a complaint. Plus a split tone, cool shadows and warm lights, which is what makes a scene
  look lit by something rather than multiplied by something.
  **IT LANDS ON THE ALBEDO, BEFORE THE TOON RAMP AND BEFORE SHADOWS** — this is the paint the
  world is made OF, not a filter over the picture. And it is patched AFTER `paintPatch` so it
  ends up FIRST in the shader: both replace the same include, and the palette has to harmonise
  the base colour before the paint splotches it or every patch edge is a different hue from its
  neighbour.
  `city.PAL.set('plutopia' | 'dusk' | 'raw')`, or the Palette section in settings.
- **THE PAINT PASS (`PAINT`, `paintPatch`) — PROCEDURAL, ZERO BYTES, AND IT IS NOT "ADD NOISE"
  (c127).** *"Is there a way you could take a colour and procedurally generate that same colour
  with slight variation, so it looks splotchy and painterly, without a rendered texture map?"*
  Yes, and Plutopia already proved it — its `groundPatch` is exactly this, on its terrain.
  **THE WHOLE TRICK IS THE THRESHOLD, NOT THE NOISE.** Smooth mottle added to a colour reads as
  DIRT. A painted surface is areas of ONE FLAT COLOUR with a drawn line where two of them meet
  — so the broad noise is thresholded into patches (smoothstep across a narrow band, which is
  nearly a step) **and the band itself is darkened**. That seam is the ink, and it is the single
  thing that makes this read as paint. Drop it and you are back to a dirty wall.
  **VALUE NOISE LIVES ON AN INTEGER LATTICE, AND A THRESHOLD ACROSS IT DRAWS THAT LATTICE.**
  Every patch edge comes out along a grid line and the mottle comes out as graph paper. So the
  broad pattern is DOMAIN-WARPED before it is thresholded (one extra sample pushed along a
  diagonal, and no edge is axis-aligned any more) and the mottle is two lattices at different
  angles and scales whose overlap is an irregular mosaic. Plutopia paid for both; they came over
  as written.
  **DOMINANT-AXIS PLANAR, NOT TRIPLANAR.** This is a box city — its surfaces are within a few
  degrees of an axis nearly everywhere — so blending three samples triples the cost to hide a
  seam that only exists at 45 degrees. Where the axis does flip it is a 90-degree corner, a wall
  meeting a roof, and those two wanting different patterns is correct rather than a fault.
  **THE HUE DRIFTS, NOT ONLY THE VALUE.** A patch that is merely lighter reads as LIGHTING; one
  that is lighter and a touch warmer reads as a different mix of paint. `PAINT.warm`.
  **IT LANDS ON EVERYTHING FOR FREE** because `MeshStandardMaterial.prototype.onBeforeCompile`
  is already the global hook — the city, the ramps, the cars, the props, one patch, no per-asset
  work. `userData.noPaint` opts a material out.
  **AND COLIN IS NOT PAINTED, WHICH IS THE MIXED-MEDIA READ HE IS AFTER** — a flat painted world
  with a shaded character in it. He gets that for nothing: his materials set their own
  `onBeforeCompile`, which shadows the prototype's entirely (the see-through hole's own rule,
  working in our favour for once).
  **THE COST IS ABOUT A DOZEN `sin()` A FRAGMENT AND NO MEMORY AT ALL.** For comparison, one
  1024² map per material is ~1.4 MB on the GPU with mips; thirty of them is 40 MB on top of
  fifteen of GLB, plus the authoring. **The middle path, when hand control is wanted, is ONE
  small tiling greyscale applied the same way — not one map per asset.**
  **THE SCREEN-SPACE PAPER GRAIN IS DELIBERATELY NOT IN THIS BUILD.** It is the next biggest
  lever and it belongs in the composite, but shipping it alongside the paint would move two
  variables at once and neither could then be judged — which is this file's own rule about the
  badge toggles.
- **THE SHATTER IS ORDINARY JAVASCRIPT ON ORDINARY MESHES NOW, AND THE SHADER IS GONE (c147).**
  Three builds of a vertex shader that verified perfectly here and **never once moved on his
  phone**. `JAM_PROBE=tools/probe-boom.mjs` walked all eight links on a real car in the real city
  -- inner mesh, wreck slot, material swap, geometry tagged, attribute declared, splice landed,
  uniforms wired, and the shader's own arithmetic re-run in JS showing 75 cm of motion -- and the
  device showed nothing. **The one link no tool in this container can check is the driver**, and
  that is not a gap that closes with more reasoning.
  **SO THE RULE IS: A MECHANISM THAT CANNOT BE VERIFIED WHERE IT FAILS IS THE WRONG MECHANISM**,
  whatever it costs on paper. The pieces are real `Mesh` objects moved by ordinary code; if they
  do not move now, that is a bug I can print. It deletes the material clone, the program-cache
  question and the mid-game compile hitch with it.
  **THE PRICE IS DRAW CALLS AND `WRECK.chunks` IS WHERE IT IS PAID.** Fifty islands would be
  fifty calls per wreck, so they are grouped into NINE clusters by position -- farthest-point
  seeds over the island centroids, then each island joins its nearest. **Grouped by POSITION, not
  by size**: sorting by triangle count gives one chunk that is the whole body and eight that are
  bolts. `WRECK.max` is 3, so a wreck costs 9 calls and the feature costs 27 at its worst against
  the 166 the city already draws.
  **WORLD SPACE, ALWAYS.** The car is stopped for good from the first hit, so there is nothing
  left for the pieces to follow -- and world space means up is +Y and the floor is `groundAt`,
  rather than the model's own -Z and a bounding box. That sign is exactly what the shader version
  needed a uniform to carry, and it is the class of thing this file gets wrong.
  **Each chunk's world transform is taken through the car's OWN matrix**, so it lands exactly
  where that part of the bodywork already was. Nothing typed, nothing to get backwards.
- **A SHOT CAR STAYS SHOT (c147).** *"Once you shoot them and they stop, they start moving again
  -- and even after they make the explosion noise they still start moving again."* `BOLT.stun` is
  **2.6 seconds**, so a damaged car resumed its commute before the next shot landed: four shots
  had to arrive inside eight seconds on a moving target, and they never did, which is why he had
  never once seen stage 4. A car with a hole in it does not go back to work.
  **AND HALF OF WHAT HE HEARD WAS c145's MIS-SAMPLED CRUNCH** -- the per-hit sound WAS the
  explosion file pitched up -- so "even after the explosion noise" was mostly the first hit.
  Two bugs reinforcing each other into one confusing report.
- **THE STICK WATCHDOG IS GONE, AND IT WAS NEVER SOUND (c147).** *"I'm holding up on the left
  stick, I put my finger on the right stick to run faster, and it sort of just stops after a
  while as if it thinks I've let go when I haven't. I wonder if ever since you tried to do
  something about the stuck stick it put this behaviour in."* **He is exactly right, and it is
  worse than he guessed**: `s.idle` was only ever reset when the stick was UP, so the timer
  counted plain HELD TIME -- **any hold longer than six seconds released itself**, moving or not.
  Running in a straight line is the most ordinary six seconds in the game.
  **AND THE IDEA CANNOT BE RESCUED BY A LONGER TIMER OR BY WATCHING FOR MOVEMENT.** A pointer
  that is not moving generates no events, so "no events" and "no thumb" are the same observation
  and no amount of waiting separates them; the browser has no "is this pointer still down" to
  ask. **A test that cannot tell its two answers apart is not a test.** c138's four real causes
  each have a real mechanism and they stand; this was a hedge against the ones I had not thought
  of, and its false positive is worse than the bug it hedged against. **c138's own note said
  exactly that and then shipped it anyway** -- which is the second time in this file a protection
  has been contradicted by the paragraph introducing it.
- **AND c140's COLIN RETRY WAS AN UNBOUNDED LOOP (c147).** `for (;;)` on the argument that there
  is no game without him. True, and still wrong: a failure that is NOT the network -- a decoder
  the environment cannot build, a corrupt file -- makes it a hot loop with no exit, and every
  headless harness sat in it for ever flooding the log. It gives up after `LOADT.rounds` now and
  the chip says `NO COLIN GLB`, which is a game you can at least look at and a report that names
  itself.
- **THE CAR NEVER EXPLODED BECAUSE THE PIECES LEFT THE POSTCODE (c146, `WRECK.drag`).**
  *"It never physically exploded... it did eventually disappear."* c145 threw the debris at 7 m/s
  with nothing to slow it and six seconds to do it in: **one second after the blast the pieces
  were seven metres apart and by two they were off the screen.** What you actually saw was a car
  vanishing, then an empty road, then a fade of nothing -- which is not an explosion failing to
  fire, it is an explosion nobody was shown. The horizontal term CONVERGES now: a piece covers
  `spread / drag` metres in TOTAL however long it is on screen (about 1.9 m) and lands.
  **`spread * life` IS NOT HOW FAR DEBRIS GOES, AND THAT WAS THE WHOLE ARITHMETIC ERROR.** A
  launch speed with no drag is a number that means nothing without the clock beside it.
  **AND THE SKEW WAS REAL AND UNDER THE THRESHOLD OF BEING AN EFFECT.** At `.022` a panel wanders
  about three centimetres, which is nothing on a car ten metres away on a phone. Doubled.
- **THE CRUNCH WAS THE EXPLOSION SAMPLE PITCHED UP (c146).** *"It plays an explosion sound even
  when you're just shooting it; it should only play an explosion when it explodes."* c145 built
  the per-hit sound out of `boom` on the reasoning that a hit is a small explosion. It is not --
  and the entire point of the final one is that it is the FIRST time you hear that file. A panel
  going is a clang and a crack.
- **THREE HYPOTHESES, TWO WRONG, AND THE PROBE IS WHAT KILLED THEM (c146, `JAM_PROBE`).** Before
  touching anything I was sure it was `customProgramCacheKey` -- three reuses a compiled program
  across materials, so a clone of `cityMat` would get the CITY's shader and none of the shatter.
  **The vendored source says otherwise**: `customProgramCacheKey(){return this.onBeforeCompile.toString()}`,
  and my hook stringifies differently, so the programs were always distinct. Second guess was
  units -- if these cars were authored in centimetres, `0.022` is two hundredths of a centimetre.
  `npm run cars` prints the bbox and the node scale: **1.89 x 4.98 x 1.42 at scale 1.0, so a
  model unit IS a metre.** Both dead in about two minutes, neither shipped.
  **`JAM_PROBE=tools/probe-boom.mjs npm run jam` WALKS THE WHOLE CHAIN ON A REAL CAR.** Booting
  the real city headless is the expensive part, so `jam.mjs` hands its globals to a probe file
  instead of running the traffic sim -- one copy of that scaffolding, not two, which is the
  `normals.mjs` mistake avoided rather than repeated. It checks, in order: the car carries its
  inner mesh, a wreck slot is claimed, the material is swapped off `cityMat`, the geometry is
  tagged, the shader declares the attribute, the splice found `#include <begin_vertex>`, the
  uniforms are attached, **and the shader's own arithmetic re-run in JS actually moves a vertex.**
  That last one is the point: a shader that compiles and computes a zero offset looks exactly
  like one that never ran.
  **WHAT IT CANNOT SEE IS THE DRIVER.** There is no GPU here, so "it compiles on the device" is
  still unverified by construction. When every link reads intact and the phone still shows
  nothing, the remaining suspects are the numbers -- which is what it turned out to be.
- **`npm run glsl` PRINTS THE SHADER THAT WOULD REACH THE PHONE.** Every effect in this game is a
  string spliced into three's source, and a string is the one thing neither gate checks:
  `check:syntax` parses the JavaScript AROUND it, `check:boot` has no GPU and never compiles one.
  So a broken splice is invisible here and is an object that silently does not draw there.
  **It lifts the CONSTANTS out of the file too** -- a printer with its own copy of the numbers
  would happily print a shader the game never builds.
- **`city.boom()` BLOWS THE NEAREST CAR, `city.boom(1)` WALKS ONE STAGE.** Four accurate shots is
  a long way to go to look at an effect once, and a report like this one needs repeating cheaply.
  Same rule as `city.fx('boom')` and `city.slash()`: a look-at-it decision should not need a
  fight to reach it.
  **And the chip carries `WRK d0.05` / `WRK B1.4`** -- the damage stage, or the blast clock. "The
  pieces didn't move" is three bugs wearing one face from a phone: the damage never registered,
  it registered and the shader is inert, or it worked and was too small to see. Those three
  characters tell them apart without another round.
- **THE CARS ARE ALREADY BROKEN UP, AND `npm run cars` IS HOW WE KNOW (c145, `WRECK`).**
  *"Shoot it once and it stops, shoot it again and the pieces of the mesh slightly skew, two or
  three and it starts on fire, shoot again and the car actually explodes. Do you think that's
  possible or do I need to break up the geometry on a computer first?"* **No.** Read straight out
  of the shipped `models/city.glb`: 30 distinct car meshes, ONE primitive each -- so there is no
  material split to exploit -- and every one of them made of **47 to 64 SEPARATE CONNECTED
  ISLANDS**:
      car_c.001   1415 tris   47 islands   biggest 309 / 102 / 100 / 100 / 98 / 44
      car_f.001   1360 tris   64 islands   biggest 326 / 100 / 100 /  96 / 92 / 88
      tractor_a    968 tris   19 islands   biggest 144 / 134 / 130 / 114 / 108 / 52
  The big island is the body shell and the rest are wheels, glass, lights, bumpers and mirrors --
  exactly what a car would come apart INTO. Nothing needs authoring.
  **THE WELD IS WHAT MAKES THAT TRUE, AND WITHOUT IT THE ANSWER IS THE OPPOSITE.** These meshes
  are flat-shaded, so every face owns its vertices and raw index-sharing says every triangle is
  its own island -- a fact about the EXPORT, not about the shape. Positions weld to a tenth of a
  millimetre first.
- **(SUPERSEDED AT c147 -- the shader never ran on the device. Kept because the ISLAND
  finding, the away-from-centre launch and the drag are all still true and still shipped.)**
- **A SHATTER IS A VERTEX SHADER, NOT FIFTY MESHES (c145, `shatterTag`, `wreckPatch`).** Fifty
  pieces is fifty draw calls per wreck against a phone already at 24 fps. So each vertex carries
  its PIECE'S centroid and one per-piece random vector, the car stays ONE mesh and ONE draw call,
  and a uniform moves every piece about its own centre. **The same three lines give the dent and
  the explosion** -- `uBreak` is the whole difference, which is why four damage stages cost one
  mechanism.
  **ONE RANDOM PER ISLAND, NEVER PER VERTEX.** Per-vertex tears each piece into loose triangles,
  which is the difference between debris and confetti.
  **AND THE VECTOR POINTS AWAY FROM THE CAR'S OWN MIDDLE.** A purely random direction sends half
  the pieces INWARD and the car reads as imploding.
  **IT WORKS ALONG `uUp`, NOT ALONG Y, AND THAT IS NOT A DETAIL.** A vertex shader runs in MODEL
  space, and a car in this pack has its LENGTH on Y and its UP on -Z (the `CAR_FWD` note). Against
  `.y` the debris would have flown out along the bonnet and clamped against the nose. The axis is
  a uniform derived from `CAR_FWD` where that is already known, rather than a sign guessed in
  GLSL -- this file's handedness rule, which comes out backwards half the time when argued.
  **THE NORMAL TURNS WITH THE PIECE** or a tumbling panel is lit as if it never moved, which is
  flat cardboard rather than metal. `beginnormal_vertex` runs before `begin_vertex`, so
  `objectNormal` is there to be rotated by the same Rodrigues.
  **RIGID BODY IS THE ONE THING THIS IS NOT, DELIBERATELY.** Shipped debris is ballistic with a
  floor stop and a spin, not a solver; the pieces are on screen for two seconds. A real solver
  would mean a physics engine for one effect.
  **A WRECK IS A MATERIAL, WHICH IS WHY THERE IS A POOL.** Damage lives in uniforms, uniforms
  belong to a material, and a new material is a new shader PROGRAM -- a compile mid-game is a
  visible hitch on a phone. `WRECK.max` are built at load, a damaged car borrows one, the oldest
  finished wreck gives its slot back. **And the instance hook calls the prototype's first**, or a
  wreck is the one object in the city with no toon ramp, no palette and no see-through hole (the
  hole's own landmine, working against us for once).
  **A BLOWN CAR IS REMOVED BY BEING LEFT OUT OF `carGridBuild`**, one guard. Everything that can
  see a car asks that grid -- traffic, the player's resolver, the bolts, the aim assist -- so one
  line takes it out of all of them, and the debris keeps drawing because that is a Group in the
  scene and nothing to do with `cars`. **Splicing `cars` is the obvious move and it is wrong**:
  `crossGive` holds references across frames (`c.led`) and a list that renumbers under them is a
  live bug.
  **A CAR THAT GIVES ITS SLOT BACK GOES BACK TO INTACT, `hp` AND ALL** -- one that looks brand new
  while still one shot from death is `KIT.on`'s three-owners bug in a pool.
  **`npm run wreck` RUNS THE SHIPPED `shatterTag`** (lifted between `WRECK:` markers) on the real
  car geometry and asserts every mesh splits into a sane number of pieces -- not 1 (the weld
  swallowed the car and it will SCALE rather than shatter) and not one per few vertices (it never
  welded, and it is confetti). It agrees with `npm run cars`' independent gltf-transform reading
  to the piece: 52 / 64 / 47 / 52 / 64. **The asset measurement and the pipeline measurement are
  two different tools here on purpose**, which is the lesson this repo has paid for six times.
  **AND THE BACKTICK LANDMINE CLAIMED THIS BUILD TOO.** A comment inside the shader template
  literal, mentioning a chunk name in backticks, closed the string -- c136's exact fault, walked
  into while writing the line that fixes the normals. `npm run check:syntax` caught it. There are
  no backticks inside that block now and there must never be.
- **MONEY YOU PICK UP (c144, `CASH`, `buildCash`, `stepCash`).** *"Money that you collect -- a
  stack of hundred dollar bills with a little [band] to signal that it's like $10,000. Put it
  around town, just a little bit here and there."*
  **THE BANK STRAP IS THE ENTIRE READ, WHICH IS WHY THIS IS GENERATED RATHER THAN MODELLED.** A
  green brick is a green brick from ten metres; the one thing that says MONEY at that distance is
  the paper band wrapped across the middle. So the silhouette is four plates with a hair of gap
  between them (which is what reads as SHEETS rather than as a block) under one bright band that
  stands proud on two axes -- proud is the whole difference between a strap and a stripe. Sixty
  triangles, and every number is a fraction of `CASH.size` so a re-scale stays in proportion.
  **AND IT IS OVERSIZED ON PURPOSE.** A real note is 156 mm. At the distance this camera reads
  the ground from, an accurate one is invisible -- the skateboard's own lesson, pointing the
  other way.
  **ONE `InstancedMesh`, ONE DRAW CALL.** They each bob and spin on their own clock, so they
  cannot be merged into one static geometry the way the ladders are -- and twenty-six separate
  Meshes is twenty-six draw calls on a phone already at 24 fps. A taken one is SCALED TO ZERO
  rather than removed: the count is fixed, and re-packing would renumber everything still
  standing.
  **IT IS THE ONE THING IN THE WORLD THAT OPTS OUT OF THE PAINT AND THE PALETTE.** The grade
  pushes green toward mint and the paint splotches it, and this is the one object whose COLOUR IS
  INFORMATION -- money that is not green is not money. It keeps the toon ramp and the see-through
  hole, so it sits in the picture rather than on top of it. There is a mechanical reason under
  the taste one: `paintPatch` builds its world position from `modelMatrix * transformed`, and
  under instancing `transformed` has not had the instance matrix applied yet, so every strap
  would sample the same spot on the tile.
  **PLACED BY `npm run spots 2 spread 26`, NEVER BY EYE**, and `spread` is the sort that exists
  for exactly this: `spots` ranks nearest-first, which is right for a half pipe he has to find
  and would have put twenty-six straps in a rank in his face. Farthest-point sampling gives one
  within a walk of the spawn and the rest from 148 m to 770 m out, so finding them is a reason to
  cross town. All twenty-six read flat 0.00 and good 100 per cent -- open ground, not a road.
  **COLLECTED BY PROXIMITY, NOT BY A COLLIDER.** A pickup is a thing you drive THROUGH, and
  twenty-six distance tests a frame is nothing beside four hundred cars each asking their
  neighbours twice.
  **THE SOUND IS PLUTOPIA'S AND ROBITS' `jewel_noise_01`** -- it is in BOTH repos under that name
  doing the same job, which is the strongest argument for borrowing rather than inventing. **It
  climbs two semitones a pickup and resets after a pause**, the oldest trick in a collectible and
  what turns twenty-six identical chimes into a run you want to keep going. The run is state on
  the SOUND, not a counter on the caller, so it belongs to the chime rather than to the money.
  **THE COUNTER RUNS UP RATHER THAN JUMPING.** A number that snaps reads as a variable changing;
  one that runs reads as money arriving, which is most of what picking it up is for.
  **NOT YET: THE ARREST.** *"The cops will try to arrest you and when you get arrested you lose
  all your money. You don't need to implement that stuff yet."* `CASH.lose()` is the hook, and
  nothing calls it -- `HEAT` is already the wanted level it will read, and the officer needs a
  tackle animation before any of it means anything.
  Verified through `npm run jam`: 26 straps built against the real collider, city still 96 chunks.
- **PLUTOPIA'S SHIP IS PARKED ON HOTEL_A'S ROOF (`SHIP`, c127), AND THAT IS NOT AN ARBITRARY
  ROOF.** `npm run ladders` had already put a LADDER up that building, and it topped out on a
  bare 14 x 14 m deck with nothing on it. A climb that leads somewhere is worth more than a ship
  on a roof you cannot reach.
  **THE DECK CENTRE IS MEASURED** — (298.2, 17.1, -13.1) — because `npm run ladders` now prints
  the roof centre and its size beside the ladder foot. Placing a prop by eye off a screenshot is
  how you get one hanging over a parapet, the same reason `npm run spots` exists for the ground.
  **ITS SIZE IS MEASURED TOO**, the skateboard's rule: it arrives about a unit across, so the
  scale comes from its own long horizontal axis and a re-export at any size lands right.
  **AND IT IS SOLID.** A prop you walk through is scenery — the box goes to the PLAYER'S OWN
  resolver every frame the way a car's and an officer's do, so there is no second physics path
  and its roof is a floor he can stand on. There is no ride mechanic yet; that is its own build.
- **THE CAMERA CAME IN, IT DID NOT CLIMB (c129) — AND `hmAt` IS WHY IT SAT ON THE BRIDGE.**
  *"I drop down below and the camera stays up on the bridge, so you're looking down at the
  character... there's plenty of room for it down here."* The cause is one line:
  `const floor = hmAt(cam.pos.x, cam.pos.z) + .6;`
  **THE HEIGHTMAP HAS NO CONCEPT OF BELOW.** `hmAt` is a single height per 1 m cell — the note
  three hundred lines up says it survives only as a FALLBACK because the real ground is the
  triangle collider — so under a bridge it returns the DECK. Step off one and the lens is
  clamped to the surface he just left, six metres up, with nothing in the loop able to bring it
  back down. It was not a follow bug or a damping bug; the camera was being held there.
  Two changes, and the second is belt and braces for the first: it clamps against `groundAt`,
  which knows what is underneath something, and it may never lift the lens more than `CAM.rise`
  above his look point whatever the ground says.
  **AND COLLISION SHORTENS THE BOOM RATHER THAN MOVING IT.** *"Sometimes when you come up
  against a wall the camera zooms in on the player."* That is the right answer and it is the one
  that preserves the SHOT: `camFree` walks out from the look point along the boom and stops at
  the first solid, so the lens keeps its level three-quarter view and just gets closer. Lifting
  it over the obstacle instead is what turns the shot into the top-down one he is complaining
  about — the fix and the bug were the same mechanism.
  **SNAP IN, EASE OUT.** Easing IN is time spent inside the wall. Easing out is what stops every
  lamp post making the shot lurch.
  **WALKED, NOT RAYCAST, AND COARSE ON PURPOSE** — the city is thirty thousand boxes in a grid,
  so a dozen grid lookups beats any ray structure, and this is `copSees`' own argument: it runs
  once a frame and a lens clipping a lamp post for an instant is not the failure a lens inside a
  building is.
- **THE HOLE IS A CONE NOW, NOT A PORTHOLE (`HOLE.grow`, c129).** *"I get this small peephole
  into what should otherwise be an entire section of transparency."* The radius was a fixed
  fraction of screen height, and that is exactly wrong for the case that matters: **a fixed
  screen circle cut through a wall right in front of the lens reveals almost nothing, because
  the wall fills the frame.** What the geometry wants is a cone from the camera to him, so the
  radius grows with how much NEARER the occluding fragment is than he is — a railing beside him
  still gets a small hole, a bridge deck the lens is under gets a large one.
  **IT WORKS IN PLUTOPIA BECAUSE PLUTOPIA HAS NOTHING TALL TO STAND UNDER.** A constant that is
  right for an open island is a peephole in a city of bridges and towers. A ported number is
  only as good as the shape of the world it was tuned in.
  **AND THE COMPOSITE HAD TO GROW BY THE SAME LAW.** The outline mask rebuilds the hole's tests
  in UV space, off the MINIMUM of its five depth samples; diverge the two radii and the depth
  outline goes straight back to drawing the dither instead of the building, which is the
  landmine four bullets down.
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
