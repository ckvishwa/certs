import { createHash, randomBytes } from "node:crypto";

const args = process.argv.slice(2);
const value = (name) => args[args.indexOf(name) + 1];
const owner = value("--owner");
const expiresIn = value("--expires-in") ?? "10m";
const match = /^(?:[1-9]|[1-5][0-9]|60)m$/.exec(expiresIn);

if (!owner || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(owner) || !match) {
  console.error(
    "Usage: npm run reva:create-enrollment-code -- --owner <profile-uuid> --expires-in 10m",
  );
  process.exit(1);
}
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  console.error("Missing required server environment variables.");
  process.exit(1);
}

const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
const headers = {
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};
const profile = await fetch(`${base}/profiles?id=eq.${owner}&select=id`, {
  headers,
});
const profiles = await profile.json();
if (!profile.ok || !Array.isArray(profiles) || profiles.length !== 1) {
  console.error("Owner could not be resolved uniquely.");
  process.exit(1);
}

const code = randomBytes(18).toString("base64url");
const expiresAt = new Date(Date.now() + Number(match[0].slice(0, -1)) * 60_000);
const response = await fetch(`${base}/reva_enrollment_codes`, {
  method: "POST",
  headers: { ...headers, Prefer: "return=minimal" },
  body: JSON.stringify({
    owner_user_id: owner,
    code_hash: createHash("sha256").update(code).digest("hex"),
    expires_at: expiresAt.toISOString(),
    created_by: "owner-cli",
  }),
});
if (!response.ok) {
  console.error("Could not create enrollment code.");
  process.exit(1);
}
console.log(`Enrollment code: ${code}`);
console.log(`Expires: ${expiresAt.toISOString()}`);
