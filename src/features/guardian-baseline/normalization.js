const DEFAULT_FRAME_DURATION_MS = 1000 / 30;

export function normalizeTechnicalFrames(video) {
  const source = Array.isArray(video?.technicalFrames) ? video.technicalFrames : [];
  const frames = source.map((frame, index) => normalizeFrame(frame, index));
  const totalDurationMs = positive(video?.durationMs) || sum(frames.map((frame) => frame.durationMs));
  const tracked = frames.filter((frame) => frame.inFrame && frame.trackedPetId === video?.petId);
  const usable = frames.filter((frame) => frame.usable);
  const trackedDuration = sum(tracked.map((frame) => frame.durationMs));
  const usableDuration = sum(usable.map((frame) => frame.durationMs));
  const visibleDuration = sum(frames.map((frame) => frame.visibleBodyCoverage * frame.durationMs));
  const occludedDuration = sum(frames.filter((frame) => frame.occluded).map((frame) => frame.durationMs));
  const outDuration = sum(frames.filter((frame) => !frame.inFrame).map((frame) => frame.durationMs));
  const corruptedDuration = sum(frames.filter((frame) => frame.corrupted).map((frame) => frame.durationMs));
  const expectedPetId = video?.petId;
  const foreignIdentity = frames.some((frame) => frame.trackedPetId && frame.trackedPetId !== expectedPetId);
  const trackedRuns = contiguousRuns(frames, (frame) => frame.inFrame && frame.trackedPetId === expectedPetId);
  const longestTracked = Math.max(0, ...trackedRuns.map((run) => sum(run.map((frame) => frame.durationMs))));

  return Object.freeze({
    frames: Object.freeze(frames),
    trackingMetrics: Object.freeze({
      totalDurationMs,
      usableDurationMs: usableDuration,
      trackingCoverage: ratio(trackedDuration, totalDurationMs),
      trackingContinuity: ratio(longestTracked, totalDurationMs),
      visibleBodyCoverage: ratio(visibleDuration, totalDurationMs),
      usableFrameRatio: ratio(usableDuration, totalDurationMs),
      cameraMotionRisk: weightedMean(frames, "cameraMotion", totalDurationMs),
      occlusionRatio: ratio(occludedDuration, totalDurationMs),
      outOfFrameRatio: ratio(outDuration, totalDurationMs),
      corruptionRatio: ratio(corruptedDuration, totalDurationMs),
      blurRisk: weightedMean(frames, "blur", totalDurationMs),
      lowLightRisk: 1 - weightedMean(frames, "light", totalDurationMs),
      orientationInstability: weightedMean(frames, "orientationRisk", totalDurationMs),
      identitySwitchDetected: foreignIdentity
    })
  });
}

function normalizeFrame(frame = {}, index) {
  const durationMs = positive(frame.durationMs) || DEFAULT_FRAME_DURATION_MS;
  const bodySpan = positive(frame.bodyPixelSpan);
  const normalizedMotion = finite(frame.bodyRelativeMotion)
    ? frame.bodyRelativeMotion
    : finite(frame.motion) ? frame.motion
      : finite(frame.rawMotionPixels) && bodySpan ? frame.rawMotionPixels / bodySpan : null;
  const inFrame = frame.inFrame !== false;
  const corrupted = frame.corrupted === true;
  const visibleBodyCoverage = clamp01(finite(frame.visibleBodyCoverage)
    ? frame.visibleBodyCoverage
    : finite(frame.trackedBodyCoverage) ? frame.trackedBodyCoverage : inFrame ? 1 : 0);
  const trackedPetId = frame.trackedPetId ?? null;
  return Object.freeze({
    index,
    durationMs,
    usable: frame.usable === true && inFrame && !corrupted,
    trackedPetId,
    inFrame,
    occluded: frame.occluded === true,
    corrupted,
    normalizedMotion,
    motionAvailability: frame.motionAvailability ?? null,
    trackedBodyCoverage: finite(frame.trackedBodyCoverage) ? clamp01(frame.trackedBodyCoverage) : null,
    visibleBodyCoverage,
    cameraMotion: clamp01(finite(frame.cameraMotion) ? frame.cameraMotion : 0),
    blur: clamp01(finite(frame.blur) ? frame.blur : 0),
    light: clamp01(finite(frame.light) ? frame.light : 1),
    orientationRisk: clamp01(Math.abs(finite(frame.orientationDelta) ? frame.orientationDelta : 0) / 45),
    turn: frame.turn === true
  });
}

function contiguousRuns(items, predicate) {
  const runs = [];
  let current = [];
  for (const item of items) {
    if (predicate(item)) current.push(item);
    else if (current.length) {
      runs.push(current);
      current = [];
    }
  }
  if (current.length) runs.push(current);
  return runs;
}

function weightedMean(frames, key, duration) {
  return duration ? sum(frames.map((frame) => frame[key] * frame.durationMs)) / duration : 0;
}

function ratio(value, total) { return total ? clamp01(value / total) : 0; }
function finite(value) { return Number.isFinite(value); }
function positive(value) { return finite(value) && value > 0 ? value : 0; }
function sum(values) { return values.reduce((total, value) => total + value, 0); }
function clamp01(value) { return Math.max(0, Math.min(1, value)); }
