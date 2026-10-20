#!/usr/bin/env python3
"""Deterministic chibi walk: exact identity head plus a solved two-bone body rig."""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


BG = (232, 232, 234)
OUTLINE = (25, 22, 29, 255)
GRAY = (125, 121, 122, 255)
GRAY_FAR = (91, 88, 93, 255)
BLACK = (30, 25, 31, 255)
BLACK_FAR = (18, 16, 21, 255)
SKIN = (245, 169, 139, 255)
SKIN_FAR = (202, 126, 112, 255)
BELT = (223, 220, 213, 255)


def identity_mask(image: Image.Image) -> np.ndarray:
    rgb = np.asarray(image.convert("RGB")).astype(np.int16)
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
    return ndimage.binary_fill_holes(mask)


def extract_head(identity: Image.Image) -> Image.Image:
    rgba = np.asarray(identity.convert("RGBA")).copy()
    mask = identity_mask(identity)
    ys, xs = np.nonzero(mask)
    if not len(xs):
        raise ValueError("identity reference has no keyed figure")
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    figure_h = y1 - y0 + 1
    head_bottom = y0 + round(figure_h * 0.40)
    head_mask = mask.copy()
    head_mask[head_bottom + 1 :] = False
    hy, hx = np.nonzero(head_mask)
    pad = 1
    crop = (
        max(0, int(hx.min()) - pad),
        max(0, int(hy.min()) - pad),
        min(identity.width, int(hx.max()) + pad + 1),
        min(identity.height, int(hy.max()) + pad + 1),
    )
    rgba[..., 3] = np.where(head_mask, 255, 0).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA").crop(crop)


def point_mapper(figure_h: float, center_x: float, top: float):
    def mapped(point: tuple[float, float]) -> tuple[float, float]:
        # stickwalk faces left; mirror canonical x so this pack faces screen-right.
        return center_x - point[0] * figure_h, top + point[1] * figure_h

    return mapped


def lerp(a: tuple[float, float], b: tuple[float, float], amount: float) -> tuple[float, float]:
    return a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount


def draw_stroke(
    draw: ImageDraw.ImageDraw,
    points: list[tuple[float, float]],
    color: tuple[int, int, int, int],
    width: float,
) -> None:
    outline_width = max(3, round(width * 1.18))
    fill_width = max(1, round(width))
    draw.line(points, fill=OUTLINE, width=outline_width, joint="curve")
    outer_radius = outline_width / 2
    for x, y in (points[0], points[-1]):
        draw.ellipse(
            [x - outer_radius, y - outer_radius, x + outer_radius, y + outer_radius],
            fill=OUTLINE,
        )
    draw.line(points, fill=color, width=fill_width, joint="curve")
    radius = fill_width / 2
    for x, y in points:
        draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=color)


def draw_leg(
    draw: ImageDraw.ImageDraw,
    mapped,
    skeleton: dict,
    colors: tuple[tuple[int, int, int, int], tuple[int, int, int, int]],
    scale: float,
) -> None:
    hip = mapped(skeleton["hip"])
    knee = mapped(skeleton["knee"])
    ankle = mapped(skeleton["ankle"])
    toe = mapped(skeleton["toe"])
    heel = mapped(skeleton["heel"])
    skin, boot = colors
    boot_top = lerp(knee, ankle, 0.63)
    draw_stroke(draw, [hip, knee, boot_top], skin, 7.2 * scale)
    draw_stroke(draw, [boot_top, ankle, toe], boot, 9.2 * scale)
    draw_stroke(draw, [heel, ankle], boot, 8.3 * scale)


def draw_arm(
    draw: ImageDraw.ImageDraw,
    mapped,
    shoulder: tuple[float, float],
    skeleton: dict,
    colors: tuple[tuple[int, int, int, int], tuple[int, int, int, int]],
    scale: float,
) -> None:
    shoulder_px = mapped(shoulder)
    elbow = mapped(skeleton["elbow"])
    hand = mapped(skeleton["hand"])
    sleeve, skin = colors
    draw_stroke(draw, [shoulder_px, elbow, hand], sleeve, 6.8 * scale)
    hand_radius = 3.1 * scale
    hx, hy = hand
    draw.ellipse(
        [
            hx - hand_radius * 1.18,
            hy - hand_radius * 1.18,
            hx + hand_radius * 1.18,
            hy + hand_radius * 1.18,
        ],
        fill=OUTLINE,
    )
    draw.ellipse(
        [hx - hand_radius, hy - hand_radius, hx + hand_radius, hy + hand_radius],
        fill=skin,
    )


def draw_core(
    draw: ImageDraw.ImageDraw,
    mapped,
    skeleton: dict,
    scale: float,
) -> None:
    shoulder = mapped(skeleton["shoulder"])
    hip = mapped(skeleton["hip"])
    sx, sy = shoulder
    hx, hy = hip
    shoulder_half = 9.0 * scale
    waist_half = 7.4 * scale
    crop_y = sy + (hy - sy) * 0.70
    torso = [
        (sx - shoulder_half, sy - 2 * scale),
        (sx + shoulder_half, sy - 2 * scale),
        (hx + waist_half, crop_y),
        (hx - waist_half, crop_y),
    ]
    draw.polygon(torso, fill=GRAY, outline=OUTLINE)
    # Black camisole edge and the bare waist below the cropped sweater.
    draw.line(
        [(sx - shoulder_half * 0.55, sy), (sx + shoulder_half * 0.55, sy)],
        fill=BLACK,
        width=max(1, round(2 * scale)),
    )
    waist = [
        (hx - waist_half, crop_y),
        (hx + waist_half, crop_y),
        (hx + waist_half * 1.05, hy + 1 * scale),
        (hx - waist_half * 1.05, hy + 1 * scale),
    ]
    draw.polygon(waist, fill=SKIN, outline=OUTLINE)
    shorts = [
        (hx - 8.0 * scale, hy - 1 * scale),
        (hx + 8.0 * scale, hy - 1 * scale),
        (hx + 8.5 * scale, hy + 8 * scale),
        (hx + 1.0 * scale, hy + 10 * scale),
        (hx - 7.5 * scale, hy + 8 * scale),
    ]
    draw.polygon(shorts, fill=BLACK, outline=OUTLINE)
    draw.line(
        [(hx - 7.5 * scale, hy), (hx + 7.5 * scale, hy)],
        fill=BELT,
        width=max(1, round(2.2 * scale)),
    )
    draw.rectangle(
        [
            hx - 1.6 * scale,
            hy - 1.2 * scale,
            hx + 1.6 * scale,
            hy + 1.4 * scale,
        ],
        fill=BLACK,
        outline=BELT,
        width=max(1, round(scale)),
    )


def render_frame(
    solve_frame,
    head: Image.Image,
    phase: float,
    target_size: int,
    supersample: int,
    props: dict,
) -> Image.Image:
    canvas_size = target_size * supersample
    figure_h = (target_size - 7) * supersample
    top = 2.5 * supersample
    center_x = target_size * 0.47 * supersample
    mapped = point_mapper(figure_h, center_x, top)
    skeleton = solve_frame(phase, props)

    layer = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    scale = supersample

    draw_leg(draw, mapped, {**skeleton["leg_far"], "hip": skeleton["hip"]}, (SKIN_FAR, BLACK_FAR), scale)
    draw_arm(draw, mapped, skeleton["shoulder"], skeleton["arm_far"], (GRAY_FAR, SKIN_FAR), scale)
    draw_core(draw, mapped, skeleton, scale)
    draw_leg(draw, mapped, {**skeleton["leg_near"], "hip": skeleton["hip"]}, (SKIN, BLACK), scale)
    draw_arm(draw, mapped, skeleton["shoulder"], skeleton["arm_near"], (GRAY, SKIN), scale)

    head_point = mapped(skeleton["head"])
    desired_height = round(props["HEAD_R"] * 2.22 * figure_h)
    head_width = max(1, round(head.width * desired_height / head.height))
    head_scaled = head.resize((head_width, desired_height), Image.Resampling.NEAREST)
    head_x = round(head_point[0] - head_width * 0.48)
    head_y = round(head_point[1] - desired_height * 0.49)
    layer.alpha_composite(head_scaled, (head_x, head_y))

    background = Image.new("RGB", layer.size, BG)
    background.paste(layer, (0, 0), layer)
    return background


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--identity", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--tool-root", required=True)
    parser.add_argument("--frames", type=int, default=12)
    parser.add_argument("--target-height", type=int, default=96)
    parser.add_argument("--supersample", type=int, default=4)
    args = parser.parse_args()

    tool_root = Path(args.tool_root).resolve()
    sys.path.insert(0, str(tool_root))
    from stickwalk import solve_frame  # type: ignore

    identity = Image.open(args.identity).convert("RGB")
    head = extract_head(identity)
    output = Path(args.out)
    output.mkdir(parents=True, exist_ok=True)

    props = {
        "HEAD_R": 0.205,
        "SHOULDER_Y": 0.385,
        "HIP_Y": 0.605,
        "L_THIGH": 0.182,
        "L_SHIN": 0.172,
        "ANKLE_H": 0.045,
        "STRIDE": 0.112,
        "LIFT": 0.082,
        "HIP_BOB": 0.022,
        "L_UPPER": 0.132,
        "L_FORE": 0.120,
        "FOOT_LEN": 0.092,
        "HEEL_LEN": 0.027,
        "LEAN": math.radians(4.0),
        "A_ARM": math.radians(27.0),
    }

    preview_frames: list[Image.Image] = []
    for index in range(args.frames):
        image = render_frame(
            solve_frame,
            head,
            index / args.frames,
            args.target_height,
            args.supersample,
            props,
        )
        path = output / f"frame-{index + 1}.png"
        image.save(path)
        preview = image.resize(
            (args.target_height * 2, args.target_height * 2),
            Image.Resampling.NEAREST,
        )
        preview_frames.append(preview)
        print(f"{path.name} phase={index / args.frames:.3f}")

    preview_frames[0].save(
        output / "rig-preview.gif",
        save_all=True,
        append_images=preview_frames[1:],
        duration=90,
        loop=0,
        disposal=2,
    )
    print(f"RIG-WALK-OK {args.frames} frames -> {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
