import { canonicalize, deepFreeze, deterministicChecksum } from "./contracts.js";
import { createLandmarkErrorReport } from "./manual-annotation.js";

export async function runPoseRepeatability({ runtime, request, runs = 10 }) {
  if (!Number.isInteger(runs) || runs < 2) throw new Error("REPEATABILITY_RUN_COUNT_INVALID");
  const results = [];
  for (let index = 0; index < runs; index += 1) results.push(await runtime.analyze(structuredCloneWithPixels(request)));
  const accepted = results.filter((result) => result.envelope);
  const skeletonDigests = accepted.map((result) => deterministicChecksum(result.envelope.skeletonFrames));
  const geometryDigests = accepted.map((result) => deterministicChecksum(result.envelope.geometryFrames));
  const temporalDigests = accepted.map((result) => deterministicChecksum(result.envelope.temporalMotion));
  const payload = {
    reportVersion: "guardian-pose-repeatability-v1", requestedRuns: runs, completedRuns: results.length, acceptedRuns: accepted.length,
    equivalentSkeleton: unique(skeletonDigests).length === 1 && accepted.length === runs,
    equivalentGeometry: unique(geometryDigests).length === 1 && accepted.length === runs,
    equivalentMotion: unique(temporalDigests).length === 1 && accepted.length === runs,
    statuses: results.map((result) => result.status), skeletonDigests, geometryDigests, temporalDigests
  };
  return deepFreeze({ ...payload, checksum: deterministicChecksum(payload) });
}

export async function runRealDevicePoseHarness({ cases, runtime, annotations = [] }) {
  if (!Array.isArray(cases)) throw new Error("REAL_DEVICE_CASES_REQUIRED");
  const caseReports = [];
  for (const entry of cases) {
    if (entry.sourceClass !== "GUARDIAN_HQ_AUTHORIZED_TEST" || !entry.authorizationRef) throw new Error("REAL_DEVICE_AUTHORIZATION_REQUIRED");
    const repeatability = await runPoseRepeatability({ runtime, request: entry.request, runs: 10 });
    const single = await runtime.analyze(structuredCloneWithPixels(entry.request));
    const annotation = annotations.find((item) => item.videoId === entry.request.videoId);
    const accuracy = annotation && single.envelope ? createLandmarkErrorReport({ annotationSet: annotation, envelope: single.envelope }) : null;
    caseReports.push({ caseId: entry.caseId, videoId: entry.request.videoId, species: entry.request.species, repeatability, accuracy, status: single.status });
  }
  const payload = {
    reportVersion: "guardian-real-device-pose-report-v1", evidenceClass: "LOCAL_AUTHORIZED_ONLY", caseCount: caseReports.length,
    annotatedCaseCount: caseReports.filter((item) => item.accuracy).length, cases: caseReports,
    promotionDecision: "NOT_AUTOMATIC", rawMediaStored: false, cloudUsed: false
  };
  return deepFreeze({ ...payload, checksum: deterministicChecksum(payload) });
}

function structuredCloneWithPixels(value) { return structuredClone(value); }
function unique(values) { return [...new Set(values.map((value) => canonicalize(value)))]; }
