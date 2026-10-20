#!/usr/bin/env python3
"""Quality gates for a generated belt-scroller walk pack."""

from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage


def load_manifest(path: Path) -> tuple[dict, Path]:
    manifest = json.loads(path.read_text(encoding="utf-8"))
    core = Path(manifest["coreRoot"])
    return manifest, core


def resolved(core: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else core / path


def numbered(directory: Path, prefix: str = "") -> list[Path]:
    paths: list[tuple[int, Path]] = []
    for path in directory.glob(f"{prefix}*.png"):
        stem = path.stem
        token = stem.removeprefix(prefix)
        if token.isdigit():
            paths.append((int(token), path))
    return [path for _, path in sorted(paths)]


def tight_mask(image: Image.Image, tolerance: int = 55) -> np.ndarray:
    rgba = np.asarray(image.convert("RGBA"))
    if np.any(rgba[..., 3] < 250):
        mask = rgba[..., 3] > 8
    else:
        rgb = rgba[..., :3].astype(np.int16)
        corners = np.concatenate(
            [
                rgb[:8, :8].reshape(-1, 3),
                rgb[:8, -8:].reshape(-1, 3),
                rgb[-8:, :8].reshape(-1, 3),
                rgb[-8:, -8:].reshape(-1, 3),
            ]
        )
        background = np.median(corners, axis=0)
        mask = np.max(np.abs(rgb - background), axis=2) > tolerance
    labels, count = ndimage.label(mask)
    if count:
        sizes = ndimage.sum(mask, labels, range(1, count + 1))
        mask = labels == (int(np.argmax(sizes)) + 1)
    return ndimage.binary_fill_holes(mask)


def bbox(mask: np.ndarray) -> tuple[int, int, int, int] | None:
    ys, xs = np.nonzero(mask)
    if not len(xs):
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def figure_metrics(path: Path) -> dict:
    image = Image.open(path).convert("RGBA")
    mask = tight_mask(image)
    bounds = bbox(mask)
    if bounds is None:
        return {"path": str(path), "empty": True}
    x0, y0, x1, y1 = bounds
    head_limit = y0 + max(1, round((y1 - y0 + 1) * 0.42))
    head_y, head_x = np.nonzero(mask & (np.indices(mask.shape)[0] <= head_limit))
    return {
        "path": str(path),
        "size": list(image.size),
        "bbox": [x0, y0, x1, y1],
        "width": x1 - x0 + 1,
        "height": y1 - y0 + 1,
        "centerX": float((x0 + x1) / 2),
        "bottom": y1,
        "headCenterX": float(head_x.mean()) if len(head_x) else float((x0 + x1) / 2),
    }


def palette_histogram(path: Path, bins: int = 4) -> np.ndarray:
    image = Image.open(path).convert("RGBA")
    rgba = np.asarray(image)
    pixels = rgba[..., :3][tight_mask(image)]
    if not len(pixels):
        return np.zeros(bins**3, dtype=np.float64)
    bucket = np.minimum(bins - 1, pixels.astype(np.int32) * bins // 256)
    index = bucket[:, 0] * bins * bins + bucket[:, 1] * bins + bucket[:, 2]
    histogram = np.bincount(index, minlength=bins**3).astype(np.float64)
    return histogram / histogram.sum()


def add_error(report: dict, message: str) -> None:
    report["errors"].append(message)


def add_warning(report: dict, message: str) -> None:
    report["warnings"].append(message)


def validate_counts(report: dict, label: str, paths: list[Path], expected: int) -> None:
    report["counts"][label] = len(paths)
    if len(paths) != expected:
        add_error(report, f"{label}: expected {expected} frames, found {len(paths)}")


def validate_mirrors(report: dict, right: list[Path], left: list[Path]) -> None:
    if len(right) != len(left):
        return
    failures = []
    for index, (rpath, lpath) in enumerate(zip(right, left), 1):
        right_pixels = np.asarray(Image.open(rpath).convert("RGBA"))
        left_pixels = np.asarray(Image.open(lpath).convert("RGBA"))
        if not np.array_equal(right_pixels[:, ::-1], left_pixels):
            failures.append(index)
    report["mirrorFailures"] = failures
    if failures:
        add_error(report, f"left frames are not exact mirrors at indices {failures}")


def validate_cut_frames(report: dict, label: str, paths: list[Path], height: int) -> list[dict]:
    metrics = [figure_metrics(path) for path in paths]
    report["cutMetrics"][label] = metrics
    if not metrics:
        return metrics
    sizes = {tuple(item.get("size", [])) for item in metrics}
    if len(sizes) != 1:
        add_error(report, f"{label}: cut frames do not share one canvas size")
    if any(item.get("size", [0, 0])[1] != height for item in metrics):
        add_error(report, f"{label}: one or more frames are not {height}px tall")
    bottoms = [item["bottom"] for item in metrics if "bottom" in item]
    if bottoms and len(set(bottoms)) != 1:
        add_error(report, f"{label}: foot line is not shared: {sorted(set(bottoms))}")
    head_centers = [item["headCenterX"] for item in metrics if "headCenterX" in item]
    heights = [item["height"] for item in metrics if "height" in item]
    if head_centers:
        spread = max(head_centers) - min(head_centers)
        report.setdefault("motion", {})[f"{label}HeadSpread"] = spread
        if spread > 10:
            add_warning(report, f"{label}: head moves {spread:.1f}px across the loop")
    if heights:
        spread = max(heights) - min(heights)
        report.setdefault("motion", {})[f"{label}HeightSpread"] = spread
        if spread > 10:
            add_warning(report, f"{label}: figure height changes {spread}px across the loop")
    return metrics


def validate_pose_retention(
    report: dict,
    templates: list[Path],
    renders: list[Path],
    frame_count: int,
    label: str = "right",
) -> None:
    if len(templates) != frame_count or len(renders) != frame_count:
        return
    failures = []
    rows = []
    for index, (template, render) in enumerate(zip(templates, renders), 1):
        tm = figure_metrics(template)
        rm = figure_metrics(render)
        if tm.get("empty") or rm.get("empty"):
            failures.append(index)
            continue
        tw, th = tm["size"]
        height_ratio = rm["height"] / max(1, tm["height"])
        center_delta = abs(rm["centerX"] - tm["centerX"]) / max(1, tw)
        bottom_delta = abs(rm["bottom"] - tm["bottom"]) / max(1, th)
        passed = 0.62 <= height_ratio <= 1.38 and center_delta <= 0.18 and bottom_delta <= 0.12
        rows.append(
            {
                "frame": index,
                "heightRatio": height_ratio,
                "centerDelta": center_delta,
                "bottomDelta": bottom_delta,
                "passed": passed,
            }
        )
        if not passed:
            failures.append(index)
    report.setdefault("poseRetention", {})[label] = rows
    if len(failures) > 2:
        add_error(report, f"{label} pose/framing retention failed on frames {failures}")
    elif failures:
        add_warning(report, f"{label} pose/framing needs review on frames {failures}")


def normalized_lower_mask(path: Path, size: int = 96) -> np.ndarray:
    image = Image.open(path).convert("RGBA")
    mask = tight_mask(image)
    bounds = bbox(mask)
    if bounds is None:
        return np.zeros((size, size), dtype=bool)
    x0, y0, x1, y1 = bounds
    figure = mask[y0 : y1 + 1, x0 : x1 + 1]
    lower = figure[round(figure.shape[0] * 0.48) :, :]
    return np.asarray(
        Image.fromarray((lower * 255).astype(np.uint8)).resize(
            (size, size), Image.Resampling.NEAREST
        )
    ) > 0


def lower_pose_profile(path: Path, bands: int = 16) -> np.ndarray:
    mask = normalized_lower_mask(path)
    rows = []
    for band in np.array_split(mask, bands, axis=0):
        ys, xs = np.nonzero(band)
        if not len(xs):
            rows.extend((0.5, 0.0, 0.0))
            continue
        rows.extend(
            (
                float(xs.mean() / mask.shape[1]),
                float((xs.max() - xs.min() + 1) / mask.shape[1]),
                float(band.mean()),
            )
        )
    return np.asarray(rows, dtype=np.float64)


def validate_template_motion(
    report: dict, label: str, templates: list[Path], renders: list[Path], frame_count: int
) -> None:
    if len(templates) != frame_count or len(renders) != frame_count:
        return
    template_profiles = np.stack([lower_pose_profile(path) for path in templates])
    render_profiles = np.stack([lower_pose_profile(path) for path in renders])
    template_motion = template_profiles - template_profiles.mean(axis=0, keepdims=True)
    render_motion = render_profiles - render_profiles.mean(axis=0, keepdims=True)
    denominator = float(
        np.linalg.norm(template_motion.ravel()) * np.linalg.norm(render_motion.ravel())
    )
    phase_correlation = (
        float(np.dot(template_motion.ravel(), render_motion.ravel()) / denominator)
        if denominator
        else 0.0
    )

    template_masks = [normalized_lower_mask(path) for path in templates]
    render_masks = [normalized_lower_mask(path) for path in renders]
    ious = []
    for template_mask, render_mask in zip(template_masks, render_masks):
        union = template_mask | render_mask
        ious.append(
            float((template_mask & render_mask).sum() / union.sum()) if union.any() else 0.0
        )
    result = {
        "phaseCorrelation": phase_correlation,
        "lowerBodyIoU": ious,
        "meanLowerBodyIoU": float(np.mean(ious)),
        "minimumLowerBodyIoU": float(np.min(ious)),
    }
    report.setdefault("templateMotion", {})[label] = result
    if result["meanLowerBodyIoU"] < 0.38 or result["minimumLowerBodyIoU"] < 0.22:
        add_error(
            report,
            f"{label} template gate: lower-body silhouettes departed from GegX "
            f"(mean IoU {result['meanLowerBodyIoU']:.3f}, "
            f"min {result['minimumLowerBodyIoU']:.3f})",
        )


def validate_motion_diversity(report: dict, paths: list[Path]) -> None:
    if len(paths) < 4:
        return
    frames = [np.asarray(Image.open(path).convert("RGBA")).astype(np.int16) for path in paths]
    if len({frame.tobytes() for frame in frames}) < math.ceil(len(frames) * 0.75):
        add_error(report, "motion gate: too many walk frames are exact duplicates")

    masks = [frame[..., 3] > 8 for frame in frames]
    consecutive = []
    for index in range(len(frames)):
        current = frames[index]
        following = frames[(index + 1) % len(frames)]
        union = masks[index] | masks[(index + 1) % len(frames)]
        changed = np.max(np.abs(current - following), axis=2) > 12
        consecutive.append(float(changed[union].mean()) if union.any() else 0.0)

    quarter = max(1, len(frames) // 4)
    lower_changes = []
    for index, mask in enumerate(masks):
        other = masks[(index + quarter) % len(masks)]
        union = mask | other
        ys, _ = np.nonzero(union)
        if not len(ys):
            lower_changes.append(0.0)
            continue
        cutoff = int(ys.min() + (ys.max() - ys.min() + 1) * 0.55)
        lower_union = union.copy()
        lower_union[:cutoff] = False
        changed = np.logical_xor(mask, other) & lower_union
        lower_changes.append(
            float(changed.sum() / lower_union.sum()) if lower_union.any() else 0.0
        )

    report["motionDiversity"] = {
        "uniqueFrames": len({frame.tobytes() for frame in frames}),
        "consecutivePixelChange": consecutive,
        "meanConsecutivePixelChange": float(np.mean(consecutive)),
        "loopSeamPixelChange": consecutive[-1],
        "quarterCycleLowerMaskChange": lower_changes,
        "meanQuarterCycleLowerMaskChange": float(np.mean(lower_changes)),
    }
    mean_change = float(np.mean(consecutive))
    median_change = float(np.median(consecutive))
    lower_change = float(np.mean(lower_changes))
    if mean_change < 0.025:
        add_error(report, "motion gate: consecutive frames are effectively standing still")
    if lower_change < 0.08:
        add_error(report, "motion gate: legs do not change enough across the walk cycle")
    if median_change and consecutive[-1] > median_change * 2.25:
        add_error(report, "loop gate: last-to-first transition is a visible motion outlier")


def validate_identity(
    report: dict, directional_sources: dict[str, Path], directional_frames: dict[str, list[Path]]
) -> None:
    rows = []
    for direction, source in directional_sources.items():
        frames = directional_frames.get(direction, [])
        if not source.exists() or not frames:
            continue
        source_histogram = palette_histogram(source)
        similarities = [
            float(np.minimum(source_histogram, palette_histogram(path)).sum())
            for path in frames
        ]
        rows.append(
            {
                "direction": direction,
                "source": str(source),
                "paletteSimilarity": similarities,
                "mean": float(np.mean(similarities)),
                "minimum": float(np.min(similarities)),
            }
        )
    report["identity"] = rows
    if not rows:
        add_error(report, "identity gate: no source views were available for comparison")
        return
    for row in rows:
        if row["mean"] < 0.62 or row["minimum"] < 0.52:
            add_error(
                report,
                f"{row['direction']} identity gate: source-view palette retention is too low "
                f"(mean {row['mean']:.3f}, min {row['minimum']:.3f})",
            )


def make_contact_sheet(
    destination: Path,
    lock: Path,
    benchmark: Path,
    templates: list[Path],
    renders: list[Path],
    right: list[Path],
    left: list[Path],
) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    columns = max(12, len(right), len(renders), 2)
    cell_w, cell_h = 150, 180
    label_h = 28
    rows = 5
    sheet = Image.new("RGB", (columns * cell_w, rows * (cell_h + label_h)), (9, 10, 16))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    def place(image_path: Path, column: int, row: int, label: str) -> None:
        image = Image.open(image_path).convert("RGBA")
        image.thumbnail((cell_w - 12, cell_h - 12), Image.Resampling.LANCZOS)
        x = column * cell_w + (cell_w - image.width) // 2
        y = row * (cell_h + label_h) + label_h + (cell_h - image.height) // 2
        checker = Image.new("RGB", image.size, (25, 27, 36))
        checker.paste(image.convert("RGB"), mask=image.getchannel("A"))
        sheet.paste(checker, (x, y))
        draw.text((column * cell_w + 5, row * (cell_h + label_h) + 8), label, fill=(235, 238, 246), font=font)

    place(lock, 0, 0, "HIGH-RES LOCK")
    place(benchmark, 1, 0, "GEMINI BENCHMARK")
    for index, path in enumerate(templates[:columns]):
        place(path, index, 1, f"TEMPLATE {index + 1}")
    for index, path in enumerate(renders[:columns]):
        place(path, index, 2, f"RENDER {index + 1}")
    for index, path in enumerate(right[:columns]):
        place(path, index, 3, f"RIGHT {index + 1}")
    for index, path in enumerate(left[:columns]):
        place(path, index, 4, f"LEFT {index + 1}")
    sheet.save(destination, quality=92)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    args = parser.parse_args()

    manifest_path = Path(args.manifest).resolve()
    manifest, core = load_manifest(manifest_path)
    work = resolved(core, manifest["workRoot"])
    identity = manifest["identity"]
    output = manifest["output"]
    frame_count = int(manifest["motion"]["frameCount"])

    view_root = resolved(core, identity["viewRoot"])
    lock = view_root / "down.png"
    benchmark = resolved(core, identity["benchmark"])
    template_dir = work / "templates" / "walk-right"
    template_down_dir = work / "templates" / "walk-down"
    template_up_dir = work / "templates" / "walk-up"
    render_dir = work / "move-walk-right"
    render_down_dir = work / "move-walk-down"
    render_up_dir = work / "move-walk-up"
    right_dir = work / "walk-right96"
    left_dir = work / "walk-left96"
    down_dir = work / "walk-down96"
    up_dir = work / "walk-up96"
    idle_right_dir = work / "idle-right96"
    idle_left_dir = work / "idle-left96"
    idle_down_dir = work / "idle-down96"
    idle_up_dir = work / "idle-up96"
    report_dir = work / "qa"

    templates = numbered(template_dir, "frame-")
    templates_down = numbered(template_down_dir, "frame-")
    templates_up = numbered(template_up_dir, "frame-")
    renders = numbered(render_dir, "frame-")
    renders_down = numbered(render_down_dir, "frame-")
    renders_up = numbered(render_up_dir, "frame-")
    right = numbered(right_dir)
    left = numbered(left_dir)
    down = numbered(down_dir)
    up = numbered(up_dir)
    idle_right = numbered(idle_right_dir)
    idle_left = numbered(idle_left_dir)
    idle_down = numbered(idle_down_dir)
    idle_up = numbered(idle_up_dir)

    report = {
        "schemaVersion": 1,
        "name": manifest["name"],
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "passed": False,
        "errors": [],
        "warnings": [],
        "counts": {},
        "cutMetrics": {},
    }

    for path, label in ((lock, "identity lock"), (benchmark, "benchmark")):
        if not path.exists():
            add_error(report, f"missing {label}: {path}")

    validate_counts(report, "templates", templates, frame_count)
    validate_counts(report, "templatesDown", templates_down, frame_count)
    validate_counts(report, "templatesUp", templates_up, frame_count)
    validate_counts(report, "renders", renders, frame_count)
    validate_counts(report, "rendersDown", renders_down, frame_count)
    validate_counts(report, "rendersUp", renders_up, frame_count)
    validate_counts(report, "right", right, frame_count)
    validate_counts(report, "left", left, frame_count)
    validate_counts(report, "down", down, frame_count)
    validate_counts(report, "up", up, frame_count)
    validate_counts(report, "idleRight", idle_right, 1)
    validate_counts(report, "idleLeft", idle_left, 1)
    validate_counts(report, "idleDown", idle_down, 1)
    validate_counts(report, "idleUp", idle_up, 1)
    validate_mirrors(report, right, left)
    validate_mirrors(report, idle_right, idle_left)
    validate_cut_frames(report, "right", right, int(output["height"]))
    validate_cut_frames(report, "left", left, int(output["height"]))
    validate_cut_frames(report, "down", down, int(output["height"]))
    validate_cut_frames(report, "up", up, int(output["height"]))
    if manifest["motion"].get("engine") == "gegx-template-controlnet":
        for label, template_paths, render_paths in (
            ("right", templates, renders),
            ("down", templates_down, renders_down),
            ("up", templates_up, renders_up),
        ):
            validate_pose_retention(
                report, template_paths, render_paths, frame_count, label
            )
            validate_template_motion(
                report, label, template_paths, render_paths, frame_count
            )
    elif not str(manifest["motion"].get("engine", "")).endswith("-rig"):
        validate_pose_retention(report, templates, renders, frame_count)
    else:
        report["poseRetention"] = {
            "skipped": True,
            "reason": "deterministic rig uses GegX cadence, not template-scale geometry",
        }
    for direction, paths in (("right", right), ("down", down), ("up", up)):
        directional_report = {"errors": [], "warnings": []}
        validate_motion_diversity(directional_report, paths)
        report.setdefault("directionalMotion", {})[direction] = directional_report.get(
            "motionDiversity", {}
        )
        report["errors"].extend(
            f"{direction}: {message}" for message in directional_report["errors"]
        )
        report["warnings"].extend(
            f"{direction}: {message}" for message in directional_report["warnings"]
        )
    configured_views = identity.get("views", {})
    validate_identity(
        report,
        {
            "right": resolved(core, configured_views.get("right", str(view_root / "right.png"))),
            "down": resolved(core, configured_views.get("down", str(view_root / "down.png"))),
            "up": resolved(core, configured_views.get("up", str(view_root / "up.png"))),
        },
        {"right": right, "down": down, "up": up},
    )

    if lock.exists() and benchmark.exists() and templates and renders and right and left:
        make_contact_sheet(
            report_dir / "contact-sheet.jpg",
            lock,
            benchmark,
            templates,
            renders,
            right,
            left,
        )

    report["passed"] = not report["errors"]
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(json.dumps({"passed": report["passed"], "errors": report["errors"], "warnings": report["warnings"]}, indent=2))
    print(f"report: {report_path}")
    if (report_dir / "contact-sheet.jpg").exists():
        print(f"contact: {report_dir / 'contact-sheet.jpg'}")
    print("SPRITE-QA-OK" if report["passed"] else "SPRITE-QA-FAIL")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
