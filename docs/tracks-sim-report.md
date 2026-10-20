# TRACKS sim report

Greedy route bots on the cabinet rules engine. Run date: 2026-10-20. **50 games** per row (1000-game batch queued after bot turn fix); discard draw 2023. Step caps: 40k (2–4 players), 80k (6 players).

Multiplayer rounds end on the lap rule: first connection starts a wind-down, then play stops before the round starter would go again.

| Config | Completed | Cap hit | Avg total score | Avg spread | Avg turns / round | Objective clear % | Rounds ending after a connection |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p2 deck50 j1 | 27/50 | 46.0% | 288.2 | 49.0 | 114.7 | 20.1% | 63.1% |
| p2 deck50 j2 | 20/50 | 60.0% | 355.3 | 70.5 | 109.7 | 21.0% | 60.1% |
| p2 deck55 j1 | 26/50 | 48.0% | 291.9 | 52.7 | 107.3 | 17.6% | 62.2% |
| p2 deck55 j2 | 29/50 | 42.0% | 272.5 | 39.8 | 94.9 | 22.9% | 61.7% |
| p3 deck50 j1 | 41/50 | 18.0% | 292.3 | 58.0 | 129.5 | 14.8% | 68.9% |
| p3 deck50 j2 | 47/50 | 6.0% | 290.2 | 61.1 | 129.0 | 14.3% | 68.8% |
| p3 deck55 j1 | 42/50 | 16.0% | 309.0 | 65.8 | 129.9 | 15.7% | 77.1% |
| p3 deck55 j2 | 45/50 | 10.0% | 299.6 | 57.1 | 117.5 | 16.2% | 69.5% |
| p4 deck50 j1 | 50/50 | 0.0% | 374.8 | 81.7 | 141.4 | 9.7% | 81.2% |
| p4 deck50 j2 | 49/50 | 2.0% | 407.4 | 83.2 | 139.7 | 13.1% | 81.5% |
| p4 deck55 j1 | 49/50 | 2.0% | 376.7 | 65.3 | 132.5 | 10.7% | 83.0% |
| p4 deck55 j2 | 49/50 | 2.0% | 394.5 | 75.2 | 150.2 | 14.2% | 81.6% |
| p6 deck50 j1 | 5/50 | 90.0% | 3088.4 | 579.8 | 173.9 | 13.6% | 85.8% |
| p6 deck50 j2 | 7/50 | 86.0% | 2406.3 | 434.0 | 170.9 | 14.6% | 88.0% |
| p6 deck55 j1 | 3/50 | 94.0% | 4755.7 | 869.7 | 162.0 | 12.9% | 92.2% |
| p6 deck55 j2 | 8/50 | 84.0% | 1903.6 | 366.8 | 158.0 | 12.9% | 88.4% |

## Notes

- **Cap hit** — sim step limit (40k / 40k / 40k / 80k steps by table size) before game over.
- **Objective clear %** — secret objectives scored and removed, divided by objectives held entering scored rounds.
- **Lap end %** — rounds where at least one player had connected before scoring (expected ~100% in normal play).
