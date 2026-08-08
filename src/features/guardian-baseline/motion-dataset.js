import { compareFeatureVectors } from "./comparison.js";
import { G2A_FEATURE_KEYS } from "./feature-extractor.js";
import { MOTION_CONTRACT_VERSION, deterministicChecksum } from "../guardian-motion/contracts.js";

export const MOTION_DATASET_VERSION = "guardian-motion-dataset-v1";
export const MOTION_DATASET_PURPOSE = "DETERMINISTIC_ENGINEERING_VALIDATION";
export const MOTION_SOURCE_CLASSES = Object.freeze(["SYNTHETIC", "GUARDIAN_HQ_AUTHORIZED_TEST"]);

const SPECIES = Object.freeze(["DOG", "CAT"]);
const BEHAVIORS = Object.freeze(["REST", "WALKING_MOVING", "TURNING", "TRANSITION", "MIXED_ACTIVITY", "UNKNOWN"]);
const QUALITY_RESULTS = Object.freeze(["USABLE", "PARTIALLY_USABLE", "INSUFFICIENT_CAPTURE"]);
const CAPTURE_KEYS = Object.freeze(["deviceType", "lighting", "camera", "distance", "view", "visibility", "length"]);
const FORBIDDEN_KEYS = Object.freeze([
  "ownerid", "ownername", "owneremail", "location", "latitude", "longitude", "rawmedia", "rawmediapath",
  "diagnosis", "disease", "healthscore", "fatiguescore", "treatment", "medicalinterpretation", "traininglabel"
]);

export function buildMotionDataset({ datasetId, purpose, authorizationRef = null, records }) {
  if (!safeId(datasetId)) throw new Error("DATASET_ID_INVALID");
  if (purpose !== MOTION_DATASET_PURPOSE) throw new Error("DATASET_PURPOSE_INVALID");
  if (!Array.isArray(records) || !records.length) throw new Error("DATASET_RECORDS_REQUIRED");
  const ids = new Set();
  const normalized = records.map((record) => validateRecord(record, ids)).sort((a, b) => a.recordingId.localeCompare(b.recordingId));
  if (normalized.some((record) => record.sourceClass === "GUARDIAN_HQ_AUTHORIZED_TEST") && !safeId(authorizationRef)) throw new Error("REAL_TEST_AUTHORIZATION_REQUIRED");
  const repeatKeys = normalized.map((record) => `${record.petId}|${record.repeatGroupId}|${record.repeatIndex}`);
  if (new Set(repeatKeys).size !== repeatKeys.length) throw new Error("REPEAT_SEQUENCE_DUPLICATE");
  const indexes = buildIndexes(normalized);
  const payload = { datasetVersion: MOTION_DATASET_VERSION, datasetId, purpose, authorizationRef, records: normalized, indexes };
  return deepFreeze({ ...payload, datasetChecksum: checksum(canonicalize(payload)) });
}

export function createDatasetRecordsFromValidation({ manifest, report }) {
  if (manifest.evidenceClass !== report.evidenceClass || manifest.manifestId !== report.manifestId) throw new Error("VALIDATION_REPORT_BINDING_INVALID");
  const entries = new Map(manifest.fixtures.map((entry) => [entry.fixtureId, entry]));
  return report.recordings.map((recording) => {
    const entry = entries.get(recording.fixtureId);
    const run = recording.runs[0];
    if (!entry || !run) throw new Error("VALIDATION_RECORDING_BINDING_INVALID");
    return {
      recordingId: entry.fixtureId,
      petId: entry.petId,
      repeatGroupId: entry.repeatGroupId ?? `${entry.petId}-${entry.activity.toLowerCase()}`,
      repeatIndex: entry.repeatIndex ?? 1,
      species: entry.species,
      behavior: entry.activity,
      sourceClass: manifest.evidenceClass === "REAL_DEVICE_RESULT" ? "GUARDIAN_HQ_AUTHORIZED_TEST" : "SYNTHETIC",
      captureCondition: Object.fromEntries(CAPTURE_KEYS.map((key) => [key, entry[key]])),
      skeleton: unknownEvidence("guardian-motion-skeleton-v1", "SKELETON_ENGINE_NOT_IMPLEMENTED"),
      motionGeometry: unknownEvidence("guardian-motion-geometry-v1", "MOTION_LAYER_NOT_IMPLEMENTED"),
      featureVector: {
        id: `dataset-vector-${entry.fixtureId}`,
        petId: entry.petId,
        schemaVersion: run.featureSchemaVersion,
        extractorVersion: run.extractorVersion,
        features: run.features
      },
      quality: { result: run.qualityResult, policyVersion: run.qualityPolicyVersion, reasonCodes: Object.values(run.reasonCodes).filter(Boolean) },
      confidence: {
        tracking: run.featureConfidence.trackedBodyCoverage,
        motion: meanObservedConfidence(run.features),
        overall: meanObservedConfidence(run.features)
      }
    };
  });
}

export function createDatasetRecordFromMotionEnvelope({
  envelope, recordingId, repeatGroupId, repeatIndex, behavior, sourceClass,
  captureCondition, featureVector, quality
}) {
  if (!envelope || envelope.contractVersion !== MOTION_CONTRACT_VERSION || !["COMPLETE_OR_PARTIAL"].includes(envelope.status)) throw new Error("MOTION_ENVELOPE_INVALID");
  const { motionDigest, ...payload } = envelope;
  if (motionDigest !== deterministicChecksum(payload)) throw new Error("MOTION_ENVELOPE_DIGEST_INVALID");
  if (!MOTION_SOURCE_CLASSES.includes(sourceClass)) throw new Error("SOURCE_CLASS_FORBIDDEN");
  if (featureVector?.petId !== envelope.petId) throw new Error("FEATURE_VECTOR_BINDING_INVALID");
  const geometryObserved = Object.values(envelope.geometrySignature).some((value) => value.availability === "OBSERVED");
  return {
    recordingId, petId: envelope.petId, repeatGroupId, repeatIndex, species: envelope.speciesMetadata,
    behavior, sourceClass, captureCondition,
    skeleton: { schemaVersion: envelope.skeletonSchemaVersion, availability: "OBSERVED", value: envelope.skeletonSignature, confidence: envelope.qualitySummary.skeletonConfidence, reasonCode: null },
    motionGeometry: geometryObserved
      ? { schemaVersion: envelope.geometryPolicyVersion, availability: "OBSERVED", value: envelope.geometrySignature, confidence: envelope.qualitySummary.jointGeometryConfidence, reasonCode: null }
      : unknownEvidence(envelope.geometryPolicyVersion, "INSUFFICIENT_GEOMETRY_COVERAGE"),
    featureVector, quality,
    confidence: { tracking: envelope.qualitySummary.trackingConfidence, motion: envelope.qualitySummary.temporalGeometryConfidence, overall: Math.min(envelope.qualitySummary.skeletonConfidence, envelope.qualitySummary.jointGeometryConfidence, envelope.qualitySummary.temporalGeometryConfidence) }
  };
}

export function compareRepeatedMotionSignatures(dataset, petId, { repeatGroupId } = { repeatGroupId: undefined }) {
  if (!safeId(petId)) throw new Error("PET_ID_REQUIRED");
  const candidates = dataset.records
    .filter((record) => record.petId === petId && (!repeatGroupId || record.repeatGroupId === repeatGroupId))
    .sort((a, b) => a.repeatIndex - b.repeatIndex || a.recordingId.localeCompare(b.recordingId));
  if (candidates.length < 2) return Object.freeze({ petId, repeatGroupId: repeatGroupId ?? null, pairs: Object.freeze([]), reasonCode: "INSUFFICIENT_REPEATED_RECORDINGS" });
  const pairs = [];
  for (let index = 1; index < candidates.length; index += 1) {
    const baseline = candidates[index - 1];
    const current = candidates[index];
    pairs.push(Object.freeze({
      fromRecordingId: baseline.recordingId,
      toRecordingId: current.recordingId,
      featureComparison: compareFeatureVectors(baseline.featureVector, current.featureVector),
      geometryComparison: compareGeometrySignatures(baseline.motionGeometry, current.motionGeometry)
    }));
  }
  return Object.freeze({ petId, repeatGroupId: repeatGroupId ?? null, pairs: Object.freeze(pairs), reasonCode: null });
}

function validateRecord(record, ids) {
  if (containsForbiddenKey(record)) throw new Error("FORBIDDEN_DATASET_FIELD");
  if (!safeId(record?.recordingId) || ids.has(record.recordingId)) throw new Error("RECORDING_ID_INVALID");
  ids.add(record.recordingId);
  if (!safeId(record.petId) || !safeId(record.repeatGroupId) || !Number.isInteger(record.repeatIndex) || record.repeatIndex < 1) throw new Error("REPEAT_BINDING_INVALID");
  if (!SPECIES.includes(record.species)) throw new Error("SPECIES_INVALID");
  if (!BEHAVIORS.includes(record.behavior)) throw new Error("BEHAVIOR_INVALID");
  if (!MOTION_SOURCE_CLASSES.includes(record.sourceClass)) throw new Error("SOURCE_CLASS_FORBIDDEN");
  if (!record.captureCondition || CAPTURE_KEYS.some((key) => typeof record.captureCondition[key] !== "string")) throw new Error("CAPTURE_CONDITION_INVALID");
  validateEvidence(record.skeleton, "SKELETON");
  validateEvidence(record.motionGeometry, "MOTION_GEOMETRY");
  validateFeatureVector(record.featureVector, record.petId);
  if (!QUALITY_RESULTS.includes(record.quality?.result) || !record.quality.policyVersion) throw new Error("QUALITY_INVALID");
  for (const key of ["tracking", "motion", "overall"]) if (!unitInterval(record.confidence?.[key])) throw new Error("CONFIDENCE_INVALID");
  return structuredClone(record);
}

function validateEvidence(evidence, label) {
  if (!evidence?.schemaVersion || !["OBSERVED", "UNKNOWN"].includes(evidence.availability)) throw new Error(`${label}_INVALID`);
  if (evidence.availability === "UNKNOWN" && (evidence.value !== null || !evidence.reasonCode)) throw new Error(`${label}_UNKNOWN_INVALID`);
  if (evidence.availability === "OBSERVED" && (evidence.value === null || !unitInterval(evidence.confidence))) throw new Error(`${label}_OBSERVED_INVALID`);
}

function validateFeatureVector(vector, petId) {
  if (vector?.petId !== petId || !vector.schemaVersion || !vector.extractorVersion) throw new Error("FEATURE_VECTOR_BINDING_INVALID");
  if (Object.keys(vector.features ?? {}).join("|") !== G2A_FEATURE_KEYS.join("|")) throw new Error("FEATURE_VECTOR_SCHEMA_INVALID");
  for (const datum of Object.values(vector.features)) {
    if (!datum || !["OBSERVED", "NOT_OBSERVED", "UNKNOWN"].includes(datum.availability)) throw new Error("FEATURE_DATUM_INVALID");
    if (datum.availability !== "OBSERVED" && datum.value !== null) throw new Error("UNKNOWN_MUST_BE_NULL");
    if (datum.availability === "OBSERVED" && !Number.isFinite(datum.value)) throw new Error("OBSERVED_VALUE_INVALID");
  }
}

function buildIndexes(records) {
  const definitions = {
    species: (record) => record.species,
    behavior: (record) => record.behavior,
    pet: (record) => record.petId,
    repeatGroup: (record) => record.repeatGroupId,
    skeleton: (record) => `${record.skeleton.schemaVersion}:${record.skeleton.availability}`,
    motionGeometry: (record) => `${record.motionGeometry.schemaVersion}:${record.motionGeometry.availability}`,
    featureVector: (record) => record.featureVector.schemaVersion,
    quality: (record) => record.quality.result,
    confidence: (record) => confidenceBand(record.confidence.overall)
  };
  for (const key of CAPTURE_KEYS) definitions[`capture.${key}`] = (record) => record.captureCondition[key];
  return Object.freeze(Object.fromEntries(Object.entries(definitions).map(([name, selector]) => [name, createIndex(records, selector)])));
}

function createIndex(records, selector) {
  const index = {};
  for (const record of records) {
    const key = selector(record);
    (index[key] ??= []).push(record.recordingId);
  }
  return Object.freeze(Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b)).map(([key, ids]) => [key, Object.freeze(ids.sort())])));
}

function compareGeometrySignatures(baseline, current) {
  if (baseline.schemaVersion !== current.schemaVersion) return Object.freeze({ comparisons: Object.freeze([]), exclusions: Object.freeze([{ key: "*", code: "SCHEMA_INCOMPATIBLE" }]) });
  if (baseline.availability !== "OBSERVED" || current.availability !== "OBSERVED") return Object.freeze({ comparisons: Object.freeze([]), exclusions: Object.freeze([{ key: "*", code: "GEOMETRY_UNKNOWN" }]) });
  const comparisons = [];
  const exclusions = [];
  for (const key of [...new Set([...Object.keys(baseline.value), ...Object.keys(current.value)])].sort()) {
    const left = baseline.value[key];
    const right = current.value[key];
    if (!left || !right || left.availability !== "OBSERVED" || right.availability !== "OBSERVED") { exclusions.push(Object.freeze({ key, code: "OBSERVED_INTERSECTION_REQUIRED" })); continue; }
    if (left.unit !== right.unit || !Number.isFinite(left.value) || !Number.isFinite(right.value)) { exclusions.push(Object.freeze({ key, code: "VALUE_INCOMPATIBLE" })); continue; }
    comparisons.push(Object.freeze({ key, unit: left.unit, fromValue: left.value, toValue: right.value, absoluteDelta: right.value - left.value, technicalConfidence: Math.min(left.confidence, right.confidence) }));
  }
  return Object.freeze({ comparisons: Object.freeze(comparisons), exclusions: Object.freeze(exclusions) });
}

function unknownEvidence(schemaVersion, reasonCode) { return { schemaVersion, availability: "UNKNOWN", value: null, confidence: 0, reasonCode }; }
function meanObservedConfidence(features) { const values = Object.values(features).filter((datum) => datum.availability === "OBSERVED").map((datum) => datum.confidence); return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
function confidenceBand(value) { return value >= 0.8 ? "HIGH" : value >= 0.6 ? "MEDIUM" : "LOW"; }
function containsForbiddenKey(value) { if (!value || typeof value !== "object") return false; return Object.entries(value).some(([key, child]) => FORBIDDEN_KEYS.includes(key.toLowerCase()) || containsForbiddenKey(child)); }
function safeId(value) { return typeof value === "string" && /^[a-z0-9][a-z0-9_-]{2,63}$/i.test(value); }
function unitInterval(value) { return Number.isFinite(value) && value >= 0 && value <= 1; }
function canonicalize(value) { if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`; return JSON.stringify(Object.is(value, -0) ? 0 : value); }
function checksum(text) { let value = 2166136261; for (let index = 0; index < text.length; index += 1) { value ^= text.charCodeAt(index); value = Math.imul(value, 16777619); } return `fnv1a32-${(value >>> 0).toString(16).padStart(8, "0")}`; }
function deepFreeze(value) { Object.freeze(value); for (const child of Object.values(value)) if (child && typeof child === "object" && !Object.isFrozen(child)) deepFreeze(child); return value; }
