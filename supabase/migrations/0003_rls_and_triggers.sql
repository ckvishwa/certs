-- CERTFORGE AI — Row-Level Security + auth trigger.
-- Model: content tables are readable by any authenticated user (writes go
-- through the service role, which bypasses RLS). User-owned tables are
-- restricted to the owner (auth.uid()). This prevents IDOR / cross-user reads.

-- ----------------------------------------------------------------------------
-- Create a profile row automatically when an auth user is created.
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- Enable RLS everywhere
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;
alter table certifications enable row level security;
alter table exam_versions enable row level security;
alter table domains enable row level security;
alter table objectives enable row level security;
alter table sub_objectives enable row level security;
alter table concepts enable row level security;
alter table concept_dependencies enable row level security;
alter table study_plans enable row level security;
alter table study_sessions enable row level security;
alter table learner_concept_state enable row level security;
alter table daily_missions enable row level security;
alter table study_tasks enable row level security;
alter table questions enable row level security;
alter table question_choices enable row level security;
alter table question_concepts enable row level security;
alter table question_attempts enable row level security;
alter table flashcards enable row level security;
alter table flashcard_reviews enable row level security;
alter table flashcard_states enable row level security;
alter table mistakes enable row level security;
alter table confusion_pairs enable row level security;
alter table mock_exams enable row level security;
alter table mock_exam_attempts enable row level security;
alter table notes enable row level security;
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table imports enable row level security;
alter table ai_generations enable row level security;
alter table audit_logs enable row level security;

-- ----------------------------------------------------------------------------
-- Content: read for any authenticated user
-- ----------------------------------------------------------------------------
create policy content_read on certifications for select to authenticated using (true);
create policy content_read on exam_versions for select to authenticated using (true);
create policy content_read on domains for select to authenticated using (true);
create policy content_read on objectives for select to authenticated using (true);
create policy content_read on sub_objectives for select to authenticated using (true);
create policy content_read on concepts for select to authenticated using (true);
create policy content_read on concept_dependencies for select to authenticated using (true);
create policy content_read on mock_exams for select to authenticated using (true);

-- ----------------------------------------------------------------------------
-- Profiles: owner only (keyed on id)
-- ----------------------------------------------------------------------------
create policy profiles_select on profiles for select to authenticated using (auth.uid() = id);
create policy profiles_update on profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_insert on profiles for insert to authenticated with check (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- Owner-only tables (user_id = auth.uid()) — full CRUD
-- ----------------------------------------------------------------------------
create policy owner_all on study_plans for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on study_sessions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on learner_concept_state for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on daily_missions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on study_tasks for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on question_attempts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on flashcard_reviews for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on flashcard_states for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on mistakes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on confusion_pairs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on mock_exam_attempts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on notes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on documents for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on document_chunks for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on imports for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ai_generations / audit_logs: owner may read their own; inserts happen via
-- service role (server), so no owner insert policy is required.
create policy owner_read on ai_generations for select to authenticated using (auth.uid() = user_id);
create policy owner_read on audit_logs for select to authenticated using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- User-authored content: curated (owner_id null) is shared; own rows editable
-- ----------------------------------------------------------------------------
create policy questions_read on questions for select to authenticated
  using (owner_id is null or owner_id = auth.uid());
create policy questions_write on questions for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy flashcards_read on flashcards for select to authenticated
  using (owner_id is null or owner_id = auth.uid());
create policy flashcards_write on flashcards for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Question children: visibility follows the parent question.
create policy question_choices_read on question_choices for select to authenticated
  using (exists (
    select 1 from questions q
    where q.id = question_choices.question_id
      and (q.owner_id is null or q.owner_id = auth.uid())
  ));
create policy question_choices_write on question_choices for all to authenticated
  using (exists (
    select 1 from questions q
    where q.id = question_choices.question_id and q.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from questions q
    where q.id = question_choices.question_id and q.owner_id = auth.uid()
  ));

create policy question_concepts_read on question_concepts for select to authenticated
  using (exists (
    select 1 from questions q
    where q.id = question_concepts.question_id
      and (q.owner_id is null or q.owner_id = auth.uid())
  ));
create policy question_concepts_write on question_concepts for all to authenticated
  using (exists (
    select 1 from questions q
    where q.id = question_concepts.question_id and q.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from questions q
    where q.id = question_concepts.question_id and q.owner_id = auth.uid()
  ));
