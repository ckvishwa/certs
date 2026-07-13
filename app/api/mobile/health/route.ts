import { NextResponse } from "next/server";
import { buildMobileCurriculum } from "@/lib/mobile/curriculum";

/** Deployment-safe visibility for the public curriculum contract. */
export function GET() {
  const security = buildMobileCurriculum("security-plus-sy0-701")!;
  const ccna = buildMobileCurriculum("ccna")!;
  const activeSecurity = security.certification.versions.find(
    (version) => version.isActive,
  )!;
  return NextResponse.json({
    status: "ok",
    service: "certs-mobile-api",
    schemaVersion: security.schemaVersion,
    curriculum: {
      securityPlus: activeSecurity.counts,
      ccna: {
        versions: ccna.certification.versions.length,
        objectives: ccna.certification.counts.objectives,
        concepts: ccna.certification.counts.concepts,
      },
    },
  });
}
