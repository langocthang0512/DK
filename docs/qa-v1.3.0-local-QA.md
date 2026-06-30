# v1.3.0 Local QA

Date: 2026-07-01

Scope: local-only full game QA. No commit, push, branch, release, Vercel deployment, asset regeneration, animation replacement, gameplay redesign, or production modification.

## QA Summary

- Audited scene registration, boot flow, map flow, UI flow, final ending return, input hooks, enemy logic, boss logic, trap logic, HUD, tutorial, asset manifest, and build output.
- Verified complete intended flow in code: Main Menu -> Map 1 -> Map 2 -> Map 3 -> Map 4 -> Ending -> Main Menu.
- Verified final maps use ground-only enemy spawns after the local test patch.
- Verified enemy attacks use existing attack animation states and per-enemy damage values.
- Verified enemy and boss hit responses use very small controlled pushback values with no vertical launch impulse.
- Verified build, lint, and typecheck complete successfully.

## Bug Report

### QA-001

Severity: Minor
Category: UI / Audio lifecycle

Steps:

1. Open Main Menu.
2. Leave the menu running for repeated ambient UI tones.

Expected:
Short UI tones should not accumulate browser audio resources.

Actual:
Each menu tone sequence created an AudioContext without closing it.

Root Cause:
`playUiToneSequence` created a fresh WebAudio context per tone sequence and never released it.

Fix Plan:
Close the AudioContext shortly after the tone sequence finishes.

Status:
Fixed and retested with lint, typecheck, build, and local preview boot.

### QA-002

Severity: Major
Category: Player hit response

Steps:

1. Touch enemies or boss during combat.
2. Observe player hit response.

Expected:
Player receives damage, plays hit animation, and gets only a tiny controlled pushback.

Actual:
Previous local builds could use configured hit velocities that risked launching or displacing the player too far.

Root Cause:
Combat hit logic directly applied velocity values during `#hit`; enemy and boss hit inputs needed to stay bounded at the call site.

Fix Plan:
Use small zero-vertical combat knockback values for enemy and boss damage paths while preserving trap knockback.

Status:
Fixed before this QA build and revalidated in code audit.

### QA-003

Severity: Major
Category: Enemy combat

Steps:

1. Enter enemy detection and attack range.
2. Wait for enemy attack.

Expected:
Enemy attack animation window applies damage once per attack.

Actual:
Enemy attack animation existed, but local gameplay needed reliable attack-window damage hookup.

Root Cause:
Damage depended on overlap timing rather than a single attack-window hit check.

Fix Plan:
Centralize enemy attack hit checks through `tryApplyAttackHit`, lock one damage application per attack animation, and use existing per-enemy damage values.

Status:
Fixed before this QA build and revalidated in code audit.

## Fix Report

- Added AudioContext cleanup after UI tone playback.
- Preserved Main Menu, Pause Menu, Ending Screen, HUD, tutorial, maps, boss, enemies, traps, combat formulas, assets, and animations.
- Kept local-only v1.2.5 gameplay fixes intact for v1.3.0 local QA.

## Regression Checklist

- Main Menu: pass by local preview boot.
- Map flow registration: pass by code audit.
- Map 1 tutorial includes movement, jump, attack: pass by code audit.
- Enemy attack animation state registration: pass by asset and scene audit.
- Enemy damage values: pass by code audit.
- Enemy ground-only final-map placement: pass by code search.
- Boss arena scene flow: pass by code audit.
- Ending return to Main Menu: pass by code audit.
- Pause Menu scene registration and return paths: pass by code audit.
- Missing assets: pass by build.
- Type safety: pass.
- Lint: pass.
- Production local build: pass.
