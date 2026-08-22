-- supabase/migrations/0003_tighten_anon_permissions.sql

-- Make the anon-only intent of these two functions explicit and unambiguous,
-- rather than relying on Postgres's implicit "EXECUTE granted to PUBLIC by
-- default on function creation" behavior, which the original migration left
-- unstated.
revoke execute on function public.gps_list_active_players() from public;
revoke execute on function public.gps_update_shirt_number(uuid, smallint) from public;
grant execute on function public.gps_list_active_players() to anon;
grant execute on function public.gps_update_shirt_number(uuid, smallint) to anon;

-- The app never deletes rows (confirmed via grep for `.delete(` — zero hits), so
-- dropping DELETE from the anon policies removes a real risk (a single malicious
-- or buggy anonymous request wiping the entire allocation history) at zero
-- functional cost.
drop policy "anon full access to gps_tags" on public.gps_tags;
create policy "anon read/write access to gps_tags" on public.gps_tags
  for select to anon using (true);
create policy "anon insert access to gps_tags" on public.gps_tags
  for insert to anon with check (true);
create policy "anon update access to gps_tags" on public.gps_tags
  for update to anon using (true) with check (true);

drop policy "anon full access to gps_tag_sessions" on public.gps_tag_sessions;
create policy "anon read access to gps_tag_sessions" on public.gps_tag_sessions
  for select to anon using (true);
create policy "anon insert access to gps_tag_sessions" on public.gps_tag_sessions
  for insert to anon with check (true);
create policy "anon update access to gps_tag_sessions" on public.gps_tag_sessions
  for update to anon using (true) with check (true);

drop policy "anon full access to gps_tag_allocations" on public.gps_tag_allocations;
create policy "anon read access to gps_tag_allocations" on public.gps_tag_allocations
  for select to anon using (true);
create policy "anon insert access to gps_tag_allocations" on public.gps_tag_allocations
  for insert to anon with check (true);
create policy "anon update access to gps_tag_allocations" on public.gps_tag_allocations
  for update to anon using (true) with check (true);
