/**
 * Idempotent syllabus seeder. Run with:
 *   node --env-file=.env.local scripts/seed.mts
 * (or `npm run db:seed`). Uses the service-role key and bypasses RLS.
 * Safe to re-run — everything upserts on natural keys.
 */
import { createClient } from "@supabase/supabase-js";
import {
  seedCertifications,
  conceptDependencies,
  seedQuestions,
  type SeedConcept,
} from "../supabase/seed/data.mts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with --env-file=.env.local",
  );
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function upsert<T extends Record<string, unknown>>(
  table: string,
  row: T,
  onConflict: string,
): Promise<string> {
  const { data, error } = await db
    .from(table)
    .upsert(row, { onConflict })
    .select("id")
    .single();
  if (error) throw new Error(`${table} upsert failed: ${error.message}`);
  return (data as { id: string }).id;
}

async function main() {
  const counts = { certs: 0, versions: 0, domains: 0, objectives: 0, subObjectives: 0, concepts: 0, deps: 0, questions: 0 };

  for (const cert of seedCertifications) {
    const certId = await upsert(
      "certifications",
      { slug: cert.slug, name: cert.name, vendor: cert.vendor, description: cert.description },
      "slug",
    );
    counts.certs++;

    for (const version of cert.versions) {
      const versionId = await upsert(
        "exam_versions",
        {
          certification_id: certId,
          code: version.code,
          name: version.name,
          is_active: version.isActive,
          active_from: version.activeFrom ?? null,
          testing_until: version.testingUntil ?? null,
        },
        "certification_id,code",
      );
      counts.versions++;

      // Track concept slug -> id (and its objective) within this version.
      const conceptIds: Record<string, string> = {};
      const conceptObjectiveIds: Record<string, string> = {};

      for (let d = 0; d < version.domains.length; d++) {
        const domain = version.domains[d];
        const domainId = await upsert(
          "domains",
          {
            exam_version_id: versionId,
            code: domain.code,
            title: domain.title,
            weight: domain.weight,
            position: d,
          },
          "exam_version_id,code",
        );
        counts.domains++;

        for (let o = 0; o < domain.objectives.length; o++) {
          const obj = domain.objectives[o];
          const objectiveId = await upsert(
            "objectives",
            {
              domain_id: domainId,
              exam_version_id: versionId,
              code: obj.code,
              title: obj.title,
              is_placeholder: obj.placeholder ?? false,
              position: o,
            },
            "domain_id,code",
          );
          counts.objectives++;

          const upsertConcept = async (
            concept: SeedConcept,
            position: number,
            subObjectiveId: string | null,
          ) => {
            const conceptId = await upsert(
              "concepts",
              {
                objective_id: objectiveId,
                sub_objective_id: subObjectiveId,
                exam_version_id: versionId,
                slug: concept.slug,
                name: concept.name,
                summary: concept.summary ?? null,
                is_placeholder: concept.placeholder ?? false,
                source: "CURATED",
                verification_status: "DRAFT",
                position,
              },
              "exam_version_id,slug",
            );
            conceptIds[concept.slug] = conceptId;
            conceptObjectiveIds[concept.slug] = objectiveId;
            counts.concepts++;
          };

          // Meaningful official bullet groups (sub_objectives), each with its
          // own concepts. Not created per nested bullet — only where the seed
          // data explicitly defines a grouping.
          for (let s = 0; s < (obj.subObjectives?.length ?? 0); s++) {
            const sub = obj.subObjectives![s];
            const subObjectiveId = await upsert(
              "sub_objectives",
              {
                objective_id: objectiveId,
                exam_version_id: versionId,
                code: sub.code,
                title: sub.title,
                is_placeholder: false,
                position: s,
              },
              "objective_id,code",
            );
            counts.subObjectives++;

            for (let c = 0; c < (sub.concepts?.length ?? 0); c++) {
              await upsertConcept(sub.concepts![c], c, subObjectiveId);
            }
          }

          // Concepts attached directly to the objective (no sub-grouping).
          for (let c = 0; c < (obj.concepts?.length ?? 0); c++) {
            await upsertConcept(obj.concepts![c], c, null);
          }
        }
      }

      // Dependency edges — only where both endpoints exist in this version.
      for (const [slug, prereqs] of Object.entries(conceptDependencies)) {
        const conceptId = conceptIds[slug];
        if (!conceptId) continue;
        for (const prereqSlug of prereqs) {
          const prereqId = conceptIds[prereqSlug];
          if (!prereqId) continue;
          const { error } = await db
            .from("concept_dependencies")
            .upsert(
              { concept_id: conceptId, prerequisite_id: prereqId },
              { onConflict: "concept_id,prerequisite_id" },
            );
          if (error) throw new Error(`concept_dependencies failed: ${error.message}`);
          counts.deps++;
        }
      }

      // Curated questions for this version.
      for (const q of seedQuestions.filter((x) => x.versionCode === version.code)) {
        const conceptId = conceptIds[q.conceptSlug];
        const objectiveId = conceptObjectiveIds[q.conceptSlug];
        if (!conceptId || !objectiveId) continue;

        const questionId = await upsert(
          "questions",
          {
            exam_version_id: versionId,
            objective_id: objectiveId,
            owner_id: null,
            external_ref: q.ref,
            kind: q.kind ?? "SINGLE",
            cognitive_skill: q.skill ?? "UNDERSTAND",
            difficulty: q.difficulty ?? 3,
            stem: q.stem,
            explanation: q.explanation ?? null,
            exam_trap: q.examTrap ?? null,
            source: "CURATED",
            verification_status: "VERIFIED",
          },
          "external_ref",
        );

        // Re-seed children cleanly.
        await db.from("question_choices").delete().eq("question_id", questionId);
        await db.from("question_concepts").delete().eq("question_id", questionId);

        const choiceRows = q.choices.map((c, i) => ({
          question_id: questionId,
          label: c.label,
          body: c.body,
          is_correct: c.correct ?? false,
          rationale: c.rationale ?? null,
          position: i,
        }));
        const { error: choiceErr } = await db
          .from("question_choices")
          .insert(choiceRows);
        if (choiceErr) throw new Error(`question_choices failed: ${choiceErr.message}`);

        const { error: qcErr } = await db
          .from("question_concepts")
          .insert({ question_id: questionId, concept_id: conceptId });
        if (qcErr) throw new Error(`question_concepts failed: ${qcErr.message}`);

        counts.questions++;
      }
    }
  }

  console.log("Seed complete:", counts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
