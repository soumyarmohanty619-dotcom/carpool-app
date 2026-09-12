-- Phase 4: real Stripe payments, replacing the Phase 3 manual "mark as
-- paid" stub. A checkout attempt is now tracked in `payments`, and
-- `bookings.paid_at` is only ever set by the Stripe webhook (via the
-- service role, which bypasses RLS/grants entirely) — never by a client.

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null,
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_booking_id_idx on public.payments (booking_id);

create trigger trg_payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.payments enable row level security;

-- Read-only for clients — no insert/update/delete grants for `authenticated`
-- at all. Only the Edge Functions' service-role client ever writes here.
create policy "riders can view own payments"
  on public.payments for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.rider_id = auth.uid()
    )
  );

-- Undo the Phase 3 stopgap: a rider could previously self-report payment by
-- updating paid_at directly. Real payment must only ever be set by the
-- webhook below.
drop policy if exists "riders can mark own bookings paid" on public.bookings;
revoke update (paid_at) on public.bookings from authenticated;
