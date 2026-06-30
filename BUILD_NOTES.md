# Build Notes

Version: `v1.3.3-release`

Date: 2026-07-01

## Scope

Playable v1.3.3 release build for DK.

This release is built from the latest approved local project state after the v1.3.3 local QA and bugfix pass.

## Included Content

- Map 1: Green Start
- Map 2: Ruin Crossing
- Map 3: Final Ascent
- Map 4: Final Boss Arena

Approved content used:

- Player
- Ground
- Floating Platform
- Snake
- Hyena
- Scorpio
- Vulture
- Trap_Spike
- Trap_Exe
- Boss
- Main Menu
- Pause Menu
- Ending screen
- Tutorial text
- Enemy and boss HP bars
- Dragon Knight HUD
- Camera, combat, movement, death, fade, and scene transitions

## Validation Commands

```bash
npm run lint
npm run typecheck
npm run build
```

Final validation status:

- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm run build`: passed
- Production preview: loaded at `http://127.0.0.1:4173/` with HTTP 200
- Required approved asset files: present
- Production output: `dist/index.html` present
- v1.3.3 held-movement attack launch patch: lint, typecheck, and production build passed locally
- v1.3.3 release build: lint, typecheck, and production build passed locally
- v1.3.2 held-movement attack launch patch: lint, typecheck, and production build passed locally
- v1.3.1 combat launch patch: lint, typecheck, and production build passed locally

## Release Notes

- Strict final local QA pass only.
- Critical local bugfix pass for intermittent enemy/boss combat launch.
- Critical local bugfix pass for held-movement attack launch reproduction.
- Critical local bugfix pass for the remaining held-movement attack launch reproduction.
- Successful attacks no longer change Arcade physics world `timeScale`; the hit-stop hook now only refreshes the combat stability guard so held movement cannot desync physics integration.
- Enemy visual ground anchoring was raised slightly to align enemy feet with the approved player stance.
- Root cause, fix, and regression notes are documented in `docs/combat-launch-v1.3.3-local-test.md`.
- Player attack state now expires from a fixed attack window instead of relying on an animation-complete callback that can be interrupted by movement, hit, fall, or landing transitions.
- Root cause, fix, and regression notes are documented in `docs/combat-launch-v1.3.2-local-test.md`.
- Enemy and boss combat damage now uses hit animation feedback without movement impulse.
- Added a short combat-only player physics guard to clamp abnormal one-frame displacement spikes during enemy/boss contact and attack timing.
- Root cause, fix, and regression notes are documented in `docs/combat-launch-v1.3.1-local-test.md`.
- Completed systematic code, asset, scene flow, UI, combat, enemy, trap, boss, and build audit.
- Fixed a UI audio resource lifecycle issue by closing short-lived WebAudio contexts after menu tones.
- Revalidated local build output and complete scene flow.
- Strict local test patch only.
- Added the visible `J to Attack` tutorial prompt in Map 1 with matching pixel key illustration style.
- Connected existing enemy attack animations to player damage windows for Snake, Hyena, Scorpio, and Vulture.
- Fixed enemy and boss combat hit response to avoid abnormal launch, flying, sliding, teleporting, and map skipping.
- Added more Map 1, Map 2, and Map 3 traversal height variation while preserving enemy counts and progression.
- Enemy attack damage was updated locally: Snake 5, Hyena 10, Scorpio 10, Vulture 10.
- Enemy and boss hit knockback were reduced to very small pushback values.
- All final-map enemies were moved to ground-only placements.
- Map 1, Map 2, and Map 3 received additional traversal platforms to reduce empty space.
- Map 1 tutorial now shows Arrow Keys to Move, Up Arrow to Jump, and J to Attack with simple key illustrations.
- Added Main Menu with START, existing environment background, reference-style title, and clickable box button.
- Added Pause Menu with dark overlay, RESUME, MAIN MENU, pointer support, and keyboard support.
- Added Ending screen after final victory with YOU ARE THE LEGENDS and MAIN MENU.
- Added shared pixel UI button styling with idle, hover, pressed, and keyboard focus states.
- Player visual grounding was lowered to match approved enemy foot contact.
- Enemy and boss HP bars were moved closer to sprite heads.
- Floating-platform enemy foot anchoring was tightened.
- Floating-platform Spike traps remain centered on their platform surface.
- Spike trap damage remains limited to once per emergence cycle and is constrained to the visible hitbox.
- Spike trap idle warning tips now emerge from the surface instead of floating above it.
- Enemies were removed from floating platforms that contain Spike traps without reducing enemy totals.
- Floating platform enemies are restricted to Snake, Scorpio, and Vulture.
- Hyena placements are ground-only.
- Spike trap hitboxes were tightened to the visible spike geometry.
- Floating platform enemy patrols are clamped to platform-safe bounds.
- Production boot starts at Main Menu.
- Map flow is Main Menu -> Map 1 -> Map 2 -> Map 3 -> Map 4 -> Ending.
- Map 4 is a dedicated boss-only scene.
- Maps 1-3 were redesigned for dense roughly 90-second pacing.
- Enemy, trap, and floating platform density were increased using approved content only.
- Enemies now appear on ground, on floating platforms, near traps, and between platform transitions.
- Trap_Exe placements are paired under floating platforms.
- Trap_Spike can trigger immediate damage as spikes emerge.
- Enemy and boss HP bars were added.
- Permanent Dragon Knight HUD was added.
- Boss remains tuned for the roughly 120-second final boss target.
- Player death plays the approved death animation, fades, and restarts the current map.
- Final boss victory opens the Ending screen.

## Deployment

Build command:

```bash
npm run build
```

Output directory:

```bash
dist
```
