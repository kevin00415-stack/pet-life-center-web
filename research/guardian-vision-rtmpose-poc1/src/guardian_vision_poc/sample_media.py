"""Extract explicitly selected representative frames without inference."""

from __future__ import annotations

import argparse
from pathlib import Path

import cv2


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("media", type=Path)
    parser.add_argument("--seconds", type=float, nargs="+", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    capture = cv2.VideoCapture(str(args.media))
    if not capture.isOpened():
        raise ValueError(f"Unable to open {args.media}")
    args.output.mkdir(parents=True, exist_ok=True)
    try:
        for second in args.seconds:
            capture.set(cv2.CAP_PROP_POS_MSEC, second * 1000.0)
            ok, frame = capture.read()
            if not ok:
                raise ValueError(f"Unable to read frame at {second}s")
            cv2.imwrite(str(args.output / f"second-{second:07.2f}.jpg"), frame)
    finally:
        capture.release()


if __name__ == "__main__":
    main()
