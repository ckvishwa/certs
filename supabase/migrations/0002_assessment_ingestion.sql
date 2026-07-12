-- CERTFORGE AI — assessment, ingestion, AI, and audit tables.
-- Schema created now; most are wired up in later slices.

-- ----------------------------------------------------------------------------
-- Questions
-- ----------------------------------------------------------------------------
create table questions (
  id uuid primary key default gen_random_uuid(),
  exam_version_id uuid not null references exam_versions(id) on delete cascade,
  objective_id uuid references objectives(id) on delete set null,
  owner_id uuid references auth.users(id) on delete cascade, -- null = shared/curated
  external_ref text unique,                        -- stable seed key (idempotent import)
  kind question_kind not null default 'SINGLE',
  cognitive_skill cognitive_skill not null default 'UNDERSTAND',
  difficulty int not null default 3,               -- 1..5
  stem text not null,
  explanation text,
  exam_trap text,
  memory_hook text,
  source content_source not null default 'CURATED',
  verification_status verification_status not null default 'DRAFT',
  confidence numeric,                              -- extraction/generation confidence 0..1
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_questions_updated before update on questions
  for each row execute function set_updated_at();
create index idx_questions_version on questions(exam_version_id);
create index idx_questions_objective on questions(objective_id);
create index idx_questions_owner on questions(owner_id);

create table question_choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  label text not null,
  body text not null,
  is_correct boolean not null default false,
  rationale text,                                  -- why this distractor is wrong/right
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index idx_question_choices_question on question_choices(question_id);

-- A question can map to multiple concepts
create table question_concepts (
  question_id uuid not null references questions(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  primary key (question_id, concept_id)
);

create table question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  study_session_id uuid references study_sessions(id) on delete set null,
  selected jsonb not null default '[]'::jsonb,     -- chosen choice ids / answer
  is_correct boolean not null,
  confidence confidence_level,
  response_ms int,
  hint_used boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_question_attempts_user on question_attempts(user_id, created_at);
create index idx_question_attempts_question on question_attempts(question_id);

-- ----------------------------------------------------------------------------
-- Flashcards + spaced repetition
-- ----------------------------------------------------------------------------
create table flashcards (
  id uuid primary key default gen_random_uuid(),
  exam_version_id uuid not null references exam_versions(id) on delete cascade,
  concept_id uuid references concepts(id) on delete set null,
  owner_id uuid references auth.users(id) on delete cascade,
  type card_type not null default 'RECALL',
  front text not null,
  back text not null,
  extra jsonb not null default '{}'::jsonb,
  source content_source not null default 'CURATED',
  verification_status verification_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_flashcards_updated before update on flashcards
  for each row execute function set_updated_at();
create index idx_flashcards_version on flashcards(exam_version_id);
create index idx_flashcards_owner on flashcards(owner_id);

create table flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flashcard_id uuid not null references flashcards(id) on delete cascade,
  rating smallint not null,                        -- 1 Again .. 4 Easy
  is_correct boolean,
  response_ms int,
  stability_before numeric,
  stability_after numeric,
  difficulty_after numeric,
  scheduled_days int,
  due_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_flashcard_reviews_user on flashcard_reviews(user_id, created_at);
create index idx_flashcard_reviews_card on flashcard_reviews(flashcard_id);

-- Per-user scheduling state for a card (FSRS)
create table flashcard_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flashcard_id uuid not null references flashcards(id) on delete cascade,
  stability numeric not null default 0,
  difficulty numeric not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  last_reviewed timestamptz,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, flashcard_id)
);
create trigger trg_flashcard_states_updated before update on flashcard_states
  for each row execute function set_updated_at();
create index idx_flashcard_states_due on flashcard_states(user_id, due_at);

-- ----------------------------------------------------------------------------
-- Mistakes + confusion
-- ----------------------------------------------------------------------------
create table mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid references questions(id) on delete set null,
  concept_id uuid references concepts(id) on delete set null,
  objective_id uuid references objectives(id) on delete set null,
  type mistake_type,
  confidence confidence_level,
  chosen jsonb,
  correct jsonb,
  response_ms int,
  note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_mistakes_user on mistakes(user_id, created_at);
create index idx_mistakes_concept on mistakes(concept_id);

create table confusion_pairs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_a uuid not null references concepts(id) on delete cascade,
  concept_b uuid not null references concepts(id) on delete cascade,
  occurrences int not null default 1,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, concept_a, concept_b)
);
create index idx_confusion_pairs_user on confusion_pairs(user_id);

-- ----------------------------------------------------------------------------
-- Mock exams
-- ----------------------------------------------------------------------------
create table mock_exams (
  id uuid primary key default gen_random_uuid(),
  exam_version_id uuid not null references exam_versions(id) on delete cascade,
  title text not null,
  question_count int not null default 20,
  time_limit_minutes int,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_mock_exams_updated before update on mock_exams
  for each row execute function set_updated_at();

create table mock_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mock_exam_id uuid references mock_exams(id) on delete set null,
  exam_version_id uuid not null references exam_versions(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  score numeric,
  domain_breakdown jsonb,
  created_at timestamptz not null default now()
);
create index idx_mock_attempts_user on mock_exam_attempts(user_id);

-- ----------------------------------------------------------------------------
-- Notes + document ingestion
-- ----------------------------------------------------------------------------
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid references concepts(id) on delete set null,
  objective_id uuid references objectives(id) on delete set null,
  title text,
  body text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_notes_updated before update on notes
  for each row execute function set_updated_at();
create index idx_notes_user on notes(user_id);

create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_version_id uuid references exam_versions(id) on delete set null,
  filename text not null,
  mime_type text not null,
  byte_size bigint not null,
  storage_path text not null,
  status text not null default 'UPLOADED',      -- UPLOADED|EXTRACTING|PARSED|IMPORTED|FAILED
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_documents_updated before update on documents
  for each row execute function set_updated_at();
create index idx_documents_user on documents(user_id);

create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position int not null default 0,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_document_chunks_doc on document_chunks(document_id);

create table imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  exam_version_id uuid references exam_versions(id) on delete set null,
  status text not null default 'PENDING_REVIEW',
  detected_count int not null default 0,
  mapped_count int not null default 0,
  needs_review_count int not null default 0,
  duplicate_count int not null default 0,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_imports_updated before update on imports
  for each row execute function set_updated_at();
create index idx_imports_user on imports(user_id);

-- ----------------------------------------------------------------------------
-- AI generations + audit
-- ----------------------------------------------------------------------------
create table ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  service text not null,                    -- e.g. "explainConcept"
  prompt_version text not null,
  provider text not null,
  model text not null,
  input_tokens int,
  output_tokens int,
  validation_ok boolean not null default true,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_ai_generations_user on ai_generations(user_id, created_at);
create index idx_ai_generations_service on ai_generations(service);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_logs_user on audit_logs(user_id, created_at);
