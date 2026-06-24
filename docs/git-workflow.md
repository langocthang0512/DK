# Git Workflow

## Branches

- `main` contains production-ready releases.
- `develop` contains integrated work for the next release.
- `feature/*` contains individual changes.

## Typical Flow

```bash
git checkout develop
git pull
git checkout -b feature/my-change
```

Open pull requests from `feature/*` into `develop`. Merge `develop` into `main` for production releases after CI passes.

## Commit Guidance

- Keep commits focused.
- Include documentation updates when behavior or setup changes.
- Do not commit `.env`, build output, or local editor state.
