const GUARDIAN_KEYS = Object.freeze([
  "HEAD", "NOSE", "NECK",
  "LEFT_SHOULDER", "RIGHT_SHOULDER",
  "SPINE_FRONT", "SPINE_MID", "SPINE_REAR",
  "LEFT_HIP", "RIGHT_HIP",
  "LEFT_FRONT_ELBOW", "RIGHT_FRONT_ELBOW",
  "LEFT_FRONT_WRIST", "RIGHT_FRONT_WRIST",
  "LEFT_FRONT_PAW", "RIGHT_FRONT_PAW",
  "LEFT_REAR_KNEE", "RIGHT_REAR_KNEE",
  "LEFT_REAR_ANKLE", "RIGHT_REAR_ANKLE",
  "LEFT_REAR_PAW", "RIGHT_REAR_PAW",
  "TAIL_BASE", "TAIL_MID", "TAIL_TIP", "BODY_CENTER"
]);

export const LEARNED_PROVIDER_ID = "GUARDIAN_RTMPOSE_AP10K_EXPERIMENTAL";
export const LEARNED_ADAPTER_VERSION = "guardian-learned-pose-adapter-v1";
export const DEFAULT_DETECTOR_ID = "yolox-m-coco-onnx-0.1.1rc0";
export const DEFAULT_POSE_MODEL_ID = "rtmpose-m-ap10k-20230206";

export function createLearnedPoseAdapter({
  providerIdentity = LEARNED_PROVIDER_ID,
  detectorIdentity = DEFAULT_DETECTOR_ID,
  poseModelIdentity = DEFAULT_POSE_MODEL_ID,
  minimumContractConfidence = 0.6
} = {}) {
  const identity = Object.freeze({
    providerIdentity,
    detectorIdentity,
    poseModelIdentity,
    adapterVersion: LEARNED_ADAPTER_VERSION,
    confidenceSemantics: "RAW_SIMCC_NOT_CALIBRATED_PROBABILITY",
    confidenceTransform: "CLAMP_RAW_SIMCC_TO_UNIT_INTERVAL_FOR_CONTRACT_ONLY"
  });

  return Object.freeze({
    identity,
    frameAdapter: Object.freeze({
      adapterVersion: LEARNED_ADAPTER_VERSION,
      adapt({ technicalFrames }) {
        if (!Array.isArray(technicalFrames)) throw new Error("LEARNED_FRAMES_REQUIRED");
        return Object.freeze(technicalFrames.map((frame, frameIndex) => Object.freeze({
          ...structuredClone(frame),
          frameIndex,
          timestampMs: finite(frame.timestampMs) ? frame.timestampMs : frameIndex * 200,
          durationMs: positive(frame.durationMs) ? frame.durationMs : 200
        })));
      }
    }),
    estimator: Object.freeze({
      provider: providerIdentity,
      artifactVersion: poseModelIdentity,
      async estimate(frame) {
        if (!frame?.skeletonCandidates) return Object.freeze({
          landmarks: {}, measurements: {},
          anatomicalSideEvidence: ambiguousSide("LEARNED_SKELETON_CANDIDATES_UNAVAILABLE"),
          reasonCode: "LEARNED_SKELETON_CANDIDATES_UNAVAILABLE"
        });
        return Object.freeze({
          landmarks: structuredClone(frame.skeletonCandidates.landmarks),
          measurements: structuredClone(frame.skeletonCandidates.measurements),
          anatomicalSideEvidence: structuredClone(frame.skeletonCandidates.anatomicalSideEvidence),
          reasonCode: null
        });
      }
    }),
    adaptPredictionSequence({ frames, className, timestampsMs = null, sideStatus = "RESOLVED", targetInstanceIds = null }) {
      if (!Array.isArray(frames) || !frames.length) throw new Error("LEARNED_PREDICTION_FRAMES_REQUIRED");
      const technicalFrames = [];
      const evidenceFrames = [];
      let previousBox = null;
      for (let index = 0; index < frames.length; index += 1) {
        const frame = frames[index];
        const matching = (frame.detections ?? []).filter((item) => item.class_name === className);
        const requestedId = targetInstanceIds?.[index] ?? null;
        const selected = requestedId ? matching.find((item) => item.instance_id === requestedId) : matching[0];
        if (!selected) throw new Error(`DETECTOR_MISS:${index}:${className}`);
        if (!requestedId && matching.length > 1) throw new Error(`MULTIPLE_ANIMALS_TARGET_SELECTION_REQUIRED:${index}:${matching.length}`);
        const converted = convertDetection({
          frame,
          detection: selected,
          previousBox,
          sideStatus,
          minimumContractConfidence,
          providerIdentity,
          detectorIdentity,
          poseModelIdentity
        });
        const timestampMs = timestampsMs?.[index] ?? index * 200;
        technicalFrames.push(Object.freeze({
          timestampMs,
          durationMs: index + 1 < frames.length ? (timestampsMs?.[index + 1] ?? (index + 1) * 200) - timestampMs : 200,
          trackingConfidence: clamp01(selected.detector_confidence),
          trackingContinuity: converted.trackingContinuity,
          cameraMotionRisk: converted.cameraMotionRisk,
          skeletonCandidates: converted.skeletonCandidates,
          learnedEvidence: converted.evidence
        }));
        evidenceFrames.push(converted.evidence);
        previousBox = converted.normalizedBox;
      }
      return Object.freeze({ identity, technicalFrames: Object.freeze(technicalFrames), evidenceFrames: Object.freeze(evidenceFrames) });
    }
  });
}

function convertDetection({
  frame, detection, previousBox, sideStatus, minimumContractConfidence,
  providerIdentity, detectorIdentity, poseModelIdentity
}) {
  const width = frame.width;
  const height = frame.height;
  if (!positive(width) || !positive(height)) throw new Error("FRAME_DIMENSIONS_INVALID");
  const normalizedBox = normalizeBox(detection.bbox_xyxy, width, height);
  const ap10k = new Map((detection.ap10k ?? []).map((point) => [point.name, point]));
  const mapped = new Map((detection.guardian26 ?? []).map((point) => [point.key, point]));
  const landmarks = {};
  const rawLandmarks = {};

  for (const key of GUARDIAN_KEYS) {
    const candidate = mapped.get(key);
    const converted = convertLandmark({ candidate, ap10k, width, height, minimumContractConfidence });
    landmarks[key] = converted.contract;
    rawLandmarks[key] = converted.raw;
  }

  const trackingContinuity = previousBox ? boxIou(previousBox, normalizedBox) : 1;
  const cameraMotionRisk = previousBox ? bboxMotionProxy(previousBox, normalizedBox) : 0;
  const sideEvidence = sideStatus === "RESOLVED"
    ? Object.freeze({
      status: "RESOLVED", confidence: 1,
      identityToken: "ap10k-declared-anatomical-side-v1", reasonCode: null
    })
    : ambiguousSide("ANATOMICAL_SIDE_UNCERTAIN_FROM_PROVIDER");
  const detectorConfidence = clamp01(detection.detector_confidence);
  const measurements = Object.freeze({
    bodyBoundingBox: Object.freeze({ availability: "OBSERVED", ...normalizedBox, confidence: detectorConfidence }),
    bodyLength: Object.freeze({ availability: "OBSERVED", value: normalizedBox.width, confidence: detectorConfidence }),
    bodyHeight: Object.freeze({ availability: "OBSERVED", value: normalizedBox.height, confidence: detectorConfidence })
  });
  const skeletonCandidates = Object.freeze({ landmarks: Object.freeze(landmarks), measurements, anatomicalSideEvidence: sideEvidence });
  const evidence = Object.freeze({
    providerIdentity,
    detectorIdentity,
    poseModelIdentity,
    detectorInstanceId: detection.instance_id,
    detectorClass: detection.class_name,
    detectorConfidenceRaw: detection.detector_confidence,
    detectorBoundingBox: Object.freeze([...detection.bbox_xyxy]),
    normalizedBoundingBox: normalizedBox,
    cameraMotionRisk,
    cameraMotionReasonCode: previousBox ? "CAMERA_MOTION_PROXY_FROM_BBOX_CHANGE" : "FIRST_FRAME_NO_CAMERA_MOTION_COMPARISON",
    rawSimccByGuardianKey: Object.freeze(rawLandmarks),
    evidenceCounts: countStates(landmarks)
  });
  return { skeletonCandidates, evidence, normalizedBox, trackingContinuity, cameraMotionRisk };
}

function convertLandmark({ candidate, ap10k, width, height, minimumContractConfidence }) {
  if (!candidate || candidate.evidence === "UNKNOWN" || !finite(candidate.x) || !finite(candidate.y)) {
    return unknownLandmark(candidate?.reason ?? "LEARNED_LANDMARK_UNAVAILABLE", candidate);
  }
  const rawScore = finite(candidate.confidence) ? candidate.confidence : null;
  const raw = Object.freeze({ rawSimccScore: rawScore, source: Object.freeze([...(candidate.source ?? [])]), originalEvidence: candidate.evidence, originalReason: candidate.reason ?? null });
  if (candidate.x < 0 || candidate.y < 0 || candidate.x > width || candidate.y > height) {
    return { contract: unavailable("OUT_OF_FRAME", "LEARNED_COORDINATE_OUTSIDE_FRAME"), raw };
  }
  if (candidate.evidence === "ESTIMATED") {
    const sourcesSufficient = (candidate.source ?? []).length > 0 && candidate.source.every((name) => {
      const point = ap10k.get(name);
      return point && finite(point.x) && finite(point.y) && finite(point.confidence)
        && point.confidence >= minimumContractConfidence
        && point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height;
    });
    if (!sourcesSufficient) return { contract: unavailable("UNKNOWN", "ESTIMATE_SOURCE_EVIDENCE_INSUFFICIENT"), raw };
    return {
      contract: Object.freeze({
        state: "ESTIMATED", x: candidate.x / width, y: candidate.y / height,
        confidence: clamp01(rawScore), visibility: 1, occlusion: 0,
        reasonCode: candidate.reason ?? "GEOMETRIC_ESTIMATE_FROM_LEARNED_SOURCES"
      }), raw
    };
  }
  if (!finite(rawScore) || rawScore < minimumContractConfidence) {
    return { contract: unavailable("UNKNOWN", "LEARNED_LANDMARK_CONFIDENCE_LOW"), raw };
  }
  return {
    contract: Object.freeze({
      state: "OBSERVED", x: candidate.x / width, y: candidate.y / height,
      confidence: clamp01(rawScore), visibility: 1, occlusion: 0, reasonCode: null
    }), raw
  };
}

function unknownLandmark(reasonCode, candidate) {
  const raw = Object.freeze({
    rawSimccScore: finite(candidate?.confidence) ? candidate.confidence : null,
    source: Object.freeze([...(candidate?.source ?? [])]),
    originalEvidence: candidate?.evidence ?? "UNKNOWN",
    originalReason: candidate?.reason ?? reasonCode
  });
  return { contract: unavailable("UNKNOWN", reasonCode), raw };
}

function unavailable(state, reasonCode) {
  return Object.freeze({ state, x: null, y: null, confidence: 0, visibility: 0, occlusion: 0, reasonCode });
}

function normalizeBox(box, width, height) {
  if (!Array.isArray(box) || box.length !== 4) throw new Error("DETECTOR_BBOX_INVALID");
  const left = clamp(box[0], 0, width);
  const top = clamp(box[1], 0, height);
  const right = clamp(box[2], 0, width);
  const bottom = clamp(box[3], 0, height);
  if (right <= left || bottom <= top) throw new Error("DETECTOR_BBOX_EMPTY");
  return Object.freeze({ x: left / width, y: top / height, width: (right - left) / width, height: (bottom - top) / height });
}

function bboxMotionProxy(previous, current) {
  const centerShift = Math.hypot(
    previous.x + previous.width / 2 - current.x - current.width / 2,
    previous.y + previous.height / 2 - current.y - current.height / 2
  );
  const scaleShift = Math.abs(Math.log(current.width / previous.width)) + Math.abs(Math.log(current.height / previous.height));
  return clamp01(centerShift * 2 + scaleShift * 0.5);
}

function boxIou(a, b) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = a.width * a.height + b.width * b.height - intersection;
  return union ? intersection / union : 0;
}

function countStates(landmarks) {
  const counts = { OBSERVED: 0, ESTIMATED: 0, UNKNOWN: 0, OUT_OF_FRAME: 0, OCCLUDED: 0 };
  for (const item of Object.values(landmarks)) counts[item.state] += 1;
  return Object.freeze(counts);
}

function ambiguousSide(reasonCode) {
  return Object.freeze({ status: "AMBIGUOUS", confidence: 0, identityToken: null, reasonCode });
}

function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
function clamp01(value) { return clamp(finite(value) ? value : 0, 0, 1); }
function finite(value) { return Number.isFinite(value); }
function positive(value) { return finite(value) && value > 0; }
