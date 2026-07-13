import { NextResponse } from "next/server";
import { buildMobileCurriculum } from "@/lib/mobile/curriculum";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const curriculum = buildMobileCurriculum(slug);
  if (!curriculum) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Certification not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json(curriculum);
}
