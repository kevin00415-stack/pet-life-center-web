# Guardian Vision RTMPose PoC-1

Status: isolated research PoC. This directory does not integrate with Guardian production code or the preserved G3-C runtime.

Pipeline:

`image/video frame -> YOLOX-m COCO cat/dog detector -> RTMPose-m AP-10K -> 17 keypoints + per-keypoint confidence -> experimental Guardian 26 adapter`

The detector is a deployment substitution for the official MMPose `animal` alias's RTMDet-m. The learned pose checkpoint remains the approved RTMPose-m AP-10K model. The substitution is explicit because OpenMMLab does not publish a directly consumable multiclass RTMDet-m ONNX SDK archive alongside this checkpoint.

Safety boundaries:

- No medical, diagnostic, pain, or disease interpretation.
- Low confidence is not treated as occlusion.
- Direct model landmarks may be `OBSERVED`; geometric derivatives are `ESTIMATED`; unsupported or low-confidence points remain `UNKNOWN`.
- No fixed silhouette template fills missing landmarks.
- Model weights and test media stay under the ignored `artifacts/` directory.

Local run:

```powershell
.\.venv\Scripts\python.exe -m guardian_vision_poc.cli <image-or-video> --output artifacts\runs\sample
```

Set `PYTHONPATH=research/guardian-vision-rtmpose-poc1/src` or invoke through the provided `run-poc.ps1` helper.

## PoC-1.1 validation

The isolated validation adds:

- same-subject pose comparison with raw and bbox-normalized AP-10K coordinates;
- detector confidence and adjacent-frame bbox stability capture;
- separate detector and pose latency measurements;
- ONNX Runtime CPU, OpenVINO CPU, and OpenVINO GPU execution paths;
- explicit RTMDet deployment-artifact provenance review.

The frozen Guardian 26 mapping remains capped at 15 `OBSERVED` candidates, 4
`ESTIMATED` points, and 7 `UNKNOWN` points. A model score below the experimental
threshold becomes `UNKNOWN`, never `OCCLUDED`.

See `POC11_FINAL_REPORT.md` for the decision evidence. Generated media, model
weights, overlays, and benchmark JSON remain in the ignored `artifacts/` tree.
