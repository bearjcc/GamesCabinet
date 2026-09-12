# Interface pass: feedback, motion, interruptions

Audit of shared shell and game motion against the cabinet interaction rules (truthful feedback, ~200ms continuity, no decorative theatre).

## Kept (earned motion)

| Area | What stayed | Why |
|---|---|---|
| **Cinematic primitives** | Lift on piece select, Snap on land, Flip on card reveal, Drop on disc place, Roll on dice | Describes a real state change on the board |
| **Connect Four** | Held disc above column; winning cells highlighted | Physical drop affordance; win readout on the rack |
| **Tic-tac-toe** | Winning line via cell highlight | Shows the line that ended the game |
| **2048** | Short `g2048-pop` on new tiles; quiet board scrim at 2048 | Tile birth is real; pause is status, not a modal |
| **Yatzy / card games** | Roll / deal / flip pulses tied to G changes | Motion follows the move, never gates input |
| **Chrome buttons** | 200ms background/border ease only | Confirms press without lift or shimmer |
| **Motion intensity** | Reduced / normal / playful + `prefers-reduced-motion` | Player control; reduced path is instant |

## Cut or calmed

| Area | Change | Why |
|---|---|---|
| **Status bar `you` / `done` tones** | Border tint only; no filled “celebration” wash | Turn and endgame are facts, not alerts |
| **Pass-and-play turns** | Named seats (`Player N's turn`) via `useMatchStatus`; seat sync before paint | Avoids flashing “Your turn” / “Their turn” |
| **Match end actions** | `MatchActions` overlays the board (`match-actions--overlay`) | Board size does not jump when Play again appears |
| **2048 win overlay** | Scrim + plain label; removed yellow badge styling | Not a trophy toast |
| **2048 tile pop** | Single ease-out scale (no overshoot bounce) | Less slot-machine |
| **Domino snap** | Outline only; removed `scale(1.12)` | Selection is already lit |
| **Snap primitive** | Scale 1.04 → 1.02 | Subtle land, not a bounce |
| **Buttons** | Removed unused `transform` transition | No implied lift on chrome |
| **Normal motion token** | 140ms → 200ms | Aligns with continuity target |

## Interruptions

- **No new modals** for wins, turns, or scores.
- **Suit picker** (Crazy Eights) stays: choosing a suit is a real required choice.
- **Score submitter** stays headless; leaderboard errors stay inline on the scores tab.
- **Room copy status** stays a polite `role="status"` line, not a toast.

## Shared entry points

- Turn copy: `useMatchStatus` + `deriveMatchStatus` (`seatLabel` for hot-seat).
- Hot-seat seat: `withHotseatSeatSync` (effective `playerID` / `isActive` before paint).
- Endgame chrome: `MatchChrome` grid overlay for actions.
- Win highlight: `nInARowWinningIndices` for grid games.
