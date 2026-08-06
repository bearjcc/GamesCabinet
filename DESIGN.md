# Design System

## Overview

GamesCabinet is quiet application UI: a cabinet of games, not a marketing site. Compact density, matter-of-fact type. Personality lives in the brand mark/wordmark, the chosen theme, and the games; chrome stays out of the way.

Player-facing philosophy, verbs, and personas live in [`PRODUCT.md`](./PRODUCT.md). This file is how that philosophy shows up in chrome, motion, interaction, and copy.

## Themes

Four themes, cycled from the Shell topbar (`ThemeCycle`): **White -> Light -> Dark -> Black -> ...**

Persisted as `gamescabinet.theme`. Applied via `data-theme` on `<html>` (FOUC script in `index.html` + `src/lib/theme.ts`).

| Theme | Character |
|---|---|
| **White** | True greys only (Material 50-900, max `#FAFAFA` / min `#212121`). RGB channels equal. |
| **Light** | Butter pecan / easter warmth - cream surfaces, complementary pastels for pops. Default. |
| **Dark** | Late summer night - deep blue sky, pale yellow / light blue ink and accents. |
| **Black** | True greys inverted (same scale as White). |

### Brand pops (theme-stable)

From `public/brand/gamescabinet-logo.png`. Available everywhere; White/Black alias them for accent/you/danger. Light/Dark use softer or night-sky variants.

| Token | Value | Role |
|---|---|---|
| `--brand-navy` | `#0f1620` | Logo frame |
| `--brand-red` | `#d63328` | Rook box |
| `--brand-blue` | `#3a6fad` | Dice box |
| `--brand-green` | `#5f8536` | Pawn box |
| `--brand-yellow` | `#ed9f18` | Spade box |
| `--brand-cream` | `#ebe4cf` | Stamped marks |
| `--brand-umber` | `#5c3a22` | Marks on yellow |

Yellow is fill/mark colour, not body text on light surfaces.

### Neutrals + semantics (per theme)

Chrome tokens: `--bg`, `--surface`, `--surface-2`, `--ink`, `--ink-contrast`, `--muted`, `--line`, `--wait`, `--hover`, `--hover-line`, `--hover-strong`.

Semantic pops: `--accent`, `--accent-ink`, `--you`, `--danger`, `--warn`.

Game objects: `--tile` / `--tile-ink` (cream / umber) stay shared.

Strategy: **restrained**. Theme neutrals carry the shell; brand (or pastel/night) pops mark state and rare emphasis. Boards keep their own saturated colours.

## Typography

- UI: `Source Sans 3`. Fixed rem scale.
- Brand: `Fraunces` on the wordmark only, modest size.
- Weights: 400 body, 600 titles/actions. No display shouting.

## Layout

- Shell ~42rem, tight padding.
- Header: brand (+ title) left; trailing controls + theme cycle right; hairline rule.
- Home: dense auto-fill game grid, then join row under a divider. Several games should fit in one viewport - collection, not storefront.
- Navigation stays minimal (no large sidebar). Settings (nickname, default pawn colour, theme) is enough early chrome. Mode choice lives on the game launch page.
- **Small-screen first.** Design for phone / high-magnification tablet: tap and drag. Wider screens adapt; click/drag is secondary.
- In play: board dominates. Hand and actions stay reachable; secondary info collapses. Generous hit targets; no hover-only essentials.
- **PlayTable** (`src/components/PlayTable.tsx`): every in-play board uses three slots - **info** (top status/HUD), **board** (fills remaining height, centered), **pew** (optional bottom hand + primary actions). Tokens: `--tap-min`, `--board-max`, `--play-gap`.

## Components

### Game tile
Whole tile is the link (neal.fun-style). Square, bordered: name + one-line blurb. Mode choice (bot / host) happens on `/game/:id`.

### Buttons
Radius `5px`. Bordered default. Primary = ink fill (Join, rare emphasis). Not pills. Not bright CTA blue on every tile.

### Inputs / status / join
Same border language. Status uses border + light tint. Join is a section under a divider, not a card.

## Elevation

Surface + 1px line. No floating shadows, glass, or page gradients.

## Motion

Chrome stays still: 140ms ease-out on button backgrounds, no entrance motion on shell surfaces.

Game objects may move, because motion is how a state change reads as physical. Boards use the shared primitives (lift, drop, deal, flip, fan, stack, roll, snap, count) rather than bespoke animation, so a card behaves the same in every game. Motion decorates and never gates - input is honoured immediately and animation is always interruptible.

Prefer simulated weight over full physics: squash, ease-out rotate, soft land, click - enough to say "you rolled" without a die careening across the board. Kenney (CC0) stays the default art; polish comes from the animation language, not hunting new packs. Override art or animation when a game's identity needs it; defaults remain the path of least resistance.

**Intensity** (`MotionCycle`, persisted as `gamescabinet.motion`, applied via `data-motion`):

| Level | Character |
|---|---|
| **Reduced** | No transitions or transforms. Fully playable and legible. |
| **Normal** | Default. Enough weight to read a state change. |
| **Playful** | Longer, bouncier. For people who like it. |

`prefers-reduced-motion` always wins over the stored preference.

**Animation half-life:** the first hour teaches; the hundredth hour waits. Prefer skippable, speedable, and summarisable effects (e.g. "7 abilities resolved - expand") over forced spectacle. Room or player preference beats designer theatre.

Rationale for the object/chrome split: `docs/adr/0001-ui-operating-system-layer.md`.

## Interaction guidelines

These are the day-to-day rules for boards and shell. They implement the product principles without waiting for the full UI OS.

1. **Touch first, one-hand friendly.** Generous tap targets; no pixel-perfect tapping. Drag only when it feels natural (slide a tile, fan a card).
2. **Games declare intent; shell chooses the pattern.** Select a card, choose a hex, roll two dice - same cabinet language every time. Consistency is the platform; art and theme supply personality.
3. **Intent before physical mime.** Prefer "increase steel by 1" over forcing a cube drag when the drag is not meaningful. Animate the cube afterward if shared understanding benefits.
4. **Reading is the default.** Controls appear for the selected object or the current need; they do not permanently compete with the board (Figma / Notion energy).
5. **Selection reveals affordances.** Prefer object-driven actions over invisible mode switches (play / edit / spectator as parallel apps). Modes that change what a click means need a very strong reason.
6. **Disabled actions explain themselves.** "Why can't I?" is part of the interface, not a dead button.
7. **Defaults with override slots.** Shared dice, cards, meeples, tracks - behaviour and interaction stay shared; faces, meshes, and sounds are swappable. Override is the exception.

## Agency guidelines

Evaluate every adaptation (and our own boards) on: **flow** (intent -> effect latency), **agency** (speed / skip / undo / zoom / inspect), **shared understanding** (what happened, whose turn, why), **mechanical friction** (software tax vs tabletop), **emotional fidelity** (feels like the table, not a cutscene).

| Prefer | Avoid |
|---|---|
| Undo and soft confirmation | Modal "Are you sure?" for harmless acts |
| Timers as optional room rules | Mandatory play clocks baked into the game |
| Instant resolve for bookkeeping | Watching the hundredth egg / coin / lightning |
| Quiet, ignorable cues | Coach-mark tours and attention theft |
| Inspect / zoom / history | Hunting for discard piles and production |

Case-study compass: Terraforming Mars and Ascension organise complexity and keep tempo; Smash Up shows how animation + confirmations turn chaos into waiting; Wingspan proves calm fidelity but still over-presents deterministic events; Civ V reveals depth without dumping five hundred buttons on open.

## Experience levels (guideline now; automation later)

Do not ship a separate "beginner mode". Design so guidance can thin out:

| Familiarity | Presentation |
|---|---|
| **First game** | Helpful highlights, slower motion, clear explanations, automatic focus |
| **Tenth** | Guidance fades; motion speeds up; shortcuts become discoverable |
| **Hundredth** | Instant / skip available; chain effects summarise unless expanded; repetitive confirms become undo |

Until the shell can infer familiarity, expose the knobs players already reach for (motion intensity, and later skip / instant). Never trap veterans in the first-hour presentation.

## Copy and knowledge layers

Text is part of the interface, not a manual bolted on the side. Separate three questions: **What is this?** (definition), **How do I play?** (rules), **How do I get better?** (strategy - optional, never mixed into rules).

| Layer | When | Shape |
|---|---|---|
| **0 - Zero words** | UI can demonstrate | No tooltip |
| **1 - Inline** | Hover / focus | One sentence |
| **2 - Rich definition** | Keyword in a definition | Short blurb + related links (Slay the Spire style) |
| **3 - Mini article** | Curiosity deepened | ~200 words, still scannable |
| **4 - Rulebook** | "Official rules" sought | Full text, never forced |
| **5 - Strategy** | Opt-in tips | Separate from rules |

Progressive reading: amount of text expands with curiosity. Context beats encyclopaedia ("this joker stands for the red 8" over every joker rule) - Factorio's contextual tip is the model. Examples beat prose (show a valid run). Variant copy answers **what changed** vs official, not a full rewrite. Illegal moves explain with hoverable concepts. A future "Explain this" control should answer from the same graph, with citations, never a free-floating paragraph.

Long-term: one game knowledge graph feeding tooltips, search, rulebooks, variant diffs, and grounded Q&A - see [`PRODUCT.md`](./PRODUCT.md) and [`ARCHITECTURE.md`](./ARCHITECTURE.md). Tic-tac-toe stays tiny; Spirit Island gets a web.

## Do / Don't

**Do:** denser grids; short descriptive copy; obvious controls; colourful boards; demonstrate before explaining; reversible or clearly safe actions; shared tabletop language across games.

**Don't:** heroes, eyebrows, pill CTAs, marketing parchment aesthetics (Light theme warmth is chrome, not a landing page), glassmorphism, nested cards, promotional badges, giant type, fake nostalgia, forced tutorials, unskippable celebration, beginner-mode walls, storefront chrome in play.
