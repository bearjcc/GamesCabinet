# TRACKS sim report

Greedy route bots on the cabinet rules engine. Run date: 2026-10-20. **1000 games** per configuration (2p–4p full batch; 6p deck50 rows from the same 1000-game run, deck55 rows from a follow-up batch). Discard draw 2023. Step caps: 20k (2–4 players), 80k (6 players).

Multiplayer rounds use the lap rule: first connection starts wind-down; the round ends just before the round starter would act again.

| Config | Completed | Cap hit | Avg total score | Avg spread | Avg turns / round | Objective clear % | Lap-scored rounds |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p2 deck50 j1 | 297/1000 | 70.3% | 371.3 | 78.5 | 82.1 | 22.0% | 57.3% |
| p2 deck50 j2 | 299/1000 | 70.1% | 396.5 | 84.3 | 83.2 | 23.2% | 57.8% |
| p2 deck55 j1 | 383/1000 | 61.7% | 327.4 | 65.2 | 79.3 | 21.7% | 60.3% |
| p2 deck55 j2 | 416/1000 | 58.4% | 327.9 | 64.4 | 79.0 | 21.2% | 59.0% |
| p3 deck50 j1 | 571/1000 | 42.9% | 343.4 | 75.6 | 106.2 | 15.7% | 70.1% |
| p3 deck50 j2 | 562/1000 | 43.8% | 367.5 | 80.3 | 107.0 | 16.1% | 70.0% |
| p3 deck55 j1 | 655/1000 | 34.5% | 317.7 | 65.9 | 102.8 | 14.8% | 71.7% |
| p3 deck55 j2 | 659/1000 | 34.1% | 338.0 | 68.3 | 102.0 | 15.4% | 71.3% |
| p4 deck50 j1 | 649/1000 | 35.1% | 455.3 | 96.1 | 126.7 | 12.7% | 79.7% |
| p4 deck50 j2 | 641/1000 | 35.9% | 478.2 | 100.7 | 126.5 | 12.8% | 79.9% |
| p4 deck55 j1 | 717/1000 | 28.3% | 427.3 | 87.3 | 121.3 | 12.5% | 81.3% |
| p4 deck55 j2 | 743/1000 | 25.7% | 441.3 | 89.6 | 121.7 | 12.2% | 81.3% |
| p6 deck50 j1 | 127/1000 | 87.3% | 2437.7 | 459.1 | 177.0 | 13.8% | 89.4% |
| p6 deck50 j2 | 117/1000 | 88.3% | 2748.8 | 510.8 | 176.2 | 13.8% | 88.0% |
| p6 deck55 j1 | — | — | — | — | — | — | — |
| p6 deck55 j2 | — | — | — | — | — | — | — |

## Reading this batch

- **2p** finishes under ~85 turns per round on completed games, but only ~30–42% of games reach game over within the step budget. The shorter 55-card deck helps completion slightly.
- **3p–4p** completion is better (65–75% for 4p). Turns per round stay above the ~40-turn target because bots still burn draws on off-route tiles.
- **6p** remains rough: most games hit the cap; averages are from the minority that finish. Deck55 6p rows were not finished in this run (CPU time).

Objective clear rates stay in the low teens–twenties: secret goals are slow to cash with these bots. Lap-scored round % is lower at 2p because many capped games never score a full round.

Re-run after bot or step-limit changes: `npm run sim:tracks -- --games=1000`.
