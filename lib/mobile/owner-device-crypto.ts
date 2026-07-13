import { createHash, randomBytes } from "node:crypto";

const tokenBytes = 32;
export const ownerTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function opaqueHash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function newDeviceToken(): string {
  return randomBytes(tokenBytes).toString("base64url");
}
