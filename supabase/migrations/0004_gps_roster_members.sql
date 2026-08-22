-- supabase/migrations/0004_gps_roster_members.sql

-- public.users is shared with the wider academy platform (attendance, coursework,
-- etc.), so "remove a player" must never touch that table or delete a person's
-- record. This app-owned membership table tracks who is on THIS app's active
-- roster; removing someone just flips is_active off.
create table public.gps_roster_members (
  player_id uuid primary key references public.users(id) on delete cascade,
  is_active boolean not null default true,
  added_at timestamptz not null default now(),
  removed_at timestamptz
);

alter table public.gps_roster_members enable row level security;
-- No anon policies on purpose: all access goes through the SECURITY DEFINER
-- functions below, same protection model public.users already uses (see 0002).

-- Backfill so today's roster view doesn't change on deploy: everyone who is
-- currently a student starts active on the roster.
insert into public.gps_roster_members (player_id, is_active, added_at)
select id, true, now() from public.users where role = 'student';

-- Roster membership now drives "active", not just role='student'.
create or replace function public.gps_list_active_players()
returns table (id uuid, name text, shirt_number smallint)
language sql security definer set search_path = public as $$
  select u.id, u.name, u.shirt_number
  from public.users u
  join public.gps_roster_members rm on rm.player_id = u.id
  where u.role = 'student' and rm.is_active = true
  order by u.name;
$$;

-- Students not currently on the active roster, for the "add player" search.
-- Academy-wide for now (no team/year filter) by product decision — narrow this
-- with an added where clause if a year-group column lands later.
create function public.gps_list_addable_players()
returns table (id uuid, name text, shirt_number smallint)
language sql security definer set search_path = public as $$
  select u.id, u.name, u.shirt_number
  from public.users u
  left join public.gps_roster_members rm on rm.player_id = u.id
  where u.role = 'student' and coalesce(rm.is_active, false) = false
  order by u.name;
$$;

create function public.gps_add_roster_member(target_id uuid)
returns void
language sql security definer set search_path = public as $$
  insert into public.gps_roster_members (player_id, is_active, added_at, removed_at)
  select target_id, true, now(), null
  from public.users where id = target_id and role = 'student'
  on conflict (player_id) do update
    set is_active = true, added_at = now(), removed_at = null;
$$;

-- Soft remove only: flips is_active off, never deletes the membership row or
-- touches public.users. Reversible via gps_add_roster_member.
create function public.gps_remove_roster_member(target_id uuid)
returns void
language sql security definer set search_path = public as $$
  update public.gps_roster_members
  set is_active = false, removed_at = now()
  where player_id = target_id;
$$;

revoke execute on function public.gps_list_addable_players() from public;
revoke execute on function public.gps_add_roster_member(uuid) from public;
revoke execute on function public.gps_remove_roster_member(uuid) from public;
grant execute on function public.gps_list_addable_players() to anon;
grant execute on function public.gps_add_roster_member(uuid) to anon;
grant execute on function public.gps_remove_roster_member(uuid) to anon;
