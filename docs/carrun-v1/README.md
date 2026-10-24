# 3D Car Run v1.0.0 — transformation report

From the Sky Roadster v4.6.1 code (branch `feature/sky-roadster-v4.6-big-update`, commit `8725dfa`) to a new
Western desert racing game. The original is kept untouched on `archive/sky-roadster-v4.6.1` (this repo) and
in its own repository (xwaveglobal/sky-roadster — never modified).

Owner request (2026-10-24): make a new repo from 4.6.1, apply the FINAL MASTER PROMPT V2 (copy in
`assets-src/reference/MASTER-PROMPT-V2.md`, reference art next to it), call the result **v1**, put it on
`main`, keep the original on another branch.

## 1. Approach (Phase 13 audit → implementation order)

The audit found: the 20 old courses are retired (every run is Endless, Outlaw Rush or a Bonus event), the
look of a run is driven by its **world id** (16 worlds), obstacle hitboxes live only in
`src/gameplay/ObstacleRules.ts`, Bonus was a 5-minute *road* (distance, not time), item names were hard-coded
English in `Game.ts` / `UI.ts`, the display font came from a CDN, and several storage ids still carry the old
XWAVE name.

Decisions that follow from it:
- **Keep every gameplay id and rule.** The 16 world ids, the Endless ladder order, the per-world obstacle
  weights, the fairness model and all hitboxes are unchanged; each world id simply gets a Western place.
  `npm test` (fairness, difficulty, air lanes, EXP, phases, server rules, Air Dash…) stays green.
- **Persistent identifiers stay** (save key `xwave-sky-rush-v1`, cloud keys, `window.__xwave`, API paths,
  leaderboard seeds, `xwave-x1.glb`): old saves, the server and the boards keep working.
- **Mobile cost:** every roadside prop type is ONE instanced draw call on ONE shared atlas material.

Order: branding → UI design system → worlds / road / obstacles / pickups → Gold Rush → items & specials →
VFX & audio → remaining screens → docs / version → regression QA → merge to `main`.

## 2. Branding migration

| Where | Before | After |
|---|---|---|
| `<title>`, meta, PWA manifest, app name | Sky Roadster | 3D Car Run |
| Logo | `sky-roadster-logo.webp` (chrome neon) | `car-run-logo.webp` — wood planks, rope, steel "3D", gold "CAR RUN", hat, longhorns (`scripts/brand/make-brand.mjs`, SVG → webp) |
| App icons (`public/icons/*`, `app-icon.webp`) | neon car | the owner's 3D Car Run icon art |
| Loading screen | neon city art | the owner's key art (Western home, UI cut off) |
| Fonts | Exo 2 from Google Fonts (CDN) | Rye + Alfa Slab One, bundled woff subsets (OFL texts included) |
| Share card / share texts / invite / rate / add-to-home popups | "Sky Roadster" | "3D Car Run", desert sunset card |
| Server sign-in page + mail subject / body | Sky Roadster | 3D Car Run |
| Track names (retired courses, tutorial, cups) | Future City, Neon Tunnel, XWAVE Megacity… | Desert Valley, Rock Tunnel, Ghost Town… |
| Mega Rush (track 2) | Mega Rush | Outlaw Rush |
| Car names | "XWAVE Zenith"… | "Zenith"… (models and colourways unchanged) |
| XWAVE Pass (hidden) | XWAVE Pass | Gold Pass |
| package.json, dev launcher | xwave-flying-run, `SkyRoadster-Dev.bat` | 3d-car-run, `CarRun3D-Dev.bat` (clones / pulls xwaveglobal/3d-car-run) |

Deliberately **not** renamed (backend / storage contracts): `xwave-sky-rush-v1`, `xwave-cloud-auth`,
`xwave-cloud-runs`, `xwave-db-v1`, `window.XWAVE_API`, `window.__xwave`, `xw-signin` / `xw_auth`,
`/auth/*`, `/save`, `/runs`, `/players`, `/boards`, SQL tables, `xwave-*` sample-board seeds, shop SKUs
(`xwave_pass`), asset id `vehicle.xwave`, `xwave-x1.glb`. The car's rear badge texture is part of the approved
X1 model and was left as it is. "XWAVE" as publisher name (Xwave Global) is not a game title.

## 3. Places (track redesign inventory)

Each place is built in `src/render/western/scenes.ts` from the prop catalogue (`props.ts`), with its own sky,
fog and light (`looks.ts`), road dressing (`ROAD_STYLE`), readability profile and tyre-dust colour.

| World id | Place | Theme | What you see |
|---|---|---|---|
| city | **Desert Valley** | 1 | sand flats, saguaros, prickly pears, Joshua trees, turning farm windmills, water tower, Route 66 shields, billboards, a gas station, red mesas |
| cloud | **Canyon Bridge** | 2 | the road on stone piers over a 60 m ravine, canyon walls, hoodoos, stone arches |
| mega | **Ghost Town** | 3 | dusty main street of false-front saloons, hotels, bank, sheriff, general store, barrels, wagons, dead trees, tumbleweeds; stockade gates |
| harbor | **Train Yard** | 4 | ballast + rails, steam locomotives, box / tank cars, container stacks, signal posts with crossbucks, railroad-crossing gantries |
| solar | **Oil Field** | 5 | cracked earth, rocking pump jacks, timber derricks, PETROLEUM tanks, power poles, wrecks |
| tunnel | **Rock Tunnel** | 6 | lantern-lit mine: rock walls and ceiling, timber frames, mine carts (closed, no sky) |
| belt | **Ancient Ruins** | 7 | columns, stone arches, broken walls, obelisks, palms, falling boulders |
| storm | **Sandstorm** | 8 | orange whiteout (fog 22–175 m), blowing sand streaks, dust, dunes, dead trees, wrecks |
| space | **Night Highway** | 9 | moonlit blue desert, stars, a moon, lit motel and motel sign, warm street lamps, distant town lights |
| ice | **Coastal Cliff** | 10 | the sea 16 m below on the right, sea stacks, a lighthouse, cliffs and palms on the left, stone piers |
| canyon | Red Rock Canyon | extra | sunset between tall striated sandstone walls, hoodoos, falling-rock signs |
| volcano | Badlands | extra | dusk, burning flare stacks, embers, dead trees, derricks |
| desert | Gold Canyon (Gold Rush) | — | golden hour, mine entrances, ore carts, wagons |
| forest | Pine Ridge (Gold Rush) | — | pines, log cabins, fences |
| country | Prairie Ranch (Gold Rush) | — | red barns, hay bales, windmills, fences, cows |
| sea | Sunset Coast (Gold Rush) | — | the coast at sunset |

The 12-world Endless ladder (unchanged order) therefore reads: Desert Valley → Train Yard → Canyon Bridge →
Oil Field → Rock Tunnel → Red Rock Canyon → Night Highway → Ancient Ruins → Ghost Town → Sandstorm →
Badlands → Coastal Cliff. Outlaw Rush cycles Ghost Town / Night Highway / Rock Tunnel. A wooden
"WELCOME TO <place>" gate announces each change. Tracks are not sequential levels (the game never had that).

**Road** (`roadSurface.ts`, `Track.ts`): sun-bleached warm asphalt, warm-white dashes, Route-66 yellow edge
lines, dusty sand drifting onto the shoulders (never into a lane centre — tested), W-beam guardrails on timber
posts, telephone poles (warm street lamps at night), stone piers on the bridges, Route 66 shields or billboards.

**Obstacles** (`western/obstacles.ts`): same hitbox and pass rules for every type; looks per place:

| Type (hitbox) | Western looks |
|---|---|
| crate (1.7 m block) | TNT crate, plank crate, oil barrels, hay bales, stone block, boulder, cargo crate |
| barrier (low) | ROAD CLOSED sawhorse, ranch fence, sleeper stack, pipeline, fallen column, log, rock ridge |
| beam (overhead, dive) | hanging saloon / GAS / MOTEL / GOLD MINE sign, mine timber frame, stone lintel, hanging container, rock slab — gold "go under" chevron |
| traffic (oncoming) | pickup trucks (4 paints); variant 4: box truck, log truck, oil tanker or stagecoach / hay wagon |
| ring (coin ×2) | golden horseshoe (open bottom), collect burst |
| platform (sliding) | railroad handcar, hay wagon, runaway ore cart |
| asteroid | rolling sandstone boulder |
| laser (per lane) | railroad-crossing gantry: striped booms (hop), hanging planks (dive), plank wall (blocked), green arrow (open) |
| gate (one door) | log stockade with swinging saloon doors and watchtowers |

## 4. GOLD RUSH — 3 MIN BONUS RUN (implementation)

`src/meta/GoldRush.ts` (pure, `tests/goldrush.test.ts`):
- `GoldRushTimer.step(rawDt, activeState)`: advances only in `run` / `respawn`, by the frame's real elapsed
  time clamped to 1/20 s. Paused, ads, crash animation, revive offer → frozen. Background tab → the game
  auto-pauses. Never reads `Date.now()`; slow motion and boosters don't touch it. Exactly 180.000 s at 60 /
  120 fps (180.03 at 30 fps: one frame).
- Events: one 30-second warning (banner + red pulsing timer + sound), countdown 10 → 1 (big digits + ticks),
  one `end` → `TIME'S UP!` → result.
- `goldRushPayout` + `creditOnce(save.goldRushPaid, runId)`: completion = coins + speed bonus + finish bonus
  (300 × speed-level coin multiplier, as before), credited **once** per run id (`eventKey:playNumber`). An
  early end (crash / quit) pays the collected coins + speed bonus once, never the completion bonus. A refresh
  mid-run pays nothing (the play was counted at its start, as before).
- Entry rules unchanged (`src/meta/Bonus.ts`): hourly, open 30 min, 3 plays per event; collisions, hearts,
  revive offer and the last-chance special work as in every run.
- The road is built longer than 180 s at full speed with Nitro the whole way (`goldRushRoadLength`); tunnels
  and section names sit inside the stretch a run normally covers (`Course.span`).
- Screens: Gold Rush entry panel (3:00 · finish bonus · plays left), HUD timer plate with progress bar,
  final countdown, `GOLD RUSH COMPLETE!` result with the coin summary (`GOLD RUSH OVER` after a crash).

Real-build check (Chromium / SwiftShader): payout 606 coins once; a second `showFinish` paid 0; the clock held
0.10 s through 8 s of pause and through a hidden tab.

## 5. Items & specials (mapping onto existing abilities — nothing new added)

| Existing (id) | New name | Mechanic (unchanged) | Pickup / icon |
|---|---|---|---|
| shield | **Sheriff Guard** | blocks 3 hits, 20 s | tin star badge |
| magnet | **Gold Magnet** | coins fly to you, 11 s | red horseshoe magnet + nugget |
| turbo | **Dust Storm Nitro** | ×1.55 speed, smashes obstacles (Bull Rush splinters) | nitro bottle, orange exhaust |
| dash | **Canyon Dash** (Canyon Air Dash) | 2-lane left/right airborne move, safe landing | sunset double chevron |
| ring pass (coins ×2, 8 s) | **Gold Fever** | coins ×2 | golden horseshoe hoop |
| ghost (Gold Rush showcase) | **Ghost Rider** | rides through everything | translucent cowboy hat |
| super | **Canyon Launcher** | the Roadster Jump (HUD: LAUNCHER) | launch ramp |
| hyper | **Eagle Jump** | the HYPER JUMP (HUD: EAGLE) | gold ramp + ring |
| escape | **Last Stand** | the SOS escape (HUD: RESCUE), sandstorm-vortex colours | up arrow in dust rings |
| last-chance auto special | **LAST STAND RESCUE** | fires the carried special on a lethal hit | toast |
| mystery | **Outlaw Treasure** | random reward | treasure chest |
| double (EXP ×2) | **Double Bounty** | EXP ×2 (not in the prompt table) | WANTED-style poster ×2 |
| life | Extra Life | +1 heart | heart |
| wall / rail / tunnel | Canyon Wall Ride / Rail Rider / Mine Runner | Gold Rush showcases | labelled badges |

Coins are gold with a raised star (3D coins, HUD icon, popup art). Prices, durations, cooldowns, spawn
weights unchanged. Wings / spoiler behaviour and the X1 geometry are untouched.

## 6. UI screen status

| Screen | Status |
|---|---|
| Loading | key art + wooden progress bar |
| Home | wood / leather / bronze; signposts (Gold Rush, Daily, Share, Entry, Launch — Launch hides when claimed, Share stays while claimable, rails rebalance); wooden PLAY plaque; Garage / Shop / Missions; More menu; **level selector removed** |
| Race Start (was Select Track) | EASY / NORMAL / HARD + caption, Endless (Desert Valley art) and Outlaw Rush cards |
| HUD | leather score plate, wooden pills, bronze buttons, LAUNCHER / RESCUE buttons, Gold Rush timer |
| Pause, Game over, Finish, post-race rank board | wood panels, gold headline, wood nav buttons |
| Gold Rush entry / HUD / result | new |
| Garage, Shop, Missions, Top Pilots, Daily, Saddle Bag, Profile, Settings, Account, popups | Western layer (panels, cards, tabs, switches, check-in tiles) |
| Share card | desert sunset card (canvas) |
| Class promotion, revive, tutorial | inherit the Western layer (their own colour accents kept) |

Owner rules kept: no glow / no shadows on buttons (Home included), every panel fits 375 × 640.
New labels are translated (FR / JA / PT-BR / DE / ES) in `src/ui/i18n.ts`; long dynamic sentences stay
English as before.

## 7. New assets

- `src/assets/images/car-run-logo.webp`, `app-icon.webp`, `loading.webp`, `public/icons/*` (owner art)
- `src/assets/images/tracks/*.jpg` — 10 place thumbnails cropped from the owner's gameplay sheet
- `src/assets/images/ui/{wood,wood-dark,wood-light,leather,parchment}.webp` (`scripts/brand/make-textures.mjs`)
- `src/assets/fonts/{rye,alfa-slab-one}.woff` + OFL licences
- Procedural (code, no files): the prop atlas (`western/atlas.ts`: planks, brick, stone, corrugated metal,
  saloon / hotel / bank / sheriff / store / gas / motel / gold-mine / petroleum signs, Route 66, billboard,
  crossbuck, warning signs, stripes, chevrons, TNT, hay, WANTED poster…), ground textures (`western/ground.ts`),
  60+ props, all obstacles, pickups, the ranch-gate arches, the welcome gate, the soundtrack
- Owner reference art kept for future sessions: `assets-src/reference/*.webp`

## 8. Performance

- Roadside: one InstancedMesh per prop type on one shared material (clones per fade distance share the
  program).
- Measured (real build, MEDIUM, Endless with autopilot, whole frame = scenery + road + obstacles + car + FX,
  `renderer.info`): **85–109 draw calls per frame** across the places vs **128–277** in Sky Roadster v4.6.1 on
  the same worlds (about 30–60 % fewer); triangles about the same (42 k–61 k vs 36 k–60 k). Per world
  (new / old): city 109/140 · harbor 98/144 · cloud 94/141 · solar 97/277 · canyon 88/133 · belt 98/143 ·
  mega 98/153 · storm 89/128 · volcano 85/128 · country 97/190.
- Obstacles: one baked mesh per variant on one material (the old neon set used several materials per type).
- Tyre dust: `DUST.rate` × the preset's particle density (LOW ≈ half). Sandstorm streaks / motes are one draw each.
- Bundle (esbuild, single-file assets inlined): JS 3.98 MB (was 3.56 MB: +fonts, place art, logo), CSS 0.36 MB.
- Real phones were not measured in this session (cloud, SwiftShader only) — see risks.

## 9. Regression results

- `npm run typecheck` clean; `npm test` 13/13 suites (incl. `tests/goldrush.test.ts`, 25 checks).
- Real-build regression (`scripts/qa/step065.mjs`, Chromium + SwiftShader): **68 checks, all passing**.
  The first full run had 64 ✓ / 4 ✗; the 4 were the test still expecting old names (ROADSTER AUTO, MAGIC BAG,
  XWAVE Inferno / Nexus). After updating the expectations, the affected sections (special, pause, bag,
  congrats) were re-run on the final build: 31 / 31 ✓. No page errors.
- Gold Rush in the real build (`?manual`, deterministic): pause and a hidden tab hold the clock; the 30 s warning
  and 10…1 countdown show; time's up pays coins + speed bonus + completion reward **at the banner** (saved
  before the result card); a repeated finish pays 0; **Restart from the pause menu mid-run banks the coins
  collected** (+63 for 50 coins on NORMAL) and starts the next play with a new run id.
- An independent code review found 6 issues (restart lost Gold Rush coins, completion paid 1.9 s late, tunnel
  ceiling under the HYPER / SKY ESCAPE heights, two tunnel textures scrolling backwards, stagecoach wheels
  turned 90° outside the hitbox, far props popping in) — all fixed and re-checked.

## 10. Screenshots

`docs/carrun-v1/shots/` — real build (Chromium + SwiftShader, 360 × 640 @2): `worlds.jpg` (every place),
`screens.jpg` (Garage, Shop, Missions, Top Pilots, Saddle Bag, Daily, Profile, Settings, Pause, rank board,
result), `gr*.jpg` (Gold Rush entry / HUD / countdown / result), `tunnel-normal-vs-sky-escape.jpg`.

## 11. Remaining issues & risks

- **Phone FPS / memory not measured** (no device in the cloud session). The scenery is cheaper in draw calls
  than v4.6.1, but the texture atlas is 1024² and some places have 300+ dust motes.
- **Audio**: the Western soundtrack is new procedural synthesis; it was only checked for errors in headless
  Chromium (no listening test). Audio start-up behaviour (first tap) is unchanged and re-tested.
- **Concept-art crops** are used as place thumbnails on the Race Start cards; replace with in-game renders if
  wanted.
- **Guide images** of the Canyon Launcher guide (`src/assets/images/guide/`) were re-captured from the new build.
- **Draw calls** are measured in SwiftShader (counts are exact; timings are not meaningful there).
- **Item names in other languages**: the main labels are translated; long item descriptions are English.
- Not done in this phase (by the prompt's own scope): native / TikTok port.
