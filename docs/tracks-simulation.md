# TRACKS simulation notes

Headless runs use the greedy bots in `src/games/tracks/bot.ts` against the real cabinet rules (`npm run sim:tracks`). The latest 1000-game table is in [`tracks-sim-report.md`](tracks-sim-report.md).

## Round ending (multiplayer)

When anyone connects start to destination, the round does not stop immediately. Play continues around the table until the lap closes: the round ends just before the starting player would take another turn. Solo still ends on connection, the fifth discard, or an empty deck.

## What we measure

- **Completed** — reached game over within the sim step budget.
- **Cap hit** — step budget exhausted (see report for limits per table size).
- **Avg turns / round** — play-phase bot turns between round scores.
- **Objective clear %** — secret objectives removed by scoring during the game.
- **Lap end %** — scored rounds where someone had connected (should stay high).

## Deck and junction variants

Placeholder manifests compare ~50 vs ~55 cards per player and junction scoring at 1 vs 2 points. Use the report table to compare averages; re-run after rule or bot changes.
