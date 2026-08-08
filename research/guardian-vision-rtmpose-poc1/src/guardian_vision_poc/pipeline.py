"""Minimal local detector -> RTMPose AP-10K inference pipeline."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

import cv2
import numpy as np
from rtmlib import RTMPose

from .detectors import ScoredYOLOX
from .guardian_mapping import AP10K_NAMES, adapt_ap10k_to_guardian, evidence_counts


ANIMAL_CLASSES = {15: "cat", 16: "dog"}
AP10K_LINKS = (
    (0, 1), (0, 2), (1, 2), (2, 3), (3, 4),
    (3, 5), (5, 6), (6, 7), (3, 8), (8, 9), (9, 10),
    (4, 11), (11, 12), (12, 13), (4, 14), (14, 15), (15, 16),
)


@dataclass(frozen=True)
class ModelPaths:
    detector: Path
    pose: Path


class LocalAnimalPosePipeline:
    def __init__(
        self,
        paths: ModelPaths,
        *,
        detector_threshold: float = 0.30,
        backend: str = "onnxruntime",
        device: str = "cpu",
    ):
        self.backend = backend
        self.device = device
        self.detector = ScoredYOLOX(
            str(paths.detector), model_input_size=(640, 640),
            det_mode="multiclass", score_thr=detector_threshold,
            backend=backend, device=device,
        )
        self.pose = RTMPose(
            str(paths.pose), model_input_size=(256, 256),
            backend=backend, device=device,
        )

    def infer_frame(self, frame: np.ndarray, *, frame_index: int = 0) -> dict:
        detector_start = time.perf_counter()
        bboxes, classes, detector_scores = self.detector(frame)
        detector_ms = (time.perf_counter() - detector_start) * 1000.0

        detections = []
        pose_ms_total = 0.0
        for source_index, (bbox, class_id_value, detector_score) in enumerate(
            zip(bboxes, classes, detector_scores)
        ):
            class_id = int(class_id_value)
            if class_id not in ANIMAL_CLASSES:
                continue
            pose_start = time.perf_counter()
            keypoints_batch, scores_batch = self.pose(frame, bboxes=[bbox])
            pose_ms = (time.perf_counter() - pose_start) * 1000.0
            pose_ms_total += pose_ms
            keypoints = keypoints_batch[0]
            scores = scores_batch[0]
            guardian = adapt_ap10k_to_guardian(keypoints, scores)
            x1, y1, x2, y2 = [float(value) for value in bbox]
            bbox_width = max(x2 - x1, 1.0)
            bbox_height = max(y2 - y1, 1.0)
            detections.append({
                "instance_id": f"frame-{frame_index}-detection-{len(detections)}",
                "source_detection_index": source_index,
                "class_id": class_id,
                "class_name": ANIMAL_CLASSES[class_id],
                "detector_confidence": float(detector_score),
                "bbox_xyxy": [x1, y1, x2, y2],
                "ap10k": [
                    {
                        "index": index,
                        "name": AP10K_NAMES[index],
                        "x": float(point[0]),
                        "y": float(point[1]),
                        "confidence": float(scores[index]),
                        "normalized_x": float((point[0] - x1) / bbox_width),
                        "normalized_y": float((point[1] - y1) / bbox_height),
                    }
                    for index, point in enumerate(keypoints)
                ],
                "guardian26": guardian,
                "guardian_evidence_counts": evidence_counts(guardian),
                "pose_ms": pose_ms,
            })

        return {
            "frame_index": frame_index,
            "width": int(frame.shape[1]),
            "height": int(frame.shape[0]),
            "backend": self.backend,
            "device": self.device,
            "detections": detections,
            "timing": {
                "detector_ms": detector_ms,
                "pose_ms_total": pose_ms_total,
                "total_ms": detector_ms + pose_ms_total,
            },
        }


def iter_media(path: Path, *, frame_stride: int, max_frames: int) -> Iterator[tuple[int, np.ndarray]]:
    image = cv2.imread(str(path))
    if image is not None:
        yield 0, image
        return

    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        raise ValueError(f"Unable to read media: {path}")
    yielded = 0
    frame_index = 0
    try:
        while yielded < max_frames:
            ok, frame = capture.read()
            if not ok:
                break
            if frame_index % frame_stride == 0:
                yield frame_index, frame
                yielded += 1
            frame_index += 1
    finally:
        capture.release()


def draw_result(frame: np.ndarray, result: dict, *, threshold: float = 0.30) -> np.ndarray:
    canvas = frame.copy()
    for detection in result["detections"]:
        x1, y1, x2, y2 = [int(value) for value in detection["bbox_xyxy"]]
        color = (80, 190, 110) if detection["class_name"] == "dog" else (210, 150, 60)
        cv2.rectangle(canvas, (x1, y1), (x2, y2), color, 2)
        cv2.putText(canvas, detection["instance_id"] + " " + detection["class_name"],
                    (x1, max(20, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        points = detection["ap10k"]
        for first, second in AP10K_LINKS:
            if points[first]["confidence"] >= threshold and points[second]["confidence"] >= threshold:
                p1 = (int(points[first]["x"]), int(points[first]["y"]))
                p2 = (int(points[second]["x"]), int(points[second]["y"]))
                cv2.line(canvas, p1, p2, color, 2)
        for point in points:
            if point["confidence"] >= threshold:
                cv2.circle(canvas, (int(point["x"]), int(point["y"])), 4, (30, 220, 255), -1)
    return canvas


def save_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
