-- Private REVA device enrollment. These tables have no browser/client policies:
-- all access is through server-side service-role code only.

create table reva_enrollment_codes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references profiles(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  created_by text not null default 'owner-cli'
);
create index idx_reva_enrollment_codes_active
  on reva_enrollment_codes (code_hash, expires_at)
  where used_at is null;

create table reva_owner_devices (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references profiles(id) on delete cascade,
  token_hash text not null unique,
  device_label text not null,
  platform text not null,
  app_version text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);
create index idx_reva_owner_devices_active
  on reva_owner_devices (token_hash)
  where revoked_at is null;

alter table reva_enrollment_codes enable row level security;
alter table reva_owner_devices enable row level security;

-- Locks the code row, marks it used, and creates the device in one transaction.
-- Invalid, expired, and already-used codes all return no row so the route does
-- not disclose owner information.
create or replace function consume_reva_enrollment_code(
  p_code_hash text,
  p_token_hash text,
  p_device_label text,
  p_platform text,
  p_app_version text
)
returns table (owner_user_id uuid, display_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  enrollment reva_enrollment_codes%rowtype;
begin
  select * into enrollment
  from reva_enrollment_codes
  where code_hash = p_code_hash
  for update;

  if not found or enrollment.used_at is not null or enrollment.expires_at <= now() then
    return;
  end if;

  update reva_enrollment_codes
  set used_at = now()
  where id = enrollment.id;

  insert into reva_owner_devices (
    owner_user_id, token_hash, device_label, platform, app_version
  ) values (
    enrollment.owner_user_id, p_token_hash, p_device_label, p_platform,
    nullif(p_app_version, '')
  );

  return query
  select enrollment.owner_user_id, profiles.display_name
  from profiles
  where profiles.id = enrollment.owner_user_id;
end;
$$;

revoke all on table reva_enrollment_codes, reva_owner_devices from anon, authenticated;
revoke all on function consume_reva_enrollment_code(text, text, text, text, text) from public, anon, authenticated;
grant execute on function consume_reva_enrollment_code(text, text, text, text, text) to service_role;
