# Intentionality audit

Audit of the live cabinet against the Intentionality rules (why is this here; interaction; interruptions; colour/images/icons; spacing; artistry / deliberate exceptions). Source of those rules is the Cursor user rules added after the last environment build. Cabinet contracts already in [`DESIGN.md`](../../DESIGN.md) and [`PRODUCT.md`](../../PRODUCT.md) were treated as the documented baseline.

Checked: catalogue, Settings, around-the-table launch, and in-play boards (Tic-tac-toe, Connect Four, Chess, Go, Memory, Mancala, 2048, Letter Walker, Nim). Code pass over ActionSurface usage for the rest of the cabinet. Screenshots from localhost:5173 on 14 Sep 2026.

This file is a maintainer report. It is not player-facing.

## Verdict

The chrome (catalogue, theme, type, elevation) already matches the quiet-cabinet contract. The main gap is **implementation drift on ActionSurface**: SemanticAction data is correct for bots and tests, but many boards also render every legal coordinate as pew buttons. Chess, Connect Four, Tic-tac-toe, and Battleship battle already do the documented thing (board is the hit target). Go, Memory, Mancala, Reversi, Nine Men's Morris, Chinese Checkers, Dots and Boxes, and Backgammon mid-turn do not.

A second class of issues is **accidental emptiness**: `.main` is a full-height grid, so Settings and launch sections stretch apart. PlayTable centres intrinsic-size boards, so Tic-tac-toe / 2048 / Nim sit in a large unused well.

## What already holds

These match the rules and are already written in DESIGN or PRODUCT.

- Quiet chrome; personality in the mark, theme, and boards. No Inter/Geist, no glass, no page gradients, no hero marketing.
- Four themes; brand pops from the logo; White/Black true greys.
- Whole tile is the catalogue link. Verb-first blurbs. Join is a divider row, not a card.
- PlayTable slots (info / board / pew). Connect Four held-disc drop. Chess/checkers select then destination.
- Motion on objects, 140ms chrome, `prefers-reduced-motion` wins. Instant persist for theme and motion.
- Disabled ActionSurface reasons render under the label when the pew is used for a real chrome intent (2048 Undo, Letter Walker Submit).
- Interruptions are scarce: no coach marks, no newsletter, no save-confirm. Letter Walker Help is opt-in. Hogwarts choice and Crazy Eights suit picker are genuine mode changes.
- Hidden shelves stay out of the grid until a local code.

## Actionable

Priority is harm to play, not polish.

### 1. Pew move menus that replace or duplicate the board

DESIGN already says: legality lives in SemanticAction; **render** it as board highlights, not pew move menus. Battleship even comments that 100 fire cells are too many for the pew. Several boards ignore that.

| Game | Pew today | Board already clickable? | Fix |
|---|---|---|---|
| Go | Every legal `Place at a9`… (81 on an empty 9x9) plus Pass | Yes | Pew: Pass only. The goban is crushed off-screen by the sticky pew. |
| Memory | `Flip card 1`…`16` | Yes | Remove pew. Cards are the targets. |
| Mancala | `Sow pit 0`…`5` | Yes | Remove pew. Pits are the targets. |
| Reversi | Every legal `Place at` plus Pass | Yes | Pew: Pass only. |
| Nine Men's Morris | Place / Select / Move to / Remove point N | Yes | Pew empty; highlights on points. |
| Chinese Checkers | `Move to (q,r)` plus End hop | Yes | Pew: End hop only. |
| Dots and Boxes | Every open `Claim line …` | Yes | Remove pew. |
| Backgammon | After roll, every legal `point N -> M` | Board also plays | Pew: Roll and Pass only. |
| Nim | Take 1 / 2 / 3; stones are decoration | No | Either keep Take N as the **intent** (DESIGN: prefer intent over mime) and stop making stones look tappable, or make 1–3 stones the hit target and drop the button row. Decide; do not leave both. |

Do not delete `get*Actions()` helpers. Bots, tests, and a later keyboard path still need the data. Stop mounting those move lists on `ActionSurface`.

Keep pew ActionSurface for intents with no board object: Pass, Roll, Undo, New game, Draw, Ready, Play all, Submit, Clear.

### 2. Accidental stretch on Settings and launch

`.main` is `flex: 1` (fills the shell) and `display: grid` with default `align-content: stretch`. Three Settings sections therefore sit with large empty bands between Nickname, seat colour, and Access codes. Launch inherits the same stretch on top of `.table-setup { min-height: min(66dvh, 38rem) }`.

Fix: `align-content: start` on `.main` (or do not make `.main` a stretching grid). Then decide whether the table well still needs a forced min-height, or whether seat cards around a compact well are enough.

Seat colour dots on launch are 1.35rem, below `--tap-min` (2.75rem). Settings swatches are larger (they are `.btn`) but colour-only: selected state is a fill, aria-label is the hex. Add a name (Red, Blue) or a visible check that is not colour alone.

### 3. Play chrome that never leaves

Settings, Motion, and Theme stay in the topbar on every in-play screen. DESIGN asks the platform to disappear once play begins, and also asks to expose motion/theme knobs. Those two sentences are in tension and were never resolved.

Actionable without a vibe check: stop spending a second topbar row on small screens before the catalogue (the stacked toolbar is the first thing on a phone home). Whether to tuck the knobs during play is HITL.

### 4. Player-facing labels that are engine IDs

On the site today: Mancala `P0` / `P1` stores; Memory / Dots and Boxes / War / Snakes `P1` `P2`; Backgammon `P0 off` / `P1 off` / `P0:` bar. Seat colours exist at launch and are the next AFK slice; until boards read them, use You / Them or the nickname, not player-index codes.

Orbits status can append `(countermeasure only)`: engine flag in the status bar. Hogwarts pew uses `Play selected` after a tap (deck-builder rule is click the card to play). Hogwarts `Play all` is the allowed bulk shortcut.

### 5. Copy and instruction that should be demonstration

- 2048 status: `Swipe, arrow keys, or WASD`. Touch-first boards should not advertise WASD. Swipe can be discovered; a short status on first move is enough.
- Letter Walker U / D / L / R ring: removed. Swipe only.
- Catalogue blurb `Concept by Luke Walker` spends a tile line on credit. Fine if Luke wants it; it is not a play verb.
- Status strings use em dashes (`Your turn — tap a square`). House punctuation for product files is ASCII hyphen or a new sentence.

### 6. Small boards in a tall well

PlayTable's board slot grows and centres. Tic-tac-toe, 2048, and Nim stay tiny in a dark field. That may be correct (do not inflate a 3x3 to fill a monitor). It is not written down, so agents keep adding pew filler to "use the space". Record the rule: intrinsic board size; empty well is rest, not a place to invent buttons.

## Undocumented decisions (already true)

Record these in DESIGN so the next change does not rediscover them. Short form here; DESIGN is the contract.

1. **Catalogue groups.** `catalogueGroups` splits Solo (soloOnly) and With others. Solo-only titles skip `/game/:id` and open `/play/:id`. One tile, one destination.
2. **SemanticAction is data, ActionSurface is optional chrome.** ADR 0001 requires intents outside JSX. DESIGN requires board render. Chess, Connect Four, Tic-tac-toe, Checkers, and Battleship battle already follow both. The pew is not a required slot.
3. **No Save button.** Nickname, default seat colour, theme, and motion write on change. Undo is the model; there is no confirm.
4. **Theme and motion live in the topbar, not Settings.** PRODUCT still lists theme under Settings. The shipped UI is cycle buttons on every Shell page.
5. **Around-the-table launch.** Seats are spatial (north/east/south/west), not a form. The well holds the game name, occupancy, invalid reason, and Start/Host. Kind labels are Empty / This table / Online / Bot.
6. **Instant solo score post.** `ScoreSubmitter` posts when a pending score appears. No modal, no "submit score" click. Failure is a quiet leaderboard message.
7. **Match end is a row, not a dialog.** Play again / Game modes / Home via `MatchActions`. Waiting for a room replaces the board with a dashed panel.
8. **Hidden shelf language.** Access-gated titles are "shelves" and "this cabinet", not entitlements or DLC.
9. **Seat palette is object colour.** The six hexes include a violet (`#8e44ad`). Chrome forbids violet accents; pawns may use a full hue set. Colour is not the only seat signal once boards show names or you/them.
10. **Letter Walker modes.** Auto (default drag + tap), Slide, Select. Help is a requested dialog. Pew is Submit / Clear / New puzzle.
11. **Play / Scores tabs** only on solo leaderboard games. They stay out of multiplayer chrome.

## Intentional exceptions (keep only if we say so)

| Exception | What the rule usually does | Why it might stay |
|---|---|---|
| Nim Take 1/2/3 | Board-first | Intent-first: taking N stones is the verb; the pile is display-only |
| Table well min-height | Spacing is hierarchy, not theatre | Makes the launch page feel like seats around a table |
| Small board, large well | Board dominates | Stretching TTT/2048 lies about scale |
| Always-on Motion/Theme | Platform disappears in play | Hundredth-hour knob without Settings archaeology |

If nobody can defend the exception in DESIGN, treat it as a bug (section Actionable).

## Out of scope / already queued

- Seat colours on boards: next AFK in `docs/slices.md`.
- Mum-ready UX, Dominoes phone layout, classic visual language: HITL.
- Contrast AA pass on `--muted` vs surfaces: not measured this audit; do not claim it.
