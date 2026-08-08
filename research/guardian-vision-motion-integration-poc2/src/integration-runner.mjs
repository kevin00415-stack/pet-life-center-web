import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { createLearnedPoseAdapter } from "./learned-pose-adapter.mjs";

const args = parseArgs(process.argv.slice(2));
const frozenRoot = required(args, "frozen-root");
const poc1Root = required(args, "poc1-root");
const outputRoot = required(args, "output");

const motionModule = await importFrozen("src/features/guardian-motion/motion-runtime.js");
const contractsModule = await importFrozen("src/features/guardian-motion/contracts.js");
const datasetModule = await importFrozen("src/features/guardian-baseline/motion-dataset.js");
const featureModule = await importFrozen("src/features/guardian-baseline/feature-extractor.js");

const adapter = createLearnedPoseAdapter();
const runtime = motionModule.createGuardianMotionRuntime({
  frameAdapter: adapter.frameAdapter,
  estimator: adapter.estimator
});

const sittingPrediction = await json(path.join(poc1Root, "results/poc11/same-dog/sitting/predictions.json"));
const standingPrediction = await json(path.join(poc1Root, "results/poc11/same-dog/standing/predictions.json"));
const stabilityPrediction = await json(path.join(poc1Root, "results/poc11/stability/predictions.json"));

const sequences = {
  sitting: repeatStaticFrame(sittingPrediction.frames[0], 3),
  standing: repeatStaticFrame(standingPrediction.frames[0], 3),
  walking: stabilityPrediction.frames.filter((frame) => frame.detections?.some((item) => item.class_name === "dog")).slice(0, 5)
};

const results = {};
for (const [pose, frames] of Object.entries(sequences)) {
  const adapted = adapter.adaptPredictionSequence({
    frames,
    className: "dog",
    timestampsMs: frames.map((_, index) => index * 200)
  });
  const request = requestFor(pose, adapted.technicalFrames);
  const runs = [];
  for (let index = 0; index < 5; index += 1) {
    const start = performance.now();
    const result = await runtime.analyze(structuredClone(request));
    runs.push({ elapsedMs: performance.now() - start, result });
  }
  const digests = runs.map((run) => run.result.envelope?.motionDigest ?? null);
  const first = runs[0].result;
  const experimentalMotionEnvelope = buildExperimentalMotionEnvelope(pose, first.envelope, adapted.evidenceFrames);
  const experimentalDigests = runs.map((run) => buildExperimentalMotionEnvelope(pose, run.result.envelope, adapted.evidenceFrames).motionDigest);
  results[pose] = {
    status: first.status,
    reasonCode: first.reasonCode,
    digestRepeatability: {
      runs: 5,
      digests,
      experimentalDigests,
      repeatable: new Set(digests).size === 1 && digests[0] !== null
        && new Set(experimentalDigests).size === 1
    },
    runtimeMs: summarizeNumbers(runs.map((run) => run.elapsedMs)),
    learnedInferenceMs: inferenceTimingFor(pose, sittingPrediction, standingPrediction, stabilityPrediction),
    experimentalMotionEnvelope,
    summary: summarizeEnvelope(first.envelope)
  };
}

const directVideo = args["video-predictions"]
  ? await integrateDirectVideo(await json(path.resolve(args["video-predictions"])), Number(args["video-fps"] ?? 0))
  : null;

const records = Object.entries(results).map(([pose, item]) => {
  const envelope = item.experimentalMotionEnvelope.guardianMotionEnvelope;
  return datasetModule.createDatasetRecordFromMotionEnvelope({
    envelope,
    recordingId: `poc2-nora-${pose}`,
    repeatGroupId: `poc2-nora-${pose}`,
    repeatIndex: 1,
    behavior: pose === "walking" ? "WALKING_MOVING" : "REST",
    sourceClass: "GUARDIAN_HQ_AUTHORIZED_TEST",
    captureCondition: {
      deviceType: "PUBLIC_RESEARCH_MEDIA",
      lighting: "OUTDOOR_VARIABLE",
      camera: pose === "walking" ? "MOVING_OR_UNKNOWN" : "STATIC_STILL",
      distance: "VARIABLE",
      view: "VARIABLE",
      visibility: "PARTIAL_OR_FULL_BODY",
      length: pose === "walking" ? "SHORT_SEQUENCE" : "STATIC_FRAME_SEQUENCE"
    },
    featureVector: unknownFeatureVector(featureModule.G2A_FEATURE_KEYS, pose, envelope.petId),
    quality: {
      result: "PARTIALLY_USABLE",
      policyVersion: "guardian-learned-poc2-quality-v1",
      reasonCodes: item.experimentalMotionEnvelope.reasonCodes
    }
  });
});

if (directVideo?.guardianMotionEnvelope) {
  const envelope = directVideo.guardianMotionEnvelope;
  records.push(datasetModule.createDatasetRecordFromMotionEnvelope({
    envelope,
    recordingId: "poc2-nora-walking-video",
    repeatGroupId: "poc2-nora-walking-video",
    repeatIndex: 1,
    behavior: "WALKING_MOVING",
    sourceClass: "GUARDIAN_HQ_AUTHORIZED_TEST",
    captureCondition: {
      deviceType: "PUBLIC_RESEARCH_MEDIA", lighting: "OUTDOOR_VARIABLE",
      camera: "MOVING_OR_UNKNOWN", distance: "VARIABLE", view: "VARIABLE",
      visibility: "PARTIAL_OR_FULL_BODY", length: "SPARSE_LOCAL_VIDEO_SEQUENCE"
    },
    featureVector: unknownFeatureVector(featureModule.G2A_FEATURE_KEYS, "walking-video", envelope.petId),
    quality: {
      result: "PARTIALLY_USABLE",
      policyVersion: "guardian-learned-poc2-quality-v1",
      reasonCodes: ["CAMERA_MOTION_RISK", "SPARSE_VIDEO_SAMPLING", "GEOMETRY_EVIDENCE_GAP"]
    }
  }));
}

const dataset = datasetModule.buildMotionDataset({
  datasetId: "guardian-learned-motion-poc2",
  purpose: datasetModule.MOTION_DATASET_PURPOSE,
  authorizationRef: "guardian-hq-vision-poc2-approved",
  records
});

assertNoForbiddenDatasetPayload(dataset);
const output = {
  schemaVersion: "guardian-vision-motion-integration-poc2/v1",
  provenance: adapter.identity,
  frozenRuntime: {
    rootRole: "READ_ONLY_G3C_PRESERVATION_WORKTREE",
    commit: args["frozen-commit"] ?? null
  },
  results,
  directVideo,
  comparison: comparePoses(results),
  g2c: {
    ingestion: "PASS",
    recordCount: dataset.records.length,
    datasetChecksum: dataset.datasetChecksum,
    containsRawPixels: false,
    containsVideoFrames: false,
    containsMedicalOutput: false,
    dataset
  }
};

await mkdir(outputRoot, { recursive: true });
await writeFile(path.join(outputRoot, "poc2-integration-results.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({
  statuses: Object.fromEntries(Object.entries(results).map(([pose, item]) => [pose, item.status])),
  repeatable: Object.fromEntries(Object.entries(results).map(([pose, item]) => [pose, item.digestRepeatability.repeatable])),
  datasetChecksum: dataset.datasetChecksum,
  comparison: output.comparison
}, null, 2)}\n`);

async function importFrozen(relativePath) {
  return import(pathToFileURL(path.join(frozenRoot, relativePath)).href);
}

async function integrateDirectVideo(prediction, fps) {
  if (!Number.isFinite(fps) || fps <= 0) throw new Error("VIDEO_FPS_REQUIRED");
  const rejectedFrames = [];
  const acceptedFrames = [];
  for (const frame of prediction.frames ?? []) {
    const dogs = (frame.detections ?? []).filter((item) => item.class_name === "dog");
    if (dogs.length === 1) acceptedFrames.push(frame);
    else rejectedFrames.push({
      frameIndex: frame.frame_index,
      timestampMs: frame.frame_index / fps * 1000,
      reasonCode: dogs.length ? "MULTIPLE_ANIMALS_TARGET_SELECTION_REQUIRED" : "DETECTOR_MISS"
    });
  }
  if (!acceptedFrames.length) return { status: "REJECTED", reasonCode: "NO_ACCEPTED_VIDEO_FRAMES", rejectedFrames };
  const adapted = adapter.adaptPredictionSequence({
    frames: acceptedFrames,
    className: "dog",
    timestampsMs: acceptedFrames.map((frame) => frame.frame_index / fps * 1000)
  });
  const request = requestFor("walking-video", adapted.technicalFrames);
  const runs = [];
  for (let index = 0; index < 5; index += 1) runs.push(await runtime.analyze(structuredClone(request)));
  const digests = runs.map((item) => item.envelope?.motionDigest ?? null);
  const experimentalMotionEnvelope = buildExperimentalMotionEnvelope("walking-video", runs[0].envelope, adapted.evidenceFrames);
  const experimentalDigests = runs.map((item) => buildExperimentalMotionEnvelope("walking-video", item.envelope, adapted.evidenceFrames).motionDigest);
  return {
    status: runs[0].status,
    sourceFrameCount: prediction.frames.length,
    acceptedFrameCount: acceptedFrames.length,
    rejectedFrameCount: rejectedFrames.length,
    rejectedFrames,
    fps,
    inferenceSummary: prediction.summary,
    digestRepeatability: {
      runs: 5, digests, experimentalDigests,
      repeatable: new Set(digests).size === 1 && digests[0] !== null
        && new Set(experimentalDigests).size === 1
    },
    summary: summarizeEnvelope(runs[0].envelope),
    experimentalMotionEnvelope,
    guardianMotionEnvelope: runs[0].envelope
  };
}

function buildExperimentalMotionEnvelope(pose, guardianMotionEnvelope, learnedFrameEvidence) {
  const payload = {
    contractVersion: "guardian-learned-motion-envelope-v1",
    pose,
    providerIdentity: adapter.identity.providerIdentity,
    detectorIdentity: adapter.identity.detectorIdentity,
    poseModelIdentity: adapter.identity.poseModelIdentity,
    adapterVersion: adapter.identity.adapterVersion,
    confidenceSemantics: adapter.identity.confidenceSemantics,
    confidenceTransform: adapter.identity.confidenceTransform,
    frozenRuntimeCommit: args["frozen-commit"] ?? null,
    schemaVersions: {
      guardianMotionContract: guardianMotionEnvelope?.contractVersion ?? null,
      skeleton: guardianMotionEnvelope?.skeletonSchemaVersion ?? null,
      geometry: guardianMotionEnvelope?.geometryPolicyVersion ?? null,
      temporal: guardianMotionEnvelope?.temporalPolicyVersion ?? null,
      canonicalization: guardianMotionEnvelope?.canonicalizationVersion ?? null
    },
    landmarkEvidenceStates: summarizeUnknowns(guardianMotionEnvelope),
    geometryAvailability: guardianMotionEnvelope?.geometryFrames.map((frame) => ({
      frameIndex: frame.frameIndex,
      observedKeys: observedGeometryKeys(frame)
    })) ?? [],
    temporalAvailability: guardianMotionEnvelope?.temporalMotion.status ?? "UNKNOWN",
    reasonCodes: collectReasonCodes(guardianMotionEnvelope),
    unknownPropagation: summarizeUnknowns(guardianMotionEnvelope),
    learnedFrameEvidence,
    guardianMotionEnvelope
  };
  return Object.freeze({ ...payload, motionDigest: contractsModule.deterministicChecksum(payload) });
}

function requestFor(pose, technicalFrames) {
  const petId = "nora-poc2-dog";
  const videoId = `nora-${pose}-poc2`;
  return {
    analysisRunId: `nora-${pose}-analysis`, petId, videoId, species: "DOG",
    identityReceipt: { id: `nora-${pose}-identity`, petId, videoId, state: "MATCH", accepted: true },
    technicalFrames
  };
}

function repeatStaticFrame(frame, count) {
  return Array.from({ length: count }, (_, index) => ({ ...structuredClone(frame), frame_index: index }));
}

function unknownFeatureVector(keys, pose, petId) {
  return {
    id: `poc2-feature-${pose}`,
    petId,
    schemaVersion: "gbe-g2a-features-v1",
    extractorVersion: "guardian-learned-poc2-unknown-feature-boundary-v1",
    features: Object.fromEntries(keys.map((key) => [key, {
      availability: "UNKNOWN", value: null, unit: null, confidence: 0,
      reasonCode: "G2A_FEATURE_NOT_DERIVED_FROM_LEARNED_ENVELOPE",
      opportunityDuration: 0, evidenceCoverage: 0
    }]))
  };
}

function collectReasonCodes(envelope) {
  if (!envelope) return ["MOTION_ENVELOPE_UNAVAILABLE"];
  const codes = new Set();
  walk(envelope, (key, value) => {
    if (key === "reasonCode" && typeof value === "string") codes.add(value);
  });
  const missingJoint = envelope.geometryFrames.some((frame) => Object.values(frame.jointAngles).some((item) => item.availability === "UNKNOWN"));
  if (missingJoint) codes.add("GEOMETRY_EVIDENCE_GAP");
  return [...codes].sort();
}

function summarizeUnknowns(envelope) {
  if (!envelope) return null;
  return envelope.skeletonFrames.map((frame) => ({
    frameIndex: frame.frameIndex,
    states: countBy(Object.values(frame.landmarks), (item) => item.state),
    unknownReasons: countBy(Object.values(frame.landmarks).filter((item) => item.state === "UNKNOWN"), (item) => item.reasonCode)
  }));
}

function summarizeEnvelope(envelope) {
  if (!envelope) return null;
  const geometry = envelope.geometryFrames.map((frame) => ({
    frameIndex: frame.frameIndex,
    observed: observedGeometryKeys(frame),
    jointAngles: Object.fromEntries(Object.entries(frame.jointAngles).map(([key, item]) => [key, item.availability]))
  }));
  const displacement = Object.values(envelope.temporalMotion.frameToFrameDisplacement ?? {}).filter((item) => item.availability === "OBSERVED");
  return {
    frameCount: envelope.skeletonFrames.length,
    skeletonStates: envelope.skeletonFrames.map((frame) => countBy(Object.values(frame.landmarks), (item) => item.state)),
    geometry,
    temporalStatus: envelope.temporalMotion.status,
    observedDisplacementCount: displacement.length,
    medianObservedDisplacement: displacement.length ? median(displacement.map((item) => item.value)) : null,
    bodyAxisContinuity: envelope.temporalMotion.bodyAxisContinuity,
    cameraMotionRisk: envelope.temporalMotion.cameraMotionRisk,
    motionDigest: envelope.motionDigest
  };
}

function observedGeometryKeys(frame) {
  const flat = {
    ...frame.jointAngles, ...frame.limbExtension,
    bodyAxis: frame.bodyAxis, spineAxis: frame.spineAxis,
    headToBodyAngle: frame.headToBodyAngle, tailBaseAngle: frame.tailBaseAngle,
    tailCurvatureProxy: frame.tailCurvatureProxy, bodyCenter: frame.bodyCenter,
    bodyHeightLengthRatio: frame.bodyHeightLengthRatio,
    leftRightPoseSymmetryProxy: frame.leftRightPoseSymmetryProxy
  };
  return Object.entries(flat).filter(([, item]) => item.availability === "OBSERVED").map(([key]) => key).sort();
}

function comparePoses(all) {
  const summary = Object.fromEntries(Object.entries(all).map(([pose, item]) => [pose, {
    observedDisplacementCount: item.summary.observedDisplacementCount,
    medianObservedDisplacement: item.summary.medianObservedDisplacement,
    bodyAxisChange: item.summary.bodyAxisContinuity.availability === "OBSERVED" ? item.summary.bodyAxisContinuity.value : null,
    cameraMotionRisk: item.summary.cameraMotionRisk
  }]));
  const walking = summary.walking;
  const staticMedian = median([summary.sitting.medianObservedDisplacement ?? 0, summary.standing.medianObservedDisplacement ?? 0]);
  return {
    poses: summary,
    walkingDistinctFromStatic: walking.medianObservedDisplacement !== null && walking.medianObservedDisplacement > staticMedian,
    caveat: "BBOX_MOTION_PROXY_IS_NOT_CALIBRATED_CAMERA_MOTION; STATIC_POSES_ARE_REPEATED_STILL EVIDENCE"
  };
}

function inferenceTimingFor(pose, sitting, standing, stability) {
  if (pose === "sitting") return sitting.frames[0].timing;
  if (pose === "standing") return standing.frames[0].timing;
  const dogFrames = stability.frames.filter((frame) => frame.detections?.some((item) => item.class_name === "dog")).slice(0, 5);
  return {
    frameCount: dogFrames.length,
    detectorMsTotal: sum(dogFrames.map((frame) => frame.timing.detector_ms)),
    poseMsTotal: sum(dogFrames.map((frame) => frame.timing.pose_ms_total)),
    totalMs: sum(dogFrames.map((frame) => frame.timing.total_ms))
  };
}

function assertNoForbiddenDatasetPayload(dataset) {
  const text = JSON.stringify(dataset).toLowerCase();
  for (const key of ["rawpixels", "rawmedia", "videoframes", "diagnosis", "disease", "healthscore", "medicalinterpretation"]) {
    if (text.includes(`\"${key}\"`)) throw new Error(`FORBIDDEN_G2C_PAYLOAD:${key}`);
  }
}

function summarizeNumbers(values) {
  return { minimum: Math.min(...values), median: median(values), maximum: Math.max(...values), mean: sum(values) / values.length };
}
function countBy(items, selector) { const out = {}; for (const item of items) { const key = selector(item) ?? "null"; out[key] = (out[key] ?? 0) + 1; } return out; }
function walk(value, visitor) { if (!value || typeof value !== "object") return; for (const [key, child] of Object.entries(value)) { visitor(key, child); walk(child, visitor); } }
function median(values) { const sorted = [...values].sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2; }
function sum(values) { return values.reduce((total, value) => total + value, 0); }
async function json(file) { return JSON.parse(await readFile(file, "utf8")); }
function required(object, key) { if (!object[key]) throw new Error(`ARGUMENT_REQUIRED:${key}`); return path.resolve(object[key]); }
function parseArgs(argv) { const out = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index]?.replace(/^--/, ""); if (!key || argv[index + 1] === undefined) throw new Error("ARGUMENTS_INVALID"); out[key] = argv[index + 1]; } return out; }
