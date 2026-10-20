# TRACKS sim diagnosis

Generated 2026-10-20 after fixing the headless bot turn detector.

## Root cause (sim untrustworthy)

**Bug: headless bot, not placeholder deck mix.**

`playBotTurn` treated a play as failed unless `currentPlayer` or `phase` changed. In solo (and when a seat wraps to itself), a legal `playTile` clears `drawnId` and increments `ctx.turn` while `currentPlayer` stays `"0"`. The bot returned `stuck`, retried up to 16 illegal follow-up moves per cabinet turn, and sim harnesses that stop on `stuck` never finished rounds. Multiplayer sims kept going on draw steps but burned the step cap on phantom “stuck” play turns—hence 80–176 turns/round and 58–88% cap hits.

**Evidence**

| Check | deck50 | deck55 |
| --- | --- | --- |
| Oracle solo connect p50 (turns) | 10 | 10 |
| Greedy solo connect p50 (after fix) | 14 | 16 |
| Greedy illegal `playTile` retries (50 seeds) | 0 | 0 |

Oracle uses full deck order + 1-ply lookahead; p50 ≈ 10 proves the 50/55-card placeholder manifests can reach the terminal in roughly **10–16** turns when moves resolve correctly. No deck remix required for trustworthiness.

**Fix:** `turnAdvanced` now treats `ctx.turn` change or `drawnId` clearing as a resolved turn (`src/games/tracks/bot.ts`, mirrored in `oracle.ts`).

## Turn mix (greedy bot, first 50 solo seeds)

| Metric | deck50 | deck55 |
| --- | --- | --- |
| Discards / play turn | 64.4% | 64.7% |
| Route extend | 28.5% | 29.7% |
| Stall plays | 6.6% | 5.3% |
| Connect plays | rare (end of chain) | rare |

High discard share is greedy policy (waits for extend/connect tiles), not inability to draw straights/curves.

## Proposed route-heavy deck (not adopted)

`PLACEHOLDER_DECK_MANIFEST_ROUTE_PROPOSAL` in `src/games/tracks/placeholders.ts` remains an optional A/B manifest (+straights, −specials) if future sims need **15–30** turn *multiplayer* rounds without tightening the bot. Current placeholder mix is adequate once the bot resolves turns.

## Re-run diagnosis

```bash
npx tsx scripts/tracks-diagnose.ts --games=100
```
