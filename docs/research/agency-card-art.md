# Agency card art — visual reference

Bear's comps (2025–2026) for People cards and brand. GamesCabinet implements **layered HTML/CSS** at tabletop scale — not baked card PNGs.

Cross-link: [`agency.md`](./agency.md) (rules and Vault design).

## Architecture (do not bake whole cards)

Person cards are a **`<div>` stack**: CSS owns typography and numbers; **`<img>` layers** own flat icons, portrait plates, and decorative watermarks.

| Layer kind | DOM | Asset source |
|------------|-----|--------------|
| Cost numeral, name, title, ability text, clearance | Text in DOM | Source Sans 3 + CSS |
| Ability row icons | `<img>` | `public/games/agency/icons/ability-{track}.png` |
| Funding cost ribbon icon | `<img>` | `icons/funding-cost.png` |
| Faction glyph | `<img>` | `icons/faction-{us\|ussr\|international\|world}.png` |
| Portrait plate | `<img>` | `public/games/agency/portraits/{seed}.png` |
| Orbit / blueprint watermark | `<img>` | `icons/orbit-watermark.png`, `icons/blueprint-watermark.png` |
| Wordmark (play chrome) | `<img>` | `public/games/agency/logo.jpg` |

**ComfyUI pipeline (Bear's desktop):** LoRA `assets\sdxl-simple-icons.safetensors` for flat icon/graphic pieces; portraits and backgrounds exported separately. Drop PNGs into the paths above — `CardAsset` shows them when present and CSS fallbacks until they land.

**Code:** `src/games/agency/PersonCard.tsx`, `CardAsset.tsx`, `cardAssets.ts`.

### Expected icon filenames

```
public/games/agency/icons/
  ability-funding.png
  ability-innovation.png
  ability-leadership.png
  ability-engineering.png
  ability-rocketry.png
  ability-acceleration.png
  funding-cost.png
  faction-us.png
  faction-ussr.png
  faction-international.png
  faction-world.png
  orbit-watermark.png
  blueprint-watermark.png

public/games/agency/portraits/
  technician.png
  analyst.png
  engineer.png
  …
```

## Brand wordmark

**AGENCY** oval logo: USA navy left (`AGE`), USSR red right (`NCY`), silver needle through the **E**. Play board + catalogue tile only — not cabinet shell.

Asset: `public/games/agency/logo.jpg`

## Person card anatomy (shared)

| Zone | Contents |
|------|----------|
| **Funding cost** (top left) | DOM: label + numeral; optional `funding-cost.png` behind |
| **Identity** (top centre) | DOM: name, title, Person tag, Rare |
| **Faction** (top right) | DOM: label + faction name; optional `faction-*.png` |
| **Portrait band** | `<img>` portrait plate; DOM program badge overlay |
| **On Play** (mid) | `<img>` ability icon + DOM value, label, effect per row |
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
- Missing PNGs: coloured CSS fallbacks via `CardAsset` `onError` until ComfyUI assets are committed.
