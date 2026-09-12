-- Phase 1: row-level security for every table.

-- Helper: the two participants (rider, driver) of a booking, via its ride.
create or replace function public.booking_participant_ids(p_booking_id uuid)
returns table (rider uuid, driver uuid)
language sql
security definer
set search_path = ''
stable
as $$
  select b.rider_id, r.driver_id
  from public.bookings b
  join public.rides r on r.id = b.ride_id
  where b.id = p_booking_id
$$;
grant execute on function public.booking_participant_ids(uuid) to authenticated;

-- ============ profiles ============
alter table public.profiles enable row level security;

create policy "users can view own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
-- No INSERT policy: rows are created only by the auth trigger (see next migration).
-- No DELETE policy: profile lifecycle follows auth.users deletion (ON DELETE CASCADE).

-- ============ vehicles ============
alter table public.vehicles enable row level security;

create policy "drivers can view own vehicles"
  on public.vehicles for select
  using (driver_id = auth.uid());

create policy "drivers can insert own vehicles"
  on public.vehicles for insert
  with check (
    driver_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and 'driver' = any (p.roles)
    )
  );

create policy "drivers can update own vehicles"
  on public.vehicles for update
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

create policy "drivers can delete own vehicles"
  on public.vehicles for delete
  using (driver_id = auth.uid());

-- ============ rides ============
alter table public.rides enable row level security;

create policy "authenticated users can view rides"
  on public.rides for select
  to authenticated
  using (true);

create policy "drivers can insert own rides"
  on public.rides for insert
  with check (
    driver_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and 'driver' = any (p.roles)
    )
  );

create policy "drivers can update own rides"
  on public.rides for update
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

create policy "drivers can delete own rides"
  on public.rides for delete
  using (driver_id = auth.uid());

-- ============ bookings ============
alter table public.bookings enable row level security;

create policy "riders can view own bookings"
  on public.bookings for select
  using (rider_id = auth.uid());

create policy "drivers can view bookings on own rides"
  on public.bookings for select
  using (
    exists (
      select 1 from public.rides r
      where r.id = ride_id and r.driver_id = auth.uid()
    )
  );

create policy "riders can create bookings"
  on public.bookings for insert
  with check (
    rider_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and 'rider' = any (p.roles)
    )
    and exists (
      select 1 from public.rides r
      where r.id = ride_id
        and r.status = 'active'
        and r.seats_available >= seats_booked
    )
  );

create policy "riders can update own bookings"
  on public.bookings for update
  using (rider_id = auth.uid())
  with check (rider_id = auth.uid());

create policy "drivers can update bookings on own rides"
  on public.bookings for update
  using (
    exists (
      select 1 from public.rides r
      where r.id = ride_id and r.driver_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.rides r
      where r.id = ride_id and r.driver_id = auth.uid()
    )
  );

-- ============ ratings ============
alter table public.ratings enable row level security;

create policy "participants can view ratings"
  on public.ratings for select
  using (
    exists (
      select 1 from public.booking_participant_ids(booking_id) pp
      where auth.uid() = pp.rider or auth.uid() = pp.driver
    )
  );

create policy "participants can insert ratings"
  on public.ratings for insert
  with check (
    rater_id = auth.uid()
    and exists (
      select 1 from public.booking_participant_ids(booking_id) pp
      where auth.uid() = pp.rider or auth.uid() = pp.driver
    )
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.status = 'completed'
    )
  );

-- ============ messages ============
alter table public.messages enable row level security;

create policy "participants can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.booking_participant_ids(booking_id) pp
      where auth.uid() = pp.rider or auth.uid() = pp.driver
    )
  );

create policy "participants can send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.booking_participant_ids(booking_id) pp
      where auth.uid() = pp.rider or auth.uid() = pp.driver
    )
  );
