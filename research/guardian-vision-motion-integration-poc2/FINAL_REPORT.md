# Guardian Vision PoC-2 Final Report

Status: isolated learned-vision integration validation

## 1. PoC-1 / 1.1 preservation commit

- Branch: `codex/guardian-vision-rtmpose-poc1`
- Commit: `07a94ba9d80d3d9a277b429ef145d126ad010d89`
- Remote preservation push: complete
- Model, detector, media, runtime, and research-file hashes are preserved in the committed manifests.
- Model weights, media, overlays, inference output, `.venv`, and Python bytecode were not committed.

## 2. PoC-2 branch and worktree

- Branch: `codex/guardian-vision-motion-integration-poc2`
- Worktree: `C:\Users\user\OneDrive\文件\毛孩生活專案\work\guardian-vision-motion-integration-poc2`
- Base: PoC-1.1 preservation commit `07a94ba`
- No merge, production-code modification, or write to Guardian A or E was performed.

## 3. Detector, provider, and model identities

- Provider: `GUARDIAN_RTMPOSE_AP10K_EXPERIMENTAL`
- Adapter: `guardian-learned-pose-adapter-v1`
- Detector: `yolox-m-coco-onnx-0.1.1rc0`
- Pose: `rtmpose-m-ap10k-20230206`
- Frozen runtime source: G3-C preservation commit `84d4bb834e40aa0650d77f373b289a82d6b7b159`
- SimCC is retained as raw technical model output and is not treated as probability or accuracy.

## 4. Guardian mapping result

The adapter retains the PoC-1 maximum capability of 15 `OBSERVED` candidates, 4 `ESTIMATED`, and 7 `UNKNOWN`, but applies the frozen Skeleton V2 confidence gate per frame. It never pads to a quota.

- Sitting: 12 observed, 2 estimated, 12 unknown per repeated frame.
- Standing: 14 observed, 4 estimated, 7 unknown, 1 out-of-frame per repeated frame.
- Adjacent walking frames: observed counts 11, 3, 12, 12, 12; estimated counts 0, 0, 4, 2, 2.
- Direct sparse video, five accepted frames: 58 observed, 10 estimated, and 62 unknown/out-of-frame in aggregate.

## 5. Skeleton V2 integration

Learned evidence entered the unchanged `guardian-motion-skeleton-v2` 26-key contract. `OBSERVED`, `ESTIMATED`, `UNKNOWN`, `OUT_OF_FRAME`, and `OCCLUDED` meanings were not changed. Low confidence always became `UNKNOWN`; no low score became `OCCLUDED`.

## 6. Geometry availability

- Body height/length ratio was observed from detector-box measurements in every accepted frame.
- Body axis was available only when both shoulders and both hips passed the frozen evidence gates.
- Standing provided body axis plus body height/length ratio.
- Some learned video frames also provided body axis.

## 7. Geometry evidence gaps

AP-10K does not supply Guardian wrists or ankles. Therefore all four shoulder–elbow–wrist and hip–knee–ankle angles, limb extension/compression, and bilateral symmetry remain `UNKNOWN`. Estimated spine/body-center points were not promoted to observed geometry.

Result: `GEOMETRY_EVIDENCE_GAP`, correctly propagated without fake joints.

## 8. Temporal result

The adjacent walking sequence produced 12 observed per-landmark displacement signals with median normalized displacement `0.37652757459586417`. The repeated static sequences produced median displacement `0`.

The sparse direct-video sequence had bbox camera-motion proxy `0.678678354745198`; the frozen Temporal Runtime suppressed all displacement with `CAMERA_MOTION_RISK`. This prevents camera movement from being silently represented as animal movement.

## 9. Standing result

- Motion status: `COMPLETE_OR_PARTIAL`
- Static technical-sequence displacement median: `0`
- Geometry: body axis and body height/length ratio available
- Motion digest: `fnv1a32-8d4285ce`
- Limitation: three-frame sequence repeats one learned still and is not a real standing video.

## 10. Sitting result

- Motion status: `COMPLETE_OR_PARTIAL`
- Static technical-sequence displacement median: `0`
- Geometry: body height/length ratio available; body axis unavailable because hip evidence did not pass the frozen gate
- Motion digest: `fnv1a32-5d4168b9`
- Limitation: three-frame sequence repeats one learned still and is not a real sitting video.

## 11. Walking result

- Adjacent same-dog learned sequence: displacement median `0.37652757459586417`, camera-risk proxy `0.18117908991276527`.
- Direct local video: 6 sampled frames, 5 accepted dog detections and 1 explicit `DETECTOR_MISS`.
- Direct-video digest: `fnv1a32-7d9e4218`.
- Sparse direct-video displacement remained unknown because camera risk exceeded the frozen suppression threshold.

Walking is distinguishable from the static evidence through the adjacent learned sequence, without using medical or behavioral interpretation.

## 12. Motion Envelope result

All three pose sequences and the direct-video sequence produced `guardian-motion-contract-v1` envelopes. Provenance is retained in the experimental learned-evidence wrapper, while the frozen inner Motion Envelope contract remains unchanged. Raw model scores, evidence states, reason codes, schema versions, and UNKNOWN propagation are retained.

## 13. G2-C ingestion

G2-C ingestion passed with four authorized research records:

- sitting;
- standing;
- adjacent walking;
- direct local-video walking.

Dataset checksum: `fnv1a32-8450dbb3`.

The dataset contains Skeleton and Geometry signatures only. It contains no raw pixels, video frames, media paths, production-user data, or medical output. G2-A feature fields remain explicitly `UNKNOWN` because this PoC did not derive them from the learned envelope.

## 14. Digest repeatability

Five identical runs produced one digest for every tested sequence:

- sitting: inner 5/5 `fnv1a32-5d4168b9`; experimental 5/5 `fnv1a32-ee95419f`;
- standing: inner 5/5 `fnv1a32-8d4285ce`; experimental 5/5 `fnv1a32-334c7a11`;
- adjacent walking: inner 5/5 `fnv1a32-98c823c6`; experimental 5/5 `fnv1a32-f48128f2`;
- direct-video walking: inner 5/5 `fnv1a32-7d9e4218`; experimental 5/5 `fnv1a32-afeb653a`.

## 15. G3-C vs learned comparison

The same source video frame indices 600, 1200, 1800, 2400, and 3000 were compared. G3-C used 96-pixel-wide OpenCV-decoded copies; learned inference used the original 480p frames.

- G3-C silhouette: frame 600 matched its enrolled foreground signature; frame 1200 returned `MULTIPLE_PETS`, so the sequence correctly produced no Motion Envelope.
- Learned path: all five corresponding frames produced learned Skeleton evidence; aggregate 58 observed, 10 estimated, and 62 unknown/out-of-frame landmarks.
- Learned geometry produced one or two supported values per frame; no joint geometry was invented.
- Direct-video temporal displacement remained suppressed because camera risk was high.

The learned path added pose-responsive anatomical evidence. It did not merely add numeric fields or increase certainty indiscriminately.

## 16. Failure propagation

Controlled tests passed for low confidence, detector miss, multi-animal target ambiguity, partial-occlusion-like low evidence, left/right uncertainty, tail-base drift, paw instability, camera-motion suppression, and missing wrist/ankle geometry. Every case produced explicit UNKNOWN, rejection, or reason codes. No silent promotion occurred.

## 17. Performance

Direct local-video learned inference on the current Intel Celeron N4120 host:

- 6 sampled frames;
- mean total latency: `11,546.24 ms/frame`;
- median total latency: `10,539.26 ms/frame`;
- effective rate: `0.0866 FPS`.

Downstream Guardian integration median runtime, excluding detector and pose inference:

- sitting: `14.906 ms`;
- standing: `12.159 ms`;
- adjacent walking: `17.606 ms`.

This is not real-time performance and is not a product claim.

## 18. Tests

- PoC-2 learned integration: 10/10 pass.
- Coverage includes Skeleton contract, confidence/UNKNOWN boundary, estimated-source gate, geometry gap, temporal distinction, camera suppression, detector miss, multi-animal rejection, side uncertainty, tail/paw instability, digest repeatability, and G2-C ingestion.
- Source and generated JSON validation: pass.
- Python extraction helper compilation: pass.

## 19. Remaining blockers

- Real-time inference is not available on the current hardware.
- RTMDet deployable artifact A/B remains blocked.
- Camera-motion estimation is only a bbox-change proxy and is not calibrated.
- Sitting and standing temporal evidence uses repeated learned stills, not continuous same-subject videos.
- AP-10K anatomical-side labels are consumed as declared model semantics but have not received independent left/right ground-truth validation.
- Wrist and ankle absence prevents four joint angles and complete limb geometry.
- Detector misses and multi-animal target selection need a future tracking policy.
- Learned Motion Envelope to G2-A feature derivation remains unimplemented; G2-C feature fields correctly remain UNKNOWN.

## 20. Recommendation

The experimental integration success gate is satisfied: learned landmarks enter unchanged Skeleton V2, supported Geometry is consumed, walking differs from static evidence, Motion Envelopes and G2-C records are deterministic, UNKNOWN is preserved, and the G3-C comparison is quantified.

This result authorizes architectural review only. It does not authorize production integration, real-time claims, medical inference, accuracy claims, merge, or deployment.

**PoC-2 PASS**
