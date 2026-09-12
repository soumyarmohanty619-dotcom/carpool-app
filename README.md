# Carpool App

Monorepo for the carpool app: an Expo mobile app, a Next.js web app, and the
Supabase backend (Postgres + PostGIS, Auth, Storage, Realtime) they share.

This is **Phase 1**: database schema, row-level security, and the
sign up → confirm email → pick rider/driver → home flow. There's no ride
posting, search, or booking UI yet — that's Phase 2.

## Layout

```
apps/mobile/   Expo app (Expo Router)
apps/web/      Next.js app (App Router + Tailwind)
packages/shared/  Generated Supabase types + small shared types
supabase/      SQL migrations, applied via the Supabase CLI
```

## Setup

1. **Create a Supabase project.** Go to [supabase.com](https://supabase.com),
   create a new project, and grab its Project URL and `anon` public key from
   Settings → API.

2. **Set environment variables.**
   ```
   cp apps/web/.env.example apps/web/.env.local
   cp apps/mobile/.env.example apps/mobile/.env
   ```
   Fill in both files with the URL and anon key from step 1.

3. **Install the Supabase CLI** (if you don't have it):
   [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli).

4. **Link and apply the migrations.**
   ```
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   `<your-project-ref>` is the id in your project's dashboard URL. This runs
   the three migrations in `supabase/migrations/` against your project:
   schema, row-level security policies, and the auth trigger that creates a
   `profiles` row on signup.

   (Developing against a local Postgres instead? `supabase start` spins one
   up in Docker, and `supabase db reset` applies the migrations to it.)

5. **Regenerate types** now that a real schema exists:
   ```
   npm install
   npm run db:types
   ```

6. **Run the apps.**
   ```
   npm run dev:web       # http://localhost:3000
   npm run dev:mobile    # opens Expo dev tools
   ```

## Smoke test

On either app: sign up with an email/password, confirm the account via the
email Supabase sends, sign in, pick rider and/or driver on the role-selection
screen, and land on the placeholder home screen. In the Supabase dashboard's
Table Editor, confirm a matching row appeared in `profiles` right after
signup (that's the auth trigger working) and that its `roles` column updated
after you picked a role.

## Known limitations (by design, not bugs)

- **Phone OTP** screens are wired in code but won't deliver real SMS until
  Twilio is configured as an SMS provider in Supabase Auth settings — a
  later phase.
- **`profiles` is only readable by its owner.** Fine for Phase 1 (no one
  else needs to see it yet); Phase 2's ride listings will need a
  `public_profiles` view or a broadened policy to show a driver's name.
- **Seat counts aren't decremented anywhere yet** — there's no booking UI
  to trigger it. When Phase 2 adds one, do it via a `SECURITY DEFINER` RPC,
  not a client-side update, so two riders can't race past the same seat.
