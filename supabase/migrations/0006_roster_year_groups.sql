-- Year group on roster lists + one-shot import of every active student.

drop function if exists public.gps_list_active_players();
drop function if exists public.gps_list_addable_players();

create function public.gps_list_active_players()
returns table (
  id uuid,
  name text,
  shirt_number smallint,
  catapult_code text,
  year_group smallint
)
language sql security definer set search_path = public as $$
  select u.id, u.name, u.shirt_number, u.catapult_code, coalesce(u.year_group, 1)
  from public.users u
  join public.gps_roster_members rm on rm.player_id = u.id
  where u.role = 'student'
    and rm.is_active = true
    and coalesce(u.is_active, true) = true
  order by coalesce(u.year_group, 1), u.name;
$$;

create function public.gps_list_addable_players()
returns table (
  id uuid,
  name text,
  shirt_number smallint,
  catapult_code text,
  year_group smallint
)
language sql security definer set search_path = public as $$
  select u.id, u.name, u.shirt_number, u.catapult_code, coalesce(u.year_group, 1)
  from public.users u
  left join public.gps_roster_members rm on rm.player_id = u.id
  where u.role = 'student'
    and coalesce(u.is_active, true) = true
    and coalesce(rm.is_active, false) = false
  order by coalesce(u.year_group, 1), u.name;
$$;

create or replace function public.gps_import_all_students()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  added integer;
begin
  insert into public.gps_roster_members (player_id, is_active, added_at, removed_at)
  select u.id, true, now(), null
  from public.users u
  where u.role = 'student'
    and coalesce(u.is_active, true) = true
  on conflict (player_id) do update
    set is_active = true, added_at = now(), removed_at = null;

  get diagnostics added = row_count;
  return added;
end;
$$;

grant execute on function public.gps_list_active_players() to anon;
grant execute on function public.gps_list_addable_players() to anon;
grant execute on function public.gps_import_all_students() to anon;
