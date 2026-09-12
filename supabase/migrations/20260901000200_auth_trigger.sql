-- Phase 1: create a profiles row automatically whenever a new auth.users row appears.
--
-- Chosen over an edge function / Auth Hook because it's atomic with the signup
-- transaction (no eventual-consistency window), needs no separate deployment or
-- secrets, and is the standard, well-documented Supabase pattern for deriving a
-- public-schema row from auth.users.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.phone
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
