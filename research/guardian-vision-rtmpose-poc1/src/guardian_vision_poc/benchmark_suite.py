"""Benchmark multiple stills with one compiled detector/pose pipeline."""

from __future__ import annotations

import argparse
import json
import statistics
from pathlib import Path

import cv2

from .cli import default_model_paths
from .pipeline import LocalAnimalPosePipeline


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
    parser.add_argument("--media", type=Path, action="append", required=True)
    parser.add_argument("--backend", choices=("onnxruntime", "openvino"), required=True)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--warmup", type=int, default=1)
    parser.add_argument("--runs", type=int, default=3)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    frames = []
    for media in args.media:
        frame = cv2.imread(str(media))
        if frame is None:
            raise ValueError(f"Unable to read {media}")
        frames.append((media, frame))

    package_root = Path(__file__).resolve().parents[2]
    pipeline = LocalAnimalPosePipeline(
        default_model_paths(package_root), backend=args.backend, device=args.device
    )
    for _ in range(args.warmup):
        pipeline.infer_frame(frames[0][1])

    media_results = []
    for media, frame in frames:
        results = [pipeline.infer_frame(frame, frame_index=index) for index in range(args.runs)]
        detector = [item["timing"]["detector_ms"] for item in results]
        pose = [item["timing"]["pose_ms_total"] for item in results]
        total = [item["timing"]["total_ms"] for item in results]
        media_results.append({
            "media": str(media.resolve()),
            "animal_detections_per_run": [len(item["detections"]) for item in results],
            "detector": _stats(detector),
            "pose_total": _stats(pose),
            "total": _stats(total),
            "fps_from_mean_total": 1000.0 / statistics.fmean(total),
        })

    payload = {
        "schema": "guardian-vision-rtmpose-poc1.1/benchmark-suite-v1",
        "backend": args.backend,
        "device": args.device,
        "warmup_runs_excluded": args.warmup,
        "measured_runs_per_media": args.runs,
        "results": media_results,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
