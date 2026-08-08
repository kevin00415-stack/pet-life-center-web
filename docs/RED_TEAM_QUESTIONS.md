# Guardian Motion Comparison V1 — Red-Team Questions

Status: **CLAUDE ADVERSARIAL REVIEW COMPLETED — V1.2 ACCEPTED**

Review target: `GUARDIAN_MOTION_COMPARISON_CONTRACT_V1.md`

## Identity and isolation

1. Can two different pets ever share, inherit, or collide on `petRef` or identity receipts?
2. Can stale, replayed, partially bound, or identity-switched evidence pass the same-pet gate?
3. Does any rejection path accidentally emit partial directional results?
4. Can multi-animal detector output select different animals in baseline and follow-up while retaining one reference?

## False increase and false decrease

5. Which combinations of closer camera, changed bbox, oblique view, or different speed could create a false `INCREASED` result?
6. Which occlusion, detector miss, low light, or shorter clip patterns could create a false `DECREASED` result?
7. Can rejection of low-confidence landmarks change the landmark subset enough to reverse direction?
8. Can camera motion fall just below suppression in one capture and just above it in the other?
9. Can leash, owner cueing, surface, excitement, or activity transitions survive the context gate and masquerade as change?
10. Are detector errors incorrectly attributed to the pose or motion model?

## Normalization and thresholds

11. Which body-scale or time normalizations might remove a real technical difference or create one?
12. Can a changing denominator, especially bbox or body axis length, invert or magnify direction?
13. Does relative difference behave safely when baseline is zero, near zero, negative, or unavailable?
14. Are neutral tolerances symmetric at numeric rounding boundaries?
15. Could thresholds derived from only successful captures disadvantage certain species, body sizes, coats, viewpoints, devices, or activity states?
16. Can separate per-signal thresholds be tuned after seeing an expected outcome, creating hidden outcome bias?
17. What repeatability evidence is sufficient to approve a tolerance without calling it accuracy?

## Capture comparability

18. Are `COMPARABLE`, `PARTIALLY_COMPARABLE`, and `NOT_COMPARABLE` deterministically derivable from dimension assessments?
19. Can a globally serious mismatch be diluted by many harmless matched dimensions?
20. Does a side-view walk versus front-view sit always block gait-related signals?
21. Can unknown capture metadata be treated permissively rather than downgraded or blocked?
22. Are different frame rate, duration, dropped frames, timestamp jitter, and variable-rate video separated correctly?
23. Is bbox stability sufficient to proxy camera distance, or must the contract explicitly remain uncertain?

## Sparse evidence and UNKNOWN

24. Can one or two observed points produce high evidence coverage because rejected opportunities are omitted?
25. Are expected opportunities counted before filtering, so detector misses and rejected frames remain visible?
26. Can `UNKNOWN`, `OUT_OF_FRAME`, `ESTIMATED`, or low confidence become zero or `OBSERVED` through aggregation?
27. Can low model score be mislabeled as `OCCLUDED`?
28. Is the observed intersection identical under A/B swap?
29. Can missing wrists/ankles or other absent model landmarks be filled by a fixed template?
30. Does each dependent signal become unavailable when a required landmark or timestamp is unavailable?

## Symmetry and no positive bias

31. For every valid A/B pair, does B/A preserve eligibility, coverage, uncertainty, and magnitude while only reversing the signed direction?
32. Are any fields named baseline, follow-up, before, or after consulted by normalization or thresholds?
33. Can chronology validation cause the engine to accept one order and reject the reverse during symmetry testing?
34. Are `INCREASED` and `DECREASED` equally reachable around the same tolerance?
35. Could UI or localization map only `INCREASED` to favorable language?
36. Do property tests cover negative zero, rounding ties, near-threshold values, and unavailable denominators?

## Determinism and controls

37. Does A/A always yield `STABLE` and exact zero for every eligible signal across process restarts and supported hardware?
38. Can unordered maps, parallel reductions, floating-point execution profiles, wall-clock values, or random sampling alter results?
39. Does canonical duplication with different non-analytical metadata preserve the same technical result?
40. Will a failed A/A control stop comparison release rather than be absorbed into uncertainty?

## Product and supplement firewall

41. Can intervention meaning enter through free text, filenames, tags, reason codes, namespaces, feature flags, experiment IDs, or capture context?
42. Does the engine use an allowlist and reject unknown fields recursively?
43. Are forbidden values excluded from logs, exceptions, telemetry, provenance, and digest payloads?
44. Can an external study system choose thresholds, normalization, or signals based on product group before calling the engine?
45. Can product metadata be joined only after the immutable comparison output is complete?

## Language and downstream misuse

46. Can any output be interpreted as efficacy, recovery, pain, disease, health, or an improvement percentage?
47. Is `TECHNICAL_CHANGE_ONLY` inseparable from every relative value through serialization and UI handoff?
48. Can a downstream consumer hide `NOT_COMPARABLE`, uncertainty, or evidence coverage while showing direction?
49. Does a whole-pet score emerge indirectly from sorting, averaging, badges, colors, or summaries?
50. Are Traditional Chinese, English, Japanese, and Korean renderings independently checked for positive or medical implication?

## Provenance and tamper resistance

51. Are both Motion Evidence digests, schema/policy versions, model/provider identities, and comparison policies retained?
52. Can evidence be replaced after the comparison digest is generated?
53. Is the chosen digest accurately described, and is legacy FNV-1a prevented from being presented as cryptographic integrity?
54. Does canonicalization reject non-finite numbers and normalize `-0` consistently?

## V1.1 targeted regression questions

55. When coverage is below an approved minimum but the numeric delta is very large, is direction still forced to `INDETERMINATE` or `NOT_COMPARABLE`?
56. Is relative-denominator safety completely symmetric, including `availability(A,B) = availability(B,A)` and signed inversion under swap?
57. Can bbox width, bbox height, or bbox-derived body length/height re-enter stable body-scale normalization through any alias, adapter, or fallback?
58. Does every detector, pose provider, model, adapter, Skeleton, Geometry, or Temporal policy mismatch block comparison with `ESTIMATOR_POLICY_MISMATCH` unless an approved calibration policy exists?
59. Can any `UNKNOWN` capture-taxonomy state pass permissively instead of downgrade, signal block, or global block?
60. Can a rounding tie, negative zero, or threshold-boundary case break A/B symmetry because classification and canonicalization occur in different orders?
61. Can an external study workflow still cherry-pick recordings, outcomes, signals, policy versions, thresholds, or subgroups despite the engine firewall, and are those limitations stated without overclaiming bias prevention?

## V1.2 targeted regression questions

62. Can any `CUE_ONLY` evidence contribute to `INCREASED`, `DECREASED`, or `STABLE` directional output?
63. After cue, physical-contact, or obstruction intervals are removed, is the remaining clean uncued evidence re-evaluated through the full coverage gate?
64. Can different walking pace create `INCREASED` or `DECREASED` for any pace-sensitive signal?
65. Can `UNKNOWN` pace or `VARIABLE` pace without aligned comparable intervals permissively pass?
66. Is `SPEED_PACE` eligibility, blocking behavior, and reason-code output symmetric under A/B swap?
67. Can a downstream consumer interpret faster walking as better, improved, recovered, or healthier despite speed being capture/activity context only?

## Required adversarial verdict

Claude should return:

- blocking defects;
- ambiguous clauses;
- false-increase examples;
- false-decrease examples;
- symmetry counterexamples;
- sparse-evidence inflation paths;
- product-firewall bypasses;
- medical-language leakage;
- missing reason codes and validation properties;
- recommendation: `CONTRACT ACCEPTABLE FOR IMPLEMENTATION DESIGN` or `CONTRACT REVISION REQUIRED`.

No implementation, efficacy claim, medical claim, accuracy claim, merge, or production change is authorized by this review.
