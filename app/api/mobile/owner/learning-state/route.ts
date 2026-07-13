import { NextResponse } from "next/server";
import { buildOwnerLearningState } from "@/lib/mobile/owner-learning-state";
import {
  authenticateOwnerDevice,
  OwnerDeviceError,
} from "@/lib/mobile/reva-owner";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ownerUserId = await authenticateOwnerDevice(request);
    const state = await buildOwnerLearningState(
      createAdminClient(),
      ownerUserId,
    );
    return NextResponse.json(state, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof OwnerDeviceError) {
      const status = error.code === "UNAVAILABLE" ? 503 : 401;
      return NextResponse.json(
        {
          error: {
            code: status === 401 ? "UNAUTHORIZED" : "UNAVAILABLE",
            message:
              status === 401
                ? "Device enrollment is required."
                : "Owner learning state is temporarily unavailable.",
          },
        },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Owner learning state is unavailable.",
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
