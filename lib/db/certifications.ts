import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type DB = SupabaseClient<Database>;

export interface CertVersionOption {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  activeFrom: string | null;
}

export interface CertOption {
  id: string;
  slug: string;
  name: string;
  vendor: string;
  versions: CertVersionOption[];
}

/** All certifications with their exam versions, for onboarding selection. */
export async function getCertificationsWithVersions(
  db: DB,
): Promise<CertOption[]> {
  const [{ data: certs }, { data: versions }] = await Promise.all([
    db.from("certifications").select("*").order("name"),
    db.from("exam_versions").select("*").order("code"),
  ]);

  return (certs ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    vendor: c.vendor,
    versions: (versions ?? [])
      .filter((v) => v.certification_id === c.id)
      .map((v) => ({
        id: v.id,
        code: v.code,
        name: v.name,
        isActive: v.is_active,
        activeFrom: v.active_from,
      })),
  }));
}
