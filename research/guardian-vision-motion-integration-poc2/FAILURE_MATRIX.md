# Guardian Vision PoC-2 Failure Matrix

All cases are experimental technical-evidence tests. They make no accuracy or medical claim.

| Case | Input | Required propagation | Result |
|---|---|---|---|
| Low-confidence landmark | SimCC below the frozen Skeleton V2 confidence gate | `UNKNOWN`, never `OCCLUDED` | PASS — `LEARNED_LANDMARK_CONFIDENCE_LOW` |
| Detector miss | No dog detection in a sampled video frame | explicit frame rejection | PASS — `DETECTOR_MISS`; actual direct-video frame 0 rejected |
| Multi-animal frame | multiple same-class targets without target instance selection | reject ambiguous target | PASS — `MULTIPLE_ANIMALS_TARGET_SELECTION_REQUIRED` |
| Partial-occlusion-like evidence | paw score collapses without an explicit occlusion signal | `UNKNOWN`, not invented `OCCLUDED` | PASS |
| Left/right uncertainty | provider side status set to ambiguous | all side-dependent keys `UNKNOWN` | PASS — `ANATOMICAL_SIDE_AMBIGUOUS` |
| Tail-base drift | controlled tail-base movement across frames | temporal technical displacement; tail mid/tip stay `UNKNOWN` | PASS |
| Paw instability | one-frame low-confidence paw | affected paw becomes `UNKNOWN`; no interpolation promotion | PASS |
| Camera-motion interaction | controlled camera-motion risk above frozen threshold | displacement suppressed | PASS — `CAMERA_MOTION_RISK` |
| Missing wrist/ankle | AP-10K has no corresponding landmarks | joint angles and limb extension stay `UNKNOWN` | PASS — `GEOMETRY_EVIDENCE_GAP` |

The actual sparse local-video run also produced camera-motion risk `0.678678354745198`; all direct-video frame-to-frame displacement values were therefore suppressed instead of being reported as animal movement.
