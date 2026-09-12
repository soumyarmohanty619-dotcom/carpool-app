-- Phase 1: core schema for profiles, vehicles, rides, bookings, ratings, messages.

-- ---------- extensions ----------
create extension if not exists postgis;
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------- enums ----------
create type public.app_role as enum ('rider', 'driver');
create type public.ride_status as enum ('active', 'cancelled', 'completed');
create type public.booking_status as enum ('requested', 'accepted', 'declined', 'cancelled', 'completed');

-- ---------- profiles ----------
-- One row per auth.users row, created by the trigger in the next migration.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  roles public.app_role[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- vehicles ----------
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  make text not null,
  model text not null,
  color text,
  year smallint,
  license_plate text,
  seats smallint not null check (seats > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vehicles_driver_id_idx on public.vehicles (driver_id);

-- ---------- rides ----------
create table public.rides (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  origin_geog geography(Point, 4326) not null,
  origin_text text not null,
  destination_geog geography(Point, 4326) not null,
  destination_text text not null,
  departure_at timestamptz not null,
  seats_total smallint not null check (seats_total > 0),
  seats_available smallint not null check (seats_available >= 0),
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'USD',
  status public.ride_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seats_available_within_total check (seats_available <= seats_total)
);
create index rides_origin_geog_gix on public.rides using gist (origin_geog);
create index rides_destination_geog_gix on public.rides using gist (destination_geog);
create index rides_departure_at_idx on public.rides (departure_at);
create index rides_driver_id_idx on public.rides (driver_id);
create index rides_status_idx on public.rides (status);

-- ---------- bookings ----------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  rider_id uuid not null references public.profiles (id) on delete cascade,
  seats_booked smallint not null check (seats_booked > 0),
  status public.booking_status not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ride_id, rider_id)
);
create index bookings_ride_id_idx on public.bookings (ride_id);
create index bookings_rider_id_idx on public.bookings (rider_id);
create index bookings_status_idx on public.bookings (status);

-- ---------- ratings ----------
-- Post-trip rating between the two participants of a completed booking.
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  rater_id uuid not null references public.profiles (id) on delete cascade,
  ratee_id uuid not null references public.profiles (id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (booking_id, rater_id)
);
create index ratings_ratee_id_idx on public.ratings (ratee_id);
create index ratings_booking_id_idx on public.ratings (booking_id);

-- ---------- messages ----------
-- Chat tied to a booking; the booking implies the ride, so no separate ride_id.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index messages_booking_id_created_idx on public.messages (booking_id, created_at);

-- ---------- updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_vehicles_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();
create trigger trg_rides_updated_at before update on public.rides
  for each row execute function public.set_updated_at();
create trigger trg_bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

-- ---------- Phase 2 preview: nearby-ride search ----------
-- select *, origin_geog <-> ST_MakePoint($lng, $lat)::geography as distance_m
-- from public.rides
-- where status = 'active'
--   and seats_available > 0
--   and departure_at > now()
--   and ST_DWithin(origin_geog, ST_MakePoint($lng, $lat)::geography, $radius_meters)
-- order by distance_m
-- limit 20;
