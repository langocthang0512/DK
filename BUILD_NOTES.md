# Build Notes

Version: `v1.2.1-bugfix`

Date: 2026-06-30

## Scope

Playable v1.2.1 bugfix build for DK.

Content is frozen for this build. No new assets, visual redesigns, animation replacements, gameplay redesigns, balance changes, object count changes, or map flow changes were added during this bugfix patch.

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

- Strict bugfix patch only.
- Enemy and boss HP bars were moved closer to sprite heads.
- Floating-platform enemy foot anchoring was corrected.
- Floating-platform Spike traps were centered on their platform surface.
- Spike trap damage was limited to once per emergence cycle.
- Spike traps now show a small idle warning tip.
- Production boot starts at Map 1.
- Map flow is Map 1 -> Map 2 -> Map 3 -> Map 4.
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
- Final boss defeat opens the victory finish state.

## Deployment

Build command:

```bash
npm run build
```

Output directory:

```bash
dist
```
