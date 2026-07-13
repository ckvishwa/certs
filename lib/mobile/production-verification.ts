export const MOBILE_PRODUCTION_EXPECTATIONS = {
  schemaVersion: 1,
  securityPlus: {
    slug: "security-plus-sy0-701",
    domains: 5,
    objectives: 28,
    subObjectives: 38,
    concepts: 98,
    dependencies: 36,
  },
  ccna: { slug: "ccna", versions: 2, objectives: 23, concepts: 20 },
} as const;

const forbiddenKeyFragments = [
  "password",
  "secret",
  "token",
  "email",
  "mastery",
  "attempt",
  "mistake",
  "user",
];

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function count(value: unknown, key: string): number {
  const result = record(value, "counts")[key];
  if (typeof result !== "number")
    throw new Error(`counts.${key} must be a number`);
  return result;
}

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected)
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
}

function assertNoSensitiveKeys(value: unknown, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoSensitiveKeys(item, `${path}[${index}]`),
    );
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (
      forbiddenKeyFragments.some((fragment) =>
        key.toLowerCase().includes(fragment),
      )
    )
      throw new Error(`unexpected sensitive-looking field at ${path}.${key}`);
    assertNoSensitiveKeys(nested, `${path}.${key}`);
  }
}

export function validateCatalog(payload: unknown) {
  const catalog = record(payload, "catalog");
  assertEqual(
    catalog.schemaVersion,
    MOBILE_PRODUCTION_EXPECTATIONS.schemaVersion,
    "schemaVersion",
  );
  if (!Array.isArray(catalog.certifications))
    throw new Error("certifications must be an array");
  const slugs = catalog.certifications.map(
    (item) => record(item, "certification").slug,
  );
  assertEqual(
    JSON.stringify(slugs),
    JSON.stringify(["ccna", "security-plus-sy0-701"]),
    "catalog ordering",
  );
  assertNoSensitiveKeys(payload);
}

export function validateCertification(
  payload: unknown,
  expected: "securityPlus" | "ccna",
) {
  const detail = record(payload, "certification detail");
  assertEqual(
    detail.schemaVersion,
    MOBILE_PRODUCTION_EXPECTATIONS.schemaVersion,
    "schemaVersion",
  );
  const certification = record(detail.certification, "certification");
  const versions = certification.versions;
  if (!Array.isArray(versions))
    throw new Error("certification.versions must be an array");
  if (expected === "securityPlus") {
    const expectation = MOBILE_PRODUCTION_EXPECTATIONS.securityPlus;
    assertEqual(certification.slug, expectation.slug, "certification.slug");
    const active = versions.find(
      (item) => record(item, "version").isActive === true,
    );
    if (!active) throw new Error("Security+ active version is missing");
    const counts = record(active, "active version").counts;
    for (const key of [
      "domains",
      "objectives",
      "subObjectives",
      "concepts",
      "dependencies",
    ] as const)
      assertEqual(count(counts, key), expectation[key], `Security+ ${key}`);
  } else {
    const expectation = MOBILE_PRODUCTION_EXPECTATIONS.ccna;
    assertEqual(certification.slug, expectation.slug, "certification.slug");
    assertEqual(versions.length, expectation.versions, "CCNA versions");
    const counts = certification.counts;
    assertEqual(
      count(counts, "objectives"),
      expectation.objectives,
      "CCNA objectives",
    );
    assertEqual(
      count(counts, "concepts"),
      expectation.concepts,
      "CCNA concepts",
    );
  }
  assertNoSensitiveKeys(payload);
}

export function validateHealth(payload: unknown) {
  const health = record(payload, "health");
  assertEqual(health.status, "ok", "health.status");
  assertEqual(health.service, "certs-mobile-api", "health.service");
  assertEqual(
    health.schemaVersion,
    MOBILE_PRODUCTION_EXPECTATIONS.schemaVersion,
    "health.schemaVersion",
  );
  const curriculum = record(health.curriculum, "health.curriculum");
  const security = record(
    curriculum.securityPlus,
    "health.curriculum.securityPlus",
  );
  const ccna = record(curriculum.ccna, "health.curriculum.ccna");
  assertEqual(
    security.domains,
    MOBILE_PRODUCTION_EXPECTATIONS.securityPlus.domains,
    "health Security+ domains",
  );
  assertEqual(
    security.objectives,
    MOBILE_PRODUCTION_EXPECTATIONS.securityPlus.objectives,
    "health Security+ objectives",
  );
  assertEqual(
    security.subObjectives,
    MOBILE_PRODUCTION_EXPECTATIONS.securityPlus.subObjectives,
    "health Security+ subObjectives",
  );
  assertEqual(
    security.concepts,
    MOBILE_PRODUCTION_EXPECTATIONS.securityPlus.concepts,
    "health Security+ concepts",
  );
  assertEqual(
    security.dependencies,
    MOBILE_PRODUCTION_EXPECTATIONS.securityPlus.dependencies,
    "health Security+ dependencies",
  );
  assertEqual(
    ccna.versions,
    MOBILE_PRODUCTION_EXPECTATIONS.ccna.versions,
    "health CCNA versions",
  );
  assertEqual(
    ccna.objectives,
    MOBILE_PRODUCTION_EXPECTATIONS.ccna.objectives,
    "health CCNA objectives",
  );
  assertEqual(
    ccna.concepts,
    MOBILE_PRODUCTION_EXPECTATIONS.ccna.concepts,
    "health CCNA concepts",
  );
  assertNoSensitiveKeys(payload);
}
