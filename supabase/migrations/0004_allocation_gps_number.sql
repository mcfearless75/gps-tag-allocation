-- Session-only Catapult GPS unit number (16-30 on the paper template).
-- Changes every match; do not store this on users.
alter table public.gps_tag_allocations
  add column if not exists gps_number smallint;
