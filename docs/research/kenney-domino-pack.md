# Research: Kenney domino-pack licence and tile naming

Ticket: https://github.com/bearjcc/GamesCabinet/issues/3  
Branch: `research/kenney-domino-pack`  
Sources: local pack License.txt; https://kenney.nl/assets/domino-pack ; Bear confirmation CC0.

## Verdict

**Licence: CC0 (Creative Commons Zero / public domain dedication).** Safe to ship in GamesCabinet for personal and commercial use. Credit to Kenney / kenney.nl is appreciated, not mandatory. Keep `License.txt` when vendoring (ticket Vendor Kenney domino assets into repo).

## Source paths

- Local: `...\Game Assets\kenney\2D assets\Boardgame Pack\domino-pack`
- Upstream: https://kenney.nl/assets/domino-pack
- Pack version in License.txt: Domino Pack 1.0 (Creation date noted in pack: 02-08-2026)

## Themes (PNG)

Each theme folder under `PNG/` contains the full double-six set plus an empty tile:

- Dark
- Gingerbread
- Hearts
- Light
- Stars

Recommended Phase 1 default theme: **Light** or **Dark** (calm, readable on tablet). Board uses `Vector/<theme>/tile_<a>_<b>.svg` (PNG kept in tree as fallback).

## Filename -> pip mapping

Pattern: `tile_<a>_<b>.png` where `0 <= a <= b <= 6`.

| File | Pips (a,b) | Notes |
|---|---|---|
| tile_0_0.png | (0,0) | Double blank |
| tile_0_1.png | (0,1) | |
| tile_0_2.png | (0,2) | |
| tile_0_3.png | (0,3) | |
| tile_0_4.png | (0,4) | |
| tile_0_5.png | (0,5) | |
| tile_0_6.png | (0,6) | |
| tile_1_1.png | (1,1) | |
| tile_1_2.png | (1,2) | |
| tile_1_3.png | (1,3) | |
| tile_1_4.png | (1,4) | |
| tile_1_5.png | (1,5) | |
| tile_1_6.png | (1,6) | |
| tile_2_2.png | (2,2) | |
| tile_2_3.png | (2,3) | |
| tile_2_4.png | (2,4) | |
| tile_2_5.png | (2,5) | |
| tile_2_6.png | (2,6) | |
| tile_3_3.png | (3,3) | |
| tile_3_4.png | (3,4) | |
| tile_3_5.png | (3,5) | |
| tile_3_6.png | (3,6) | |
| tile_4_4.png | (4,4) | |
| tile_4_5.png | (4,5) | |
| tile_4_6.png | (4,6) | |
| tile_5_5.png | (5,5) | |
| tile_5_6.png | (5,6) | |
| tile_6_6.png | (6,6) | |
| tile_empty.png | n/a | Empty / placeholder slot |

Full double-six set = **28** tiles (0-0 through 6-6). Matches Mum-ready Dominoes (double-six). No 7+ faces in this pack (double-9/12 remain fog).

Canonical game key: normalize orientation so `a <= b` when looking up art; rotate in UI for board placement.

## Recommended in-repo layout (for ticket #8)

```
assets/kenney/domino-pack/
  License.txt
  PNG/
    Dark/
    Light/
    ...
```

Do not copy binaries until [Vendor Kenney domino assets into repo](https://github.com/bearjcc/GamesCabinet/issues/8) is claimed.
