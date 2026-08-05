# GamesCabinet

A digital games cabinet: open it, pick a game, play. Rules-enforced digital board games. Small-screen / tap-and-drag first. No ads, no token economies, no accounts (Phase 1).

**Domain:** [GamesCabi.net](https://GamesCabi.net)  
**Seed crystal:** [boardgame.io](https://boardgame.io/)

Product: [`PRODUCT.md`](./PRODUCT.md) · Design: [`DESIGN.md`](./DESIGN.md) · Architecture: [`ARCHITECTURE.md`](./ARCHITECTURE.md)

## Play locally

```bash
npm install
npm run dev
```

- Web: http://localhost:5173/
- Game server: http://localhost:8000/

## Quality gates

| Command | What it runs |
|---|---|
| `npm run check` | Typecheck + Biome lint/format check + Vitest |
| `npm run test` | Unit / rules tests (Vitest) |
| `npm run test:e2e` | Playwright smokes (needs `npm run build` first; serves via game server) |
| `npm run ci` | `check` + production build + e2e |

Game rules changes: red Vitest first, then green in `src/games/*/game.ts`.

Client flows (home, vs bot, host/join): keep Playwright smokes in `e2e/` honest.

First-time e2e browsers: `npx playwright install chromium`

## Phase 1 ladder

1. Tic-tac-toe
2. Connect Four
3. Checkers (English draughts)
4. Dominoes (double-six draw, spinners)

Open a game from the home grid, then choose **Play vs bot** or **Host a room**. Join with a short room code only (game is resolved from the code). Shareable as `/g/<game>/<code>`.

Ship order: four games solid → tests / `check` green → Bear vibe check → Railway on GamesCabi.net → live multi-device tests.

## Wayfinding

Decision map: https://github.com/bearjcc/GamesCabinet/issues/1

## Assets

Kenney (CC0) vendored under `assets/kenney/` and mirrored to `public/assets/kenney/` for Vite.

| Pack | Use |
|---|---|
| `domino-pack` | Dominoes (Vector SVG themes; PNG retained as fallback) |
| `boardgame-pack` | Cards, dice, chips, meeples (SVG) |
| `board-game-icons` | Cabinet / rules icons (SVG) |
| `board-game-info` | Players / duration / tablet meta icons (SVG) |
| `game-icons` (+ expansion / fighter) | General UI glyph sheets (SVG) |
| `input-prompts` | Touch / keyboard / pad prompts (SVG) |

Prefer SVG for the web client. Map of packs to classic games: `docs/research/kenney-asset-map.md`.
