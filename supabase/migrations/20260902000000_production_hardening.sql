-- Kairos production hardening: schema (idempotent), tenant-scoped RLS, signup trigger,
-- storage buckets, realtime. Safe to run against an existing project: every statement is
-- IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.
--
-- Apply with:  supabase db push   (or paste into the SQL editor)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables (columns are the ones the app reads/writes)
-- ---------------------------------------------------------------------------
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  status text not null default 'pre-production'
    check (status in ('pre-production', 'production', 'post-production', 'archived')),
  script_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles_master (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text not null,
  permissions jsonb
);

create table if not exists public.project_roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  role_id uuid not null references public.roles_master(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, role_id)
);

create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  scene_number text not null,
  location text not null,
  day_night text not null default 'DAY',
  description text default '',
  characters text[] not null default '{}',
  scheduled_date date,
  status text not null default 'pending'
    check (status in ('pending', 'scheduled', 'completed', 'omitted')),
  created_at timestamptz not null default now()
);

create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null,
  description text not null,
  planned_amount numeric(14,2) not null default 0 check (planned_amount >= 0),
  actual_amount numeric(14,2) not null default 0 check (actual_amount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.call_sheets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  date date not null,
  location text,
  crew_assignments jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (project_id, date)
);

create table if not exists public.continuity_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  scene_id uuid references public.scenes(id) on delete set null,
  photo_url text not null,
  annotation text default '',
  user_id uuid references public.users(id) on delete set null,
  taken_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists users_tenant_idx on public.users(tenant_id);
create index if not exists projects_tenant_idx on public.projects(tenant_id);
create index if not exists project_roles_project_idx on public.project_roles(project_id);
create index if not exists scenes_project_idx on public.scenes(project_id);
create index if not exists budget_items_project_idx on public.budget_items(project_id);
create index if not exists continuity_photos_project_idx on public.continuity_photos(project_id);
create index if not exists messages_project_created_idx on public.messages(project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.current_tenant_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select tenant_id from public.users where id = auth.uid()
$$;

create or replace function public.project_in_my_tenant(pid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where p.id = pid and p.tenant_id = public.current_tenant_id()
  )
$$;

-- Creates tenant + profile when a user signs up. Metadata contract (set by the app):
--   full_name   : display name
--   tenant_name : new production house (self sign-up)
--   tenant_id   : existing production house (crew invite)
create or replace function public.provision_profile(p_user_id uuid, p_email text, p_meta jsonb)
returns public.users
language plpgsql security definer set search_path = public
as $$
declare
  v_tenant uuid;
  v_name text;
  v_row public.users;
begin
  select * into v_row from public.users where id = p_user_id;
  if found then
    return v_row;
  end if;

  v_name := coalesce(p_meta->>'full_name', split_part(p_email, '@', 1));

  if (p_meta->>'tenant_id') is not null then
    begin
      v_tenant := (p_meta->>'tenant_id')::uuid;
    exception when invalid_text_representation then
      v_tenant := null;
    end;
    if not exists (select 1 from public.tenants where id = v_tenant) then
      v_tenant := null;
    end if;
  end if;

  if v_tenant is null then
    insert into public.tenants (name)
    values (coalesce(p_meta->>'tenant_name', v_name || '''s Production House'))
    returning id into v_tenant;
  end if;

  insert into public.users (id, tenant_id, full_name)
  values (p_user_id, v_tenant, v_name)
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.provision_profile(new.id, new.email, coalesce(new.raw_user_meta_data, '{}'::jsonb));
  return new;
end;
$$;

-- Client-callable fallback used by the app when the profile row is missing
-- (e.g. accounts created before this trigger existed).
create or replace function public.ensure_profile()
returns public.users
language plpgsql security definer set search_path = public
as $$
declare
  v_email text;
  v_meta jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select email, coalesce(raw_user_meta_data, '{}'::jsonb) into v_email, v_meta
  from auth.users where id = auth.uid();
  return public.provision_profile(auth.uid(), v_email, v_meta);
end;
$$;

revoke all on function public.ensure_profile() from public;
grant execute on function public.ensure_profile() to authenticated;
revoke all on function public.provision_profile(uuid, text, jsonb) from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: every row is scoped to the caller's tenant
-- ---------------------------------------------------------------------------
alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.roles_master enable row level security;
alter table public.project_roles enable row level security;
alter table public.scenes enable row level security;
alter table public.budget_items enable row level security;
alter table public.call_sheets enable row level security;
alter table public.continuity_photos enable row level security;
alter table public.messages enable row level security;

-- tenants
drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants for select to authenticated
  using (id = public.current_tenant_id());
drop policy if exists tenants_insert on public.tenants;

-- users
drop policy if exists users_select on public.users;
create policy users_select on public.users for select to authenticated
  using (tenant_id = public.current_tenant_id());
drop policy if exists users_insert_self on public.users;
drop policy if exists users_insert_invite on public.users;
drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and tenant_id = public.current_tenant_id());

-- projects
drop policy if exists projects_all on public.projects;
create policy projects_all on public.projects for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- roles_master: global read-only catalogue
drop policy if exists roles_master_select on public.roles_master;
create policy roles_master_select on public.roles_master for select to authenticated using (true);

-- project-scoped tables
drop policy if exists project_roles_all on public.project_roles;
create policy project_roles_all on public.project_roles for all to authenticated
  using (public.project_in_my_tenant(project_id)) with check (public.project_in_my_tenant(project_id));

drop policy if exists scenes_all on public.scenes;
create policy scenes_all on public.scenes for all to authenticated
  using (public.project_in_my_tenant(project_id)) with check (public.project_in_my_tenant(project_id));

drop policy if exists budget_items_all on public.budget_items;
create policy budget_items_all on public.budget_items for all to authenticated
  using (public.project_in_my_tenant(project_id)) with check (public.project_in_my_tenant(project_id));

drop policy if exists call_sheets_all on public.call_sheets;
create policy call_sheets_all on public.call_sheets for all to authenticated
  using (public.project_in_my_tenant(project_id)) with check (public.project_in_my_tenant(project_id));

drop policy if exists continuity_photos_all on public.continuity_photos;
create policy continuity_photos_all on public.continuity_photos for all to authenticated
  using (public.project_in_my_tenant(project_id)) with check (public.project_in_my_tenant(project_id));

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (public.project_in_my_tenant(project_id));
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (user_id = auth.uid() and public.project_in_my_tenant(project_id));
drop policy if exists messages_delete_own on public.messages;
create policy messages_delete_own on public.messages for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: private buckets, objects live under <project_id>/...
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scripts', 'scripts', false, 52428800, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('continuity', 'continuity', false, 10485760, array['image/jpeg', 'image/png', 'image/heic'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists storage_project_objects on storage.objects;
create policy storage_project_objects on storage.objects for all to authenticated
  using (
    bucket_id in ('scripts', 'continuity')
    and public.project_in_my_tenant(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id in ('scripts', 'continuity')
    and public.project_in_my_tenant(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- Realtime (Dashboard + TeamChat subscriptions)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'projects') then
    alter publication supabase_realtime add table public.projects;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
