# Guardian Motion Dataset — G2-C

Status: IMPLEMENTED — SYNTHETIC VALIDATION ONLY

Purpose: deterministic engineering validation. This dataset is not an AI-training corpus.

## 1. Scope

Guardian Motion Dataset is a reusable, local evidence library for comparing repeated motion signatures of the same pet. It stores derived technical evidence and non-personal fixture metadata. It does not store or upload raw video.

Allowed source classes:

- `SYNTHETIC`
- `GUARDIAN_HQ_AUTHORIZED_TEST`

Production user media is rejected. Raw-media fields, owner identity, precise location, medical fields, health/fatigue scores, treatment fields, and training labels are rejected recursively.

`GUARDIAN_HQ_AUTHORIZED_TEST` records additionally require a non-personal dataset-level authorization reference.

## 2. Dataset contract

Dataset version: `guardian-motion-dataset-v1`

Required purpose: `DETERMINISTIC_ENGINEERING_VALIDATION`

Every recording contains:

| Area | Required evidence |
|---|---|
| Identity | Non-personal `recordingId`, `petId`, repeat group and sequence |
| Species | `DOG` or `CAT` |
| Behavior | `REST`, `WALKING_MOVING`, `TURNING`, `TRANSITION`, `MIXED_ACTIVITY`, or `UNKNOWN` |
| Capture condition | Device type, lighting, camera, distance, view, visibility, and length |
| Skeleton | Versioned `OBSERVED` or explicit `UNKNOWN` evidence |
| Motion geometry | Versioned `OBSERVED` or explicit `UNKNOWN` evidence |
| Feature vector | Exact approved G2-A ten-feature vector and schema version |
| Quality | Quality result, policy version, and technical reason codes |
| Confidence | Tracking, motion, and overall technical confidence |

Unknown Skeleton or Motion Geometry must use `value: null` and an explicit reason. They are never converted to zero.

## 3. Indexes

The immutable dataset builds deterministic indexes for:

- species;
- behavior;
- pet alias;
- repeat group;
- each capture-condition dimension;
- Skeleton schema and availability;
- Motion Geometry schema and availability;
- Feature Vector schema;
- quality result;
- confidence band.

Record order and index keys are canonicalized. A stable FNV-1a checksum detects accidental changes and supports reproducibility; it is an engineering checksum, not a cryptographic security control.

## 4. Same-pet signature comparison

Comparison is allowed only within one `petId`, optionally restricted to one repeat group. Consecutive repeated recordings are compared through:

- the GBE observed feature intersection, with existing confidence, evidence, schema, unit, and outlier safeguards;
- the observed Motion Geometry signature intersection when geometry exists.

If Geometry is `UNKNOWN`, comparison returns `GEOMETRY_UNKNOWN`; it does not fabricate geometric deltas. If fewer than two matching recordings exist, it returns `INSUFFICIENT_REPEATED_RECORDINGS`.

The library does not produce cross-pet ranking, population norms, medical labels, or training labels.

## 5. G2-B and G3-B integration

The adapter converts a G2-B validation report into G2-C records. It binds the report to the originating manifest, carries forward the feature schema, quality policy, confidence, and capture conditions, and sets Skeleton and Motion Geometry to:

- `SKELETON_ENGINE_NOT_IMPLEMENTED`
- `MOTION_LAYER_NOT_IMPLEMENTED`

This preserves the G3-A architecture boundary for reports that do not contain Motion Layer evidence. G2-C does not itself estimate Skeleton or generate Geometry.

G3-B and G3-C provide an authorized `guardian-motion-contract-v1` ingestion path. Compatible envelopes may supply derived `guardian-motion-skeleton-v2` and `guardian-motion-geometry-v2` signatures. G3-C raw pixels and local video files are discarded before ingestion; the adapter still rejects raw media, production-user data, incompatible versions, and invalid identifier bindings.

## 6. Local operation

Synthetic example:

```powershell
cd app
npm run dataset:g2c -- validation/synthetic-manifest.example.json
```

Optional local output must remain under the ignored directory:

```powershell
npm run dataset:g2c -- validation/synthetic-manifest.example.json validation/output/motion-dataset.json
```

The runner refuses to write a dataset export outside `app/validation/output`.

## 7. Current evidence

The checked-in example contains two repeated synthetic fixture records for one synthetic pet. It produces one same-pet comparison pair. It contains no production media and no raw video.

Current checked-in G2-B example Skeleton status: `UNKNOWN`. G3-B synthetic Motion Envelopes can provide `OBSERVED` derived evidence through the tested adapter.

Current checked-in G2-B example Motion Geometry status: `UNKNOWN`. G3-B synthetic Motion Envelopes can provide `OBSERVED` derived evidence through the tested adapter.

Current real-device evidence count: 0.

No accuracy, biological interpretation, diagnosis, disease prediction, health score, treatment recommendation, or V1 readiness is claimed.

## 8. Known limitations

- G3-C can produce a Motion Envelope from browser-decoded local pixels, but its deterministic silhouette estimator remains an unvalidated engineering spike rather than a V1 pose model.
- The library currently consumes G2-B technical-frame validation evidence rather than decoded raw video.
- Behavior is a non-medical fixture category supplied by the test manifest, not inferred by the dataset.
- Confidence bands support indexing only and do not alter the underlying numeric confidence.
- The checksum detects reproducibility changes but does not authenticate files.
- Real-device coverage, species balance, environmental diversity, and long-term dataset growth are not validated.

## 9. Validation

Automated tests cover complete indexing, deterministic checksums, input-order independence, validation-only purpose, rejection of production/raw/private/medical/training data, explicit unknown handling, same-pet isolation, observed-intersection comparison, shared dog/cat schemas, and G2-B conversion without fabricated Motion Layer evidence.

No cloud, external AI, new feature, production user media, merge, or push is included.

AWAITING GUARDIAN MOTION DATASET REVIEW
