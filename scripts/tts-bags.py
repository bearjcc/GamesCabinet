import json
from pathlib import Path

data = json.loads(
    Path.home()
    .joinpath("Documents/My Games/Tabletop Simulator/Mods/Workshop/1349868208.json")
    .read_text(encoding="utf-8")
)
rows = json.loads(
    Path(r"C:\Users\bearj\Herd\GamesCabinet\scripts\tts-hb\deck-map.json").read_text(encoding="utf-8")
)
by_guid = {}
for r in rows:
    if r["mod"] == "m1" and r["deck_guid"]:
        by_guid.setdefault(r["deck_guid"], r)

bags = [o for o in data["ObjectStates"] if o.get("Name") == "Custom_Model_Bag"]
for i, bag in enumerate(bags):
    print(f"--- bag {i} ---")
    for o in bag.get("ContainedObjects", []):
        if o.get("Name") in ("Deck", "DeckCustom") and o.get("ContainedObjects"):
            g = o.get("GUID")
            n = len(o["ContainedObjects"])
            r = by_guid.get(g, {})
            sheet = r.get("sheet", "?")
            print(f"  deck {g} {n} cards sheet={sheet}")
        elif o.get("Name") == "Bag":
            print(f"  [Bag] {o.get('Nickname', '')}")
