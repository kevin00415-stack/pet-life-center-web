import assert from 'node:assert/strict'
import test from 'node:test'

import {
  SIGNAL_IDS,
  SPEED_PACE_SENSITIVE_SIGNALS,
  canonicalStringify,
  canonicalize,
  compareMotionEvidence,
  symmetricRelativeDifference,
} from '../src/comparison-engine.mjs'

const LANDMARK_KEYS = [
  'HEAD', 'NOSE', 'NECK', 'LEFT_SHOULDER', 'RIGHT_SHOULDER',
  'SPINE_FRONT', 'SPINE_MID', 'SPINE_REAR', 'LEFT_HIP', 'RIGHT_HIP',
  'BODY_CENTER', 'FRONT_LEFT_ELBOW', 'FRONT_LEFT_WRIST', 'FRONT_LEFT_PAW',
  'FRONT_RIGHT_ELBOW', 'FRONT_RIGHT_WRIST', 'FRONT_RIGHT_PAW',
  'REAR_LEFT_KNEE', 'REAR_LEFT_ANKLE', 'REAR_LEFT_PAW', 'REAR_RIGHT_KNEE',
  'REAR_RIGHT_ANKLE', 'REAR_RIGHT_PAW', 'TAIL_BASE', 'TAIL_MID', 'TAIL_TIP',
]

function makeCapture() {
  return {
    viewpoint: 'LEFT_LATERAL',
    orientation: 'LEFTWARD',
    cameraMotion: 'BELOW_SUPPRESSION_GATE',
    activityState: 'STANDING',
    speedPace: 'STATIONARY',
    speedPaceAlignedIntervals: true,
    leash: 'ABSENT',
    surface: 'HARD_LEVEL',
    ownerInteraction: 'NONE_OBSERVED',
    lighting: 'ADEQUATE_STABLE',
    occlusion: 'NONE_OR_MINIMAL',
    detectorStability: 'STABLE',
    frameTiming: 'VALID_MONOTONIC',
    clipDuration: 'MEETS_APPROVED_MINIMUM',
    frameCoverage: 'MEETS_APPROVED_MINIMUM',
    animalVisibility: 'WHOLE_BODY',
    bodyScale: 'VALIDATED_STABLE_REFERENCE',
    poseEvidenceCoverage: 'MEETS_APPROVED_MINIMUM',
  }
}

function makeLandmarks() {
  return Object.fromEntries(LANDMARK_KEYS.map((key, index) => [key, {
    state: 'OBSERVED',
    x: (index + 1) / 30,
    y: (index + 2) / 31,
    confidence: 0.8,
  }]))
}

function makeSignals(offset = 0) {
  return Object.fromEntries(SIGNAL_IDS.map((signalId, index) => [signalId, {
    availability: 'OBSERVED',
    value: index + 1 + offset,
    unit: 'normalized_technical_unit',
  }]))
}

function makeFrame(index, offset = 0) {
  return {
    frameIndex: index,
    timestampMs: index * 100,
    usable: true,
    rejectedReason: null,
    detectorMiss: false,
    cameraMotionSuppressed: false,
    sideAmbiguous: false,
    ownerInteraction: 'NONE_OBSERVED',
    landmarks: makeLandmarks(),
    signals: makeSignals(offset),
  }
}

function makeEvidence(id, offset = 0) {
  return {
    evidenceId: id,
    contractVersion: 'guardian-motion-contract-v1',
    motionDigest: `digest-${id}`,
    timestamp: id === 'baseline' ? '2026-01-01T00:00:00.000Z' : '2026-02-01T00:00:00.000Z',
    versions: {
      detector: 'detector-v1',
      poseProvider: 'pose-provider-v1',
      model: 'model-v1',
      adapter: 'adapter-v1',
      skeleton: 'guardian-motion-skeleton-v2',
      geometry: 'guardian-motion-geometry-v2',
      temporal: 'guardian-motion-temporal-v1',
    },
    capture: makeCapture(),
    frames: [makeFrame(0, offset), makeFrame(1, offset), makeFrame(2, offset)],
  }
}

function makeRequest(offset = 0) {
  return {
    contractVersion: 'guardian-motion-comparison-request-v1',
    comparisonId: 'comparison-001',
    petIdentityRef: {
      petRef: 'pet-opaque-001',
      baselineIdentityReceipt: { receiptId: 'receipt-a', petRef: 'pet-opaque-001', status: 'CONFIRMED' },
      followupIdentityReceipt: { receiptId: 'receipt-b', petRef: 'pet-opaque-001', status: 'CONFIRMED' },
    },
    baselineEvidence: makeEvidence('baseline', 0),
    followupEvidence: makeEvidence('followup', offset),
  }
}

function getSignal(output, signalId) {
  return output.directionalChanges.find((entry) => entry.signalId === signalId)
}

function swapRequest(request) {
  const swapped = structuredClone(request)
  swapped.comparisonId = `${request.comparisonId}-swapped`
  ;[swapped.baselineEvidence, swapped.followupEvidence] = [swapped.followupEvidence, swapped.baselineEvidence]
  ;[swapped.petIdentityRef.baselineIdentityReceipt, swapped.petIdentityRef.followupIdentityReceipt]
    = [swapped.petIdentityRef.followupIdentityReceipt, swapped.petIdentityRef.baselineIdentityReceipt]
  return swapped
}

test('1. A/A comparison is deterministic and zero without claiming STABLE', () => {
  const request = makeRequest()
  request.followupEvidence = structuredClone(request.baselineEvidence)
  const first = compareMotionEvidence(request)
  const second = compareMotionEvidence(structuredClone(request))
  assert.deepEqual(first, second)
  for (const signal of first.directionalChanges) {
    assert.notEqual(signal.direction, 'STABLE')
    if (signal.absoluteDifference.availability === 'OBSERVED') assert.equal(signal.absoluteDifference.value, 0)
  }
})

test('2. A/B versus B/A preserves eligibility and reverses absolute difference', () => {
  const request = makeRequest(4)
  const forward = compareMotionEvidence(request)
  const reverse = compareMotionEvidence(swapRequest(request))
  for (const signalId of SIGNAL_IDS) {
    const a = getSignal(forward, signalId)
    const b = getSignal(reverse, signalId)
    assert.equal(a.comparability, b.comparability)
    assert.equal(a.direction, b.direction)
    assert.equal(a.absoluteDifference.availability, b.absoluteDifference.availability)
    if (a.absoluteDifference.availability === 'OBSERVED') assert.equal(a.absoluteDifference.value, -b.absoluteDifference.value)
  }
})

test('3. cross-pet comparison is rejected', () => {
  const request = makeRequest()
  request.petIdentityRef.followupIdentityReceipt.petRef = 'different-pet'
  const output = compareMotionEvidence(request)
  assert.equal(output.status, 'COMPARISON_REJECTED')
  assert.deepEqual(output.reasonCodes, ['PET_IDENTITY_NOT_CONFIRMED'])
})

test('4. provider mismatch is rejected', () => {
  const request = makeRequest()
  request.followupEvidence.versions.poseProvider = 'pose-provider-v2'
  assert.deepEqual(compareMotionEvidence(request).reasonCodes, ['ESTIMATOR_POLICY_MISMATCH'])
})

test('5. model mismatch is rejected', () => {
  const request = makeRequest()
  request.followupEvidence.versions.model = 'model-v2'
  assert.deepEqual(compareMotionEvidence(request).reasonCodes, ['ESTIMATOR_POLICY_MISMATCH'])
})

test('6. bbox-only body scale blocks every scale-dependent signal', () => {
  const request = makeRequest()
  request.baselineEvidence.capture.bodyScale = 'BBOX_DERIVED_ONLY'
  const output = compareMotionEvidence(request)
  for (const signalId of ['BODY_CENTER_DISPLACEMENT', 'OBSERVABLE_LANDMARK_DISPLACEMENT', 'FRONT_LIMB_MOVEMENT_EVIDENCE', 'REAR_LIMB_MOVEMENT_EVIDENCE']) {
    const signal = getSignal(output, signalId)
    assert.equal(signal.direction, 'NOT_COMPARABLE')
    assert.ok(signal.reasonCodes.includes('BODY_SCALE_REFERENCE_UNSTABLE'))
  }
})

test('7. low frame coverage cannot emit direction', () => {
  const request = makeRequest(100)
  request.followupEvidence.capture.frameCoverage = 'BELOW_APPROVED_MINIMUM'
  const output = compareMotionEvidence(request)
  assert.ok(output.reasonCodes.includes('COVERAGE_BELOW_APPROVED_MINIMUM'))
  assert.ok(output.directionalChanges.every((signal) => ['INDETERMINATE', 'NOT_COMPARABLE'].includes(signal.direction)))
})

test('8. missing neutral policy cannot emit STABLE', () => {
  const output = compareMotionEvidence(makeRequest())
  assert.ok(output.directionalChanges.every((signal) => signal.direction !== 'STABLE'))
  assert.ok(output.reasonCodes.includes('POLICY_VALUE_REQUIRED'))
})

test('9. arbitrarily large delta plus missing policy cannot emit direction', () => {
  const output = compareMotionEvidence(makeRequest(1_000_000))
  assert.ok(output.directionalChanges.every((signal) => !['INCREASED', 'DECREASED', 'STABLE'].includes(signal.direction)))
})

test('10. UNKNOWN capture state fails closed', () => {
  const request = makeRequest()
  request.followupEvidence.capture.lighting = 'UNKNOWN'
  const output = compareMotionEvidence(request)
  assert.equal(output.captureComparability.level, 'NOT_COMPARABLE')
  assert.ok(output.reasonCodes.includes('CAPTURE_POLICY_UNRESOLVED'))
})

test('11. CUE_ONLY intervals are excluded from aggregation', () => {
  const request = makeRequest()
  request.baselineEvidence.frames[0].ownerInteraction = 'CUE_ONLY'
  request.baselineEvidence.frames[0].signals.GEOMETRY_AVAILABILITY.value = 999
  const output = compareMotionEvidence(request)
  assert.equal(output.evidenceCoverage.baseline.cueRejectedFrames, 1)
  assert.equal(getSignal(output, 'GEOMETRY_AVAILABILITY').baseline.value, 9)
  assert.ok(output.reasonCodes.includes('OWNER_CUE_PRESENT'))
})

test('12. coverage is recalculated after cue removal', () => {
  const request = makeRequest()
  request.baselineEvidence.frames[1].ownerInteraction = 'CUE_ONLY'
  const coverage = compareMotionEvidence(request).evidenceCoverage.baseline
  assert.equal(coverage.expectedFrames, 3)
  assert.equal(coverage.usableFrames, 2)
  assert.equal(coverage.rejectedFrames, 1)
  assert.equal(coverage.usableFrameCoverage, 2 / 3)
})

test('13. pace mismatch blocks all pace-sensitive signals including micro-fix additions', () => {
  const request = makeRequest()
  request.baselineEvidence.capture.activityState = 'WALKING_MOVING'
  request.followupEvidence.capture.activityState = 'WALKING_MOVING'
  request.baselineEvidence.capture.speedPace = 'SLOW'
  request.followupEvidence.capture.speedPace = 'FAST'
  const output = compareMotionEvidence(request)
  for (const signalId of SPEED_PACE_SENSITIVE_SIGNALS) {
    const signal = getSignal(output, signalId)
    assert.ok(signal.reasonCodes.includes('SPEED_PACE_MISMATCH'))
    assert.equal(signal.direction, 'NOT_COMPARABLE')
  }
  assert.ok(SPEED_PACE_SENSITIVE_SIGNALS.includes('BODY_AXIS_VARIATION'))
  assert.ok(SPEED_PACE_SENSITIVE_SIGNALS.includes('LEFT_RIGHT_MOVEMENT_DIFFERENCE'))
})

test('14. UNKNOWN pace blocks pace-sensitive signals', () => {
  const request = makeRequest()
  request.followupEvidence.capture.speedPace = 'UNKNOWN'
  const output = compareMotionEvidence(request)
  assert.ok(getSignal(output, 'TEMPORAL_CONTINUITY').reasonCodes.includes('SPEED_PACE_POLICY_REQUIRED'))
  assert.equal(getSignal(output, 'TEMPORAL_CONTINUITY').direction, 'NOT_COMPARABLE')
})

test('15. VARIABLE pace without aligned intervals blocks pace-sensitive signals', () => {
  const request = makeRequest()
  request.baselineEvidence.capture.speedPace = 'VARIABLE'
  request.followupEvidence.capture.speedPace = 'VARIABLE'
  request.followupEvidence.capture.speedPaceAlignedIntervals = false
  const output = compareMotionEvidence(request)
  assert.ok(getSignal(output, 'POSE_TRANSITION_EVIDENCE').reasonCodes.includes('SPEED_PACE_POLICY_REQUIRED'))
})

test('16. camera-motion suppression propagates to displacement signals', () => {
  const request = makeRequest()
  request.followupEvidence.frames[1].cameraMotionSuppressed = true
  request.followupEvidence.capture.cameraMotion = 'SUPPRESSION_ACTIVE'
  const output = compareMotionEvidence(request)
  assert.equal(output.evidenceCoverage.followup.cameraMotionSuppressedFrames, 1)
  assert.ok(getSignal(output, 'BODY_CENTER_DISPLACEMENT').reasonCodes.includes('CAMERA_MOTION_RISK'))
})

test('17. detector misses remain in the coverage denominator', () => {
  const request = makeRequest()
  request.followupEvidence.frames[0].detectorMiss = true
  request.followupEvidence.capture.detectorStability = 'MISS_PRESENT'
  const coverage = compareMotionEvidence(request).evidenceCoverage.followup
  assert.equal(coverage.expectedFrames, 3)
  assert.equal(coverage.detectorMissFrames, 1)
  assert.equal(coverage.usableFrames, 2)
  assert.equal(coverage.detectorMissRate, 1 / 3)
})

test('18. side ambiguity is accounted and blocks side-dependent signals', () => {
  const request = makeRequest()
  request.baselineEvidence.frames[2].sideAmbiguous = true
  const output = compareMotionEvidence(request)
  assert.equal(output.evidenceCoverage.baseline.sideAmbiguousFrames, 1)
  assert.ok(getSignal(output, 'LEFT_RIGHT_MOVEMENT_DIFFERENCE').reasonCodes.includes('ANATOMICAL_SIDE_AMBIGUOUS'))
})

test('19. sparse evidence cannot inflate landmark coverage', () => {
  const request = makeRequest()
  for (const evidence of [request.baselineEvidence, request.followupEvidence]) {
    for (const frame of evidence.frames) {
      for (const key of LANDMARK_KEYS.slice(1)) frame.landmarks[key] = { state: 'UNKNOWN', x: null, y: null, confidence: 0 }
    }
  }
  const overlap = compareMotionEvidence(request).evidenceCoverage.overlap
  assert.equal(overlap.expectedLandmarkCount, 26)
  assert.equal(overlap.overlappingLandmarkCount, 1)
  assert.equal(overlap.observedOverlapCoverage, 1 / 26)
})

test('20. forbidden product metadata is rejected recursively', () => {
  const request = makeRequest()
  request.study = { productBrand: 'forbidden-value' }
  const output = compareMotionEvidence(request)
  assert.equal(output.status, 'COMPARISON_REJECTED')
  assert.deepEqual(output.reasonCodes, ['PRODUCT_CONTEXT_FORBIDDEN'])
})

test('21. forbidden medical metadata is rejected recursively', () => {
  const request = makeRequest()
  request.research = { healthScore: 10 }
  const output = compareMotionEvidence(request)
  assert.equal(output.status, 'COMPARISON_REJECTED')
  assert.deepEqual(output.reasonCodes, ['MEDICAL_CONTEXT_FORBIDDEN'])
})

test('22. relative-difference availability is symmetric while threshold is unapproved', () => {
  const forward = symmetricRelativeDifference(2, 5)
  const reverse = symmetricRelativeDifference(5, 2)
  assert.equal(forward.availability, reverse.availability)
  assert.equal(forward.value, null)
  assert.equal(reverse.value, null)
  assert.deepEqual(forward.reasonCodes, reverse.reasonCodes)
})

test('23. canonicalization normalizes negative zero', () => {
  const canonical = canonicalize({ value: -0, nested: [-0] })
  assert.equal(Object.is(canonical.value, -0), false)
  assert.equal(Object.is(canonical.nested[0], -0), false)
  assert.equal(canonicalStringify({ value: -0 }), '{"value":0}')
})

test('24. rounding-tie-like inputs remain symmetric and fail closed', () => {
  const request = makeRequest()
  for (const frame of request.baselineEvidence.frames) frame.signals.GEOMETRY_AVAILABILITY.value = 1.005
  for (const frame of request.followupEvidence.frames) frame.signals.GEOMETRY_AVAILABILITY.value = 1.015
  const forward = getSignal(compareMotionEvidence(request), 'GEOMETRY_AVAILABILITY')
  const reverse = getSignal(compareMotionEvidence(swapRequest(request)), 'GEOMETRY_AVAILABILITY')
  assert.equal(forward.direction, 'INDETERMINATE')
  assert.equal(reverse.direction, 'INDETERMINATE')
  assert.equal(forward.absoluteDifference.value, -reverse.absoluteDifference.value)
})

test('25. UNKNOWN signal value remains null and never becomes zero', () => {
  const request = makeRequest()
  for (const frame of request.baselineEvidence.frames) {
    frame.signals.GEOMETRY_AVAILABILITY = { availability: 'UNKNOWN', value: null, unit: 'normalized_technical_unit' }
  }
  const signal = getSignal(compareMotionEvidence(request), 'GEOMETRY_AVAILABILITY')
  assert.equal(signal.baseline.availability, 'UNKNOWN')
  assert.equal(signal.baseline.value, null)
  assert.equal(signal.absoluteDifference.value, null)
})

test('26. input allowlist rejects unknown non-forbidden fields', () => {
  const request = makeRequest()
  request.extra = 'not allowed'
  assert.deepEqual(compareMotionEvidence(request).reasonCodes, ['INPUT_FIELD_NOT_ALLOWED'])
})

test('27. motion contract schema mismatch is rejected', () => {
  const request = makeRequest()
  request.followupEvidence.contractVersion = 'guardian-motion-contract-v2'
  assert.deepEqual(compareMotionEvidence(request).reasonCodes, ['SCHEMA_INCOMPATIBLE'])
})

test('28. coverage ledger retains every rejected and unavailable opportunity', () => {
  const request = makeRequest()
  request.baselineEvidence.frames[0].detectorMiss = true
  request.baselineEvidence.frames[1].ownerInteraction = 'PHYSICAL_CONTACT'
  request.baselineEvidence.frames[2].landmarks.TAIL_TIP = { state: 'OUT_OF_FRAME', x: null, y: null, confidence: 0 }
  const coverage = compareMotionEvidence(request).evidenceCoverage.baseline
  assert.equal(coverage.expectedFrames, 3)
  assert.equal(coverage.usableFrames, 1)
  assert.equal(coverage.rejectedFrames, 2)
  assert.equal(coverage.outOfFrameLandmarks, 1)
  assert.equal(coverage.expectedLandmarkOpportunities, 78)
})

test('29. forbidden context in an otherwise allowed scalar field is rejected', () => {
  const request = makeRequest()
  request.comparisonId = 'treatment-arm-a'
  assert.deepEqual(compareMotionEvidence(request).reasonCodes, ['PRODUCT_CONTEXT_FORBIDDEN'])
})

test('30. capture-level owner cue without localized intervals fails closed', () => {
  const request = makeRequest()
  request.followupEvidence.capture.ownerInteraction = 'CUE_ONLY'
  const output = compareMotionEvidence(request)
  assert.ok(output.reasonCodes.includes('OWNER_CUE_PRESENT'))
  assert.ok(output.reasonCodes.includes('CAPTURE_POLICY_UNRESOLVED'))
  assert.equal(getSignal(output, 'BODY_CENTER_DISPLACEMENT').direction, 'NOT_COMPARABLE')
})
