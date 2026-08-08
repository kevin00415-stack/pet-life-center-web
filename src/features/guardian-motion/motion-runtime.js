import {
  CANONICALIZATION_VERSION, GEOMETRY_POLICY_VERSION, MOTION_CONTRACT_VERSION,
  SKELETON_SCHEMA_VERSION, TEMPORAL_POLICY_VERSION, deepFreeze, deterministicChecksum,
  observedValue, unknownValue
} from "./contracts.js";
import { createTechnicalFrameAdapter, createTechnicalFrameSkeletonEstimator } from "./estimator-adapter.js";
import { computeGeometryFrame } from "./geometry-runtime.js";
import { createSkeletonRuntime } from "./skeleton-runtime.js";
import { computeTemporalStability } from "./temporal-runtime.js";

export function createGuardianMotionRuntime({
  frameAdapter = createTechnicalFrameAdapter(),
  estimator = createTechnicalFrameSkeletonEstimator(),
  skeletonRuntime = createSkeletonRuntime()
} = {}) {
  return Object.freeze({
    runtimeVersion: "guardian-motion-runtime-v1",
    async analyze(request) {
      validateRequest(request);
      if (!acceptedIdentity(request.identityReceipt, request)) return Object.freeze({ status: "IDENTITY_ABORTED", reasonCode: "IDENTITY_BINDING_INVALID", envelope: null });
      const frames = frameAdapter.adapt({ technicalFrames: request.technicalFrames });
      if (!frames.length) return Object.freeze({ status: "INVALID_INPUT", reasonCode: "NO_LOCAL_FRAMES", envelope: null });
      const skeletonFrames = [];
      let previousSideToken = null;
      for (const frame of frames) {
        const estimate = await estimator.estimate(frame);
        const skeleton = skeletonRuntime.buildFrame({ frame, estimate, petId: request.petId, videoId: request.videoId, previousSideToken });
        if (skeleton.anatomicalSide.status === "RESOLVED") previousSideToken = skeleton.anatomicalSide.identityToken;
        skeletonFrames.push(skeleton);
      }
      const geometryFrames = skeletonFrames.map(computeGeometryFrame);
      const temporalMotion = computeTemporalStability(skeletonFrames, geometryFrames);
      const skeletonSignature = summarizeSkeleton(skeletonFrames);
      const geometrySignature = summarizeGeometry(geometryFrames);
      const hasGeometry = Object.values(geometrySignature).some((value) => value.availability === "OBSERVED");
      const payload = {
        contractVersion: MOTION_CONTRACT_VERSION, skeletonSchemaVersion: SKELETON_SCHEMA_VERSION,
        geometryPolicyVersion: GEOMETRY_POLICY_VERSION, temporalPolicyVersion: TEMPORAL_POLICY_VERSION,
        canonicalizationVersion: CANONICALIZATION_VERSION, estimatorVersion: estimator.artifactVersion,
        frameAdapterVersion: frameAdapter.adapterVersion, analysisRunId: request.analysisRunId, petId: request.petId,
        videoId: request.videoId, identityReceiptId: request.identityReceipt.id, speciesMetadata: request.species,
        status: hasGeometry ? "COMPLETE_OR_PARTIAL" : "INSUFFICIENT_GEOMETRY",
        skeletonFrames: Object.freeze(skeletonFrames), geometryFrames: Object.freeze(geometryFrames), temporalMotion,
        skeletonSignature: Object.freeze(skeletonSignature), geometrySignature: Object.freeze(geometrySignature),
        qualitySummary: Object.freeze({
          trackingConfidence: mean(skeletonFrames.map((frame) => frame.trackingConfidence)),
          skeletonConfidence: mean(skeletonFrames.map((frame) => frame.confidence.bodySkeleton)),
          anatomicalSideConfidence: mean(skeletonFrames.map((frame) => frame.confidence.anatomicalSide)),
          jointGeometryConfidence: mean(geometryFrames.map((frame) => frame.confidence)),
          temporalGeometryConfidence: temporalMotion.confidence,
          cameraMotionRisk: temporalMotion.cameraMotionRisk
        })
      };
      const envelope = deepFreeze({ ...payload, motionDigest: deterministicChecksum(payload) });
      return Object.freeze({ status: envelope.status, reasonCode: hasGeometry ? null : "INSUFFICIENT_GEOMETRY_COVERAGE", envelope });
    }
  });
}

function acceptedIdentity(receipt, request) {
  return receipt?.id && receipt.petId === request.petId && receipt.videoId === request.videoId
    && ["MATCH", "LOW_CONFIDENCE"].includes(receipt.state) && receipt.accepted === true;
}

function validateRequest(request) {
  if (!request?.analysisRunId || !request.petId || !request.videoId || !["DOG", "CAT"].includes(request.species)) throw new Error("MOTION_REQUEST_INVALID");
}

function summarizeSkeleton(frames) {
  const coverage = frames.length ? mean(frames.map((frame) => frame.visibility)) : 0;
  const sideCoverage = frames.length ? frames.filter((frame) => frame.anatomicalSide.status === "RESOLVED").length / frames.length : 0;
  return {
    skeletonCoverage: observedValue(coverage, "ratio", mean(frames.map((frame) => frame.confidence.bodySkeleton))),
    anatomicalSideCoverage: sideCoverage ? observedValue(sideCoverage, "ratio", mean(frames.map((frame) => frame.confidence.anatomicalSide))) : unknownValue("ANATOMICAL_SIDE_AMBIGUOUS", "ratio")
  };
}

function summarizeGeometry(frames) {
  const selectors = {
    leftFrontJointAngle: (frame) => frame.jointAngles.leftFrontShoulderElbowWristAngle,
    rightFrontJointAngle: (frame) => frame.jointAngles.rightFrontShoulderElbowWristAngle,
    leftRearJointAngle: (frame) => frame.jointAngles.leftRearHipKneeAnkleAngle,
    rightRearJointAngle: (frame) => frame.jointAngles.rightRearHipKneeAnkleAngle,
    bodyAxisAngle: (frame) => frame.bodyAxis.availability === "OBSERVED" ? observedValue(frame.bodyAxis.value.angle, "radian", frame.bodyAxis.confidence) : frame.bodyAxis,
    headToBodyAngle: (frame) => frame.headToBodyAngle,
    tailBaseAngle: (frame) => frame.tailBaseAngle,
    tailCurvatureProxy: (frame) => frame.tailCurvatureProxy,
    bodyHeightLengthRatio: (frame) => frame.bodyHeightLengthRatio,
    leftRightPoseSymmetryProxy: (frame) => frame.leftRightPoseSymmetryProxy
  };
  return Object.fromEntries(Object.entries(selectors).map(([key, selector]) => {
    const values = frames.map(selector).filter((value) => value.availability === "OBSERVED");
    return [key, values.length ? observedValue(median(values.map((value) => value.value)), values[0].unit, Math.min(...values.map((value) => value.confidence)), values.length / frames.length) : unknownValue("GEOMETRY_NOT_OBSERVED")];
  }));
}

function mean(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
function median(values) { const sorted = [...values].sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2; }
