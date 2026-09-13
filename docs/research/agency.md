# Agency (Space Race deck-builder) — recovered design

Source: private repo [`bearjcc/agency`](https://github.com/bearjcc/agency) (read via GitHub API, April 2026). Public cross-reference: [`bearjcc/deckforge-engine`](https://github.com/bearjcc/deckforge-engine) market-row example names AGENCY as the intended Ascension-pattern consumer.

GamesCabinet implementation: `src/games/agency/`. First playable slice is solo co-op Era 1 with buildings/people assignment, market row, and one mission.

## Theme

Cold War **Space Race** deck-building adventure. Players run a national space agency (NASA, CCCP, ESA, CNSA), complete historical missions, buy cards from faction/world markets, and staff facilities with people. Educational flavour (Wingspan-style trivia) is a design goal in the old repo; not in the cabinet slice yet.

Inspirations named in old docs: The OP adventure deck-builders (Hogwarts Battle, Avatar), Ascension, Slay the Spire board game, Wingspan.

## Core loop (from `docs/RULEBOOK.md` + `docs/GAME_DESIGN.md`)

1. **Round**: reveal one headline Event (effects instant or for the round).
2. **Turn start**: resolve building/administrator passives; apply round events.
3. **Action phase** (any order, no energy cost to play cards — Ascension-style):
   - Play cards from hand (resources, programs, etc.).
   - **Assign people** to buildings (administrators) or astronauts to missions.
   - Place Funding/Innovation tokens on missions (tokens persist on the mission between turns).
   - Buy from market row (US / USSR / World decks in full design; cabinet slice uses one row).
4. **Turn end**: check mission completion; tally era score; discard hand; lose unspent tokens; draw 5; advance rival track in solo.

**Era target**: 10 era points (solo / 1v1 faction) or 20 (2-player faction). Solo opponent is a turn counter that gains 1 era point per your turn.

## Zones and resources

| Zone | Role |
|------|------|
| Deck / hand / discard | Standard deck-builder piles; reshuffle discard when deck empty |
| Play area | Cards played this turn (non-persistent) |
| Market row | Ascension-style face-up row; refill on purchase |
| Buildings (3 locations) | Persistent staff slots — see below |
| Mission area | Active mission(s) with placed Funding/Innovation + assigned astronauts |
| Token pools | **Funding** and **Innovation** (ephemeral per turn unless placed on a mission) |

Starting deck (rulebook): 4× Funding +1, 4× Innovation +1, 2× faction-unique cards.

## Buildings and assigning people

Each player begins with three locations (rulebook names):

| Building | Rulebook role |
|----------|----------------|
| **Research Facility** | Innovation generation and card synergies |
| **Administration Building** | Funding generation and economy |
| **Mission Control** | Mission assignment; upgrades can skip/reveal next mission |

**Administrator / person assignment** (persistent):

- Play a Person card onto a building slot; they stay until removed by an effect or (for astronauts on missions) until the mission resolves.
- Old repo `docs/AGENCY-Card-System.md` gap note: `assigned_to` field, persistent until replaced — same intent as **constructs / reserved allies** in franchise adventure deck-builders.

### Mapping to Aang's Destiny (reserved allies / bending tokens)

**Recovery note:** Neither GamesCabinet nor `bearjcc/agency` uses the tabletop terms *reserved ally* or *bending token* verbatim. GitHub code search on `bearjcc/agency` returns no hits for those strings or for `Aang`. The binding intent is recovered from:

| Source | What it says |
|--------|----------------|
| `docs/AGENCY-Card-System.md` § Critical Implementation Gaps | **People Assignment Persistence (Constructs/Powers)** — people stay assigned until replaced or mission complete; needs `assigned_to` on person cards |
| Same doc, Mission System | **People Assignment**: assign astronauts/engineers to missions **(like constructs)**; success → era points + people return to discard |
| `docs/FRANCHISE_DECK_BUILDING_GAMES_RESEARCH.md` | Lists *Avatar: The Last Airbender – Aang's Destiny* as a franchise-adventure relative; discusses element mastery and adventure scenarios, not token names |
| `docs/RULEBOOK.md` | Assign people to **buildings** (administrators) or **astronauts to missions**; place Funding/Innovation **on missions** (tokens persist between turns) |

#### Physical Aang's Destiny (tabletop, for cabinet translation)

These terms come from The OP's physical game, not from GamesCabinet docs:

| Aang's Destiny (table) | What it is |
|------------------------|------------|
| **Reserved ally** | Ally card played onto a **location** board; stays there across turns until removed or the scenario ends |
| **Bending token** | Wooden token placed on a **mission** or challenge spot to pay element costs; often left on the board until the mission resolves |
| **Location board** | Persistent staging area (like Hogwarts locations) |
| **Adventure / mission card** | Scenario with token thresholds and assigned allies |

#### Agency ↔ Aang ↔ Hogwarts (cabinet seam)

| Aang's Destiny | Hogwarts Battle (cabinet) | Agency (rulebook + slice 1) |
|----------------|---------------------------|-----------------------------|
| Reserved ally on location | Ally played to a location (some persist) | **Person** assigned to a **building** slot (`assignPerson`) |
| Bending token on mission | Influence / damage on villain (spent each fight) | **Funding / Innovation** placed on **mission** (`contribute`; persists until mission completes) |
| Ally stays until scenario ends | Location allies until defeated / game end | Building staff persist; mission astronauts return to discard on success (rulebook; slice 1: buildings only) |
| Element types (water, earth, …) | Spell types, house flavour | **Funding** vs **Innovation** (two resource tracks) |
| Adventure deck progression | Game 1–7 campaign | Era missions (Explorer I in slice 1) |

#### Old-repo data model (not yet ported)

```text
person card.assigned_to → building id | mission id | null
mission.funding_placed, mission.innovation_placed  (persist)
turn pool: funding, innovation  (ephemeral unless contributed)
```

Cabinet slice 1 implements buildings + mission token placement; astronaut-on-mission assignment is listed under open questions.

This is the binding mechanic Bear called out: **people on buildings** and **tokens on missions**, not only one-shot cards from hand.

## Card types (old `cards.json` + docs)

- **PERSON** — astronauts, engineers, scientists, administrators (assign to buildings or missions).
- **FACILITY** — Cape Canaveral, Baikonur, etc. (old data models facilities as cards; rulebook uses fixed locations + upgrades).
- **PROGRAM** — Explorer I, Sputnik, Apollo 11, etc.
- **FUNDING / ENGINEERING / OPERATIONS** — resource and progress cards.
- **NEGATIVE** — Bureaucracy, clog cards.

Effect opcodes documented in `docs/effect-system.md` and `docs/AGENCY-Card-System.md` (ADD_FUNDING, ADD_PROGRESS, TURN_START hooks, etc.). Full resolver not ported to GamesCabinet in slice 1.

## Win / loss

| Mode | Win | Loss / pressure |
|------|-----|-----------------|
| Solo | Faction reaches era target (10) | Rival track reaches 10 first |
| 2p co-op | Faction 20 era points | Same with shared faction |
| 1v1 / 2v2 | First faction to era target with turn parity | Opponent faction |

Missions award era score; some cards grant era score directly.

## Differences from Hogwarts Battle (cabinet)

| | Hogwarts Battle | Agency |
|---|-----------------|--------|
| Market | Fixed stacks (Dominion/Hogwarts) | Market row (Ascension) per deckforge + old design |
| Persistent pieces | Locations, some allies | **People on buildings** + tokens on missions |
| Enemies | Villains + dark arts | Rival faction / turn counter + events |
| Energy | Spell costs in full rules | **No energy** to play cards (rulebook) |
| Co-op | Yes | Yes (faction-based) |

Shared cabinet seam: `src/games/shared/deckbuilder/` (zones, ephemeral resources, market refill).

## Old repo pointers

| Path | Contents |
|------|----------|
| `docs/RULEBOOK.md` | Player-facing rules (authoritative for mechanics) |
| `docs/GAME_DESIGN.md` | Design doc, modes, archetypes |
| `docs/AGENCY-Card-System.md` | Card types, effect opcodes, people-assignment gaps |
| `docs/effect-system.md` | Opcode reference |
| `cards.json` | Card database (US/USSR/WORLD) |
| `events.json` | Headline events |
| `src/AgencyDemo.tsx` | React card/event demos (not boardgame.io) |
| `AgencyGameDemo.tsx`, `CompetitiveMode.tsx` | UI prototypes |
| `app/Services/` | Laravel game services (not explored in this pass) |

## GamesCabinet slice 1 (implemented)

- Solo vs rival track, Era 1 mission **Explorer I**.
- Three buildings with **assignPerson** (persistent slots).
- Market row, Funding/Innovation tokens, play resource cards, buy cards, contribute to mission.
- Board-first UI on PlayTable (hand → building, market row, tap mission to commit tokens); access code `SPUTNIK`.

## Open questions / later slices

- [ ] Full card import from `cards.json` + effect opcode resolver
- [ ] Headline events (`events.json`) at round start
- [ ] Faction decks (NASA / CCCP / ESA / CNSA / World) and asymmetric agencies
- [ ] Multiplayer co-op and versus modes, online seats
- [ ] Era campaign persistence (building upgrades between eras)
- [ ] Astronaut assignment to missions (distinct from building staff) + risk die
- [ ] Bot / enumerate for market-row deck-builder genre kit

## Cross-links

- Queue: `docs/slices.md` (Agency slices)
- Architecture: `ARCHITECTURE.md` (deckbuilder genre kit)
- Deckbuilder reference: `docs/research/boardgame-io-reference-games.md`
