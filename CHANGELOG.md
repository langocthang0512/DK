# Changelog

All notable changes to this project will be documented in this file.

## [1.2.3-change-patch] - 2026-06-30

### Changed

- Removed enemy overlap from floating platforms that contain Spike traps while preserving enemy totals.
- Restricted floating platform enemy types to Snake, Scorpio, and Vulture.
- Kept Hyena placements on ground only.
- Clamped floating platform enemy patrol behavior to platform-safe bounds.

### Fixed

- Tightened Spike trap hitboxes to visible spike geometry.

## [1.2.2-bugfix] - 2026-06-30

### Fixed

- Adjusted player visual grounding to match approved enemy foot contact.
- Moved enemy and boss HP bars closer to sprite heads.
- Tightened floating-platform enemy foot anchoring.
- Kept platform Spike traps centered and surface-aligned.
- Limited Spike trap damage to one hit per emergence cycle with hitbox-constrained damage.
- Embedded Spike trap idle warning tips into the surface.

## [0.1.0] - 2026-06-25

### Added

- Initialized Phaser, TypeScript, Vite, npm, Vercel, and GitHub Actions project foundation.
- Added engine architecture scaffolding without gameplay content.
