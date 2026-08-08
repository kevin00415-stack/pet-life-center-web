"""Repeatable detector/pose latency benchmark for the isolated PoC."""

from __future__ import annotations

import argparse
import json
import statistics
import time
from pathlib import Path

import cv2

from .cli import default_model_paths
from .pipeline import ANIMAL_CLASSES, LocalAnimalPosePipeline


def _stats(values: list[float]) -> dict:
    return {
        "samples": len(values),
        "mean_ms": statistics.fmean(values),
        "median_ms": statistics.median(values),
        "min_ms": min(values),
        "max_ms": max(values),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("media", type=Path)
    parser.add_argument("--backend", choices=("onnxruntime", "openvino"), required=True)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--warmup", type=int, default=1)
    parser.add_argument("--runs", type=int, default=3)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    frame = cv2.imread(str(args.media))
    if frame is None:
        raise ValueError("Benchmark accepts a still image")
    package_root = Path(__file__).resolve().parents[2]
    pipeline = LocalAnimalPosePipeline(
        default_model_paths(package_root), backend=args.backend, device=args.device
    )

    for _ in range(args.warmup):
        pipeline.infer_frame(frame)

    results = []
    for run_index in range(args.runs):
        result = pipeline.infer_frame(frame, frame_index=run_index)
        results.append(result)

    detector = [item["timing"]["detector_ms"] for item in results]
    pose = [item["timing"]["pose_ms_total"] for item in results]
    total = [item["timing"]["total_ms"] for item in results]
    detections = [len(item["detections"]) for item in results]
    payload = {
        "schema": "guardian-vision-rtmpose-poc1.1/benchmark-v1",
        "media": str(args.media.resolve()),
        "backend": args.backend,
        "device": args.device,
        "warmup_runs_excluded": args.warmup,
        "measured_runs": args.runs,
        "animal_detections_per_run": detections,
        "detected_classes": sorted({
            detection["class_name"] for item in results for detection in item["detections"]
            if detection["class_id"] in ANIMAL_CLASSES
        }),
        "detector": _stats(detector),
        "pose_total": _stats(pose),
        "total": _stats(total),
        "fps_from_mean_total": 1000.0 / statistics.fmean(total),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
