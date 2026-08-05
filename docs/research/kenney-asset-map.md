# Research: Kenney asset map for cabinet games

Sources: local Kenney folders under Proton Drive (`Icons\`, `2D assets\Boardgame Pack`). Licence: CC0 (keep each pack `License.txt`).

## Top 15 classics (assumed cabinet backlog)

Public-domain / freely implementable rules. Not a ship commitment; guides what to vendor.

| # | Game | Primary Kenney material |
|---|---|---|
| 1 | Chess | `board-game-icons` chess_* ; pawns/pieces from `boardgame-pack` |
| 2 | Checkers | `boardgame-pack` chips (discs) ; crown icons for kings |
| 3 | Go | stones ~ chips / tokens ; board is CSS/SVG |
| 4 | Solitaire (Klondike) | `boardgame-pack` playingCards*.svg |
| 5 | Tic-tac-toe | CSS/SVG marks ; optional token icons |
| 6 | Connect Four | `boardgame-pack` chips |
| 7 | Dominoes | `domino-pack` Vector (double-six) |
| 8 | Reversi / Othello | chips two-tone |
| 9 | Mancala | tokens / stones (chips) |
| 10 | Backgammon | chips + dice*.svg |
| 11 | Memory / Concentration | playingCards or token pairs |
| 12 | FreeCell | playingCards*.svg |
| 13 | Yatzy / Yahtzee | diceWhite / diceRed |
| 14 | Battleship | `board-game-icons` + grid CSS (no ship art in these packs) |
| 15 | Chinese Checkers | coloured pieces / tokens |

Also covered by the same packs: Cribbage/Hearts/Spades (cards), generic cabinet chrome (`board-game-info` player counts / duration).

## Vendored layout (SVG-first)

```
assets/kenney/
  boardgame-pack/     # Vector chips, dice, pieces, cards + License
  domino-pack/        # Vector themes + existing PNG Light/Dark + License
  board-game-icons/   # UI / piece / suit icons
  board-game-info/    # box-style meta (players, duration, tablet)
  game-icons/         # general UI glyph sheets (vector)
  game-icons-expansion/
  game-icons-fighter/
  input-prompts/      # Touch / keyboard / pad prompts (vector)
```

Mirrored to `public/assets/kenney/` for Vite static serve.

Counts after vendor (approx): ~1,364 SVG under `public/assets/kenney`. Dominoes board uses `Vector/Light` SVG.

## Provenance

- Domino Vector: copied from local Proton Drive pack (readable).
- Other packs: OpenGameArt Kenney CC0 zips (Proton Drive cloud provider was offline / slow to hydrate). Same Kenney CC0 content.
- Input Prompts: OGA build is a subset (no PlayStation glyphs); full set remains on Proton if needed later.

## Web vs Godot

- Prefer **SVG** under `Vector/` for the web client (scale, theming, small payloads).
- Keep **PNG** as optional fallback / Godot later; web boards should load SVG.
- Skipped on purpose: `.swf`, Kenney URL stubs, Preview/Sample rasters, bulk PNG duplicates of SVG packs.
