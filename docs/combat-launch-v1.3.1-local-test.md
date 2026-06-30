# v1.3.1 Combat Launch Local Test

Date: 2026-07-01

Scope: local-only critical bugfix. No commit, push, branch, release, Vercel deployment, asset regeneration, animation replacement, map redesign, or gameplay rebalance.

## Root Cause Report

Issue: the player could intermittently launch or be thrown away when touching enemies or while attacking enemies.

Investigation covered the active production flow in `FinalLevelScene`, enemy attack windows in `Enemy`, boss overlap damage, player hit reaction, Arcade body velocity writes, hit lock timing, attack overlap callbacks, and hit stop timing.

Root cause: enemy and boss damage paths still wrote combat velocity directly to the player body while overlap and attack callbacks could run across adjacent physics frames. During close-contact combat this allowed Arcade body state, input acceleration, hit lock timing, and overlap callbacks to briefly disagree. Most hits looked fine, but repeated contact or attacks near enemies could produce an abnormal one-frame displacement or velocity spike.

The bug did not require new art, enemy changes, map changes, or balance changes.

## Reproduction Notes

- Existing build was opened locally from the production preview.
- Map 1 boot, tutorial, and initial combat path were smoke-tested visually.
- Code-level trace found all active launch-capable writes in the final gameplay path.
- Active scenes were confirmed to use `FinalLevelScene` for Maps 1-4.

Browser automation against the canvas cannot directly read Phaser body telemetry without adding debug hooks, so the final verification combines production build smoke testing with targeted code-level regression checks.

## Bug Fix Summary

- Enemy and boss hit reactions now trigger player damage and hit animation without movement impulse.
- Player hit handling now resets acceleration before applying the controlled reaction.
- Successful player attacks against enemies and boss arm a short combat stability window.
- During that window only, impossible one-frame player position spikes are clamped and excessive combat velocity is bounded.
- Trap knockback and trap behavior were not changed.
- Maps, assets, animations, enemy stats, boss stats, combat formulas, UI, tutorial, HUD, and object placement were preserved.

## Regression Checklist

- Enemy touch: damage path remains active and uses hit animation.
- Enemy attack: attack-window damage remains active through `tryApplyAttackHit`.
- Player attack: enemy hurt/death remains active.
- Boss touch and attacks: damage path remains active and no longer injects movement impulse.
- Traps: existing trap knockback remains unchanged.
- Map flow: Main Menu -> Map 1 -> Map 2 -> Map 3 -> Map 4 -> Ending.
- Lint: passed.
- Typecheck: passed.
- Production build: passed.
