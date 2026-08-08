import { createDeterministicFeatureExtractor, G2A_FEATURE_KEYS } from "./feature-extractor.js";

export const G2B_MANIFEST_VERSION = "gbe-g2b-fixture-manifest-v1";
export const G2B_PIPELINE_VERSION = "gbe-g2b-validation-v1";
export const EVIDENCE_CLASSES = Object.freeze(["SYNTHETIC_RESULT", "REAL_DEVICE_RESULT"]);

const ENUMS = Object.freeze({
  species: ["DOG", "CAT"], deviceType: ["IPHONE", "ANDROID", "UNKNOWN_FUTURE"],
  lighting: ["BRIGHT_INDOOR", "NORMAL_INDOOR", "DIM_INDOOR", "OUTDOOR_DAYLIGHT"],
  camera: ["STATIC", "HANDHELD", "MINOR_SHAKE", "HEAVY_SHAKE"], distance: ["NEAR", "MEDIUM", "FAR"],
  view: ["FRONT", "SIDE", "REAR_OBLIQUE"], visibility: ["FULL_BODY", "PARTIAL_BODY", "TEMPORARY_OCCLUSION", "SEVERE_OCCLUSION"],
  activity: ["REST", "WALKING_MOVING", "TURNING", "TRANSITION", "MIXED_ACTIVITY"], length: ["SHORT", "NORMAL", "LONG"]
});

export function validateFixtureManifest(manifest) {
  if (manifest?.manifestVersion !== G2B_MANIFEST_VERSION) throw new Error("MANIFEST_VERSION_UNSUPPORTED");
  if (!safeId(manifest.manifestId)) throw new Error("MANIFEST_ID_INVALID");
  if (!EVIDENCE_CLASSES.includes(manifest.evidenceClass)) throw new Error("EVIDENCE_CLASS_INVALID");
  if (!Array.isArray(manifest.fixtures) || !manifest.fixtures.length) throw new Error("MANIFEST_FIXTURES_REQUIRED");
  if (manifest.evidenceClass === "REAL_DEVICE_RESULT" && !safeId(manifest.authorizationRef)) throw new Error("REAL_MEDIA_AUTHORIZATION_REQUIRED");
  const seen = new Set();
  for (const fixture of manifest.fixtures) {
    if (!safeId(fixture.fixtureId) || seen.has(fixture.fixtureId)) throw new Error("FIXTURE_ID_INVALID");
    seen.add(fixture.fixtureId);
    if (!safeId(fixture.petId)) throw new Error("FIXTURE_PET_ID_INVALID");
    for (const [key, allowed] of Object.entries(ENUMS)) if (!allowed.includes(fixture[key])) throw new Error(`FIXTURE_${key.toUpperCase()}_INVALID`);
    if (fixture.source?.kind !== "TECHNICAL_FRAME_JSON" || !fixture.source.localPath?.toLowerCase().endsWith(".json")) throw new Error("FIXTURE_SOURCE_INVALID");
    if (fixture.expectedQuality && !["USABLE", "PARTIALLY_USABLE", "INSUFFICIENT_CAPTURE"].includes(fixture.expectedQuality)) throw new Error("EXPECTED_QUALITY_INVALID");
    if (containsPrivateMetadata(fixture)) throw new Error("PRIVATE_METADATA_FORBIDDEN");
  }
  return structuredClone(manifest);
}

export async function runValidationSuite({ manifest, loadFixture, extractor = createDeterministicFeatureExtractor(), repeats = 5, timer = () => performance.now() }) {
  const validated = validateFixtureManifest(manifest);
  if (!Number.isInteger(repeats) || repeats < 5) throw new Error("REPEAT_COUNT_MINIMUM_FIVE");
  if (typeof loadFixture !== "function") throw new Error("FIXTURE_LOADER_REQUIRED");
  const recordings = [];
  for (const entry of validated.fixtures) {
    const video = await loadFixture(entry);
    assertLoadedFixture(entry, video);
    const runs = [];
    for (let runIndex = 0; runIndex < repeats; runIndex += 1) {
      const started = timer();
      const extraction = await extractor.extract({ analysisRunId: `${entry.fixtureId}-run-${runIndex + 1}`, petId: entry.petId, video, purpose: "VALIDATION" });
      const finished = timer();
      runs.push(toRunRecord(entry, extraction, runIndex + 1, Math.max(0, finished - started)));
    }
    recordings.push(Object.freeze({ fixtureId: entry.fixtureId, runs: Object.freeze(runs), repeatability: summarizeRepeatability(runs) }));
  }
  return Object.freeze({
    reportVersion: "gbe-g2b-report-v1", evidenceClass: validated.evidenceClass,
    manifestId: validated.manifestId, pipelineVersion: G2B_PIPELINE_VERSION,
    recordingCount: recordings.length, recordings: Object.freeze(recordings),
    featureStability: classifyFeatureStability(recordings, validated.evidenceClass),
    qualityFindings: evaluateExpectedQuality(validated.fixtures, recordings),
    performance: summarizePerformance(recordings)
  });
}

export function summarizeRepeatability(runs) {
  const features = {};
  for (const key of G2A_FEATURE_KEYS) {
    const observed = runs.map((run) => run.features[key]).filter((datum) => datum.availability === "OBSERVED");
    const values = observed.map((datum) => datum.value);
    const confidences = runs.map((run) => run.features[key].confidence);
    features[key] = Object.freeze({
      observedRuns: observed.length,
      mean: values.length ? mean(values) : null, median: values.length ? median(values) : null,
      min: values.length ? Math.min(...values) : null, max: values.length ? Math.max(...values) : null,
      absoluteDeviation: values.length ? mean(values.map((value) => Math.abs(value - mean(values)))) : null,
      relativeDeviation: values.length && mean(values) !== 0 ? mean(values.map((value) => Math.abs(value - mean(values)))) / Math.abs(mean(values)) : null,
      confidenceStability: range(confidences),
      availabilityStable: new Set(runs.map((run) => run.features[key].availability)).size === 1
    });
  }
  return Object.freeze({
    features: Object.freeze(features),
    qualityGateStable: new Set(runs.map((run) => run.qualityResult)).size === 1
  });
}

function toRunRecord(entry, extraction, repeat, runtimeMs) {
  return Object.freeze({
    analysisId: `${entry.fixtureId}-analysis-${repeat}`, fixtureId: entry.fixtureId, petId: entry.petId,
    species: entry.species, deviceProfile: Object.freeze({ type: entry.deviceType, alias: entry.deviceAlias ?? null }),
    captureConditions: Object.freeze(Object.fromEntries(Object.keys(ENUMS).filter((key) => key !== "species" && key !== "deviceType").map((key) => [key, entry[key]]))),
    qualityResult: extraction.qualityGate.result, features: extraction.vector.features,
    featureConfidence: Object.freeze(Object.fromEntries(G2A_FEATURE_KEYS.map((key) => [key, extraction.vector.features[key].confidence]))),
    evidenceCoverage: Object.freeze(Object.fromEntries(G2A_FEATURE_KEYS.map((key) => [key, extraction.vector.features[key].evidenceCoverage]))),
    reasonCodes: Object.freeze(Object.fromEntries(G2A_FEATURE_KEYS.map((key) => [key, extraction.vector.features[key].reasonCode]))),
    runtime: Object.freeze({ videoDecodingMs: null, trackingDetectorMs: null, featureExtractionMs: runtimeMs, qualityGateMs: null, comparisonMs: null, totalRuntimeMs: runtimeMs }),
    pipelineVersion: G2B_PIPELINE_VERSION, extractorVersion: extraction.vector.extractorVersion,
    featureSchemaVersion: extraction.vector.schemaVersion,
    qualityPolicyVersion: extraction.qualityGate.policyVersion
  });
}

function classifyFeatureStability(recordings, evidenceClass) {
  return Object.freeze(Object.fromEntries(G2A_FEATURE_KEYS.map((feature) => [feature, Object.freeze({
    status: evidenceClass === "REAL_DEVICE_RESULT" ? "CALIBRATION_REQUIRED" : "EXPERIMENTAL",
    realWorldStability: evidenceClass === "REAL_DEVICE_RESULT" ? "INSUFFICIENT_BREADTH_FOR_AUTOMATIC_PROMOTION" : "NOT_VALIDATED",
    environmentalSensitivity: "NOT_DETERMINED",
    requiredCaptureCondition: "PENDING_REAL_DEVICE_EVIDENCE",
    confidencePolicy: "G2A_EXISTING_POLICY",
    knownLimitations: "No automatic V1 promotion; Guardian HQ review required."
  })])));
}

function evaluateExpectedQuality(fixtures, recordings) {
  let falseAcceptance = 0;
  let falseRejection = 0;
  fixtures.forEach((fixture, index) => {
    if (!fixture.expectedQuality) return;
    const actual = recordings[index].runs[0].qualityResult;
    if (fixture.expectedQuality === "INSUFFICIENT_CAPTURE" && actual === "USABLE") falseAcceptance += 1;
    if (fixture.expectedQuality === "USABLE" && actual !== "USABLE") falseRejection += 1;
  });
  return Object.freeze({ falseAcceptance, falseRejection, assessedFixtures: fixtures.filter((item) => item.expectedQuality).length });
}

function summarizePerformance(recordings) {
  const values = recordings.flatMap((recording) => recording.runs.map((run) => run.runtime.totalRuntimeMs));
  return Object.freeze({
    videoDecodingMs: null, trackingDetectorMs: null, featureExtractionMs: stats(values), qualityGateMs: null,
    comparisonMs: null, totalRuntimeMs: stats(values),
    note: "Decoding and detector/pose inference are not implemented; quality-gate timing is integrated with extraction."
  });
}

function assertLoadedFixture(entry, video) {
  if (!video?.id || video.petId !== entry.petId || !Array.isArray(video.technicalFrames)) throw new Error("LOADED_FIXTURE_INVALID");
}
function containsPrivateMetadata(value) { const serialized = JSON.stringify(value).toLowerCase(); return ["ownername", "owneremail", "location", "latitude", "longitude", "rawmediadata"].some((key) => serialized.includes(key)); }
function safeId(value) { return typeof value === "string" && /^[a-z0-9][a-z0-9_-]{2,63}$/i.test(value); }
function stats(values) { return Object.freeze({ mean: mean(values), median: median(values), min: Math.min(...values), max: Math.max(...values) }); }
function mean(values) { return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0; }
function median(values) { const sorted = [...values].sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2; }
function range(values) { return values.length ? Math.max(...values) - Math.min(...values) : null; }
