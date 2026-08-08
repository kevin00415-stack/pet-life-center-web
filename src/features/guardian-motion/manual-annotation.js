import { LANDMARK_KEYS, canonicalize, deepFreeze, deterministicChecksum } from "./contracts.js";

const GROUPS = Object.freeze({
  HEAD: Object.freeze(["HEAD", "NOSE", "NECK"]),
  BODY: Object.freeze(["LEFT_SHOULDER", "RIGHT_SHOULDER", "SPINE_FRONT", "SPINE_MID", "SPINE_REAR", "LEFT_HIP", "RIGHT_HIP", "BODY_CENTER"]),
  FRONT_LEGS: Object.freeze(["LEFT_FRONT_ELBOW", "RIGHT_FRONT_ELBOW", "LEFT_FRONT_WRIST", "RIGHT_FRONT_WRIST", "LEFT_FRONT_PAW", "RIGHT_FRONT_PAW"]),
  REAR_LEGS: Object.freeze(["LEFT_REAR_KNEE", "RIGHT_REAR_KNEE", "LEFT_REAR_ANKLE", "RIGHT_REAR_ANKLE", "LEFT_REAR_PAW", "RIGHT_REAR_PAW"]),
  TAIL: Object.freeze(["TAIL_BASE", "TAIL_MID", "TAIL_TIP"])
});

export function createManualAnnotationSet(input) {
  if (!input?.annotationSetId || !input.videoId || !input.petId || !["DOG", "CAT"].includes(input.species)) throw new Error("ANNOTATION_IDENTITY_INVALID");
  if (!["SYNTHETIC", "GUARDIAN_HQ_AUTHORIZED_TEST"].includes(input.sourceClass)) throw new Error("ANNOTATION_SOURCE_REJECTED");
  if (input.sourceClass === "GUARDIAN_HQ_AUTHORIZED_TEST" && !input.authorizationRef) throw new Error("ANNOTATION_AUTHORIZATION_REQUIRED");
  if (!Array.isArray(input.frames) || !input.frames.length) throw new Error("ANNOTATION_FRAMES_REQUIRED");
  const frames = input.frames.map((frame) => ({
    frameIndex: requiredInteger(frame.frameIndex, "ANNOTATION_FRAME_INDEX_INVALID"),
    timestampMs: requiredNumber(frame.timestampMs, "ANNOTATION_TIMESTAMP_INVALID"),
    bodyLength: positiveNumber(frame.bodyLength, "ANNOTATION_BODY_LENGTH_INVALID"),
    landmarks: Object.freeze(Object.fromEntries(Object.entries(frame.landmarks ?? {}).map(([key, point]) => {
      if (!LANDMARK_KEYS.includes(key)) throw new Error("ANNOTATION_LANDMARK_UNKNOWN");
      return [key, normalizedPoint(point)];
    })))
  }));
  const payload = { schemaVersion: "guardian-manual-annotation-v1", annotationSetId: input.annotationSetId, videoId: input.videoId, petId: input.petId, species: input.species, sourceClass: input.sourceClass, authorizationRef: input.authorizationRef ?? null, frames };
  return deepFreeze({ ...payload, checksum: deterministicChecksum(payload) });
}

export function createLandmarkErrorReport({ annotationSet, envelope, policy = {} }) {
  validateBindings(annotationSet, envelope);
  const normalizedThreshold = policy.normalizedErrorThreshold ?? 0.08;
  const bodyRelativeThreshold = policy.bodyRelativeErrorThreshold ?? 0.15;
  const minimumSamples = policy.minimumSamplesPerGroup ?? 30;
  const requiredReliability = policy.requiredReliability ?? 0.8;
  const samples = [];
  for (const referenceFrame of annotationSet.frames) {
    const estimatedFrame = envelope.skeletonFrames.find((frame) => frame.frameIndex === referenceFrame.frameIndex);
    if (!estimatedFrame) continue;
    const box = estimatedFrame.measurements.bodyBoundingBox;
    const diagonal = box.availability === "OBSERVED" ? Math.hypot(box.value.width, box.value.height) : null;
    for (const [key, reference] of Object.entries(referenceFrame.landmarks)) {
      const estimated = estimatedFrame.landmarks[key];
      if (!estimated || !Number.isFinite(estimated.x) || !Number.isFinite(estimated.y)) continue;
      const distance = Math.hypot(estimated.x - reference.x, estimated.y - reference.y);
      samples.push({ frameIndex: referenceFrame.frameIndex, landmark: key, group: groupFor(key), state: estimated.state, normalizedLandmarkError: diagonal ? distance / diagonal : null, bodyRelativeLandmarkError: distance / referenceFrame.bodyLength });
    }
  }
  const groups = Object.fromEntries(Object.keys(GROUPS).map((group) => {
    const groupSamples = samples.filter((sample) => sample.group === group && sample.normalizedLandmarkError !== null);
    const passing = groupSamples.filter((sample) => sample.normalizedLandmarkError <= normalizedThreshold && sample.bodyRelativeLandmarkError <= bodyRelativeThreshold).length;
    const reliability = groupSamples.length ? passing / groupSamples.length : 0;
    return [group, {
      sampleCount: groupSamples.length,
      meanNormalizedLandmarkError: meanOrNull(groupSamples.map((sample) => sample.normalizedLandmarkError)),
      meanBodyRelativeLandmarkError: meanOrNull(groupSamples.map((sample) => sample.bodyRelativeLandmarkError)),
      reliability,
      meetsEngineeringTarget: groupSamples.length >= minimumSamples && reliability >= requiredReliability,
      promotionEligible: false,
      reasonCode: groupSamples.length < minimumSamples ? "INSUFFICIENT_ANNOTATED_SAMPLES" : reliability < requiredReliability ? "ENGINEERING_RELIABILITY_BELOW_TARGET" : "HQ_PROMOTION_APPROVAL_REQUIRED"
    }];
  }));
  const leftRight = leftRightAgreement(annotationSet, envelope);
  const payload = {
    reportVersion: "guardian-landmark-error-report-v1", annotationSetId: annotationSet.annotationSetId,
    motionDigest: envelope.motionDigest, thresholds: { normalizedThreshold, bodyRelativeThreshold, minimumSamples, requiredReliability },
    sampleCount: samples.length, groups, leftRightAgreement: leftRight, samples
  };
  return deepFreeze({ ...payload, checksum: deterministicChecksum(payload) });
}

function leftRightAgreement(annotationSet, envelope) {
  const pairs = [["LEFT_SHOULDER", "RIGHT_SHOULDER"], ["LEFT_HIP", "RIGHT_HIP"], ["LEFT_FRONT_PAW", "RIGHT_FRONT_PAW"], ["LEFT_REAR_PAW", "RIGHT_REAR_PAW"]];
  let comparable = 0, agreed = 0;
  for (const referenceFrame of annotationSet.frames) {
    const estimatedFrame = envelope.skeletonFrames.find((frame) => frame.frameIndex === referenceFrame.frameIndex);
    if (!estimatedFrame) continue;
    for (const [leftKey, rightKey] of pairs) {
      const leftRef = referenceFrame.landmarks[leftKey], rightRef = referenceFrame.landmarks[rightKey];
      const left = estimatedFrame.landmarks[leftKey], right = estimatedFrame.landmarks[rightKey];
      if (!leftRef || !rightRef || !hasPoint(left) || !hasPoint(right)) continue;
      comparable += 1;
      const direct = distance(left, leftRef) + distance(right, rightRef);
      const swapped = distance(left, rightRef) + distance(right, leftRef);
      if (direct <= swapped) agreed += 1;
    }
  }
  return comparable ? { availability: "OBSERVED", value: agreed / comparable, comparablePairs: comparable } : { availability: "UNKNOWN", value: null, comparablePairs: 0, reasonCode: "LEFT_RIGHT_EVIDENCE_UNAVAILABLE" };
}

function validateBindings(annotation, envelope) { if (annotation.videoId !== envelope.videoId || annotation.petId !== envelope.petId || annotation.species !== envelope.speciesMetadata) throw new Error("ANNOTATION_MOTION_BINDING_INVALID"); }
function groupFor(key) { return Object.entries(GROUPS).find(([, keys]) => keys.includes(key))?.[0] ?? "UNKNOWN"; }
function normalizedPoint(point) { if (!point || !inRange(point.x) || !inRange(point.y)) throw new Error("ANNOTATION_POINT_INVALID"); return Object.freeze({ x: point.x, y: point.y }); }
function requiredInteger(value, code) { if (!Number.isInteger(value) || value < 0) throw new Error(code); return value; }
function requiredNumber(value, code) { if (!Number.isFinite(value) || value < 0) throw new Error(code); return value; }
function positiveNumber(value, code) { if (!Number.isFinite(value) || value <= 0) throw new Error(code); return value; }
function inRange(value) { return Number.isFinite(value) && value >= 0 && value <= 1; }
function hasPoint(point) { return Number.isFinite(point?.x) && Number.isFinite(point?.y); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function meanOrNull(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; }

export function canonicalAnnotation(annotation) { return canonicalize(annotation); }
