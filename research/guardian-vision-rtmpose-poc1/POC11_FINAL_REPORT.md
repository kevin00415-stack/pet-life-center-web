# Guardian Vision PoC-1.1 Final Report

Status: isolated validation only

Branch: `codex/guardian-vision-rtmpose-poc1`

Worktree: `C:\Users\user\OneDrive\文件\毛孩生活專案\work\guardian-vision-rtmpose-poc1`

No production integration, merge, push, or modification of Guardian A or the E / G3-C preservation baseline was performed.

## Executive decision

**READY FOR PoC-2**

This means ready only for an isolated experimental chain from RTMPose through the frozen Guardian mapping and existing downstream contracts. It does not mean production-ready, real-time, medically capable, or quantitatively accurate.

## 1. Same-dog gate — PASS

The same named dog, Nora, was evaluated in sitting, standing, and walking states. Identity is supported by the Wikimedia Commons subject category and the individual source records. Each representative frame retained the detector bbox, all 17 AP-10K raw coordinates and SimCC scores, bbox-normalized coordinates, and the Guardian mapping result.

| Pose | Detector class | Detector score | Total OpenVINO-CPU latency | Mapping |
|---|---:|---:|---:|---:|
| Sitting | dog | 0.9450 | 9,916.8 ms | 15 / 4 / 7 |
| Standing | dog | 0.9664 | 9,284.7 ms | 15 / 4 / 7 |
| Walking | dog | 0.9060 | 10,587.8 ms | 15 / 4 / 7 |

For the requested shoulder, elbow, front paw, hip, knee, rear paw, neck, and tail-base comparisons, mean bbox-normalized displacement across the selected focus points was:

- sitting vs standing: 0.375;
- sitting vs walking: 0.518;
- standing vs walking: 0.356.

The learned landmarks changed with the visible anatomy. This is pose responsiveness evidence, not ground-truth accuracy measurement.

## 2. Same-cat gate — INCOMPLETE, no contradiction

Standing and walking frames came from one continuous black-cat video, so identity continuity is strong. Mean bbox-normalized displacement across the focus points was 0.103. The landmark configuration followed the visible posture change.

The video contains no defensible sitting segment. A sitting example was not substituted from another animal. Therefore the cat gate is `INCOMPLETE`, with no observed contradiction to the learned-landmark result.

## 3. YOLOX-m detector result

- Official YOLOX-m COCO ONNX artifact is reproducible by URL, byte size, and SHA-256.
- Dog and cat detection both succeeded.
- In the multi-animal image, the detector returned three cats and one dog from four visible cats and one dog: one cat miss and no visually evident false positive.
- Dog adjacent-frame sample: 5/5 detections, mean detector score 0.8992, minimum 0.8278, mean consecutive bbox IoU 0.6358.
- Cat adjacent-frame sample: 5/5 detections, mean detector score 0.9371, minimum 0.9293, mean consecutive bbox IoU 0.8150.
- The IoU values include real subject and camera motion and are not pure jitter measurements.

Detector misses are recorded as detector failures, not attributed to RTMPose.

## 4. RTMDet-m detector result

**RTMDET DEPLOYMENT ARTIFACT BLOCKED**

MMPose's official animal alias identifies RTMDet-m. MMDetection publishes the official COCO training checkpoint and metadata, but this validation did not identify an official, directly consumable multiclass RTMDet-m ONNX artifact for the current minimal Windows runtime. The 224,299,609-byte PTH was not downloaded, and no untrusted or third-party converted weights were substituted.

A real RTMDet-vs-YOLOX runtime A/B therefore remains blocked pending a separately approved, reproducible MMDeploy/MMDetection conversion and artifact-hash procedure.

## 5. Recommended detector

Use **YOLOX-m for the isolated PoC-2 baseline**. It has a reproducible official ONNX artifact, working dog/cat and multi-detection behavior, retained post-NMS scores, and executes through both ONNX Runtime and OpenVINO. Keep RTMDet-m as the preferred future A/B candidate after an official-source conversion path is established.

## 6–8. CPU and accelerator benchmarks

Host: Intel Celeron N4120, 4 logical processors, Intel UHD Graphics 600.

Method: one warm-up excluded, then three measured repetitions; detector and pose times measured separately. Multi-animal pose time is the sum across four detected animals.

| Runtime / case | Detector | Pose | Total | FPS | Speedup vs ORT CPU |
|---|---:|---:|---:|---:|---:|
| ONNX Runtime CPU, single | 9,920.4 ms | 1,332.5 ms | 11,252.9 ms | 0.0889 | 1.000x |
| OpenVINO CPU, single | 8,205.4 ms | 879.1 ms | 9,084.5 ms | 0.1101 | 1.239x |
| OpenVINO GPU, single | 3,776.2 ms | 1,035.3 ms | 4,811.5 ms | 0.2078 | 2.339x |
| ONNX Runtime CPU, multi | 10,770.6 ms | 5,945.2 ms | 16,715.8 ms | 0.0598 | 1.000x |
| OpenVINO CPU, multi | 8,690.9 ms | 4,059.7 ms | 12,750.7 ms | 0.0784 | 1.311x |
| OpenVINO GPU, multi | 3,707.2 ms | 3,642.5 ms | 7,349.7 ms | 0.1361 | 2.274x |

The host exposes only CPU and Azure providers through ONNX Runtime; DirectML was not installed or benchmarked. OpenVINO 2026.3.0 exposed both CPU and GPU and produced a completed local GPU benchmark. Despite the speedup, this hardware remains far below real-time/product performance.

Cold GPU setup is a deployment risk: the complete two-model GPU suite took approximately 355 seconds wall time including compilation and measured runs. Intel GPU compilation emitted CISA validation errors into `kernel.errors.txt`, although inference subsequently completed.

## 9. Keypoint stability

Five adjacent frames per species were sampled at 0.2-second intervals.

| Subject | Mean normalized trajectory span | Median span | Largest mean step | Minimum raw SimCC score |
|---|---:|---:|---:|---:|
| Dog | 0.6187 | 0.5832 | 0.4952 | 0.2792 |
| Cat | 0.2101 | 0.1767 | 0.1540 | 0.3987 |

The dog sequence includes substantial rotation and bending, so the larger motion is not interpreted as pure jitter. The most volatile dog points were the nose, eyes, and tail root. The cat sequence was visually steadier; head rotation still moved nose and neck as expected.

## 10. Major failure examples

- One of four visible cats was missed in the multi-animal image.
- An earlier cat walking frame also produced a detector miss while a later clear frame detected correctly.
- Rear/turning dog frames showed head and tail-base drift and possible left/right limb ambiguity.
- Limbs crossing or partial self-occlusion can destabilize paw and joint placement.
- OpenVINO GPU had high cold-compilation cost and emitted compiler validation errors on this low-end iGPU.
- SimCC scores are not calibrated probabilities and can exceed 1; they cannot support an accuracy percentage.

## 11. Guardian mapping integrity

The mapping definition remains frozen at a maximum of:

- 15 `OBSERVED` candidates;
- 4 `ESTIMATED` points;
- 7 `UNKNOWN` points.

Across the ten adjacent stability frames, nine retained 15 / 4 / 7. One dog frame had 14 / 4 / 8 because the nose score was 0.2792, below the experimental 0.30 threshold. It stayed `UNKNOWN` with reason `low_model_confidence_not_occlusion`. No fixed silhouette template filled the missing point and no `UNKNOWN` key was promoted to `OBSERVED`.

## 12. License and provenance status

- RTMPose-m AP-10K ONNX and training checkpoint: official OpenMMLab download URLs with recorded byte sizes and SHA-256; MMPose is Apache-2.0 and AP-10K data is CC BY 4.0.
- YOLOX-m ONNX: official YOLOX GitHub release, Apache-2.0, hash recorded.
- RTMDet-m: official MMDetection metadata/checkpoint URL, Apache-2.0; deployment conversion remains blocked as described above.
- Same-dog evidence: Wikimedia Commons records, CC BY-SA 3.0.
- Same-cat evidence: Wikimedia Commons, CC0.

These licenses are generally compatible with commercial research use when their conditions are followed, but this report is not legal advice. A product release still requires attribution inventory, redistribution review, notice files, and counsel/HQ approval.

## PoC-2 rationale and boundaries

The PoC-1.1 success conditions are satisfied because one species has a complete same-subject PASS, the other has no contradiction, learned landmarks visibly respond to pose, the YOLOX path is reproducible, a real local GPU path was benchmarked, and the evidence-state boundary stayed intact.

The next justified step is an **isolated experimental pipeline only**:

`RTMPose -> Guardian Mapping -> Skeleton V2 -> G3-B -> Motion Envelope -> G2-C`

PoC-2 must retain detector/pose failure separation, the frozen mapping semantics, raw score provenance, and frame-level traceability. It must not claim real-time readiness, medical capability, calibrated confidence, or production accuracy.

**READY FOR PoC-2**
