import { LANDMARK_KEYS, clamp01, deepFreeze } from "./contracts.js";

const PIXEL_POSE_ARTIFACT_VERSION = "guardian-deterministic-silhouette-pose-v0";

export function createLocalPixelPoseEstimator({ foregroundThreshold = 55, minimumComponentRatio = 0.015 } = {}) {
  return Object.freeze({
    provider: "GUARDIAN_LOCAL_DETERMINISTIC",
    artifactVersion: PIXEL_POSE_ARTIFACT_VERSION,
    estimateFrame(frame, targetDescriptor, previousTracking = null) {
      const components = findForegroundComponents(frame, foregroundThreshold, minimumComponentRatio);
      if (!components.length) return rejected("UNKNOWN", "PET_NOT_DETECTED");
      if (components.length > 1 && components[1].area / components[0].area >= 0.35) return rejected("MULTIPLE_PETS", "MULTIPLE_PETS");
      const component = components[0];
      const signature = componentSignature(component, frame);
      const identity = verifyTarget(signature, targetDescriptor);
      if (["UNKNOWN", "MISMATCH"].includes(identity.state)) return rejected(identity.state, identity.reasonCode, signature);
      const trackingContinuity = previousTracking ? signatureSimilarity(signature, previousTracking.signature) : 1;
      if (previousTracking && trackingContinuity < 0.62) return rejected("MISMATCH", "IDENTITY_SWITCH_DETECTED", signature);
      const candidate = buildSkeletonCandidate(component, frame, targetDescriptor, identity.confidence);
      return deepFreeze({ status: identity.state, reasonCode: identity.reasonCode, identityConfidence: identity.confidence, trackingContinuity, signature, skeletonCandidate: candidate });
    }
  });
}

export function createAuthorizedTargetDescriptor({ frame, petId, ownerConfirmation, heading, anatomicalSide, estimator = createLocalPixelPoseEstimator() }) {
  if (!petId || ownerConfirmation?.accepted !== true || ownerConfirmation.petId !== petId) throw new Error("TARGET_DESCRIPTOR_CONFIRMATION_REQUIRED");
  if (!["LEFT", "RIGHT", "UNKNOWN"].includes(heading)) throw new Error("TARGET_HEADING_INVALID");
  const evidence = estimator.estimateFrame(frame, null);
  if (!evidence.signature || evidence.reasonCode === "MULTIPLE_PETS") throw new Error(evidence.reasonCode ?? "TARGET_DESCRIPTOR_EVIDENCE_UNAVAILABLE");
  const side = anatomicalSide?.status === "RESOLVED" && anatomicalSide.confidence >= 0.75 && anatomicalSide.identityToken
    ? { status: "RESOLVED", confidence: anatomicalSide.confidence, identityToken: anatomicalSide.identityToken }
    : { status: "AMBIGUOUS", confidence: 0, identityToken: null };
  return deepFreeze({ descriptorVersion: "guardian-local-target-descriptor-v1", petId, signature: evidence.signature, heading, anatomicalSide: side });
}

function findForegroundComponents(frame, threshold, minimumRatio) {
  validateFrame(frame);
  const background = borderMedian(frame);
  const pixelCount = frame.width * frame.height;
  const mask = new Uint8Array(pixelCount);
  const thresholdSquared = threshold * threshold;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    const dr = frame.rgba[offset] - background.r;
    const dg = frame.rgba[offset + 1] - background.g;
    const db = frame.rgba[offset + 2] - background.b;
    if (dr * dr + dg * dg + db * db >= thresholdSquared && frame.rgba[offset + 3] >= 128) mask[pixel] = 1;
  }
  const visited = new Uint8Array(pixelCount);
  const minimumArea = Math.max(4, Math.ceil(pixelCount * minimumRatio));
  const components = [];
  for (let seed = 0; seed < pixelCount; seed += 1) {
    if (!mask[seed] || visited[seed]) continue;
    const component = flood(mask, visited, seed, frame.width, frame.height, frame.rgba);
    if (component.area >= minimumArea) components.push(component);
  }
  return components.sort((a, b) => b.area - a.area || a.minY - b.minY || a.minX - b.minX);
}

function flood(mask, visited, seed, width, height, rgba) {
  const queue = [seed];
  visited[seed] = 1;
  let cursor = 0, area = 0, sumX = 0, sumY = 0, sumR = 0, sumG = 0, sumB = 0;
  let minX = width, minY = height, maxX = 0, maxY = 0;
  while (cursor < queue.length) {
    const pixel = queue[cursor++];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const offset = pixel * 4;
    area += 1; sumX += x; sumY += y; sumR += rgba[offset]; sumG += rgba[offset + 1]; sumB += rgba[offset + 2];
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    for (const next of [pixel - 1, pixel + 1, pixel - width, pixel + width]) {
      if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue;
      const nextX = next % width;
      if (Math.abs(nextX - x) > 1) continue;
      visited[next] = 1;
      queue.push(next);
    }
  }
  return { area, minX, minY, maxX, maxY, centerX: sumX / area, centerY: sumY / area, meanColor: { r: sumR / area, g: sumG / area, b: sumB / area } };
}

function buildSkeletonCandidate(component, frame, descriptor, identityConfidence) {
  const width = (component.maxX - component.minX + 1) / frame.width;
  const height = (component.maxY - component.minY + 1) / frame.height;
  const x0 = component.minX / frame.width;
  const y0 = component.minY / frame.height;
  const center = { x: component.centerX / frame.width, y: component.centerY / frame.height };
  const heading = descriptor.heading === "LEFT" ? -1 : descriptor.heading === "RIGHT" ? 1 : 0;
  const point = (along, vertical = 0) => ({ x: clamp01(center.x + heading * width * along), y: clamp01(center.y + height * vertical) });
  const landmarkPositions = {
    BODY_CENTER: center, SPINE_MID: point(0, 0), SPINE_FRONT: point(0.18, 0), SPINE_REAR: point(-0.18, 0),
    NECK: point(0.31, -0.05), HEAD: point(0.4, -0.12), NOSE: point(0.49, -0.12),
    TAIL_BASE: point(-0.34, 0), TAIL_MID: point(-0.45, -0.03), TAIL_TIP: point(-0.53, -0.05),
    LEFT_SHOULDER: point(0.2, -0.1), RIGHT_SHOULDER: point(0.2, 0.1), LEFT_HIP: point(-0.2, -0.1), RIGHT_HIP: point(-0.2, 0.1),
    LEFT_FRONT_ELBOW: point(0.16, 0.18), RIGHT_FRONT_ELBOW: point(0.24, 0.18), LEFT_FRONT_WRIST: point(0.13, 0.34), RIGHT_FRONT_WRIST: point(0.27, 0.34),
    LEFT_FRONT_PAW: point(0.1, 0.47), RIGHT_FRONT_PAW: point(0.3, 0.47), LEFT_REAR_KNEE: point(-0.24, 0.18), RIGHT_REAR_KNEE: point(-0.16, 0.18),
    LEFT_REAR_ANKLE: point(-0.27, 0.34), RIGHT_REAR_ANKLE: point(-0.13, 0.34), LEFT_REAR_PAW: point(-0.3, 0.47), RIGHT_REAR_PAW: point(-0.1, 0.47)
  };
  const sideResolved = descriptor.anatomicalSide?.status === "RESOLVED" && descriptor.anatomicalSide.confidence >= 0.75 && descriptor.anatomicalSide.identityToken;
  const landmarks = Object.fromEntries(LANDMARK_KEYS.map((key) => {
    if (key === "BODY_CENTER") return [key, { state: "OBSERVED", ...center, confidence: identityConfidence, visibility: 1, occlusion: 0 }];
    if ((key.startsWith("LEFT_") || key.startsWith("RIGHT_")) && !sideResolved) return [key, unavailable("ANATOMICAL_SIDE_AMBIGUOUS")];
    const location = landmarkPositions[key];
    return [key, location ? { state: "ESTIMATED", ...location, confidence: identityConfidence * 0.7, visibility: 0.8, occlusion: 0, reasonCode: "PIXEL_SILHOUETTE_ESTIMATE_UNVALIDATED" } : unavailable("LANDMARK_NOT_ESTIMATED")];
  }));
  return {
    landmarks,
    measurements: {
      bodyBoundingBox: { availability: "OBSERVED", x: x0, y: y0, width, height, confidence: identityConfidence },
      bodyLength: { availability: "OBSERVED", value: width, confidence: identityConfidence },
      bodyHeight: { availability: "OBSERVED", value: height, confidence: identityConfidence }
    },
    anatomicalSideEvidence: sideResolved ? { ...descriptor.anatomicalSide } : { status: "AMBIGUOUS", confidence: 0, identityToken: null }
  };
}

function verifyTarget(signature, descriptor) {
  if (!descriptor?.signature) return { state: "UNKNOWN", confidence: 0, reasonCode: "TARGET_DESCRIPTOR_REQUIRED" };
  const confidence = signatureSimilarity(signature, descriptor.signature);
  if (confidence >= 0.82) return { state: "MATCH", confidence, reasonCode: null };
  if (confidence >= 0.65) return { state: "LOW_CONFIDENCE", confidence, reasonCode: "TARGET_MATCH_LOW_CONFIDENCE" };
  return { state: "MISMATCH", confidence, reasonCode: "TARGET_SIGNATURE_MISMATCH" };
}

function componentSignature(component, frame) {
  const width = component.maxX - component.minX + 1;
  const height = component.maxY - component.minY + 1;
  return deepFreeze({ meanColor: roundColor(component.meanColor), aspectRatio: round(width / height), areaRatio: round(component.area / (frame.width * frame.height)) });
}

function signatureSimilarity(a, b) {
  if (!a || !b?.meanColor || !Number.isFinite(b.aspectRatio) || !Number.isFinite(b.areaRatio)) return 0;
  const colorDistance = Math.hypot(a.meanColor.r - b.meanColor.r, a.meanColor.g - b.meanColor.g, a.meanColor.b - b.meanColor.b) / (Math.sqrt(3) * 255);
  const color = 1 - Math.min(1, colorDistance);
  const aspect = 1 - Math.min(1, Math.abs(Math.log(a.aspectRatio / b.aspectRatio)));
  const area = 1 - Math.min(1, Math.abs(Math.log(a.areaRatio / b.areaRatio)));
  return clamp01(0.5 * color + 0.25 * aspect + 0.25 * area);
}

function borderMedian(frame) {
  const values = [[], [], []];
  for (let y = 0; y < frame.height; y += 1) for (let x = 0; x < frame.width; x += 1) {
    if (x !== 0 && y !== 0 && x !== frame.width - 1 && y !== frame.height - 1) continue;
    const offset = (y * frame.width + x) * 4;
    values[0].push(frame.rgba[offset]); values[1].push(frame.rgba[offset + 1]); values[2].push(frame.rgba[offset + 2]);
  }
  return { r: median(values[0]), g: median(values[1]), b: median(values[2]) };
}

function validateFrame(frame) { if (!frame || !Number.isInteger(frame.width) || !Number.isInteger(frame.height) || !(frame.rgba instanceof Uint8ClampedArray) || frame.rgba.length !== frame.width * frame.height * 4) throw new Error("PIXEL_FRAME_INVALID"); }
function rejected(status, reasonCode, signature = null) { return deepFreeze({ status, reasonCode, identityConfidence: 0, trackingContinuity: 0, signature, skeletonCandidate: null }); }
function unavailable(reasonCode) { return { state: "UNKNOWN", x: null, y: null, confidence: 0, visibility: 0, occlusion: 0, reasonCode }; }
function roundColor(color) { return { r: round(color.r), g: round(color.g), b: round(color.b) }; }
function round(value) { return Math.round(value * 1e6) / 1e6; }
function median(values) { const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; }
