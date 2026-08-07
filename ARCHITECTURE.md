# Architecture

## Seed crystal

[boardgame.io](https://boardgame.io/) is the game engine and multiplayer substrate. React + TypeScript + Vite form the client; a Node server wraps `boardgame.io/server` (Koa + Socket.IO). Game rules are ordinary boardgame.io `Game` modules under `src/games/*/game.ts` and are tested without rendering.

Do not invent a parallel rules engine. Extend boardgame.io where GamesCabinet needs product shape (room codes, shell UX, catalogue metadata).

## Guiding separations

Keep these concerns apart so a game does not care which mode is running:

| Concern | Lives in | Must not know about |
|---|---|---|
| **State + rules** | `src/games/*/game.ts` | React, Socket.IO, IndexedDB, CSS |
| **UI** | `src/games/*/Board.tsx`, shell components | Persistence internals, transport details |
| **Networking** | `server/`, `src/lib/lobby.ts`, online Client wiring | Board markup |
| **Bots / AI** | boardgame.io `ai.enumerate` + `Local({ bots })` | Online Lobby seats (Phase 1) |
| **Local prefs / seats** | `src/lib/storage.ts` | Game legality |

Deterministic rule: legal move applied to state yields new state. Clients are not trusted for multiplayer legality; the server is authoritative.

## Shared mechanics

GamesCabinet is a platform. Before adding a feature, mechanic, or UI to one game, ask:

1. Does boardgame.io already provide it?
2. Has another cabinet game already implemented it?
3. Are future games likely to reuse it (known pipeline counts)?
4. If yes: abstract into a shared helper, shell component, catalogue flag, or genre kit - then have the game configure or feed that seam.

**Second use (or a clear second use coming) creates the seam.** Do not abstract every one-off on first sight; keep unique rules in `src/games/<id>/`. Do not hard-code one title's assumptions into the shell.

| Kind | Prefer | Notes |
|---|---|---|
| Pure shared rules helpers | `src/games/shared/` or a genre folder | Test without React |
| In-match chrome (status, per-player scores) | `src/components/` + optional `GameMeta` / board props | Games supply values; shell owns layout |
| Solo leaderboards | `server/scores/`, `src/lib/scores.ts` | Any `gameId`; shared UI template still evolving |
| Genre kits (e.g. deckbuilder) | Shared zones / shop / draw-discard-exhaust / turn resources + matching UI | Unmuted, Hogwarts Battle, Agency should share structure so bots can adapt across titles |

Examples of the gate in practice: scoring and per-player score display should not stay Dominoes-only once other scored games arrive; letter-walker led the leaderboard store because 2048 (and other solos) need the same path.

Agent checklist: `.cursor/rules/shared-mechanics.mdc`.

## Presentation layer

boardgame.io decides what happened; GamesCabinet decides how players experience it. Games declare intent (`SemanticAction` in `src/lib/actions.ts`, tabletop components in `src/components/tabletop/`) and the shell chooses the touch pattern, so the interaction language stays the same across the cabinet.

Think **physical semantics, digital presentation**: games expose what things *are* (hand, deck, resource counter, map, tableau, score track), not sprites at coordinates. The shell picks representation (physical / compact / dashboard / list / detail) from viewport and context. Canonical state (`G`) stays authoritative; cinematic state (in-flight motion, counting counters) is client-only interpretation of diffs.

Load-bearing boundaries - animation state never enters `G`, animation never gates input, representation modes belong to the shell, overrides are slots not forks: `docs/adr/0001-ui-operating-system-layer.md`. Player-facing guidelines: [`PRODUCT.md`](./PRODUCT.md), [`DESIGN.md`](./DESIGN.md).

## Repo layout (Phase 1)

Single package (not a packages monorepo yet):

```
src/
  games/          # one folder per game: game.ts, Board.tsx, tests
  components/     # shell / lobby chrome
  pages/          # home, launch, bot / local / online play
  lib/            # catalogue meta, lobby client, storage, theme
server/           # boardgame.io Server, short room codes, static SPA
docs/research/    # AFK research notes
e2e/              # Playwright smokes for host / join / vs-bot paths
```

Strict enough separation today:

- frontend (`src/`) vs backend (`server/`)
- game definitions (`src/games/*/game.ts`) vs boards (`Board.tsx`)
- shared catalogue types (`src/lib/games.ts`)

A future split into `apps/web`, `apps/server`, `packages/*` is allowed if packaging pain appears. Do not restructure for aesthetics.

## Play modes

| Mode | Transport | Notes |
|---|---|---|
| Vs bot | `Local({ bots })` | Client-side; needs `ai.enumerate` |
| Local / hot-seat | offline `Client` or `Local()` | No network |
| Online | Server + Socket.IO + Lobby REST | Room code = `matchID`; seat credentials in browser |

Room join UX: short code only (game resolved via `/rooms/:code`). Shareable path `/g/<game>/<code>`. Details: `docs/research/boardgame-io-rooms.md`.

## Catalogue vs engine

`src/lib/games.ts` is the cabinet catalogue (id, name, blurb, player counts, bot/solo flags). boardgame.io `name` on each `Game` must stay aligned with catalogue ids used in routes and Lobby.

Games are modular folders. Dominoes is one game in the cabinet, not the architecture. Do not hard-code Dominoes assumptions into the shell.

## Persistence (current vs deferred)

**Now:** nickname and per-match seat credentials in `localStorage` (`src/lib/storage.ts`). In-memory boardgame.io DB on the server for local play.

**Phase 2:** IndexedDB for structured local saves / continue; service worker + PWA offline shell. Prefer a small repository abstraction when IndexedDB arrives; do not scatter storage calls through boards.

**Deploy:** durable server store (PostgreSQL or equivalent) when Railway multiplayer must survive restarts. Add `/health` when Railway health checks need it.

## Auth, access, and money

Phase 1: anonymous play. Nickname is display-only; seat credentials prove the right to move, not an account. Settings may hold nickname and default pawn colour.

**Access codes (product intent):** catalogue entries may be hidden until a code is entered (e.g. private IP-sensitive titles, or first-party unlocks). Codes reveal games to the local cabinet; they must not put those titles into public SEO or the default grid. Implementation when needed - not a Phase 1 ladder blocker.

**Entitlements (later, first-party only):** optional one-time unlock for games Bear invents. Never subscriptions, tokens, energy, or play-cap microtransactions. See `PRODUCT.md`.

Do not block open-cabinet solo or room play on login. Do not implement payment processing in Phase 1.

## Bots

Phase 1: boardgame.io `RandomBot` / `MCTSBot` (or equivalent) via `ai.enumerate` - medium deterministic is enough. Greedy / probabilistic / temperature bots and bot-vs-bot labs are growth opportunities, not high priority.

## Security (multiplayer)

- Server validates moves and turn ownership.
- Never trust client game state for online play.
- Short room codes are public match ids; move secrets are long `generateCredentials`, stored per seat in the browser.
- Rate limits and UGC sanitisation when those surfaces exist.

## Testing

- Vitest on `game.ts` (and pure helpers): setup, legal/illegal moves, turns, victory, scoring.
- Prefer driving moves through boardgame.io `Client` or exported pure helpers - do not reimplement rules in tests.
- Playwright smokes for home, vs-bot, host/join (`e2e/`).
- Headless bot-vs-bot / balancing lab is a later capability; keep rules headless-runnable so it stays possible.

## Tooling

- TypeScript strict
- Biome (lint + format), not ESLint/Prettier
- Vitest + Playwright
- `npm run check` before claiming a slice done

## Deploy shape

**Domain:** GamesCabi.net  
**Host:** Railway, linked to the GitHub repo, when Phase 1 is done (four games + tests + vibe check).

Server binds with `PORT` (default 8000) and serves `dist/` for production-style runs. After deploy, run real-world multi-device tests (rooms, reconnect) against the live server.

## Long-term platform goals (deferred)

North-star seams. Do not build ahead of a vertical slice. When a second game needs the same thing, lift it here first (see Shared mechanics).

### Semantic tabletop kit

Grow the declared-object vocabulary until complex titles are mostly rules + art:

- **Zones** - hand, deck, discard, market, tableau, map
- **Resources** - counters with visibility (public / hidden / owner-only)
- **Effects** - reusable gain / lose / draw / move building blocks
- **Legality with reasons** - disabled actions carry "why" for UI and bots
- **Event / diff stream** - state changes consumable for replay, undo, spectating, AI, and cinematic feedback

Stress-test mentally with Terraforming Mars-class density; implement only what the current ladder needs.

### Representation and cinematic layer

Shell-owned modes and a client-side interpreter of canonical diffs (already constrained by ADR 0001). Long-term: queueable feedback movies that never write back to `G`; familiarity-aware speed / summary (product: experience levels in `PRODUCT.md` / `DESIGN.md`).

### Variants and the curiosity ladder

House rules are part of tabletop culture; the platform should preserve them.

| Rung | Shape | Notes |
|---|---|---|
| 0 | Play | 99% of people stay here |
| 1 | Wish one thing differed | Timer off, draw-one dominoes, bigger cards |
| 2 | Toggle rule data | `drawMode: one` - no code |
| 3 | Tiny script | Weird mechanics (Go-Fish Rummikub) without touching render / net / undo |
| 4 | Publish / fork | Lineage visible: Official -> Casual -> Bear's Dominoes |

**Rules as data before code** wherever a parameter captures the change. Forking is a first-class product concept (playlist energy), not a git ceremony. Do not invent a parallel rules engine - variants configure or extend boardgame.io games.

### Game knowledge graph

One structured source of truth per game (concepts, rules, examples, variant diffs, strategy notes). UI surfaces are windows into that graph: hover, concept search (not keyword-only), rulebook chapter, illegal-move explanation, and later grounded "explain this" Q&A that cites graph nodes. Official vs variant rulebooks should be diffable ("what changed"), not rewritten from scratch. Tic-tac-toe stays a handful of nodes; dense games become a linked web. Keep copy layers aligned with `DESIGN.md`.

### Creator path without a caste system

Architecture should allow tinkering inside the cabinet (variants, bots, eventually new games) without forcing an IDE on day one. Prefer room-attached capabilities (analysis sidebar, Chess960, history) over side-channel hacks. No hard wall between "users" and "developers" in the data model - contribution is a later privilege on the same objects.
