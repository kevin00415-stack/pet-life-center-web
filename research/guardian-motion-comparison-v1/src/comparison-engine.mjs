const CONTRACT_VERSION = 'guardian-motion-comparison-v1'
const REQUEST_VERSION = 'guardian-motion-comparison-request-v1'

export const SIGNAL_IDS = Object.freeze([
  'BODY_AXIS_VARIATION',
  'BODY_CENTER_DISPLACEMENT',
  'OBSERVABLE_LANDMARK_DISPLACEMENT',
  'FRONT_LIMB_MOVEMENT_EVIDENCE',
  'REAR_LIMB_MOVEMENT_EVIDENCE',
  'LEFT_RIGHT_MOVEMENT_DIFFERENCE',
  'TEMPORAL_CONTINUITY',
  'POSE_TRANSITION_EVIDENCE',
  'GEOMETRY_AVAILABILITY',
  'MOTION_EVIDENCE_COVERAGE',
])

export const SPEED_PACE_SENSITIVE_SIGNALS = Object.freeze([
  'BODY_AXIS_VARIATION',
  'BODY_CENTER_DISPLACEMENT',
  'OBSERVABLE_LANDMARK_DISPLACEMENT',
  'FRONT_LIMB_MOVEMENT_EVIDENCE',
  'REAR_LIMB_MOVEMENT_EVIDENCE',
  'LEFT_RIGHT_MOVEMENT_DIFFERENCE',
  'TEMPORAL_CONTINUITY',
  'POSE_TRANSITION_EVIDENCE',
])

const SCALE_DEPENDENT_SIGNALS = new Set([
  'BODY_CENTER_DISPLACEMENT',
  'OBSERVABLE_LANDMARK_DISPLACEMENT',
  'FRONT_LIMB_MOVEMENT_EVIDENCE',
  'REAR_LIMB_MOVEMENT_EVIDENCE',
])

const DISPLACEMENT_SIGNALS = new Set([
  'BODY_CENTER_DISPLACEMENT',
  'OBSERVABLE_LANDMARK_DISPLACEMENT',
  'FRONT_LIMB_MOVEMENT_EVIDENCE',
  'REAR_LIMB_MOVEMENT_EVIDENCE',
  'TEMPORAL_CONTINUITY',
])

const SIDE_DEPENDENT_SIGNALS = new Set([
  'FRONT_LIMB_MOVEMENT_EVIDENCE',
  'REAR_LIMB_MOVEMENT_EVIDENCE',
  'LEFT_RIGHT_MOVEMENT_DIFFERENCE',
])

const OWNER_SENSITIVE_SIGNALS = new Set([
  'BODY_AXIS_VARIATION',
  'BODY_CENTER_DISPLACEMENT',
  'OBSERVABLE_LANDMARK_DISPLACEMENT',
  'FRONT_LIMB_MOVEMENT_EVIDENCE',
  'REAR_LIMB_MOVEMENT_EVIDENCE',
  'LEFT_RIGHT_MOVEMENT_DIFFERENCE',
  'TEMPORAL_CONTINUITY',
  'POSE_TRANSITION_EVIDENCE',
])

const LANDMARK_KEYS = Object.freeze([
  'HEAD', 'NOSE', 'NECK', 'LEFT_SHOULDER', 'RIGHT_SHOULDER',
  'SPINE_FRONT', 'SPINE_MID', 'SPINE_REAR', 'LEFT_HIP', 'RIGHT_HIP',
  'BODY_CENTER', 'FRONT_LEFT_ELBOW', 'FRONT_LEFT_WRIST', 'FRONT_LEFT_PAW',
  'FRONT_RIGHT_ELBOW', 'FRONT_RIGHT_WRIST', 'FRONT_RIGHT_PAW',
  'REAR_LEFT_KNEE', 'REAR_LEFT_ANKLE', 'REAR_LEFT_PAW', 'REAR_RIGHT_KNEE',
  'REAR_RIGHT_ANKLE', 'REAR_RIGHT_PAW', 'TAIL_BASE', 'TAIL_MID', 'TAIL_TIP',
])

const VERSION_KEYS = Object.freeze([
  'detector', 'poseProvider', 'model', 'adapter', 'skeleton', 'geometry', 'temporal',
])

const CAPTURE_STATES = Object.freeze({
  viewpoint: new Set(['LEFT_LATERAL', 'RIGHT_LATERAL', 'FRONT', 'REAR', 'OBLIQUE_LEFT', 'OBLIQUE_RIGHT', 'TOP', 'UNKNOWN']),
  orientation: new Set(['LEFTWARD', 'RIGHTWARD', 'TOWARD_CAMERA', 'AWAY_FROM_CAMERA', 'MIXED', 'UNKNOWN']),
  cameraMotion: new Set(['BELOW_SUPPRESSION_GATE', 'SUPPRESSION_ACTIVE', 'UNKNOWN']),
  activityState: new Set(['STANDING', 'SITTING', 'WALKING_MOVING', 'TRANSITION', 'MIXED', 'UNKNOWN']),
  speedPace: new Set(['STATIONARY', 'SLOW', 'MODERATE', 'FAST', 'VARIABLE', 'UNKNOWN']),
  leash: new Set(['ABSENT', 'PRESENT_NONINFLUENCING', 'PRESENT_INFLUENCING', 'UNKNOWN']),
  surface: new Set(['HARD_LEVEL', 'SOFT_LEVEL', 'SLIPPERY', 'UNEVEN', 'INCLINED', 'UNKNOWN']),
  ownerInteraction: new Set(['NONE_OBSERVED', 'CUE_ONLY', 'PHYSICAL_CONTACT', 'OBSTRUCTION', 'UNKNOWN']),
  lighting: new Set(['ADEQUATE_STABLE', 'ADEQUATE_VARIABLE', 'LOW', 'BACKLIT', 'UNKNOWN']),
  occlusion: new Set(['NONE_OR_MINIMAL', 'PARTIAL', 'HEAVY', 'UNKNOWN']),
  detectorStability: new Set(['STABLE', 'UNSTABLE', 'MISS_PRESENT', 'UNKNOWN']),
  frameTiming: new Set(['VALID_MONOTONIC', 'VALID_VARIABLE_RATE', 'INVALID', 'UNKNOWN']),
  clipDuration: new Set(['MEETS_APPROVED_MINIMUM', 'BELOW_APPROVED_MINIMUM', 'UNKNOWN']),
  frameCoverage: new Set(['MEETS_APPROVED_MINIMUM', 'BELOW_APPROVED_MINIMUM', 'UNKNOWN']),
  animalVisibility: new Set(['WHOLE_BODY', 'REQUIRED_REGIONS_VISIBLE', 'INSUFFICIENT', 'UNKNOWN']),
  bodyScale: new Set(['VALIDATED_STABLE_REFERENCE', 'BBOX_DERIVED_ONLY', 'UNAVAILABLE', 'UNKNOWN']),
  poseEvidenceCoverage: new Set(['MEETS_APPROVED_MINIMUM', 'BELOW_APPROVED_MINIMUM', 'UNKNOWN']),
})

const FORBIDDEN_KEY_FRAGMENTS = Object.freeze([
  'product', 'brand', 'supplement', 'treatment', 'intervention', 'medication',
  'efficacy', 'effective', 'expectedoutcome', 'medicalimprovement', 'healthscore',
  'painscore', 'diseasescore', 'recoveryscore', 'treatmentgroup',
])

const MEDICAL_KEY_FRAGMENTS = new Set([
  'medical', 'diagnosis', 'health', 'pain', 'disease', 'recovery',
  'medicalimprovement', 'healthscore', 'painscore', 'diseasescore', 'recoveryscore',
])

const TOP_LEVEL_KEYS = new Set([
  'contractVersion', 'comparisonId', 'petIdentityRef', 'baselineEvidence', 'followupEvidence',
])
const IDENTITY_REF_KEYS = new Set(['petRef', 'baselineIdentityReceipt', 'followupIdentityReceipt'])
const RECEIPT_KEYS = new Set(['receiptId', 'petRef', 'status'])
const EVIDENCE_KEYS = new Set(['evidenceId', 'contractVersion', 'motionDigest', 'timestamp', 'versions', 'capture', 'frames'])
const CAPTURE_KEYS = new Set([...Object.keys(CAPTURE_STATES), 'speedPaceAlignedIntervals'])
const FRAME_KEYS = new Set([
  'frameIndex', 'timestampMs', 'usable', 'rejectedReason', 'detectorMiss',
  'cameraMotionSuppressed', 'sideAmbiguous', 'ownerInteraction', 'landmarks', 'signals',
])
const LANDMARK_VALUE_KEYS = new Set(['state', 'x', 'y', 'confidence'])
const SIGNAL_VALUE_KEYS = new Set(['availability', 'value', 'unit'])

class ComparisonInputError extends Error {
  constructor(reasonCode, path) {
    super(`${reasonCode}: ${path}`)
    this.reasonCode = reasonCode
    this.path = path
  }
}

function normalizedKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, '')
}

function scanForbiddenContext(value, path = '$') {
  if (typeof value === 'string') {
    const normalized = normalizedKey(value)
    const medicalFragment = [...MEDICAL_KEY_FRAGMENTS].find((candidate) => normalized.includes(candidate))
    const fragment = medicalFragment ?? FORBIDDEN_KEY_FRAGMENTS.find((candidate) => normalized.includes(candidate))
    if (fragment) {
      throw new ComparisonInputError(
        medicalFragment ? 'MEDICAL_CONTEXT_FORBIDDEN' : 'PRODUCT_CONTEXT_FORBIDDEN',
        path,
      )
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanForbiddenContext(entry, `${path}[${index}]`))
    return
  }
  if (!value || typeof value !== 'object') return

  for (const [key, child] of Object.entries(value)) {
    const normalized = normalizedKey(key)
    const medicalFragment = [...MEDICAL_KEY_FRAGMENTS].find((candidate) => normalized.includes(candidate))
    const fragment = medicalFragment ?? FORBIDDEN_KEY_FRAGMENTS.find((candidate) => normalized.includes(candidate))
    if (fragment) {
      const reasonCode = medicalFragment
        ? 'MEDICAL_CONTEXT_FORBIDDEN'
        : 'PRODUCT_CONTEXT_FORBIDDEN'
      throw new ComparisonInputError(reasonCode, `${path}.${key}`)
    }
    scanForbiddenContext(child, `${path}.${key}`)
  }
}

function assertPlainObject(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ComparisonInputError('INPUT_SCHEMA_INVALID', path)
  }
}

function assertAllowedKeys(value, allowed, path) {
  assertPlainObject(value, path)
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new ComparisonInputError('INPUT_FIELD_NOT_ALLOWED', `${path}.${key}`)
  }
}

function assertString(value, path) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ComparisonInputError('INPUT_SCHEMA_INVALID', path)
  }
}

function validateReceipt(receipt, path) {
  assertAllowedKeys(receipt, RECEIPT_KEYS, path)
  assertString(receipt.receiptId, `${path}.receiptId`)
  assertString(receipt.petRef, `${path}.petRef`)
  if (!['CONFIRMED', 'NOT_CONFIRMED'].includes(receipt.status)) {
    throw new ComparisonInputError('INPUT_SCHEMA_INVALID', `${path}.status`)
  }
}

function validateCapture(capture, path) {
  assertAllowedKeys(capture, CAPTURE_KEYS, path)
  for (const [key, states] of Object.entries(CAPTURE_STATES)) {
    if (!states.has(capture[key])) throw new ComparisonInputError('CAPTURE_STATE_INVALID', `${path}.${key}`)
  }
  if (typeof capture.speedPaceAlignedIntervals !== 'boolean') {
    throw new ComparisonInputError('INPUT_SCHEMA_INVALID', `${path}.speedPaceAlignedIntervals`)
  }
}

function validateFrame(frame, path) {
  assertAllowedKeys(frame, FRAME_KEYS, path)
  if (!Number.isInteger(frame.frameIndex) || !Number.isFinite(frame.timestampMs)) {
    throw new ComparisonInputError('INPUT_SCHEMA_INVALID', path)
  }
  for (const key of ['usable', 'detectorMiss', 'cameraMotionSuppressed', 'sideAmbiguous']) {
    if (typeof frame[key] !== 'boolean') throw new ComparisonInputError('INPUT_SCHEMA_INVALID', `${path}.${key}`)
  }
  if (frame.rejectedReason !== null && typeof frame.rejectedReason !== 'string') {
    throw new ComparisonInputError('INPUT_SCHEMA_INVALID', `${path}.rejectedReason`)
  }
  if (!CAPTURE_STATES.ownerInteraction.has(frame.ownerInteraction)) {
    throw new ComparisonInputError('CAPTURE_STATE_INVALID', `${path}.ownerInteraction`)
  }

  assertPlainObject(frame.landmarks, `${path}.landmarks`)
  for (const [key, landmark] of Object.entries(frame.landmarks)) {
    if (!LANDMARK_KEYS.includes(key)) throw new ComparisonInputError('INPUT_FIELD_NOT_ALLOWED', `${path}.landmarks.${key}`)
    assertAllowedKeys(landmark, LANDMARK_VALUE_KEYS, `${path}.landmarks.${key}`)
    if (!['OBSERVED', 'ESTIMATED', 'UNKNOWN', 'OUT_OF_FRAME', 'OCCLUDED'].includes(landmark.state)) {
      throw new ComparisonInputError('INPUT_SCHEMA_INVALID', `${path}.landmarks.${key}.state`)
    }
    const mustBeNull = landmark.state !== 'OBSERVED'
    if (mustBeNull && (landmark.x !== null || landmark.y !== null)) {
      throw new ComparisonInputError('UNKNOWN_COORDINATE_MUST_BE_NULL', `${path}.landmarks.${key}`)
    }
    if (!mustBeNull && (!Number.isFinite(landmark.x) || !Number.isFinite(landmark.y))) {
      throw new ComparisonInputError('INPUT_SCHEMA_INVALID', `${path}.landmarks.${key}`)
    }
    if (!Number.isFinite(landmark.confidence)) throw new ComparisonInputError('INPUT_SCHEMA_INVALID', `${path}.landmarks.${key}.confidence`)
  }

  assertPlainObject(frame.signals, `${path}.signals`)
  for (const [key, signal] of Object.entries(frame.signals)) {
    if (!SIGNAL_IDS.includes(key)) throw new ComparisonInputError('INPUT_FIELD_NOT_ALLOWED', `${path}.signals.${key}`)
    assertAllowedKeys(signal, SIGNAL_VALUE_KEYS, `${path}.signals.${key}`)
    if (!['OBSERVED', 'UNKNOWN'].includes(signal.availability)) {
      throw new ComparisonInputError('INPUT_SCHEMA_INVALID', `${path}.signals.${key}.availability`)
    }
    if (signal.availability === 'UNKNOWN' && signal.value !== null) {
      throw new ComparisonInputError('UNKNOWN_VALUE_MUST_BE_NULL', `${path}.signals.${key}.value`)
    }
    if (signal.availability === 'OBSERVED' && !Number.isFinite(signal.value)) {
      throw new ComparisonInputError('INPUT_SCHEMA_INVALID', `${path}.signals.${key}.value`)
    }
    assertString(signal.unit, `${path}.signals.${key}.unit`)
  }
}

function validateEvidence(evidence, path) {
  assertAllowedKeys(evidence, EVIDENCE_KEYS, path)
  for (const key of ['evidenceId', 'contractVersion', 'motionDigest', 'timestamp']) assertString(evidence[key], `${path}.${key}`)
  assertAllowedKeys(evidence.versions, new Set(VERSION_KEYS), `${path}.versions`)
  for (const key of VERSION_KEYS) assertString(evidence.versions[key], `${path}.versions.${key}`)
  validateCapture(evidence.capture, `${path}.capture`)
  if (!Array.isArray(evidence.frames) || evidence.frames.length === 0) {
    throw new ComparisonInputError('INPUT_SCHEMA_INVALID', `${path}.frames`)
  }
  evidence.frames.forEach((frame, index) => validateFrame(frame, `${path}.frames[${index}]`))
}

function validateRequest(request) {
  scanForbiddenContext(request)
  assertAllowedKeys(request, TOP_LEVEL_KEYS, '$')
  if (request.contractVersion !== REQUEST_VERSION) throw new ComparisonInputError('SCHEMA_INCOMPATIBLE', '$.contractVersion')
  assertString(request.comparisonId, '$.comparisonId')
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(request.comparisonId)) {
    throw new ComparisonInputError('COMPARISON_ID_INVALID', '$.comparisonId')
  }
  assertAllowedKeys(request.petIdentityRef, IDENTITY_REF_KEYS, '$.petIdentityRef')
  assertString(request.petIdentityRef.petRef, '$.petIdentityRef.petRef')
  validateReceipt(request.petIdentityRef.baselineIdentityReceipt, '$.petIdentityRef.baselineIdentityReceipt')
  validateReceipt(request.petIdentityRef.followupIdentityReceipt, '$.petIdentityRef.followupIdentityReceipt')
  validateEvidence(request.baselineEvidence, '$.baselineEvidence')
  validateEvidence(request.followupEvidence, '$.followupEvidence')
}

function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null
}

function cleanFrames(evidence) {
  const contaminated = new Set(['CUE_ONLY', 'PHYSICAL_CONTACT', 'OBSTRUCTION'])
  return evidence.frames.filter((frame) => frame.usable && !frame.detectorMiss && !contaminated.has(frame.ownerInteraction))
}

function coverageFor(evidence) {
  const clean = cleanFrames(evidence)
  const contaminated = new Set(['CUE_ONLY', 'PHYSICAL_CONTACT', 'OBSTRUCTION'])
  let observedLandmarks = 0
  let unknownLandmarks = 0
  let outOfFrameLandmarks = 0
  let estimatedLandmarks = 0

  for (const frame of evidence.frames) {
    for (const key of LANDMARK_KEYS) {
      const state = frame.landmarks[key]?.state ?? 'UNKNOWN'
      if (state === 'OBSERVED') observedLandmarks += 1
      else if (state === 'OUT_OF_FRAME') outOfFrameLandmarks += 1
      else if (state === 'ESTIMATED') estimatedLandmarks += 1
      else unknownLandmarks += 1
    }
  }

  const expectedLandmarkOpportunities = evidence.frames.length * LANDMARK_KEYS.length
  const cueRejectedFrames = evidence.frames.filter((frame) => contaminated.has(frame.ownerInteraction)).length
  const detectorMissFrames = evidence.frames.filter((frame) => frame.detectorMiss).length
  const sideAmbiguousFrames = evidence.frames.filter((frame) => frame.sideAmbiguous).length
  const cameraMotionSuppressedFrames = evidence.frames.filter((frame) => frame.cameraMotionSuppressed).length
  const rejectedFrames = evidence.frames.length - clean.length

  return {
    expectedFrames: evidence.frames.length,
    usableFrames: clean.length,
    rejectedFrames,
    cueRejectedFrames,
    detectorMissFrames,
    sideAmbiguousFrames,
    cameraMotionSuppressedFrames,
    expectedLandmarkOpportunities,
    observedLandmarks,
    estimatedLandmarks,
    unknownLandmarks,
    outOfFrameLandmarks,
    usableFrameCoverage: ratio(clean.length, evidence.frames.length),
    rejectedFrameRate: ratio(rejectedFrames, evidence.frames.length),
    unknownRate: ratio(unknownLandmarks, expectedLandmarkOpportunities),
    outOfFrameRate: ratio(outOfFrameLandmarks, expectedLandmarkOpportunities),
    detectorMissRate: ratio(detectorMissFrames, evidence.frames.length),
    sideAmbiguityRate: ratio(sideAmbiguousFrames, evidence.frames.length),
    cameraSuppressionRate: ratio(cameraMotionSuppressedFrames, evidence.frames.length),
  }
}

function observedLandmarkSet(evidence) {
  const result = new Set()
  for (const frame of cleanFrames(evidence)) {
    for (const [key, landmark] of Object.entries(frame.landmarks)) {
      if (landmark.state === 'OBSERVED') result.add(key)
    }
  }
  return result
}

function aggregateSignal(evidence, signalId) {
  const values = []
  let unit = null
  for (const frame of cleanFrames(evidence)) {
    const signal = frame.signals[signalId]
    if (signal?.availability === 'OBSERVED') {
      values.push(signal.value)
      unit = unit ?? signal.unit
      if (unit !== signal.unit) return { availability: 'UNKNOWN', value: null, unit: null, observedFrames: 0, reasonCodes: ['UNIT_MISMATCH'] }
    }
  }
  if (values.length === 0) return { availability: 'UNKNOWN', value: null, unit: null, observedFrames: 0, reasonCodes: ['UNKNOWN_PROPAGATED'] }
  return {
    availability: 'OBSERVED',
    value: values.reduce((sum, value) => sum + value, 0) / values.length,
    unit,
    observedFrames: values.length,
    reasonCodes: [],
  }
}

function addBlock(blocks, signalIds, reasonCode) {
  for (const signalId of signalIds) {
    if (!blocks.has(signalId)) blocks.set(signalId, new Set())
    blocks.get(signalId).add(reasonCode)
  }
}

function relation(a, b) {
  if (a === 'UNKNOWN' || b === 'UNKNOWN') return 'UNKNOWN'
  return a === b ? 'MATCHED' : 'DIFFERENT'
}

function assessCapture(baseline, followup) {
  const blocks = new Map()
  const reasonCodes = new Set()
  const dimensions = []
  const allSignals = SIGNAL_IDS

  for (const key of Object.keys(CAPTURE_STATES)) {
    const a = baseline.capture[key]
    const b = followup.capture[key]
    dimensions.push({ dimension: key, baselineState: a, followupState: b, relation: relation(a, b) })
    if (a === 'UNKNOWN' || b === 'UNKNOWN') {
      addBlock(blocks, allSignals, 'CAPTURE_POLICY_UNRESOLVED')
      reasonCodes.add('CAPTURE_POLICY_UNRESOLVED')
    }
  }

  if (baseline.capture.activityState !== followup.capture.activityState) {
    addBlock(blocks, allSignals, 'ACTIVITY_STATE_MISMATCH')
    reasonCodes.add('ACTIVITY_STATE_MISMATCH')
  }

  if ([baseline, followup].some((evidence) => evidence.capture.frameCoverage !== 'MEETS_APPROVED_MINIMUM')) {
    addBlock(blocks, allSignals, 'COVERAGE_BELOW_APPROVED_MINIMUM')
    reasonCodes.add('COVERAGE_BELOW_APPROVED_MINIMUM')
  }
  if ([baseline, followup].some((evidence) => evidence.capture.clipDuration !== 'MEETS_APPROVED_MINIMUM')) {
    addBlock(blocks, ['TEMPORAL_CONTINUITY', 'POSE_TRANSITION_EVIDENCE', 'MOTION_EVIDENCE_COVERAGE'], 'CLIP_DURATION_INSUFFICIENT')
    reasonCodes.add('CLIP_DURATION_INSUFFICIENT')
  }
  if ([baseline, followup].some((evidence) => evidence.capture.poseEvidenceCoverage !== 'MEETS_APPROVED_MINIMUM')) {
    addBlock(blocks, SIGNAL_IDS.filter((signalId) => signalId !== 'MOTION_EVIDENCE_COVERAGE'), 'POSE_EVIDENCE_INSUFFICIENT')
    reasonCodes.add('POSE_EVIDENCE_INSUFFICIENT')
  }
  if ([baseline, followup].some((evidence) => evidence.capture.detectorStability !== 'STABLE')) {
    addBlock(blocks, SIGNAL_IDS.filter((signalId) => signalId !== 'MOTION_EVIDENCE_COVERAGE'), 'DETECTOR_INSTABILITY')
    reasonCodes.add('DETECTOR_INSTABILITY')
  }
  if ([baseline, followup].some((evidence) => !['VALID_MONOTONIC', 'VALID_VARIABLE_RATE'].includes(evidence.capture.frameTiming))) {
    addBlock(blocks, ['BODY_CENTER_DISPLACEMENT', 'OBSERVABLE_LANDMARK_DISPLACEMENT', 'FRONT_LIMB_MOVEMENT_EVIDENCE', 'REAR_LIMB_MOVEMENT_EVIDENCE', 'TEMPORAL_CONTINUITY', 'POSE_TRANSITION_EVIDENCE'], 'FRAME_TIMING_UNRELIABLE')
    reasonCodes.add('FRAME_TIMING_UNRELIABLE')
  }
  if ([baseline, followup].some((evidence) => evidence.capture.animalVisibility === 'INSUFFICIENT')) {
    addBlock(blocks, SIGNAL_IDS.filter((signalId) => signalId !== 'MOTION_EVIDENCE_COVERAGE'), 'ANIMAL_VISIBILITY_INSUFFICIENT')
    reasonCodes.add('ANIMAL_VISIBILITY_INSUFFICIENT')
  }
  if ([baseline, followup].some((evidence) => evidence.capture.occlusion === 'HEAVY')) {
    addBlock(blocks, SIGNAL_IDS.filter((signalId) => signalId !== 'MOTION_EVIDENCE_COVERAGE'), 'OCCLUSION_EXCESSIVE')
    reasonCodes.add('OCCLUSION_EXCESSIVE')
  }

  const paceA = baseline.capture.speedPace
  const paceB = followup.capture.speedPace
  const variableUnaligned = (paceA === 'VARIABLE' && !baseline.capture.speedPaceAlignedIntervals)
    || (paceB === 'VARIABLE' && !followup.capture.speedPaceAlignedIntervals)
  if (paceA === 'UNKNOWN' || paceB === 'UNKNOWN' || variableUnaligned) {
    addBlock(blocks, SPEED_PACE_SENSITIVE_SIGNALS, 'SPEED_PACE_POLICY_REQUIRED')
    reasonCodes.add('SPEED_PACE_POLICY_REQUIRED')
  } else if (paceA !== paceB) {
    addBlock(blocks, SPEED_PACE_SENSITIVE_SIGNALS, 'SPEED_PACE_MISMATCH')
    reasonCodes.add('SPEED_PACE_MISMATCH')
  } else if (['SLOW', 'MODERATE', 'FAST'].includes(paceA)) {
    addBlock(blocks, SPEED_PACE_SENSITIVE_SIGNALS, 'SPEED_PACE_POLICY_REQUIRED')
    reasonCodes.add('SPEED_PACE_POLICY_REQUIRED')
  }

  const ownerContaminated = [baseline, followup].some((evidence) =>
    ['CUE_ONLY', 'PHYSICAL_CONTACT', 'OBSTRUCTION'].includes(evidence.capture.ownerInteraction)
      || evidence.frames.some((frame) => ['CUE_ONLY', 'PHYSICAL_CONTACT', 'OBSTRUCTION'].includes(frame.ownerInteraction)),
  )
  if (ownerContaminated) reasonCodes.add('OWNER_INTERACTION_PRESENT')
  if ([baseline, followup].some((evidence) =>
    evidence.capture.ownerInteraction === 'CUE_ONLY'
      || evidence.frames.some((frame) => frame.ownerInteraction === 'CUE_ONLY'),
  )) {
    reasonCodes.add('OWNER_CUE_PRESENT')
  }
  const unlocalizedOwnerInteraction = [baseline, followup].some((evidence) =>
    ['CUE_ONLY', 'PHYSICAL_CONTACT', 'OBSTRUCTION'].includes(evidence.capture.ownerInteraction)
      && !evidence.frames.some((frame) => ['CUE_ONLY', 'PHYSICAL_CONTACT', 'OBSTRUCTION'].includes(frame.ownerInteraction)),
  )
  if (unlocalizedOwnerInteraction) {
    addBlock(blocks, OWNER_SENSITIVE_SIGNALS, 'CAPTURE_POLICY_UNRESOLVED')
    reasonCodes.add('CAPTURE_POLICY_UNRESOLVED')
  }
  if (cleanFrames(baseline).length === 0 || cleanFrames(followup).length === 0) {
    addBlock(blocks, OWNER_SENSITIVE_SIGNALS, 'COVERAGE_BELOW_APPROVED_MINIMUM')
    reasonCodes.add('COVERAGE_BELOW_APPROVED_MINIMUM')
  }

  if ([baseline, followup].some((evidence) => ['BBOX_DERIVED_ONLY', 'UNAVAILABLE', 'UNKNOWN'].includes(evidence.capture.bodyScale))) {
    addBlock(blocks, SCALE_DEPENDENT_SIGNALS, 'BODY_SCALE_REFERENCE_UNSTABLE')
    reasonCodes.add('BODY_SCALE_REFERENCE_UNSTABLE')
  }

  if ([baseline, followup].some((evidence) =>
    evidence.capture.cameraMotion !== 'BELOW_SUPPRESSION_GATE'
      || evidence.frames.some((frame) => frame.cameraMotionSuppressed),
  )) {
    addBlock(blocks, DISPLACEMENT_SIGNALS, 'CAMERA_MOTION_RISK')
    reasonCodes.add('CAMERA_MOTION_RISK')
  }

  if ([baseline, followup].some((evidence) =>
    evidence.frames.some((frame) => frame.sideAmbiguous),
  )) {
    addBlock(blocks, SIDE_DEPENDENT_SIGNALS, 'ANATOMICAL_SIDE_AMBIGUOUS')
    reasonCodes.add('ANATOMICAL_SIDE_AMBIGUOUS')
  }

  if (baseline.capture.viewpoint !== followup.capture.viewpoint) {
    addBlock(blocks, new Set([...DISPLACEMENT_SIGNALS, ...SIDE_DEPENDENT_SIGNALS, 'BODY_AXIS_VARIATION']), 'VIEWPOINT_MISMATCH')
    reasonCodes.add('VIEWPOINT_MISMATCH')
  }

  return { blocks, reasonCodes: [...reasonCodes].sort(), dimensions }
}

function identityConfirmed(request) {
  const { petRef, baselineIdentityReceipt: baseline, followupIdentityReceipt: followup } = request.petIdentityRef
  return baseline.status === 'CONFIRMED'
    && followup.status === 'CONFIRMED'
    && baseline.petRef === petRef
    && followup.petRef === petRef
}

function parityResult(baseline, followup) {
  if (baseline.contractVersion !== 'guardian-motion-contract-v1'
    || followup.contractVersion !== 'guardian-motion-contract-v1') {
    return { pass: false, reasonCode: 'SCHEMA_INCOMPATIBLE' }
  }
  for (const key of VERSION_KEYS) {
    if (baseline.versions[key] !== followup.versions[key]) {
      return { pass: false, reasonCode: 'ESTIMATOR_POLICY_MISMATCH', dimension: key }
    }
  }
  return { pass: true, reasonCode: null, dimension: null }
}

export function symmetricRelativeDifference(a, b, policy = null) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || !policy?.approved || !Number.isFinite(policy.safeThreshold)) {
    return { availability: 'UNKNOWN', value: null, label: 'TECHNICAL_CHANGE_ONLY', reasonCodes: ['RELATIVE_DENOMINATOR_UNSAFE', 'POLICY_VALUE_REQUIRED'] }
  }
  const denominator = Math.min(Math.abs(a), Math.abs(b))
  if (denominator <= policy.safeThreshold) {
    return { availability: 'UNKNOWN', value: null, label: 'TECHNICAL_CHANGE_ONLY', reasonCodes: ['RELATIVE_DENOMINATOR_UNSAFE'] }
  }
  return { availability: 'OBSERVED', value: (b - a) / denominator, label: 'TECHNICAL_CHANGE_ONLY', reasonCodes: [] }
}

function signalComparisons(baseline, followup, captureAssessment) {
  return SIGNAL_IDS.map((signalId) => {
    const a = aggregateSignal(baseline, signalId)
    const b = aggregateSignal(followup, signalId)
    const reasons = new Set(captureAssessment.blocks.get(signalId) ?? [])
    if (a.availability !== 'OBSERVED' || b.availability !== 'OBSERVED') reasons.add('UNKNOWN_PROPAGATED')
    if (a.unit && b.unit && a.unit !== b.unit) reasons.add('UNIT_MISMATCH')

    const blocked = reasons.size > 0
    const valuesObserved = a.availability === 'OBSERVED' && b.availability === 'OBSERVED' && a.unit === b.unit
    const absoluteDifference = valuesObserved
      ? { availability: 'OBSERVED', value: b.value - a.value, unit: a.unit }
      : { availability: 'UNKNOWN', value: null, unit: a.unit ?? b.unit ?? null }

    if (!blocked && valuesObserved) reasons.add('POLICY_VALUE_REQUIRED')
    const comparability = blocked ? 'NOT_COMPARABLE' : 'PARTIALLY_COMPARABLE'
    const direction = blocked ? 'NOT_COMPARABLE' : 'INDETERMINATE'

    return {
      signalId,
      comparability,
      direction,
      baseline: a,
      followup: b,
      absoluteDifference,
      relativeTechnicalDifference: symmetricRelativeDifference(a.value, b.value),
      reasonCodes: [...reasons].sort(),
    }
  })
}

function evidenceCoverage(baseline, followup, comparisons) {
  const baselineCoverage = coverageFor(baseline)
  const followupCoverage = coverageFor(followup)
  const baselineLandmarks = observedLandmarkSet(baseline)
  const followupLandmarks = observedLandmarkSet(followup)
  const overlappingLandmarks = [...baselineLandmarks].filter((key) => followupLandmarks.has(key)).sort()
  const comparableSignalCount = comparisons.filter((entry) => entry.comparability !== 'NOT_COMPARABLE').length

  return {
    expectedComparableSignalCount: SIGNAL_IDS.length,
    comparableSignalCount,
    nonComparableSignalCount: SIGNAL_IDS.length - comparableSignalCount,
    baseline: baselineCoverage,
    followup: followupCoverage,
    overlap: {
      expectedLandmarkCount: LANDMARK_KEYS.length,
      overlappingLandmarkCount: overlappingLandmarks.length,
      overlappingLandmarks,
      observedOverlapCoverage: ratio(overlappingLandmarks.length, LANDMARK_KEYS.length),
    },
    signalCoverage: ratio(comparableSignalCount, SIGNAL_IDS.length),
  }
}

function provenance(request) {
  return {
    comparisonContractVersion: CONTRACT_VERSION,
    comparisonPolicyVersion: 'guardian-motion-comparison-fail-closed-core-v0',
    canonicalizationVersion: 'guardian-motion-comparison-canonicalization-v0',
    baseline: {
      evidenceId: request.baselineEvidence.evidenceId,
      motionDigest: request.baselineEvidence.motionDigest,
      contractVersion: request.baselineEvidence.contractVersion,
      versions: request.baselineEvidence.versions,
    },
    followup: {
      evidenceId: request.followupEvidence.evidenceId,
      motionDigest: request.followupEvidence.motionDigest,
      contractVersion: request.followupEvidence.contractVersion,
      versions: request.followupEvidence.versions,
    },
  }
}

function rejectedOutput(request, reasonCode, path = null) {
  return canonicalize({
    contractVersion: CONTRACT_VERSION,
    comparisonId: typeof request?.comparisonId === 'string' ? request.comparisonId : null,
    status: 'COMPARISON_REJECTED',
    comparableSignals: [],
    nonComparableSignals: SIGNAL_IDS,
    directionalChanges: [],
    reasonCodes: [reasonCode],
    uncertainty: { level: 'NOT_ASSESSABLE', reasonCodes: [reasonCode] },
    rejectionPath: path,
    digest: { availability: 'UNKNOWN', value: null, reasonCodes: ['POLICY_VALUE_REQUIRED'] },
  })
}

export function canonicalize(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new ComparisonInputError('NON_FINITE_NUMBER', '$')
    return Object.is(value, -0) ? 0 : value
  }
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry))
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  )
}

export function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value))
}

export function compareMotionEvidence(request) {
  try {
    validateRequest(request)
  } catch (error) {
    if (error instanceof ComparisonInputError) return rejectedOutput(request, error.reasonCode, error.path)
    throw error
  }

  if (!identityConfirmed(request)) return rejectedOutput(request, 'PET_IDENTITY_NOT_CONFIRMED')

  const parity = parityResult(request.baselineEvidence, request.followupEvidence)
  if (!parity.pass) return rejectedOutput(request, parity.reasonCode, parity.dimension)

  const captureAssessment = assessCapture(request.baselineEvidence, request.followupEvidence)
  const comparisons = signalComparisons(request.baselineEvidence, request.followupEvidence, captureAssessment)
  const coverage = evidenceCoverage(request.baselineEvidence, request.followupEvidence, comparisons)
  const comparableSignals = comparisons.filter((entry) => entry.comparability !== 'NOT_COMPARABLE').map((entry) => entry.signalId)
  const nonComparableSignals = comparisons.filter((entry) => entry.comparability === 'NOT_COMPARABLE').map((entry) => entry.signalId)
  const reasonCodes = new Set(captureAssessment.reasonCodes)
  reasonCodes.add('POLICY_VALUE_REQUIRED')
  if (comparableSignals.length === 0) reasonCodes.add('INSUFFICIENT_COMPARABLE_EVIDENCE')

  const output = {
    contractVersion: CONTRACT_VERSION,
    comparisonId: request.comparisonId,
    status: comparableSignals.length === 0 ? 'INSUFFICIENT_COMPARABLE_EVIDENCE' : 'COMPARISON_PARTIAL',
    petIdentityRef: {
      petRef: request.petIdentityRef.petRef,
      baselineIdentityReceiptRef: request.petIdentityRef.baselineIdentityReceipt.receiptId,
      followupIdentityReceiptRef: request.petIdentityRef.followupIdentityReceipt.receiptId,
      samePetGate: 'CONFIRMED',
    },
    baselineEvidenceRef: {
      evidenceId: request.baselineEvidence.evidenceId,
      motionDigest: request.baselineEvidence.motionDigest,
    },
    followupEvidenceRef: {
      evidenceId: request.followupEvidence.evidenceId,
      motionDigest: request.followupEvidence.motionDigest,
    },
    baselineTimestamp: request.baselineEvidence.timestamp,
    followupTimestamp: request.followupEvidence.timestamp,
    captureComparability: {
      level: comparableSignals.length === 0 ? 'NOT_COMPARABLE' : (nonComparableSignals.length > 0 ? 'PARTIALLY_COMPARABLE' : 'COMPARABLE'),
      dimensions: captureAssessment.dimensions,
      reasonCodes: captureAssessment.reasonCodes,
    },
    evidenceCoverage: coverage,
    comparableSignals,
    nonComparableSignals,
    directionalChanges: comparisons,
    uncertainty: {
      level: 'NOT_ASSESSABLE',
      reasonCodes: ['POLICY_VALUE_REQUIRED'],
      limitations: ['CALIBRATION_POLICY_VALUES_UNAPPROVED'],
    },
    reasonCodes: [...reasonCodes].sort(),
    provenance: provenance(request),
    digest: {
      availability: 'UNKNOWN',
      value: null,
      reasonCodes: ['POLICY_VALUE_REQUIRED'],
    },
  }

  return canonicalize(output)
}
