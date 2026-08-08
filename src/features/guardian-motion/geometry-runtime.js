import { GEOMETRY_POLICY_VERSION, deepFreeze, observedValue, unknownValue } from "./contracts.js";

const FRONT_TRIPLETS = Object.freeze({
  leftFrontShoulderElbowWristAngle: ["LEFT_SHOULDER", "LEFT_FRONT_ELBOW", "LEFT_FRONT_WRIST"],
  rightFrontShoulderElbowWristAngle: ["RIGHT_SHOULDER", "RIGHT_FRONT_ELBOW", "RIGHT_FRONT_WRIST"]
});
const REAR_TRIPLETS = Object.freeze({
  leftRearHipKneeAnkleAngle: ["LEFT_HIP", "LEFT_REAR_KNEE", "LEFT_REAR_ANKLE"],
  rightRearHipKneeAnkleAngle: ["RIGHT_HIP", "RIGHT_REAR_KNEE", "RIGHT_REAR_ANKLE"]
});

export function computeGeometryFrame(skeleton) {
  const landmarks = skeleton.landmarks;
  const jointAngles = Object.fromEntries(Object.entries({ ...FRONT_TRIPLETS, ...REAR_TRIPLETS }).map(([key, triplet]) => [key, jointAngle(landmarks, triplet)]));
  const limbShape = Object.fromEntries([
    ["leftFront", ["LEFT_SHOULDER", "LEFT_FRONT_ELBOW", "LEFT_FRONT_WRIST", "LEFT_FRONT_PAW"]],
    ["rightFront", ["RIGHT_SHOULDER", "RIGHT_FRONT_ELBOW", "RIGHT_FRONT_WRIST", "RIGHT_FRONT_PAW"]],
    ["leftRear", ["LEFT_HIP", "LEFT_REAR_KNEE", "LEFT_REAR_ANKLE", "LEFT_REAR_PAW"]],
    ["rightRear", ["RIGHT_HIP", "RIGHT_REAR_KNEE", "RIGHT_REAR_ANKLE", "RIGHT_REAR_PAW"]]
  ].map(([key, chain]) => [key, limbExtension(landmarks, chain)]));
  const bodyAxis = axisFromMidpoints(landmarks, ["LEFT_HIP", "RIGHT_HIP"], ["LEFT_SHOULDER", "RIGHT_SHOULDER"], "BODY_AXIS_UNAVAILABLE");
  const spineAxis = axis(landmarks.SPINE_REAR, landmarks.SPINE_FRONT, "SPINE_AXIS_UNAVAILABLE");
  const headToBodyAngle = jointAngle(landmarks, ["HEAD", "NECK", "SPINE_FRONT"]);
  const tailBaseAngle = jointAngle(landmarks, ["SPINE_REAR", "TAIL_BASE", "TAIL_MID"]);
  const tailCurvatureProxy = curvature(landmarks, ["TAIL_BASE", "TAIL_MID", "TAIL_TIP"]);
  const ratio = measurementRatio(skeleton.measurements.bodyHeight, skeleton.measurements.bodyLength);
  const symmetry = poseSymmetry(jointAngles, limbShape);
  const observedGeometry = [...Object.values(jointAngles), ...Object.values(limbShape), bodyAxis, spineAxis, headToBodyAngle, tailBaseAngle, tailCurvatureProxy, ratio, symmetry].filter((value) => value.availability === "OBSERVED");
  return deepFreeze({
    policyVersion: GEOMETRY_POLICY_VERSION, frameIndex: skeleton.frameIndex, timestampMs: skeleton.timestampMs,
    petId: skeleton.petId, videoId: skeleton.videoId, jointAngles: Object.freeze(jointAngles),
    limbExtension: Object.freeze(Object.fromEntries(Object.entries(limbShape).map(([key, value]) => [key, value]))),
    limbCompression: Object.freeze(Object.fromEntries(Object.entries(limbShape).map(([key, value]) => [key, value.availability === "OBSERVED" ? observedValue(1 - value.value, "ratio", value.confidence) : unknownValue(value.reasonCode, "ratio")]))),
    bodyAxis, spineAxis, headToBodyAngle, tailBaseAngle, tailCurvatureProxy,
    bodyCenter: pointValue(landmarks.BODY_CENTER, "BODY_CENTER_UNAVAILABLE"), bodyHeightLengthRatio: ratio,
    leftRightPoseSymmetryProxy: symmetry,
    confidence: observedGeometry.length ? Math.min(...observedGeometry.map((value) => value.confidence)) : 0,
    status: observedGeometry.length ? "COMPLETE_OR_PARTIAL" : "INSUFFICIENT_GEOMETRY"
  });
}

function jointAngle(landmarks, [aKey, bKey, cKey]) {
  const [a, b, c] = [landmarks[aKey], landmarks[bKey], landmarks[cKey]];
  if (![a, b, c].every(isObserved)) return unknownValue("JOINT_LANDMARKS_NOT_OBSERVED", "radian");
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const denominator = magnitude(ab) * magnitude(cb);
  if (!denominator) return unknownValue("JOINT_GEOMETRY_DEGENERATE", "radian");
  const cosine = Math.max(-1, Math.min(1, dot(ab, cb) / denominator));
  return observedValue(Math.acos(cosine), "radian", Math.min(a.confidence, b.confidence, c.confidence));
}

function limbExtension(landmarks, keys) {
  const points = keys.map((key) => landmarks[key]);
  if (!points.every(isObserved)) return unknownValue("LIMB_LANDMARKS_NOT_OBSERVED", "ratio");
  const chainLength = distance(points[0], points[1]) + distance(points[1], points[2]) + distance(points[2], points[3]);
  if (!chainLength) return unknownValue("LIMB_GEOMETRY_DEGENERATE", "ratio");
  return observedValue(Math.min(1, distance(points[0], points[3]) / chainLength), "ratio", Math.min(...points.map((point) => point.confidence)));
}

function axisFromMidpoints(landmarks, fromKeys, toKeys, reason) {
  const points = [...fromKeys, ...toKeys].map((key) => landmarks[key]);
  if (!points.every(isObserved)) return unknownValue(reason, "unit_vector");
  return axis(midpoint(landmarks[fromKeys[0]], landmarks[fromKeys[1]]), midpoint(landmarks[toKeys[0]], landmarks[toKeys[1]]), reason);
}

function axis(from, to, reason) {
  if (!isObserved(from) || !isObserved(to)) return unknownValue(reason, "unit_vector");
  const vector = { x: to.x - from.x, y: to.y - from.y };
  const length = magnitude(vector);
  if (!length) return unknownValue("AXIS_GEOMETRY_DEGENERATE", "unit_vector");
  return observedValue({ x: vector.x / length, y: vector.y / length, angle: Math.atan2(vector.y, vector.x) }, "unit_vector", Math.min(from.confidence, to.confidence));
}

function curvature(landmarks, keys) {
  const angle = jointAngle(landmarks, keys);
  return angle.availability === "OBSERVED" ? observedValue((Math.PI - angle.value) / Math.PI, "ratio", angle.confidence) : unknownValue(angle.reasonCode, "ratio");
}

function measurementRatio(height, length) {
  if (height.availability !== "OBSERVED" || length.availability !== "OBSERVED" || !length.value) return unknownValue("BODY_MEASUREMENT_UNAVAILABLE", "ratio");
  return observedValue(height.value / length.value, "ratio", Math.min(height.confidence, length.confidence));
}

function poseSymmetry(angles, limbs) {
  const pairs = [[angles.leftFrontShoulderElbowWristAngle, angles.rightFrontShoulderElbowWristAngle, Math.PI], [angles.leftRearHipKneeAnkleAngle, angles.rightRearHipKneeAnkleAngle, Math.PI], [limbs.leftFront, limbs.rightFront, 1], [limbs.leftRear, limbs.rightRear, 1]];
  if (!pairs.every(([left, right]) => left.availability === "OBSERVED" && right.availability === "OBSERVED")) return unknownValue("BILATERAL_GEOMETRY_UNAVAILABLE", "ratio");
  const difference = pairs.reduce((sum, [left, right, scale]) => sum + Math.abs(left.value - right.value) / scale, 0) / pairs.length;
  return observedValue(Math.max(0, 1 - difference), "ratio", Math.min(...pairs.flatMap(([left, right]) => [left.confidence, right.confidence])));
}

function pointValue(point, reason) { return isObserved(point) ? observedValue({ x: point.x, y: point.y }, "normalized_point", point.confidence) : unknownValue(reason, "normalized_point"); }
function midpoint(a, b) { return { state: "OBSERVED", x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, confidence: Math.min(a.confidence, b.confidence) }; }
function isObserved(point) { return point?.state === "OBSERVED" && Number.isFinite(point.x) && Number.isFinite(point.y); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function magnitude(vector) { return Math.hypot(vector.x, vector.y); }
function dot(a, b) { return a.x * b.x + a.y * b.y; }
