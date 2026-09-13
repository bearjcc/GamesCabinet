# Agency (Space Race deck-builder) — design notes

Encoded from Bear's **Vault** (`Projects\AGENCY\`), private repos [`bearjcc/agency`](https://github.com/bearjcc/agency) and [`bearjcc/deckforge-engine`](https://github.com/bearjcc/deckforge-engine), and GamesCabinet implementation in `src/games/agency/`.

## Vault hub (source of truth on Bear's machine)

| Path (under `D:\Vault\My Vault`) | Contents |
|-----------------------------------|----------|
| `Projects\AGENCY\AGENCY - Knowledge Base MOC.md` | Active hub since 2025-10-23 |
| `Projects\AGENCY\` | Research Plan, Implementation Guide, Evolution History (273 Cursor convos Sept–Oct 2025), Ideas Backlog |
| `Areas\Gaming\Game Design\Space-Race-Card-Game.md` | Card types, era geography, People / Rockets / Facilities / Items |
| `Areas\Gaming\Deck Building Mechanics\Hogwarts Battle Mechanics.md` | OP Games ally + control-token + location pattern (see below) |
| `Archive\bear_voice_reference\` | 2021 origin pitch emails — Hogwarts mapping (see table) |
| `Archive\AI Conversations\NotebookLM\Agency Era 1` … `Era 4` | Era design dumps |

### Vault design summary

- **Genre:** deck-building adventure, **1–4 players**, USA vs USSR Space Race
- **Card types (Vault):** **People**, **Rockets**, **Facilities**, **Items**
- **People:** astronauts, scientists, engineers, politicians, wilds
- **Facilities:** launch sites, research centres, mission control (placeable locations)
- **Eras (Space-Race-Card-Game.md):** Germany → Mediterranean → Asia → Africa → South America (campaign geography; cabinet Era 1 is 1950s US focus)
- **Inspirations:** Slay the Spire board game; The OP franchise deck-builders (Hogwarts Battle, Toy Story Obstacles, Avatar / **Aang's Destiny**); Ascension; Dominion

### 2021 Hogwarts pitch mapping (Vault emails)

| Hogwarts Battle | Agency (pitch) |
|-----------------|----------------|
| Resources / science | Funding / Innovation |
| Eras as movies | Eras as historical chapters |
| Objectives | Missions (villains) |
| Admin centres | Horcruxes → **Facilities** |
| World Order deck | Dark Arts → headline events |
| Spies | Detentions / clog |
| Purchase decks | USA / USSR / Germany (later ESA, CNSA, World) |

### Code locations (outside Vault)

| Location | Role |
|----------|------|
| `C:\Users\bearj\Herd\agency\` | Laravel / Herd prototype |
| [`bearjcc/agency`](https://github.com/bearjcc/agency) | Cards JSON, rulebook, React demos, Laravel services |
| [`bearjcc/deckforge-engine`](https://github.com/bearjcc/deckforge-engine) | Ascension-style market row; names AGENCY as consumer |

## Theme

Cold War **Space Race** deck-building adventure. Players run a national space agency (NASA, CCCP, ESA, CNSA), complete historical missions, buy cards from faction/world markets, and staff **Facilities** with **People**. Educational flavour (Wingspan-style trivia) is a design goal; not in the cabinet slice yet.

## Core loop (rulebook + Vault)

1. **Round:** reveal one headline Event.
2. **Turn start:** resolve Facility / administrator passives; apply round events.
3. **Action phase** (any order, no energy to play cards — Ascension-style):
   - Play cards from hand (resources, programs, rockets, items).
   - **Place Facility** cards onto your board (persistent locations).
   - **Assign People** to Facilities (administrators) or astronauts to missions.
   - Place Funding/Innovation tokens on missions (persist between turns).
   - Buy from market row (US / USSR / World in full design).
4. **Turn end:** mission check; era score; discard hand; lose unspent tokens; draw 5; advance rival track in solo.

**Era target:** 10 era points (solo / 1v1) or 20 (2-player faction).

## Zones and resources

| Zone | Role |
|------|------|
| Deck / hand / discard | Standard deck-builder piles |
| Play area | Cards played this turn (non-persistent) |
| Market row | Ascension-style face-up row |
| **Facilities row** | Placed Facility cards; People assigned here persist |
| Mission area | Active mission(s) + placed Funding/Innovation + assigned astronauts |
| Token pools | **Funding** and **Innovation** (ephemeral per turn unless on a mission) |

Starting deck (rulebook): 4× Funding +1, 4× Innovation +1, 2× faction-unique cards.

## Facilities and assigning People

Rulebook: each player begins with three locations (Research Facility, Administration Building, Mission Control). Vault names these **Facilities** as a card type (launch sites, research centres, mission control).

Cabinet model:

- **Starter facilities** — three pre-placed at setup (rulebook defaults).
- **Place Facility** — play a Facility card from hand onto the facilities row (board-first).
- **Assign Person** — tap person in hand, tap a facility with an open slot; staff persist until removed.

### People on Facilities ↔ OP Games pattern (Bear's binding insight)

Vault names **People + Facilities**. It does **not** spell out Aang's Destiny *reserved allies* / *bending tokens* by name — that mapping is Bear's design intent for cabinet feel:

| OP Games (physical) | Hogwarts Battle (cabinet) | Agency (intended) |
|---------------------|---------------------------|-------------------|
| Ally on location | Ally played; some stay on location | **Person** on **Facility** (`assignPerson`) |
| Control / influence tokens on location | `controlTokens` vs `maxControl` on `currentLocation` | **Funding / Innovation** on **mission** (`contribute`) |
| Persistent placement until scene ends | Location allies until defeated | Facility staff persist; mission tokens until mission completes |
| Hex / horcrux spots | Location deck + control track | Facility row + mission meter |

Hogwarts cabinet reference (`src/games/hogwarts-battle/engine/turnLogic.ts`): locations have `currentControl` / `maxControl`; allies played trigger horcrux hooks; locations revealed from a deck. Agency borrows the **persistent board placement** feel, not the villain-control math.

#### Physical Aang's Destiny (tabletop)

| Term | Meaning |
|------|---------|
| **Reserved ally** | Ally card on a location board until removed |
| **Bending token** | Token committed to a mission spot until the mission resolves |

#### Old-repo constructs mapping (`bearjcc/agency`)

`docs/AGENCY-Card-System.md` § People Assignment Persistence (**Constructs/Powers**): `assigned_to` on person cards; staff stay until replaced or mission ends.

```text
person.assigned_to → facility instance id | mission id | null
facility.cardId    → facility def (role, slots, passives)
mission.funding_placed, mission.innovation_placed
```

## Card types

| Vault | `bearjcc/agency` `cards.json` | Cabinet slice |
|-------|------------------------------|---------------|
| People | PERSON | `person` |
| Rockets | ENGINEERING / PROGRAM | `program` (stub) |
| Facilities | FACILITY | `facility` |
| Items | OPERATIONS / FUNDING | `resource`, `program` |

Examples from `cards.json`: Cape Canaveral, Baikonur, NASA HQ, Explorer I, Neil Armstrong. Opcode resolver not ported yet.

## Win / loss

| Mode | Win | Loss / pressure |
|------|-----|-----------------|
| Solo | Faction era target (10) | Rival track reaches 10 |
| 2p co-op | Faction 20 | Same |
| 1v1 / 2v2 | First faction to target | Opponent faction |

## Differences from Hogwarts Battle (cabinet)

| | Hogwarts Battle | Agency |
|---|-----------------|--------|
| Market | Fixed stacks | Market row (Ascension) |
| Persistent pieces | Locations, allies | **People on Facilities** + tokens on missions |
| Enemies | Villains + dark arts | Rival track + events |
| Energy | Spell costs | **No energy** to play cards |
| Co-op | Yes | Yes (faction-based) |

Shared seam: `src/games/shared/deckbuilder/`.

## Repo pointers

| Path | Contents |
|------|----------|
| `docs/RULEBOOK.md` | Player-facing rules |
| `docs/GAME_DESIGN.md` | Modes, archetypes |
| `docs/AGENCY-Card-System.md` | Types, opcodes, assignment gaps |
| `cards.json` | Card database |
| `events.json` | Headline events |

## GamesCabinet implementation

- Solo vs rival track, Era 1 mission **Explorer I**.
- **Starter facilities** + **placeFacility** from hand; **assignPerson** onto facility instances.
- Market row, Funding/Innovation, board-first mission commit; access code `SPUTNIK`.

## Open questions / later slices

- [ ] Rockets and Items as distinct kinds; full `cards.json` import + opcode resolver
- [ ] Headline events (`events.json`)
- [ ] Faction decks (NASA / CCCP / ESA / CNSA / World)
- [ ] Multiplayer co-op and versus, online seats
- [ ] Era campaign persistence (facility upgrades between eras)
- [ ] Astronaut assignment to missions + risk die
- [ ] Bot / enumerate for market-row genre kit

## Cross-links

- Queue: `docs/slices.md`
- Architecture: `ARCHITECTURE.md`
- Deckbuilder reference: `docs/research/boardgame-io-reference-games.md`
