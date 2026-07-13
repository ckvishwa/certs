import {
  validateCatalog,
  validateCertification,
  validateHealth,
} from "../lib/mobile/production-verification.ts";

const base = new URL(
  process.env.CERTS_BASE_URL ?? "https://certs-eosin.vercel.app",
);
if (base.protocol !== "https:")
  throw new Error("CERTS_BASE_URL must use HTTPS");

async function fetchJson(path, validate) {
  const url = new URL(path, base);
  const response = await fetch(url, { redirect: "manual" });
  if (response.status !== 200)
    throw new Error(`${path}: expected HTTP 200, received ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json"))
    throw new Error(
      `${path}: expected JSON content type, received ${contentType || "none"}`,
    );
  const text = await response.text();
  if (/^\s*</.test(text))
    throw new Error(`${path}: received HTML instead of JSON`);
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`${path}: malformed JSON`);
  }
  validate(payload);
  console.log(`OK ${path}`);
}

await fetchJson("/api/mobile/health", validateHealth);
await fetchJson("/api/mobile/certifications", validateCatalog);
await fetchJson("/api/mobile/certifications/security-plus-sy0-701", (payload) =>
  validateCertification(payload, "securityPlus"),
);
await fetchJson("/api/mobile/certifications/ccna", (payload) =>
  validateCertification(payload, "ccna"),
);
console.log(`Verified Certs mobile production API at ${base.origin}`);
