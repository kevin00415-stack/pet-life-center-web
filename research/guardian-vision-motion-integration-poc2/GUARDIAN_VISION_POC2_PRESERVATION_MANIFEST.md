# Guardian Vision PoC-2 Preservation Manifest

Preservation branch: `codex/guardian-vision-motion-integration-poc2`

Base commit: `07a94ba9d80d3d9a277b429ef145d126ad010d89`

Purpose: preserve the approved PoC-2 learned-motion integration without changing its canonical implementation or any frozen Guardian contract/runtime.

## Git-included canonical artifacts

| Relative path | SHA-256 | Artifact role | Classification | Git status |
|---|---|---|---|---|
| `.gitignore` | `21d48937eb702fbaa9715238783d7a2f2b4a9c7deb634887c9ca2522f9e1db77` | PoC artifact exclusion configuration | source/configuration | INCLUDE |
| `research/guardian-vision-motion-integration-poc2/FAILURE_MATRIX.md` | `aa80858425a3a6a550c6fc994199b1d82468f3b169658bd76dd953d51ea1ca18` | Failure propagation evidence | generated research report | INCLUDE |
| `research/guardian-vision-motion-integration-poc2/FINAL_REPORT.md` | `2efecadc24cf862db7b468c53497de8804ee87aad84e0bb31913c414842d2da4` | PoC-2 decision report | generated research report | INCLUDE |
| `research/guardian-vision-motion-integration-poc2/README.md` | `5621efca90d107fc47d19d9b353f5503bfc8ec257fd7d876be72053c2ac319e0` | Reproduction and safety instructions | generated documentation | INCLUDE |
| `research/guardian-vision-motion-integration-poc2/evidence-manifest.json` | `b76faeec83e02aba0730e49fb6e0d475c645c931de7200c15043aec6f81b6c57` | Hash-only identity for ignored local evidence | generated manifest | INCLUDE |
| `research/guardian-vision-motion-integration-poc2/runtime-provenance.json` | `288f751f96199cccfabf000f568ac843dfc28545d5f1df48b971e1c2cf4a1c6c` | Frozen runtime source closure and provider identity | generated manifest | INCLUDE |
| `research/guardian-vision-motion-integration-poc2/src/baseline-comparison.mjs` | `4a5f00e726a8e7eaa83b6ab7062842b28826d2560368abf6dd93cf3817d4c293` | G3-C vs learned comparison harness | canonical research source | INCLUDE |
| `research/guardian-vision-motion-integration-poc2/src/extract-rgba-frames.py` | `80c78dbd68553dc4ab5efaf75f288ca30231480f2459eb8942d3437bbf62dfda` | Local-only comparison-frame extractor | canonical research source | INCLUDE |
| `research/guardian-vision-motion-integration-poc2/src/integration-runner.mjs` | `32330927d560c167a88cb275b0106a6c2ab6aa5a1b8f18e351b778f4bdc8fb28` | Skeleton/Geometry/Temporal/Envelope/G2-C harness | canonical research source | INCLUDE |
| `research/guardian-vision-motion-integration-poc2/src/learned-pose-adapter.mjs` | `b9aa6491d1f1b8c9400b2382644de37fe9352b1290226f1d0e37a4e8520d2988` | Provider-neutral learned pose adapter | canonical research source | INCLUDE |
| `research/guardian-vision-motion-integration-poc2/tests/learned-integration.test.mjs` | `102a8128f3e0ca335ad7e87acc475813afb8c3e522d03125a039354bc11b40e7` | Ten-test PoC-2 validation suite | canonical test source | INCLUDE |

This manifest is itself included in Git. Its SHA-256 is recorded in the preservation report after creation because a file cannot contain its own stable cryptographic hash.

## Dependency closure

The Git-preserved PoC-2 closure contains:

- provider-neutral adapter and detector boundary;
- local prediction-to-Skeleton integration runner;
- exact frozen-runtime commit and file hashes;
- G3-C comparison harness;
- local RGBA extraction helper without embedded pixels;
- ten deterministic integration/failure tests;
- PoC-2 result, failure, provenance, and ignored-evidence manifests;
- exclusion rules preventing local runtime artifacts from entering Git.

The frozen G3-B, G2-C, and G3-C sources are not duplicated or modified. `runtime-provenance.json` binds the read-only dependency closure to commit `84d4bb834e40aa0650d77f373b289a82d6b7b159` and records SHA-256 for every imported runtime module.

## Explicitly excluded local artifacts

| Artifact class | Examples / location | Classification | Git status |
|---|---|---|---|
| Python environment | `.venv/` | generated dependency environment | EXCLUDE |
| Model weights | `*.pth`, `*.onnx` | downloaded model binary | EXCLUDE |
| Model archives | downloaded ZIP/archive artifacts | downloaded model binary | EXCLUDE |
| Test videos and images | PoC-1.1 `artifacts/media/`; PoC-2 frame overlays | licensed external media / generated visualization | EXCLUDE |
| Inference outputs | `research/guardian-vision-motion-integration-poc2/artifacts/local-video-inference/` | generated evidence | EXCLUDE |
| Motion/dataset results | `research/guardian-vision-motion-integration-poc2/artifacts/results/` | generated evidence | EXCLUDE |
| Raw comparison pixels | `research/guardian-vision-motion-integration-poc2/artifacts/baseline/` | generated local-only RGBA evidence | EXCLUDE |
| Python cache | `__pycache__/`, `*.pyc` | temporary generated output | EXCLUDE |
| Temporary benchmark output | ignored PoC artifact directories | temporary generated output | EXCLUDE |
| User/production data | none used | forbidden | EXCLUDE |
| Secrets and credentials | none detected | forbidden | EXCLUDE |

Hashes and byte sizes for the ignored canonical evidence outputs are preserved in `evidence-manifest.json`; this records identity without committing pixels, media, model binaries, or inference output.

## Safety boundary

- No Guardian A files are included.
- No Guardian E files are modified or included as copies.
- No `main` files or commits are modified.
- No Skeleton V2 contract, G3-B canonical logic, or G2-C canonical logic is modified.
- No PR or merge is part of this preservation operation.
