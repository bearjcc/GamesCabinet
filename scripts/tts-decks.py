"""Map TTS deck structure: every card -> (bag path, deck GUID, sheet file, grid index).

CardID encodes deck as floor(CardID/100) and index as CardID%100. The deck's
CustomDeck entry (keyed by that same deck number, on the deck object) gives the
FaceURL, which maps to a downloaded sheet file.
"""

import json
from pathlib import Path

MODS = {
    "m1": Path.home() / "Documents/My Games/Tabletop Simulator/Mods/Workshop/1349868208.json",
    "m2": Path.home() / "Documents/My Games/Tabletop Simulator/Mods/Workshop/2306377719.json",
}
OUT = Path(__file__).parent / "tts-hb"
manifest = json.loads((OUT / "manifest.json").read_text(encoding="utf-8"))
url_to_sheet = {v["url"]: k for k, v in manifest["sheets"].items()}

rows = []


def walk(objs, path, mod):
    for o in objs or []:
        name = o.get("Name")
        nick = o.get("Nickname") or ""
        guid = o.get("GUID") or ""
        if name in ("Deck", "DeckCustom") and o.get("ContainedObjects"):
            custom = o.get("CustomDeck") or {}
            for card in o["ContainedObjects"]:
                cid = card.get("CardID")
                if cid is None:
                    continue
                deck_num, idx = divmod(cid, 100)
                deck_def = custom.get(str(deck_num)) or {}
                url = deck_def.get("FaceURL", "")
                sheet = url_to_sheet.get(url, "")
                if sheet:
                    rows.append(
                        {
                            "mod": mod,
                            "path": path,
                            "deck_guid": guid,
                            "deck_size": len(o["ContainedObjects"]),
                            "card_id": cid,
                            "sheet": sheet,
                            "index": idx,
                            "nickname": card.get("Nickname") or "",
                            "description": card.get("Description") or "",
                        }
                    )
        elif name == "Card":
            cid = o.get("CardID")
            if cid is not None:
                deck_num, idx = divmod(cid, 100)
                own_deck = (o.get("CustomDeck") or {}).get(str(deck_num)) or {}
                sheet = url_to_sheet.get(own_deck.get("FaceURL", ""), "")
                if sheet:
                    rows.append(
                        {
                            "mod": mod,
                            "path": path,
                            "deck_guid": guid,
                            "deck_size": 0,
                            "card_id": cid,
                            "sheet": sheet,
                            "index": idx,
                            "nickname": nick,
                            "description": o.get("Description") or "",
                        }
                    )
        elif o.get("ContainedObjects"):
            label = nick or name
            walk(o["ContainedObjects"], f"{path}/{label}", mod)


for mod, mod_path in MODS.items():
    data = json.loads(mod_path.read_text(encoding="utf-8"))
    walk(data.get("ObjectStates", []), "", mod)
(OUT / "deck-map.json").write_text(json.dumps(rows, indent=1), encoding="utf-8")

# summarise decks, labelled with Lua GUID variable names where known
from collections import defaultdict

guid_names = {}
for line in Path.home().joinpath("AppData/Local/Temp/hb-guids.txt").read_text().splitlines():
    if "\t" in line:
        name, guid = line.split("\t")
        guid_names.setdefault(guid, name)

decks = defaultdict(list)
for r in rows:
    decks[(r["mod"], r["path"], r["deck_guid"], r["deck_size"])].append(r)
for (mod, path, guid, size), cards in sorted(decks.items()):
    sheets = {c["sheet"] for c in cards}
    label = guid_names.get(guid, "")
    print(f"{mod} {guid} {label} | {size} cards | {','.join(sorted(sheets))}")
print("total cards mapped:", len(rows))
