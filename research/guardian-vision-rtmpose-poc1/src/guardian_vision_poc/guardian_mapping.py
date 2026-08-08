"""Provider-neutral AP-10K -> Guardian Skeleton V2 experimental adapter.

This module deliberately does not import Guardian production contracts. It emits a
plain research representation and never fills unsupported keys from a template.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Iterable, Sequence


AP10K_NAMES = (
    "L_EYE",
    "R_EYE",
    "NOSE",
    "NECK",
    "TAIL_ROOT",
    "L_SHOULDER",
    "L_ELBOW",
    "L_FRONT_PAW",
    "R_SHOULDER",
    "R_ELBOW",
    "R_FRONT_PAW",
    "L_HIP",
    "L_KNEE",
    "L_REAR_PAW",
    "R_HIP",
    "R_KNEE",
    "R_REAR_PAW",
)

GUARDIAN_KEYS = (
    "HEAD", "NOSE", "NECK",
    "LEFT_SHOULDER", "RIGHT_SHOULDER",
    "SPINE_FRONT", "SPINE_MID", "SPINE_REAR",
    "LEFT_HIP", "RIGHT_HIP", "BODY_CENTER",
    "LEFT_FRONT_ELBOW", "RIGHT_FRONT_ELBOW",
    "LEFT_FRONT_WRIST", "RIGHT_FRONT_WRIST",
    "LEFT_FRONT_PAW", "RIGHT_FRONT_PAW",
    "LEFT_REAR_KNEE", "RIGHT_REAR_KNEE",
    "LEFT_REAR_ANKLE", "RIGHT_REAR_ANKLE",
    "LEFT_REAR_PAW", "RIGHT_REAR_PAW",
    "TAIL_BASE", "TAIL_MID", "TAIL_TIP",
)

DIRECT_MAP = {
    "NOSE": "NOSE",
    "NECK": "NECK",
    "LEFT_SHOULDER": "L_SHOULDER",
    "RIGHT_SHOULDER": "R_SHOULDER",
    "LEFT_HIP": "L_HIP",
    "RIGHT_HIP": "R_HIP",
    "LEFT_FRONT_ELBOW": "L_ELBOW",
    "RIGHT_FRONT_ELBOW": "R_ELBOW",
    "LEFT_FRONT_PAW": "L_FRONT_PAW",
    "RIGHT_FRONT_PAW": "R_FRONT_PAW",
    "LEFT_REAR_KNEE": "L_KNEE",
    "RIGHT_REAR_KNEE": "R_KNEE",
    "LEFT_REAR_PAW": "L_REAR_PAW",
    "RIGHT_REAR_PAW": "R_REAR_PAW",
    "TAIL_BASE": "TAIL_ROOT",
}


@dataclass(frozen=True)
class GuardianLandmark:
    key: str
    x: float | None
    y: float | None
    confidence: float | None
    evidence: str
    source: tuple[str, ...]
    reason: str | None = None
    occlusion: None = None

    def to_dict(self) -> dict:
        return asdict(self)


def _midpoint(points: Sequence[tuple[float, float]]) -> tuple[float, float]:
    return (
        sum(point[0] for point in points) / len(points),
        sum(point[1] for point in points) / len(points),
    )


def adapt_ap10k_to_guardian(
    keypoints: Sequence[Sequence[float]],
    scores: Sequence[float],
    *,
    observed_threshold: float = 0.30,
) -> list[dict]:
    """Map an AP-10K instance without inventing unsupported observations."""
    if len(keypoints) != 17 or len(scores) != 17:
        raise ValueError("AP-10K input must contain exactly 17 keypoints and scores")

    ap = {
        name: (float(keypoints[index][0]), float(keypoints[index][1]), float(scores[index]))
        for index, name in enumerate(AP10K_NAMES)
    }
    result: dict[str, GuardianLandmark] = {}

    for guardian_key, source_key in DIRECT_MAP.items():
        x, y, confidence = ap[source_key]
        if confidence >= observed_threshold:
            result[guardian_key] = GuardianLandmark(
                guardian_key, x, y, confidence, "OBSERVED", (source_key,)
            )
        else:
            result[guardian_key] = GuardianLandmark(
                guardian_key, None, None, confidence, "UNKNOWN", (source_key,),
                "low_model_confidence_not_occlusion",
            )

    estimated_sources: dict[str, tuple[str, ...]] = {
        "HEAD": ("L_EYE", "R_EYE"),
        "SPINE_FRONT": ("L_SHOULDER", "R_SHOULDER"),
        "SPINE_REAR": ("L_HIP", "R_HIP"),
        "BODY_CENTER": ("L_SHOULDER", "R_SHOULDER", "L_HIP", "R_HIP"),
    }
    for guardian_key, source_keys in estimated_sources.items():
        values = [ap[source_key] for source_key in source_keys]
        source_floor = min(value[2] for value in values)
        if all(value[2] >= observed_threshold for value in values):
            x, y = _midpoint([(value[0], value[1]) for value in values])
            result[guardian_key] = GuardianLandmark(
                guardian_key, x, y, source_floor, "ESTIMATED", source_keys,
                "geometric_midpoint_from_observed_sources",
            )
        else:
            result[guardian_key] = GuardianLandmark(
                guardian_key, None, None, source_floor, "UNKNOWN", source_keys,
                "insufficient_source_confidence_not_occlusion",
            )

    for guardian_key in GUARDIAN_KEYS:
        if guardian_key not in result:
            result[guardian_key] = GuardianLandmark(
                guardian_key, None, None, None, "UNKNOWN", (),
                "landmark_not_provided_or_reliably_derivable_from_ap10k",
            )

    return [result[key].to_dict() for key in GUARDIAN_KEYS]


def evidence_counts(landmarks: Iterable[dict]) -> dict[str, int]:
    counts = {"OBSERVED": 0, "ESTIMATED": 0, "UNKNOWN": 0}
    for landmark in landmarks:
        counts[landmark["evidence"]] += 1
    return counts
