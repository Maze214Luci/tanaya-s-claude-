# Kitchen companion

A shared household app for daily meal decisions, inventory, and weekly
planning — built from the PRD, prototype, and build-brief docs in this repo's
history.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4, design tokens ported from the prototype (`app/globals.css`)
- Supabase (Postgres, Auth, Storage, RLS) — schema in `supabase/schema.sql`

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### Demo mode (no setup required)

Without Supabase env vars set, the app runs entirely client-side against an
in-browser, localStorage-backed store (`lib/demo/store.tsx`) seeded with a
sample household — Tanaya (admin, PCOS management, peanut allergy) and Ankit
(admin, post-workout recovery, colorblind-safe mode on). Click "sign in" on
the login screen to load it. Nothing is persisted server-side, and a "viewing
as" switcher lets you flip between household members without separate logins
— handy for demoing, not for real day-to-day use.

### Real accounts (Tanaya and Ankit each sign in for real)

This is what you want for actual household use. It needs a free Supabase
project — the app still runs on your machine, but accounts and data live in
Supabase's cloud so everyone sees the same shared kitchen.

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier).
2. **Run the schema**: open the SQL editor in your project and paste in the
   entire contents of `supabase/schema.sql`, then run it. This creates every
   table, the row-level-security policies, and a starter library of recipes
   every new home can suggest from immediately.
3. **Turn off email confirmation** (recommended for a private family app):
   in your Supabase project, go to Authentication → Providers → Email, and
   turn off "Confirm email." Without this, each new signup has to click a
   confirmation link before they can use the app.
4. **Connect the app**: copy `.env.example` to `.env.local` and fill in your
   project's URL and anon key (Project Settings → API in Supabase).
5. **Restart** `npm run dev`. The login screen now does real email/password
   auth instead of the one-click demo button.

**First account (the admin, e.g. Tanaya):** sign up, then "create a home,"
then run through persona onboarding.

**Second account (e.g. Ankit):** the admin invites Ankit's email from the
Household page first (picking their role there). Ankit then signs up with
that same email — the household join happens automatically on first login,
no invite code needed. If Ankit signs up before being invited, they'll land
on a screen explaining they need an invite from an admin first.

Every household member's actions (accepting a suggestion, marking presence,
updating inventory) sync to everyone else's screen within about half a
second via Supabase Realtime — no manual refresh needed.

## Where things live

- `lib/types.ts` — types mirroring the Supabase schema
- `lib/engine/constraints.ts` — hard (allergy) vs. soft (avoidance) filtering,
  mood-tag conflict handling, baseline-vs-something-new suggestion blending,
  output-mode computation
- `lib/engine/inventory.ts` — per-ingredient scaling/rounding, cross-check,
  deduction
- `lib/store/context.ts` — the shared store interface both backends implement
- `lib/store/live.tsx` — the real Supabase-backed store (auth, live queries,
  realtime resync)
- `lib/demo/store.tsx` — the localStorage demo store
- `lib/store/index.tsx` — picks live vs. demo based on whether Supabase env
  vars are set
- `components/MealCard.tsx` — the dashboard's per-slot card, including the
  inline suggestion engine UI for unplanned meals (no separate "Today" screen)
- `app/(app)/*` — authenticated routes (dashboard, recipe, inventory, weekly
  plan, shopping list, history, household)
- `app/login`, `app/signup`, `app/onboarding/*` — signed-out flows
- `supabase/schema.sql` — tables, RLS policies, storage bucket for pantry
  photos, seeded global recipe library

## Verifying the private-health-data RLS rule

Health conditions and vitamin/mineral anomalies default to private and must
not be fetchable by other household members via a direct query, not just
hidden in the UI. This is enforced by `supabase/schema.sql`'s RLS policies
(`health_conditions: read self` / `read shared household` — a private row
from someone else never matches either policy). To verify against a real
project: sign in as one household member, mark a health condition private,
then in the Supabase SQL editor run a query as the *other* member's role
(`select * from health_conditions where profile_id = '<the private one>'`)
and confirm it returns zero rows.

## Known gaps vs. the full PRD

- Photo/OCR pantry scanning is stubbed as a manual-entry review flow
  (`app/(app)/inventory/scan`) — wiring a real OCR provider is future work.
- Quick-commerce hand-off ("send to Blinkit") is a stub action, per the PRD's
  v1 scope (plain export, not a live integration).
- Invite approval is single-step in live mode: the admin picks the role at
  invite time, and the invitee auto-joins with that role on signup, rather
  than a separate manual "approve" click (real accounts require the
  invitee's own client to create their profile row, so a true second
  approval step would need a schema change to track a pending-member state).
