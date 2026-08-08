"""Evaluate YOLOX detector scores, misses, and adjacent-frame bbox stability."""

from __future__ import annotations

import argparse
import json
import statistics
import time
from pathlib import Path

import cv2

from .cli import default_model_paths
from .detectors import ScoredYOLOX
from .pipeline import ANIMAL_CLASSES


def _iou(left: list[float], right: list[float]) -> float:
    x1, y1 = max(left[0], right[0]), max(left[1], right[1])
    x2, y2 = min(left[2], right[2]), min(left[3], right[3])
    intersection = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    left_area = max(0.0, left[2] - left[0]) * max(0.0, left[3] - left[1])
    right_area = max(0.0, right[2] - right[0]) * max(0.0, right[3] - right[1])
    union = left_area + right_area - intersection
    return intersection / union if union else 0.0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--class-name", choices=("dog", "cat"), required=True)
    parser.add_argument("--backend", choices=("onnxruntime", "openvino"), default="openvino")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--sample", type=Path, action="append", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    class_id = next(key for key, value in ANIMAL_CLASSES.items() if value == args.class_name)
    package_root = Path(__file__).resolve().parents[2]
    paths = default_model_paths(package_root)
    detector = ScoredYOLOX(
        str(paths.detector), model_input_size=(640, 640), det_mode="multiclass",
        score_thr=0.30, backend=args.backend, device=args.device,
    )

    samples = []
    for path in args.sample:
        frame = cv2.imread(str(path))
        if frame is None:
            raise ValueError(f"Unable to read {path}")
        start = time.perf_counter()
        boxes, classes, scores = detector(frame)
        latency_ms = (time.perf_counter() - start) * 1000.0
        matches = [
            (box, float(score)) for box, detected_class, score in zip(boxes, classes, scores)
            if int(detected_class) == class_id
        ]
        if matches:
            box, score = max(
                matches,
                key=lambda item: (item[0][2] - item[0][0]) * (item[0][3] - item[0][1]),
            )
            bbox = [float(value) for value in box]
        else:
            bbox, score = None, None
        samples.append({
            "path": str(path.resolve()),
            "width": frame.shape[1],
            "height": frame.shape[0],
            "bbox_xyxy": bbox,
            "detector_confidence": score,
            "latency_ms": latency_ms,
            "matching_detection_count": len(matches),
        })

    consecutive_ious = []
    for previous, current in zip(samples, samples[1:]):
        if previous["bbox_xyxy"] is not None and current["bbox_xyxy"] is not None:
            consecutive_ious.append(_iou(previous["bbox_xyxy"], current["bbox_xyxy"]))

    latencies = [sample["latency_ms"] for sample in samples]
    confidences = [sample["detector_confidence"] for sample in samples if sample["detector_confidence"] is not None]
    payload = {
        "schema": "guardian-vision-rtmpose-poc1.1/detector-eval-v1",
        "class_name": args.class_name,
        "backend": args.backend,
        "device": args.device,
        "samples": samples,
        "summary": {
            "sample_count": len(samples),
            "detected_count": len(confidences),
            "missed_count": len(samples) - len(confidences),
            "mean_detector_ms": statistics.fmean(latencies),
            "mean_detector_confidence": statistics.fmean(confidences) if confidences else None,
            "minimum_detector_confidence": min(confidences) if confidences else None,
            "mean_consecutive_bbox_iou": statistics.fmean(consecutive_ious) if consecutive_ious else None,
            "consecutive_bbox_ious": consecutive_ious,
            "stability_caveat": "IoU reflects animal and camera motion as well as detector jitter.",
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
