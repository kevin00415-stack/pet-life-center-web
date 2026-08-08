# Guardian Motion Comparison Core v0

Status: isolated experimental fail-closed implementation.

Contract: `guardian-motion-comparison-v1`.

This core validates schema, identity, provider/policy parity, capture taxonomy, evidence coverage, observed intersections, `UNKNOWN` propagation, product/medical context isolation, canonicalization, and deterministic technical output.

The preservation configuration is recorded in `research-config.json`. It contains status flags only and defines no calibration value.

It deliberately does not emit `INCREASED`, `DECREASED`, or `STABLE`. Neutral tolerances, minimum evidence thresholds, safe relative-denominator threshold, numeric speed bands, and cryptographic digest selection remain unapproved. Dependent results return `POLICY_VALUE_REQUIRED`, `INDETERMINATE`, or `NOT_COMPARABLE`.

Run locally:

```powershell
node --test research\guardian-motion-comparison-v1\tests\comparison-engine.test.mjs
```

No production source, UI, model, calibration, treatment/product logic, medical interpretation, dependency, cloud service, or persistence integration is included.
