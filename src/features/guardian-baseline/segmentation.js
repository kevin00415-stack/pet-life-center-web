export const MOTION_SEGMENT_TYPES = Object.freeze(["REST", "MOVEMENT", "TRANSITION", "TURN", "UNKNOWN"]);

export function segmentMotion(frames, { shortInterruptionMs = 250 } = {}) {
  const atomic = frames.map((frame) => ({
    type: classify(frame),
    startFrame: frame.index,
    endFrame: frame.index,
    durationMs: frame.durationMs,
    confidence: confidence(frame)
  }));
  const bridged = atomic.map((segment, index) => {
    if (segment.type !== "UNKNOWN" || segment.durationMs > shortInterruptionMs) return segment;
    const before = atomic[index - 1];
    const after = atomic[index + 1];
    return before && after && before.type === after.type ? { ...segment, type: before.type, confidence: 0.5 } : segment;
  });
  const merged = [];
  for (const segment of bridged) {
    const previous = merged.at(-1);
    if (previous?.type === segment.type) {
      previous.endFrame = segment.endFrame;
      previous.confidence = weighted(previous.confidence, previous.durationMs, segment.confidence, segment.durationMs);
      previous.durationMs += segment.durationMs;
    } else merged.push({ ...segment });
  }
  return Object.freeze(merged.map((segment) => Object.freeze(segment)));
}

function classify(frame) {
  if (!frame.usable || !Number.isFinite(frame.normalizedMotion)) return "UNKNOWN";
  if (frame.turn) return "TURN";
  if (frame.normalizedMotion <= 0.12) return "REST";
  if (frame.normalizedMotion <= 0.4) return "TRANSITION";
  return "MOVEMENT";
}

function confidence(frame) {
  if (!frame.usable || !Number.isFinite(frame.normalizedMotion)) return 0;
  return Math.max(0, Math.min(1, frame.visibleBodyCoverage * (1 - frame.cameraMotion)));
}

function weighted(a, aWeight, b, bWeight) {
  return (a * aWeight + b * bWeight) / (aWeight + bWeight);
}
