# Design System

## Overview

GamesCabinet is quiet application UI: a cabinet of games, not a marketing site. Compact density, matter-of-fact type. Personality lives in the brand mark/wordmark, the chosen theme, and the games; chrome stays out of the way.

## Themes

Four themes, cycled from the Shell topbar (`ThemeCycle`): **White → Light → Dark → Black → …**

Persisted as `gamescabinet.theme`. Applied via `data-theme` on `<html>` (FOUC script in `index.html` + `src/lib/theme.ts`).

| Theme | Character |
|---|---|
| **White** | True greys only (Material 50–900, max `#FAFAFA` / min `#212121`). RGB channels equal. |
| **Light** | Butter pecan / easter warmth — cream surfaces, complementary pastels for pops. Default. |
| **Dark** | Late summer night — deep blue sky, pale yellow / light blue ink and accents. |
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
- Home: dense auto-fill game grid, then join row under a divider. Several games should fit in one viewport — collection, not storefront.
- Navigation stays minimal (no large sidebar). Settings (nickname, default pawn colour, theme) is enough early chrome. Mode choice lives on the game launch page.
- **Small-screen first.** Design for phone / high-magnification tablet: tap and drag. Wider screens adapt; click/drag is secondary.
- In play: board dominates. Hand and actions stay reachable; secondary info collapses. Generous hit targets; no hover-only essentials.
- **PlayTable** (`src/components/PlayTable.tsx`): every in-play board uses three slots — **info** (top status/HUD), **board** (fills remaining height, centered), **pew** (optional bottom hand + primary actions). Tokens: `--tap-min`, `--board-max`, `--play-gap`.

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

140ms ease-out on button backgrounds. No entrance motion. Honour `prefers-reduced-motion`.

## Do / Don't

**Do:** denser grids; short descriptive copy; obvious controls; colourful boards.

**Don't:** heroes, eyebrows, pill CTAs, marketing parchment aesthetics (Light theme warmth is chrome, not a landing page), glassmorphism, nested cards, promotional badges, giant type, fake nostalgia.
