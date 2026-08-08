import { LANDMARK_KEYS } from "../../src/features/guardian-motion/contracts.js";

export const SKELETON_PET_ID = "pet-skeleton";

const POSITIONS = Object.freeze({
  HEAD: [0.75, 0.5], NOSE: [0.82, 0.5], NECK: [0.68, 0.5],
  LEFT_SHOULDER: [0.62, 0.44], RIGHT_SHOULDER: [0.62, 0.56],
  SPINE_FRONT: [0.6, 0.5], SPINE_MID: [0.47, 0.5], SPINE_REAR: [0.34, 0.5],
  LEFT_HIP: [0.3, 0.44], RIGHT_HIP: [0.3, 0.56],
  LEFT_FRONT_ELBOW: [0.58, 0.62], RIGHT_FRONT_ELBOW: [0.58, 0.38],
  LEFT_FRONT_WRIST: [0.55, 0.74], RIGHT_FRONT_WRIST: [0.55, 0.26],
  LEFT_FRONT_PAW: [0.61, 0.81], RIGHT_FRONT_PAW: [0.61, 0.19],
  LEFT_REAR_KNEE: [0.27, 0.62], RIGHT_REAR_KNEE: [0.27, 0.38],
  LEFT_REAR_ANKLE: [0.24, 0.74], RIGHT_REAR_ANKLE: [0.24, 0.26],
  LEFT_REAR_PAW: [0.3, 0.81], RIGHT_REAR_PAW: [0.3, 0.19],
  TAIL_BASE: [0.23, 0.5], TAIL_MID: [0.15, 0.47], TAIL_TIP: [0.08, 0.45], BODY_CENTER: [0.46, 0.5]
});

export function skeletonFrame(index, overrides = {}) {
  const { mirror = false, offsetX = 0, landmarkOverrides = {}, sideStatus = "RESOLVED", sideToken = "anatomical-map-1", ...frameOverrides } = overrides;
  const landmarks = Object.fromEntries(LANDMARK_KEYS.map((key) => {
    const [baseX, y] = POSITIONS[key];
    const x = (mirror ? 1 - baseX : baseX) + offsetX;
    return [key, { state: "OBSERVED", x, y, confidence: 0.95, visibility: 0.95, occlusion: 0, ...landmarkOverrides[key] }];
  }));
  return {
    durationMs: 100,
    timestampMs: index * 100,
    trackingConfidence: 0.96,
    trackingContinuity: 0.98,
    cameraMotionRisk: 0.02,
    skeletonCandidates: {
      landmarks,
      measurements: {
        bodyBoundingBox: { availability: "OBSERVED", x: 0.05, y: 0.15, width: 0.8, height: 0.7, confidence: 0.95 },
        bodyLength: { availability: "OBSERVED", value: 0.6, confidence: 0.95 },
        bodyHeight: { availability: "OBSERVED", value: 0.3, confidence: 0.95 }
      },
      anatomicalSideEvidence: { status: sideStatus, confidence: sideStatus === "RESOLVED" ? 0.95 : 0.2, identityToken: sideStatus === "RESOLVED" ? sideToken : null }
    },
    ...frameOverrides
  };
}

export function motionRequest(overrides = {}) {
  const videoId = overrides.videoId ?? "skeleton-video";
  const petId = overrides.petId ?? SKELETON_PET_ID;
  return {
    analysisRunId: "skeleton-analysis",
    petId,
    videoId,
    species: "DOG",
    identityReceipt: { id: "identity-skeleton", petId, videoId, state: "MATCH", accepted: true },
    technicalFrames: [skeletonFrame(0), skeletonFrame(1, { offsetX: 0.005 }), skeletonFrame(2, { offsetX: 0.01 })],
    ...overrides
  };
}
