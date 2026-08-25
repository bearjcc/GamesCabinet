# GamesCabinet

Digital games cabinet: pick a game, play. boardgame.io owns rules; this repo owns the cabinet shell.

Read when starting work:

| File | Why |
|---|---|
| [`docs/slices.md`](docs/slices.md) | Ordered work queue. Source of truth for next slice. |
| [`PRODUCT.md`](PRODUCT.md) | Players, Phase 1 done, copy principles |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Seams, modes, what not to invent |
| [`DESIGN.md`](DESIGN.md) | Interaction and motion |

## Implement next slice

If the user says **implement next slice**, **next slice**, or **continue the queue**: follow [`.cursor/skills/implement-next-slice/SKILL.md`](.cursor/skills/implement-next-slice/SKILL.md). Do not search chat transcripts or `~/.cursor/plans` until `docs/slices.md` has no AFK slice.

## Commands

- Fast: `npm run check` (typecheck + Biome + Vitest)
- Full: `npm run ci` (needs Playwright browsers)
- Dev: `npm run dev` - web :5173, game server :8000

## Hard rules (also in `.cursor/rules/`)

- Shared mechanics gate before new UI or rules helpers.
- Player-facing copy is table language, not pipeline notes.
- Red Vitest (or Playwright for user flows) before implementation.
- Do not commit unless asked. Do not `--no-verify`.
