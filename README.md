# Carpool App

Monorepo for the carpool app: an Expo mobile app, a Next.js web app, and the
Supabase backend (Postgres + PostGIS, Auth, Storage, Realtime) they share.

Phases 1-3 are done:

- **Phase 1** — database schema, row-level security, and the
  sign up → confirm email → pick rider/driver → home flow.
- **Phase 2** — ride posting/search, booking requests, and the
  accept/decline/cancel/complete flow, with atomic (trigger-governed) seat
  accounting so concurrent accepts can never oversell a ride.
- **Phase 3** — post-trip ratings, and a manual "mark as paid" stub in place
  of real Stripe processing until API keys are available.

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
   the migrations in `supabase/migrations/` against your project: schema,
   row-level security policies, the auth trigger that creates a `profiles`
   row on signup, ride/booking/seat-accounting changes, and the ratings
   payment-stub column.

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

On either app:

1. Sign up with an email/password, confirm the account via the email
   Supabase sends, sign in, and pick rider and/or driver on the
   role-selection screen.
2. As a driver, post a ride from the home screen.
3. As a rider (a second account), find that ride and request a seat.
4. As the driver, accept the request from "My rides" — confirm
   `seats_available` on the ride drops accordingly in the Supabase
   dashboard's Table Editor, and try over-booking past capacity to confirm
   it's rejected.
5. Mark the ride/booking completed, then use "Mark as paid" and leave a
   rating from both sides in "My bookings" / "My rides".

## Known limitations (by design, not bugs)

- **Phone OTP** screens are wired in code but won't deliver real SMS until
  Twilio is configured as an SMS provider in Supabase Auth settings.
- **"Mark as paid" is a manual stub**, not real payment processing — it just
  sets `bookings.paid_at`. Swapping in real Stripe later only means changing
  how `paid_at` gets set; everything reading it stays the same.
- **No geocoding provider is configured yet**, so ride search is by text +
  time window rather than distance — `origin_geog`/`destination_geog` stay
  unset until one is wired in.
