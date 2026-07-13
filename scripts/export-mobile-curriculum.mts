import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildMobileCurriculum } from "../lib/mobile/curriculum.ts";

const output = resolve(import.meta.dirname, "../mobile_exports");
const generatedAt = new Date(
  Number(process.env.SOURCE_DATE_EPOCH ?? 0) * 1000,
).toISOString();
// A checked-in offline artifact must regenerate identically from its source
// tree. Callers that produce a release artifact can pin a revision explicitly.
const sourceRevision =
  process.env.MOBILE_EXPORT_SOURCE_REVISION ?? "unversioned-source";

await mkdir(output, { recursive: true });
for (const slug of ["security-plus-sy0-701", "ccna"]) {
  const curriculum = buildMobileCurriculum(slug);
  if (!curriculum) throw new Error(`Missing curriculum: ${slug}`);
  await writeFile(
    resolve(output, `${slug}.v1.json`),
    `${JSON.stringify({ ...curriculum, generatedAt, sourceRevision }, null, 2)}\n`,
  );
}
