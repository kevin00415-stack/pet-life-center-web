import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { runValidationSuite } from "../src/features/guardian-baseline/validation-harness.js";
import {
  MOTION_DATASET_PURPOSE,
  buildMotionDataset,
  compareRepeatedMotionSignatures,
  createDatasetRecordsFromValidation
} from "../src/features/guardian-baseline/motion-dataset.js";

const [manifestArgument, outputArgument] = process.argv.slice(2);
if (!manifestArgument) throw new Error("USAGE: npm run dataset:g2c -- <manifest.json> [validation/output/dataset.json]");
const manifestPath = resolve(manifestArgument);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const report = await runValidationSuite({
  manifest,
  loadFixture: async (entry) => {
    if (extname(entry.source.localPath).toLowerCase() !== ".json") throw new Error("RAW_MEDIA_NOT_SUPPORTED");
    const path = isAbsolute(entry.source.localPath) ? entry.source.localPath : resolve(dirname(manifestPath), entry.source.localPath);
    return JSON.parse(await readFile(path, "utf8"));
  }
});
const records = createDatasetRecordsFromValidation({ manifest, report });
const dataset = buildMotionDataset({ datasetId: `dataset-${manifest.manifestId}`, purpose: MOTION_DATASET_PURPOSE, authorizationRef: manifest.authorizationRef ?? null, records });
const petIds = [...new Set(dataset.records.map((record) => record.petId))];
const comparisons = petIds.map((petId) => compareRepeatedMotionSignatures(dataset, petId));

if (outputArgument) {
  const allowedRoot = resolve("validation/output");
  const outputPath = resolve(outputArgument);
  const relativePath = relative(allowedRoot, outputPath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) throw new Error("DATASET_OUTPUT_MUST_BE_LOCAL_IGNORED_PATH");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
}

process.stdout.write(`${JSON.stringify({
  datasetVersion: dataset.datasetVersion,
  datasetId: dataset.datasetId,
  datasetChecksum: dataset.datasetChecksum,
  evidenceClass: report.evidenceClass,
  recordingCount: dataset.records.length,
  petCount: petIds.length,
  repeatedComparisonPairs: comparisons.reduce((total, item) => total + item.pairs.length, 0),
  skeletonStatus: "UNKNOWN_UNTIL_MOTION_LAYER_IMPLEMENTED",
  geometryStatus: "UNKNOWN_UNTIL_MOTION_LAYER_IMPLEMENTED",
  outputWritten: Boolean(outputArgument)
}, null, 2)}\n`);
