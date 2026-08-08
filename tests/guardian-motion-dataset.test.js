import test from "node:test";
import assert from "node:assert/strict";
import { createDeterministicFeatureExtractor, G2A_FEATURE_KEYS } from "../src/features/guardian-baseline/feature-extractor.js";
import {
  MOTION_DATASET_PURPOSE,
  buildMotionDataset,
  compareRepeatedMotionSignatures,
  createDatasetRecordsFromValidation
} from "../src/features/guardian-baseline/motion-dataset.js";
import { runValidationSuite, G2B_MANIFEST_VERSION } from "../src/features/guardian-baseline/validation-harness.js";
import { FIXTURE_PET_ID, precisionVideo } from "./fixtures/gbe-precision-fixtures.js";

async function featureVector(id, petId = FIXTURE_PET_ID, video = precisionVideo(id)) {
  const result = await createDeterministicFeatureExtractor().extract({ analysisRunId: id, petId, video: { ...video, petId }, purpose: "VALIDATION" });
  return result.vector;
}

async function record(id, overrides = {}) {
  return {
    recordingId: id, petId: FIXTURE_PET_ID, repeatGroupId: "pet-precision-mixed", repeatIndex: 1,
    species: "DOG", behavior: "MIXED_ACTIVITY", sourceClass: "SYNTHETIC",
    captureCondition: { deviceType: "UNKNOWN_FUTURE", lighting: "BRIGHT_INDOOR", camera: "STATIC", distance: "MEDIUM", view: "SIDE", visibility: "FULL_BODY", length: "NORMAL" },
    skeleton: { schemaVersion: "guardian-motion-skeleton-v1", availability: "UNKNOWN", value: null, confidence: 0, reasonCode: "SKELETON_ENGINE_NOT_IMPLEMENTED" },
    motionGeometry: { schemaVersion: "guardian-motion-geometry-v1", availability: "UNKNOWN", value: null, confidence: 0, reasonCode: "MOTION_LAYER_NOT_IMPLEMENTED" },
    featureVector: await featureVector(`vector-${id}`),
    quality: { result: "USABLE", policyVersion: "gbe-g2a-quality-v1", reasonCodes: [] },
    confidence: { tracking: 0.9, motion: 0.9, overall: 0.9 },
    ...overrides
  };
}

test("G2-C indexes every recording by species, behavior, capture, geometry, skeleton, feature, quality and confidence", async () => {
  const dataset = buildMotionDataset({ datasetId: "motion-dataset-001", purpose: MOTION_DATASET_PURPOSE, records: [await record("recording-001")] });
  for (const key of ["species", "behavior", "skeleton", "motionGeometry", "featureVector", "quality", "confidence", "capture.deviceType", "capture.lighting", "capture.camera", "capture.distance", "capture.view", "capture.visibility", "capture.length"]) {
    assert.ok(dataset.indexes[key], key);
    assert.equal(Object.values(dataset.indexes[key]).flat().includes("recording-001"), true, key);
  }
  assert.match(dataset.datasetChecksum, /^fnv1a32-/);
});

test("G2-C is validation-only and rejects production, raw-media, private, medical and training fields", async () => {
  const base = await record("recording-safe");
  for (const mutation of [
    { sourceClass: "PRODUCTION_USER_MEDIA" },
    { rawMediaPath: "local.mp4" },
    { ownerName: "forbidden" },
    { location: "forbidden" },
    { diagnosis: "forbidden" },
    { healthScore: 1 },
    { trainingLabel: "walk" }
  ]) assert.throws(() => buildMotionDataset({ datasetId: "motion-dataset-safe", purpose: MOTION_DATASET_PURPOSE, records: [{ ...base, ...mutation }] }));
  assert.throws(() => buildMotionDataset({ datasetId: "motion-dataset-purpose", purpose: "AI_TRAINING", records: [base] }), /DATASET_PURPOSE_INVALID/);
  assert.throws(() => buildMotionDataset({ datasetId: "motion-dataset-auth", purpose: MOTION_DATASET_PURPOSE, records: [{ ...base, sourceClass: "GUARDIAN_HQ_AUTHORIZED_TEST" }] }), /REAL_TEST_AUTHORIZATION_REQUIRED/);
});

test("G2-C repeat sequence is unique and comparisons follow repeatIndex rather than record ID", async () => {
  const late = await record("recording-a-late", { repeatIndex: 2 });
  const early = await record("recording-z-early", { repeatIndex: 1 });
  assert.throws(() => buildMotionDataset({ datasetId: "motion-dataset-duplicate", purpose: MOTION_DATASET_PURPOSE, records: [early, { ...late, repeatIndex: 1 }] }), /REPEAT_SEQUENCE_DUPLICATE/);
  const dataset = buildMotionDataset({ datasetId: "motion-dataset-order", purpose: MOTION_DATASET_PURPOSE, records: [late, early] });
  const result = compareRepeatedMotionSignatures(dataset, FIXTURE_PET_ID);
  assert.equal(result.pairs[0].fromRecordingId, "recording-z-early");
  assert.equal(result.pairs[0].toRecordingId, "recording-a-late");
});

test("G2-C requires unknown skeleton and geometry to remain null with explicit reason", async () => {
  const base = await record("recording-unknown");
  assert.throws(() => buildMotionDataset({ datasetId: "motion-dataset-unknown", purpose: MOTION_DATASET_PURPOSE, records: [{ ...base, skeleton: { ...base.skeleton, value: 0 } }] }), /SKELETON_UNKNOWN_INVALID/);
  const dataset = buildMotionDataset({ datasetId: "motion-dataset-valid-unknown", purpose: MOTION_DATASET_PURPOSE, records: [base] });
  assert.equal(dataset.records[0].skeleton.value, null);
  assert.equal(dataset.records[0].motionGeometry.value, null);
});

test("G2-C checksum and indexes are reproducible regardless of input order", async () => {
  const first = await record("recording-a", { repeatIndex: 1 });
  const second = await record("recording-b", { repeatIndex: 2 });
  const a = buildMotionDataset({ datasetId: "motion-dataset-repeat", purpose: MOTION_DATASET_PURPOSE, records: [first, second] });
  const b = buildMotionDataset({ datasetId: "motion-dataset-repeat", purpose: MOTION_DATASET_PURPOSE, records: [second, first] });
  assert.equal(a.datasetChecksum, b.datasetChecksum);
  assert.deepEqual(a.indexes, b.indexes);
});

test("G2-C compares repeated signatures only inside one pet scope and excludes unknown geometry", async () => {
  const dataset = buildMotionDataset({
    datasetId: "motion-dataset-comparison", purpose: MOTION_DATASET_PURPOSE,
    records: [await record("recording-compare-a", { repeatIndex: 1 }), await record("recording-compare-b", { repeatIndex: 2 })]
  });
  const comparison = compareRepeatedMotionSignatures(dataset, FIXTURE_PET_ID, { repeatGroupId: "pet-precision-mixed" });
  assert.equal(comparison.pairs.length, 1);
  assert.equal(comparison.pairs[0].featureComparison.comparisons.length > 0, true);
  assert.deepEqual(comparison.pairs[0].geometryComparison.comparisons, []);
  assert.equal(comparison.pairs[0].geometryComparison.exclusions[0].code, "GEOMETRY_UNKNOWN");
  assert.equal(compareRepeatedMotionSignatures(dataset, "pet-other").reasonCode, "INSUFFICIENT_REPEATED_RECORDINGS");
});

test("G2-C preserves UNKNOWN feature values and observed-intersection comparison", async () => {
  const first = await record("recording-feature-a", { repeatIndex: 1 });
  const second = await record("recording-feature-b", { repeatIndex: 2 });
  second.featureVector = structuredClone(second.featureVector);
  second.featureVector.features.pauseFrequency = { ...second.featureVector.features.pauseFrequency, availability: "UNKNOWN", value: null, confidence: 0, reasonCode: "TEST_UNKNOWN" };
  const dataset = buildMotionDataset({ datasetId: "motion-dataset-feature", purpose: MOTION_DATASET_PURPOSE, records: [first, second] });
  const result = compareRepeatedMotionSignatures(dataset, FIXTURE_PET_ID);
  assert.equal(result.pairs[0].featureComparison.exclusions.some((item) => item.featureKey === "pauseFrequency" && item.code === "CURRENT_UNKNOWN"), true);
});

test("G2-C cat and dog records use the same feature and motion evidence schemas", async () => {
  const dog = await record("recording-dog");
  const catPetId = "pet-cat-dataset";
  const catVideo = precisionVideo("cat-dataset-video", { petId: catPetId, species: "cat", identityEvidence: { detectedPetIds: [catPetId], confidence: 0.99 }, technicalFrames: precisionVideo("cat-source").technicalFrames.map((frame) => ({ ...frame, trackedPetId: catPetId })) });
  const cat = await record("recording-cat", { petId: catPetId, repeatGroupId: "pet-cat-mixed", species: "CAT", featureVector: await featureVector("cat-vector", catPetId, catVideo) });
  const dataset = buildMotionDataset({ datasetId: "motion-dataset-species", purpose: MOTION_DATASET_PURPOSE, records: [dog, cat] });
  assert.deepEqual(Object.keys(dataset.records[0].featureVector.features), G2A_FEATURE_KEYS);
  assert.equal(dataset.records[0].skeleton.schemaVersion, dataset.records[1].skeleton.schemaVersion);
  assert.equal(dataset.records[0].motionGeometry.schemaVersion, dataset.records[1].motionGeometry.schemaVersion);
});

test("G2-C converts G2-B validation evidence without inventing skeleton or geometry", async () => {
  const fixture = { fixtureId: "dataset-fixture-001", petId: FIXTURE_PET_ID, repeatGroupId: "pet-precision-mixed", repeatIndex: 1, species: "DOG", deviceType: "UNKNOWN_FUTURE", deviceAlias: "synthetic", lighting: "BRIGHT_INDOOR", camera: "STATIC", distance: "MEDIUM", view: "SIDE", visibility: "FULL_BODY", activity: "MIXED_ACTIVITY", length: "NORMAL", expectedQuality: "USABLE", source: { kind: "TECHNICAL_FRAME_JSON", localPath: "synthetic.json" } };
  const manifest = { manifestVersion: G2B_MANIFEST_VERSION, manifestId: "dataset-manifest-001", evidenceClass: "SYNTHETIC_RESULT", fixtures: [fixture] };
  const report = await runValidationSuite({ manifest, loadFixture: async () => precisionVideo("dataset-source") });
  const records = createDatasetRecordsFromValidation({ manifest, report });
  assert.equal(records[0].skeleton.availability, "UNKNOWN");
  assert.equal(records[0].motionGeometry.availability, "UNKNOWN");
  assert.equal(records[0].featureVector.schemaVersion, report.recordings[0].runs[0].featureSchemaVersion);
});
