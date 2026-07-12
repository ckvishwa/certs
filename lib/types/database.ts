/**
 * Hand-authored database types matching supabase/migrations/*.
 * (When the Supabase CLI is linked, this can be regenerated with
 *  `supabase gen types typescript` — until then we maintain it by hand.)
 *
 * NOTE: row shapes MUST be `type` aliases, not `interface`s — supabase-js
 * constrains table `Row` to `Record<string, unknown>`, which interfaces do not
 * satisfy (no implicit index signature). Using interfaces makes every table
 * resolve to `never`.
 */

// --- Enums -----------------------------------------------------------------
export type ContentSource =
  | "CURATED"
  | "AI_GENERATED"
  | "USER_UPLOADED"
  | "DERIVED_FROM_DOCUMENT";

export type VerificationStatus =
  | "DRAFT"
  | "AI_REVIEWED"
  | "HUMAN_REVIEWED"
  | "VERIFIED";

export type LearnerState =
  | "UNSEEN"
  | "EXPOSED"
  | "FRAGILE"
  | "LEARNING"
  | "RECALLING"
  | "APPLYING"
  | "MASTERED"
  | "DECAYING"
  | "NEEDS_RESCUE";

export type CognitiveSkill =
  | "REMEMBER"
  | "UNDERSTAND"
  | "APPLY"
  | "ANALYZE"
  | "TROUBLESHOOT";

export type QuestionKind =
  | "SINGLE"
  | "MULTI"
  | "ORDERING"
  | "MATCHING"
  | "FILL_BLANK"
  | "COMMAND"
  | "SCENARIO"
  | "IMAGE";

export type MistakeType =
  | "KNOWLEDGE_GAP"
  | "MEMORY_FAILURE"
  | "CONFUSION"
  | "READING_ERROR"
  | "COMMAND_SYNTAX"
  | "CALCULATION"
  | "OVERTHINKING"
  | "TIME_PRESSURE";

export type ConfidenceLevel = "GUESSING" | "UNSURE" | "FAIRLY_SURE" | "CERTAIN";

export type CardType =
  | "RECALL"
  | "REVERSE"
  | "COMPARISON"
  | "SCENARIO"
  | "IMAGE"
  | "COMMAND"
  | "OUTPUT"
  | "CONFUSION_PAIR"
  | "CLOZE";

export type KnowledgeLevel = "NOVICE" | "SOME" | "STRONG" | "EXPERT";
export type StudyIntensity = "LIGHT" | "STEADY" | "AGGRESSIVE";
export type TaskType =
  | "NEW_LEARNING"
  | "ACTIVE_RECALL"
  | "FLASHCARDS"
  | "WEAK_REPAIR"
  | "MIXED_QUIZ"
  | "TIMED_SPRINT"
  | "LAB"
  | "PBQ"
  | "MOCK_EXAM"
  | "ERROR_REVIEW";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Timestamps = { created_at: string; updated_at: string };

// --- Row shapes (type aliases — see file note) -----------------------------
export type ProfileRow = Timestamps & {
  id: string;
  display_name: string | null;
  role: string;
  preferences: Json;
};

export type CertificationRow = Timestamps & {
  id: string;
  slug: string;
  name: string;
  vendor: string;
  description: string | null;
};

export type ExamVersionRow = Timestamps & {
  id: string;
  certification_id: string;
  code: string;
  name: string;
  is_active: boolean;
  active_from: string | null;
  testing_until: string | null;
};

export type DomainRow = Timestamps & {
  id: string;
  exam_version_id: string;
  code: string;
  title: string;
  weight: number | null;
  position: number;
};

export type ObjectiveRow = Timestamps & {
  id: string;
  domain_id: string;
  exam_version_id: string;
  code: string;
  title: string;
  is_placeholder: boolean;
  position: number;
};

export type SubObjectiveRow = Timestamps & {
  id: string;
  objective_id: string;
  exam_version_id: string;
  code: string;
  title: string;
  is_placeholder: boolean;
  position: number;
};

export type ConceptRow = Timestamps & {
  id: string;
  sub_objective_id: string | null;
  objective_id: string;
  exam_version_id: string;
  slug: string;
  name: string;
  summary: string | null;
  source: ContentSource;
  verification_status: VerificationStatus;
  is_placeholder: boolean;
  position: number;
};

export type ConceptDependencyRow = {
  id: string;
  concept_id: string;
  prerequisite_id: string;
  created_at: string;
};

export type StudyPlanRow = Timestamps & {
  id: string;
  user_id: string;
  certification_id: string;
  exam_version_id: string;
  target_exam_date: string | null;
  weekday_minutes: number;
  weekend_minutes: number;
  intensity: StudyIntensity;
  knowledge_level: KnowledgeLevel;
  is_active: boolean;
  onboarding_complete: boolean;
};

export type LearnerConceptStateRow = Timestamps & {
  id: string;
  user_id: string;
  concept_id: string;
  exam_version_id: string;
  exposure_count: number;
  attempt_count: number;
  correct_count: number;
  incorrect_count: number;
  accuracy: number;
  recent_accuracy: number;
  first_attempt_correct: number;
  first_attempt_total: number;
  confidence: number;
  avg_response_ms: number;
  mastery_score: number;
  stability: number;
  difficulty: number;
  retrievability: number;
  last_studied: string | null;
  last_recalled: string | null;
  next_review: string | null;
  consecutive_correct: number;
  consecutive_incorrect: number;
  state: LearnerState;
};

export type DailyMissionRow = Timestamps & {
  id: string;
  user_id: string;
  study_plan_id: string | null;
  mission_date: string;
  total_minutes: number;
  generated_by: string;
};

export type StudyTaskRow = Timestamps & {
  id: string;
  user_id: string;
  daily_mission_id: string | null;
  type: TaskType;
  title: string;
  reason: string | null;
  estimated_minutes: number;
  payload: Json;
  position: number;
  completed_at: string | null;
};

export type QuestionRow = Timestamps & {
  id: string;
  exam_version_id: string;
  objective_id: string | null;
  owner_id: string | null;
  external_ref: string | null;
  kind: QuestionKind;
  cognitive_skill: CognitiveSkill;
  difficulty: number;
  stem: string;
  explanation: string | null;
  exam_trap: string | null;
  memory_hook: string | null;
  source: ContentSource;
  verification_status: VerificationStatus;
  confidence: number | null;
};

export type QuestionChoiceRow = {
  id: string;
  question_id: string;
  label: string;
  body: string;
  is_correct: boolean;
  rationale: string | null;
  position: number;
  created_at: string;
};

export type QuestionConceptRow = {
  question_id: string;
  concept_id: string;
};

export type QuestionAttemptRow = {
  id: string;
  user_id: string;
  question_id: string;
  study_session_id: string | null;
  selected: Json;
  is_correct: boolean;
  confidence: ConfidenceLevel | null;
  response_ms: number | null;
  hint_used: boolean;
  created_at: string;
};

export type MistakeRow = {
  id: string;
  user_id: string;
  question_id: string | null;
  concept_id: string | null;
  objective_id: string | null;
  type: MistakeType | null;
  confidence: ConfidenceLevel | null;
  chosen: Json | null;
  correct: Json | null;
  response_ms: number | null;
  note: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type AiGenerationRow = {
  id: string;
  user_id: string | null;
  service: string;
  prompt_version: string;
  provider: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  validation_ok: boolean;
  error: string | null;
  metadata: Json;
  created_at: string;
};

// Insert requires the non-defaulted columns; Update is a partial.
type TableDef<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow, "id">;
      certifications: TableDef<CertificationRow, "slug" | "name" | "vendor">;
      exam_versions: TableDef<
        ExamVersionRow,
        "certification_id" | "code" | "name"
      >;
      domains: TableDef<DomainRow, "exam_version_id" | "code" | "title">;
      objectives: TableDef<
        ObjectiveRow,
        "domain_id" | "exam_version_id" | "code" | "title"
      >;
      sub_objectives: TableDef<
        SubObjectiveRow,
        "objective_id" | "exam_version_id" | "code" | "title"
      >;
      concepts: TableDef<
        ConceptRow,
        "objective_id" | "exam_version_id" | "slug" | "name"
      >;
      concept_dependencies: TableDef<
        ConceptDependencyRow,
        "concept_id" | "prerequisite_id"
      >;
      study_plans: TableDef<
        StudyPlanRow,
        "user_id" | "certification_id" | "exam_version_id"
      >;
      learner_concept_state: TableDef<
        LearnerConceptStateRow,
        "user_id" | "concept_id" | "exam_version_id"
      >;
      daily_missions: TableDef<DailyMissionRow, "user_id" | "mission_date">;
      study_tasks: TableDef<StudyTaskRow, "user_id" | "type" | "title">;
      questions: TableDef<QuestionRow, "exam_version_id" | "stem">;
      question_choices: TableDef<
        QuestionChoiceRow,
        "question_id" | "label" | "body"
      >;
      question_concepts: TableDef<
        QuestionConceptRow,
        "question_id" | "concept_id"
      >;
      question_attempts: TableDef<
        QuestionAttemptRow,
        "user_id" | "question_id" | "is_correct"
      >;
      mistakes: TableDef<MistakeRow, "user_id">;
      ai_generations: TableDef<
        AiGenerationRow,
        "service" | "prompt_version" | "provider" | "model"
      >;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    CompositeTypes: Record<never, never>;
    Enums: {
      content_source: ContentSource;
      verification_status: VerificationStatus;
      learner_state: LearnerState;
      cognitive_skill: CognitiveSkill;
      question_kind: QuestionKind;
      mistake_type: MistakeType;
      confidence_level: ConfidenceLevel;
      card_type: CardType;
      knowledge_level: KnowledgeLevel;
      study_intensity: StudyIntensity;
      task_type: TaskType;
    };
  };
};
