# Kitchen companion

A shared household app for daily meal decisions, inventory, and weekly
planning — built from `kitchen-app-prd.md`, `kitchen-app-prototype-v4.html`,
and `kitchen-app-build-brief.md`.

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

### Demo mode (default)

Without Supabase env vars set, the app runs entirely client-side against an
in-browser, localStorage-backed store (`lib/demo/store.tsx`) seeded with a
sample household — Tanaya (admin, PCOS management, peanut allergy) and Ankit
(admin, post-workout recovery, colorblind-safe mode on). Click "sign in" on
the login screen to load it. Every workflow in the PRD is reachable; nothing
is persisted server-side. Use the "viewing as" switcher in the app header to
see the suggestion engine, allergies, and presence logic from either
person's point of view.

### Connecting real Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` against it (SQL editor, or `supabase db push`).
3. Copy `.env.example` to `.env.local` and fill in the project URL + anon key.
4. `lib/supabase/client.ts` / `server.ts` are ready to use once those env
   vars are present — wiring the app's data layer to real Supabase queries
   instead of the demo store is the next step for a production build (the
   `lib/types.ts` types already mirror the schema 1:1 for that swap).

## Where things live

- `lib/types.ts` — types mirroring the Supabase schema
- `lib/engine/constraints.ts` — hard (allergy) vs. soft (avoidance) filtering,
  mood-tag conflict handling, output-mode computation
- `lib/engine/inventory.ts` — ingredient cross-check, scaling, deduction
- `lib/demo/store.tsx` — the demo data layer + all business-logic actions
- `app/(app)/*` — authenticated routes (dashboard, today, recipe, inventory,
  weekly plan, shopping list, history, household)
- `app/login`, `app/onboarding/*` — signed-out flows
- `supabase/schema.sql` — tables, RLS policies, storage bucket for pantry photos

## Known gaps vs. the full PRD

- Photo/OCR pantry scanning is stubbed as a manual-entry review flow
  (`app/(app)/inventory/scan`) — wiring a real OCR provider is future work.
- Quick-commerce hand-off ("send to Blinkit") is a stub action, per the PRD's
  v1 scope (plain export, not a live integration).
- Supabase Auth and live queries are scaffolded but not wired into the UI —
  the app currently runs on the demo store described above.
