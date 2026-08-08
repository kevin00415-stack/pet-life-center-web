import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createLearnedPoseAdapter, LEARNED_PROVIDER_ID } from "../src/learned-pose-adapter.mjs";

const frozenRoot = process.env.GUARDIAN_FROZEN_RUNTIME_ROOT;
if (!frozenRoot) throw new Error("GUARDIAN_FROZEN_RUNTIME_ROOT_REQUIRED");
const motionModule = await frozen("src/features/guardian-motion/motion-runtime.js");
const contractsModule = await frozen("src/features/guardian-motion/contracts.js");
const datasetModule = await frozen("src/features/guardian-baseline/motion-dataset.js");
const featureModule = await frozen("src/features/guardian-baseline/feature-extractor.js");

test("provider-neutral learned adapter enters frozen Skeleton V2 without changing its 26-key contract", async () => {
  const adapter = createLearnedPoseAdapter({ detectorIdentity: "replaceable-detector-test" });
  const adapted = adapter.adaptPredictionSequence({ frames: [predictionFrame()], className: "dog" });
  const envelope = await analyze(adapter, adapted.technicalFrames);
  assert.equal(adapter.identity.providerIdentity, LEARNED_PROVIDER_ID);
  assert.equal(adapter.identity.detectorIdentity, "replaceable-detector-test");
  assert.deepEqual(Object.keys(envelope.skeletonFrames[0].landmarks), contractsModule.LANDMARK_KEYS);
  assert.deepEqual(countStates(envelope.skeletonFrames[0].landmarks), { ESTIMATED: 4, OBSERVED: 15, UNKNOWN: 7 });
});

test("low SimCC score becomes UNKNOWN, never OCCLUDED or silent OBSERVED", async () => {
  const adapter = createLearnedPoseAdapter();
  const frame = predictionFrame({ scores: { NOSE: 0.4 } });
  const adapted = adapter.adaptPredictionSequence({ frames: [frame], className: "dog" });
  const envelope = await analyze(adapter, adapted.technicalFrames);
  const nose = envelope.skeletonFrames[0].landmarks.NOSE;
  assert.equal(nose.state, "UNKNOWN");
  assert.equal(nose.reasonCode, "LEARNED_LANDMARK_CONFIDENCE_LOW");
  assert.equal(Object.values(envelope.skeletonFrames[0].landmarks).some((item) => item.state === "OCCLUDED"), false);
});

test("estimated torso points require sufficient source evidence", async () => {
  const adapter = createLearnedPoseAdapter();
  const frame = predictionFrame({ scores: { L_HIP: 0.5 } });
  const adapted = adapter.adaptPredictionSequence({ frames: [frame], className: "dog" });
  const envelope = await analyze(adapter, adapted.technicalFrames);
  assert.equal(envelope.skeletonFrames[0].landmarks.LEFT_HIP.state, "UNKNOWN");
  assert.equal(envelope.skeletonFrames[0].landmarks.SPINE_REAR.state, "UNKNOWN");
  assert.equal(envelope.skeletonFrames[0].landmarks.BODY_CENTER.state, "UNKNOWN");
});

test("missing wrist and ankle evidence remains an explicit geometry gap", async () => {
  const adapter = createLearnedPoseAdapter();
  const adapted = adapter.adaptPredictionSequence({ frames: [predictionFrame()], className: "dog" });
  const envelope = await analyze(adapter, adapted.technicalFrames);
  const geometry = envelope.geometryFrames[0];
  for (const item of Object.values(geometry.jointAngles)) {
    assert.equal(item.availability, "UNKNOWN");
    assert.equal(item.reasonCode, "JOINT_LANDMARKS_NOT_OBSERVED");
  }
  assert.equal(geometry.bodyAxis.availability, "OBSERVED");
  assert.equal(geometry.bodyHeightLengthRatio.availability, "OBSERVED");
});

test("walking-like learned motion differs from repeated static evidence", async () => {
  const adapter = createLearnedPoseAdapter();
  const staticFrames = [0, 1, 2].map(() => predictionFrame());
  const movingFrames = [0, 1, 2].map((index) => predictionFrame({ offsets: { L_FRONT_PAW: index * 8, R_FRONT_PAW: index * -6 } }));
  const staticEnvelope = await analyze(adapter, adapter.adaptPredictionSequence({ frames: staticFrames, className: "dog" }).technicalFrames);
  const movingEnvelope = await analyze(adapter, adapter.adaptPredictionSequence({ frames: movingFrames, className: "dog" }).technicalFrames);
  assert.equal(staticEnvelope.temporalMotion.frameToFrameDisplacement.LEFT_FRONT_PAW.value, 0);
  assert.ok(movingEnvelope.temporalMotion.frameToFrameDisplacement.LEFT_FRONT_PAW.value > 0);
});

test("camera-motion risk suppresses displacement rather than reporting false animal motion", async () => {
  const adapter = createLearnedPoseAdapter();
  const frames = [
    predictionFrame(),
    predictionFrame({ bbox: [55, 5, 100, 95], globalOffset: 45 }),
    predictionFrame()
  ];
  const adapted = adapter.adaptPredictionSequence({ frames, className: "dog" });
  const controlledHighRisk = structuredClone(adapted.technicalFrames).map((frame) => ({ ...frame, cameraMotionRisk: 0.9 }));
  const envelope = await analyze(adapter, controlledHighRisk);
  assert.ok(envelope.temporalMotion.cameraMotionRisk >= 0.5);
  assert.equal(envelope.temporalMotion.frameToFrameDisplacement.NOSE.availability, "UNKNOWN");
  assert.equal(envelope.temporalMotion.frameToFrameDisplacement.NOSE.reasonCode, "CAMERA_MOTION_RISK");
});

test("detector miss and unresolved multi-animal target reject explicitly", () => {
  const adapter = createLearnedPoseAdapter();
  assert.throws(() => adapter.adaptPredictionSequence({ frames: [{ ...predictionFrame(), detections: [] }], className: "dog" }), /DETECTOR_MISS/);
  const frame = predictionFrame();
  frame.detections.push({ ...structuredClone(frame.detections[0]), instance_id: "dog-2" });
  assert.throws(() => adapter.adaptPredictionSequence({ frames: [frame], className: "dog" }), /MULTIPLE_ANIMALS_TARGET_SELECTION_REQUIRED/);
});

test("left-right uncertainty suppresses side-dependent points without renaming screen sides", async () => {
  const adapter = createLearnedPoseAdapter();
  const adapted = adapter.adaptPredictionSequence({ frames: [predictionFrame()], className: "dog", sideStatus: "AMBIGUOUS" });
  const envelope = await analyze(adapter, adapted.technicalFrames);
  assert.equal(envelope.skeletonFrames[0].landmarks.LEFT_SHOULDER.state, "UNKNOWN");
  assert.equal(envelope.skeletonFrames[0].landmarks.RIGHT_HIP.reasonCode, "ANATOMICAL_SIDE_AMBIGUOUS");
});

test("tail drift and paw instability remain technical evidence with UNKNOWN gaps preserved", async () => {
  const adapter = createLearnedPoseAdapter();
  const frames = [0, 1, 2].map((index) => predictionFrame({ offsets: { TAIL_ROOT: index * 5 }, scores: index === 1 ? { L_FRONT_PAW: 0.2 } : {} }));
  const envelope = await analyze(adapter, adapter.adaptPredictionSequence({ frames, className: "dog" }).technicalFrames);
  assert.ok(envelope.temporalMotion.frameToFrameDisplacement.TAIL_BASE.value > 0);
  assert.equal(envelope.skeletonFrames[1].landmarks.LEFT_FRONT_PAW.state, "UNKNOWN");
  assert.equal(envelope.skeletonFrames[1].landmarks.TAIL_MID.state, "UNKNOWN");
  assert.equal(envelope.skeletonFrames[1].landmarks.TAIL_TIP.state, "UNKNOWN");
});

test("five identical runs have one digest and G2-C ingests signatures without media or medical fields", async () => {
  const adapter = createLearnedPoseAdapter();
  const technicalFrames = adapter.adaptPredictionSequence({ frames: [predictionFrame(), predictionFrame()], className: "dog" }).technicalFrames;
  const envelopes = [];
  for (let index = 0; index < 5; index += 1) envelopes.push(await analyze(adapter, structuredClone(technicalFrames)));
  assert.equal(new Set(envelopes.map((item) => item.motionDigest)).size, 1);
  const envelope = envelopes[0];
  const featureVector = {
    id: "poc2-test-vector", petId: envelope.petId,
    schemaVersion: "gbe-g2a-features-v1", extractorVersion: "poc2-unknown-v1",
    features: Object.fromEntries(featureModule.G2A_FEATURE_KEYS.map((key) => [key, {
      availability: "UNKNOWN", value: null, unit: null, confidence: 0,
      reasonCode: "NOT_DERIVED", opportunityDuration: 0, evidenceCoverage: 0
    }]))
  };
  const record = datasetModule.createDatasetRecordFromMotionEnvelope({
    envelope, recordingId: "poc2-test-record", repeatGroupId: "poc2-test-repeat", repeatIndex: 1,
    behavior: "WALKING_MOVING", sourceClass: "GUARDIAN_HQ_AUTHORIZED_TEST",
    captureCondition: { deviceType: "TEST", lighting: "TEST", camera: "TEST", distance: "TEST", view: "TEST", visibility: "TEST", length: "TEST" },
    featureVector, quality: { result: "PARTIALLY_USABLE", policyVersion: "poc2-test-policy", reasonCodes: ["GEOMETRY_EVIDENCE_GAP"] }
  });
  const dataset = datasetModule.buildMotionDataset({
    datasetId: "poc2-test-dataset", purpose: datasetModule.MOTION_DATASET_PURPOSE,
    authorizationRef: "guardian-hq-poc2-approved", records: [record]
  });
  const serialized = JSON.stringify(dataset).toLowerCase();
  for (const forbidden of ["rawpixels", "videoframes", "diagnosis", "disease", "medicalinterpretation"]) assert.equal(serialized.includes(`\"${forbidden}\"`), false);
  assert.match(dataset.datasetChecksum, /^fnv1a32-/);
});

async function analyze(adapter, technicalFrames) {
  const runtime = motionModule.createGuardianMotionRuntime({ frameAdapter: adapter.frameAdapter, estimator: adapter.estimator });
  const request = {
    analysisRunId: "poc2-test-analysis", petId: "poc2-test-pet", videoId: "poc2-test-video", species: "DOG",
    identityReceipt: { id: "poc2-test-identity", petId: "poc2-test-pet", videoId: "poc2-test-video", state: "MATCH", accepted: true },
    technicalFrames
  };
  const result = await runtime.analyze(request);
  assert.equal(result.status, "COMPLETE_OR_PARTIAL");
  return result.envelope;
}

function predictionFrame({ scores = {}, offsets = {}, bbox = [5, 5, 95, 95], globalOffset = 0 } = {}) {
  const points = {
    L_EYE: [72, 28], R_EYE: [68, 28], NOSE: [78, 32], NECK: [64, 42], TAIL_ROOT: [20, 48],
    L_SHOULDER: [60, 45], L_ELBOW: [62, 62], L_FRONT_PAW: [64, 82],
    R_SHOULDER: [56, 50], R_ELBOW: [57, 67], R_FRONT_PAW: [58, 85],
    L_HIP: [32, 46], L_KNEE: [34, 65], L_REAR_PAW: [36, 84],
    R_HIP: [28, 52], R_KNEE: [29, 69], R_REAR_PAW: [30, 87]
  };
  const ap10k = Object.entries(points).map(([name, [baseX, baseY]], index) => ({
    index, name, x: baseX + globalOffset + (offsets[name] ?? 0), y: baseY,
    confidence: scores[name] ?? 0.95
  }));
  const point = (name, key) => ({
    key, x: points[name][0] + globalOffset + (offsets[name] ?? 0), y: points[name][1], confidence: scores[name] ?? 0.95,
    evidence: "OBSERVED", source: [name], reason: null
  });
  const midpoint = (names, key) => {
    const source = names.map((name) => ap10k.find((item) => item.name === name));
    return {
      key, x: source.reduce((sum, item) => sum + item.x, 0) / source.length,
      y: source.reduce((sum, item) => sum + item.y, 0) / source.length,
      confidence: Math.min(...source.map((item) => item.confidence)), evidence: "ESTIMATED", source: names,
      reason: "geometric_midpoint_from_observed_sources"
    };
  };
  const guardian26 = [
    midpoint(["L_EYE", "R_EYE"], "HEAD"), point("NOSE", "NOSE"), point("NECK", "NECK"),
    point("L_SHOULDER", "LEFT_SHOULDER"), point("R_SHOULDER", "RIGHT_SHOULDER"),
    midpoint(["L_SHOULDER", "R_SHOULDER"], "SPINE_FRONT"), unknown("SPINE_MID"), midpoint(["L_HIP", "R_HIP"], "SPINE_REAR"),
    point("L_HIP", "LEFT_HIP"), point("R_HIP", "RIGHT_HIP"),
    point("L_ELBOW", "LEFT_FRONT_ELBOW"), point("R_ELBOW", "RIGHT_FRONT_ELBOW"),
    unknown("LEFT_FRONT_WRIST"), unknown("RIGHT_FRONT_WRIST"),
    point("L_FRONT_PAW", "LEFT_FRONT_PAW"), point("R_FRONT_PAW", "RIGHT_FRONT_PAW"),
    point("L_KNEE", "LEFT_REAR_KNEE"), point("R_KNEE", "RIGHT_REAR_KNEE"),
    unknown("LEFT_REAR_ANKLE"), unknown("RIGHT_REAR_ANKLE"),
    point("L_REAR_PAW", "LEFT_REAR_PAW"), point("R_REAR_PAW", "RIGHT_REAR_PAW"),
    point("TAIL_ROOT", "TAIL_BASE"), unknown("TAIL_MID"), unknown("TAIL_TIP"),
    midpoint(["L_SHOULDER", "R_SHOULDER", "L_HIP", "R_HIP"], "BODY_CENTER")
  ];
  return {
    frame_index: 0, width: 100 + globalOffset, height: 100,
    detections: [{
      instance_id: "dog-1", class_name: "dog", detector_confidence: 0.95,
      bbox_xyxy: bbox, ap10k, guardian26
    }],
    timing: { detector_ms: 1, pose_ms_total: 1, total_ms: 2 }
  };
}

function unknown(key) { return { key, x: null, y: null, confidence: null, evidence: "UNKNOWN", source: [], reason: "landmark_not_provided_or_reliably_derivable_from_ap10k" }; }
function countStates(landmarks) { const result = {}; for (const item of Object.values(landmarks)) result[item.state] = (result[item.state] ?? 0) + 1; return result; }
async function frozen(relativePath) { return import(pathToFileURL(path.join(frozenRoot, relativePath)).href); }
