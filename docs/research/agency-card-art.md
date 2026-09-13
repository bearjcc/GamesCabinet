# Agency card art — visual reference

Bear's comps (2025–2026) for People cards and brand. GamesCabinet implements **layout and colour language** at tabletop scale; photos are placeholders until licensed art ships.

Cross-link: [`agency.md`](./agency.md) (rules and Vault design).

## Brand wordmark

**AGENCY** oval logo: USA navy left (`AGE`), USSR red right (`NCY`), silver needle divider bisecting the **E**. Orbital swoosh and stars left; gold star and rocket trail right. Use on Agency launch/play chrome only — not cabinet shell.

Asset: `public/games/agency/logo.jpg`

## Person card anatomy (shared)

| Zone | Contents |
|------|----------|
| **Funding cost** (top left) | Large numeral; navy ribbon; `$` or funding icon; label "Funding cost" |
| **Identity** (top centre) | Name (caps); title/subtype (e.g. Astronaut, World Engineer); type tag **Person**; optional **Rare** |
| **Faction + eras** (top right) | Faction block (US / USSR / International) with flag or globe; **Eras** chips (e.g. 2, 3) |
| **Portrait band** | Photo or placeholder; mission metadata overlay (dossier variant); program badge |
| **On Play** (mid) | Colour-coded horizontal rows: icon, value, track name, effect sentence |
| **Footer** | Dossier grid: program / role / clearance / date **or** country / bio / quote (infographic variant) |
| **Era tab** (bottom corner) | Angled tab **ERA n** |

### Reference comps

1. **Wernher von Braun (infographic)** — Funding 3, World Engineer, International, Engineering (+2 Innovation), Rocketry, Program Acceleration; Germany origin; Era 1.
2. **John Glenn (US dossier)** — Funding 3, Astronaut, Rare, Eras 2+3; On Play Pilot / Science / Leadership; Mercury footer; TOP SECRET clearance.
3. **Wernher von Braun (USSR dossier alt)** — Layout-density reference only; same On Play row pattern; not default faction assignment (prefer Germany/International for historical coherence).

## Ability track colours (comps → Agency G)

| Comp track | Colour | Agency rules name |
|------------|--------|-------------------|
| Funding cost badge | Navy blue | **Funding** |
| Pilot / Engineering | Blue | Funding (one-shot) or engineering-themed Innovation |
| Science | Green | **Innovation** |
| Rocketry | Green | Innovation / program |
| Leadership | Red / orange | Leadership (future); facility assignment synergy later |
| Program acceleration | Purple | Era / mission progress (future) |

Cabinet slice maps On Play rows to **Funding** (blue) and **Innovation** (green) from `onPlayFunding` / `onPlayInnovation` on person defs.

## Implementation notes

- Typography: **Source Sans 3** (DESIGN.md); no display/Geist stacks on cards.
- Surface: cream tile (`--tile`), 1px border, no glass or page gradients.
- Portrait: Kenney or neutral silhouette placeholder; structure matches comps without shipping photos.
- Phone: hand cards flex ~9–11rem wide; ability rows stay one line where possible.
