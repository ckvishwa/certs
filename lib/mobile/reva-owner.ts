import "server-only";

import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";
import {
  newDeviceToken,
  opaqueHash,
  ownerTokenPattern,
} from "@/lib/mobile/owner-device-crypto";

export { newDeviceToken, opaqueHash } from "@/lib/mobile/owner-device-crypto";

export class OwnerDeviceError extends Error {
  constructor(
    readonly code: "INVALID_ENROLLMENT" | "UNAUTHORIZED" | "UNAVAILABLE",
  ) {
    super(code);
  }
}

export type EnrollmentInput = {
  enrollmentCode: string;
  deviceLabel: string;
  platform: string;
  appVersion: string;
};

function ownerAdmin() {
  // Deliberately untyped: the generated app database type is owned by the
  // existing schema generation workflow. This isolated server-only client is
  // limited to the two private tables introduced by migration 0006.
  return createClient(
    publicEnv.supabaseUrl(),
    serverEnv.supabaseServiceRoleKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function parseOwnerBearer(request: Request): string | null {
  const value = request.headers.get("authorization");
  if (!value?.startsWith("Bearer ")) return null;
  const token = value.slice("Bearer ".length);
  return ownerTokenPattern.test(token) ? token : null;
}

function validEnrollmentInput(input: EnrollmentInput): boolean {
  return (
    input.enrollmentCode.length >= 16 &&
    input.enrollmentCode.length <= 128 &&
    input.deviceLabel.length >= 1 &&
    input.deviceLabel.length <= 80 &&
    input.platform === "android" &&
    input.appVersion.length <= 80
  );
}

export async function enrollOwnerDevice(input: EnrollmentInput): Promise<{
  deviceToken: string;
  displayName: string | null;
}> {
  if (!validEnrollmentInput(input)) {
    throw new OwnerDeviceError("INVALID_ENROLLMENT");
  }

  const deviceToken = newDeviceToken();
  const { data, error } = await ownerAdmin().rpc(
    "consume_reva_enrollment_code",
    {
      p_code_hash: opaqueHash(input.enrollmentCode),
      p_token_hash: opaqueHash(deviceToken),
      p_device_label: input.deviceLabel,
      p_platform: input.platform,
      p_app_version: input.appVersion,
    },
  );

  if (error) throw new OwnerDeviceError("UNAVAILABLE");
  const owner = Array.isArray(data) ? data[0] : null;
  if (!owner?.owner_user_id) throw new OwnerDeviceError("INVALID_ENROLLMENT");
  return { deviceToken, displayName: owner.display_name ?? null };
}

export async function authenticateOwnerDevice(
  request: Request,
): Promise<string> {
  const token = parseOwnerBearer(request);
  if (!token) throw new OwnerDeviceError("UNAUTHORIZED");

  const admin = ownerAdmin();
  const hash = opaqueHash(token);
  const { data, error } = await admin
    .from("reva_owner_devices")
    .select("id, owner_user_id")
    .eq("token_hash", hash)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw new OwnerDeviceError("UNAVAILABLE");
  if (!data?.owner_user_id) throw new OwnerDeviceError("UNAUTHORIZED");

  void admin
    .from("reva_owner_devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", data.id);
  return data.owner_user_id as string;
}
