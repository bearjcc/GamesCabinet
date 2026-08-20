"""Build a compact English sprite map from local TTS atlas sheets.

The source scans stay outside the repository. This script only commits the
small metadata needed to identify a card inside an atlas.
"""

import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).parent / "tts-hb"
SHEETS = OUT / "sheets"
MANIFEST = OUT / "manifest.json"
TARGET = ROOT / "src/games/hogwarts-battle/data/sprite-assets.json"
TESSERACT = os.environ.get(
    "TESSERACT",
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
)

DATASETS = {
    "cards": [
        ROOT / "src/games/hogwarts-battle/data/cards/starters.json",
        ROOT / "src/games/hogwarts-battle/data/cards/market.json",
    ],
    "villains": [ROOT / "src/games/hogwarts-battle/data/villains/villains.json"],
    "darkArts": [ROOT / "src/games/hogwarts-battle/data/dark_arts/dark_arts.json"],
    "locations": [ROOT / "src/games/hogwarts-battle/data/locations/locations.json"],
}

ALIASES = {
    "quirrell": ["professor quirrell", "quirinus quirrell"],
    "crabbeandgoyle": ["crabbe and goyle", "crabbe goyle"],
    "talesofbeedlethebard": ["the tales of beedle the bard"],
    "timeturner": ["time-turner", "time turner"],
    "bertiebottseveryflavourbeans": [
        "bertie bott's every flavour beans",
        "bertie botts every flavour beans",
    ],
    "crumplehornedsnorkack": ["crumple-horned snorkack", "crumple horned snorkack"],
}

# These titles are legible in the English Game 1 atlas but are not reliably
# returned by OCR because the scan has a photographic background.
MANUAL_ASSETS = {
    "cards": {
        "hedwig": {"sheet": "sheet_111", "index": 3, "cols": 10, "rows": 3},
        "trevor": {"sheet": "sheet_111", "index": 10, "cols": 10, "rows": 3},
        "oliverwood": {"sheet": "sheet_111", "index": 24, "cols": 10, "rows": 3},
    }
}


def normalise(text):
    return re.sub(r"[^a-z0-9]", "", text.lower())


def load_targets():
    targets = {}
    for category, paths in DATASETS.items():
        targets[category] = {}
        for path in paths:
            data = json.loads(path.read_text(encoding="utf-8"))
            for item_id, definition in data.items():
                targets[category].setdefault(item_id, definition["name"])
    return targets


def aliases_for(item_id, name):
    return [normalise(value) for value in [name, *ALIASES.get(item_id, [])]]


def crop_cell(image, index, columns, rows):
    cell_width = image.width / columns
    cell_height = image.height / rows
    x, y = index % columns, index // columns
    box = (
        round(x * cell_width),
        round(y * cell_height),
        round((x + 1) * cell_width),
        round((y + 1) * cell_height),
    )
    return image.crop(box)


def ocr_cell(image, temp_dir):
    path = Path(temp_dir) / "cell.jpg"
    image.save(path, format="JPEG", quality=92)
    result = subprocess.run(
        [TESSERACT, str(path), "stdout", "--psm", "6"],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return normalise(result.stdout)


def sheet_order(manifest):
    def priority(item):
        key, meta = item
        mods = meta.get("mods", [])
        return (0 if "m2" in mods else 1, key)

    return sorted(manifest["sheets"].items(), key=priority)


def main():
    if not Path(TESSERACT).exists():
        raise FileNotFoundError(
            f"Tesseract not found at {TESSERACT}. Set TESSERACT to its executable path."
        )

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    targets = load_targets()
    unresolved = {category: sorted(values) for category, values in targets.items()}
    found = {category: {} for category in targets}

    with tempfile.TemporaryDirectory(prefix="hb-ocr-") as temp_dir:
        for sheet_id, meta in sheet_order(manifest):
            source = SHEETS / f"{sheet_id}.jpg"
            if not source.exists():
                continue
            image = Image.open(source).convert("RGB")
            columns, rows = meta["w"], meta["h"]
            for index in meta.get("valid_indices", range(columns * rows)):
                text = ocr_cell(crop_cell(image, index, columns, rows), temp_dir)
                if not text:
                    continue
                for category, category_targets in targets.items():
                    for item_id, name in category_targets.items():
                        if item_id in found[category]:
                            continue
                        if any(alias and alias in text for alias in aliases_for(item_id, name)):
                            found[category][item_id] = {
                                "sheet": sheet_id,
                                "index": index,
                                "cols": columns,
                                "rows": rows,
                            }
                            unresolved[category].remove(item_id)

    for category, overrides in MANUAL_ASSETS.items():
        for item_id, asset in overrides.items():
            found[category][item_id] = asset
            if item_id in unresolved[category]:
                unresolved[category].remove(item_id)

    result = {
        "language": "en",
        **found,
        "unresolved": unresolved,
    }
    TARGET.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    for category, values in found.items():
        print(f"{category}={len(values)} unresolved={len(unresolved[category])}")


if __name__ == "__main__":
    main()
