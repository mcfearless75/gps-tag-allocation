# Remove Login Screen — Design

Date: 2026-08-21

## Problem

The app currently requires signing in with a real Supabase Auth staff account before scanning. The user has confirmed (after considering the trade-off) that they want no login step at all, ever — the app should be usable immediately by anyone who opens the URL.

## Constraint this changes

Removing the login gate means the app's database access can no longer rely on `auth.uid()` / `role = 'admin'` checks (an anonymous request has no `auth.uid()`). Two things must be opened up for the app to keep working with no session:

1. The three app-owned tables (`gps_tags`, `gps_tag_sessions`, `gps_tag_allocations`).
2. Reading the player list and writing a player's shirt number — both currently go through the shared `public.users` table, which also holds each player's date of birth, height, weight, position, and (for other students) other platform data unrelated to this app.

## Approach

**Open the three app-owned tables to anonymous access** (in addition to the existing admin policies, which stay in place in case authenticated access is ever restored) — this is fully within scope, since this app already owns them.

**Do not open `public.users` to anonymous access.** Instead, add two narrow, `SECURITY DEFINER` Postgres functions that expose exactly `id`, `name`, `shirt_number` — nothing else from that table — and grant `EXECUTE` on those functions to the `anon` role:

```sql
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
```

These run with elevated privilege internally but only ever return/accept the three named columns — DOB, height, weight, position, contact info, and every other student's other-app data stay exactly as protected as they are today.

**Attribution ("who scanned this tag out")**: with no signed-in user, `created_by`/`scanned_out_by`/`scanned_in_by` need a value. Use a fixed constant — the existing "Admin" account's id (`ac222db0-f1e6-42fa-b6ce-4c6061e53bac`, `superuser@tranmeretracker.internal`) — baked into the app as `OPERATOR_ID`. No new account is created; this reuses an id that already exists and already has the `admin` role.

## App changes

- Delete `src/pages/LoginPage.tsx` (+ test), `src/lib/auth/AuthProvider.tsx` (+ test), `src/lib/auth/ProtectedRoute.tsx`, and the `/login` route.
- `src/App.tsx`: routes render directly, no `ProtectedRoute` wrapping, no `AuthProvider`.
- `src/components/AppShell.tsx`: the bottom nav is no longer conditional on a session — it always renders (there's no "signed out" state anymore).
- `src/pages/ScanPage.tsx`: remove `useAuth`/`authSession` entirely; use a new `OPERATOR_ID` constant (in `src/lib/operator.ts`) everywhere `authSession.user.id` was used. The session-resume effect's dependency on `authUserId` (there to dodge Supabase's token-refresh churn) is no longer needed since there's no auth session to churn — it now runs on mount and on `sessionType` change only.
- `src/lib/api/players.ts`: `listActivePlayers`/`updateShirtNumber` call the new `gps_list_active_players`/`gps_update_shirt_number` RPCs via `supabase.rpc(...)` instead of querying `users` directly.

## Out of scope

- No change to `gps_tags`/`gps_tag_sessions`/`gps_tag_allocations`'s existing admin-gated policies — only additive anon policies alongside them.
- No change to any other table's RLS.
- No new Supabase Auth account created.

## Testing

Existing tests for `players.ts`, `ScanPage`, `App`, `AppShell` are updated to match (no more auth mocking; `players.ts` tests mock `.rpc(...)` instead of `.from('users')`). Deleted files' tests are simply removed. Every other existing test's assertions (button text, labels, roles) are unaffected.
