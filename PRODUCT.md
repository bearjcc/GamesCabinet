# Product

## Register

product

## Users

People who want a quick, rules-enforced board or tabletop game with friends (or a bot). Small-screen first (phone, or a tablet at high magnification - same problem). Phase 1 has no accounts; if accounts arrive later they are an afterthought that serves a concrete purpose, never a growth funnel.

Nobody wakes up wanting to "use GamesCabinet". They want to **play**. Everything else serves that.

Context: open the app, pick a game, play. Minimal ceremony. Player-first for months: no players means no future creators.

### Player verbs

These are the product atoms. Navigation and copy organise around verbs, not data models (rooms, assets, plugins).

| Verb | Intent |
|---|---|
| **Discover** | I wonder what I could play. |
| **Learn** | I don't know this game. |
| **Join** | My friend sent a link. |
| **Continue** | Finish yesterday's game. |
| **Play** | It's my turn. |
| **Watch** | I'm observing. |
| **Think** | I need to examine the board. |
| **Discuss** | Wait - why did you do that? |
| **Experiment** | What happens if...? |
| **Teach** | I'm introducing someone. |
| **Celebrate** | We won. |
| **Come back** | Play again sometime. |

Implementation details (create account, configure settings, install assets) are not player verbs.

### Player personas (Phase 1 lens)

Confidence levels differ; the goal does not. Optimise for **confidence**, not for stripping possibilities.

| Persona | What they want | Hate / fear |
|---|---|---|
| **Board gamer** | Forget the software; play a game they already know | Forced tutorials, slow spectacle |
| **Solitaire player** | Quiet ritual; predictability | Chat, dancing chrome, surprises |
| **Experienced at life** (e.g. grandma) | Cards that look like cards; grandson invited them | Breaking something; jargon (room ID, latency) |
| **Friend clicked a link** | Where am I? Who with? Is it my turn? How long? | Onboarding maze before the table |
| **Exhausted adult** | Calm; resume; friends waiting | Confetti, "Did you know?", spinning logos |
| **Curious kid** | Poke and discover (Coolmath / neal.fun energy) | Clicks that break things |
| **NYT-games player** | One clean page, one obvious action, instant play | Sign-in walls; ceremony |

Every screen should answer, for the person in front of it: **Where am I? What can I do right now? What just happened? Whose turn?**

### Shared attention

Unlike a spreadsheet, a board game focuses everyone on the same evolving state. Every UI element should either support the shared table or get out of the way. Animations, notifications, and chrome are judged by whether they help people stay in sync - not by individual "delight".

## Brand / domain

- **Name:** GamesCabinet
- **Domain:** [GamesCabi.net](https://GamesCabi.net) - purchased; deploy via Railway linked to GitHub when Phase 1 is ready.

## Product Purpose

GamesCabinet is a digital games cabinet: a place where games live. It is a reusable platform and launcher for rules-enforced digital board games - not a single-game app, and not a SaaS dashboard.

Success is when the user stops thinking about GamesCabinet and starts thinking about the game. Open the cabinet, choose a game, play. Minimal ceremony.

The collection of games is the primary object. The UI gets out of the way. The cabinet metaphor may subtly influence branding; the chrome must not look like literal furniture.

## Priorities

1. Playing games quickly.
2. Small-screen, drag-and-tap first. Wider screens (click / drag) are second priority.
3. Simple ownership of the session (nickname + room code; no account required).
4. Multiplayer when a connection exists; local / hot-seat and vs-bot without one.
5. Open, rules-honest games - no ads, energy, gems, battle passes, daily play caps, or platform gamification.
6. Modular games that run inside the same shell and engine substrate (boardgame.io).

## Interaction

- Primary: touch - tap and drag on small viewports.
- Secondary: mouse click / drag on wider screens.
- Do not rely on hover for essential information or controls.

## Monetization and access

**Banned forever:** subscriptions; token / gem / energy currencies; battle passes; loot boxes; ads; "three free plays today, buy more to continue"; tournaments that exist to sell currency; other dark-pattern microtransactions.

**Open / free games:** stay free to play. The platform and open games are not paywalled.

**First-party invents (optional later):** a game Bear creates may be sold as a one-time **entitlement** (pay once to unlock that game). Money supports that game's development plus hosting and the site as a whole - not a token economy.

**Access codes (preferred early unlock):** games can stay hidden from the public catalogue until a code is entered. Examples of intent (not a shipped list):

| Code (example) | Reveals | Notes |
|---|---|---|
| `HOGWARTS` | Hogwarts Battle | IP we do not own - private play for invited people; must not appear in public catalogue or search indexes |
| `BEAR` | Smokey Mountain Inn | First-party |
| `CHOOCHOO` | TRACKS | First-party |

Public visitors see only the open cabinet. Codes unlock visibility locally (and later via entitlement if paid unlock ships). Do not implement payment processing in Phase 1.

## Settings (early)

A simple Settings surface is fine: nickname, default pawn / seat colour, theme (already available). Growth later - not a SaaS settings sprawl.

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
2. **The games are the object.** The cabinet holds games; it is not a storefront. Free games sit in the open; unlocks (code or later entitlement) reveal more - never a token shop.
3. **Describe, don't advertise.** Short, matter-of-fact copy. No lifestyle language.
4. **Earn every decoration.** If removing it clarifies the interface, remove it. Buttons look like buttons. Cards are for meaningful objects, not default chrome.
5. **Ken Burns, not MrBeast.** Have something worth attention; do not demand attention. Motion and colour communicate state and objects, not excitement.
6. **The game is the interface.** Once play begins, the platform disappears. The board is primary; everything else is supporting cast.
7. **Information arrives when useful.** No earlier, no later. Just-in-time, not front-loaded manuals.
8. **Undo over confirmation.** Never ask permission for harmless actions. Interruptions must earn their existence.
9. **Progressive disclosure, not beginner mode.** Every advanced feature begins life as a simple one. Complexity is revealed, not locked away.
10. **Trust the user.** Assume curiosity. Guide when asked; do not talk down, upsell, or demand attention. Customisation is additive, not required.
11. **Mastery over novelty.** Presentation fades with repetition; mechanics deepen with skill. Optimise for the hundredth hour, not only the first screenshot. *The first time, teach. The tenth time, assist. The hundredth time, disappear.*
12. **Physical semantics, digital presentation.** The game still thinks in decks, hands, dice, maps, and tokens. The shell chooses the best phone-friendly representation (physical, compact, dashboard, list, detail). Intent first; animate the physical flavour afterward when it helps shared understanding.

### Manifesto (pin above the monitor)

> Players came to play a game, not learn our website.
>
> Never explain what can be demonstrated.
>
> Never interrupt when feedback will do.
>
> Every action should feel reversible, or clearly safe.
>
> The board is the primary interface; everything else is supporting cast.
>
> Respect the player's attention as much as their time.
>
> The software should feel like a well-set table: everything you need is within reach, nothing is in the way, and guests instinctively know where to sit.

## UX study references

Study how these treat the user (not their colour schemes): Linear, Notion, Figma, VS Code, Obsidian, Blender, GitHub (notifications / progressive permission), Apple HIG, GNOME HIG, KDE Plasma (progressive customisation), Steam Library / Deck, Plex, Nintendo Switch home, iA Writer. BoardGameGeek for information richness to surface more gently. Digital board adaptations as case studies: Terraforming Mars and Ascension for flow and agency; Smash Up as a warning against spectacle that becomes bookkeeping; Wingspan for emotional fidelity; Civ V for progressive disclosure; Slay the Spire / Balatro for animation half-life (veterans skip).

Essay lineage worth rereading when stuck: Don Norman (*Everyday Things*), Alan Cooper (*About Face*), Bret Victor (*Magic Ink*, *Inventing on Principle*), Jef Raskin (*The Humane Interface*).

Interaction and motion details: [`DESIGN.md`](./DESIGN.md). Seams and deferred platform shape: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Long-term goals (not Phase 1 gates)

North-star product outcomes. Ship only when a vertical slice needs them; do not block the ladder.

| Goal | Intent |
|---|---|
| **Easiest phone tabletop** | One-thumb play; games declare actions; shell owns the interaction pattern so every title feels like one platform. |
| **UI OS for tabletop** | boardgame.io owns rules; GamesCabinet owns experience - zones, resources, visibility, "why can't I?", cinematic feedback for free. |
| **Experience that adapts** | Guidance and animation intensity fade with familiarity; instant / skip / summary modes for veterans; room-level agency (timers optional, not forced). |
| **House rules without leaving** | Variants feel like playlists: toggleable rule data first; tiny scripts for weird ideas; fork lineage ("Bear's Dominoes") visible and remixable. |
| **Ladder of curiosity** | Play -> wish one thing differed -> toggle a house rule -> script a mechanic -> publish. No wall between "user" and "developer". |
| **Game knowledge graph** | One source of truth for concepts, rules, variants, and examples - shown as hover, search, rulebook, "why illegal", or later grounded Q&A. Scales from tic-tac-toe to Terraforming Mars. |
| **Calm catalogue at scale** | Hundreds of games without storefront noise: library energy (Steam Library / Plex), not ad slots. |

Creator and monetisation surfaces stay pre-monetisation and player-led for as long as possible. Tampermonkey-shaped tinkering before IDE-shaped tooling.

## Accessibility & Inclusion

Target WCAG AA contrast. Respect `prefers-reduced-motion`. Keep controls obvious and hit targets usable on small screens and high-magnification tablets. Colour may convey game state but should not be the only signal. Reduced motion is a full play path, not a downgrade.
