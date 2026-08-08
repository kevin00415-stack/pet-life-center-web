# Guardian Motion Layer → GBE Contract V1

Status: PROPOSED CONTRACT — NOT IMPLEMENTED

Contract ID: `guardian-motion-contract-v1`

G3-B implementation amendment: this envelope is now implemented for authorized local technical frames with `guardian-motion-skeleton-v2` and `guardian-motion-geometry-v2`. The original minimum skeleton below remains architectural history; the normative implemented landmark set and runtime limitations are in `GUARDIAN_G3B_SKELETON_RUNTIME.md`.

## 1. Envelope

```text
MotionEnvelope
  contractVersion
  skeletonSchemaVersion
  geometryPolicyVersion
  temporalPolicyVersion
  canonicalizationVersion
  estimatorVersion
  analysisRunId
  petId
  videoId
  identityReceiptId
  speciesMetadata
  status
  trackingSummary
  skeletonFrames[]
  geometryFrames[]
  temporalWindows[]
  qualitySummary
  motionDigest
```

The analytical payload contains no owner identity, location, diagnosis, disease, health score, fatigue score, treatment, medical interpretation, or user-facing recommendation.

## 2. Shared value wrapper

Every geometric or temporal value uses:

```text
MotionValue<T>
  availability: OBSERVED | UNKNOWN
  value: T | null
  confidence: number              # technical confidence, 0..1
  reasonCode: string | null
  evidenceDurationMs: number
  opportunityDurationMs: number
  evidenceCoverage: number        # 0..1
```

Rules:

- `OBSERVED` requires a finite, schema-valid value.
- `UNKNOWN` requires `value = null`.
- `UNKNOWN` is never converted to zero.
- Confidence is not a health or medical score.
- A consumer must ignore values it does not recognize instead of changing their meaning.

## 3. Skeleton frame

G3-B expands this minimum model to the versioned 26-landmark `guardian-motion-skeleton-v2` contract without changing the envelope contract ID.

```text
SkeletonFrame
  frameIndex
  timestampMs
  landmarks
    HEAD
    NECK
    SHOULDER_CENTER
    SPINE
    HIP
    FRONT_LEFT_LEG
    FRONT_RIGHT_LEG
    REAR_LEFT_LEG
    REAR_RIGHT_LEG
    TAIL_BASE
    BODY_CENTER
  bodyBoundingBox
  bodyLength
  bodyHeight
  trackingConfidence
  visibility
  occlusion
```

Each landmark contains `state`, normalized 2D coordinates or null, technical confidence, visibility, and occlusion. The landmark key set is identical for dog and cat.

## 4. Geometry frame

```text
GeometryFrame
  frameIndex
  timestampMs
  bodyAxis
  bodyHeading
  bodyRotation
  centerPosition
  relativeBodyOrientation
  bodyHeightRatio
  bodyLengthRatio
  relativeLimbExtension
    FRONT_LEFT
    FRONT_RIGHT
    REAR_LEFT
    REAR_RIGHT
  relativeLimbCompression
    FRONT_LEFT
    FRONT_RIGHT
    REAR_LEFT
    REAR_RIGHT
  jointGeometry
```

`jointGeometry` remains `UNKNOWN` for the minimum skeleton because no explicit three-point joints are defined.

## 5. Temporal window

```text
TemporalWindow
  startTimestampMs
  endTimestampMs
  poseStability
  poseTransitions[]
  poseContinuity
  movementCycles[]
  rotationVelocity
  angularChange
  relativeBodyMotion
  movementSequence[]
  motionConfidence
```

Temporal values are calculated only across monotonic timestamps and supported evidence. Long unknown intervals split windows and sequences.

## 6. Tracking and quality summaries

Required technical fields:

- tracking confidence;
- tracking coverage and continuity;
- visible body coverage;
- per-landmark visibility coverage;
- occlusion ratio and longest occlusion duration;
- out-of-frame ratio;
- camera-motion risk;
- skeleton coverage;
- geometry coverage;
- temporal coverage;
- overall motion confidence;
- reason codes.

These values remain internal.

## 7. GBE consumption rules

GBE must:

1. verify `petId`, `videoId`, `analysisRunId`, and identity receipt bindings;
2. require compatible contract and schema versions;
3. reject `IDENTITY_ABORTED` and `INVALID_INPUT`;
4. exclude every `UNKNOWN` value from feature computation;
5. use only the observed intersection supported by evidence coverage and confidence;
6. preserve current rules for `PARTIALLY_USABLE`, Trend eligibility, and transactional Timeline writes;
7. retain geometry as internal evidence, never as a diagnosis or user-facing joint readout.

Motion Layer cannot directly update a baseline, Observation, Trend, or Timeline.

## 8. Compatibility and versioning

- Adding a new landmark, changing a coordinate definition, changing anatomical-side semantics, or changing a formula requires a new schema or policy version.
- Existing fields never change units or meaning within a version.
- Consumers reject incompatible major versions.
- Calibration changes receive new policy versions and retain rollback metadata.
- Dog and cat share the same contract and key set.

## 9. Deterministic canonicalization

The digest payload excludes runtime duration, file paths, wall-clock timestamps, and unordered maps. It includes analytical IDs, versions, ordered frames, ordered landmark keys, normalized numbers, availability, confidence, and reason codes.

Canonicalization defines:

- stable key and array order;
- fixed decimal rounding policy;
- `-0` normalized to `0`;
- non-finite numbers rejected;
- null used only for unavailable values;
- UTF-8 serialization.

The same canonical input and version set must produce the same `motionDigest`.

## 10. Failure codes

Minimum vocabulary:

- `IDENTITY_BINDING_INVALID`
- `IDENTITY_SWITCH_DETECTED`
- `MULTIPLE_PETS`
- `INVALID_TIMESTAMP_ORDER`
- `FRAME_DIMENSIONS_INVALID`
- `LANDMARK_OUT_OF_RANGE`
- `LANDMARK_CONFIDENCE_LOW`
- `ANATOMICAL_SIDE_AMBIGUOUS`
- `BODY_AXIS_UNAVAILABLE`
- `BODY_SCALE_UNAVAILABLE`
- `INSUFFICIENT_SKELETON_COVERAGE`
- `INSUFFICIENT_GEOMETRY_COVERAGE`
- `TEMPORAL_GAP_TOO_LONG`
- `CAMERA_MOTION_RISK`
- `OCCLUSION_PROLONGED`
- `SCHEMA_INCOMPATIBLE`

Reason codes describe technical evidence only.

AWAITING GUARDIAN MOTION LAYER REVIEW
