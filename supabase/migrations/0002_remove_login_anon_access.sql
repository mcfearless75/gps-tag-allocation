-- supabase/migrations/0002_remove_login_anon_access.sql

-- The app now has no login step, so it can no longer rely on auth.uid()/role='admin'
-- checks. Open the three app-owned tables to anonymous access, additively — the
-- existing admin-gated policies from 0001 stay in place.
create policy "anon full access to gps_tags" on public.gps_tags
  for all to anon using (true) with check (true);

create policy "anon full access to gps_tag_sessions" on public.gps_tag_sessions
  for all to anon using (true) with check (true);

create policy "anon full access to gps_tag_allocations" on public.gps_tag_allocations
  for all to anon using (true) with check (true);

-- Do NOT open public.users to anonymous access — it holds DOB, height, weight,
-- position, and other students' unrelated platform data. Instead, expose exactly
-- id/name/shirt_number via two narrow SECURITY DEFINER functions.
create function public.gps_list_active_players()
returns table (id uuid, name text, shirt_number smallint)
language sql security definer set search_path = public as $$
  select id, name, shirt_number from public.users where role = 'student' order by name;
$$;

create function public.gps_update_shirt_number(target_id uuid, new_shirt_number smallint)
returns void
language sql security definer set search_path = public as $$
  update public.users set shirt_number = new_shirt_number where id = target_id and role = 'student';
$$;

grant execute on function public.gps_list_active_players() to anon;
grant execute on function public.gps_update_shirt_number(uuid, smallint) to anon;
