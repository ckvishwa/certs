import { NextResponse } from "next/server";
import { authenticateBearerRequest, BearerAuthError } from "@/lib/supabase/bearer";
import { buildLearnSummary } from "@/lib/mobile/learn-summary";

/**
 * REVA Learn's mobile summary endpoint. Bearer-JWT authenticated (mobile has
 * no cookies to carry a session), RLS-scoped, and a thin wrapper only —
 * buildLearnSummary composes existing study-plan/knowledge-map/readiness/
 * scheduler logic rather than duplicating any of it.
 */
export async function GET(request: Request) {
  try {
    const { db, userId } = await authenticateBearerRequest(request);
    const summary = await buildLearnSummary(db, userId);
    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof BearerAuthError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: 401 },
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to load learn summary",
        },
      },
      { status: 500 },
    );
  }
}
