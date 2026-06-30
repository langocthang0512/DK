# v1.3.2 Combat Launch Local Test

Date: 2026-07-01

Scope: local-only critical bugfix. No commit, push, branch, release, Vercel deployment, asset regeneration, animation replacement, map redesign, or gameplay rebalance.

## Root Cause Report

Reliable reproduction path:

1. Hold movement.
2. Keep holding movement.
3. Attack an enemy while movement is still held.
4. Attack connects.
5. Continue holding movement.

Root cause: player attack state was cleared only by `ANIMATION_COMPLETE` for `player.attack`. In the reliable repro path, held movement plus combat overlap can interrupt the attack animation through movement, falling, landing, hit, or another forced animation path before the completion event fires. That leaves `#isAttacking` stale.

While stale, enemy overlap treats the player as still attacking, repeatedly routes overlap through `#damageInRange`, and suppresses the normal enemy damage path. Under continuous movement this creates a desync between input acceleration, attack overlap, hit-stop timing, and body state. The visible result can be an intermittent launch or thrown-away movement spike.

## Bug Fix Summary

- Added a fixed `PLAYER_ATTACK_ACTIVE_MS` combat window.
- Added `#attackActiveUntil`.
- Attack state now expires by timestamp through `#refreshAttackState`.
- Enemy and boss overlap now uses `#isPlayerAttackActive()` instead of reading raw `#isAttacking`.
- Player damage forcibly cancels attack state before hit animation.
- Removed the fragile dependency on `player.attack` animation completion to clear attack state.
- Preserved approved assets, animations, maps, enemy placement, stats, combat values, UI, tutorial, HUD, pause menu, ending screen, and prior fixes.

## Regression Checklist

- Held movement + attack: attack state expires after the intended attack window.
- Interrupted attack animation: stale attack state is cleared by time.
- Enemy touch: damage path remains available after attack window ends.
- Enemy attack: attack-window damage remains active through `tryApplyAttackHit`.
- Player attack: enemy hurt/death remains active.
- Boss overlap: same bounded attack-state logic applies.
- Traps: unchanged.
- Map flow: Main Menu -> Map 1 -> Map 2 -> Map 3 -> Map 4 -> Ending.
- Lint: passed.
- Typecheck: passed.
- Production build: passed.
