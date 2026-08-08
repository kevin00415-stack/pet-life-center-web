import test from "node:test";
import assert from "node:assert/strict";
import { LANDMARK_KEYS, SKELETON_SCHEMA_VERSION } from "../src/features/guardian-motion/contracts.js";
import { createRawVideoFrameAdapterBoundary, createTechnicalFrameSkeletonEstimator } from "../src/features/guardian-motion/estimator-adapter.js";
import { createGuardianMotionRuntime } from "../src/features/guardian-motion/motion-runtime.js";
import { createDeterministicFeatureExtractor } from "../src/features/guardian-baseline/feature-extractor.js";
import { buildMotionDataset, createDatasetRecordFromMotionEnvelope, MOTION_DATASET_PURPOSE } from "../src/features/guardian-baseline/motion-dataset.js";
import { motionRequest, skeletonFrame, SKELETON_PET_ID } from "./fixtures/guardian-skeleton-fixtures.js";
import { precisionVideo } from "./fixtures/gbe-precision-fixtures.js";

test("G3-B emits the complete shared guardian-motion-skeleton-v2 landmark contract", async () => {
  const result = await createGuardianMotionRuntime().analyze(motionRequest());
  assert.equal(result.envelope.skeletonSchemaVersion, SKELETON_SCHEMA_VERSION);
  assert.deepEqual(Object.keys(result.envelope.skeletonFrames[0].landmarks), LANDMARK_KEYS);
  assert.equal(result.envelope.skeletonFrames[0].status, "COMPLETE");
  assert.equal(result.envelope.speciesMetadata, "DOG");
});

test("G3-B exact repeat and fresh runtime restart produce the same canonical Motion Envelope", async () => {
  const first = await createGuardianMotionRuntime().analyze(motionRequest());
  const second = await createGuardianMotionRuntime().analyze(structuredClone(motionRequest()));
  assert.deepEqual(first.envelope, second.envelope);
  assert.equal(first.envelope.motionDigest, second.envelope.motionDigest);
});

test("G3-B mirror transform never maps screen-left directly to anatomical-left", async () => {
  const normal = await createGuardianMotionRuntime().analyze(motionRequest({ technicalFrames: [skeletonFrame(0)] }));
  const mirrored = await createGuardianMotionRuntime().analyze(motionRequest({ technicalFrames: [skeletonFrame(0, { mirror: true })] }));
  const normalLeft = normal.envelope.skeletonFrames[0].landmarks.LEFT_SHOULDER;
  const mirroredLeft = mirrored.envelope.skeletonFrames[0].landmarks.LEFT_SHOULDER;
  assert.ok(Math.abs(mirroredLeft.x - (1 - normalLeft.x)) < 1e-12);
  assert.equal(normal.envelope.geometryFrames[0].jointAngles.leftFrontShoulderElbowWristAngle.value, mirrored.envelope.geometryFrames[0].jointAngles.leftFrontShoulderElbowWristAngle.value);
  assert.equal(mirrored.envelope.skeletonFrames[0].anatomicalSide.status, "RESOLVED");
});

test("G3-B side ambiguity suppresses every side-dependent landmark and geometry", async () => {
  const result = await createGuardianMotionRuntime().analyze(motionRequest({ technicalFrames: [skeletonFrame(0, { sideStatus: "AMBIGUOUS" })] }));
  const frame = result.envelope.skeletonFrames[0];
  assert.equal(frame.landmarks.LEFT_SHOULDER.state, "UNKNOWN");
  assert.equal(frame.landmarks.RIGHT_HIP.reasonCode, "ANATOMICAL_SIDE_AMBIGUOUS");
  assert.equal(result.envelope.geometryFrames[0].jointAngles.leftFrontShoulderElbowWristAngle.availability, "UNKNOWN");
});

test("G3-B detects a continuous side identity token change instead of silently swapping", async () => {
  const result = await createGuardianMotionRuntime().analyze(motionRequest({ technicalFrames: [skeletonFrame(0), skeletonFrame(1, { sideToken: "swapped-map" })] }));
  assert.equal(result.envelope.skeletonFrames[1].anatomicalSide.status, "AMBIGUOUS");
  assert.equal(result.envelope.skeletonFrames[1].anatomicalSide.reasonCode, "ANATOMICAL_SIDE_IDENTITY_CHANGED");
});

test("G3-B missing, occluded, out-of-frame and estimated landmarks are never fabricated as observed", async () => {
  const technicalFrames = [skeletonFrame(0, { landmarkOverrides: {
    HEAD: { state: "OCCLUDED", x: null, y: null },
    NOSE: { state: "OUT_OF_FRAME", x: null, y: null },
    NECK: { state: "UNKNOWN", x: null, y: null },
    LEFT_FRONT_ELBOW: { state: "ESTIMATED", confidence: 0.4, reasonCode: "SHORT_GAP_ESTIMATE" }
  } })];
  const result = await createGuardianMotionRuntime().analyze(motionRequest({ technicalFrames }));
  const landmarks = result.envelope.skeletonFrames[0].landmarks;
  assert.equal(landmarks.HEAD.state, "OCCLUDED");
  assert.equal(landmarks.NOSE.state, "OUT_OF_FRAME");
  assert.equal(landmarks.NECK.state, "UNKNOWN");
  assert.equal(landmarks.LEFT_FRONT_ELBOW.state, "ESTIMATED");
  assert.equal(result.envelope.geometryFrames[0].jointAngles.leftFrontShoulderElbowWristAngle.availability, "UNKNOWN");
});

test("G3-B entirely unavailable tail continuity remains UNKNOWN rather than observed zero", async () => {
  const request = motionRequest();
  request.technicalFrames = request.technicalFrames.map((frame) => skeletonFrame(frame.frameIndex, {
    timestampMs: frame.timestampMs,
    landmarkOverrides: {
      TAIL_BASE: { state: "OCCLUDED", x: null, y: null, confidence: 0, visibility: 0 },
      TAIL_MID: { state: "OCCLUDED", x: null, y: null, confidence: 0, visibility: 0 },
      TAIL_TIP: { state: "OCCLUDED", x: null, y: null, confidence: 0, visibility: 0 }
    }
  }));
  const result = await createGuardianMotionRuntime().analyze(request);
  assert.equal(result.envelope.temporalMotion.tailLandmarkContinuity.availability, "UNKNOWN");
  assert.equal(result.envelope.temporalMotion.tailLandmarkContinuity.value, null);
  assert.equal(result.envelope.temporalMotion.tailLandmarkContinuity.reasonCode, "TAIL_LANDMARKS_NOT_OBSERVED");
});

test("G3-B computes joint, limb, body, spine, head, tail and symmetry geometry only from observed landmarks", async () => {
  const frame = (await createGuardianMotionRuntime().analyze(motionRequest({ technicalFrames: [skeletonFrame(0)] }))).envelope.geometryFrames[0];
  for (const value of [
    ...Object.values(frame.jointAngles), ...Object.values(frame.limbExtension), ...Object.values(frame.limbCompression),
    frame.bodyAxis, frame.spineAxis, frame.headToBodyAngle, frame.tailBaseAngle, frame.tailCurvatureProxy,
    frame.bodyCenter, frame.bodyHeightLengthRatio, frame.leftRightPoseSymmetryProxy
  ]) assert.equal(value.availability, "OBSERVED");
});

test("G3-B temporal runtime measures stability and suppresses displacement under camera shake", async () => {
  const stable = await createGuardianMotionRuntime().analyze(motionRequest());
  assert.equal(stable.envelope.temporalMotion.landmarkJitter.HEAD.availability, "OBSERVED");
  assert.equal(stable.envelope.temporalMotion.frameToFrameDisplacement.HEAD.availability, "OBSERVED");
  assert.equal(stable.envelope.temporalMotion.jointAngleContinuity.leftFrontShoulderElbowWristAngle.availability, "OBSERVED");
  const shaken = await createGuardianMotionRuntime().analyze(motionRequest({ technicalFrames: [0, 1, 2].map((index) => skeletonFrame(index, { offsetX: index * 0.05, cameraMotionRisk: 0.9 })) }));
  assert.equal(shaken.envelope.temporalMotion.frameToFrameDisplacement.HEAD.availability, "UNKNOWN");
  assert.equal(shaken.envelope.temporalMotion.frameToFrameDisplacement.HEAD.reasonCode, "CAMERA_MOTION_RISK");
});

test("G3-B identity rejection occurs before the local estimator and returns no envelope", async () => {
  let calls = 0;
  const base = createTechnicalFrameSkeletonEstimator();
  const estimator = { ...base, async estimate(frame) { calls += 1; return base.estimate(frame); } };
  const runtime = createGuardianMotionRuntime({ estimator });
  const request = motionRequest();
  request.identityReceipt = { ...request.identityReceipt, state: "MISMATCH", accepted: false };
  const result = await runtime.analyze(request);
  assert.equal(result.status, "IDENTITY_ABORTED");
  assert.equal(result.envelope, null);
  assert.equal(calls, 0);
});

test("G3-B technical adapter records a local artifact and raw-video decoding remains an explicit boundary", () => {
  assert.equal(createTechnicalFrameSkeletonEstimator().provider, "TECHNICAL_FRAME_LOCAL");
  assert.match(createTechnicalFrameSkeletonEstimator().artifactVersion, /^guardian-/);
  assert.throws(() => createRawVideoFrameAdapterBoundary().adapt({}), /RAW_VIDEO_DECODER_UNAVAILABLE/);
});

test("G3-B dog and cat requests use one skeleton and geometry runtime", async () => {
  const dog = await createGuardianMotionRuntime().analyze(motionRequest());
  const cat = await createGuardianMotionRuntime().analyze(motionRequest({ species: "CAT", analysisRunId: "cat-run" }));
  assert.equal(dog.envelope.skeletonSchemaVersion, cat.envelope.skeletonSchemaVersion);
  assert.deepEqual(Object.keys(dog.envelope.geometryFrames[0]), Object.keys(cat.envelope.geometryFrames[0]));
});

test("G3-B valid Motion Envelope can enter G2-C without raw media or invented evidence", async () => {
  const envelope = (await createGuardianMotionRuntime().analyze(motionRequest())).envelope;
  const gbeVideo = precisionVideo("g3b-gbe", { petId: SKELETON_PET_ID, identityEvidence: { detectedPetIds: [SKELETON_PET_ID], confidence: 0.99 }, technicalFrames: precisionVideo("g3b-source").technicalFrames.map((frame) => ({ ...frame, trackedPetId: SKELETON_PET_ID })) });
  const featureVector = (await createDeterministicFeatureExtractor().extract({ analysisRunId: "g3b-feature", petId: SKELETON_PET_ID, video: gbeVideo, purpose: "VALIDATION" })).vector;
  const record = createDatasetRecordFromMotionEnvelope({
    envelope, recordingId: "g3b-recording", repeatGroupId: "g3b-repeat", repeatIndex: 1,
    behavior: "MIXED_ACTIVITY", sourceClass: "SYNTHETIC",
    captureCondition: { deviceType: "UNKNOWN_FUTURE", lighting: "BRIGHT_INDOOR", camera: "STATIC", distance: "MEDIUM", view: "SIDE", visibility: "FULL_BODY", length: "NORMAL" },
    featureVector, quality: { result: "USABLE", policyVersion: "gbe-g2a-quality-v1", reasonCodes: [] }
  });
  const dataset = buildMotionDataset({ datasetId: "g3b-dataset", purpose: MOTION_DATASET_PURPOSE, records: [record] });
  assert.equal(dataset.records[0].skeleton.availability, "OBSERVED");
  assert.equal(dataset.records[0].motionGeometry.availability, "OBSERVED");
});
