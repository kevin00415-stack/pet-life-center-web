# Guardian G3-C Preservation Manifest

Status: BYTE-FOR-BYTE VERIFIED

- Source root: `C:\Users\user\OneDrive\文件\毛孩生活專案`
- Target worktree: `C:\Users\user\OneDrive\文件\毛孩生活專案\work\guardian-motion-g3c-preservation`
- Base branch: `origin/codex/guardian-motion-g2c-g3b-preservation`
- Base commit: `331b7cf8553534731f684828192d14b5513eb2f5`
- Preservation branch: `codex/guardian-motion-g3c-preservation`
- Verification date: 2026-08-08

## Canonical G3-C artifacts

The eight canonical artifacts below were copied without renaming, formatting, conversion, or content modification. `PASS` means the source and target SHA-256 values are identical.

| Source path | Target path | Source SHA-256 | Target SHA-256 | Status |
| --- | --- | --- | --- | --- |
| `app/src/features/guardian-motion/local-video-pose-runtime.js` | `src/features/guardian-motion/local-video-pose-runtime.js` | `AB9EAC1DABD4F07AC770071A48DF52A5686B979B7520DA952221F245AEC69EB7` | `AB9EAC1DABD4F07AC770071A48DF52A5686B979B7520DA952221F245AEC69EB7` | PASS |
| `app/src/features/guardian-motion/video-decoder.js` | `src/features/guardian-motion/video-decoder.js` | `22F207B9AC9F5C194F523C25C281BB7F4D309C9A4E3E5F671F7F0213A8CB4607` | `22F207B9AC9F5C194F523C25C281BB7F4D309C9A4E3E5F671F7F0213A8CB4607` | PASS |
| `app/src/features/guardian-motion/pixel-pose-estimator.js` | `src/features/guardian-motion/pixel-pose-estimator.js` | `224A25D6BC0B6EA11276731E256387D8045F6965F7F7FD99F6D71D856C92E34F` | `224A25D6BC0B6EA11276731E256387D8045F6965F7F7FD99F6D71D856C92E34F` | PASS |
| `app/src/features/guardian-motion/manual-annotation.js` | `src/features/guardian-motion/manual-annotation.js` | `BBFDC80F6B3181E6CADEA8F4F978A4D7352A5B8AD3A9DAEBDB1F8478AE429805` | `BBFDC80F6B3181E6CADEA8F4F978A4D7352A5B8AD3A9DAEBDB1F8478AE429805` | PASS |
| `app/src/features/guardian-motion/pose-validation-harness.js` | `src/features/guardian-motion/pose-validation-harness.js` | `A2972104BCC2E379E530234CB1674DCCE7779C7A4FD1D7A6108DC3920AF06344` | `A2972104BCC2E379E530234CB1674DCCE7779C7A4FD1D7A6108DC3920AF06344` | PASS |
| `app/tests/guardian-local-pose.test.js` | `tests/guardian-local-pose.test.js` | `221466EAC4FB020F462456F6E1AEEEDB749F36A90B248BB7CC2A63EC6520E23B` | `221466EAC4FB020F462456F6E1AEEEDB749F36A90B248BB7CC2A63EC6520E23B` | PASS |
| `app/tests/fixtures/guardian-pixel-pose-fixtures.js` | `tests/fixtures/guardian-pixel-pose-fixtures.js` | `E3276C1478D82850CB88857D8EC47FEA8470068CA1B6E98E63279ED8518AA739` | `E3276C1478D82850CB88857D8EC47FEA8470068CA1B6E98E63279ED8518AA739` | PASS |
| `docs/GUARDIAN_G3C_LOCAL_POSE_RUNTIME.md` | `docs/GUARDIAN_G3C_LOCAL_POSE_RUNTIME.md` | `AEB142B8E5B925468461806D21F50F5450ED5789C6698E50DD8092B788C7C921` | `AEB142B8E5B925468461806D21F50F5450ED5789C6698E50DD8092B788C7C921` | PASS |

## Dependency closure pre-flight

The complete reviewed closure contains 23 files: eight new canonical G3-C artifacts and fifteen dependencies already protected by the base branch. Pre-flight classification was `NEW: 8`, `IDENTICAL: 15`, `DIFFERENT: 0`, `CONFLICT: 0`.

The following dependencies were byte-identical between source and base before import:

- `docs/GUARDIAN_G3B_SKELETON_RUNTIME.md`
- `docs/GUARDIAN_G2C_MOTION_DATASET.md`
- `src/features/guardian-motion/contracts.js`
- `src/features/guardian-motion/estimator-adapter.js`
- `src/features/guardian-motion/geometry-runtime.js`
- `src/features/guardian-motion/motion-runtime.js`
- `src/features/guardian-motion/skeleton-runtime.js`
- `src/features/guardian-motion/temporal-runtime.js`
- `src/features/guardian-baseline/motion-dataset.js`
- `src/features/guardian-baseline/comparison.js`
- `src/features/guardian-baseline/feature-extractor.js`
- `src/features/guardian-baseline/normalization.js`
- `src/features/guardian-baseline/segmentation.js`
- `src/features/guardian-baseline/quality-gate.js`
- `tests/fixtures/gbe-precision-fixtures.js`

No source file was missing and every SHA-256 calculation succeeded.

## Package policy

`app/package.json` was not modified by G3-C. Its SHA-256 remains `786B80D6E353803390BF5470A0B8D81103E24C6CDC30E2106ED6989E5764AB42`, matching the value recorded by the G2-C/G3-B preservation manifest.

The target Guardian App `package.json` remains byte-identical to the base commit with SHA-256 `674E972D030F1AFE6C7FC46AB6A98AA43119CF3F0A658980D0FFFC1D7EF661FC`. No package hunk, dependency, lockfile, script, metadata, or version was changed for G3-C preservation.

## Scope guarantees

- The source `app` and `docs` trees were not modified.
- No refactor, rename, format, TypeScript conversion, architecture change, learned-model integration, dependency upgrade, or merge was performed.
- No raw video, production media, generated output, or external telemetry was imported.
- Testing and final Git evidence are recorded in the preservation commit history and execution report.

## Preservation validation

| Check | Result |
| --- | --- |
| G2-C dedicated | PASS — 9/9 |
| G3-B dedicated | PASS — 13/13 |
| G3-C dedicated | PASS — 16/16 |
| Guardian Motion combined | PASS — 38/38 |
| SHA-256 source/target | PASS — 8/8 canonical artifacts |
| App lint | INFRASTRUCTURE FAILURE — existing `oxlint` executable unavailable |
| App build | INFRASTRUCTURE FAILURE — existing `tsc`/`vite` executables unavailable |
| Existing App unit tests | INFRASTRUCTURE FAILURE — existing `vitest` executable unavailable |
| Existing Playwright E2E | NOT RUN — existing Playwright executable unavailable |

No dependency installation or canonical-source workaround was attempted.
