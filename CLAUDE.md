# City — working rules

Single-file Three.js r180 game in `index.html` (native ES modules, import map, no build
step). Bump `BUILD` (top of the module script and the `#build` chip) on every push, Pages
caches `index.html`. **Push straight to `main`** — the owner previews live on a phone.

## Verification budget

**The owner tests the game. You do not.** Make the change, bump `BUILD`, run the ~1s
syntax gate (`npm run check:syntax`), push, and say "shipped unverified". No screenshots,
no headless runs, no playwright unless he asks for it by name.

## Layout

- `index.html` — everything: renderer + post chain (Plutopia's toon ramp, depth outline,
  bloom, ACES, grade), heightmap + box colliders, traffic, twin sticks, Colin, the board.
- `models/city.glb` — baked from `LowPoly_City_01.glb` by `npm run bake` (gltf-transform:
  welds and simplifies the heavy meshes, marks them `extras.flat` so the game recomputes
  flat normals). Re-run after touching the source GLB. The game falls back to the source
  file if the bake is missing.
- `models/colin.glb` — copied from the `colin` repo (Mixamo rig, clips: idle_neutral,
  walk_fwd_neutral, run_fwd, turn_left/right, dances, waving; 42 face morphs on `head`).
- `vendor/` — three r180 (module + core), GLTFLoader, DRACOLoader + wasm, BufferGeometryUtils,
  SkeletonUtils. All from the glorp/robits repos.
- `tools/` — `syntax.mjs` (the gate), `bake.mjs`.

## Landmines

- **Names are sanitised by GLTFLoader**: `road_a_02.001` arrives as `road_a_02001`,
  `travel agency` as `travel_agency`. Every category test in `buildCity` is a prefix regex.
- **Cars**: local −Z is up, local Y is the length; `CAR_FWD` says which end is the nose.
  Mirrored placements (scale −1) get their heading from `matrixWorld`, not the quaternion.
- **Heightmap is 2D**: one height per metre cell (max of all walkable surfaces), so nothing
  can be walked *under*. Buildings, trees, fences, props and cars are axis-aligned boxes;
  a box top within `step` of the feet is a floor (that is how roofs and curbs work).
- **Forward is `(sin h, cos h)`**, right is `(-fz, fx)`. Colin faces +Z in his file.
- Tunables live in `MOVE`, `SK8`, `CAM`, `TOON`, `LIGHT`, `POST` at the top; all exposed on
  `window.city` for the console.
