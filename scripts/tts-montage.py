"""Build per-deck montage images from TTS atlas cells for visual identification.

Each montage shows the deck's cards in deck order, tiled, every card labelled
with its sheet index so it can be traced back to sheets/{sheet}.jpg.
"""

import json
import re
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).parent / "tts-hb"
SHEETS = OUT / "sheets"
MONT = OUT / "montages"

rows = json.loads((OUT / "deck-map.json").read_text(encoding="utf-8"))
manifest = json.loads((OUT / "manifest.json").read_text(encoding="utf-8"))

guid_names = {}
for line in Path.home().joinpath("AppData/Local/Temp/hb-guids.txt").read_text().splitlines():
    if "\t" in line:
        name, guid = line.split("\t")
        guid_names.setdefault(guid, name)

# English labelled decks and loose labelled cards from m2 only (skip *_ger)
decks = {}
for r in rows:
    if r["mod"] != "m2" or not r["deck_guid"]:
        continue
    label = guid_names.get(r["deck_guid"], "")
    if not label or "_ger_" in label:
        continue
    decks.setdefault((label, r["deck_guid"]), []).append(r)

# hero starter decks: four unlabelled 10-card decks on the game1 hogwarts sheet
starter_guids = ["432bc1", "a62764", "aab3b4", "e159c0"]
for g in starter_guids:
    cards = [r for r in rows if r["mod"] == "m2" and r["deck_guid"] == g]
    if cards:
        decks[(f"starter_{g}", g)] = cards

# all m1 decks (mod 1 has no Lua labels; identify visually)
m1_decks = {}
for r in rows:
    if r["mod"] != "m1" or not r["deck_guid"]:
        continue
    m1_decks.setdefault(r["deck_guid"], []).append(r)
for g, cards in m1_decks.items():
    label = guid_names.get(g, "")
    safe = f"m1_{label[:-5] if label.endswith('_GUID') else g}"
    decks.setdefault((safe, g), cards)

MONT.mkdir(exist_ok=True)
CARD_W = 360
COLS = 6

for (label, guid), cards in sorted(decks.items()):
    cards = sorted(cards, key=lambda c: c["card_id"])
    imgs = []
    open_sheets = {}
    for c in cards:
        sheet = manifest["sheets"].get(c["sheet"])
        if not sheet:
            continue
        source = open_sheets.setdefault(c["sheet"], Image.open(SHEETS / f"{c['sheet']}.jpg"))
        width, height = sheet["w"], sheet["h"]
        cell_width = source.width / width
        cell_height = source.height / height
        x, y = c["index"] % width, c["index"] // width
        box = (
            round(x * cell_width),
            round(y * cell_height),
            round((x + 1) * cell_width),
            round((y + 1) * cell_height),
        )
        img = source.crop(box)
        ratio = CARD_W / img.width
        img = img.resize((CARD_W, round(img.height * ratio)))
        imgs.append((c["index"], img))
    if not imgs:
        continue
    ch = imgs[0][1].height + 22
    rows_n = (len(imgs) + COLS - 1) // COLS
    sheet_img = Image.new("RGB", (COLS * CARD_W, rows_n * ch), "black")
    draw = ImageDraw.Draw(sheet_img)
    for i, (idx, img) in enumerate(imgs):
        x, y = (i % COLS) * CARD_W, (i // COLS) * ch
        sheet_img.paste(img, (x, y + 22))
        draw.text((x + 6, y + 4), f"idx {idx}", fill="yellow")
    safe = re.sub(r"[^A-Za-z0-9_-]", "_", label)
    sheet_img.save(MONT / f"{safe}.jpg", quality=88)
    print(f"{label}: {len(imgs)} cards -> {safe}.jpg")
