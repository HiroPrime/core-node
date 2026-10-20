#!/usr/bin/env python3
"""Publish a QA-approved generated walk pack without touching the fallback pack."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image


def resolved(core: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else core / path


def numbered(directory: Path) -> list[Path]:
    return sorted(
        (path for path in directory.glob("*.png") if path.stem.isdigit()),
        key=lambda path: int(path.stem),
    )


def sprite_sheet(rows: list[list[Path]], destination: Path) -> None:
    images = [[Image.open(path).convert("RGBA") for path in row] for row in rows]
    frame_w = max(image.width for row in images for image in row)
    frame_h = max(image.height for row in images for image in row)
    columns = max(len(row) for row in images)
    sheet = Image.new("RGBA", (frame_w * columns, frame_h * len(images)), (0, 0, 0, 0))
    for row_index, row in enumerate(images):
        for column, image in enumerate(row):
            x = column * frame_w + (frame_w - image.width) // 2
            y = row_index * frame_h + frame_h - image.height
            sheet.alpha_composite(image, (x, y))
    sheet.save(destination)


def copy_preview(source_dir: Path, publish: Path, stem: str) -> None:
    for source_name, suffix in (
        ("anim.gif", ".gif"),
        ("anim-3x.gif", "-3x.gif"),
        ("anim-strip.jpg", "-strip.jpg"),
    ):
        source = source_dir / source_name
        if source.exists():
            shutil.copy2(source, publish / f"{stem}{suffix}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    args = parser.parse_args()

    manifest_path = Path(args.manifest).resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    core = Path(manifest["coreRoot"])
    work = resolved(core, manifest["workRoot"])
    publish = resolved(core, manifest["publishRoot"])
    qa_report_path = work / "qa" / "report.json"

    if not qa_report_path.exists():
        print(f"missing QA report: {qa_report_path}")
        return 1
    qa_report = json.loads(qa_report_path.read_text(encoding="utf-8"))
    if not qa_report.get("passed"):
        print("refusing to publish a pack that did not pass QA")
        return 1

    right = numbered(work / "walk-right96")
    left = numbered(work / "walk-left96")
    down = numbered(work / "walk-down96")
    up = numbered(work / "walk-up96")
    idle_right = numbered(work / "idle-right96")
    idle_left = numbered(work / "idle-left96")
    idle_down = numbered(work / "idle-down96")
    idle_up = numbered(work / "idle-up96")
    expected = int(manifest["motion"]["frameCount"])
    if any(len(paths) != expected for paths in (right, left, down, up)):
        print(
            "walk frame count mismatch: "
            f"right={len(right)} left={len(left)} down={len(down)} up={len(up)} expected={expected}"
        )
        return 1
    if any(len(paths) != 1 for paths in (idle_right, idle_left, idle_down, idle_up)):
        print("idle frame count mismatch")
        return 1

    publish.mkdir(parents=True, exist_ok=True)
    for index, path in enumerate(right, 1):
        shutil.copy2(path, publish / f"right-{index}.png")
    for index, path in enumerate(left, 1):
        shutil.copy2(path, publish / f"left-{index}.png")
    for index, path in enumerate(down, 1):
        shutil.copy2(path, publish / f"down-{index}.png")
    for index, path in enumerate(up, 1):
        shutil.copy2(path, publish / f"up-{index}.png")
    shutil.copy2(idle_right[0], publish / "right-idle-1.png")
    shutil.copy2(idle_left[0], publish / "left-idle-1.png")
    shutil.copy2(idle_down[0], publish / "down-idle-1.png")
    shutil.copy2(idle_up[0], publish / "up-idle-1.png")

    identity = manifest["identity"]
    lock = resolved(core, identity["viewRoot"]) / "down.png"
    shutil.copy2(lock, publish / "identity-lock.png")
    sprite_sheet([right, left, down, up], publish / "walk-sheet.png")
    sprite_sheet([idle_right, idle_left, idle_down, idle_up], publish / "idle-sheet.png")
    copy_preview(work / "walk-right96", publish, "right-walk")
    copy_preview(work / "walk-left96", publish, "left-walk")
    copy_preview(work / "idle-right96", publish, "right-idle")
    copy_preview(work / "idle-left96", publish, "left-idle")
    copy_preview(work / "walk-down96", publish, "down-walk")
    copy_preview(work / "walk-up96", publish, "up-walk")
    copy_preview(work / "idle-down96", publish, "down-idle")
    copy_preview(work / "idle-up96", publish, "up-idle")

    qa_contact = work / "qa" / "contact-sheet.jpg"
    if qa_contact.exists():
        shutil.copy2(qa_contact, publish / "qa-contact-sheet.jpg")
    shutil.copy2(qa_report_path, publish / "qa-report.json")
    pose_report = work / "qa" / "pose-report.json"
    if pose_report.exists():
        shutil.copy2(pose_report, publish / "pose-report.json")

    first_frames = {
        "right": Image.open(right[0]),
        "left": Image.open(left[0]),
        "down": Image.open(down[0]),
        "up": Image.open(up[0]),
    }
    package = {
        "schemaVersion": 1,
        "name": manifest["name"],
        "displayName": manifest["displayName"],
        "publishedAt": datetime.now(timezone.utc).isoformat(),
        "directions": ["right", "left", "down", "up"],
        "walkFramesPerDirection": expected,
        "idleFramesPerDirection": 1,
        "frame": {
            "maxWidth": max(image.width for image in first_frames.values()),
            "height": max(image.height for image in first_frames.values()),
            "widthByDirection": {
                direction: image.width for direction, image in first_frames.items()
            },
        },
        "pivot": {"x": 0.5, "y": 1.0},
        "frameMs": int(manifest["output"]["frameMs"]),
        "scaleInGame": int(manifest["output"]["scaleInGame"]),
        "appearanceLock": manifest["identity"]["appearance"],
        "motionEngine": manifest["motion"].get("engine"),
        "motionProvider": manifest["motion"]["provider"],
        "motionLicense": manifest["motion"]["license"],
        "sourceAssetsRedistributed": False,
        "qa": {"passed": True, "warnings": qa_report.get("warnings", [])},
    }
    (publish / "manifest.json").write_text(json.dumps(package, indent=2), encoding="utf-8")
    print(f"PUBLISH-OK {publish}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
