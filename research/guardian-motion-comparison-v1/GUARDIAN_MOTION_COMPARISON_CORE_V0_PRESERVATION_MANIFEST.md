# Guardian Motion Comparison Core v0 Preservation Manifest

Status: PRESERVATION CANDIDATE

- Branch: `codex/guardian-motion-comparison-core-v0`
- Base SHA: `7a01d9d54c865522b80980a46f5c2acba755bcef`
- Contract: `guardian-motion-comparison-v1`, accepted V1.2
- Core: `guardian-motion-comparison-fail-closed-core-v0`
- Canonical artifact count: 6
- Hash algorithm: SHA-256

## Canonical artifacts

| Relative path | SHA-256 | Bytes | Role | Classification | Git inclusion |
|---|---|---:|---|---|---|
| `docs/GUARDIAN_MOTION_COMPARISON_CONTRACT_V1.md` | `23e8da275f437af9b2c006b43956ef6dda4fcacedcc81bad34081b7a0c90a518` | 32664 | Accepted Motion Comparison Contract V1.2 | Source / specification | Include |
| `docs/RED_TEAM_QUESTIONS.md` | `c61a977d5131c2433044213272afca10d86608bff6f31f64225effd8088bef7a` | 8580 | Preserved adversarial review questions and regression targets | Source / review record | Include |
| `research/guardian-motion-comparison-v1/README.md` | `81e90d36c44d43102820914b370c4bdb5297a98cc22a4dd33dc4f46c1a828783` | 1110 | Technical scope and local validation instructions | Source / technical report | Include |
| `research/guardian-motion-comparison-v1/research-config.json` | `6c44171f109371e917980a0cedfa37af559ab9c0e0189f89f87288df220ec3dc` | 789 | Fail-closed research configuration; status flags only | Source / configuration | Include |
| `research/guardian-motion-comparison-v1/src/comparison-engine.mjs` | `fdba578f6f49aa7007e6e1afcb481f66628402b4a8c3553429b258fcd01d9604` | 31079 | Provider-neutral comparison core | Source / implementation | Include |
| `research/guardian-motion-comparison-v1/tests/comparison-engine.test.mjs` | `4a62dd85dcb41673243d7bcd371579995ff383cb66f180a60213ae5ca6f8e673` | 16897 | Mandatory fail-closed and regression tests | Source / validation | Include |

This manifest is a Git-included index and is intentionally excluded from its own canonical artifact count and SHA table to avoid a recursive self-hash.

## Required exclusions

The preservation commit must not include:

- `node_modules`, virtual environments, caches, coverage, or generated test output;
- raw video, raw pixels, test media, screenshots, or user data;
- model weights, `*.pth`, `*.onnx`, model archives, or inference artifacts;
- secrets, tokens, credentials, environment files, or private configuration;
- calibration thresholds or invented policy values;
- production integration, Guardian A, Guardian E, main, or PoC-2 canonical modifications.

## Verification procedure

From the repository root, calculate SHA-256 for each listed relative path and require an exact lowercase hexadecimal match. Any missing file, extra canonical file, size mismatch, or digest mismatch blocks preservation.

Required validation before commit:

- Core v0: 30/30 PASS;
- frozen G2-C/G3-B/G3-C: 38/38 PASS;
- PoC-2: 10/10 PASS;
- JSON and JavaScript syntax validation;
- secret scan;
- exclusion scan;
- `git diff --check`;
- staged-file audit.

No merge, calibration, production integration, efficacy claim, medical interpretation, or policy-value invention is authorized by this manifest.
