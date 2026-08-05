# Product

## Register

product

## Users

People who want a quick, rules-enforced board or tabletop game with friends (or a bot). Small-screen first (phone, or a tablet at high magnification — same problem). Phase 1 has no accounts; if accounts arrive later they are an afterthought that serves a concrete purpose, never a growth funnel.

Context: open the app, pick a game, play. Minimal ceremony.

## Brand / domain

- **Name:** GamesCabinet
- **Domain:** [GamesCabi.net](https://GamesCabi.net) — purchased; deploy via Railway linked to GitHub when Phase 1 is ready.

## Product Purpose

GamesCabinet is a digital games cabinet: a place where games live. It is a reusable platform and launcher for rules-enforced digital board games — not a single-game app, and not a SaaS dashboard.

Success is when the user stops thinking about GamesCabinet and starts thinking about the game. Open the cabinet, choose a game, play. Minimal ceremony.

The collection of games is the primary object. The UI gets out of the way. The cabinet metaphor may subtly influence branding; the chrome must not look like literal furniture.

## Priorities

1. Playing games quickly.
2. Small-screen, drag-and-tap first. Wider screens (click / drag) are second priority.
3. Simple ownership of the session (nickname + room code; no account required).
4. Multiplayer when a connection exists; local / hot-seat and vs-bot without one.
5. Open, rules-honest games — no ads, energy, gems, battle passes, daily play caps, or platform gamification.
6. Modular games that run inside the same shell and engine substrate (boardgame.io).

## Interaction

- Primary: touch — tap and drag on small viewports.
- Secondary: mouse click / drag on wider screens.
- Do not rely on hover for essential information or controls.

## Monetization and access

**Banned forever:** subscriptions; token / gem / energy currencies; battle passes; loot boxes; ads; "three free plays today, buy more to continue"; tournaments that exist to sell currency; other dark-pattern microtransactions.

**Open / free games:** stay free to play. The platform and open games are not paywalled.

**First-party invents (optional later):** a game Bear creates may be sold as a one-time **entitlement** (pay once to unlock that game). Money supports that game's development plus hosting and the site as a whole — not a token economy.

**Access codes (preferred early unlock):** games can stay hidden from the public catalogue until a code is entered. Examples of intent (not a shipped list):

| Code (example) | Reveals | Notes |
|---|---|---|
| `HOGWARTS` | Hogwarts Battle | IP we do not own — private play for invited people; must not appear in public catalogue or search indexes |
| `BEAR` | Smokey Mountain Inn | First-party |
| `CHOOCHOO` | TRACKS | First-party |

Public visitors see only the open cabinet. Codes unlock visibility locally (and later via entitlement if paid unlock ships). Do not implement payment processing in Phase 1.

## Settings (early)

A simple Settings surface is fine: nickname, default pawn / seat colour, theme (already available). Growth later — not a SaaS settings sprawl.

## Phase 1 definition of done

1. Four ladder games solid: Tic-tac-toe, Connect Four, Checkers, Dominoes.
2. Test coverage + `npm run check` / CI green.
3. Bear vibe check (human play on small screen).
4. Then deploy to Railway on GamesCabi.net (GitHub link).
5. Then real-world tests against the live server (rooms, reconnect, multi-device).

**Phase 2 (not Mum / Phase 1 gates):** offline PWA / IndexedDB continue; richer bots; My Games and similar IA growth; third-party packages if ever.

## Brand Personality

Simple. Quiet. Conservative. Lightly playful. Unpretentious. Open-source-ish. Human.

Attitude, not costume: Ken Burns, Factorio, Civilization III, Mac OS X Leopard, Wikipedia, Kongregate, Neal.fun, classic solitaire / puzzle utilities, a library, a bookshelf.

Personality enough that being here is pleasant; never so much that the user came for the UI.

## Anti-references

Not MrBeast. Not RAID: Shadow Legends. Not War Thunder. Not the modern Google Play Store. Not a SaaS landing page. Not Monday.com onboarding. Not modern Steam storefronts. Not Candy Crush / App Store / Netflix homepage energy.

Avoid AI-slop web patterns: giant heroes, pill CTAs, floating cards, decorative gradients, glassmorphism, marketing badges, nested cards, oversized whitespace, copy that advertises instead of describes.

## Design Principles

1. **Software, not a website.** Quiet confidence. Direct controls. Higher information density than a landing page.
2. **The games are the object.** The cabinet holds games; it is not a storefront. Free games sit in the open; unlocks (code or later entitlement) reveal more — never a token shop.
3. **Describe, don't advertise.** Short, matter-of-fact copy. No lifestyle language.
4. **Earn every decoration.** If removing it clarifies the interface, remove it. Buttons look like buttons. Cards are for meaningful objects, not default chrome.
5. **Ken Burns, not MrBeast.** Have something worth attention; do not demand attention. Motion and colour communicate state and objects, not excitement.

## Accessibility & Inclusion

Target WCAG AA contrast. Respect `prefers-reduced-motion`. Keep controls obvious and hit targets usable on small screens and high-magnification tablets. Colour may convey game state but should not be the only signal.
