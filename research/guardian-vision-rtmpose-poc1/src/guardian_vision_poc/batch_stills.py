"""Run one compiled pipeline across a controlled list of still frames."""

from __future__ import annotations

import argparse
import json
import statistics
from pathlib import Path

import cv2

from .cli import default_model_paths
from .pipeline import LocalAnimalPosePipeline, draw_result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--media", type=Path, action="append", required=True)
    parser.add_argument("--backend", choices=("onnxruntime", "openvino"), default="openvino")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    package_root = Path(__file__).resolve().parents[2]
    pipeline = LocalAnimalPosePipeline(
        default_model_paths(package_root), backend=args.backend, device=args.device
    )
    args.output.mkdir(parents=True, exist_ok=True)
    frames = []
    for index, media in enumerate(args.media):
        image = cv2.imread(str(media))
        if image is None:
            raise ValueError(f"Unable to read {media}")
        result = pipeline.infer_frame(image, frame_index=index)
        result["source_media"] = str(media.resolve())
        frames.append(result)
        cv2.imwrite(str(args.output / f"sample-{index:02d}.jpg"), draw_result(image, result))

    totals = [frame["timing"]["total_ms"] for frame in frames]
    payload = {
        "schema": "guardian-vision-rtmpose-poc1.1/batch-stills-v1",
        "backend": args.backend,
        "device": args.device,
        "frames": frames,
        "summary": {
            "frames_processed": len(frames),
            "detections": sum(len(frame["detections"]) for frame in frames),
            "mean_total_ms": statistics.fmean(totals),
        },
    }
    (args.output / "predictions.json").write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
