import { createGuardianMotionRuntime } from "./motion-runtime.js";
import { createLocalPixelPoseEstimator } from "./pixel-pose-estimator.js";
import { createTechnicalFrameSkeletonEstimator } from "./estimator-adapter.js";
import { createBrowserLocalVideoDecoder } from "./video-decoder.js";

export function createLocalVideoPoseRuntime({ decoder = createBrowserLocalVideoDecoder(), poseEstimator = createLocalPixelPoseEstimator(), motionRuntime = createGuardianMotionRuntime({ estimator: createTechnicalFrameSkeletonEstimator({ artifactVersion: poseEstimator.artifactVersion }) }), now = () => performance.now() } = {}) {
  return Object.freeze({
    runtimeVersion: "guardian-local-video-pose-runtime-v1",
    decoderVersion: decoder.decoderVersion,
    estimatorVersion: poseEstimator.artifactVersion,
    async analyze(request) {
      validateRequest(request);
      if (!acceptedPreflight(request)) return zeroWrite("UNKNOWN", "IDENTITY_BINDING_INVALID");
      if (request.targetDescriptor?.petId !== request.petId) return zeroWrite("MISMATCH", "TARGET_DESCRIPTOR_PET_BINDING_INVALID");
      const decodeStart = now();
      const decoded = await decoder.decode(request.localVideoFile);
      const decodeMs = now() - decodeStart;
      const technicalFrames = [];
      let previousTracking = null;
      let previousPixelFrame = null;
      let minimumIdentityConfidence = 1;
      const poseStart = now();
      for (const frame of decoded.frames) {
        const estimate = poseEstimator.estimateFrame(frame, request.targetDescriptor, previousTracking);
        if (["MULTIPLE_PETS", "UNKNOWN", "MISMATCH"].includes(estimate.status)) return zeroWrite(estimate.status, estimate.reasonCode, { decodeMs, poseMs: now() - poseStart });
        if (estimate.status === "LOW_CONFIDENCE" && !acceptedConfirmation(request, estimate)) return zeroWrite("LOW_CONFIDENCE", "OWNER_CONFIRMATION_REQUIRED", { decodeMs, poseMs: now() - poseStart });
        minimumIdentityConfidence = Math.min(minimumIdentityConfidence, estimate.identityConfidence);
        previousTracking = { signature: estimate.signature };
        technicalFrames.push({
          timestampMs: frame.timestampMs, durationMs: frame.durationMs, trackingConfidence: estimate.identityConfidence,
          trackingContinuity: estimate.trackingContinuity,
          cameraMotionRisk: Number.isFinite(frame.cameraMotionRisk) ? frame.cameraMotionRisk : estimateCameraMotion(previousPixelFrame, frame),
          skeletonCandidates: estimate.skeletonCandidate
        });
        previousPixelFrame = frame;
      }
      const poseMs = now() - poseStart;
      const motionStart = now();
      const motion = await motionRuntime.analyze({
        analysisRunId: request.analysisRunId, petId: request.petId, videoId: request.videoId, species: request.species,
        identityReceipt: request.identityReceipt, technicalFrames
      });
      const motionMs = now() - motionStart;
      return Object.freeze({
        status: motion.status, reasonCode: motion.reasonCode, envelope: motion.envelope,
        source: Object.freeze({ localOnly: true, format: decoded.sourceFormat, frameCount: decoded.frames.length, decoderVersion: decoded.decoderVersion, estimatorVersion: poseEstimator.artifactVersion }),
        identity: Object.freeze({ state: minimumIdentityConfidence >= 0.82 ? "MATCH" : "LOW_CONFIDENCE", confidence: minimumIdentityConfidence }),
        performance: Object.freeze({ decodeMs, poseMs, motionMs, totalMs: decodeMs + poseMs + motionMs })
      });
    }
  });
}

function validateRequest(request) {
  if (!request?.analysisRunId || !request.petId || !request.videoId || !["DOG", "CAT"].includes(request.species)) throw new Error("LOCAL_POSE_REQUEST_INVALID");
  if (!request.localVideoFile || request.technicalFrames) throw new Error("RAW_LOCAL_VIDEO_REQUIRED");
}

function acceptedPreflight(request) {
  const receipt = request.identityReceipt;
  return receipt?.accepted === true && receipt.petId === request.petId && receipt.videoId === request.videoId && ["MATCH", "LOW_CONFIDENCE"].includes(receipt.state);
}

function acceptedConfirmation(request, estimate) {
  const confirmation = request.targetConfirmation;
  return confirmation?.accepted === true && confirmation.petId === request.petId && confirmation.videoId === request.videoId && confirmation.analysisRunId === request.analysisRunId && estimate.identityConfidence >= 0.65;
}

function zeroWrite(status, reasonCode, performance = null) {
  return Object.freeze({ status, reasonCode, envelope: null, source: null, identity: Object.freeze({ state: status, confidence: 0 }), performance: performance ? Object.freeze(performance) : null, writes: Object.freeze({ observation: 0, trend: 0, timeline: 0, baseline: 0, dataset: 0 }) });
}

function estimateCameraMotion(previous, current) {
  if (!previous || previous.width !== current.width || previous.height !== current.height) return 0;
  let difference = 0, samples = 0;
  for (let y = 0; y < current.height; y += 1) for (let x = 0; x < current.width; x += 1) {
    if (x !== 0 && y !== 0 && x !== current.width - 1 && y !== current.height - 1) continue;
    const offset = (y * current.width + x) * 4;
    difference += Math.abs(current.rgba[offset] - previous.rgba[offset]);
    difference += Math.abs(current.rgba[offset + 1] - previous.rgba[offset + 1]);
    difference += Math.abs(current.rgba[offset + 2] - previous.rgba[offset + 2]);
    samples += 3;
  }
  return samples ? Math.min(1, difference / (samples * 255) * 3) : 0;
}
