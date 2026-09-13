# Agency card art — visual reference

Bear's comps (2025–2026) for People cards and brand. GamesCabinet implements **layered HTML/CSS** at tabletop scale — not baked card PNGs.

Cross-link: [`agency.md`](./agency.md) (rules and Vault design).

## Architecture (do not bake whole cards)

Person cards are a **`<div>` stack**: CSS owns typography and numbers; **`<img>` layers** own flat icons, portrait plates, and decorative watermarks.

| Layer kind | DOM | Asset source |
|------------|-----|--------------|
| Cost numeral, name, title, ability text, clearance | Text in DOM | Source Sans 3 + CSS |
| Ability row icons | `<img>` | `public/games/agency/icons/{track}.png` (see mapping below) |
| Funding cost ribbon icon | `<img>` | `icons/funding.png` |
| International faction glyph | `<img>` | `icons/globe.png` |
| Portrait plate | `<img>` | `public/games/agency/portraits/{seed}.png` |
| Orbit / capsule watermark | `<img>` | `icons/orbit.png`, `icons/capsule.png` |
| Wordmark (play chrome) | `<img>` | `public/games/agency/logo.jpg` |

**ComfyUI pipeline (Bear's desktop):** checkpoint `assets/playground-v2.5-1024px-aesthetic.fp16.safetensors` + LoRA `assets/sdxl-simple-icons.safetensors` for flat icon pieces at 1024px; export PNGs into the paths below. Person cards stay layered: icons and watermarks are `<img>` only — typography and numerals remain DOM/CSS.

**Code:** `src/games/agency/PersonCard.tsx`, `CardAsset.tsx`, `cardAssets.ts`.

### Icon filenames (committed set)

```
public/games/agency/icons/
  funding.png          — cost badge + Funding ability rows
  engineering.png
  rocketry.png
  acceleration.png
  pilot.png
  science.png          — Innovation / Science ability rows
  leadership.png
  globe.png              — international / world faction badge
  capsule.png            — portrait-band decorative watermark
  orbit.png              — ability-band decorative watermark

public/games/agency/portraits/
  technician.png
  analyst.png
  engineer.png
  …
```

### Track → icon mapping (`cardAssets.ts`)

| Ability track | PNG |
|---------------|-----|
| funding | `funding.png` |
| innovation | `science.png` |
| engineering | `engineering.png` |
| rocketry | `rocketry.png` |
| acceleration | `acceleration.png` |
| pilot | `pilot.png` |
| leadership | `leadership.png` |

US / USSR factions use colour chips only; `globe.png` appears for international and world.

## Brand wordmark

**AGENCY** oval logo: USA navy left (`AGE`), USSR red right (`NCY`), silver needle through the **E**. Play board + catalogue tile only — not cabinet shell.

Asset: `public/games/agency/logo.jpg`

## Person card anatomy (shared)

| Zone | Contents |
|------|----------|
| **Funding cost** (top left) | DOM: label + numeral; `funding.png` behind |
| **Identity** (top centre) | DOM: name, title, Person tag, Rare |
| **Faction** (top right) | DOM: label + faction name; optional `globe.png` |
| **Portrait band** | `<img>` portrait plate; DOM program badge; capsule/orbit watermarks |
| **On Play** (mid) | `<img>` ability icon (~28px) + DOM value, label, effect per row |
| **Footer** | DOM: program / role / clearance stamp text |
| **Era tab** | DOM text |

### Reference comps

1. **Wernher von Braun (infographic)** — Funding 3, World Engineer, International, Engineering / Rocketry / Program Acceleration; Germany origin; Era 1.
2. **John Glenn (US dossier)** — Funding 3, Astronaut, Rare, Eras 2+3; Pilot / Science / Leadership rows; Mercury footer; TOP SECRET.
3. **Wernher von Braun (USSR dossier alt)** — Layout-density reference only; not default faction.

## Ability track colours (comps → Agency G)

| Comp track | Colour | Agency rules name |
|------------|--------|-------------------|
| Funding cost badge | Navy blue | **Funding** |
| Pilot / Engineering | Blue | Funding or engineering-themed Innovation |
| Science | Green | **Innovation** |
| Rocketry | Green | Innovation / program |
| Leadership | Red / orange | Leadership (future) |
| Program acceleration | Purple | Era / mission progress (future) |

Slice maps On Play rows to **Funding** (blue) and **Innovation** (green).

## Implementation notes

- Typography: **Source Sans 3** (DESIGN.md).
- Surface: cream tile, 1px border, no glass or page gradients.
- Phone: hand cards ~9–11rem wide; ability rows one line where possible.
- Ability icons target **24–32px** (`1.75rem` in CSS).
- Missing PNGs: coloured CSS fallbacks via `CardAsset` `onError` until assets are committed.
