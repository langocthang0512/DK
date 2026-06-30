# DK

DK is a web-based 2D platformer built with Phaser, TypeScript, Vite, npm, Vercel, and GitHub Actions.

Current version: `v1.3.3-release`

This release build contains the v1.3.3 complete game flow: Main Menu -> Map 1 -> Map 2 -> Map 3 -> Map 4 -> Ending using only approved assets, animations, controllers, collisions, and gameplay systems.

## Requirements

- Node.js 20.19 or newer
- npm 10 or newer

## Quick Start

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Final Test Build

```bash
npm run build
npm run preview
```

The production build is emitted to `dist/`.

## Scripts

```bash
npm run dev          # Start the Vite dev server with hot reload
npm run build        # Type-check and create a production build
npm run preview      # Preview the production build locally
npm run lint         # Run ESLint
npm run format       # Format the project with Prettier
npm run typecheck    # Run TypeScript without emitting files
```

## Architecture

Source code lives in `src/` and is organized around engine infrastructure:

- `src/core` - Phaser bootstrapping, scene registry, engine services
- `src/game` - Game instance creation and runtime composition
- `src/scenes` - Scene classes and scene keys
- `src/systems` - Cross-scene runtime systems
- `src/assets` - Asset manifests and loader abstraction
- `src/ui` - UI layer entry points
- `src/components` - Reusable UI components
- `src/hooks` - Frontend hooks and lifecycle helpers
- `src/utils` - Shared utilities
- `src/config` - Environment and Phaser configuration
- `src/constants` - Shared constants
- `src/services` - Platform services such as save storage

## Gameplay Content

- Map 1: Green Start, roughly 90 seconds with tutorial, platform combat, Snake, Hyena, Scorpio, Spike, and Trap_Exe checks
- Map 2: Ruin Crossing, roughly 90 seconds with denser Hyena, Scorpio, Snake, Trap_Exe, Spike, and mixed platform combat
- Map 3: Final Ascent, roughly 90 seconds with vertical combat, Vulture, mixed enemies, dense traps, and Map 4 gate
- Map 4: dedicated final boss arena, roughly 120 seconds, approved boss only, no extra enemies or hazards

Approved systems included in this final-test build:

- Main Menu, Pause Menu, and Ending screen
- Player movement, double jump, attack, hit, death, fade, map restart
- Ground and floating platform collision
- Snake, Hyena, Scorpio, Vulture AI and cleanup
- Trap_Spike and Trap_Exe trigger/damage timing
- Boss movement, attacks, phases, damage reaction, death cleanup
- Enemy and boss HP bars
- Permanent Dragon Knight player HUD
- Tutorial text on Map 1 only
- Camera follow, look-ahead, transitions, boss arena zoom

Bugfix patch v1.2.1:

- Enemy and boss HP bars sit closer to sprite heads.
- Floating-platform enemy feet are anchored closer to platform surfaces.
- Floating-platform Spike traps are centered on their platform.
- Spike traps can damage only once per emergence cycle.
- Idle Spike traps show a small visible warning tip.

Bugfix patch v1.2.2:

- Player visual grounding was lowered to match approved enemy foot contact.
- Enemy and boss HP bars were anchored closer to sprite heads.
- Floating-platform enemy foot anchoring was tightened.
- Floating-platform Spike traps remain centered and surface-aligned.
- Spike trap damage is locked to one hit per emergence cycle and constrained to the visible hitbox.
- Idle Spike warning tips now emerge from the surface instead of floating above it.

Change patch v1.2.3:

- Removed enemy overlap from floating platforms that contain Spike traps while preserving enemy totals.
- Restricted floating platform enemy types to Snake, Scorpio, and Vulture.
- Kept Hyena on ground-only placements.
- Tightened Spike trap hitboxes to visible spike geometry.
- Clamped floating platform enemy patrols to platform-safe bounds.

UI patch v1.3:

- Added a reference-matched Main Menu with START.
- Added an in-game Pause Menu with RESUME and MAIN MENU.
- Added an Ending screen after final victory with MAIN MENU.
- Added keyboard and pointer support for clickable box UI buttons.

Local test patch v1.2.4:

- Updated enemy attack damage locally: Snake 5, Hyena 10, Scorpio 10, Vulture 10.
- Reduced enemy and boss hit knockback.
- Moved all final-map enemies to ground-only placements.
- Increased Map 1, Map 2, and Map 3 traversal platform density.
- Replaced Map 1 tutorial prompts with readable movement, jump, and attack instructions plus key illustrations.

Local test patch v1.2.5:

- Kept the full local-only game flow and added the missing visible `J to Attack` tutorial prompt.
- Connected enemy attack animation windows to player damage for Snake, Hyena, Scorpio, and Vulture.
- Reduced combat hit response to very small controlled pushback with no vertical launch.
- Added more Map 1, Map 2, and Map 3 traversal variation while preserving enemy counts.

Local QA patch v1.3.0:

- Completed a local-only QA audit and bugfix pass.
- Closed menu UI audio contexts after short tones to avoid browser audio resource buildup.
- Revalidated full local flow, scene transitions, enemy attacks, tutorial, pause, build output, and local preview.

## Deployment

The project is configured for Vercel. Connect the GitHub repository in Vercel or provide `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` repository secrets to enable the included GitHub Actions deploy job.

See `docs/deployment.md` for details.
