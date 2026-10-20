#!/usr/bin/env python3
"""Reusable source-art walk rig.

Preserves a character's authored directional sprites and moves extracted leg
layers deterministically. No character colors, clothes, or anatomy are drawn
by this script.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


BG = (232, 232, 234)


def keyed_figure(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    pixels = np.asarray(image).copy()
    if np.any(pixels[..., 3] < 250):
        mask = pixels[..., 3] > 8
    else:
        rgb = pixels[..., :3].astype(np.int16)
        corners = np.concatenate(
            [
                rgb[:4, :4].reshape(-1, 3),
                rgb[:4, -4:].reshape(-1, 3),
                rgb[-4:, :4].reshape(-1, 3),
                rgb[-4:, -4:].reshape(-1, 3),
            ]
        )
        background = np.median(corners, axis=0)
        mask = np.max(np.abs(rgb - background), axis=2) > 18
    labels, count = ndimage.label(mask)
    if count:
        sizes = ndimage.sum(mask, labels, range(1, count + 1))
        mask = labels == (int(np.argmax(sizes)) + 1)
    mask = ndimage.binary_fill_holes(mask)
    pixels[..., 3] = np.where(mask, 255, 0).astype(np.uint8)
    ys, xs = np.nonzero(mask)
    if not len(xs):
        raise ValueError(f"no figure found in {path}")
    return Image.fromarray(pixels, "RGBA").crop(
        (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    )


def normalize(figure: Image.Image, target_height: int, supersample: int) -> Image.Image:
    height = (target_height - 4) * supersample
    width = max(1, round(figure.width * height / figure.height))
    return figure.resize((width, height), Image.Resampling.NEAREST)


def infer_hip_ratio(front: Image.Image) -> float:
    """Infer the crotch/hip cut from a neutral front A-pose silhouette."""
    alpha = np.asarray(front)[..., 3] > 8
    height, width = alpha.shape
    left = round(width * 0.18)
    right = round(width * 0.82)
    consecutive = 0
    first = 0
    for y in range(round(height * 0.48), round(height * 0.86)):
        row = alpha[y, left:right]
        padded = np.pad(row.astype(np.int8), (1, 1))
        starts = np.flatnonzero(np.diff(padded) == 1)
        ends = np.flatnonzero(np.diff(padded) == -1)
        runs = [
            (start + left, end + left)
            for start, end in zip(starts, ends)
            if end - start >= max(2, round(width * 0.025))
        ]
        centre = width / 2
        has_two_legs = (
            any(end < centre for start, end in runs)
            and any(start > centre for start, end in runs)
        )
        if has_two_legs:
            if consecutive == 0:
                first = y
            consecutive += 1
            if consecutive >= max(3, round(height * 0.015)):
                ratio = first / height
                print(f"auto-rig hip split: row {first}/{height} ({ratio:.3f})")
                return ratio
        else:
            consecutive = 0
    raise ValueError(
        "automatic rig could not identify two separated legs in the front A-pose; "
        "reroll the source view with clearly separated legs"
    )


def lower_components(
    figure: Image.Image, split_ratio: float, expected: int
) -> tuple[Image.Image, list[Image.Image], list[tuple[float, float]]]:
    array = np.asarray(figure).copy()
    alpha = array[..., 3] > 8
    split = min(figure.height - 2, max(1, round(figure.height * split_ratio)))
    lower = alpha.copy()
    lower[:split] = False
    labels, count = ndimage.label(lower)
    candidates: list[tuple[int, int]] = []
    for label in range(1, count + 1):
        ys, xs = np.nonzero(labels == label)
        if not len(xs):
            continue
        score = len(xs) + (figure.height - int(ys.max())) * -2
        candidates.append((score, label))
    candidates.sort(reverse=True)
    chosen = [label for _, label in candidates[:expected]]
    if not chosen:
        raise ValueError("could not isolate any lower-body component")

    # A side plate normally exposes one connected leg. Duplicate that authored
    # leg for depth rather than inventing new shapes.
    if expected == 2 and len(chosen) == 1:
        chosen.append(chosen[0])

    parts: list[Image.Image] = []
    pivots: list[tuple[float, float]] = []
    remove = np.zeros_like(alpha)
    overlap_end = min(figure.height, split + max(2, round(figure.height * 0.055)))
    for label in chosen:
        component = labels == label
        removable = component.copy()
        removable[:overlap_end] = False
        remove |= removable
        part = np.zeros_like(array)
        part[component] = array[component]
        parts.append(Image.fromarray(part, "RGBA"))
        top_band = component[split : min(figure.height, split + max(2, figure.height // 20))]
        ys, xs = np.nonzero(top_band)
        pivot_x = float(xs.mean()) if len(xs) else figure.width / 2
        pivots.append((pivot_x, float(split)))

    base = array.copy()
    base[remove, 3] = 0
    return Image.fromarray(base, "RGBA"), parts, pivots


def tint(layer: Image.Image, amount: float) -> Image.Image:
    array = np.asarray(layer).copy()
    opaque = array[..., 3] > 0
    array[..., :3][opaque] = np.clip(
        array[..., :3][opaque].astype(np.float32) * amount, 0, 255
    ).astype(np.uint8)
    return Image.fromarray(array, "RGBA")


def deformed_leg(
    layer: Image.Image,
    pivot: tuple[float, float],
    foot_dx: float,
    length_scale: float,
    dy: int,
) -> Image.Image:
    px, py = pivot
    travel = max(1.0, layer.height - py)
    shear = foot_dx / travel
    scale = max(0.82, length_scale)
    # Inverse affine for a deformation whose hip remains fixed:
    # x' = x + shear * (y - py), y' = py + scale * (y - py).
    transformed = layer.transform(
        layer.size,
        Image.Transform.AFFINE,
        (
            1.0,
            -shear / scale,
            shear * py / scale,
            0.0,
            1.0 / scale,
            py - py / scale,
        ),
        resample=Image.Resampling.BICUBIC,
    )
    shifted = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    shifted.alpha_composite(transformed, (0, dy))
    return shifted


def articulated_side_leg(
    layer: Image.Image,
    pivot: tuple[float, float],
    swing: float,
    bend: float,
    bob: int,
) -> Image.Image:
    array = np.asarray(layer).copy()
    px, py = pivot
    knee_y = int(round(py + (layer.height - py) * 0.48))
    band = array[max(0, knee_y - 4) : min(layer.height, knee_y + 5), :, 3] > 8
    _, band_x = np.nonzero(band)
    knee_x = float(band_x.mean()) if len(band_x) else px

    thigh = array.copy()
    thigh[min(layer.height, knee_y + 5) :, :, 3] = 0
    boot = array.copy()
    boot[: max(0, knee_y - 5), :, 3] = 0

    thigh_image = Image.fromarray(thigh, "RGBA").rotate(
        swing,
        resample=Image.Resampling.BICUBIC,
        center=(px, py),
    )
    # Facing right, the raised knee points right while the lower leg folds
    # back toward screen-left.
    boot_angle = swing * 0.35 - bend
    boot_image = Image.fromarray(boot, "RGBA").rotate(
        boot_angle,
        resample=Image.Resampling.BICUBIC,
        center=(knee_x, float(knee_y)),
    )

    length = knee_y - py
    radians = math.radians(swing)
    destination_knee = (
        px + math.sin(radians) * length,
        py + math.cos(radians) * length,
    )
    dx = round(destination_knee[0] - knee_x)
    dy = round(destination_knee[1] - knee_y) + bob
    result = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    result.alpha_composite(thigh_image, (0, bob))
    result.alpha_composite(boot_image, (dx, dy))
    return result


def compose_on_canvas(
    source: Image.Image,
    direction: str,
    phase: float,
    target_height: int,
    supersample: int,
    split_ratio: float,
    cadence_bob: int,
) -> Image.Image:
    expected = 1 if direction == "right" else 2
    base, parts, pivots = lower_components(source, split_ratio, expected)
    if len(parts) == 1:
        parts = [tint(parts[0], 0.78), parts[0]]
        pivots = [pivots[0], pivots[0]]

    cycle = math.sin(phase * math.tau)
    depth_phase = math.cos(phase * math.tau)
    bob = cadence_bob
    frame = Image.new("RGBA", source.size, (0, 0, 0, 0))

    if direction == "right":
        swing = cycle * 22.0
        far = articulated_side_leg(
            tint(parts[0], 0.80),
            pivots[0],
            -swing,
            max(0.0, -cycle) * max(0.0, -depth_phase) * 42.0,
            bob,
        )
        near = articulated_side_leg(
            parts[1],
            pivots[1],
            swing,
            max(0.0, cycle) * max(0.0, depth_phase) * 42.0,
            bob,
        )
    else:
        # Toward/away motion reads as alternating foreshortening: one authored
        # leg advances while the other recedes, with a restrained lateral arc.
        spread = cycle * 0.55 * supersample
        left_lift = max(0.0, depth_phase) * 0.20
        right_lift = max(0.0, -depth_phase) * 0.20
        ordered = sorted(
            zip(parts[:2], pivots[:2]), key=lambda item: item[1][0]
        )
        far = deformed_leg(
            tint(ordered[0][0], 0.88),
            ordered[0][1],
            -spread,
            1.0 - left_lift,
            bob,
        )
        near = deformed_leg(
            ordered[1][0], ordered[1][1], spread, 1.0 - right_lift, bob
        )

    frame.alpha_composite(far)
    frame.alpha_composite(base, (0, bob))
    frame.alpha_composite(near)

    canvas_size = target_height * supersample
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    x = (canvas_size - frame.width) // 2
    y = canvas_size - frame.height - 2 * supersample
    canvas.alpha_composite(frame, (x, y))
    return canvas


def render_direction(
    source_path: Path,
    direction: str,
    output: Path,
    frames: int,
    target_height: int,
    supersample: int,
    split_ratio: float,
    cadence: list[int],
) -> None:
    source = normalize(keyed_figure(source_path), target_height, supersample)
    output.mkdir(parents=True, exist_ok=True)
    previews = []
    for index in range(frames):
        frame = compose_on_canvas(
            source,
            direction,
            index / frames,
            target_height,
            supersample,
            split_ratio,
            cadence[index],
        )
        frame.save(output / f"frame-{index + 1}.png")
        previews.append(
            frame.resize(
                (target_height * 2, target_height * 2), Image.Resampling.NEAREST
            )
        )
    previews[0].save(
        output / "source-rig-preview.gif",
        save_all=True,
        append_images=previews[1:],
        duration=110,
        loop=0,
        disposal=2,
    )
    print(f"{direction}: {frames} source-art frames -> {output}")


def extract_cadence(template_dir: Path, frames: int, target_height: int, supersample: int) -> list[int]:
    templates = sorted(
        template_dir.glob("frame-*.png"),
        key=lambda path: int(path.stem.removeprefix("frame-")),
    )
    if len(templates) != frames:
        raise ValueError(
            f"GegX cadence expected {frames} templates, found {len(templates)} in {template_dir}"
        )
    tops: list[int] = []
    heights: list[int] = []
    for path in templates:
        figure = keyed_figure(path)
        tops.append(figure.getbbox()[1])
        heights.append(figure.height)
    # keyed_figure crops each figure, so the pack's height change is the reliable
    # body-bob signal while its documented ground row stays fixed.
    tallest = max(heights)
    scale = ((target_height - 4) * supersample) / max(1, tallest)
    cadence = [round((tallest - height) * scale) for height in heights]
    print(f"GegX cadence bob: {cadence}")
    return cadence


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-right", required=True)
    parser.add_argument("--source-down", required=True)
    parser.add_argument("--source-up", required=True)
    parser.add_argument("--out-root", required=True)
    parser.add_argument("--template-dir", required=True)
    parser.add_argument("--frames", type=int, default=12)
    parser.add_argument("--target-height", type=int, default=96)
    parser.add_argument("--supersample", type=int, default=4)
    args = parser.parse_args()

    root = Path(args.out_root)
    normalized_front = normalize(
        keyed_figure(Path(args.source_down)), args.target_height, args.supersample
    )
    split_ratio = infer_hip_ratio(normalized_front)
    cadence = extract_cadence(
        Path(args.template_dir), args.frames, args.target_height, args.supersample
    )
    for direction, source in (
        ("right", args.source_right),
        ("down", args.source_down),
        ("up", args.source_up),
    ):
        render_direction(
            Path(source),
            direction,
            root / f"move-walk-{direction}",
            args.frames,
            args.target_height,
            args.supersample,
            split_ratio,
            cadence,
        )
    print("SOURCE-WALK-OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
