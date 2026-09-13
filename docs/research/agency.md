# Agency (Space Race deck-builder) — design notes

Encoded from Bear's **Vault** (`D:\Vault\My Vault`, hub `Projects\AGENCY\`), private repos [`bearjcc/agency`](https://github.com/bearjcc/agency) and [`bearjcc/deckforge-engine`](https://github.com/bearjcc/deckforge-engine), and GamesCabinet `src/games/agency/`.

## Vault hub

| Path | Contents |
|------|----------|
| `Projects\AGENCY\AGENCY - Knowledge Base MOC.md` | Active hub since 2025-10-23 |
| `Projects\AGENCY\` | Research Plan, Implementation Guide, Evolution History (273 Cursor convos Sept–Oct 2025), Ideas Backlog |
| `Areas\Gaming\Game Design\Space-Race-Card-Game.md` | Card types, era geography |
| `Areas\Gaming\Deck Building Mechanics\Hogwarts Battle Mechanics.md` | Ally + location + control/hex token pattern |
| `Archive\bear_voice_reference\` | 2021 origin pitch emails (Zoe) |
| `Archive\AI Conversations\NotebookLM\Agency Era 1` … `Era 4` | Era design dumps |

---

## 2021 Hogwarts → Agency mapping (email to Zoe)

**Competitive 2 or 4 player** (teams USA/USSR; a team is 1 or 2 players).

| Hogwarts Battle | Agency |
|-----------------|--------|
| Coins | **Resources** |
| Bolts | **Science** |
| Games / movies | **Eras:** first satellite, first man in space, first man in orbit, first man on the moon, first space station |
| Villains | **Objectives** (separate pile per team) |
| Horcruxes | **Administration centres** (do **not** do bad stuff like villains/horcruxes) |
| Dark Arts | **World Order** cards (historically inspired news; +/- for either/both teams); 1/turn era 1, 2/turn era 2, etc. |
| Detentions | **Spies** |

**Era flow:** era ends when one team completes all team objectives for that era; game resets except admin centres; add next era cards; losing team still finishes remaining prior-era objectives then can continue.

**Market:** three purchase decks × 2 face-up = **6 choices**: **USA-only**, **USSR-only**, **Germany** (either team). Germany led early then talent reallocated after WWII. Considering flat cost for Soviet allies vs variable USA costs (capitalism theme).

Cabinet naming today: **Resources** → Funding; **Science** → Innovation; **Objectives** → missions; **Administration centres** → **Facilities**; **World Order** → headline events (not built); **Spies** → clog/negative cards (not built).

---

## Card types (Space-Race-Card-Game.md + MOC)

| Type | Examples / role |
|------|-----------------|
| **People** | Astronauts, scientists, engineers, politicians, wilds |
| **Rockets** | Launch hardware, progress |
| **Facilities** | Launch sites, research centres, mission control |
| **Items** | Operations, gear, one-shots |

**Era geography (campaign):** Germany → Mediterranean → Asia → Africa → South America.

**Inspirations:** Slay the Spire board game; The OP franchise deck-builders (Hogwarts Battle, Toy Story Obstacles, Avatar / **Aang's Destiny**); Ascension; Dominion.

---

## People on Facilities ↔ OP Games pattern

From **Hogwarts Battle Mechanics** (Vault): **Ally cards** (persistent), **Locations** with **control tokens**, later **hex tokens**. **Aang's Destiny** is an OP Games thematic reskin of this pattern.

**Bear's binding insight (not spelled out in Vault by name):** placing **People onto Facilities** should feel like **reserved allies / bending tokens** — persistent assignment to locations, not only ephemeral hand play. Admin centres / **Facilities** are the location-like anchors.

| OP Games | Hogwarts Battle (cabinet) | Agency (target) |
|----------|---------------------------|-----------------|
| Ally on location | Ally played; some persist on location | **Person** on **Facility** (`assignPerson`) |
| Control / hex tokens | `currentControl` / `maxControl` on location | **Funding / Innovation** on **mission** (`contribute`) |
| Persistent until scene ends | Staff/allies until removed | Facility staff persist across turns |

Hogwarts cabinet: `src/games/hogwarts-battle/engine/turnLogic.ts` (locations, control tokens, ally play hooks). Agency borrows **persistent board placement**, not villain-control math.

```text
person.assigned_to → facility instance id | mission id | null
facility.cardId    → role (research / administration / mission-control), slots, passives
mission.funding_placed, mission.innovation_placed
```

---

## Important porting note

Older digital Agency was **Laravel / Livewire** at `C:\Users\bearj\Herd\agency\` plus **DeckForge** ([`bearjcc/deckforge-engine`](https://github.com/bearjcc/deckforge-engine)), **not** boardgame.io.

| | Laravel Agency + DeckForge | GamesCabinet |
|---|---------------------------|--------------|
| Engine | JSON-driven browser engine, vanilla JS | boardgame.io rules + React shell |
| Market | Ascension **market row** (DeckForge names AGENCY as consumer) | Shared `deckbuilder/` market refill |
| UI | DeckForge demos / Laravel views | **DESIGN.md** PlayTable — do not clone Hogwarts board chrome |

Port **mechanics and content**; do not expect a drop-in Laravel UI.

---

## Recovery from `bearjcc/agency`

| Path | Contents |
|------|----------|
| `docs/RULEBOOK.md` | Player rules: no energy to play cards; assign administrators to buildings; tokens on missions |
| `docs/AGENCY-Card-System.md` | People Assignment Persistence (**Constructs/Powers**); `assigned_to` field |
| `docs/GAME_DESIGN.md` | Modes, factions (NASA, CCCP, ESA, CNSA) |
| `cards.json` | FACILITY, PERSON, PROGRAM, ENGINEERING, FUNDING, … |
| `events.json` | Headline events |
| `src/AgencyDemo.tsx` | React card demos (not boardgame.io) |

Rulebook vs Vault: rulebook uses **Funding / Innovation** and three starter **locations**; Vault 2021 email uses **resources / science** and **administration centres** — same seams, different labels.

---

## Recovery from `bearjcc/deckforge-engine`

- **Market row (Ascension):** centre row, currency this turn, buy same turn, currency resets — documented as the pattern for AGENCY.
- **Fixed market (Dominion/Hogwarts):** separate pattern; Hogwarts cabinet uses fixed stacks.
- GamesCabinet Agency slice: single market row (DeckForge row pattern); full design needs USA / USSR / Germany (6 face-up) per Vault email.

---

## Core loop (target)

1. **Round:** World Order / headline event (count scales by era).
2. **Turn start:** Facility passives from **assigned People**; event effects.
3. **Action phase:** play cards; **place Facility**; **assign People** to Facilities (or astronauts to missions); commit Funding/Innovation to objectives; buy from market row(s).
4. **Turn end:** objective check; cleanup hand; lose unspent tokens; draw; rival track (solo).

---

## GamesCabinet slice (implemented)

Solo vs rival track, Era 1 objective **Explorer I**, access code `SPUTNIK`.

**People on Facilities (real mechanic):**

- Three **starter Facilities** at setup (rulebook locations).
- **`placeFacility`** — Facility card from hand → persistent row (max 5).
- **`assignPerson`** — Person from hand → open slot on a Facility; **stays assigned** across turns (not discarded on end turn).
- **Turn-start passives:** each staffed Person on a research Facility → +1 Innovation; administration → +1 Funding (per person).
- **Mission Control:** staffed Mission Control lowers Explorer I Funding/Innovation thresholds.
- Board-first: tap Person → tap Facility; tap Facility card in hand to place; tap mission to commit tokens.

Not yet: Rockets/Items kinds, 6-pile market, World Order, Spies, team modes, astronaut-on-mission assignment.

---

## Open questions / later slices

- [ ] Six face-up market (USA ×2, USSR ×2, Germany ×2) and flat vs variable costs
- [ ] World Order events per era count; Spies / clog
- [ ] Team 2v2 USA vs USSR; era reset keeping Facilities
- [ ] Full `cards.json` + opcode resolver; Rockets, Items
- [ ] Astronaut assignment to missions + risk die
- [ ] Multiplayer seats, bots

## Cross-links

- Queue: `docs/slices.md`
- Architecture: `ARCHITECTURE.md`
- Deckbuilder reference: `docs/research/boardgame-io-reference-games.md`
