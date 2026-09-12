# Carpool App

Monorepo for the carpool app: an Expo mobile app, a Next.js web app, and the
Supabase backend (Postgres + PostGIS, Auth, Storage, Realtime) they share.

Phases 1-4 are done:

- **Phase 1** — database schema, row-level security, and the
  sign up → confirm email → pick rider/driver → home flow.
- **Phase 2** — ride posting/search, booking requests, and the
  accept/decline/cancel/complete flow, with atomic (trigger-governed) seat
  accounting so concurrent accepts can never oversell a ride.
- **Phase 3** — post-trip ratings, and (at the time) a manual "mark as paid"
  stub in place of real payment processing.
- **Phase 4** — real Stripe Checkout payments, via Supabase Edge Functions.
  `bookings.paid_at` is now only ever set by Stripe's webhook, never by the
  client.

## Layout

```
apps/mobile/   Expo app (Expo Router)
apps/web/      Next.js app (App Router + Tailwind)
packages/shared/  Generated Supabase types + small shared types
supabase/      SQL migrations and Edge Functions, applied via the Supabase CLI
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

6. **Set up Stripe** (needed for the "Pay now" flow in Phase 4).
   ```
   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   supabase functions deploy create-checkout-session --use-api
   supabase functions deploy stripe-webhook --use-api --no-verify-jwt
   ```
   `STRIPE_SECRET_KEY` comes from the Stripe dashboard (test mode is fine).
   For `STRIPE_WEBHOOK_SECRET`: in the Stripe dashboard, add a webhook
   endpoint pointing at
   `https://<project-ref>.functions.supabase.co/stripe-webhook` listening
   for `checkout.session.completed`, and use the signing secret it gives
   you — or, for local testing, run
   `stripe listen --forward-to https://<project-ref>.functions.supabase.co/stripe-webhook`
   and use the secret it prints. `stripe-webhook` must be deployed with
   `--no-verify-jwt`: Stripe calls it without a Supabase auth token, using
   its own signature header instead.

7. **Run the apps.**
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
5. Mark the ride/booking completed, then use "Pay now" (a Stripe test card,
   e.g. `4242 4242 4242 4242`, works in test mode) and leave a
   rating from both sides in "My bookings" / "My rides".

## Known limitations (by design, not bugs)

- **Phone OTP** screens are wired in code but won't deliver real SMS until
  Twilio is configured as an SMS provider in Supabase Auth settings.
- **"Pay now" uses Stripe's hosted Checkout**, not an in-app payment sheet —
  the rider is redirected to a Stripe-hosted page and back. `paid_at` is set
  by the `stripe-webhook` Edge Function once Stripe confirms the payment, so
  it can lag a couple of seconds behind the redirect back into the app.
- **No geocoding provider is configured yet**, so ride search is by text +
  time window rather than distance — `origin_geog`/`destination_geog` stay
  unset until one is wired in.
