# Build Notes

Version: `v1.0-final-test`

Date: 2026-06-30

## Scope

Final playable test build for DK.

Content is frozen for this build. No new assets, visual redesigns, animation replacements, or gameplay redesigns were added during the final validation pass.

## Included Content

- Map 1: Green Start
- Map 2: Ruin Crossing
- Map 3: Final Ascent
- Final Boss Arena

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
- Production preview: loaded at `http://127.0.0.1:4173/`
- Browser console errors: none observed during preview load
- Required approved asset files: present
- Production output: `dist/index.html` present

## Release Notes

- Production boot starts at Map 1.
- Map flow is Map 1 -> Map 2 -> Map 3 -> Final Boss.
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
