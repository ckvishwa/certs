import { NextResponse } from "next/server";
import { buildMobileCurriculumCatalog } from "@/lib/mobile/curriculum";

/** Public, versioned syllabus metadata. No learner data or database IDs. */
export function GET() {
  return NextResponse.json(buildMobileCurriculumCatalog());
}
