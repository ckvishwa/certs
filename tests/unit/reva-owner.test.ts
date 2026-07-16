import { describe, expect, it } from "vitest";
import {
  newDeviceToken,
  opaqueHash,
  ownerTokenPattern,
} from "@/lib/mobile/owner-device-crypto";

describe("private REVA device primitives", () => {
  it("generates unique 256-bit opaque tokens and persists only a hash", () => {
    const token = newDeviceToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(opaqueHash(token)).toHaveLength(64);
    expect(opaqueHash(token)).not.toContain(token);
    expect(newDeviceToken()).not.toBe(token);
  });

  it("accepts only the well-formed device-token shape", () => {
    const token = newDeviceToken();
    expect(ownerTokenPattern.test(token)).toBe(true);
    expect(ownerTokenPattern.test("short")).toBe(false);
  });
});
