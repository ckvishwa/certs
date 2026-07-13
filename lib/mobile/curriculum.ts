import {
  conceptDependencies,
  seedCertifications,
  type SeedCertification,
  type SeedVersion,
} from "../../supabase/seed/data.mts";

export const MOBILE_CURRICULUM_SCHEMA_VERSION = 1;

type Counts = {
  domains: number;
  objectives: number;
  subObjectives: number;
  concepts: number;
  dependencies: number;
};

function key(...parts: string[]): string {
  return parts.join(":");
}

function concepts(version: SeedVersion) {
  return version.domains.flatMap((domain) =>
    domain.objectives.flatMap((objective) => [
      ...(objective.concepts ?? []),
      ...(objective.subObjectives ?? []).flatMap((sub) => sub.concepts ?? []),
    ]),
  );
}

function counts(version: SeedVersion): Counts {
  const slugs = new Set(concepts(version).map((concept) => concept.slug));
  return {
    domains: version.domains.length,
    objectives: version.domains.reduce((sum, domain) => sum + domain.objectives.length, 0),
    subObjectives: version.domains.reduce(
      (sum, domain) =>
        sum + domain.objectives.reduce((total, objective) => total + (objective.subObjectives?.length ?? 0), 0),
      0,
    ),
    concepts: slugs.size,
    dependencies: Object.entries(conceptDependencies).reduce(
      (sum, [concept, prerequisites]) =>
        sum + (slugs.has(concept) ? prerequisites.filter((item) => slugs.has(item)).length : 0),
      0,
    ),
  };
}

function status(certification: SeedCertification): "complete" | "coverage_in_progress" {
  return certification.slug === "security-plus" ? "complete" : "coverage_in_progress";
}

function aggregateCounts(certification: SeedCertification): Counts {
  return certification.versions.reduce(
    (sum, version) => {
      const current = counts(version);
      return {
        domains: sum.domains + current.domains,
        objectives: sum.objectives + current.objectives,
        subObjectives: sum.subObjectives + current.subObjectives,
        concepts: sum.concepts + current.concepts,
        dependencies: sum.dependencies + current.dependencies,
      };
    },
    { domains: 0, objectives: 0, subObjectives: 0, concepts: 0, dependencies: 0 },
  );
}

function toVersion(certification: SeedCertification, version: SeedVersion) {
  const versionKey = key(certification.slug, version.code);
  const bySlug = new Map(
    concepts(version).map((concept) => [concept.slug, key(versionKey, "concept", concept.slug)]),
  );
  return {
    id: versionKey,
    code: version.code,
    name: version.name,
    isActive: version.isActive,
    counts: counts(version),
    domains: version.domains.map((domain, domainPosition) => ({
      id: key(versionKey, "domain", domain.code),
      number: domain.code,
      title: domain.title,
      weight: domain.weight,
      position: domainPosition,
      objectives: domain.objectives.map((objective, objectivePosition) => ({
        id: key(versionKey, "objective", objective.code),
        number: objective.code,
        title: objective.title,
        isPlaceholder: objective.placeholder ?? false,
        position: objectivePosition,
        concepts: (objective.concepts ?? []).map((concept, position) => ({
          id: bySlug.get(concept.slug)!,
          slug: concept.slug,
          title: concept.name,
          description: concept.summary ?? null,
          isPlaceholder: concept.placeholder ?? false,
          position,
        })),
        subObjectives: (objective.subObjectives ?? []).map((subObjective, subPosition) => ({
          id: key(versionKey, "sub-objective", subObjective.code),
          number: subObjective.code,
          title: subObjective.title,
          position: subPosition,
          concepts: (subObjective.concepts ?? []).map((concept, position) => ({
            id: bySlug.get(concept.slug)!,
            slug: concept.slug,
            title: concept.name,
            description: concept.summary ?? null,
            isPlaceholder: concept.placeholder ?? false,
            position,
          })),
        })),
      })),
    })),
    dependencies: Object.entries(conceptDependencies).flatMap(([concept, prerequisites]) => {
      const conceptId = bySlug.get(concept);
      if (!conceptId) return [];
      return prerequisites.flatMap((prerequisite) => {
        const prerequisiteId = bySlug.get(prerequisite);
        return prerequisiteId
          ? [{ conceptId, prerequisiteId, conceptSlug: concept, prerequisiteSlug: prerequisite }]
          : [];
      });
    }),
  };
}

export function buildMobileCurriculumCatalog() {
  return {
    schemaVersion: MOBILE_CURRICULUM_SCHEMA_VERSION,
    certifications: seedCertifications.map((certification) => {
      const active = certification.versions.find((version) => version.isActive) ?? certification.versions[0];
      const aggregate = aggregateCounts(certification);
      return {
        slug: certification.slug === "security-plus" ? "security-plus-sy0-701" : certification.slug,
        sourceSlug: certification.slug,
        name: certification.name,
        vendor: certification.vendor,
        version: active.code,
        status: status(certification),
        ...aggregate,
      };
    }),
  };
}

export function buildMobileCurriculum(slug: string) {
  const sourceSlug = slug === "security-plus-sy0-701" ? "security-plus" : slug;
  const certification = seedCertifications.find((item) => item.slug === sourceSlug);
  if (!certification) return null;
  const active = certification.versions.find((version) => version.isActive) ?? certification.versions[0];
  return {
    schemaVersion: MOBILE_CURRICULUM_SCHEMA_VERSION,
    certification: {
      slug,
      name: certification.name,
      vendor: certification.vendor,
      description: certification.description,
      status: status(certification),
      activeVersion: active.code,
      counts: certification.slug === "security-plus" ? counts(active) : aggregateCounts(certification),
      versions: certification.versions.map((version) => toVersion(certification, version)),
    },
  };
}
