-- supabase/migrations/0001_gps_tag_allocation.sql
alter table public.users add column if not exists shirt_number smallint;

create table public.gps_tags (
  id uuid primary key default gen_random_uuid(),
  tag_code text not null unique,
  label text,
  status text not null default 'active' check (status in ('active','retired','lost')),
  created_at timestamptz not null default now()
);

create table public.gps_tag_sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null,
  session_type text not null check (session_type in ('training','match','gym','other')),
  notes text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create table public.gps_tag_allocations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.gps_tag_sessions(id) on delete cascade,
  tag_id uuid not null references public.gps_tags(id),
  player_id uuid not null references public.users(id),
  scanned_out_by uuid not null references public.users(id),
  scanned_out_at timestamptz not null default now(),
  scanned_in_by uuid references public.users(id),
  scanned_in_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id, tag_id),
  unique (session_id, player_id)
);

alter table public.gps_tags enable row level security;
alter table public.gps_tag_sessions enable row level security;
alter table public.gps_tag_allocations enable row level security;

create policy "admins full access to gps_tags" on public.gps_tags
  for all using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

create policy "admins full access to gps_tag_sessions" on public.gps_tag_sessions
  for all using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

create policy "admins full access to gps_tag_allocations" on public.gps_tag_allocations
  for all using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));
