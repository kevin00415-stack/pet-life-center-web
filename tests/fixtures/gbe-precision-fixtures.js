export const FIXTURE_PET_ID = "pet-precision";

export function precisionVideo(id, overrides = {}) {
  const motionPattern = [0.05, 0.04, 0.08, 0.3, 0.55, 0.62, 0.58, 0.35, 0.09, 0.06, 0.28, 0.52, 0.6, 0.45, 0.08, 0.05, 0.32, 0.57, 0.5, 0.07];
  const frames = motionPattern.map((bodyRelativeMotion, index) => frame({
    bodyRelativeMotion,
    turn: index === 7 || index === 13,
    orientationDelta: index === 7 || index === 13 ? 12 : 2
  }));
  return {
    id,
    petId: FIXTURE_PET_ID,
    species: "dog",
    capturedAt: "2026-08-08T00:00:00.000Z",
    timezone: "Asia/Taipei",
    durationMs: frames.reduce((total, item) => total + item.durationMs, 0),
    frameRate: 30,
    resolution: { width: 1920, height: 1080 },
    deviceClass: "synthetic-static",
    technicalFrames: frames,
    identityEvidence: { detectedPetIds: [FIXTURE_PET_ID], confidence: 0.99 },
    ...overrides
  };
}

export function frame(overrides = {}) {
  const bodyRelativeMotion = overrides.bodyRelativeMotion ?? 0.1;
  const bodyPixelSpan = overrides.bodyPixelSpan ?? 120;
  return {
    durationMs: 500,
    usable: true,
    trackedPetId: FIXTURE_PET_ID,
    inFrame: true,
    occluded: false,
    corrupted: false,
    bodyPixelSpan,
    rawMotionPixels: bodyRelativeMotion * bodyPixelSpan,
    trackedBodyCoverage: 0.9,
    visibleBodyCoverage: 0.9,
    cameraMotion: 0.04,
    blur: 0.05,
    light: 0.9,
    orientationDelta: 2,
    turn: false,
    ...overrides
  };
}

export const SYNTHETIC_ENVIRONMENTS = Object.freeze({
  brightIndoor: precisionVideo("bright-indoor"),
  dimIndoor: precisionVideo("dim-indoor", {
    technicalFrames: precisionVideo("dim-source").technicalFrames.map((item) => ({ ...item, light: 0.35 }))
  }),
  outdoor: precisionVideo("outdoor", { deviceClass: "synthetic-outdoor" }),
  staticCamera: precisionVideo("static-camera", {
    technicalFrames: precisionVideo("static-source").technicalFrames.map((item) => ({ ...item, cameraMotion: 0.01 }))
  }),
  handheld: precisionVideo("handheld", {
    technicalFrames: precisionVideo("handheld-source").technicalFrames.map((item) => ({ ...item, cameraMotion: 0.32 }))
  }),
  partialOcclusion: precisionVideo("partial-occlusion", {
    technicalFrames: precisionVideo("occlusion-source").technicalFrames.map((item, index) => index < 5
      ? { ...item, occluded: true, visibleBodyCoverage: 0.25 }
      : item)
  }),
  shortRecording: precisionVideo("short-recording", {
    durationMs: 2_000,
    technicalFrames: precisionVideo("short-source").technicalFrames.slice(0, 4)
  }),
  longRecording: precisionVideo("long-recording", {
    durationMs: 30_000,
    technicalFrames: Array.from({ length: 3 }, () => precisionVideo("long-source").technicalFrames).flat()
  }),
  petNear: scaledDistanceVideo("pet-near", 220),
  petFar: scaledDistanceVideo("pet-far", 55)
});

function scaledDistanceVideo(id, bodyPixelSpan) {
  const source = precisionVideo(`${id}-source`);
  return precisionVideo(id, {
    technicalFrames: source.technicalFrames.map((item) => ({
      ...item,
      bodyPixelSpan,
      rawMotionPixels: (item.rawMotionPixels / item.bodyPixelSpan) * bodyPixelSpan
    }))
  });
}
