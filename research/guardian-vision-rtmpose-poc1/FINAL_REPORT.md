# Guardian Vision PoC-1 Final Report

Status: **PoC implemented; FIRST SUCCESS GATE PARTIAL PASS; conditional PoC-2 recommendation.**

This report is research-only. It makes no accuracy, medical, diagnosis, pain, or disease claim.

## 1. Branch / worktree

- Branch: `codex/guardian-vision-rtmpose-poc1`
- Worktree: `C:\Users\user\OneDrive\文件\毛孩生活專案\work\guardian-vision-rtmpose-poc1`
- Base: local `main` commit `3b43e9d`
- A, E G3-C preservation, and all production/runtime contracts were not modified.
- No merge and no push were performed.

## 2. Exact model and detector versions

- Pose: `rtmpose-m_8xb64-210e_ap10k-256x256`, checkpoint `rtmpose-m_simcc-ap10k_pt-aic-coco_210e-256x256-7a041aa1_20230206.pth`.
- Deployment: OpenMMLab ONNX SDK export, MMDeploy metadata version 1.2.0, MMPose metadata version 1.1.0, opset 11, `1x3x256x256` input, `simcc_x` / `simcc_y` outputs.
- Detector actually used: YOLOX-m COCO ONNX release `0.1.1rc0`, `1x3x640x640`, cat class 15 and dog class 16.
- The official MMPose `animal` alias documents RTMDet-m. YOLOX-m is an explicit PoC deployment substitution because a directly consumable multiclass RTMDet-m ONNX SDK archive was not published with this checkpoint. The learned pose model is unchanged.

## 3. Sources and licenses

- MMPose animal inferencer and alias: https://github.com/open-mmlab/mmpose/blob/main/docs/en/user_guides/inference.md
- RTMPose AP-10K config: https://github.com/open-mmlab/mmpose/blob/main/projects/rtmpose/rtmpose/animal_2d_keypoint/rtmpose-m_8xb64-210e_ap10k-256x256.py
- AP-10K keypoint definition: https://github.com/open-mmlab/mmpose/blob/main/configs/_base_/datasets/ap10k.py
- Pose checkpoint and deployment archive: `download.openmmlab.com` URLs recorded in `model-manifest.json`.
- YOLOX release: https://github.com/Megvii-BaseDetection/YOLOX/releases/tag/0.1.1rc0
- MMPose: Apache-2.0.
- YOLOX: Apache-2.0.
- AP-10K dataset: CC BY 4.0.

Commercial-use note: no non-commercial restriction was found in those licenses. Distribution must preserve Apache license/NOTICE obligations, and AP-10K-derived use requires attribution. Before a product shipment, Guardian should obtain legal review of checkpoint/data provenance and prepare a third-party notice. This is not legal advice.

## 4. SHA-256

| Artifact | SHA-256 |
|---|---|
| Official PyTorch checkpoint | `896e3665d849ef7eb9b6ec0995955796cc9810f024fa0aa0bdc18acb0d68bf52` |
| OpenMMLab ONNX SDK zip | `2d75445331cf2f21d6e164430f96ffa765cd874872965ae1736932dda03987f0` |
| Extracted RTMPose ONNX | `1cfd1c86e0d9e5d5f95178bcd95ee9a4e8386a624cd3c57519f27ff58cac7f28` |
| YOLOX-m ONNX | `21ff6cfdeb53b013bac2249599e55f00bff3cfdfdab37ed7a4620818c1d15b3f` |

## 5. Model sizes

| Artifact | Bytes | Approx. MiB |
|---|---:|---:|
| Official PyTorch checkpoint | 54,721,413 | 52.19 |
| OpenMMLab ONNX SDK zip | 50,709,303 | 48.36 |
| Extracted RTMPose ONNX | 54,478,120 | 51.95 |
| YOLOX-m ONNX | 101,259,744 | 96.57 |

## 6. Runtime used

- Windows x64, Python 3.12.13.
- rtmlib 0.0.16 as a thin runner; the default `Animal` solution was not used because it now selects ViTPose.
- ONNX Runtime 1.28.0 CPUExecutionProvider.
- OpenCV 5.0.0.93, NumPy 2.5.1.
- Fully local inference after model files were downloaded.

## 7. CPU / GPU requirement

- Tested host: Intel Celeron N4120 1.10 GHz, 4 logical processors, CPU-only ONNX Runtime.
- GPU is not required for functional inference.
- This CPU is not suitable for real-time processing: single-animal frames averaged about 11.2 seconds end-to-end.
- CUDA/TensorRT/OpenVINO performance was not tested. A GPU or optimized accelerator path is expected to be necessary for frame-by-frame product use, but no FPS claim is made without measurement.

## 8. Dog inference result

- Sitting image: dog detected; 17 AP-10K coordinates and 17 raw confidence scores returned.
- At the 0.30 PoC threshold: 15 Guardian direct points OBSERVED, 4 geometric points ESTIMATED, 7 UNKNOWN.
- Walking clip: dog detected in 5/5 sampled frames.
- Visual inspection shows paws, knees, elbows, head, neck, and trunk following actual gait phase.
- Bbox-normalized mean landmark trajectory span: 0.281; median 0.250.
- Largest spans: left front paw 0.476, right front paw 0.405, left rear paw 0.388, left elbow 0.384, left knee 0.366.

## 9. Cat inference result

- Seated/playing clip: cat detected in 8/8 sampled frames.
- 17 coordinates and scores returned per sampled frame.
- Bbox-normalized mean landmark trajectory span: 0.306; median 0.255.
- Head/eye/nose and limb coordinates visibly followed the cat's head and forelimb motion.
- This clip does not contain a stand-to-walk sequence, so it is not a complete cat three-pose gate.

## 10. Keypoint count

AP-10K outputs 17 points: left/right eye, nose, neck, root of tail, left/right shoulder, elbow, front paw, hip, knee, and rear paw.

## 11. Per-keypoint confidence

- Confirmed: every AP-10K landmark has an independent SimCC score.
- The raw score is not a calibrated probability and may exceed 1.0.
- The adapter retains the raw score and applies a PoC usability threshold separately.
- Low confidence becomes UNKNOWN with reason `low_model_confidence_not_occlusion`; it never becomes OCCLUDED.

## 12. Guardian 26 mapping table

| Guardian key | AP-10K source / derivation | Candidate state |
|---|---|---|
| HEAD | midpoint of L_EYE + R_EYE | ESTIMATED |
| NOSE | Nose | OBSERVED |
| NECK | Neck | OBSERVED |
| LEFT_SHOULDER | L_Shoulder | OBSERVED |
| RIGHT_SHOULDER | R_Shoulder | OBSERVED |
| SPINE_FRONT | shoulder midpoint | ESTIMATED |
| SPINE_MID | unsupported | UNKNOWN |
| SPINE_REAR | hip midpoint | ESTIMATED |
| LEFT_HIP | L_Hip | OBSERVED |
| RIGHT_HIP | R_Hip | OBSERVED |
| BODY_CENTER | four-point shoulder/hip midpoint | ESTIMATED |
| LEFT_FRONT_ELBOW | L_Elbow | OBSERVED |
| RIGHT_FRONT_ELBOW | R_Elbow | OBSERVED |
| LEFT_FRONT_WRIST | unsupported | UNKNOWN |
| RIGHT_FRONT_WRIST | unsupported | UNKNOWN |
| LEFT_FRONT_PAW | L_F_Paw | OBSERVED |
| RIGHT_FRONT_PAW | R_F_Paw | OBSERVED |
| LEFT_REAR_KNEE | L_Knee | OBSERVED |
| RIGHT_REAR_KNEE | R_Knee | OBSERVED |
| LEFT_REAR_ANKLE | unsupported | UNKNOWN |
| RIGHT_REAR_ANKLE | unsupported | UNKNOWN |
| LEFT_REAR_PAW | L_B_Paw | OBSERVED |
| RIGHT_REAR_PAW | R_B_Paw | OBSERVED |
| TAIL_BASE | Root of tail | OBSERVED |
| TAIL_MID | unsupported | UNKNOWN |
| TAIL_TIP | unsupported | UNKNOWN |

## 13. OBSERVED candidates

15: NOSE, NECK, LEFT/RIGHT_SHOULDER, LEFT/RIGHT_HIP, LEFT/RIGHT_FRONT_ELBOW, LEFT/RIGHT_FRONT_PAW, LEFT/RIGHT_REAR_KNEE, LEFT/RIGHT_REAR_PAW, TAIL_BASE.

## 14. ESTIMATED candidates

4: HEAD, SPINE_FRONT, SPINE_REAR, BODY_CENTER. Each is emitted only when all source landmarks meet the direct confidence threshold.

## 15. UNKNOWN keys

7: SPINE_MID, LEFT/RIGHT_FRONT_WRIST, LEFT/RIGHT_REAR_ANKLE, TAIL_MID, TAIL_TIP.

## 16. Different-pose responsiveness

Result: **PARTIAL PASS**.

- Passed: learned landmarks clearly respond to actual canine gait phases and feline head/limb motion; output is not a fixed geometric template.
- Passed: a dog sitting image produces a substantially different anatomical layout from walking frames.
- Not fully passed: the approved evidence set does not prove the same individual animal in all three required states (standing, sitting, walking). The long dog trial is a three-camera mosaic and cannot provide a clean identity-preserving three-pose comparison.
- No 80% or accuracy claim is made.

## 17. Multi-animal result

- Real image contained four cats and one dog.
- Detector returned four separable instances: three cats and one dog. Each received an independent bbox, instance ID, 17 keypoints, and scores.
- One visible cat was missed at detector threshold 0.30.
- No temporal tracking/identity association was implemented, by design.

## 18. Performance

| Run | Mean detector ms/frame | Mean pose ms/frame | Mean total ms/frame | Approx. FPS |
|---|---:|---:|---:|---:|
| Dog gait, one detection | 9,955.0 | 1,276.9 | 11,231.9 | 0.089 |
| Cat playing, one detection | 9,959.2 | 1,314.0 | 11,273.2 | 0.089 |
| Multi-animal, four detections | 9,831.7 | 4,972.4 | 14,804.1 | 0.068 |

Model initialization time is not included in frame latency. The detector dominates CPU cost.

## 19. Failures and limitations

- First Success Gate is incomplete for a same-subject stand/sit/walk sequence.
- Deployment detector differs from the documented MMPose alias detector; detector parity with RTMDet-m is unverified.
- One of four cats was missed in the multi-animal image.
- CPU latency is far below real-time.
- AP-10K has no wrist, ankle, tail-mid, tail-tip, or exact Guardian spine-mid landmark.
- Scores are uncalibrated; a threshold is a PoC policy, not a probability guarantee.
- No occlusion state can be inferred from score alone.
- No temporal identity tracking, pose smoothing, video batching, or Guardian Motion integration was built.
- Difficult viewpoints, severe self-occlusion, small animals, blur, and out-of-distribution breeds remain uncharacterized.
- Test media are public research/Commons samples, not Guardian production or user data.

## 20. PoC-2 recommendation

**CONDITIONAL YES — technically worth continuing, but do not start full PoC-2 integration yet.**

RTMPose-m AP-10K demonstrably breaks the G3-C fixed-template ceiling by producing real, pose-responsive anatomical landmarks with per-point scores. Before connecting to Skeleton V2 -> G3-B -> Motion Envelope, complete a short PoC-1.1 gate with controlled same-dog and same-cat stand/sit/walk clips, compare RTMDet-m versus YOLOX deployment behavior, and benchmark an accelerator-capable runtime. After that gate, the provider-neutral adapter is suitable as the experimental learned-vision input boundary.

STOP — awaiting Guardian HQ / Chief Architect review.
