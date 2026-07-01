# Changelog

All notable changes to this project will be documented in this file.

## [1.4.0-release] - 2026-07-01

### Release

- Released the latest approved local build with final Main Menu visuals and Pause Menu flow fixes.

## [1.3.3-release] - 2026-07-01

### Release

- Released the latest approved local build after v1.3.3 local QA and combat-launch bugfix validation.

## [1.3.3-local-test] - 2026-07-01

### Fixed

- Fixed the remaining held-movement attack launch path by removing Arcade physics world time scaling from successful attack hit handling.
- Raised shared enemy visual anchoring slightly so Snake, Hyena, Scorpio, and Vulture feet align better with the approved player stance.

## [1.3.2-local-test] - 2026-07-01

### Fixed

- Fixed the held-movement attack launch path by making player attack state time-bounded instead of dependent on an interruptible animation-complete callback.

## [1.3.1-local-test] - 2026-07-01

### Fixed

- Fixed intermittent player launch during enemy/boss contact and enemy attack timing by removing enemy/boss combat movement impulse and adding a combat-only physics stability guard.

## [1.3.0-local-QA] - 2026-07-01

### Fixed

- Closed short-lived menu WebAudio contexts after UI tones to avoid browser audio resource buildup.

### QA

- Added final local QA documentation and revalidated full game flow locally.

## [1.2.5-local-test] - 2026-07-01

### Changed

- Added a visible Map 1 `J to Attack` tutorial prompt with matching key illustration style.
- Connected existing enemy attack animations to local player damage windows.
- Reduced enemy and boss combat hit response to very small controlled pushback.
- Added more traversal height variation to Map 1, Map 2, and Map 3 while preserving enemy counts.

## [1.2.4-local-test] - 2026-07-01

### Changed

- Updated local enemy attack damage values: Snake 5, Hyena 10, Scorpio 10, Vulture 10.
- Reduced enemy and boss hit knockback.
- Moved all final-map enemies to ground-only placements while preserving enemy counts.
- Increased traversal platform density in Map 1, Map 2, and Map 3.
- Replaced Map 1 tutorial prompts with readable control instructions and key illustrations.

## [1.3-ui] - 2026-06-30

### Added

- Added Main Menu with START and existing environment background.
- Added Pause Menu with RESUME and MAIN MENU.
- Added Ending screen after final victory.
- Added shared pixel clickable box button styling with hover, pressed, and keyboard focus states.

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
