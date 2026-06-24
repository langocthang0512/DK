# Deployment Guide

## Vercel

The project includes `vercel.json` configured for:

- `npm ci` installs
- `npm run build` production builds
- `dist` output
- SPA routing through `index.html`
- Long-lived cache headers for hashed static assets

## GitHub Actions

The CI workflow validates pushes and pull requests to `main` and `develop`.

Production deployment can run from GitHub Actions when these repository secrets are configured:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Alternatively, connect the GitHub repository directly in the Vercel dashboard and let Vercel manage deployments.
