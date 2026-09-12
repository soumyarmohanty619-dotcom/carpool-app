-- Phase 2: ride posting, search & booking.
--
-- Three changes:
--   1. origin_geog/destination_geog become nullable — Phase 2 ships with plain
--      text locations (no geocoding provider configured yet), so there are no
--      real coordinates to store. Distance-based search waits until a
--      geocoding key is wired in; for now, search is by text + time window.
--   2. A public_profiles view exposes just id/full_name/avatar_url to any
--      authenticated user, so ride search and booking lists can show names
--      without loosening profiles' own owner-only RLS.
--   3. Booking status transitions become trigger-governed and atomic, so
--      accepting a booking can never oversell a ride's seats under
--      concurrent requests.

-- ---------- 1. nullable geography columns ----------
alter table public.rides
  alter column origin_geog drop not null,
  alter column destination_geog drop not null;

-- ---------- 2. public_profiles view ----------
-- Views run with their owner's privileges by default (security_invoker =
-- false), so this deliberately bypasses profiles' owner-only RLS to expose
-- just these three safe columns to any authenticated user.
create view public.public_profiles as
select id, full_name, avatar_url
from public.profiles;

grant select on public.public_profiles to authenticated;

-- ---------- 3. booking status transitions ----------

-- Lock bookings down to status-only updates from the client. seats_booked,
-- ride_id, and rider_id become immutable after creation, regardless of RLS.
revoke update on public.bookings from authenticated;
grant update (status) on public.bookings to authenticated;

drop policy if exists "riders can update own bookings" on public.bookings;
create policy "riders can cancel own bookings"
  on public.bookings for update
  using (rider_id = auth.uid() and status in ('requested', 'accepted'))
  with check (status = 'cancelled');

drop policy if exists "drivers can update bookings on own rides" on public.bookings;
create policy "drivers can respond to bookings on own rides"
  on public.bookings for update
  using (
    exists (select 1 from public.rides r where r.id = ride_id and r.driver_id = auth.uid())
  )
  with check (status in ('accepted', 'declined', 'completed'));

-- Runs after any status change, validates the transition is legal, and does
-- the seat accounting on `rides` atomically in the same transaction — the
-- row lock this UPDATE takes on the ride serializes concurrent accepts, and
-- the existing seats_available >= 0 check constraint is a backstop.
create or replace function public.handle_booking_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'requested' and new.status not in ('accepted', 'declined', 'cancelled') then
    raise exception 'invalid booking transition: % -> %', old.status, new.status;
  elsif old.status = 'accepted' and new.status not in ('cancelled', 'completed') then
    raise exception 'invalid booking transition: % -> %', old.status, new.status;
  elsif old.status in ('declined', 'cancelled', 'completed') then
    raise exception 'booking is already %, no further changes allowed', old.status;
  end if;

  if new.status = 'accepted' then
    update public.rides
      set seats_available = seats_available - old.seats_booked
      where id = new.ride_id and seats_available >= old.seats_booked;
    if not found then
      raise exception 'not enough seats available on this ride';
    end if;
  elsif old.status = 'accepted' and new.status = 'cancelled' then
    update public.rides
      set seats_available = least(seats_total, seats_available + old.seats_booked)
      where id = new.ride_id;
  end if;

  return new;
end;
$$;

create trigger trg_booking_status_change
  after update of status on public.bookings
  for each row
  when (new.status is distinct from old.status)
  execute function public.handle_booking_status_change();
