-- Kitchen Companion — Supabase schema + Row Level Security
-- Run against a fresh Supabase project (SQL editor, or `supabase db push`).
-- Mirrors PRD section 9 / build brief section 2.

create extension if not exists "pgcrypto";

-- =========================================================================
-- TABLES
-- =========================================================================

create table homes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  home_id uuid references homes (id) on delete set null,
  role text not null default 'member' check (role in ('admin', 'member')),
  name text not null,
  age int,
  weight numeric,
  goal text,
  engagement_style text check (engagement_style in ('planner', 'quick')),
  accessibility jsonb not null default '{"colorblind_safe": false, "larger_text": false}'::jsonb,
  created_at timestamptz not null default now()
);

create table allergies (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table avoidances (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table weekly_schedule (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  type text not null check (type in ('veg', 'nonveg', 'fasting')),
  nonveg_subtype text
);

create table health_conditions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  is_private boolean not null default true,
  created_at timestamptz not null default now()
);

create table vitamin_mineral_anomalies (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  nutrient text not null,
  status text not null check (status in ('deficient', 'elevated')),
  is_private boolean not null default true,
  created_at timestamptz not null default now()
);

create table likes_dislikes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  term text not null,
  sentiment text not null check (sentiment in ('like', 'dislike')),
  source text not null default 'seed' check (source in ('seed', 'rating'))
);

create table recipes (
  id uuid primary key default gen_random_uuid(),
  home_id uuid references homes (id) on delete cascade,
  name text not null,
  base_ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  utensils jsonb not null default '[]'::jsonb,
  dietary_tags jsonb not null default '[]'::jsonb,
  portion_base int not null default 2,
  is_household_variant boolean not null default false,
  created_at timestamptz not null default now()
);

create table meal_slots (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references homes (id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner')),
  status text not null default 'unplanned' check (status in ('unplanned', 'suggested', 'finalized', 'ordered_in')),
  output_mode text check (output_mode in ('shared', 'base_addon', 'split')),
  recipe_id uuid references recipes (id) on delete set null,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (home_id, date, meal_type)
);

create table meal_slot_presence (
  meal_slot_id uuid not null references meal_slots (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  present boolean not null default true,
  primary key (meal_slot_id, profile_id)
);

create table travel_days (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  date date not null,
  unique (profile_id, date)
);

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references homes (id) on delete cascade,
  name text not null,
  quantity numeric not null default 0,
  unit text not null default 'unit',
  zone text not null default 'pantry' check (zone in ('pantry', 'fridge', 'freezer')),
  expiry_estimate date,
  freshness_status text not null default 'fresh' check (freshness_status in ('fresh', 'expiring_soon', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references homes (id) on delete cascade,
  name text not null,
  quantity_needed text,
  source text not null default 'manual_pick' check (source in ('manual_pick', 'weekly_plan', 'low_stock_nudge')),
  status text not null default 'pending' check (status in ('pending', 'purchased')),
  created_at timestamptz not null default now()
);

create table feedback_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  meal_id uuid not null references meal_slots (id) on delete cascade,
  taste_rating int check (taste_rating between 1 and 5),
  portion_feedback text check (portion_feedback in ('too_little', 'just_right', 'too_much')),
  repeat_decision boolean,
  created_at timestamptz not null default now()
);

create table deviation_log_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  meal_id uuid references meal_slots (id) on delete cascade,
  constraint_type text not null check (constraint_type in ('avoidance', 'schedule')),
  detail text,
  created_at timestamptz not null default now()
);

create table invites (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references homes (id) on delete cascade,
  invitee_contact text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  proposed_role text not null default 'member' check (proposed_role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

-- =========================================================================
-- HELPER FUNCTIONS (security definer — avoid recursive RLS on profiles)
-- =========================================================================

create or replace function my_home_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select home_id from profiles where id = auth.uid()
$$;

create or replace function is_home_admin(target_home uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and home_id = target_home and role = 'admin'
  )
$$;

create or replace function profile_home_id(target_profile uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select home_id from profiles where id = target_profile
$$;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================

alter table homes enable row level security;
alter table profiles enable row level security;
alter table allergies enable row level security;
alter table avoidances enable row level security;
alter table weekly_schedule enable row level security;
alter table health_conditions enable row level security;
alter table vitamin_mineral_anomalies enable row level security;
alter table likes_dislikes enable row level security;
alter table recipes enable row level security;
alter table meal_slots enable row level security;
alter table meal_slot_presence enable row level security;
alter table travel_days enable row level security;
alter table inventory_items enable row level security;
alter table shopping_list_items enable row level security;
alter table feedback_entries enable row level security;
alter table deviation_log_entries enable row level security;
alter table invites enable row level security;

-- homes: any authenticated user can create one (they become its first
-- profile/admin in the same transaction at the app layer); members can read
-- their own home; only admins can update it.
create policy "homes: read own" on homes
  for select using (id = my_home_id());
create policy "homes: create" on homes
  for insert with check (auth.uid() is not null);
create policy "homes: admin update" on homes
  for update using (is_home_admin(id));

-- profiles: readable by anyone in the same home; a user can insert/update
-- only their own row (role changes are still governed by app-level checks
-- for who triggers them, but self-row access keeps RLS simple and correct).
create policy "profiles: read household" on profiles
  for select using (home_id is not null and home_id = my_home_id());
create policy "profiles: read self" on profiles
  for select using (id = auth.uid());
create policy "profiles: insert self" on profiles
  for insert with check (id = auth.uid());
create policy "profiles: update self" on profiles
  for update using (id = auth.uid());
create policy "profiles: admin update household" on profiles
  for update using (home_id is not null and is_home_admin(home_id));

-- non-sensitive persona tables: household-readable, self-writable
create policy "allergies: read household" on allergies
  for select using (profile_home_id(profile_id) = my_home_id());
create policy "allergies: write self" on allergies
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "avoidances: read household" on avoidances
  for select using (profile_home_id(profile_id) = my_home_id());
create policy "avoidances: write self" on avoidances
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "weekly_schedule: read household" on weekly_schedule
  for select using (profile_home_id(profile_id) = my_home_id());
create policy "weekly_schedule: write self" on weekly_schedule
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "likes_dislikes: read household" on likes_dislikes
  for select using (profile_home_id(profile_id) = my_home_id());
create policy "likes_dislikes: write self" on likes_dislikes
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- sensitive persona tables: private by default. Own rows always visible to
-- self; visible to the rest of the household only when is_private = false.
create policy "health_conditions: read self" on health_conditions
  for select using (profile_id = auth.uid());
create policy "health_conditions: read shared household" on health_conditions
  for select using (is_private = false and profile_home_id(profile_id) = my_home_id());
create policy "health_conditions: write self" on health_conditions
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "vma: read self" on vitamin_mineral_anomalies
  for select using (profile_id = auth.uid());
create policy "vma: read shared household" on vitamin_mineral_anomalies
  for select using (is_private = false and profile_home_id(profile_id) = my_home_id());
create policy "vma: write self" on vitamin_mineral_anomalies
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- home-scoped operational tables: any household member can read/write
-- within their own home (shared source of truth per PRD principle).
create policy "recipes: household" on recipes
  for all using (home_id = my_home_id()) with check (home_id = my_home_id());

create policy "meal_slots: household" on meal_slots
  for all using (home_id = my_home_id()) with check (home_id = my_home_id());

create policy "meal_slot_presence: household" on meal_slot_presence
  for all using (
    exists (select 1 from meal_slots ms where ms.id = meal_slot_id and ms.home_id = my_home_id())
  ) with check (
    exists (select 1 from meal_slots ms where ms.id = meal_slot_id and ms.home_id = my_home_id())
  );

create policy "travel_days: household read" on travel_days
  for select using (profile_home_id(profile_id) = my_home_id());
create policy "travel_days: write self" on travel_days
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "inventory_items: household" on inventory_items
  for all using (home_id = my_home_id()) with check (home_id = my_home_id());

create policy "shopping_list_items: household" on shopping_list_items
  for all using (home_id = my_home_id()) with check (home_id = my_home_id());

create policy "feedback_entries: read household" on feedback_entries
  for select using (profile_home_id(profile_id) = my_home_id());
create policy "feedback_entries: write self" on feedback_entries
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "deviation_log: read household" on deviation_log_entries
  for select using (profile_home_id(profile_id) = my_home_id());
create policy "deviation_log: write self" on deviation_log_entries
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "invites: household read" on invites
  for select using (home_id = my_home_id());
create policy "invites: household create" on invites
  for insert with check (home_id = my_home_id());
create policy "invites: admin update" on invites
  for update using (is_home_admin(home_id));

-- =========================================================================
-- STORAGE (pantry / receipt photo uploads)
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('pantry-photos', 'pantry-photos', false)
on conflict (id) do nothing;

create policy "pantry-photos: household read"
  on storage.objects for select
  using (bucket_id = 'pantry-photos' and (storage.foldername(name))[1] = my_home_id()::text);

create policy "pantry-photos: household write"
  on storage.objects for insert
  with check (bucket_id = 'pantry-photos' and (storage.foldername(name))[1] = my_home_id()::text);
