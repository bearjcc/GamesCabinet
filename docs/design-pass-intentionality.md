# Design pass: intentionality, spacing, colour

Shared chrome and catalogue only (not individual game boards). Uncertainty test: if removing a control or gap would leave the player guessing, it stays.

## Catalogue (home)

| Removed / changed | Why |
|---|---|
| Page heading "Games" | Shell wordmark already names the cabinet on home; duplicate title added height without orientation. |
| Square game tiles with 0.75rem padding | Storefront hero density; collection should fit several games per viewport. |
| Large group gaps | Hairline between groups; uppercase labels at 0.78rem. |
| `--surface-2` tile fill + inset hover shadow | Flat bordered tiles; hover is border + surface shift only. Hierarchy reads from type weight, not colour blocks. |

Tiles are name + two-line blurb only. No icon chips.

## Shell topbar

| Removed / changed | Why |
|---|---|
| "Settings" text button | Cog icon with `aria-label`; same destination, less horizontal noise. |
| Theme / motion text labels ("Light", "Normal") | Icon cycle buttons with labels in `aria-label` / `title`; state visible on click without permanent text. |
| Title beside logo on subpages | Logo mark always home; game title centred in topbar grid. |
| Stacked topbar on narrow screens | Single-row grid keeps controls reachable without a second chrome band. |

In play, topbar and main gap tighten via `.shell:has(.play-table)` so the board keeps height.

## Table setup / launch

| Removed / changed | Why |
|---|---|
| Per-seat kind button row (Empty / This table / Online / Bot) | Four buttons per seat duplicated the decision; token tap claims a seat, kind chip cycles. |
| Per-seat colour swatches at launch | Player colours come from seat index on the token; settings holds a default. Launch is who sits where, not a palette shop. |
| "Set the table" kicker | Well already shows game name and seat count. |
| Hogwarts year `<select>` | Year chips in the well; campaign name below. Fewer form fields on a touch surface. |

Hidden `table-seat-N-kind-*` hooks remain for tests and direct kind assignment.

## Play chrome (PlayTable)

| Removed / changed | Why |
|---|--- |
| Unreserved pew slot | `reservePew` + `min-height` on info and actions so the board does not jump when actions appear. |
| Room chip bottom margin | Info row is one band; extra margin stole board height. |
| Status bar padding | Slightly tighter; turn line still meets tap target via `--tap-min` on pew buttons. |

Pew stays border-top + surface-2; no nested cards. ActionSurface unchanged (board-first law).

## Verify

```bash
npm run check
npm run dev   # :5173 catalogue, :8000 server
```

Manual:

1. `/` — dense grid, wordmark in topbar, join row under divider.
2. `/game/dominoes` — tap open rings to claim seats; kind chip cycles; one Start.
3. `/play/tic-tac-toe` — compact topbar; status row stable height; board fills middle.
