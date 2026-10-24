# AGENTS.md — read this first

Instructions for any AI assistant (Claude, Cursor, Codex, Copilot, …) working on this repo.
The owner switches between AI accounts and tools, so **this file + `docs/PROGRESS.md` are the shared memory**. Read both (and `docs/GAME-DESIGN.md`, the locked v2 design) before changing anything, and update `docs/PROGRESS.md` before you finish.

## What this is

**3D Car Run** — a mobile-first Western desert 3D racing runner for the browser (H5), by Xwave Global.
Swipe left/right to change lanes, up to jump, down to dive under. Desert places (Endless rank road +
Outlaw Rush), power-ups, missions, garage, shop, leaderboards, the 3-minute **Gold Rush** bonus run,
rewarded ads. It was made at v1.0.0 from the Sky Roadster v4.6.1 code: the gameplay architecture is the
same, the world / UI / items / VFX / audio are new.

- Stack: **Three.js 0.169 · TypeScript (strict) · Vite 5**. No runtime CDNs — models, textures and sounds are procedural; the Western fonts (Rye, Alfa Slab One, OFL) are bundled in `src/assets/fonts/`.
- Current version: see `const VERSION` in `src/Game.ts`.
- Full feature docs and per-version changelog: `README.md`. v1.0.0 transformation report: `docs/carrun-v1/README.md`.
- The owner's art direction (reference images) and the master prompt: `assets-src/reference/`.

## Commands

```bash
npm install
npm run dev            # http://localhost:5173 (also on LAN for phone testing)
npm run typecheck
npm test               # fairness + difficulty + air-lane + EXP calibration + rank-phase + bonus + server-rule tests (Node 22+)
npm run build          # dist/ (multi-file static build)
npm run build:single   # dist/index.html, everything inlined (one shareable file)
node scripts/build-esbuild.mjs [--single]   # fallback build without Vite
```

Before committing a gameplay change: `npm run typecheck && npm test` must pass.

## Architecture (short)

```
src/config.ts        ALL tuning numbers (lanes, heights, timings, speed, scoring, fairness budgets)
src/Game.ts          state machine & orchestration (menu → countdown → run → crash → game over)
src/gameplay/        PURE LOGIC, no Three.js, runs in Node (tests import it directly)
src/render/          Three.js views — read-only consumers of gameplay state
src/render/western/  v1.0.0 Western world: atlas.ts (one procedural texture atlas), kit.ts (parts → one baked geometry),
                     PropField.ts (instanced scrolling props), props.ts (catalogue), scenes.ts (one builder per place),
                     looks.ts (sky / fog / light, road style, readability, tyre dust), obstacles.ts (Western obstacle looks)
src/western/         v1.0.0 pure data: themes.ts (world id → place name / scene), items.ts (item & special identities)
src/render/car/      v4 3D car: glbParse.ts (own GLB reader), MeshCar.ts (wheels, sprung body, pop-up spoiler, nitro, dive pose), CarFx.ts (shield aura, ghost / pickup edge light, crash shards), carMotion.ts (pure, tested), x1Textures.ts
src/render/DebugCollision.ts  ?debug=collision overlay (visual bounds vs hitboxes; dev only)
src/render/roadSurface.ts     v4.2 procedural road tile (pure data, tested in Node) → Track.ts DataTextures; envFx.ts: wrapZ + far fade (no popping)
                     graphics presets LOW / MEDIUM / HIGH: GRAPHICS in config.ts (Renderer, Scenery.setQuality, Track.setQuality)
                     cameras: CAMERA presets (low / balanced / high) + CAMERA.home in config.ts, used by render/CameraRig.ts
scripts/car/         X1 model builder (build-x1.mjs [--detail=master] → src/assets/models/xwave-x1.glb / assets-src/x1/xwave-x1-master.glb), preview shots (preview-x1.mjs),
                     studio + reference matching (studio-x1.mjs, compare/run.sh), real gameplay camera (game-camera.ts) and states (gameplay-states.mjs)
src/core/perf.ts     ?perf=1 frame-time recorder (scripts/perf/profile.mjs = desktop/SwiftShader baseline)
src/ui/              DOM overlay UI, ui.css, i18n.ts (EN/FR/JA/PT-BR/DE/ES), icons, avatars
src/meta/            shop, rank, daily, events, leaderboard; Bonus.ts (event schedule) + GoldRush.ts (3-min run timer / payout)
src/net/PlayerStore  local (default) or remote player store (?api=…)
src/net/Cloud.ts     accounts (guest / email / Google / Apple) + cloud save + verified run reports (CLOUD.api)
src/ads/Ads.ts       rewarded + interstitial ads
server/              game server: accounts, cloud save, verified EXP, boards (index.mjs + core.mjs + schema.sql)
builds/              prebuilt single-file HTML snapshots (playable by opening the file)
```

## Rules — do not break these

1. **Fairness**: obstacle hitboxes and pass-heights live ONLY in `src/gameplay/ObstacleRules.ts`. Runtime collision and the spawner both read it. The spawner must never produce an unavoidable row. If you touch Spawner/Fairness/ObstacleRules/Player, run `npm test`.
2. **`gameplay/` stays free of Three.js and the DOM** so tests run in Node.
3. If you change `HEIGHT` / `CAR_HALF` in `config.ts`, keep `ObstacleRules.ts` in sync.
4. Tuning goes in `config.ts`, not as magic numbers in code.
5. New UI text: add it to `src/ui/i18n.ts` for all languages (English fallback is OK for dynamic sentences).
6. Mobile first: every panel must fit a 375×640 screen without scrolling. Target 60 FPS on phones.
7. Saves are in `localStorage` via `src/core/Save.ts` — don't break old saves; migrate fields instead.
8. Never trust the client for EXP / rank: the server re-computes EXP from each run (`server/core.mjs`). If you change EXP rates, ranks or road multipliers in `config.ts`, update `server/core.mjs` too (`npm test` checks).

## Rules added in v1.0.0

9. **Gold Rush** = 180 s of active gameplay, credited once per run (`src/meta/GoldRush.ts`, `tests/goldrush.test.ts`). Don't let boosters, rewards, pause, ads or the device clock change it; keep the entry rules (hourly, 30 min, 3 plays) unless the owner says otherwise.
10. **Persistent ids stay**: save key `xwave-sky-rush-v1`, cloud keys, `window.__xwave`, API paths, leaderboard seeds, the GLB `xwave-x1.glb` keep their old names on purpose (old saves and the server keep working). Rename only player-facing text.
11. **Western look**: new props / obstacles use the shared atlas material (`src/render/western/`), keep their inner edge off the road (PropField `clear`) and keep obstacle silhouettes inside the hitbox of `ObstacleRules.ts`.

## Workflow

- **Branches:**
  - `main` = **3D Car Run** (v1.x). Always playable — the owner's PC follows it.
  - `archive/sky-roadster-v4.6.1` = the original Sky Roadster v4.6.1 code this game started from. Frozen; never merge it into `main`.
- Big or risky work → a branch (`feat/…`, `fix/…`), merge into `main` when it works.
- Small, focused commits with clear messages (e.g. `feat: new place Silver Mine`, `fix: Gold Rush timer on revive`).
- When you bump the version: update `VERSION` in `src/Game.ts`, add a changelog section to `README.md`.
- At the end of every session: update `docs/PROGRESS.md` (what changed, what's half-done, what's next).
- The owner runs `CarRun3D-Dev.bat` on Windows: localhost auto-pulls `main` every 20 s, so **every push to `main` goes live on their PC** — push only playable code to `main`.
- Optional snapshot for sharing: `npm run build:single` then copy `dist/index.html` to `builds/3d-car-run-vX.Y.Z.html`.
- Cloud sessions without npm access: vendor `three` + `@types/three` r169 from GitHub into `node_modules/`, link the preinstalled esbuild, then `node scripts/build-esbuild.mjs` (see `docs/carrun-v1/README.md`).
