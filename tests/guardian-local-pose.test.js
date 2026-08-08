import test from "node:test";
import assert from "node:assert/strict";
import { createDeterministicFeatureExtractor } from "../src/features/guardian-baseline/feature-extractor.js";
import { buildMotionDataset, createDatasetRecordFromMotionEnvelope, MOTION_DATASET_PURPOSE } from "../src/features/guardian-baseline/motion-dataset.js";
import { LANDMARK_KEYS } from "../src/features/guardian-motion/contracts.js";
import { createLocalVideoPoseRuntime } from "../src/features/guardian-motion/local-video-pose-runtime.js";
import { createManualAnnotationSet, createLandmarkErrorReport } from "../src/features/guardian-motion/manual-annotation.js";
import { createAuthorizedTargetDescriptor, createLocalPixelPoseEstimator } from "../src/features/guardian-motion/pixel-pose-estimator.js";
import { runPoseRepeatability, runRealDevicePoseHarness } from "../src/features/guardian-motion/pose-validation-harness.js";
import { createBrowserLocalVideoDecoder, createMemoryPixelFrameDecoder, validateLocalVideoFile } from "../src/features/guardian-motion/video-decoder.js";
import { localPoseRequest, localVideoFile, pixelFrame, targetDescriptor } from "./fixtures/guardian-pixel-pose-fixtures.js";
import { precisionVideo } from "./fixtures/gbe-precision-fixtures.js";

function runtime() { return createLocalVideoPoseRuntime({ decoder: createMemoryPixelFrameDecoder() }); }

test("G3-C accepts local MP4 and MOV contracts and rejects remote or unsupported sources", () => {
  assert.equal(validateLocalVideoFile({ name: "clip.mp4", type: "video/mp4", size: 1 }).extension, "mp4");
  assert.equal(validateLocalVideoFile({ name: "clip.mov", type: "video/quicktime", size: 1 }).extension, "mov");
  assert.throws(() => validateLocalVideoFile({ name: "https://example.test/pet.mp4", type: "video/mp4", size: 1 }), /REMOTE_VIDEO_SOURCE_REJECTED/);
  assert.throws(() => validateLocalVideoFile({ name: "clip.avi", type: "video\/avi", size: 1 }), /VIDEO_FORMAT_UNSUPPORTED/);
});

test("G3-C browser decoder extracts ordered local RGBA frames and revokes its object URL", async () => {
  let revoked = null;
  class FakeVideo extends EventTarget {
    constructor() { super(); this.duration = 0.2; this.videoWidth = 4; this.videoHeight = 3; this.readyState = 2; this._currentTime = 0; }
    set src(value) { this._src = value; queueMicrotask(() => this.dispatchEvent(new Event("loadedmetadata"))); }
    set currentTime(value) { this._currentTime = value; queueMicrotask(() => this.dispatchEvent(new Event("seeked"))); }
    get currentTime() { return this._currentTime; }
    removeAttribute() {}
    load() {}
  }
  const context = { drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(4 * 3 * 4).fill(200) }) };
  const environment = {
    document: { createElement: (tag) => tag === "video" ? new FakeVideo() : { width: 0, height: 0, getContext: () => context } },
    URL: { createObjectURL: () => "blob:local-only", revokeObjectURL: (value) => { revoked = value; } }
  };
  const decoded = await createBrowserLocalVideoDecoder({ environment, sampleFps: 10 }).decode({ name: "local.mov", type: "video/quicktime", size: 10 });
  assert.equal(decoded.sourceFormat, "MOV");
  assert.deepEqual(decoded.frames.map((frame) => frame.timestampMs), [0, 100, 199]);
  assert.equal(decoded.frames[0].rgba.length, 48);
  assert.equal(revoked, "blob:local-only");
});

test("G3-C decodes ordered local pixel frames and emits Skeleton V2 without synthetic landmarks", async () => {
  const request = localPoseRequest();
  assert.equal("technicalFrames" in request, false);
  const result = await runtime().analyze(request);
  assert.ok(result.envelope);
  assert.equal(result.source.localOnly, true);
  assert.equal(result.source.format, "MP4");
  assert.equal(result.envelope.skeletonSchemaVersion, "guardian-motion-skeleton-v2");
  assert.equal(result.envelope.estimatorVersion, "guardian-deterministic-silhouette-pose-v0");
  assert.deepEqual(Object.keys(result.envelope.skeletonFrames[0].landmarks), [...LANDMARK_KEYS]);
  assert.equal(result.envelope.skeletonFrames[0].landmarks.BODY_CENTER.state, "OBSERVED");
  assert.equal(result.envelope.skeletonFrames[0].landmarks.HEAD.state, "ESTIMATED");
});

test("G3-C never promotes unvalidated pixel joint estimates to OBSERVED geometry", async () => {
  const result = await runtime().analyze(localPoseRequest());
  assert.equal(result.envelope.geometryFrames[0].jointAngles.leftFrontShoulderElbowWristAngle.availability, "UNKNOWN");
  assert.equal(result.envelope.geometryFrames[0].jointAngles.leftFrontShoulderElbowWristAngle.value, null);
  assert.equal(result.envelope.geometryFrames[0].bodyCenter.availability, "OBSERVED");
});

test("G3-C rejects multiple pets before Motion Envelope and preserves zero-write policy", async () => {
  const twoPets = pixelFrame({ rectangles: [
    { x: 2, y: 5, width: 12, height: 12, color: [40, 60, 80] },
    { x: 18, y: 5, width: 12, height: 12, color: [60, 70, 90] }
  ] });
  const result = await runtime().analyze(localPoseRequest({ localVideoFile: localVideoFile({ authorizedPixelFrames: [twoPets] }) }));
  assert.equal(result.status, "MULTIPLE_PETS");
  assert.equal(result.envelope, null);
  assert.deepEqual(result.writes, { observation: 0, trend: 0, timeline: 0, baseline: 0, dataset: 0 });
});

test("G3-C rejects unknown target, mismatch and identity switching", async () => {
  const unknown = await runtime().analyze(localPoseRequest({ targetDescriptor: { petId: "pet-pixel" } }));
  assert.equal(unknown.status, "UNKNOWN");
  const mismatch = await runtime().analyze(localPoseRequest({ targetDescriptor: targetDescriptor({ signature: { meanColor: { r: 255, g: 0, b: 0 }, aspectRatio: 0.2, areaRatio: 0.02 } }) }));
  assert.equal(mismatch.status, "MISMATCH");
  const switchedFile = localVideoFile({ authorizedPixelFrames: [pixelFrame({ timestampMs: 0 }), pixelFrame({ timestampMs: 100, rectangles: [{ x: 2, y: 2, width: 8, height: 18, color: [150, 20, 20] }] })] });
  const switched = await runtime().analyze(localPoseRequest({ localVideoFile: switchedFile }));
  assert.equal(switched.status, "MISMATCH");
  assert.equal(switched.reasonCode, "TARGET_SIGNATURE_MISMATCH");
  const estimator = createLocalPixelPoseEstimator();
  const switchedIdentity = estimator.estimateFrame(pixelFrame(), targetDescriptor(), { signature: { meanColor: { r: 255, g: 0, b: 0 }, aspectRatio: 0.2, areaRatio: 0.02 } });
  assert.equal(switchedIdentity.status, "MISMATCH");
  assert.equal(switchedIdentity.reasonCode, "IDENTITY_SWITCH_DETECTED");
});

test("G3-C target descriptors require owner confirmation and remain isolated per pet", async () => {
  assert.throws(() => createAuthorizedTargetDescriptor({ frame: pixelFrame(), petId: "pet-pixel", ownerConfirmation: { accepted: false, petId: "pet-pixel" }, heading: "RIGHT" }), /TARGET_DESCRIPTOR_CONFIRMATION_REQUIRED/);
  const descriptor = createAuthorizedTargetDescriptor({
    frame: pixelFrame(), petId: "pet-pixel", ownerConfirmation: { accepted: true, petId: "pet-pixel" }, heading: "RIGHT",
    anatomicalSide: { status: "RESOLVED", confidence: 0.95, identityToken: "side-pixel" }
  });
  assert.equal(descriptor.petId, "pet-pixel");
  const crossPet = await runtime().analyze(localPoseRequest({ petId: "pet-other", targetDescriptor: descriptor, identityReceipt: { id: "other", petId: "pet-other", videoId: "video-pixel", state: "MATCH", accepted: true } }));
  assert.equal(crossPet.status, "MISMATCH");
  assert.equal(crossPet.reasonCode, "TARGET_DESCRIPTOR_PET_BINDING_INVALID");
  assert.deepEqual(crossPet.writes, { observation: 0, trend: 0, timeline: 0, baseline: 0, dataset: 0 });
});

test("G3-C LOW_CONFIDENCE requires a session-bound owner confirmation", async () => {
  const descriptor = targetDescriptor({ signature: { meanColor: { r: 180, g: 180, b: 180 }, aspectRatio: 1.666667, areaRatio: 0.3125 } });
  const request = localPoseRequest({ targetDescriptor: descriptor });
  const blocked = await runtime().analyze(request);
  assert.equal(blocked.status, "LOW_CONFIDENCE");
  assert.equal(blocked.envelope, null);
  request.targetConfirmation = { accepted: true, petId: request.petId, videoId: request.videoId, analysisRunId: request.analysisRunId };
  const accepted = await runtime().analyze(request);
  assert.ok(accepted.envelope);
});

test("G3-C rejects non-monotonic decoded timestamps", async () => {
  const file = localVideoFile({ authorizedPixelFrames: [pixelFrame({ timestampMs: 100 }), pixelFrame({ timestampMs: 50 })] });
  await assert.rejects(() => runtime().analyze(localPoseRequest({ localVideoFile: file })), /INVALID_TIMESTAMP_ORDER/);
});

test("G3-C same pixel video is equivalent across ten complete runs", async () => {
  const report = await runPoseRepeatability({ runtime: runtime(), request: localPoseRequest(), runs: 10 });
  assert.equal(report.acceptedRuns, 10);
  assert.equal(report.equivalentSkeleton, true);
  assert.equal(report.equivalentGeometry, true);
  assert.equal(report.equivalentMotion, true);
});

test("G3-C estimates camera-motion risk from pixels and suppresses animal displacement", async () => {
  const changedBackground = pixelFrame({ timestampMs: 100 });
  for (let offset = 0; offset < changedBackground.rgba.length; offset += 4) {
    if (changedBackground.rgba[offset] === 245 && changedBackground.rgba[offset + 1] === 245 && changedBackground.rgba[offset + 2] === 245) {
      changedBackground.rgba[offset] = 90;
      changedBackground.rgba[offset + 1] = 90;
      changedBackground.rgba[offset + 2] = 90;
    }
  }
  const file = localVideoFile({ authorizedPixelFrames: [pixelFrame({ timestampMs: 0 }), changedBackground, pixelFrame({ timestampMs: 200 })] });
  const result = await runtime().analyze(localPoseRequest({ localVideoFile: file }));
  assert.ok(result.envelope.temporalMotion.cameraMotionRisk >= 0.5);
  assert.equal(result.envelope.temporalMotion.frameToFrameDisplacement.BODY_CENTER.availability, "UNKNOWN");
  assert.equal(result.envelope.temporalMotion.frameToFrameDisplacement.BODY_CENTER.reasonCode, "CAMERA_MOTION_RISK");
});

test("G3-C manual annotations produce normalized, body-relative and left/right evidence", async () => {
  const result = await runtime().analyze(localPoseRequest());
  const skeleton = result.envelope.skeletonFrames[0];
  const landmarks = Object.fromEntries(["HEAD", "NOSE", "NECK", "LEFT_SHOULDER", "RIGHT_SHOULDER"].map((key) => [key, { x: skeleton.landmarks[key].x, y: skeleton.landmarks[key].y }]));
  const annotations = createManualAnnotationSet({ annotationSetId: "annotation-1", videoId: result.envelope.videoId, petId: result.envelope.petId, species: "DOG", sourceClass: "SYNTHETIC", frames: [{ frameIndex: 0, timestampMs: 0, bodyLength: 0.625, landmarks }] });
  const report = createLandmarkErrorReport({ annotationSet: annotations, envelope: result.envelope });
  assert.equal(report.groups.HEAD.meanNormalizedLandmarkError, 0);
  assert.equal(report.groups.HEAD.meanBodyRelativeLandmarkError, 0);
  assert.equal(report.leftRightAgreement.value, 1);
  assert.equal(report.groups.HEAD.promotionEligible, false);
});

test("G3-C real-device harness requires authorization and stores no raw media", async () => {
  await assert.rejects(() => runRealDevicePoseHarness({ cases: [{ caseId: "case-1", sourceClass: "GUARDIAN_HQ_AUTHORIZED_TEST", request: localPoseRequest() }], runtime: runtime() }), /REAL_DEVICE_AUTHORIZATION_REQUIRED/);
  const report = await runRealDevicePoseHarness({ cases: [{ caseId: "case-1", sourceClass: "GUARDIAN_HQ_AUTHORIZED_TEST", authorizationRef: "hq-local-1", request: localPoseRequest() }], runtime: runtime() });
  assert.equal(report.caseCount, 1);
  assert.equal(report.rawMediaStored, false);
  assert.equal(report.cloudUsed, false);
});

test("G3-C dog and cat use the same decoder and local estimator", async () => {
  const dog = await runtime().analyze(localPoseRequest());
  const catRequest = localPoseRequest({ petId: "pet-cat-pixel", videoId: "cat-pixel", species: "CAT" });
  catRequest.identityReceipt = { id: "identity-cat-pixel", petId: catRequest.petId, videoId: catRequest.videoId, state: "MATCH", accepted: true };
  const cat = await runtime().analyze(catRequest);
  assert.equal(dog.source.estimatorVersion, cat.source.estimatorVersion);
  assert.deepEqual(Object.keys(dog.envelope.skeletonFrames[0].landmarks), Object.keys(cat.envelope.skeletonFrames[0].landmarks));
});

test("G3-C provider-neutral estimator exposes technical identity and confidence only", () => {
  const estimator = createLocalPixelPoseEstimator();
  const estimate = estimator.estimateFrame(pixelFrame(), targetDescriptor());
  assert.equal(estimator.provider, "GUARDIAN_LOCAL_DETERMINISTIC");
  assert.equal(estimate.status, "MATCH");
  assert.equal("diagnosis" in estimate, false);
  assert.ok(estimate.identityConfidence >= 0 && estimate.identityConfidence <= 1);
});

test("G3-C derived Motion Signature enters G2-C without storing raw pixels", async () => {
  const result = await runtime().analyze(localPoseRequest());
  const petId = result.envelope.petId;
  const gbeVideo = precisionVideo("g3c-gbe", { petId, identityEvidence: { detectedPetIds: [petId], confidence: 0.99 }, technicalFrames: precisionVideo("g3c-source").technicalFrames.map((frame) => ({ ...frame, trackedPetId: petId })) });
  const featureVector = (await createDeterministicFeatureExtractor().extract({ analysisRunId: "g3c-feature", petId, video: gbeVideo, purpose: "VALIDATION" })).vector;
  const record = createDatasetRecordFromMotionEnvelope({
    envelope: result.envelope, recordingId: "g3c-recording", repeatGroupId: "g3c-repeat", repeatIndex: 1, behavior: "MIXED_ACTIVITY", sourceClass: "SYNTHETIC",
    captureCondition: { deviceType: "UNKNOWN_FUTURE", lighting: "BRIGHT_INDOOR", camera: "STATIC", distance: "MEDIUM", view: "SIDE", visibility: "FULL_BODY", length: "NORMAL" },
    featureVector, quality: { result: "PARTIALLY_USABLE", policyVersion: "gbe-g2a-quality-v1", reasonCodes: ["UNVALIDATED_PIXEL_POSE"] }
  });
  const dataset = buildMotionDataset({ datasetId: "g3c-dataset", purpose: MOTION_DATASET_PURPOSE, records: [record] });
  assert.equal(dataset.records[0].skeleton.availability, "OBSERVED");
  assert.equal("rgba" in dataset.records[0], false);
  assert.equal("localVideoFile" in dataset.records[0], false);
});
