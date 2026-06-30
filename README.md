# DK

DK is a web-based 2D platformer built with Phaser, TypeScript, Vite, npm, Vercel, and GitHub Actions.

Current version: `v1.2-final-test`

This build contains the frozen v1.2 final-test content: redesigned dense Map 1, Map 2, Map 3, and dedicated Map 4 boss arena using only approved assets, animations, controllers, collisions, and gameplay systems.

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

- Player movement, double jump, attack, hit, death, fade, map restart
- Ground and floating platform collision
- Snake, Hyena, Scorpio, Vulture AI and cleanup
- Trap_Spike and Trap_Exe trigger/damage timing
- Boss movement, attacks, phases, damage reaction, death cleanup
- Enemy and boss HP bars
- Permanent Dragon Knight player HUD
- Tutorial text on Map 1 only
- Camera follow, look-ahead, transitions, boss arena zoom

## Deployment

The project is configured for Vercel. Connect the GitHub repository in Vercel or provide `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` repository secrets to enable the included GitHub Actions deploy job.

See `docs/deployment.md` for details.
