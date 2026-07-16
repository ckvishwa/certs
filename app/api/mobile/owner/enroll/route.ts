import { NextResponse } from "next/server";
import { enrollOwnerDevice, OwnerDeviceError } from "@/lib/mobile/reva-owner";

export const dynamic = "force-dynamic";
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function allowed(request: Request): boolean {
  const key =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || record.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  record.count++;
  return record.count <= MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  if (!allowed(request)) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Try again later." } },
      {
        status: 429,
        headers: { "Cache-Control": "no-store", "Retry-After": "900" },
      },
    );
  }
  try {
    const body = await request.json();
    const enrolled = await enrollOwnerDevice({
      enrollmentCode:
        typeof body.enrollmentCode === "string"
          ? body.enrollmentCode.trim()
          : "",
      deviceLabel:
        typeof body.deviceLabel === "string" ? body.deviceLabel.trim() : "",
      platform: typeof body.platform === "string" ? body.platform : "",
      appVersion:
        typeof body.appVersion === "string" ? body.appVersion.trim() : "",
    });
    return NextResponse.json(
      {
        deviceToken: enrolled.deviceToken,
        owner: { displayName: enrolled.displayName },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const status =
      error instanceof OwnerDeviceError && error.code === "UNAVAILABLE"
        ? 503
        : 400;
    return NextResponse.json(
      {
        error: {
          code: status === 503 ? "UNAVAILABLE" : "INVALID_ENROLLMENT",
          message:
            status === 503
              ? "Enrollment is temporarily unavailable."
              : "Enrollment code is invalid or unavailable.",
        },
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
