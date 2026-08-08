export function createTechnicalFrameAdapter() {
  return Object.freeze({
    adapterVersion: "guardian-technical-frame-adapter-v1",
    adapt(input) {
      const source = Array.isArray(input?.technicalFrames) ? input.technicalFrames : [];
      let elapsed = 0;
      return Object.freeze(source.map((frame, frameIndex) => {
        const durationMs = Number.isFinite(frame.durationMs) && frame.durationMs > 0 ? frame.durationMs : 1000 / 30;
        const timestampMs = Number.isFinite(frame.timestampMs) ? frame.timestampMs : elapsed;
        elapsed = timestampMs + durationMs;
        return Object.freeze({ ...structuredClone(frame), frameIndex, timestampMs, durationMs });
      }));
    }
  });
}

export function createTechnicalFrameSkeletonEstimator({ artifactVersion = "guardian-technical-skeleton-fixture-v1" } = {}) {
  return Object.freeze({
    provider: "TECHNICAL_FRAME_LOCAL",
    artifactVersion,
    async estimate(frame) {
      if (!frame?.skeletonCandidates) return Object.freeze({ landmarks: {}, measurements: {}, anatomicalSideEvidence: { status: "AMBIGUOUS", confidence: 0, identityToken: null }, reasonCode: "SKELETON_CANDIDATES_UNAVAILABLE" });
      return Object.freeze({
        landmarks: structuredClone(frame.skeletonCandidates.landmarks ?? {}),
        measurements: structuredClone(frame.skeletonCandidates.measurements ?? {}),
        anatomicalSideEvidence: structuredClone(frame.skeletonCandidates.anatomicalSideEvidence ?? { status: "AMBIGUOUS", confidence: 0, identityToken: null }),
        reasonCode: null
      });
    }
  });
}

export function createRawVideoFrameAdapterBoundary() {
  return Object.freeze({
    adapterVersion: "guardian-raw-video-boundary-v1",
    adapt() { throw new Error("RAW_VIDEO_DECODER_UNAVAILABLE"); }
  });
}
