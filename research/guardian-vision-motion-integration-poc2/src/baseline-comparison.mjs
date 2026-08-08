import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const args = parseArgs(process.argv.slice(2));
const frozenRoot = path.resolve(required("frozen-root"));
const rgbaPayload = JSON.parse(await readFile(path.resolve(required("rgba-frames")), "utf8"));
const learned = JSON.parse(await readFile(path.resolve(required("learned-results")), "utf8"));
const outputFile = path.resolve(required("output"));

const pixelModule = await importFrozen("src/features/guardian-motion/pixel-pose-estimator.js");
const motionModule = await importFrozen("src/features/guardian-motion/motion-runtime.js");
const adapterModule = await importFrozen("src/features/guardian-motion/estimator-adapter.js");

const estimator = pixelModule.createLocalPixelPoseEstimator();
const frames = rgbaPayload.frames.map((frame) => ({
  ...frame,
  rgba: new Uint8ClampedArray(frame.rgba)
}));

const enrollment = estimator.estimateFrame(frames[0], null);
let baseline;
if (!enrollment.signature) {
  baseline = {
    status: enrollment.status,
    reasonCode: enrollment.reasonCode,
    envelope: null,
    perFrame: frames.map((frame) => {
      const result = estimator.estimateFrame(frame, null);
      return { frameIndex: frame.frameIndex, status: result.status, reasonCode: result.reasonCode, hasSignature: Boolean(result.signature) };
    })
  };
} else {
  const descriptor = {
    descriptorVersion: "guardian-local-target-descriptor-v1",
    petId: "nora-poc2-dog",
    signature: enrollment.signature,
    heading: "RIGHT",
    anatomicalSide: { status: "AMBIGUOUS", confidence: 0, identityToken: null }
  };
  const technicalFrames = [];
  const perFrame = [];
  let previousTracking = null;
  for (const frame of frames) {
    const result = estimator.estimateFrame(frame, descriptor, previousTracking);
    perFrame.push({
      frameIndex: frame.frameIndex,
      status: result.status,
      reasonCode: result.reasonCode,
      identityConfidence: result.identityConfidence,
      trackingContinuity: result.trackingContinuity,
      signature: result.signature
    });
    if (["MULTIPLE_PETS", "UNKNOWN", "MISMATCH"].includes(result.status)) break;
    technicalFrames.push({
      timestampMs: frame.timestampMs,
      durationMs: frame.durationMs,
      trackingConfidence: result.identityConfidence,
      trackingContinuity: result.trackingContinuity,
      cameraMotionRisk: 0,
      skeletonCandidates: result.skeletonCandidate
    });
    previousTracking = { signature: result.signature };
  }
  if (technicalFrames.length !== frames.length) {
    const failed = perFrame.at(-1);
    baseline = { status: failed.status, reasonCode: failed.reasonCode, envelope: null, perFrame };
  } else {
    const videoId = "nora-walking-poc2";
    const motionRuntime = motionModule.createGuardianMotionRuntime({
      estimator: adapterModule.createTechnicalFrameSkeletonEstimator({ artifactVersion: estimator.artifactVersion })
    });
    const result = await motionRuntime.analyze({
      analysisRunId: "nora-g3c-baseline-analysis",
      petId: "nora-poc2-dog",
      videoId,
      species: "DOG",
      identityReceipt: { id: "nora-g3c-baseline-identity", petId: "nora-poc2-dog", videoId, state: "MATCH", accepted: true },
      technicalFrames
    });
    baseline = { ...result, perFrame };
  }
}

const learnedEnvelope = learned.directVideo?.guardianMotionEnvelope ?? null;
const comparison = {
  schemaVersion: "guardian-g3c-vs-learned-comparison-v1",
  sourceFrameIndices: rgbaPayload.sourceFrameIndices,
  sameSourceFrames: true,
  samePixelResolution: false,
  g3c: summarizeBaseline(baseline),
  learned: summarizeLearned(learnedEnvelope, learned.directVideo),
  interpretation: {
    learnedAddsPoseResponsiveEvidence: Boolean(learnedEnvelope),
    g3cRejectedSameFrames: baseline.envelope === null,
    falseCertaintyRisk: baseline.envelope
      ? "G3C_NON_CENTER_LANDMARKS_REMAIN_ESTIMATED_UNVALIDATED"
      : "G3C_REJECTION_PREVENTED_FALSE_LANDMARK_CERTAINTY",
    caveats: [
      "G3C comparison uses OpenCV-decoded 96px RGBA frames, not the browser decoder.",
      "Learned inference used the original 480p frames; G3C silhouette used downsampled copies of the same frame indices.",
      "Sparse frames are 25 seconds apart and do not represent gait-cycle sampling.",
      "Learned direct-video displacement is suppressed when bbox camera-motion proxy exceeds the frozen threshold."
    ]
  }
};

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(comparison, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(comparison, null, 2)}\n`);

function summarizeBaseline(result) {
  if (!result.envelope) return {
    status: result.status,
    reasonCode: result.reasonCode,
    observedLandmarks: 0,
    estimatedLandmarks: 0,
    unknownLandmarks: 26,
    geometryAvailability: "NO_ENVELOPE",
    temporalAvailability: "NO_ENVELOPE",
    perFrame: result.perFrame
  };
  return summarizeEnvelope(result.envelope, result.status, result.perFrame);
}

function summarizeLearned(envelope, directVideo) {
  if (!envelope) return { status: "NO_ENVELOPE" };
  return {
    ...summarizeEnvelope(envelope, directVideo.status, directVideo.rejectedFrames),
    sourceFrameCount: directVideo.sourceFrameCount,
    acceptedFrameCount: directVideo.acceptedFrameCount,
    rejectedFrameCount: directVideo.rejectedFrameCount,
    inferenceSummary: directVideo.inferenceSummary
  };
}

function summarizeEnvelope(envelope, status, details) {
  const stateCounts = envelope.skeletonFrames.map((frame) => countBy(Object.values(frame.landmarks), (item) => item.state));
  const geometryObserved = envelope.geometryFrames.map((frame) => countObservedGeometry(frame));
  const temporalObserved = Object.values(envelope.temporalMotion.frameToFrameDisplacement ?? {}).filter((item) => item.availability === "OBSERVED").length;
  return {
    status,
    observedLandmarks: sum(stateCounts.map((item) => item.OBSERVED ?? 0)),
    estimatedLandmarks: sum(stateCounts.map((item) => item.ESTIMATED ?? 0)),
    unknownLandmarks: sum(stateCounts.map((item) => (item.UNKNOWN ?? 0) + (item.OUT_OF_FRAME ?? 0) + (item.OCCLUDED ?? 0))),
    frameStateCounts: stateCounts,
    observedGeometryValues: geometryObserved,
    observedTemporalDisplacements: temporalObserved,
    cameraMotionRisk: envelope.temporalMotion.cameraMotionRisk,
    motionDigest: envelope.motionDigest,
    details
  };
}

function countObservedGeometry(frame) {
  const values = [
    ...Object.values(frame.jointAngles), ...Object.values(frame.limbExtension),
    frame.bodyAxis, frame.spineAxis, frame.headToBodyAngle, frame.tailBaseAngle,
    frame.tailCurvatureProxy, frame.bodyCenter, frame.bodyHeightLengthRatio,
    frame.leftRightPoseSymmetryProxy
  ];
  return values.filter((item) => item.availability === "OBSERVED").length;
}

function countBy(items, selector) { const out = {}; for (const item of items) { const key = selector(item); out[key] = (out[key] ?? 0) + 1; } return out; }
function sum(values) { return values.reduce((total, value) => total + value, 0); }
async function importFrozen(relativePath) { return import(pathToFileURL(path.join(frozenRoot, relativePath)).href); }
function required(key) { if (!args[key]) throw new Error(`ARGUMENT_REQUIRED:${key}`); return args[key]; }
function parseArgs(argv) { const out = {}; for (let index = 0; index < argv.length; index += 2) out[argv[index].replace(/^--/, "")] = argv[index + 1]; return out; }
