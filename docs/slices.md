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

- [x] **AFK** Agency — first playable slice (solo, facilities/people, market row)  
  Research: `docs/research/agency.md` (Vault + repo recovery). Rules: `src/games/agency/`. Starter facilities + placeFacility; access code `SPUTNIK`. Remaining: events, factions, campaign eras, co-op seats — see research doc open questions.

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
- Agency follow-ons (events, factions, campaign, online co-op) — slice 1 landed; see `docs/research/agency.md`
- Offline PWA / IndexedDB continue - Phase 2

Background map (stale in places): [GamesCabinet Phase 1 map](https://github.com/bearjcc/GamesCabinet/issues/1)
