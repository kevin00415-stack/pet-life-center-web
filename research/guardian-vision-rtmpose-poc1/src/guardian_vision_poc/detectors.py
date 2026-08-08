"""Detector wrappers used only by the isolated Guardian Vision PoC.

RTMLib's YOLOX API intentionally omits post-NMS scores.  The validation gate
needs the raw detector score, so this adapter preserves the same preprocessing
and NMS while returning ``bbox, class_id, score`` together.
"""

from __future__ import annotations

import numpy as np
from rtmlib import YOLOX
from rtmlib.tools.object_detection.yolox import multiclass_nms


class ScoredYOLOX(YOLOX):
    """YOLOX with detector scores retained after class-aware NMS."""

    def __call__(self, image: np.ndarray):
        image, ratio = self.preprocess(image)
        outputs = self.inference(image)[0]
        return self.postprocess_with_scores(outputs, ratio)

    def postprocess_with_scores(self, outputs: np.ndarray, ratio: float = 1.0):
        if outputs.shape[-1] <= 5:
            raise ValueError("PoC score adapter expects a raw YOLOX ONNX output")

        grids = []
        expanded_strides = []
        for stride in (8, 16, 32):
            hsize = self.model_input_size[0] // stride
            wsize = self.model_input_size[1] // stride
            xv, yv = np.meshgrid(np.arange(wsize), np.arange(hsize))
            grid = np.stack((xv, yv), 2).reshape(1, -1, 2)
            grids.append(grid)
            expanded_strides.append(np.full((*grid.shape[:2], 1), stride))

        grids = np.concatenate(grids, 1)
        expanded_strides = np.concatenate(expanded_strides, 1)
        outputs[..., :2] = (outputs[..., :2] + grids) * expanded_strides
        outputs[..., 2:4] = np.exp(outputs[..., 2:4]) * expanded_strides

        predictions = outputs[0]
        boxes = predictions[:, :4]
        class_scores = predictions[:, 4:5] * predictions[:, 5:]
        boxes_xyxy = np.ones_like(boxes)
        boxes_xyxy[:, 0] = boxes[:, 0] - boxes[:, 2] / 2.0
        boxes_xyxy[:, 1] = boxes[:, 1] - boxes[:, 3] / 2.0
        boxes_xyxy[:, 2] = boxes[:, 0] + boxes[:, 2] / 2.0
        boxes_xyxy[:, 3] = boxes[:, 1] + boxes[:, 3] / 2.0
        boxes_xyxy /= ratio

        dets, _ = multiclass_nms(
            boxes_xyxy,
            class_scores,
            nms_thr=self.nms_thr,
            score_thr=self.score_thr,
        )
        if dets is None:
            return np.empty((0, 4)), np.empty((0,), dtype=int), np.empty((0,))
        return dets[:, :4], dets[:, 5].astype(int), dets[:, 4]
