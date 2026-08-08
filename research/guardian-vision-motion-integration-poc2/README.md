# Guardian Vision Motion Integration PoC-2

Status: isolated experimental integration. No production source, Guardian A, or the E / G3-C preservation worktree is modified.

Pipeline:

`local video -> YOLOX-m -> RTMPose-m AP-10K -> provider-neutral learned adapter -> frozen Skeleton V2 -> frozen Geometry -> frozen Temporal -> Motion Envelope -> frozen G2-C dataset`

The learned adapter preserves raw SimCC values separately from the `[0,1]` technical confidence required by the existing contract. SimCC is not a calibrated probability. Low score is `UNKNOWN`, not `OCCLUDED`.

The frozen Guardian runtime is dynamically imported read-only from commit `84d4bb834e40aa0650d77f373b289a82d6b7b159`. Exact source hashes are in `runtime-provenance.json`.

## Validation commands

```powershell
$env:GUARDIAN_FROZEN_RUNTIME_ROOT='C:\Users\user\OneDrive\文件\毛孩生活專案\work\guardian-motion-g3c-preservation'
node --test research\guardian-vision-motion-integration-poc2\tests\learned-integration.test.mjs
```

Run the integration harness with preserved PoC-1.1 evidence and direct-video prediction output:

```powershell
node research\guardian-vision-motion-integration-poc2\src\integration-runner.mjs `
  --frozen-root 'C:\Users\user\OneDrive\文件\毛孩生活專案\work\guardian-motion-g3c-preservation' `
  --frozen-commit 84d4bb834e40aa0650d77f373b289a82d6b7b159 `
  --poc1-root 'C:\Users\user\OneDrive\文件\毛孩生活專案\work\guardian-vision-rtmpose-poc1\research\guardian-vision-rtmpose-poc1\artifacts' `
  --output research\guardian-vision-motion-integration-poc2\artifacts\results `
  --video-predictions research\guardian-vision-motion-integration-poc2\artifacts\local-video-inference\predictions.json `
  --video-fps 24
```

Generated predictions, RGBA comparison frames, overlays, envelopes, and datasets stay under the ignored `artifacts/` directory. G2-C records contain signatures only: no raw pixels, video frames, paths, or medical output.
