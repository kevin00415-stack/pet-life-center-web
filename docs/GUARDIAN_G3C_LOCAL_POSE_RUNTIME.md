# Guardian Motion Layer — G3-C Local Animal Pose Estimator Runtime

Status: IMPLEMENTED — ENGINEERING SPIKE, NOT V1-PROMOTED

Runtime ID: `guardian-local-video-pose-runtime-v1`

## 1. Outcome

G3-C adds Guardian's first complete local pixel-to-pose boundary:

```text
Local MP4/MOV File
  -> Browser-local decode
  -> Ordered RGBA frame extraction
  -> Deterministic foreground components
  -> Single-pet and target-signature gate
  -> Guardian local silhouette pose adapter
  -> guardian-motion-skeleton-v2
  -> G3-B Geometry and Temporal runtimes
  -> guardian-motion-contract-v1
  -> optional G2-C Motion Signature
```

The pipeline uses no network request, upload, cloud inference, external API, telemetry, or production media fixture.

## 2. Estimator selected

Selected estimator: `Guardian Deterministic Silhouette Pose v0`

Artifact version: `guardian-deterministic-silhouette-pose-v0`

Provider: `GUARDIAN_LOCAL_DETERMINISTIC`

This is an internal, provider-neutral, dependency-free engineering estimator. It performs deterministic border-background estimation, foreground connected-component detection, one-target selection, target-signature comparison, temporal identity continuity, body-box measurement, and coarse landmark projection.

No third-party model or dependency was selected because Guardian HQ supplied no approved model artifact or provider decision, and repository governance prohibits silently adding one. The adapter boundary permits a future approved local model without changing Skeleton V2 or Motion contracts.

## 3. Supported video input

- Local `.mp4` with `video/mp4`.
- Local `.mov` with `video/quicktime`.
- Ordered frames sampled by deterministic timestamp policy.
- Monotonic timestamps are enforced.
- Remote URL, data URL, unsupported extension, incompatible MIME type, empty input, and invalid frames are rejected.

The production decoder uses browser `HTMLVideoElement`, local object URLs, Canvas, and RGBA extraction. Container acceptance does not guarantee codec support: actual MP4/MOV decoding depends on the operating system and browser codec stack. Object URLs are revoked after use. Browser decode sends no data off-device.

## 4. Detection, tracking, and identity

The current detector segments foreground pixels against the frame-border background and sorts connected components deterministically. A second substantial component causes `MULTIPLE_PETS`. No component causes `UNKNOWN` with `PET_NOT_DETECTED`.

The selected component is compared with the active pet's immutable, pet-bound local baseline descriptor using color, aspect-ratio, and area-ratio evidence. Descriptor enrollment requires explicit owner confirmation. A descriptor whose `petId` differs from the analysis pet is rejected before video decode:

- `MATCH`: proceed.
- `LOW_CONFIDENCE`: require confirmation bound to analysis run, video, and pet.
- `MISMATCH`: reject.
- missing descriptor: `UNKNOWN` and reject.
- discontinuous target signature: `IDENTITY_SWITCH_DETECTED` and reject.

All rejected sessions return no Motion Envelope and explicitly report zero Observation, Trend, Timeline, Baseline, and Dataset writes.

The signature is an engineering gate, not biometric identity. It is intentionally conservative and is not sufficient for visually similar pets.

## 5. Skeleton V2 output and unknown handling

The estimator emits the full 26-key `guardian-motion-skeleton-v2` structure, body bounding box, body length, body height, per-landmark confidence, frame tracking confidence, and overall Skeleton confidence.

Current evidence classes:

- foreground-derived `BODY_CENTER`, body box, body length, and body height may be `OBSERVED` when their pixel evidence passes validation;
- coarse head, spine, limb, and tail projections remain `ESTIMATED` with `PIXEL_SILHOUETTE_ESTIMATE_UNVALIDATED`;
- side-dependent points become `UNKNOWN` when anatomical side is ambiguous;
- missing or rejected evidence remains null and is never converted to zero.

Because G3-B joint geometry requires three `OBSERVED` landmarks, unvalidated projected joints do not produce observed joint angles. Body center and body height/length ratio may still be available as directly supported geometry.

## 6. Manual annotation and error reporting

Implemented modules:

- annotation contract: `guardian-manual-annotation-v1`;
- error report: `guardian-landmark-error-report-v1`;
- deterministic annotation checksum and binding validation;
- normalized landmark error;
- body-relative landmark error;
- anatomical left/right agreement;
- per-group sample counts and engineering reliability.

Supported annotation groups are Head, Body, Front Legs, Rear Legs, and Tail. Authorized real-device annotation sets require a non-personal Guardian HQ authorization reference.

The ≥80% engineering-reliability target is enforced as an evidence gate, not reported as achieved by default. A group needs the configured minimum annotated samples and ≥0.80 passing reliability. Even then, automatic promotion remains disabled and `HQ_PROMOTION_APPROVAL_REQUIRED` is returned.

## 7. Repeatability and real-device harness

The repeatability report runs the same request ten times and independently compares Skeleton, Geometry, and Temporal Motion digests. The real-device harness:

- accepts only `GUARDIAN_HQ_AUTHORIZED_TEST` cases;
- requires an authorization reference;
- runs ten repetitions per case;
- optionally binds a manual annotation set;
- stores reports and derived signatures only;
- does not store raw video or pixel frames in G2-C.

Current deterministic synthetic-pixel evidence: 10/10 equivalent Skeleton, 10/10 equivalent Geometry, and 10/10 equivalent Temporal Motion.

Current authorized real-device evidence count: **0**.

## 8. Landmark accuracy

No real-device landmark accuracy is available because no Guardian HQ-authorized MP4/MOV and manual annotation set were supplied. Therefore:

- normalized landmark error: not established for real devices;
- body-relative landmark error: not established for real devices;
- dog/cat landmark reliability: not established;
- ≥80% V1 promotion target: not met and not claimed;
- approved landmark groups: none.

The zero-error unit fixture only verifies error-report mathematics against self-derived synthetic reference points. It is not accuracy evidence.

## 9. Performance report

On the current development machine, 500 runs of a three-frame 32×24 synthetic pixel sequence completed in 2,855.494 ms, averaging 5.7110 ms per pipeline run. This includes in-memory frame validation, pixel segmentation, target matching, pose projection, Skeleton V2 validation, Geometry, and Temporal Motion.

This measurement excludes browser MP4/MOV codec decoding, file I/O, real video resolution, long recordings, and UI rendering. It must not be used as a production throughput claim. Browser decode and real-device performance remain unmeasured.

## 10. Device requirements

- Modern browser with `HTMLVideoElement`, Canvas 2D, `URL.createObjectURL`, typed arrays, and local file access.
- Sufficient memory for decoded RGBA frames; the current decoder caps extraction at 600 frames.
- Browser/OS codec support for the specific MP4 or MOV encoding.
- Static or slowly changing background, useful contrast, mostly visible single pet, and stable capture for the current estimator.
- All processing remains on the user's device.

## 11. Dog and cat comparison

Dog and cat use the same decoder, detector, pose adapter, Skeleton V2 schema, Geometry Runtime, and Motion Contract. Species is binding metadata only. No species-specific medical or behavioral interpretation exists.

No comparative real-device dog/cat evidence exists yet, so no accuracy difference is claimed.

## 12. Known limitations

- The silhouette estimator is not a learned animal pose model and is unsuitable for cluttered or moving backgrounds, low contrast, similar-colored surroundings, overlapping animals, or severe occlusion.
- Color/aspect/area target matching is not robust biometric identification and may reject valid captures or fail to distinguish similar pets.
- Head direction and non-center landmarks are coarse projections and remain unvalidated estimates.
- Anatomical left/right requires an existing trusted local side descriptor; it is not inferred safely from arbitrary pixels.
- Browser codec behavior may vary between devices, especially for MOV.
- Decode determinism is guaranteed only within the same supported browser/codec environment; cross-codec pixel equivalence is not claimed.
- Camera-motion risk uses deterministic border-pixel change and can miss complex camera motion.
- No real-device accuracy, performance, dog/cat parity, breed/coat coverage, or V1 readiness is claimed.

No diagnosis, disease prediction, pain prediction, health score, treatment output, cloud inference, remote API, uploaded video, external telemetry, merge, or push is included.

AWAITING GUARDIAN G3-C LOCAL POSE REVIEW
