# Research: boardgame.io reference games (Yatzy, Unmuted, 2048)

Sources checked: GitHub API licence metadata, each repo tree for `LICENSE*`, boardgame.io [notable projects](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/notable_projects.md), live `2048-online.io` HTML/JS (no public repo link).

Local clones (gitignored): `.scratch/references/`

## Verdict

| Source | Licence | Use in GamesCabinet |
|---|---|---|
| [PJohannessen/yatzy](https://github.com/PJohannessen/yatzy) | **MIT** | Safe to adapt wholesale. Keep copyright + MIT notice. |
| [shaoster/unmuted2021](https://github.com/shaoster/unmuted2021) | **None published** | Reference / pattern guide only. Do **not** copy code or assets into the product until the author grants a permissive licence (or dual-licence). |
| [2048-online.io](https://2048-online.io/) | **No public source** | Cannot vendor. Live site ships GSAP (GreenSock proprietary licence) and GameDistribution ads; no GitHub code link in notable projects. |
| [gabrielecirulli/2048](https://github.com/gabrielecirulli/2048) (fallback) | **MIT** | Safe rules/UX reference for a GamesCabinet 2048; not boardgame.io. Implement rules ourselves under boardgame.io. |

## Local paths

```
.scratch/references/yatzy/           # MIT, boardgame.io, wholesale candidate
.scratch/references/unmuted2021/     # no licence; deckbuilder architecture guide only
.scratch/references/2048-cirulli/    # MIT classic 2048; not boardgame.io
```

## Yatzy (wholesale OK)

- Live: https://www.lonesomecrowdedweb.com/yatzy/
- Tutorial: https://www.lonesomecrowdedweb.com/blog/yatzy-boardgameio/
- Copyright: Patrick Johannessen, 2019, MIT
- Intent: port/adapt into GamesCabinet as a cabinet game

## Unmuted (guide only)

- Live: https://shaoster.github.io/unmuted2021/
- Core logic (per README): `src/Game.js`, `src/Actions.js`, `src/Events.js`, `src/Schedule.js`; UI in `src/components/`
- Mechanics: Dominion-like resources (Energy/Money/Attention) + Slay the Spire card keywords; single-player deckbuilder
- Intent: structural guide for future Hogwarts Battle / Agency deckbuilders — zones, shop/market, draw/discard/exhaust, turn reset of ephemeral resources
- Blocker: GitHub `license: null`, no `LICENSE` file. Default copyright = all rights reserved. Reading for learning is fine; shipping copies is not.

## 2048 (online site not usable)

- boardgame.io docs list the live site only (no `[code]` link, unlike Yatzy/Unmuted)
- Probed Next.js bundles: GSAP copyright headers; no discoverable public repo
- Closest MIT React/Next clone is [mateuszsokola/2048-in-react](https://github.com/mateuszsokola/2048-in-react) (MIT) but it is **not** boardgame.io and is a different product from `2048-online.io`
- Intent: build GamesCabinet 2048 on boardgame.io using Cirulli MIT as rules/UX reference (or rewrite from scratch)

## Decisions (2026-08-05)

1. **Yatzy** — port/adapt under MIT attribution when that slice is claimed.
2. **Unmuted** — structural example only for deckbuilding on boardgame.io (zones, shop, draw/discard/exhaust, ephemeral turn resources). Do not copy code or assets; rewrite for Hogwarts Battle / Agency later.
3. **2048** — implement ourselves on boardgame.io. Classic puzzle; no need to vendor `2048-online.io`. Cirulli MIT clone in `.scratch` is optional rules/UX reference only.
