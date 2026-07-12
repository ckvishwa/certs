import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { APP_NAME, brand } from "@/lib/brand";

const ROOT = process.cwd();
const ALLOWED_LEGACY_FILES = new Set([
  "package.json",
  "package-lock.json",
  "supabase/config.toml",
  "supabase/migrations/0001_schema.sql",
  "supabase/migrations/0002_assessment_ingestion.sql",
  "supabase/migrations/0003_rls_and_triggers.sql",
]);

function repositoryFiles(): string[] {
  return execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: ROOT, encoding: "utf8" },
  )
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((file) => !file.toLowerCase().endsWith(".pdf"))
    .map((file) => path.join(ROOT, file));
}

describe("brand configuration", () => {
  it("provides one typed temporary name and required copy", () => {
    expect(APP_NAME).toBe(brand.name);
    expect(brand.isTemporary).toBe(true);
    expect(brand.shortName).toBeTruthy();
    expect(brand.tagline).toBeTruthy();
    expect(brand.description).toBeTruthy();
    expect(brand.supportContact).toBeTruthy();
  });

  it("keeps legacy naming only in stable internal identifiers and migration history", () => {
    const legacy = new RegExp(["cert", "[ -]?", "forge"].join(""), "i");
    const occurrences = repositoryFiles()
      .filter((file) => legacy.test(fs.readFileSync(file, "utf8")))
      .map((file) => path.relative(ROOT, file).replaceAll("\\", "/"));

    expect(
      occurrences.filter((file) => !ALLOWED_LEGACY_FILES.has(file)),
    ).toEqual([]);
  });
});
