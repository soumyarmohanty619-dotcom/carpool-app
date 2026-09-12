-- Phase 3: post-trip ratings (schema/RLS already existed since Phase 1 — this
-- migration is just the payment side) and a manual "mark as paid" stub in
-- place of real Stripe processing until API keys are available. Swapping
-- this for real Stripe later just means replacing how paid_at gets set —
-- everything reading it stays the same.

alter table public.bookings add column paid_at timestamptz;

-- Column-level grant is additive to the "status" grant from Phase 2 — riders
-- can now touch status OR paid_at, still never seats_booked/ride_id/rider_id.
grant update (paid_at) on public.bookings to authenticated;

create policy "riders can mark own bookings paid"
  on public.bookings for update
  using (rider_id = auth.uid() and status in ('accepted', 'completed'))
  with check (rider_id = auth.uid());
