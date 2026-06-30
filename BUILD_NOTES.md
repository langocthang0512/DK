# Build Notes

Version: `v1.3-ui`

Date: 2026-06-30

## Scope

Playable v1.3 UI build for DK.

Content is frozen for this build. No map, enemy, trap, boss, player, combat, balance, or pacing changes were added during this UI patch.

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

## Release Notes

- Strict UI implementation patch only.
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
