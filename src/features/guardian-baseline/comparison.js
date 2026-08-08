import { FEATURE_AVAILABILITY } from "./feature-extractor.js";

const MIN_CONFIDENCE = 0.6;
const MIN_EVIDENCE = 0.5;
const MAX_RELATIVE_DELTA = 5;

export function compareFeatureVectors(baselineVector, currentVector) {
  if (baselineVector.petId !== currentVector.petId) throw new Error("PET_SCOPE_MISMATCH");
  if (baselineVector.schemaVersion !== currentVector.schemaVersion) throw new Error("SCHEMA_INCOMPATIBLE");
  const comparisons = [];
  const exclusions = [];
  for (const [featureKey, current] of Object.entries(currentVector.features)) {
    const baseline = baselineVector.features[featureKey];
    const availabilityCode = exclusionCode(baseline, current);
    if (availabilityCode) { exclusions.push(Object.freeze({ featureKey, code: availabilityCode })); continue; }
    if (baseline.unit !== current.unit) { exclusions.push(Object.freeze({ featureKey, code: "UNIT_INCOMPATIBLE" })); continue; }
    if (Math.min(baseline.confidence, current.confidence) < MIN_CONFIDENCE) { exclusions.push(Object.freeze({ featureKey, code: "LOW_CONFIDENCE" })); continue; }
    if (Math.min(baseline.evidenceCoverage ?? 1, current.evidenceCoverage ?? 1) < MIN_EVIDENCE) { exclusions.push(Object.freeze({ featureKey, code: "LOW_EVIDENCE_COVERAGE" })); continue; }
    const absoluteDelta = current.value - baseline.value;
    const relativeDelta = baseline.value === 0 ? null : absoluteDelta / Math.abs(baseline.value);
    if (relativeDelta !== null && Math.abs(relativeDelta) > MAX_RELATIVE_DELTA) { exclusions.push(Object.freeze({ featureKey, code: "OUTLIER_SUPPRESSED" })); continue; }
    const tolerance = Math.max(1e-9, Math.abs(baseline.value) * 0.05);
    comparisons.push(Object.freeze({
      featureKey, baselineValue: baseline.value, currentValue: current.value, absoluteDelta,
      relativeDelta, direction: Math.abs(absoluteDelta) <= tolerance ? "SIMILAR" : absoluteDelta > 0 ? "HIGHER" : "LOWER",
      technicalConfidence: Math.min(baseline.confidence, current.confidence)
    }));
  }
  const total = Object.keys(currentVector.features).length;
  return Object.freeze({ comparisons: Object.freeze(comparisons), exclusions: Object.freeze(exclusions), comparableCoverage: total ? comparisons.length / total : 0 });
}

function exclusionCode(baseline, current) {
  if (!baseline) return "BASELINE_UNKNOWN";
  if (current.availability === FEATURE_AVAILABILITY.NOT_OBSERVED || baseline.availability === FEATURE_AVAILABILITY.NOT_OBSERVED) return "NOT_OBSERVED";
  if (current.availability === FEATURE_AVAILABILITY.UNKNOWN) return "CURRENT_UNKNOWN";
  if (baseline.availability === FEATURE_AVAILABILITY.UNKNOWN) return "BASELINE_UNKNOWN";
  return null;
}
