# Slice queue

Source of truth for **implement next slice**. Agents: first unchecked **AFK** item. HITL items need Bear.

How to add work: append a checkbox under the right section. Type, blocked-by, and the files or behaviour that make it demoable. Do not leave intent only in chat or `~/.cursor/plans`.

## Now

- [x] **AFK** Finish mixed online + bot chairs  
  Host-side MCTS on bot seats in an online room (not a server bot). Working tree already has `deriveLaunch`, `hostRoom` device joins, `botSeat.tsx`, PlayOnline wiring, and e2e. Close gaps, run `npm run check`, then tick this.  
  Files: `src/lib/tableSetup.ts`, `src/lib/lobby.ts`, `src/lib/bots.ts`, `src/lib/botSeat.tsx`, `src/pages/PlayOnline.tsx`, `src/pages/GameLaunch.tsx`, `e2e/online.spec.ts`

## Table seats (landed in tree)

- [x] **AFK** Around-the-table launch (`TableSetup`, `deriveLaunch`, Hogwarts year/heroes in the well)
- [x] **AFK** Multi-bot / mixed this-table + bot local play
- [x] **AFK** Mixed this-table + online in one room

## Next (AFK, after Now)

- [ ] **AFK** Seat colours on boards  
  Occupied this-table / bot seats already pick a colour at launch. Boards that can show seats should read that colour instead of ignoring it. Skip Hogwarts (hero is identity).  
  Start from `SEAT_COLOUR_PALETTE` / `src/lib/storage.ts` and which boards already show seats.

## HITL (do not implement until Bear says go)

- [ ] **HITL** Mum-ready UX bar - [Mum-ready UX bar](https://github.com/bearjcc/GamesCabinet/issues/4)
- [ ] **HITL** Dominoes phone board layout - [Dominoes phone board layout](https://github.com/bearjcc/GamesCabinet/issues/5)
- [ ] **HITL** Classic games visual language - [Classic games visual language](https://github.com/bearjcc/GamesCabinet/issues/6)
- [ ] **HITL** Bear vibe check on small screen, then Railway on GamesCabi.net (Phase 1 ship)

## Later (not next)

- Hogwarts expansions (campaign years 8-15) - engine data exists; launch picker is years 1-7
- Agency / other first-party titles - not a Phase 1 gate
- Offline PWA / IndexedDB continue - Phase 2

### Intentionality audit (do not jump the Now queue)

Full report: [`docs/audits/intentionality.md`](./audits/intentionality.md). DESIGN now records the decisions that were already true.

- [ ] **AFK** Strip pew move-menu ActionSurfaces  
  Keep `get*Actions()` for bots/tests. Stop mounting coordinate lists on `ActionSurface`. Pew only for Pass / Roll / Undo / Draw / Ready / Play all / Submit / Clear.  
  Games: Go (Pass only), Memory (none), Mancala (none), Reversi (Pass only), Nine Men's Morris (none), Chinese Checkers (End hop only), Dots and Boxes (none), Backgammon (Roll / Pass only).  
  Files: `src/games/*/Board.tsx`, existing action tests stay; add a board-click test where the pew was the only path.

- [ ] **AFK** `.main` must not stretch Settings / launch  
  `align-content: start` (or stop making `.main` a filling grid). Seat colour swatches meet `--tap-min` and are not colour-only.  
  Files: `src/styles/base.css`, `src/styles/catalogue.css`, `src/pages/Settings.tsx`, `src/components/TableSetup.tsx`

- [ ] **AFK** Player-facing seat labels  
  Replace on-site `P0` / `P1` / `P2` (Mancala, Memory, Dots and Boxes, War, Snakes, Backgammon) with You / Them or the nickname. Orbits status must not say `countermeasure only`.  
  Files: those `Board.tsx` files, `src/games/orbits/Board.tsx`

- [ ] **AFK** Hogwarts click-to-play  
  Tap a hand card plays it (deck-builder law). Keep Play all. Selection-to-read can stay as a non-blocking inspect.  
  Files: `src/games/hogwarts-battle/Board.tsx`

- [ ] **HITL** Tuck Settings / Motion / Theme during play  
  Tension: knobs reachable vs platform disappears. Needs a Bear vibe check before changing Shell.

Background map (stale in places): [GamesCabinet Phase 1 map](https://github.com/bearjcc/GamesCabinet/issues/1)
