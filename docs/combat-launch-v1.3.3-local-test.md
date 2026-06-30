# v1.3.3 Combat Launch Local Test

Date: 2026-07-01

Scope: local-only critical bugfix. No commit, push, branch, release, Vercel deployment, asset regeneration, animation replacement, map redesign, or gameplay rebalance.

## Root Cause Report

Confirmed reproduction:

1. Hold movement toward an enemy.
2. Keep movement held.
3. Press attack.
4. Attack connects and enemy HP decreases.
5. Continue holding movement.

The remaining root cause was successful attack hit-stop changing `this.physics.world.timeScale` to `0.01` while player movement acceleration remained held. That global Arcade physics timing mutation happens exactly when the confirmed bug reproduces: a moving player, overlapping enemy bodies, an attack hit, and continued input acceleration.

When the world time scale is restored after the hit-stop delay, Arcade body integration can resume from a stale overlap/acceleration state. This creates intermittent, non-100% displacement spikes that look like the player being thrown across the map.

The v1.3.2 attack-window fix was still valid, but incomplete. It removed stale attack state; this patch removes the remaining physics timing desync.

## Bug Fix Summary

- `#applyHitStop` no longer mutates Arcade physics world `timeScale`.
- The hit-stop hook now only refreshes the existing combat stability guard and does not alter physics or animation timing.
- Enemy/boss combat movement impulse remains disabled from prior fixes.
- Time-bounded attack state from v1.3.2 remains in place.
- Enemy visual ground anchoring is raised slightly through the shared `Enemy` constructor.
- Enemy counts, enemy stats, boss stats, maps, assets, animations, combat values, UI, tutorial, HUD, pause menu, ending screen, and trap behavior were preserved.

## Regression Checklist

- Held movement + connected attack: no global physics time scaling.
- Repeated attacks: attack state expires by timestamp.
- Enemy touch: normal enemy damage path remains available after attack window.
- Enemy HP decrease: player attack still applies enemy hurt/death.
- Player movement: remains controlled by existing speed and acceleration values.
- Enemy grounding: Snake, Hyena, Scorpio, and Vulture share the adjusted visual anchor.
- Traps: unchanged.
- Boss: unchanged except inheriting safe hit-stop behavior on player attacks.
- Map flow: Main Menu -> Map 1 -> Map 2 -> Map 3 -> Map 4 -> Ending.
- Lint: passed.
- Typecheck: passed.
- Production build: passed.
