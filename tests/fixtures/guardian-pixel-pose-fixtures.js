export function pixelFrame({ width = 32, height = 24, timestampMs = 0, rectangles = [{ x: 6, y: 6, width: 20, height: 12, color: [40, 60, 80] }] } = {}) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) rgba.set([245, 245, 245, 255], pixel * 4);
  for (const rectangle of rectangles) for (let y = rectangle.y; y < rectangle.y + rectangle.height; y += 1) for (let x = rectangle.x; x < rectangle.x + rectangle.width; x += 1) rgba.set([...rectangle.color, 255], (y * width + x) * 4);
  return { width, height, timestampMs, durationMs: 100, rgba };
}

export function localVideoFile(overrides = {}) {
  return {
    name: "authorized-local.mp4", type: "video/mp4", size: 4096,
    authorizedPixelFrames: [pixelFrame({ timestampMs: 0 }), pixelFrame({ timestampMs: 100 }), pixelFrame({ timestampMs: 200 })],
    ...overrides
  };
}

export function targetDescriptor(overrides = {}) {
  return {
    descriptorVersion: "guardian-local-target-descriptor-v1",
    petId: "pet-pixel",
    signature: { meanColor: { r: 40, g: 60, b: 80 }, aspectRatio: 1.666667, areaRatio: 0.3125 },
    heading: "RIGHT",
    anatomicalSide: { status: "RESOLVED", confidence: 0.95, identityToken: "pixel-side-map-1" },
    ...overrides
  };
}

export function localPoseRequest(overrides = {}) {
  const petId = overrides.petId ?? "pet-pixel";
  const videoId = overrides.videoId ?? "video-pixel";
  return {
    analysisRunId: "analysis-pixel", petId, videoId, species: "DOG", localVideoFile: localVideoFile(), targetDescriptor: targetDescriptor({ petId }),
    identityReceipt: { id: "identity-pixel", petId, videoId, state: "MATCH", accepted: true },
    ...overrides
  };
}
