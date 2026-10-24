# 3D CAR RUN — FINAL MASTER PROMPT V2
## Complete Game Transformation | Western Desert Racing

You are the Lead Game Developer, Technical Artist, Game Designer and UI/UX Director for Xwave Global.

Transform the existing game into a visually and structurally distinct mobile H5 game:

**NEW GAME TITLE: 3D CAR RUN**

Use ALL attached reference images as the primary visual direction.

This is a comprehensive game transformation, not a simple reskin.

The original Sky Roadster project must remain unchanged.

---

# PHASE 1 — COMPLETE REBRANDING

Audit the entire project and replace all player-facing references to the old game.

Naming conventions:

- Sky Roadster → 3D Car Run
- SKY ROADSTER → 3D CAR RUN
- SkyRoadster → CarRun3D
- skyRoadster → carRun3D
- sky-roadster → 3d-car-run
- sky_roadster → car_run_3d

Update:

- HTML title and metadata
- Game logo
- Loading and splash screens
- Home UI
- All dialogs and notifications
- Share cards and sharing text
- Achievements and missions
- Leaderboard labels
- Game descriptions
- PWA manifest
- Asset filenames where appropriate
- Internal code references where safe
- Documentation and comments

Perform case-insensitive searches for all legacy naming variants.

Do not blindly replace save keys, backend contracts, external APIs, package identifiers or persistent storage identifiers.

Maintain backward compatibility or implement safe migration where required.

Never modify the original Sky Roadster repository or project.

---

# PHASE 2 — WESTERN DESERT ART DIRECTION

Replace the entire visual identity.

Visual style:

- Cinematic 3D realism
- Western cowboy atmosphere
- Dusty desert highways
- Red sandstone canyons
- Route 66-inspired environments
- Old wood, leather, bronze and metal UI
- Warm golden sunlight
- Atmospheric dust and sand
- Natural shadows and reflections
- Premium Western-inspired typography

Remove the old futuristic blue-neon visual language from desert UI.

The new game must look substantially different from Sky Roadster.

---

# PHASE 3 — COMPLETE TRACK REDESIGN

Redesign ALL existing race tracks and environment visuals.

Do not simply replace background images.

Rebuild the visual composition and obstacle layout of each track.

Create ten distinct environmental themes:

1. Desert Valley — open desert highways, cacti and windmills.
2. Canyon Bridge — elevated bridges, deep ravines and narrow passages.
3. Ghost Town — abandoned Western town, wooden buildings and dusty streets.
4. Train Yard — locomotives, rail crossings and cargo containers.
5. Oil Field — oil pumps, industrial trucks and machinery.
6. Rock Tunnel — illuminated tunnels, cave formations and falling rocks.
7. Ancient Ruins — stone arches, columns and desert monuments.
8. Sandstorm — reduced visibility, moving sand and dramatic weather.
9. Night Highway — moonlit desert roads, headlights and roadside lighting.
10. Coastal Cliff — rocky coastal roads, bridges and dramatic scenery.

Each environment should have:

- Unique roadside props.
- Distinct terrain and road materials.
- Different obstacle compositions.
- Environmental lighting.
- Atmospheric effects.
- Appropriate ambient audio.
- Readable lane markings.
- Optimized mobile rendering.

Preserve the existing three-lane movement system.

Preserve the approved camera and vehicle geometry.

Ensure all hazards remain visually readable and avoid unavoidable obstacle combinations.

Use deterministic obstacle-generation tests where possible.

Do not introduce new tracks as mandatory sequential levels unless the existing game already supports that structure.

---

# PHASE 4 — BONUS RUN REDESIGN

Completely redesign the existing Bonus mode.

New player-facing name:

**GOLD RUSH — 3 MIN BONUS RUN**

Core gameplay:

- Each Bonus Run lasts exactly 180 seconds of active gameplay.
- The player collects as many Coins as possible.
- Remove the previous shorter gameplay time limit.
- Do not extend or shorten the 180-second active gameplay timer through boosters or rewards.
- When the timer reaches zero, finish the run and calculate rewards.

Timer behavior:

- Starts when gameplay actually begins.
- Pauses when the game is paused.
- Resumes only when the player resumes.
- Uses elapsed active gameplay time, not an unprotected frame counter.
- Must not be bypassed through backgrounding, refresh or device clock manipulation.

Reward calculation:

- Track Coins collected during the run.
- Display the final earned amount.
- Credit Coins exactly once after successful completion.
- Prevent duplicate rewards from restart, refresh or repeated button presses.
- Preserve existing economy safeguards.

If the player crashes before 180 seconds, use the existing collision and rescue rules; do not silently grant full completion rewards.

Keep the existing Bonus entry availability, cooldowns and eligibility rules unless separately approved.

Do not introduce an unlimited number of Bonus entries.

Create dedicated screens:

- Gold Rush entry panel
- Three-minute gameplay HUD
- Timer warning at 30 seconds
- Final ten-second countdown
- Gold Rush result screen
- Coin collection summary

Important distinction:

**Three minutes is the fixed duration of one Bonus Run, not unlimited access to Bonus Runs.**

---

# PHASE 5 — NEW ITEMS & COLLECTIBLES

Replace the visual identity and player-facing names of the existing items.

Proposed naming:

| Existing Function | New Name |
|---|---|
| Nitro / Speed Boost | Dust Storm Nitro |
| Shield | Sheriff Guard |
| Magnet | Gold Magnet |
| Air Dash | Canyon Dash |
| Double Coins | Gold Fever |
| Temporary Protection | Ghost Rider |
| Jump Booster | Canyon Launcher |
| Coin Chest | Outlaw Treasure |
| Emergency Rescue | Last Stand |

For every existing item:

- Create a distinct 3D icon.
- Create a matching pickup object.
- Create a unique activation animation.
- Create an appropriate sound effect.
- Update HUD representation.
- Update item descriptions.
- Update reward and inventory screens.

Maintain existing item mechanics, duration, cooldowns and balancing unless explicitly changed.

Do not create duplicate abilities simply because the reference images show additional concepts.

Only implement new mechanics after checking compatibility with the existing game.

---

# PHASE 6 — SPECIAL VEHICLE ABILITIES

Redesign the presentation of existing special abilities.

Use Western-inspired names and VFX.

Suggested identities:

- Bull Rush — aggressive forward-clearing visual theme.
- Sandstorm Escape — dust vortex and emergency evasion.
- Canyon Air Dash — cinematic two-lane airborne maneuver.
- Last Stand Rescue — emergency survival activation.
- Gold Fever — enhanced gold-collection presentation.

These are proposed visual identities, not authorization to replace existing mechanics.

Map every proposed name to an existing implemented ability before making changes.

Preserve the approved Roadster, Hyper and SOS rescue behavior.

Preserve existing activation conditions, cooldowns and resource consumption.

For Air Dash:

- Maintain the approved two-lane left/right behavior.
- Keep animation direction consistent with player input.
- Preserve collision and landing safety.
- Do not allow an impossible or unintended lane transition.

For vehicle wings or aerodynamic components:

- Keep them fully closed during normal road driving.
- Open only when the existing flight mechanics require it.
- Close when landing, including during Nitro.

Do not alter finalized vehicle geometry.

---

# PHASE 7 — COMPLETE OBSTACLE REDESIGN

Create Western-themed replacements for existing obstacle assets.

Examples:

- Cargo trucks
- Logging trucks
- Trains
- Oil tankers
- Road barriers
- Wooden crates
- Falling rocks
- Oil barrels
- Broken bridge sections
- Construction machinery
- Roadblocks

For each obstacle:

- Maintain correct hitboxes.
- Ensure clear silhouettes.
- Match collision behavior to its actual size.
- Optimize textures and geometry.
- Test all three lanes.
- Verify jump and flight interactions.

Create different obstacle compositions for each track.

Avoid unfair obstacle combinations.

---

# PHASE 8 — NEW VFX SYSTEM

Create a coherent Western racing effects library.

Effects:

- Tire dust
- Ground contact particles
- Sand trails
- Dusty drifting
- Nitro exhaust
- Shield activation
- Magnet attraction
- Coin collection
- Air Dash
- Landing impact
- Collision
- Emergency rescue
- Sandstorm visibility
- Gold Rush countdown

Effects must be visually distinct from Sky Roadster.

Use object pooling and quality scaling where appropriate.

Avoid excessive particles on low-end Android devices.

---

# PHASE 9 — COMPLETE UI REDESIGN

Redesign all screens:

- Home
- Loading
- Race Start
- Gameplay HUD
- Bonus Run
- Pause
- Finish
- Game Over
- Share
- Garage
- Shop
- Missions
- Leaderboard
- Rewards
- Inventory / Magic Bag
- Settings
- All dialogs

Use wood, bronze, aged metal and Western typography.

Remove the Level selector from Home.

Keep the PLAY button prominent.

Move secondary functions into a More menu where appropriate.

Preserve all functional navigation.

Ensure claimed rewards show confirmation.

Hide exhausted Entry and Launch reward buttons when no further claims are available.

Keep Share visible when it remains claimable.

Rebalance remaining buttons when another button disappears.

Automatically equip an eligible random Magic Bag item when existing rules permit it; do nothing if no eligible item exists.

Do not add unwanted glow or shadows to Home buttons.

---

# PHASE 10 — AUDIO REDESIGN

Create a distinct Western audio identity.

Examples:

- Western guitar-inspired background music.
- Desert wind.
- Engine acceleration.
- Tire skids.
- Sand impacts.
- Metallic UI clicks.
- Gold coin collection.
- Sheriff-style rank-up sound.
- Victory stingers.

Use original or properly licensed audio.

Fix audio initialization on Android and iOS.

Audio must initialize after the first permitted user interaction, without requiring Settings to be opened.

Respect mute settings and platform autoplay restrictions.

---

# PHASE 11 — PERFORMANCE & MOBILE OPTIMIZATION

Target portrait H5 and TikTok Mini Games.

Requirements:

- Responsive UI.
- Safe-area support.
- Fast initial loading.
- Efficient texture memory.
- Object pooling.
- Adaptive VFX quality.
- Stable gameplay frame rate.
- Correct touch controls.
- No invisible buttons.
- No font overflow.
- No washed-out colors on Android.
- No audio initialization regression.

Do not port to Native during this phase.

---

# PHASE 12 — GAMEPLAY & DATA PRESERVATION

Preserve:

- Three-lane controls.
- Jump and flight.
- Nitro.
- Air Dash.
- Special rescue abilities.
- Existing vehicle models.
- EXP.
- Race ranks.
- Coin economy.
- Garage upgrades.
- Missions.
- Leaderboards.
- Entry rewards.
- Launch rewards.
- Share rewards.
- Magic Bag.
- Player save data.
- Backend integration.
- Pause and resume.

Pause must remain paused until the player chooses to resume, restart or exit.

Do not let the game automatically end simply because it remains paused.

All economy changes must be reviewed for abuse and reward duplication.

---

# PHASE 13 — IMPLEMENTATION WORKFLOW

Before changing code:

1. Audit the current repository.
2. Identify the exact project being modified.
3. Inventory all existing screens and mechanics.
4. Identify all legacy branding references.
5. Map every old item and special to its new identity.
6. Document existing Bonus mode rules.
7. Review the track-generation architecture.
8. Identify performance and compatibility risks.

Then implement in this order:

1. Branding migration.
2. Shared Western UI design system.
3. New track visuals and obstacle compositions.
4. Gold Rush Bonus Run.
5. Items and Specials visual redesign.
6. VFX and audio.
7. Remaining screens.
8. Responsive layout and performance optimization.
9. Complete regression testing.

Use small, reviewable commits.

Do not overwrite unrelated changes.

---

# PHASE 14 — ACCEPTANCE TESTS

Verify:

- No old player-facing game title remains.
- Original Sky Roadster project is unchanged.
- All redesigned tracks render correctly.
- Every lane has fair obstacle combinations.
- Existing movement mechanics still work.
- Bonus Run active timer is exactly 180 seconds.
- Pause does not consume active Bonus time.
- Rewards are credited once.
- Bonus entry limits remain enforced.
- Item names and icons are consistent.
- Special abilities retain correct behavior.
- Garage and upgrades remain functional.
- Share, Entry and Launch rewards work.
- Android and iOS audio initialization works.
- Mobile UI fits common portrait resolutions.
- No missing assets or runtime errors.
- Performance remains acceptable.

Report any tests that could not be executed.

---

# FINAL DELIVERABLE

Provide:

1. Full list of changed files.
2. Branding migration report.
3. Complete track redesign inventory.
4. Bonus Run implementation details.
5. Item and Special mapping table.
6. UI screen completion status.
7. New asset inventory.
8. Performance results.
9. Regression test results.
10. Screenshots of the implemented game.
11. Remaining issues and risks.

**Final requirement:**

3D CAR RUN must feel like a new Western desert racing game, with a completely different visual world, redesigned tracks, distinct items, specials, VFX, audio and UI.

Preserve the proven gameplay architecture while delivering a substantially different player experience.

Do not claim completion without verifying the implementation.