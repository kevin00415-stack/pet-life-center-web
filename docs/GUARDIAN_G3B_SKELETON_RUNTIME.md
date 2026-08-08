# Guardian Motion Layer — G3-B Skeleton Runtime

Status: IMPLEMENTED — LOCAL TECHNICAL-FRAME RUNTIME

Runtime ID: `guardian-motion-runtime-v1`

This milestone implements the deterministic Skeleton, Geometry, Temporal Motion, Motion Envelope, and G2-C ingestion boundary. It makes no medical inference and sends no data to cloud or external AI services.

## 1. Implemented pipeline

```text
Authorized local technical frames
  -> frozen identity receipt check
  -> one-target technical-frame adapter
  -> versioned landmark estimate
  -> skeleton validation and anatomical-side resolution
  -> deterministic geometry
  -> deterministic temporal motion
  -> guardian-motion-contract-v1 envelope
  -> optional G2-C validation ingestion
```

Identity is checked before the estimator runs. An invalid binding returns `IDENTITY_ABORTED` with no Motion Envelope. The GBE rules for `MULTIPLE_PETS`, `UNKNOWN`, `MISMATCH`, and unconfirmed `LOW_CONFIDENCE` remain upstream and unchanged.

## 2. Supported skeleton

Schema: `guardian-motion-skeleton-v2`

The shared dog/cat key set contains 26 landmarks:

- head: `HEAD`, `NOSE`, `NECK`;
- torso: `LEFT_SHOULDER`, `RIGHT_SHOULDER`, `SPINE_FRONT`, `SPINE_MID`, `SPINE_REAR`, `LEFT_HIP`, `RIGHT_HIP`, `BODY_CENTER`;
- front limbs: left/right elbow, wrist, and paw;
- rear limbs: left/right knee, ankle, and paw;
- tail: `TAIL_BASE`, `TAIL_MID`, `TAIL_TIP`.

Each frame also contains a normalized body bounding box, body length, body height, tracking confidence and continuity, visibility, camera-motion risk, anatomical-side result, and technical confidence summaries.

Landmark states are `OBSERVED`, `OCCLUDED`, `OUT_OF_FRAME`, `UNKNOWN`, and `ESTIMATED`. Estimated points are never relabeled as observed. Missing coordinates remain null. The runtime does not bridge long missing segments.

## 3. Local estimator status

The runtime uses a provider-neutral adapter contract. The implemented provider is `guardian-technical-frame-provider-v1`, backed by versioned local artifact `guardian-technical-frame-artifact-v1`. It accepts only authorized technical frames carrying local deterministic candidate evidence.

Raw video decode is an explicit unavailable boundary (`RAW_VIDEO_DECODER_UNAVAILABLE`). No pixel-level dog/cat pose model or model artifact has been selected or integrated, because this milestone provides no approved provider, dependency, or model file. Therefore the implementation must not be represented as extracting landmarks directly from arbitrary video pixels.

## 4. Anatomical side

Left/right means the pet's anatomical side, never screen-left/screen-right. Resolution requires sufficient technical confidence and a stable side identity token. A mirror transform does not rename anatomical landmarks. Ambiguity marks every side-dependent landmark `UNKNOWN`; a token change is reported as `ANATOMICAL_SIDE_IDENTITY_CHANGED` instead of silently swapping sides.

## 5. Geometry outputs

Policy: `guardian-motion-geometry-v2`

Implemented frame outputs:

- left/right front shoulder–elbow–wrist angles;
- left/right rear hip–knee–ankle angles;
- relative extension and compression for four limbs;
- body axis and spine axis;
- head-to-body angle;
- tail-base angle and tail-curvature proxy;
- normalized body center;
- body height/length ratio;
- left/right pose-symmetry proxy.

A joint angle is `OBSERVED` only when all three required landmarks are themselves `OBSERVED`, finite, visible, and above the landmark confidence gate. Otherwise its value is `UNKNOWN` and null. These are internal engineering measurements, not medical or user-facing conclusions.

## 6. Temporal outputs

Policy: `guardian-motion-temporal-v1`

Implemented sequence outputs:

- per-landmark jitter;
- per-landmark frame-to-frame displacement;
- anatomical-side consistency;
- occlusion recovery count;
- tracking continuity;
- four joint-angle continuity measurements;
- tail-landmark continuity;
- body-axis continuity.

When camera-motion risk reaches the deterministic suppression threshold, displacement becomes `UNKNOWN` with `CAMERA_MOTION_RISK`; camera shake is not reported as animal motion. Non-monotonic timestamps are rejected. Entirely unavailable evidence remains `UNKNOWN`, never observed zero.

## 7. Confidence and determinism

Confidence exists at landmark, anatomical-side, skeleton, joint/geometry, temporal, and envelope-summary levels. All values are technical confidence in `[0, 1]`; none are health scores.

Canonicalization fixes key order, landmark order, numeric rounding, negative-zero handling, and excluded runtime metadata. The same input and version set produces the same `motionDigest`. Tests cover exact repeat, fresh-runtime restart, mirror preservation, side ambiguity, and side-token changes.

## 8. Motion Contract and G2-C

The output remains `guardian-motion-contract-v1` and declares its exact Skeleton, Geometry, Temporal, adapter, estimator artifact, and canonicalization versions. G2-C accepts an envelope only when:

- contract and schema versions are compatible;
- identifiers bind correctly;
- Skeleton and Geometry signatures contain valid derived evidence;
- source is `SYNTHETIC` or `GUARDIAN_HQ_AUTHORIZED_TEST`;
- the record contains no raw media, production-user data, medical fields, or training labels.

Motion Layer itself does not update a baseline, Observation, Trend, or Timeline.

## 9. Validation evidence

Automated coverage includes the complete 26-landmark schema, dog/cat shared runtime, exact-repeat determinism, restart determinism, mirrored capture, ambiguous side, identity-token switching, missing/occluded/out-of-frame/estimated states, joint availability gates, camera-motion suppression, identity preflight, raw-video boundary, and G2-C ingestion.

On the current development machine, a synthetic three-frame technical fixture completed 1,000 runtime analyses in 7,269.681 ms, a mean of 7.2697 ms per analysis. This measurement excludes video decoding and pixel-level pose inference and is not a production performance claim.

## 10. Current limitations

- G3-C now supplies a browser-local MP4/MOV decoder and deterministic silhouette estimator. No learned pixel-level animal pose model is integrated, and G3-C's coarse projected landmarks remain unvalidated estimates.
- No estimator accuracy, anatomical accuracy, real-device coverage, frame throughput, or arbitrary-video support is claimed.
- Geometry is normalized 2D evidence; depth, pseudo-3D, 3D pose, and Digital Motion Twin are not implemented.
- Anatomical-side resolution depends on explicit deterministic estimator evidence and intentionally returns unknown when ambiguous.
- The technical fixture has three frames and does not establish behavior-, breed-, coat-, lighting-, occlusion-, or device-level performance.
- G2-C remains a local engineering-validation library, not an AI-training dataset.

No cloud inference, external AI API, diagnosis, disease prediction, health score, medical interpretation, production user media, merge, or push is included.

AWAITING GUARDIAN G3-B SKELETON RUNTIME REVIEW
