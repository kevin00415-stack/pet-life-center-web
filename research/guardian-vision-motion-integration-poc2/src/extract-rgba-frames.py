"""Decode selected local-video frames into a small ignored RGBA research artifact."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("video", type=Path)
    parser.add_argument("--frame-indices", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--width", type=int, default=96)
    args = parser.parse_args()

    requested = [int(value) for value in args.frame_indices.split(",")]
    capture = cv2.VideoCapture(str(args.video))
    if not capture.isOpened():
        raise ValueError("VIDEO_OPEN_FAILED")
    fps = capture.get(cv2.CAP_PROP_FPS)
    frames = []
    try:
        for frame_index in requested:
            capture.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
            ok, frame = capture.read()
            if not ok:
                raise ValueError(f"VIDEO_FRAME_DECODE_FAILED:{frame_index}")
            height = max(1, round(frame.shape[0] * args.width / frame.shape[1]))
            resized = cv2.resize(frame, (args.width, height), interpolation=cv2.INTER_AREA)
            rgba = cv2.cvtColor(resized, cv2.COLOR_BGR2RGBA)
            frames.append({
                "frameIndex": frame_index,
                "width": args.width,
                "height": height,
                "timestampMs": frame_index / fps * 1000,
                "durationMs": 1000 / fps,
                "rgba": rgba.reshape(-1).tolist(),
            })
    finally:
        capture.release()

    payload = {
        "schemaVersion": "guardian-poc2-local-rgba-frames-v1",
        "fps": fps,
        "sourceFrameIndices": requested,
        "frames": frames,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main()
