-- Catapult One cloud athlete code (e.g. 'Tranmere P27') lives on the shared
-- users row so Tracker imports can resolve CSV "Player Name" to a student.
alter table public.users add column if not exists catapult_code text;

create unique index if not exists users_catapult_code_lower_idx
  on public.users (lower(catapult_code))
  where catapult_code is not null and btrim(catapult_code) <> '';

create or replace function public.gps_list_active_players()
returns table (id uuid, name text, shirt_number smallint, catapult_code text)
language sql security definer set search_path = public as $$
  select u.id, u.name, u.shirt_number, u.catapult_code
  from public.users u
  join public.gps_roster_members rm on rm.player_id = u.id
  where u.role = 'student' and rm.is_active = true
  order by u.name;
$$;

create or replace function public.gps_list_addable_players()
returns table (id uuid, name text, shirt_number smallint, catapult_code text)
language sql security definer set search_path = public as $$
  select u.id, u.name, u.shirt_number, u.catapult_code
  from public.users u
  left join public.gps_roster_members rm on rm.player_id = u.id
  where u.role = 'student' and coalesce(rm.is_active, false) = false
  order by u.name;
$$;

create or replace function public.gps_update_catapult_code(
  target_id uuid,
  new_catapult_code text
)
returns void
language sql security definer set search_path = public as $$
  update public.users
  set catapult_code = nullif(btrim(new_catapult_code), '')
  where id = target_id and role = 'student';
$$;

revoke execute on function public.gps_update_catapult_code(uuid, text) from public;
grant execute on function public.gps_update_catapult_code(uuid, text) to anon;
