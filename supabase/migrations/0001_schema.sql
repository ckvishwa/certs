-- CERTFORGE AI — core schema
-- Source of truth for the database. Applied via `supabase db push`.
-- Conventions: UUID PKs, created_at/updated_at timestamptz, snake_case.

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type content_source as enum (
  'CURATED', 'AI_GENERATED', 'USER_UPLOADED', 'DERIVED_FROM_DOCUMENT'
);

create type verification_status as enum (
  'DRAFT', 'AI_REVIEWED', 'HUMAN_REVIEWED', 'VERIFIED'
);

create type learner_state as enum (
  'UNSEEN', 'EXPOSED', 'FRAGILE', 'LEARNING', 'RECALLING',
  'APPLYING', 'MASTERED', 'DECAYING', 'NEEDS_RESCUE'
);

create type cognitive_skill as enum (
  'REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'TROUBLESHOOT'
);

create type question_kind as enum (
  'SINGLE', 'MULTI', 'ORDERING', 'MATCHING', 'FILL_BLANK',
  'COMMAND', 'SCENARIO', 'IMAGE'
);

create type mistake_type as enum (
  'KNOWLEDGE_GAP', 'MEMORY_FAILURE', 'CONFUSION', 'READING_ERROR',
  'COMMAND_SYNTAX', 'CALCULATION', 'OVERTHINKING', 'TIME_PRESSURE'
);

create type confidence_level as enum (
  'GUESSING', 'UNSURE', 'FAIRLY_SURE', 'CERTAIN'
);

create type card_type as enum (
  'RECALL', 'REVERSE', 'COMPARISON', 'SCENARIO', 'IMAGE',
  'COMMAND', 'OUTPUT', 'CONFUSION_PAIR', 'CLOZE'
);

create type knowledge_level as enum ('NOVICE', 'SOME', 'STRONG', 'EXPERT');

create type study_intensity as enum ('LIGHT', 'STEADY', 'AGGRESSIVE');

create type task_type as enum (
  'NEW_LEARNING', 'ACTIVE_RECALL', 'FLASHCARDS', 'WEAK_REPAIR',
  'MIXED_QUIZ', 'TIMED_SPRINT', 'LAB', 'PBQ', 'MOCK_EXAM', 'ERROR_REVIEW'
);

-- ----------------------------------------------------------------------------
-- updated_at helper
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'learner',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Syllabus (content)
-- ----------------------------------------------------------------------------
create table certifications (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  vendor text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_certifications_updated before update on certifications
  for each row execute function set_updated_at();

create table exam_versions (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null references certifications(id) on delete cascade,
  code text not null,               -- e.g. "200-301 v1.1"
  name text not null,
  is_active boolean not null default true,
  active_from date,
  testing_until date,               -- when this version stops being testable
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (certification_id, code)
);
create trigger trg_exam_versions_updated before update on exam_versions
  for each row execute function set_updated_at();

create table domains (
  id uuid primary key default gen_random_uuid(),
  exam_version_id uuid not null references exam_versions(id) on delete cascade,
  code text not null,
  title text not null,
  weight numeric,                   -- blueprint percentage
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_version_id, code)
);
create trigger trg_domains_updated before update on domains
  for each row execute function set_updated_at();
create index idx_domains_version on domains(exam_version_id);

create table objectives (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references domains(id) on delete cascade,
  exam_version_id uuid not null references exam_versions(id) on delete cascade,
  code text not null,
  title text not null,
  is_placeholder boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (domain_id, code)
);
create trigger trg_objectives_updated before update on objectives
  for each row execute function set_updated_at();
create index idx_objectives_domain on objectives(domain_id);
create index idx_objectives_version on objectives(exam_version_id);

create table sub_objectives (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references objectives(id) on delete cascade,
  exam_version_id uuid not null references exam_versions(id) on delete cascade,
  code text not null,
  title text not null,
  is_placeholder boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (objective_id, code)
);
create trigger trg_sub_objectives_updated before update on sub_objectives
  for each row execute function set_updated_at();
create index idx_sub_objectives_objective on sub_objectives(objective_id);

create table concepts (
  id uuid primary key default gen_random_uuid(),
  sub_objective_id uuid references sub_objectives(id) on delete set null,
  objective_id uuid not null references objectives(id) on delete cascade,
  exam_version_id uuid not null references exam_versions(id) on delete cascade,
  slug text not null,
  name text not null,
  summary text,
  source content_source not null default 'CURATED',
  verification_status verification_status not null default 'DRAFT',
  is_placeholder boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_version_id, slug)
);
create trigger trg_concepts_updated before update on concepts
  for each row execute function set_updated_at();
create index idx_concepts_objective on concepts(objective_id);
create index idx_concepts_version on concepts(exam_version_id);

-- Knowledge graph: concept requires prerequisite
create table concept_dependencies (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references concepts(id) on delete cascade,
  prerequisite_id uuid not null references concepts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (concept_id, prerequisite_id),
  check (concept_id <> prerequisite_id)
);
create index idx_concept_deps_concept on concept_dependencies(concept_id);
create index idx_concept_deps_prereq on concept_dependencies(prerequisite_id);

-- ----------------------------------------------------------------------------
-- Learner (per-user)
-- ----------------------------------------------------------------------------
create table study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  certification_id uuid not null references certifications(id),
  exam_version_id uuid not null references exam_versions(id),
  target_exam_date date,
  weekday_minutes int not null default 60,
  weekend_minutes int not null default 90,
  intensity study_intensity not null default 'STEADY',
  knowledge_level knowledge_level not null default 'SOME',
  is_active boolean not null default true,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_study_plans_updated before update on study_plans
  for each row execute function set_updated_at();
create index idx_study_plans_user on study_plans(user_id);

create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_plan_id uuid references study_plans(id) on delete set null,
  objective_text text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  planned_minutes int,
  reflection jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_study_sessions_updated before update on study_sessions
  for each row execute function set_updated_at();
create index idx_study_sessions_user on study_sessions(user_id);

create table learner_concept_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  exam_version_id uuid not null references exam_versions(id) on delete cascade,
  exposure_count int not null default 0,
  attempt_count int not null default 0,
  correct_count int not null default 0,
  incorrect_count int not null default 0,
  accuracy numeric not null default 0,
  recent_accuracy numeric not null default 0,
  first_attempt_correct int not null default 0,
  first_attempt_total int not null default 0,
  confidence numeric not null default 0,
  avg_response_ms int not null default 0,
  mastery_score numeric not null default 0,     -- 0..1
  stability numeric not null default 0,         -- FSRS
  difficulty numeric not null default 0,        -- FSRS
  retrievability numeric not null default 0,    -- FSRS
  last_studied timestamptz,
  last_recalled timestamptz,
  next_review timestamptz,
  consecutive_correct int not null default 0,
  consecutive_incorrect int not null default 0,
  state learner_state not null default 'UNSEEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, concept_id)
);
create trigger trg_lcs_updated before update on learner_concept_state
  for each row execute function set_updated_at();
create index idx_lcs_user on learner_concept_state(user_id);
create index idx_lcs_user_state on learner_concept_state(user_id, state);
create index idx_lcs_next_review on learner_concept_state(user_id, next_review);

create table daily_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_plan_id uuid references study_plans(id) on delete cascade,
  mission_date date not null,
  total_minutes int not null default 0,
  generated_by text not null default 'scheduler',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mission_date)
);
create trigger trg_daily_missions_updated before update on daily_missions
  for each row execute function set_updated_at();
create index idx_daily_missions_user on daily_missions(user_id, mission_date);

create table study_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_mission_id uuid references daily_missions(id) on delete cascade,
  type task_type not null,
  title text not null,
  reason text,
  estimated_minutes int not null default 10,
  payload jsonb not null default '{}'::jsonb,
  position int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_study_tasks_updated before update on study_tasks
  for each row execute function set_updated_at();
create index idx_study_tasks_mission on study_tasks(daily_mission_id);
create index idx_study_tasks_user on study_tasks(user_id);
