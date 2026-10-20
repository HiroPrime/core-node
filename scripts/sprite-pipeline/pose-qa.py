#!/usr/bin/env python3
"""Compare OpenPose geometry for every generated frame against its GegX template."""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from urllib.parse import urlencode

import numpy as np
import requests
from PIL import Image
from scipy import ndimage


def resolved(core: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else core / path


def numbered(directory: Path) -> list[Path]:
    paths = []
    for path in directory.glob("frame-*.png"):
        token = path.stem.removeprefix("frame-")
        if token.isdigit():
            paths.append((int(token), path))
    return [path for _, path in sorted(paths)]


def upload(base_url: str, path: Path, remote_name: str) -> str:
    with path.open("rb") as handle:
        response = requests.post(
            f"{base_url}/upload/image",
            files={"image": (remote_name, handle, "image/png")},
            data={"overwrite": "true"},
            timeout=120,
        )
    response.raise_for_status()
    return response.json()["name"]


def extract_pose(base_url: str, source: Path, destination: Path, prefix: str) -> None:
    if destination.exists():
        return
    remote_name = upload(base_url, source, f"core_pose_qa_{prefix}.png")
    graph = {
        "1": {"class_type": "LoadImage", "inputs": {"image": remote_name}},
        "2": {"class_type": "FluxKontextImageScale", "inputs": {"image": ["1", 0]}},
        "3": {
            "class_type": "OpenposePreprocessor",
            "inputs": {
                "image": ["2", 0],
                "detect_hand": "disable",
                "detect_body": "enable",
                "detect_face": "disable",
                "resolution": 1024,
                "scale_stick_for_xinsr_cn": "disable",
            },
        },
        "4": {
            "class_type": "SaveImage",
            "inputs": {"images": ["3", 0], "filename_prefix": f"CORE/pose-qa/{prefix}"},
        },
    }
    response = requests.post(
        f"{base_url}/prompt",
        json={"prompt": graph, "client_id": "core-pose-qa"},
        timeout=60,
    )
    response.raise_for_status()
    prompt_id = response.json()["prompt_id"]
    deadline = time.monotonic() + 600
    while time.monotonic() < deadline:
        history_response = requests.get(
            f"{base_url}/history/{prompt_id}", timeout=30
        )
        history_response.raise_for_status()
        entry = history_response.json().get(prompt_id)
        if entry:
            for output in entry.get("outputs", {}).values():
                for image in output.get("images", []):
                    query = urlencode(
                        {
                            "filename": image["filename"],
                            "subfolder": image.get("subfolder", ""),
                            "type": image.get("type", "output"),
                        }
                    )
                    payload = requests.get(f"{base_url}/view?{query}", timeout=120)
                    payload.raise_for_status()
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    destination.write_bytes(payload.content)
                    return
            if entry.get("status", {}).get("status_str") == "error":
                raise RuntimeError(f"OpenPose extraction failed for {source}")
        time.sleep(2)
    raise TimeoutError(f"OpenPose extraction timed out for {source}")


def pose_mask(path: Path, size: int = 128) -> np.ndarray:
    rgba = np.asarray(Image.open(path).convert("RGBA"))
    rgb = rgba[..., :3].astype(np.int16)
    bg = np.median(
        np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]], axis=0), axis=0
    )
    mask = np.max(np.abs(rgb - bg), axis=2) > 28
    ys, xs = np.nonzero(mask)
    if not len(xs):
        return np.zeros((size, size), dtype=bool)
    y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
    lower = mask[y0 + int((y1 - y0) * 0.45) : y1 + 1, x0 : x1 + 1]
    return (
        np.asarray(
            Image.fromarray((lower * 255).astype(np.uint8)).resize(
                (size, size), Image.Resampling.NEAREST
            )
        )
        > 0
    )


def chamfer(template: np.ndarray, render: np.ndarray) -> float:
    if template.sum() < 80 or render.sum() < 80:
        return 1.0
    template_distance = ndimage.distance_transform_edt(~template)
    render_distance = ndimage.distance_transform_edt(~render)
    forward = float(render_distance[template].mean())
    backward = float(template_distance[render].mean())
    return (forward + backward) * 0.5 / float(template.shape[0])


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    args = parser.parse_args()

    manifest_path = Path(args.manifest).resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    core = Path(manifest["coreRoot"])
    work = resolved(core, manifest["workRoot"])
    frame_count = int(manifest["motion"]["frameCount"])
    base_url = manifest["comfyUrl"].rstrip("/")
    cache = work / "qa" / "openpose"

    sets = {
        "right": (work / "templates" / "walk-right", work / "move-walk-right"),
        "down": (work / "templates" / "walk-down", work / "move-walk-down"),
        "up": (work / "templates" / "walk-up", work / "move-walk-up"),
    }
    report = {"passed": True, "errors": [], "directions": {}}
    for direction, (template_dir, render_dir) in sets.items():
        templates = numbered(template_dir)
        renders = numbered(render_dir)
        if len(templates) != frame_count or len(renders) != frame_count:
            report["errors"].append(
                f"{direction}: expected {frame_count} template/render frames, "
                f"found {len(templates)}/{len(renders)}"
            )
            continue
        distances = []
        for index, (template, render) in enumerate(zip(templates, renders), 1):
            distance = chamfer(pose_mask(template), pose_mask(render))
            distances.append(distance)
            print(f"{direction} frame {index}: OpenPose distance {distance:.4f}")
        direction_report = {
            "distances": distances,
            "mean": float(np.mean(distances)),
            "maximum": float(np.max(distances)),
        }
        report["directions"][direction] = direction_report
        if direction_report["mean"] > 0.075 or direction_report["maximum"] > 0.14:
            report["errors"].append(
                f"{direction}: OpenPose departed from GegX "
                f"(mean {direction_report['mean']:.4f}, "
                f"max {direction_report['maximum']:.4f})"
            )

    report["passed"] = not report["errors"]
    destination = work / "qa" / "pose-report.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print("POSE-QA-OK" if report["passed"] else "POSE-QA-FAIL")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
