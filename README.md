# DK

DK is a web-based 2D platformer built with Phaser, TypeScript, Vite, npm, Vercel, and GitHub Actions.

Current version: `v1.1-final-test`

This build contains the frozen v1.1 final-test content: compressed Map 1, Map 2, Map 3, and the final boss arena using only approved assets, animations, controllers, collisions, and gameplay systems.

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

- Map 1: Green Start, compressed to roughly 90 seconds with tutorial, denser Snake, Spike, and platform checks
- Map 2: Ruin Crossing, compressed to roughly 90 seconds with denser Hyena, Scorpio, Trap_Exe, Spike, and mixed combat
- Map 3: Final Ascent, compressed to roughly 90 seconds with denser enemy, trap, platform, Vulture, and boss gate pacing
- Final Boss Arena: roughly 120 seconds, approved boss only, no extra enemies or hazards

Approved systems included in this final-test build:

- Player movement, double jump, attack, hit, death, fade, map restart
- Ground and floating platform collision
- Snake, Hyena, Scorpio, Vulture AI and cleanup
- Trap_Spike and Trap_Exe trigger/damage timing
- Boss movement, attacks, phases, damage reaction, death cleanup
- Tutorial text on Map 1 only
- Camera follow, look-ahead, transitions, boss arena zoom

## Deployment

The project is configured for Vercel. Connect the GitHub repository in Vercel or provide `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` repository secrets to enable the included GitHub Actions deploy job.

See `docs/deployment.md` for details.
