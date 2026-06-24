# Contributing

## Branch Strategy

- `main` is the production branch.
- `develop` is the integration branch.
- `feature/*` branches are used for focused work and should merge into `develop`.

## Development Flow

1. Create a branch from `develop`.
2. Make a focused change.
3. Run validation locally.
4. Open a pull request into `develop`.
5. Promote `develop` into `main` when a release is ready.

## Local Validation

```bash
npm run typecheck
npm run lint
npm run build
```

## Code Style

- TypeScript is strict.
- ESLint must pass with zero warnings.
- Prettier owns formatting.
- Keep gameplay implementation out of architecture-only changes.
