"""Compare representative same-subject poses using bbox-normalized landmarks."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path


FOCUS_POINTS = (
    "NECK", "TAIL_ROOT",
    "L_SHOULDER", "R_SHOULDER",
    "L_ELBOW", "R_ELBOW",
    "L_FRONT_PAW", "R_FRONT_PAW",
    "L_HIP", "R_HIP",
    "L_KNEE", "R_KNEE",
    "L_REAR_PAW", "R_REAR_PAW",
)


def _load_detection(path: Path, class_name: str) -> tuple[dict, dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    frame = payload["frames"][0]
    candidates = [item for item in frame["detections"] if item["class_name"] == class_name]
    if not candidates:
        raise ValueError(f"No {class_name} detection in {path}")
    detection = max(
        candidates,
        key=lambda item: (item["bbox_xyxy"][2] - item["bbox_xyxy"][0])
        * (item["bbox_xyxy"][3] - item["bbox_xyxy"][1]),
    )
    return frame, detection


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--subject", required=True)
    parser.add_argument("--class-name", choices=("dog", "cat"), required=True)
    parser.add_argument("--pose", action="append", nargs=2, metavar=("NAME", "PREDICTIONS"), required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    poses = {}
    for name, prediction_path in args.pose:
        frame, detection = _load_detection(Path(prediction_path), args.class_name)
        points = {point["name"]: point for point in detection["ap10k"]}
        guardian = {point["key"]: point for point in detection["guardian26"]}
        poses[name] = {
            "frame_index": frame["frame_index"],
            "bbox_xyxy": detection["bbox_xyxy"],
            "detector_confidence": detection["detector_confidence"],
            "ap10k_17": detection["ap10k"],
            "focus_landmarks": {
                point_name: {
                    "x": points[point_name]["x"],
                    "y": points[point_name]["y"],
                    "raw_simcc_score": points[point_name]["confidence"],
                    "normalized_x": points[point_name]["normalized_x"],
                    "normalized_y": points[point_name]["normalized_y"],
                }
                for point_name in FOCUS_POINTS
            },
            "guardian_mapping_counts": detection["guardian_evidence_counts"],
            "guardian_mapping": guardian,
        }

    names = list(poses)
    pairwise = {}
    for left_index in range(len(names)):
        for right_index in range(left_index + 1, len(names)):
            left_name, right_name = names[left_index], names[right_index]
            distances = {}
            for point_name in FOCUS_POINTS:
                left = poses[left_name]["focus_landmarks"][point_name]
                right = poses[right_name]["focus_landmarks"][point_name]
                distances[point_name] = math.hypot(
                    left["normalized_x"] - right["normalized_x"],
                    left["normalized_y"] - right["normalized_y"],
                )
            pairwise[f"{left_name}_vs_{right_name}"] = distances

    result = {
        "schema": "guardian-vision-rtmpose-poc1.1/same-subject-v1",
        "subject": args.subject,
        "class_name": args.class_name,
        "score_safety": "raw SimCC score; not a calibrated probability",
        "poses": poses,
        "pairwise_normalized_displacement": pairwise,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
