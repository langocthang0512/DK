# DK

DK is a web-based game project foundation built with Phaser, TypeScript, Vite, npm, Vercel, and GitHub Actions.

This repository currently contains architecture and development environment setup only. It intentionally does not include gameplay, characters, levels, mechanics, or production assets.

## Requirements

- Node.js 20.19 or newer
- npm 10 or newer

## Quick Start

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

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

## Deployment

The project is configured for Vercel. Connect the GitHub repository in Vercel or provide `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` repository secrets to enable the included GitHub Actions deploy job.

See `docs/deployment.md` for details.
