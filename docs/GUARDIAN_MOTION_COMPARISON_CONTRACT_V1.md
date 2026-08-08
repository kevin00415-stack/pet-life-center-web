# Guardian Motion Comparison Contract V1

Status: **ACCEPTED — CONTRACT V1.2 — PRESERVED WITH CORE v0**

Contract ID: `guardian-motion-comparison-v1`

Design base: Guardian Vision PoC-2 preservation commit `7a01d9d54c865522b80980a46f5c2acba755bcef`.

## 1. Purpose and hard boundary

This contract compares objective, technical Motion Evidence from two recordings of the same pet. It is a measurement contract, not an interpretation engine.

Allowed output is limited to evidence availability, comparability, normalized technical values, technical differences, and neutral directions. The engine must not receive or emit treatment, product, diagnosis, pain, disease, recovery, efficacy, health, or expected-outcome semantics.

The following fields and semantic equivalents are forbidden recursively:

`treatmentEffective`, `supplementEffective`, `medicalImprovement`, `healthScore`, `painScore`, `diseaseScore`, `recoveryScore`, `treatmentGroup`, `productBrand`, `intervention`, `medication`, `expectedOutcome`.

## 2. Normative comparison object

```text
MotionComparisonV1
  contractVersion: "guardian-motion-comparison-v1"
  policyVersions
    identityPolicyVersion
    comparabilityPolicyVersion
    normalizationPolicyVersion
    directionPolicyVersion
    coveragePolicyVersion
    canonicalizationVersion
  comparisonId
  status: COMPARISON_COMPLETE
        | COMPARISON_PARTIAL
        | COMPARISON_REJECTED
        | INSUFFICIENT_COMPARABLE_EVIDENCE
  petIdentityRef
    petRef                 # opaque, non-personal stable reference
    baselineIdentityReceiptRef
    followupIdentityReceiptRef
    samePetGate: CONFIRMED | NOT_CONFIRMED
  baselineEvidenceRef
    evidenceId
    motionDigest
    contractVersion
    skeletonSchemaVersion
    geometryPolicyVersion
    temporalPolicyVersion
  followupEvidenceRef      # same fields as baselineEvidenceRef
  baselineTimestamp
  followupTimestamp
  captureComparability
    level: COMPARABLE | PARTIALLY_COMPARABLE | NOT_COMPARABLE
    dimensions[]
    reasonCodes[]
  evidenceCoverage
  comparableSignals[]
  nonComparableSignals[]
  directionalChanges[]
  uncertainty
    level: LOW | MODERATE | HIGH | NOT_ASSESSABLE
    reasonCodes[]
    limitations[]
  reasonCodes[]
  provenance
  digest
```

`uncertainty.level` is a technical evidence descriptor, not a probability and not accuracy. `digest` covers the canonical technical output and excludes runtime duration, file paths, wall-clock generation time, product metadata, and unordered maps.

## 3. Input allowlist and product firewall

The comparison engine accepts only:

1. two immutable Motion Evidence references and their validated technical projections;
2. two same-pet identity receipts;
3. capture context required by the comparability gate;
4. versioned comparison policies and the requested `comparisonId`.

Unknown input fields are rejected. A recursive forbidden-key and forbidden-namespace scan occurs before identity or signal processing. Detection returns `COMPARISON_REJECTED` with `PRODUCT_CONTEXT_FORBIDDEN`; the forbidden value is not copied into logs or output.

Research systems may associate a completed `comparisonId` with intervention metadata outside this engine. They may not inject that metadata into thresholds, normalization, signal selection, direction, coverage, uncertainty, or wording.

### 3.1 Engine boundary limitation

The product firewall prevents product and intervention information from directly entering the comparison algorithm. It does **not** by itself prevent an external study or research workflow from introducing outcome bias through:

- cherry-picking recordings;
- excluding unfavorable samples;
- selecting signals, policy versions, normalization methods, or thresholds after viewing results;
- encoding study arm or expected outcome in `comparisonId`;
- post-hoc subgroup selection;
- selective publication or suppression of comparison outputs.

Any formal research use therefore requires a pre-registered protocol, fixed policy versions, a fixed signal set, fixed inclusion/exclusion rules, and immutable comparison outputs. `comparisonId` must be opaque and semantically neutral. The Comparison Engine firewall must never be described as eliminating all outcome bias.

## 4. Same-pet identity gate

The gate runs before capture or signal comparison.

Required invariants:

- both evidence objects have valid identity receipts under the same identity-policy version;
- both receipts bind to the same opaque `petRef`;
- neither evidence has `IDENTITY_ABORTED`, an identity switch, an unresolved multi-pet target, or invalid identifier bindings;
- comparison evidence must not be silently substituted or joined by species, name, appearance, owner, or recording proximity.

Failure result:

```text
status: COMPARISON_REJECTED
petIdentityRef.samePetGate: NOT_CONFIRMED
reasonCodes: [PET_IDENTITY_NOT_CONFIRMED]
comparableSignals: []
directionalChanges: []
```

## 5. Capture comparability gate

Each dimension is assessed symmetrically from both captures:

```text
CaptureDimensionAssessment
  dimension
  baselineState
  followupState
  relation: MATCHED | COMPATIBLE | DIFFERENT | UNKNOWN
  handling: ALLOW | DOWNGRADE | SIGNAL_BLOCK | GLOBAL_BLOCK
  affectedSignals[]
  evidenceRefs[]
  reasonCode
```

Required dimensions are camera viewpoint, camera distance/body scale, orientation, activity type, pose/activity state, speed/pace, frame coverage, animal visibility, occlusion, camera motion, lighting quality, detector stability, pose-evidence coverage, clip duration, and usable-frame count.

### 5.1 Estimator and provider parity gate

Baseline and follow-up must use identical or explicitly approved-compatible versions of the detector, pose provider, model artifact, adapter, Skeleton schema, Geometry policy, and Temporal policy. Exact version identity is the V1 default.

Any mismatch produces `NOT_COMPARABLE` with `ESTIMATOR_POLICY_MISMATCH` for every dependent signal. A future cross-provider or cross-generation comparison is permitted only through a separately approved, versioned calibration policy supported by parity evidence. Silent provider substitution and “close enough” semantic matching are forbidden.

### 5.2 Closed V1 capture taxonomy

For every dimension, `MATCHED` means the same non-`UNKNOWN` state. `COMPATIBLE` is limited to the explicitly named pairs below. Any other pair of known states is `DIFFERENT`. If either state is `UNKNOWN`, the relation is `UNKNOWN` and must use the stated non-permissive handling.

| Dimension | Allowed states and explicit compatible pairs | Default handling | Affected signals | Reason code |
|---|---|---|---|---|
| `VIEWPOINT` | `LEFT_LATERAL`, `RIGHT_LATERAL`, `FRONT`, `REAR`, `OBLIQUE_LEFT`, `OBLIQUE_RIGHT`, `TOP`, `UNKNOWN`. The two lateral states are compatible only for side-neutral signals; the two oblique states follow the same rule. | Matched: `ALLOW`. Compatible: `DOWNGRADE` side-neutral and `SIGNAL_BLOCK` side-specific. Different/unknown: `SIGNAL_BLOCK` viewpoint-sensitive signals. | body axis, displacement, limb, left/right, transitions | `VIEWPOINT_MISMATCH` / `CAPTURE_POLICY_UNRESOLVED` |
| `ORIENTATION` | `LEFTWARD`, `RIGHTWARD`, `TOWARD_CAMERA`, `AWAY_FROM_CAMERA`, `MIXED`, `UNKNOWN`. No cross-state compatible pair is approved. | Matched: `ALLOW`. Different/unknown: `SIGNAL_BLOCK` orientation-sensitive signals. | body axis, limb, left/right, transitions | `ORIENTATION_MISMATCH` / `CAPTURE_POLICY_UNRESOLVED` |
| `CAMERA_MOTION` | `BELOW_SUPPRESSION_GATE`, `SUPPRESSION_ACTIVE`, `UNKNOWN`. No cross-state compatible pair. | Both below gate: `ALLOW`. Either suppressed or unknown: `SIGNAL_BLOCK` displacement-dependent signals; all suppressed opportunities remain in coverage. | body center, landmarks, limbs, continuity | `CAMERA_MOTION_RISK` / `CAPTURE_POLICY_UNRESOLVED` |
| `ACTIVITY_STATE` | `STANDING`, `SITTING`, `WALKING_MOVING`, `TRANSITION`, `MIXED`, `UNKNOWN`. No cross-state compatible pair is approved. | Matched: `ALLOW`. Different: `SIGNAL_BLOCK` activity-dependent signals. Mixed/unknown without aligned intervals: `GLOBAL_BLOCK` when no signal survives. | all activity-dependent signals | `ACTIVITY_STATE_MISMATCH` |
| `SPEED_PACE` | `STATIONARY`, `SLOW`, `MODERATE`, `FAST`, `VARIABLE`, `UNKNOWN`. Mapping measured speed into `SLOW`, `MODERATE`, or `FAST` is `POLICY_VALUE_REQUIRED`; no cross-band compatible pair is approved. | Identical approved pace band: `ALLOW`. Different bands: `SIGNAL_BLOCK` pace-sensitive signals. `VARIABLE` without aligned comparable intervals and `UNKNOWN`: `SIGNAL_BLOCK`. Missing speed-band policy: fail closed with `SPEED_PACE_POLICY_REQUIRED`. Any future cross-band compatibility requires a separately approved calibration policy. | `BODY_AXIS_VARIATION`, `BODY_CENTER_DISPLACEMENT`, `OBSERVABLE_LANDMARK_DISPLACEMENT`, `FRONT_LIMB_MOVEMENT_EVIDENCE`, `REAR_LIMB_MOVEMENT_EVIDENCE`, `LEFT_RIGHT_MOVEMENT_DIFFERENCE`, `TEMPORAL_CONTINUITY`, `POSE_TRANSITION_EVIDENCE` | `SPEED_PACE_MISMATCH` / `SPEED_PACE_POLICY_REQUIRED` |
| `LEASH` | `ABSENT`, `PRESENT_NONINFLUENCING`, `PRESENT_INFLUENCING`, `UNKNOWN`. Absent and noninfluencing are not assumed compatible without an approved policy. | Matched absent: `ALLOW`. Present noninfluencing: `DOWNGRADE`. Influencing: reject affected intervals. Different/unknown: `SIGNAL_BLOCK` affected signals. | limb, displacement, transitions | `LEASH_CONTEXT_MISMATCH` / `CAPTURE_POLICY_UNRESOLVED` |
| `SURFACE` | `HARD_LEVEL`, `SOFT_LEVEL`, `SLIPPERY`, `UNEVEN`, `INCLINED`, `UNKNOWN`. No cross-state compatible pair is approved. | Matched: `ALLOW`. Different/unknown: `DOWNGRADE`, then `SIGNAL_BLOCK` any surface-sensitive signal unless a policy proves comparability. | limb, displacement, transitions | `SURFACE_CONTEXT_MISMATCH` / `CAPTURE_POLICY_UNRESOLVED` |
| `OWNER_INTERACTION` | `NONE_OBSERVED`, `CUE_ONLY`, `PHYSICAL_CONTACT`, `OBSTRUCTION`, `UNKNOWN`. No cross-state compatible pair. | `NONE_OBSERVED`: `ALLOW`. `CUE_ONLY`, `PHYSICAL_CONTACT`, or `OBSTRUCTION`: reject every affected interval, then re-run the full coverage gate using clean intervals only; continue only if sufficient clean uncued evidence remains, otherwise `SIGNAL_BLOCK` affected motion signals. `UNKNOWN`: `SIGNAL_BLOCK`. No rejected interval may contribute to `INCREASED`, `DECREASED`, or `STABLE`. | displacement, limbs, continuity, transitions, all cue-sensitive motion signals | `OWNER_CUE_PRESENT` / `OWNER_INTERACTION_PRESENT` / `CAPTURE_POLICY_UNRESOLVED` |
| `LIGHTING` | `ADEQUATE_STABLE`, `ADEQUATE_VARIABLE`, `LOW`, `BACKLIT`, `UNKNOWN`. Only the two adequate states may be compatible when detector/pose gates independently pass. | Matched adequate: `ALLOW`. Compatible: `DOWNGRADE`. Low/backlit/unknown: `DOWNGRADE` then `SIGNAL_BLOCK` when evidence coverage fails. | all model-derived signals | `LIGHTING_CONTEXT_MISMATCH` / `POSE_EVIDENCE_INSUFFICIENT` |
| `OCCLUSION` | `NONE_OR_MINIMAL`, `PARTIAL`, `HEAVY`, `UNKNOWN`. No cross-state compatible pair beyond identical states. | Minimal: `ALLOW`. Partial: `DOWNGRADE` and observed intersection only. Heavy/unknown: `SIGNAL_BLOCK` affected signals. | landmark, limbs, geometry, transitions | `OCCLUSION_EXCESSIVE` / `CAPTURE_POLICY_UNRESOLVED` |
| `DETECTOR_STABILITY` | `STABLE`, `UNSTABLE`, `MISS_PRESENT`, `UNKNOWN`. No cross-state compatible pair. | Stable/stable: `ALLOW`. Unstable or miss: `DOWNGRADE` and block dependent signals below coverage policy. Unknown: `SIGNAL_BLOCK`. | bbox-dependent, displacement, all pose-derived signals | `DETECTOR_INSTABILITY` / `DETECTOR_MISS` |
| `FRAME_TIMING` | `VALID_MONOTONIC`, `VALID_VARIABLE_RATE`, `INVALID`, `UNKNOWN`. The two valid states are compatible only under an approved timestamp normalization policy. | Matched valid: `ALLOW`. Compatible valid: `DOWNGRADE`. Invalid/unknown: `SIGNAL_BLOCK` all temporal signals. | displacement, continuity, transitions | `FRAME_TIMING_UNRELIABLE` / `CAPTURE_POLICY_UNRESOLVED` |
| `CLIP_DURATION` | `MEETS_APPROVED_MINIMUM`, `BELOW_APPROVED_MINIMUM`, `UNKNOWN`; the minimum is `POLICY_VALUE_REQUIRED`. | Both meet: `ALLOW`. Below/unknown or missing policy value: `SIGNAL_BLOCK` duration-dependent signals; global insufficiency if none survive. | continuity, transitions, aggregate motion signals | `CLIP_DURATION_INSUFFICIENT` / `POLICY_VALUE_REQUIRED` |
| `FRAME_COVERAGE` | `MEETS_APPROVED_MINIMUM`, `BELOW_APPROVED_MINIMUM`, `UNKNOWN`; minimum usable-frame count and rejected-frame limit are `POLICY_VALUE_REQUIRED`. | Both meet: `ALLOW`. Otherwise: `SIGNAL_BLOCK`; never average only accepted frames. | all compared signals | `COVERAGE_BELOW_APPROVED_MINIMUM` / `POLICY_VALUE_REQUIRED` |
| `ANIMAL_VISIBILITY` | `WHOLE_BODY`, `REQUIRED_REGIONS_VISIBLE`, `INSUFFICIENT`, `UNKNOWN`. Whole-body and required-regions may be compatible only per signal. | Matched: `ALLOW`. Explicit compatible pair: `DOWNGRADE`. Insufficient/unknown: `SIGNAL_BLOCK` affected signals. | landmark, limbs, body axis, geometry | `ANIMAL_VISIBILITY_INSUFFICIENT` |
| `BODY_SCALE` | `VALIDATED_STABLE_REFERENCE`, `BBOX_DERIVED_ONLY`, `UNAVAILABLE`, `UNKNOWN`. No compatible cross-state pair. | Validated reference on both sides: `ALLOW`. Bbox-only, unavailable, or unknown: `SIGNAL_BLOCK` every stable-scale-dependent signal. | normalized displacement, scale-dependent geometry | `BODY_SCALE_REFERENCE_UNSTABLE` |
| `POSE_EVIDENCE_COVERAGE` | `MEETS_APPROVED_MINIMUM`, `BELOW_APPROVED_MINIMUM`, `UNKNOWN`; minimum overlap is `POLICY_VALUE_REQUIRED`. | Both meet: `ALLOW`. Below/unknown or missing policy value: `SIGNAL_BLOCK`. | all pose-derived signals | `POSE_EVIDENCE_INSUFFICIENT` / `POLICY_VALUE_REQUIRED` |

`SPEED_PACE` is capture/activity context only. Faster, slower, or changed pace must never be interpreted as better, worse, improved, declined, healthier, recovered, or medically meaningful.

The taxonomy structure and default handling are defined here but remain `UNAPPROVED` pending differential review. No implementation may treat an unresolved or `UNKNOWN` state as `ALLOW`; it must emit `CAPTURE_POLICY_UNRESOLVED`, `POLICY_VALUE_REQUIRED`, or the more specific blocking reason.

Overall level:

- `COMPARABLE`: no required dimension is blocked and all requested signals meet their own gate.
- `PARTIALLY_COMPARABLE`: at least one signal is valid, while another dimension or signal is downgraded or blocked.
- `NOT_COMPARABLE`: no requested signal survives or a global gate fails.

`INSUFFICIENT_COMPARABLE_EVIDENCE` is returned when identity is confirmed but the surviving evidence cannot support any requested comparison. A side-view walking capture and a front-view sitting capture cannot produce gait comparison. Camera-motion-suppressed displacement is unavailable rather than treated as animal motion.

Numeric thresholds are not invented by this design. Every threshold must be versioned, justified by repeatability evidence, species-neutral unless separately approved, and red-team reviewed before implementation. When a required threshold is absent, the result is `INDETERMINATE` or `NOT_COMPARABLE`, never a permissive default.

### 5.3 Unsafe body-scale normalization block

The existing G3-C and PoC-2 `bodyLength` and `bodyHeight` evidence is pose-dependent bbox geometry, not a validated stable physical body scale. If the only available denominator is bbox width, bbox height, bbox-derived `bodyLength`, or bbox-derived `bodyHeight`, every signal requiring stable body-scale normalization is `SIGNAL_BLOCK` with `BODY_SCALE_REFERENCE_UNSTABLE`.

Body-relative normalization must not be claimed to automatically correct camera-distance differences. Only a future validated, versioned stable-scale reference may enable these signals.

## 6. Signal-level comparison

There is no whole-pet score and no global direction. Every signal is independently gated.

Initial signal vocabulary:

- `BODY_AXIS_VARIATION`
- `BODY_CENTER_DISPLACEMENT`
- `OBSERVABLE_LANDMARK_DISPLACEMENT`
- `FRONT_LIMB_MOVEMENT_EVIDENCE`
- `REAR_LIMB_MOVEMENT_EVIDENCE`
- `LEFT_RIGHT_MOVEMENT_DIFFERENCE`
- `TEMPORAL_CONTINUITY`
- `POSE_TRANSITION_EVIDENCE`
- `GEOMETRY_AVAILABILITY`
- `MOTION_EVIDENCE_COVERAGE`

```text
SignalComparison
  signalId
  unit
  availability: OBSERVED | UNKNOWN
  baseline
    normalizedValue
    evidenceCoverage
    evidenceRefs[]
  followup                    # same fields
  normalization
    method
    policyVersion
    denominator
    invariants[]
  comparability: COMPARABLE | PARTIALLY_COMPARABLE | NOT_COMPARABLE
  direction: INCREASED | DECREASED | STABLE | INDETERMINATE | NOT_COMPARABLE
  absoluteDifference
  relativeTechnicalDifference
    value
    label: TECHNICAL_CHANGE_ONLY
    availability: OBSERVED | UNKNOWN
    reasonCode
  uncertaintyReasonCodes[]
```

A signal is comparable only when both sides have compatible schema and units, sufficient observed intersection, supported normalization, comparable capture conditions, and no applicable suppression. An `ESTIMATED` or `UNKNOWN` value cannot be promoted to `OBSERVED`. Missing wrist/ankle evidence, for example, remains unavailable for joint-dependent signals.

## 7. Direction and magnitude rules

Direction has a mandatory eligibility gate before `delta` may be classified. A signal must satisfy its approved minimum landmark overlap, usable-frame count, usable duration, rejected-frame-rate limit, `UNKNOWN`/`OUT_OF_FRAME` limits, detector-miss limit, side-ambiguity limit, and camera-motion-suppression limit. The gate uses the full opportunity ledger, not an average of successful evidence.

If any required policy value is not approved, direction is `INDETERMINATE` or `NOT_COMPARABLE` with `POLICY_VALUE_REQUIRED`. If evidence is below an approved minimum, direction is `INDETERMINATE` or `NOT_COMPARABLE` with `COVERAGE_BELOW_APPROVED_MINIMUM`. A clear or large numeric delta does not override either result, and `STABLE` is not permitted without passing the same coverage gate.

For coverage-eligible comparable normalized values `A` and `B`, signed technical difference is `delta = B - A`.

- `INCREASED`: `delta` exceeds the positive, versioned neutral tolerance.
- `DECREASED`: `delta` is below the negative of the same tolerance.
- `STABLE`: `abs(delta)` is within the symmetric tolerance.
- `INDETERMINATE`: evidence exists but uncertainty or an unapproved tolerance prevents direction.
- `NOT_COMPARABLE`: the signal gate fails.

The tolerance must be symmetric around zero and derived from deterministic repeatability/no-change evidence. There is no follow-up-favoring threshold. Until the per-signal tolerance is approved, the signal returns `POLICY_VALUE_REQUIRED` and cannot emit a directional result.

Absolute difference preserves the signal's normalized unit. Relative technical difference uses a symmetric denominator:

```text
safeRelativeDenominator = min(abs(A), abs(B))
relativeTechnicalDifference = (B - A) / safeRelativeDenominator
```

Both `abs(A)` and `abs(B)` must exceed the same approved safe-denominator threshold. If either side is unavailable or within the unapproved/unsafe near-zero range, relative technical difference is `UNKNOWN` with `RELATIVE_DENOMINATOR_UNSAFE`; while the numeric threshold is unapproved it also carries `POLICY_VALUE_REQUIRED`.

Required properties under identical canonical rounding are `availability(A,B) = availability(B,A)` and `value(B,A) = -value(A,B)`. A serialized relative value always carries `TECHNICAL_CHANGE_ONLY`; it must never be labeled improvement, decline, efficacy, recovery, or percentage healthy.

### 7.1 Rounding and classification order

Direction classification uses canonical pre-serialization technical values. The required order is:

1. validate and normalize evidence under one approved policy and numeric execution profile;
2. calculate both sides and their difference without side-specific rounding;
3. apply the single specified rounding operation at the canonicalization stage, including normalization of negative zero to zero;
4. classify the canonical rounded difference against the canonical rounded symmetric tolerance;
5. serialize those same canonical values without a second classification or side-dependent rounding.

Rounding ties use one versioned tie rule for both orders. At a threshold boundary, the same inclusive/exclusive operator is used after swapping A/B. Classification before rounding in one direction and after rounding in the reverse direction is forbidden.

## 8. Evidence coverage model

Coverage is a structured evidence ledger, not a single averaged confidence:

```text
EvidenceCoverage
  expectedComparableSignalCount
  comparableSignalCount
  nonComparableSignalCount
  baseline
    expectedFrames
    usableFrames
    rejectedFrames
    observedLandmarkOpportunities
    observedLandmarks
    unknownLandmarks
    outOfFrameLandmarks
    detectorMissFrames
    sideAmbiguousFrames
    cameraMotionSuppressedPairs
  followup                    # same fields
  overlap
    expectedSignalOpportunities
    observedSignalOpportunities
    overlappingLandmarks
    overlappingFrameDurationMs
  rates
    signalCoverage
    baselineUsableFrameCoverage
    followupUsableFrameCoverage
    observedOverlapCoverage
    baselineUnknownRate
    followupUnknownRate
    baselineOutOfFrameRate
    followupOutOfFrameRate
    baselineDetectorMissRate
    followupDetectorMissRate
    baselineSideAmbiguityRate
    followupSideAmbiguityRate
    baselineCameraSuppressionRate
    followupCameraSuppressionRate
```

Every rate retains its numerator and denominator. Coverage uses the observed intersection and penalizes rejected or unavailable opportunities; it cannot average only successful points. Coverage is never named or presented as accuracy or biological confidence.

## 9. False-change defenses

| Confound | False change mechanism | V1 handling |
|---|---|---|
| Camera closer/farther | Pixel displacement and bbox size change | Block stable-scale-dependent signals when only bbox-derived scale exists; require a future validated scale reference |
| Different viewpoint | Foreshortening and visible-side changes | Viewpoint relation gate; block affected gait/side signals, downgrade the remainder |
| Different walking speed | Amplitude and cadence change with capture behavior | Apply `SPEED_PACE`: only an identical approved pace band may pass; different bands, `UNKNOWN`, unaligned `VARIABLE`, or missing speed-band policy block every pace-sensitive signal |
| Different frame rate | Per-frame displacement changes | Use validated timestamps and time-normalized signals; block temporal signals when timing is unreliable |
| Different clip duration | Unequal opportunities and incomplete cycles | Duration-aware windows and denominators; downgrade or block insufficient windows |
| Different surface/floor | Motion evidence changes with context | Capture-context mismatch downgrade; block sensitive signals when policy cannot isolate it |
| Leash influence | External restraint changes motion | Reject affected intervals; unknown/mismatched leash context downgrades or blocks affected signals |
| Owner interaction | Cueing, touching, or obstruction changes motion | `CUE_ONLY`, physical contact, and obstruction all reject affected intervals; re-run the full coverage gate on clean uncued evidence, and block affected signals when clean evidence is insufficient |
| Camera motion | Image translation resembles body motion | Preserve frozen camera-motion suppression; suppressed displacement is `UNKNOWN` |
| Lighting difference | Detector/pose coverage and confidence drift | Use actual detector/pose coverage gates; downgrade/block, never infer change from brightness |
| Partial occlusion | Visible-only average changes composition | Compare observed landmark intersection only and charge missing opportunities to coverage |
| Detector bbox change | Normalization scale/center jumps | Use bbox stability only as detector-quality evidence; block dependent signals when unstable and never treat bbox as validated physical scale |
| Left/right swap | Side-specific sign or magnitude reverses | Require stable anatomical-side identity; ambiguity blocks all side-dependent signals |
| Pose-model confidence drift | Different subsets pass thresholds | Same model/policy where required; use paired observed intersection and lowest supported coverage |
| Different activity state | Sitting/standing/walking have incompatible geometry | Activity-specific signal gate; no gait comparison across incompatible states |
| Insufficient overlapping landmarks | Sparse subsets create misleading averages | Minimum overlap gate; return `UNKNOWN`/`NOT_COMPARABLE`, never pad missing landmarks |

## 10. Before/follow-up symmetry

For any admitted pair `(A, B)`, the comparison projection must satisfy:

- identity result, capture-dimension relations, pairwise coverage totals, comparable signal set, and uncertainty reasons are invariant under swap; the named baseline/follow-up coverage subobjects exchange sides without changing their contents;
- `delta(B,A) = -delta(A,B)` after the same canonical rounding;
- absolute magnitude is unchanged;
- `INCREASED` swaps with `DECREASED`; `STABLE`, `INDETERMINATE`, and `NOT_COMPARABLE` remain unchanged;
- no field named baseline/follow-up may alter thresholds, normalization, or signal eligibility;
- product or expected-outcome information is unavailable to the engine.

Relative-difference availability is identical after swap because denominator safety examines both magnitudes symmetrically. Provider/model parity, coverage eligibility, and unresolved-policy blocking are also evaluated as unordered pair properties.

Timestamps and ordered evidence references may change the output digest, but not the neutral comparison result. If chronology is required by an external workflow, chronology validation is outside direction computation and must not introduce positive bias. Any intentionally asymmetric gate must have a documented technical reason, version, and red-team approval; none is approved for V1.

## 11. No-change and deterministic controls

Required control: identical evidence `A` versus `A`, or a canonical deterministic duplicate with the same analytical payload.

Expected result for every eligible signal:

- `STABLE`;
- absolute difference `0`;
- relative technical difference `0` when its denominator is safe, otherwise `UNKNOWN` for denominator safety only;
- identical coverage ledgers on both sides;
- no random sampling, wall-clock input, unordered reduction, or runtime-dependent threshold.

Exact-duplicate deviation is a contract failure, not evidence of motion change. Near-duplicate controls are required to establish future neutral tolerances but do not authorize an accuracy claim.

## 12. UNKNOWN propagation

`UNKNOWN` remains null and never becomes zero. `OUT_OF_FRAME`, detector miss, side ambiguity, low technical confidence, geometry gaps, camera-motion suppression, missing timestamps, and unsupported normalization all reduce coverage and propagate to dependent signals.

Low SimCC or technical confidence is not `OCCLUDED`. `ESTIMATED` evidence remains distinguishable and cannot satisfy an observed-only rule. A partial result lists the precise comparable and non-comparable signals; it does not fill gaps with the G3-C silhouette template or any other fixed geometry.

## 13. Provenance and digest

Provenance records both evidence digests; their contract, detector, pose provider, model artifact, adapter, Skeleton, Geometry, Temporal, normalization, direction, coverage, and canonicalization versions; and the comparison engine build identity. It excludes raw pixels, media paths, personal data, product metadata, medical labels, and runtime measurements.

Canonicalization uses stable object keys and arrays, fixed numeric rounding, `-0` to `0`, null only for unavailable values, rejection of non-finite numbers, and UTF-8 serialization. A cryptographic digest algorithm must be selected and approved before implementation; the legacy FNV-1a engineering checksum must not be represented as cryptographic integrity.

## 14. Non-medical output example

> 與基準紀錄相比，本次影片中可比較的後肢動作幅度方向為增加；身體軸變化方向為減少。前肢證據因遮擋與可觀察重疊不足，無法比較。以上為影片中的技術性動作差異，不代表健康、疼痛、恢復或療效判定。

The presentation layer must preserve `NOT_COMPARABLE`, uncertainty, and `TECHNICAL_CHANGE_ONLY`. It must not collapse the result into “mobility improved” or any equivalent conclusion.

## 15. Required reason codes

Minimum vocabulary:

- `PET_IDENTITY_NOT_CONFIRMED`
- `PRODUCT_CONTEXT_FORBIDDEN`
- `POLICY_VALUE_REQUIRED`
- `BODY_SCALE_REFERENCE_UNSTABLE`
- `ESTIMATOR_POLICY_MISMATCH`
- `CAPTURE_POLICY_UNRESOLVED`
- `COVERAGE_BELOW_APPROVED_MINIMUM`
- `INSUFFICIENT_COMPARABLE_EVIDENCE`
- `SCHEMA_INCOMPATIBLE`
- `ACTIVITY_STATE_MISMATCH`
- `SPEED_PACE_MISMATCH`
- `SPEED_PACE_POLICY_REQUIRED`
- `OWNER_CUE_PRESENT`
- `OWNER_INTERACTION_PRESENT`
- `VIEWPOINT_MISMATCH`
- `BODY_SCALE_UNSTABLE`
- `FRAME_TIMING_UNRELIABLE`
- `CLIP_DURATION_INSUFFICIENT`
- `DETECTOR_INSTABILITY`
- `DETECTOR_MISS`
- `ANIMAL_VISIBILITY_INSUFFICIENT`
- `OCCLUSION_EXCESSIVE`
- `ANATOMICAL_SIDE_AMBIGUOUS`
- `CAMERA_MOTION_RISK`
- `POSE_EVIDENCE_INSUFFICIENT`
- `OVERLAPPING_LANDMARKS_INSUFFICIENT`
- `NORMALIZATION_UNSUPPORTED`
- `RELATIVE_DENOMINATOR_UNSAFE`
- `DIRECTION_TOLERANCE_UNAPPROVED`
- `UNKNOWN_PROPAGATED`

## 16. Validation obligations before implementation

1. Schema allowlist and recursive product/medical-field rejection.
2. Cross-pet and unconfirmed-identity rejection with zero directional output.
3. Full 16-confound matrix with reject, suppress, or downgrade evidence.
4. Per-signal observed-intersection and `UNKNOWN` propagation tests.
5. Exact A/A and restart determinism controls.
6. A/B versus B/A property tests over all directions, gates, missingness patterns, and numeric edge cases.
7. Sparse-evidence tests proving coverage cannot be inflated by averaging only successful points.
8. Camera-motion, detector miss, side ambiguity, and activity mismatch tests.
9. Near-zero denominator and numeric-boundary tests.
10. Forbidden-language and output-schema tests.
11. Coverage-below-minimum with arbitrarily large delta, proving no direction is emitted.
12. Symmetric relative-denominator availability and signed-value inversion tests.
13. Bbox-only body-scale rejection tests for every scale-dependent signal.
14. Detector/provider/model/adapter/schema/policy parity mismatch tests.
15. Closed-taxonomy tests proving every `UNKNOWN` state downgrades or blocks.
16. Rounding-tie, negative-zero, and threshold-boundary swap tests.
17. `CUE_ONLY` interval exclusion tests proving cue-influenced evidence cannot contribute to direction.
18. Clean-evidence re-evaluation tests proving removal of cue/contact/obstruction intervals invokes the complete coverage gate again.
19. Cue-contaminated versus clean-capture tests proving the pair cannot silently pass.
20. Different approved walking-pace-band tests proving pace-sensitive signals cannot emit direction.
21. `UNKNOWN` and unaligned `VARIABLE` pace tests proving neither can permissively pass.
22. Missing speed-band-policy tests proving fail-closed `SPEED_PACE_POLICY_REQUIRED` behavior.
23. A/B swap property tests proving `SPEED_PACE` eligibility and blocking reasons are symmetric.

## 17. Implementation-blocking policy values

- Per-signal neutral tolerance: `UNAPPROVED / POLICY_VALUE_REQUIRED`.
- Minimum landmark overlap: `UNAPPROVED / POLICY_VALUE_REQUIRED`.
- Minimum usable frame count and rejected-frame limit: `UNAPPROVED / POLICY_VALUE_REQUIRED`.
- Minimum usable duration: `UNAPPROVED / POLICY_VALUE_REQUIRED`.
- Safe relative denominator threshold: `UNAPPROVED / POLICY_VALUE_REQUIRED`.
- Speed-band mapping and any future cross-band calibration: `UNAPPROVED / SPEED_PACE_POLICY_REQUIRED`.
- Closed capture taxonomy: structure and handling are defined in V1.1 but remain `UNAPPROVED` pending review.
- Cryptographic digest algorithm: `UNAPPROVED / POLICY_VALUE_REQUIRED`.
- Whether estimated evidence may support any future signal; V1 defaults to observed-only where geometry depends on landmarks.
- External identity receipt lifetime and revocation behavior.
- User-facing localization review to prevent medical or positive-bias wording.

Any comparison depending on an unapproved policy value must not produce `INCREASED`, `DECREASED`, or `STABLE`. These decisions block implementation, not contract differential review.

**CONTRACT ACCEPTED FOR IMPLEMENTATION DESIGN**
