"""Command-line entry point for the isolated PoC."""

from __future__ import annotations

import argparse
import statistics
from pathlib import Path

import cv2

from .pipeline import LocalAnimalPosePipeline, ModelPaths, draw_result, iter_media, save_json


def default_model_paths(root: Path) -> ModelPaths:
    model_root = root / "artifacts" / "models"
    pose_candidates = list((model_root / "rtmpose-m-ap10k").rglob("end2end.onnx"))
    if len(pose_candidates) != 1:
        raise FileNotFoundError("Expected exactly one extracted RTMPose AP-10K end2end.onnx")
    return ModelPaths(detector=model_root / "yolox_m.onnx", pose=pose_candidates[0])


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("media", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--frame-stride", type=int, default=15)
    parser.add_argument("--max-frames", type=int, default=12)
    parser.add_argument("--detector-threshold", type=float, default=0.30)
    parser.add_argument("--landmark-threshold", type=float, default=0.30)
    parser.add_argument("--backend", choices=("onnxruntime", "openvino"), default="onnxruntime")
    parser.add_argument("--device", default="cpu")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    package_root = Path(__file__).resolve().parents[2]
    pipeline = LocalAnimalPosePipeline(
        default_model_paths(package_root), detector_threshold=args.detector_threshold,
        backend=args.backend, device=args.device,
    )
    args.output.mkdir(parents=True, exist_ok=True)
    frames = []
    for frame_index, frame in iter_media(
        args.media, frame_stride=args.frame_stride, max_frames=args.max_frames
    ):
        result = pipeline.infer_frame(frame, frame_index=frame_index)
        frames.append(result)
        visualization = draw_result(frame, result, threshold=args.landmark_threshold)
        cv2.imwrite(str(args.output / f"frame-{frame_index:06d}.jpg"), visualization)

    totals = [frame["timing"]["total_ms"] for frame in frames]
    payload = {
        "schema": "guardian-vision-rtmpose-poc1/v1",
        "input": str(args.media.resolve()),
        "frame_stride": args.frame_stride,
        "backend": args.backend,
        "device": args.device,
        "frames": frames,
        "summary": {
            "frames_processed": len(frames),
            "detections": sum(len(frame["detections"]) for frame in frames),
            "classes": sorted({
                detection["class_name"]
                for frame in frames for detection in frame["detections"]
            }),
            "mean_total_ms": statistics.fmean(totals) if totals else None,
            "median_total_ms": statistics.median(totals) if totals else None,
            "fps_from_mean_latency": 1000.0 / statistics.fmean(totals) if totals else None,
        },
    }
    save_json(args.output / "predictions.json", payload)


if __name__ == "__main__":
    main()
