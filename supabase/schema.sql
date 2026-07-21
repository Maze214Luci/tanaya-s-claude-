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
  -- flowchart 2 (step 3b) / 24: nutrition needs used by portion sizing.
  -- Scoped down from the full gram-precise portion-multiplier engine —
  -- captured here, applied today via presence-based scaling, not yet a
  -- per-person nutrition-target-driven multiplier.
  protein_target_g numeric,
  engagement_style text check (engagement_style in ('planner', 'quick')),
  accessibility jsonb not null default '{"colorblind_safe": false, "larger_text": false}'::jsonb,
  -- true once this profile has finished (or explicitly skipped through)
  -- the persona onboarding flow — persisted so it survives across
  -- devices/sessions, not just local UI state.
  onboarded boolean not null default false,
  profile_complete_dismissed boolean not null default false,
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
  veg boolean not null default true,
  moods jsonb not null default '[]'::jsonb,
  time_minutes int not null default 20,
  is_household_variant boolean not null default false,
  -- was this recipe named as part of the household's stated typical-meals
  -- baseline during onboarding? drives the suggestion engine's
  -- baseline-vs-something-new blend (PRD 7.3.21).
  is_baseline_item boolean not null default false,
  created_at timestamptz not null default now()
);

-- Whole-dish swipe signal (flowchart 14/22) — distinct from likes_dislikes,
-- which is ingredient/flavor-level. One rating per person per recipe;
-- re-swiping/re-rating overwrites via upsert.
create table dish_ratings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  recipe_id uuid not null references recipes (id) on delete cascade,
  rating text not null check (rating in ('disliked', 'liked', 'loved')),
  created_at timestamptz not null default now(),
  unique (profile_id, recipe_id)
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
  -- true when this slot's accepted meal was a deliberate "something new"
  -- pick rather than drawn from the household's baseline/likes history
  -- (PRD 7.3.21 / data model sec 9).
  is_new_item_suggestion boolean not null default false,
  -- exact ingredient quantities already subtracted from inventory for the
  -- slot's current recipe_id (deduction happens at confirmation, not at
  -- "cooked"). Null when nothing has been deducted yet. Swapping the dish
  -- or cancelling to ordered-in reverses exactly this snapshot rather than
  -- recomputing from current presence, which could drift.
  deducted_ingredients jsonb,
  -- set when "mark cooked" is tapped — a separate, later event from
  -- confirmation that no longer touches inventory, only the first-time
  -- feedback prompt.
  cooked_at timestamptz,
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
alter table dish_ratings enable row level security;
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

create policy "dish_ratings: read household" on dish_ratings
  for select using (profile_home_id(profile_id) = my_home_id());
create policy "dish_ratings: write self" on dish_ratings
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
--
-- recipes: home_id = null is the shared, seeded recipe library every home
-- can suggest from out of the box; home_id set is a household's own recipe
-- (including edited variants of a library recipe — build brief #47).
create policy "recipes: read global or household" on recipes
  for select using (home_id is null or home_id = my_home_id());
create policy "recipes: insert household" on recipes
  for insert with check (home_id = my_home_id());
create policy "recipes: update household" on recipes
  for update using (home_id = my_home_id());
create policy "recipes: delete household" on recipes
  for delete using (home_id = my_home_id());

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

-- A brand-new signed-up user has no home yet (my_home_id() is null), so the
-- policies above don't apply to them. These let them find and accept their
-- own pending invite by email match, which is how the app auto-joins an
-- invitee to a home right after signup instead of requiring an invite code.
create policy "invites: invitee read own pending" on invites
  for select using (invitee_contact = auth.email() and status = 'pending');
create policy "invites: invitee accept own pending" on invites
  for update
  using (invitee_contact = auth.email() and status = 'pending')
  with check (invitee_contact = auth.email());

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

-- =========================================================================
-- GLOBAL RECIPE LIBRARY (home_id = null — every home can suggest from these
-- immediately; "mark cooked" on one creates no household variant unless the
-- household edits it, per build brief #47)
-- =========================================================================

insert into recipes (home_id, name, base_ingredients, steps, utensils, dietary_tags, portion_base, veg, moods, time_minutes, is_household_variant)
values
  (null, 'Vegetable poha',
   '[{"name":"Flattened rice","quantity":200,"unit":"g"},{"name":"Onion","quantity":1,"unit":"unit"},{"name":"Peas","quantity":50,"unit":"g"},{"name":"Mustard seeds","quantity":1,"unit":"tsp"}]',
   '["Rinse the poha and let it soften.","Temper mustard seeds, curry leaves and onion.","Add peas and turmeric, mix in the poha.","Finish with lemon and coriander."]',
   '["Kadai","Strainer"]', '["Low-GI","No peanuts"]', 2, true, '["homely","light"]', 20, false),
  (null, 'Grilled paneer bowl',
   '[{"name":"Paneer","quantity":200,"unit":"g"},{"name":"Bell pepper","quantity":1,"unit":"unit"},{"name":"Lemon","quantity":1,"unit":"unit"},{"name":"Olive oil","quantity":1,"unit":"tbsp"}]',
   '["Cube the paneer and bell pepper into even pieces.","Toss with olive oil, salt and pepper.","Grill on a hot pan for 4–5 minutes, turning occasionally.","Squeeze fresh lemon over the top before serving."]',
   '["Grill pan","Tongs"]', '["Low-GI","Extra protein"]', 2, true, '["light","new"]', 20, false),
  (null, 'Dal khichdi with ghee',
   '[{"name":"Rice","quantity":150,"unit":"g"},{"name":"Toor dal","quantity":100,"unit":"g"},{"name":"Ghee","quantity":1,"unit":"tbsp"},{"name":"Turmeric","quantity":1,"unit":"tsp"}]',
   '["Pressure-cook rice and dal together with turmeric.","Temper cumin in ghee and pour over.","Serve hot with a side of curd."]',
   '["Pressure cooker"]', '["Homely","Fasting-friendly"]', 2, true, '["homely","warm"]', 25, false),
  (null, 'Vegetable pulao',
   '[{"name":"Basmati rice","quantity":200,"unit":"g"},{"name":"Mixed vegetables","quantity":150,"unit":"g"},{"name":"Whole spices","quantity":1,"unit":"tsp"}]',
   '["Saute whole spices and vegetables.","Add soaked rice and water, cook through.","Rest for 5 minutes before fluffing."]',
   '["Pot with lid"]', '["Homely"]', 2, true, '["homely","warm"]', 30, false),
  (null, 'Curd rice with tempering',
   '[{"name":"Cooked rice","quantity":200,"unit":"g"},{"name":"Curd","quantity":150,"unit":"ml"},{"name":"Mustard seeds","quantity":1,"unit":"tsp"}]',
   '["Mash rice lightly and mix with curd.","Temper mustard seeds, curry leaves and green chilli.","Chill briefly before serving."]',
   '["Mixing bowl"]', '["Light","Cooling"]', 2, true, '["homely","light"]', 15, false),
  (null, 'Sprouts salad',
   '[{"name":"Mixed sprouts","quantity":150,"unit":"g"},{"name":"Tomato","quantity":1,"unit":"unit"},{"name":"Lemon","quantity":1,"unit":"unit"},{"name":"Onion","quantity":0.5,"unit":"unit"}]',
   '["Steam sprouts lightly.","Toss with chopped onion, tomato and lemon juice.","Season and serve chilled."]',
   '["Steamer"]', '["Low-GI","High protein"]', 2, true, '["light","cold","new"]', 10, false),
  (null, 'Grilled fish curry',
   '[{"name":"Fish fillet","quantity":300,"unit":"g"},{"name":"Coconut milk","quantity":150,"unit":"ml"},{"name":"Curry leaves","quantity":1,"unit":"sprig"}]',
   '["Marinate fish in spices for 15 minutes.","Sear fillets, then simmer in coconut milk curry.","Finish with curry leaves and a squeeze of lime."]',
   '["Skillet"]', '["Extra protein"]', 2, false, '["spicy","warm"]', 35, false),
  (null, 'Chicken clear soup',
   '[{"name":"Chicken breast","quantity":200,"unit":"g"},{"name":"Garlic","quantity":3,"unit":"unit"},{"name":"Spring onion","quantity":2,"unit":"unit"}]',
   '["Simmer chicken with garlic and ginger until tender.","Shred and return to the broth.","Finish with spring onion and cracked pepper."]',
   '["Soup pot"]', '["Extra protein","Recovery"]', 2, false, '["light","warm","homely"]', 25, false),
  (null, 'Egg bhurji wrap',
   '[{"name":"Eggs","quantity":4,"unit":"unit"},{"name":"Onion","quantity":1,"unit":"unit"},{"name":"Whole wheat wrap","quantity":2,"unit":"unit"}]',
   '["Scramble eggs with onion, tomato and chilli.","Warm the wraps.","Roll the bhurji into the wraps and serve."]',
   '["Skillet"]', '["Extra protein"]', 2, false, '["spicy","new"]', 15, false);
-- Note: this whole schema file is meant to run once against a fresh
-- project. Re-running it will duplicate these seed rows (there's no
-- natural unique key to conflict on) and error on the `create table`
-- statements above.
