-- SamaajSetu MVP schema (vectors live in ChromaDB, not Postgres)

create extension if not exists pgcrypto;

-- ===== Tenants =====
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now()
);

-- ===== Profiles (1:1 with auth.users) =====
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'volunteer'
    check (role in ('volunteer','coordinator','admin','field_worker','donor')),
  languages text[] default '{}',
  skills jsonb default '[]'::jsonb,
  home_lat double precision,
  home_lng double precision,
  max_radius_km int default 8,
  availability jsonb default '{}'::jsonb,
  trust_score numeric default 0.5,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ===== Programs =====
create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  description text,
  active boolean default true,
  created_at timestamptz default now()
);

-- ===== Needs =====
create table if not exists needs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  program_id uuid references programs(id) on delete set null,
  title text not null,
  description text,
  category text,
  urgency text default 'medium' check (urgency in ('low','medium','high','critical')),
  required_skills text[] default '{}',
  languages_helpful text[] default '{}',
  geo_lat double precision,
  geo_lng double precision,
  window_start timestamptz,
  window_end timestamptz,
  headcount_required int default 1,
  headcount_filled int default 0,
  state text default 'submitted'
    check (state in ('draft','submitted','triaged','published','matched','in_progress','completed','verified','closed','withdrawn','expired')),
  source text default 'web',
  raw_doc_url text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists needs_tenant_state_idx on needs(tenant_id, state);
create index if not exists needs_geo_idx on needs(geo_lat, geo_lng);

-- ===== Assignments =====
create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references needs(id) on delete cascade,
  volunteer_id uuid not null references profiles(id) on delete cascade,
  state text default 'offered'
    check (state in ('offered','accepted','declined','en_route','checked_in','performing','proof_submitted','verified','disputed','recognized','cancelled')),
  match_reason text,
  accepted_at timestamptz,
  checked_in_at timestamptz,
  completed_at timestamptz,
  proof_url text,
  proof_note text,
  feedback jsonb,
  created_at timestamptz default now(),
  unique(need_id, volunteer_id)
);

-- ===== Voice Channel tickets =====
create table if not exists voice_tickets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  volunteer_id uuid references profiles(id) on delete set null,
  message text not null,
  classification text check (classification in ('relational','value_based','transactional','other')),
  sentiment numeric,
  themes text[] default '{}',
  resolved boolean default false,
  reply text,
  created_at timestamptz default now()
);

-- ===== Activity feed =====
create table if not exists activity_events (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists activity_tenant_time_idx on activity_events(tenant_id, created_at desc);

-- ===== Crisis state (single row per tenant) =====
create table if not exists crisis_state (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  active boolean default false,
  district text,
  geojson jsonb,
  declared_at timestamptz,
  declared_by uuid references profiles(id)
);

-- ===== Auto profile on signup =====
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, role, tenant_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'volunteer'),
    coalesce((new.raw_user_meta_data->>'tenant_id')::uuid, '00000000-0000-0000-0000-000000000001'::uuid)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ===== RLS =====
alter table tenants        enable row level security;
alter table profiles       enable row level security;
alter table programs       enable row level security;
alter table needs          enable row level security;
alter table assignments    enable row level security;
alter table voice_tickets  enable row level security;
alter table activity_events enable row level security;
alter table crisis_state   enable row level security;

-- A small helper: current tenant
create or replace function public.current_tenant()
returns uuid language sql stable security definer set search_path = public as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

-- Profiles: users can see profiles within their tenant
drop policy if exists "profiles read same tenant" on profiles;
create policy "profiles read same tenant" on profiles for select
  using (tenant_id = public.current_tenant());

drop policy if exists "profiles update own" on profiles;
create policy "profiles update own" on profiles for update
  using (id = auth.uid());

-- Generic per-tenant policies
drop policy if exists "needs tenant" on needs;
drop policy if exists "needs read tenant" on needs;
drop policy if exists "needs modify tenant" on needs;

create policy "needs read tenant" on needs for select
  using (tenant_id = public.current_tenant());

create policy "needs modify tenant" on needs for all
  using (tenant_id = public.current_tenant() and exists (select 1 from profiles where id = auth.uid() and role in ('coordinator', 'admin')))
  with check (tenant_id = public.current_tenant() and exists (select 1 from profiles where id = auth.uid() and role in ('coordinator', 'admin')));

drop policy if exists "programs tenant" on programs;
create policy "programs tenant" on programs for all
  using (tenant_id = public.current_tenant())
  with check (tenant_id = public.current_tenant());

drop policy if exists "assignments tenant" on assignments;
create policy "assignments tenant" on assignments for all
  using (
    exists (select 1 from needs n where n.id = need_id and n.tenant_id = public.current_tenant())
  );

drop policy if exists "voice tickets tenant" on voice_tickets;
create policy "voice tickets tenant" on voice_tickets for all
  using (tenant_id = public.current_tenant())
  with check (tenant_id = public.current_tenant());

drop policy if exists "activity tenant" on activity_events;
create policy "activity tenant" on activity_events for all
  using (tenant_id = public.current_tenant())
  with check (tenant_id = public.current_tenant());

drop policy if exists "crisis tenant" on crisis_state;
create policy "crisis tenant" on crisis_state for all
  using (tenant_id = public.current_tenant())
  with check (tenant_id = public.current_tenant());

-- Tenants: read your own
drop policy if exists "tenants read own" on tenants;
create policy "tenants read own" on tenants for select
  using (id = public.current_tenant());

-- Seed default tenant
insert into tenants (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Demo NGO', 'demo')
on conflict (id) do nothing;
