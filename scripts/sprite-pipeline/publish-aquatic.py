"""Copy the clean frames the game actually draws, under short names."""

import shutil
from pathlib import Path

CLEAN = Path("public/arcade/aquatic-rush-clean")
OUT = Path("public/arcade/aquatic-rush")

GROUPS = {
    "idle": [f"sub-0-{i}.png" for i in range(6)],
    "fwd": [f"sub-1-{i}.png" for i in range(4)],
    "back": [f"sub-1-{i}.png" for i in range(4, 8)],
    "turn": [f"sub-2-{i}.png" for i in range(8)],
    "sink": [f"sub-3-{i}.png" for i in range(4)],
    "rise": [f"sub-3-{i}.png" for i in range(4, 8)],
    "boom": [f"sub-4-{i}.png" for i in range(8)],
    "jelly": ["l1-0-1.png", "l1-0-2.png", "l1-0-3.png", "l1-0-4.png"],
    "lion": [f"l1-1-{i}.png" for i in range(8)],
    "urchin": [f"l1-2-{i}.png" for i in range(10)],
    "eel": [f"l1-3-{i}.png" for i in range(8)],
    "ray": [f"l1-4-{i}.png" for i in range(7)],
    "star": [f"l2-0-{i}.png" for i in range(8)],
    "stone": [f"l2-1-{i}.png" for i in range(8)],
    "octo": [f"l2-2-{i}.png" for i in range(10)],
    "box": [f"l2-3-{i}.png" for i in range(3, 8)],
    "cone": [f"l2-4-{i}.png" for i in range(7)],
    "white": [f"l3-0-{i}.png" for i in range(6)],
    "hammer": [f"l3-1-{i}.png" for i in range(6)],
    "moray": [f"l3-2-{i}.png" for i in range(10)],
    "cuda": [f"l3-3-{i}.png" for i in range(8)],
    "tiger": ["l3-4-0-0.png", "l3-4-0-1.png"] + [f"l3-4-{i}.png" for i in range(1, 6)],
    "coin": ["loot-0-0.png"],
    "pile": ["loot-0-3.png"],
    "heap": ["loot-0-4.png"],
    "stack": ["loot-0-6.png"],
    "chest": ["loot-1-1.png"],
    "chest-open": ["loot-1-3.png"],
    "chest-gem": ["loot-1-4.png"],
    "chest-royal": ["loot-1-6.png"],
    "ruby": ["loot-2-0.png"],
    "diamond": ["loot-2-5.png"],
    "crown": ["loot-2-7.png"],
    "goblet": ["loot-2-10.png"],
    "pearls": ["loot-3-2.png"],
    "necklace": ["loot-3-4.png"],
    "watch": ["loot-3-6.png"],
}

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)
missing = []
for name, files in GROUPS.items():
    for i, src in enumerate(files):
        origin = CLEAN / src
        if not origin.exists():
            missing.append(src)
            continue
        shutil.copy(origin, OUT / f"{name}-{i}.png")
print("missing", missing)
print("wrote", len(list(OUT.glob('*.png'))))
