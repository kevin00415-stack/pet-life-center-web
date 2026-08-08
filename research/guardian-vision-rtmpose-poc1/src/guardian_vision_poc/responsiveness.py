"""Quantify bbox-normalized landmark response across sampled video frames."""

from __future__ import annotations

import argparse
import json
import math
import statistics
from pathlib import Path


def analyze(predictions: dict, class_name: str) -> dict:
    samples: list[dict] = []
    for frame in predictions["frames"]:
        matches = [d for d in frame["detections"] if d["class_name"] == class_name]
        if not matches:
            continue
        # This metric is only valid for single-subject clips. Choosing the largest
        # box rejects small duplicate views and is disclosed in the output.
        detection = max(
            matches,
            key=lambda d: (d["bbox_xyxy"][2] - d["bbox_xyxy"][0])
            * (d["bbox_xyxy"][3] - d["bbox_xyxy"][1]),
        )
        x1, y1, x2, y2 = detection["bbox_xyxy"]
        width = max(x2 - x1, 1.0)
        height = max(y2 - y1, 1.0)
        samples.append({
            "frame_index": frame["frame_index"],
            "points": {
                point["name"]: {
                    "x": (point["x"] - x1) / width,
                    "y": (point["y"] - y1) / height,
                    "confidence": point["confidence"],
                }
                for point in detection["ap10k"]
            },
        })

    per_keypoint = {}
    for name in samples[0]["points"] if samples else []:
        values = [sample["points"][name] for sample in samples]
        xs = [value["x"] for value in values]
        ys = [value["y"] for value in values]
        consecutive = [
            math.hypot(xs[index] - xs[index - 1], ys[index] - ys[index - 1])
            for index in range(1, len(values))
        ]
        per_keypoint[name] = {
            "normalized_x_range": max(xs) - min(xs),
            "normalized_y_range": max(ys) - min(ys),
            "normalized_trajectory_span": math.hypot(max(xs) - min(xs), max(ys) - min(ys)),
            "mean_consecutive_displacement": statistics.fmean(consecutive) if consecutive else 0.0,
            "minimum_raw_confidence": min(value["confidence"] for value in values),
        }

    spans = [value["normalized_trajectory_span"] for value in per_keypoint.values()]
    return {
        "class_name": class_name,
        "selection": "largest matching detection per sampled frame; no identity tracker",
        "sampled_frame_indices": [sample["frame_index"] for sample in samples],
        "samples_with_detection": len(samples),
        "mean_keypoint_normalized_span": statistics.fmean(spans) if spans else None,
        "median_keypoint_normalized_span": statistics.median(spans) if spans else None,
        "per_keypoint": per_keypoint,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("predictions", type=Path)
    parser.add_argument("--class-name", choices=("dog", "cat"), required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    payload = json.loads(args.predictions.read_text(encoding="utf-8"))
    result = analyze(payload, args.class_name)
    args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
