"""Extract card images from Tabletop Simulator Hogwarts Battle workshop mods.

Reads the TTS save JSONs and downloads English CustomDeck face sheets.
TTS stores cards in a NumWidth x NumHeight atlas; the atlas is the source
asset and is not expanded into thousands of derived JPEGs.

Also writes a manifest.json mapping every CardID to its sheet/index so cards
can be correlated with game data later. German-labelled decks and uniform
black/white atlas cells are excluded from the manifest metadata.
"""

import json
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageStat

MODS = {
    "m1": Path.home() / "Documents/My Games/Tabletop Simulator/Mods/Workshop/1349868208.json",
    "m2": Path.home() / "Documents/My Games/Tabletop Simulator/Mods/Workshop/2306377719.json",
}

OUT = Path(__file__).parent / "tts-hb"
SHEETS = OUT / "sheets"
GUID_LABELS = Path.home() / "AppData/Local/Temp/hb-guids.txt"
STARTER_GUIDS = {"432bc1", "a62764", "aab3b4", "e159c0"}


def load_guid_labels():
    if not GUID_LABELS.exists():
        raise FileNotFoundError(f"Missing TTS GUID labels: {GUID_LABELS}")
    labels = {}
    for line in GUID_LABELS.read_text(encoding="utf-8").splitlines():
        if "\t" not in line:
            continue
        label, guid = line.split("\t", 1)
        labels[guid] = label
    return labels


def is_english_deck(mod, guid, labels):
    if mod == "m1":
        return True
    label = labels.get(guid, "")
    return guid in STARTER_GUIDS or bool(label and "_ger_" not in label)


def valid_indices(img, width, height):
    cell_width = img.width / width
    cell_height = img.height / height
    result = []
    for idx in range(width * height):
        x, y = idx % width, idx // width
        box = (
            round(x * cell_width),
            round(y * cell_height),
            round((x + 1) * cell_width),
            round((y + 1) * cell_height),
        )
        stats = ImageStat.Stat(img.crop(box).convert("L"))
        mean = stats.mean[0]
        deviation = stats.stddev[0]
        if deviation >= 3 or 8 <= mean <= 247:
            result.append(idx)
    return result


def record_decks(target, custom, mod):
    for deck_id, d in custom.items():
        existing = target.setdefault(
            d["FaceURL"],
            {
                "url": d["FaceURL"],
                "w": int(d["NumWidth"]),
                "h": int(d["NumHeight"]),
                "back": d.get("BackURL", ""),
                "mods": [],
                "deck_ids": [],
            },
        )
        if mod not in existing["mods"]:
            existing["mods"].append(mod)
        if deck_id not in existing["deck_ids"]:
            existing["deck_ids"].append(deck_id)


def find_decks(objs, all_decks, decks, cards, mod, labels, inherited_allowed=None):
    for o in objs or []:
        custom = o.get("CustomDeck")
        allowed = inherited_allowed
        if custom:
            allowed = is_english_deck(mod, o.get("GUID", ""), labels)
            record_decks(all_decks, custom, mod)
            if allowed:
                record_decks(decks, custom, mod)
        if o.get("CardID") is not None and (mod == "m1" or allowed):
            cards.append(
                {
                    "mod": mod,
                    "card_id": o["CardID"],
                    "nickname": o.get("Nickname") or "",
                    "description": o.get("Description") or "",
                    "gm_notes": o.get("GMNotes") or "",
                }
            )
        find_decks(o.get("ContainedObjects"), all_decks, decks, cards, mod, labels, allowed)


def main():
    all_decks = {}
    decks = {}
    cards = []
    labels = load_guid_labels()
    for mod, path in MODS.items():
        data = json.loads(path.read_text(encoding="utf-8"))
        find_decks(data.get("ObjectStates", []), all_decks, decks, cards, mod, labels)

    SHEETS.mkdir(parents=True, exist_ok=True)

    sheet_files = {}
    for i, (url, _) in enumerate(sorted(all_decks.items())):
        if url not in decks:
            continue
        meta = decks[url]
        dest = SHEETS / f"sheet_{i:03d}.jpg"
        sheet_files[url] = dest
        if dest.exists():
            continue
        candidates = [url]
        if "cloud-3.steamusercontent.com" in url:
            candidates.append(
                url.replace(
                    "http://cloud-3.steamusercontent.com",
                    "https://steamusercontent-a.akamaihd.net",
                )
            )
        for candidate in candidates:
            try:
                req = urllib.request.Request(candidate, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=60) as r:
                    dest.write_bytes(r.read())
                print(f"dl {i:03d} {candidate}", flush=True)
                break
            except Exception as e:  # noqa: BLE001
                print(f"FAIL {candidate}: {e}", flush=True)

    manifest = {"sheets": {}, "cards": []}
    for url, dest in sheet_files.items():
        if not dest.exists():
            continue
        meta = decks[url]
        key = dest.stem
        try:
            img = Image.open(dest).convert("RGB")
        except Exception as e:  # noqa: BLE001
            print(f"BAD IMAGE {dest}: {e}", flush=True)
            continue
        meta = {
            **meta,
            "valid_indices": valid_indices(img, meta["w"], meta["h"]),
        }
        manifest["sheets"][key] = meta

    for c in cards:
        deck_num, idx = divmod(c["card_id"], 100)
        c["index_in_sheet"] = idx
        c["deck_num"] = deck_num
    manifest["cards"] = cards
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    print(f"sheets={len(sheet_files)} cards={len(cards)}")


if __name__ == "__main__":
    sys.exit(main())
