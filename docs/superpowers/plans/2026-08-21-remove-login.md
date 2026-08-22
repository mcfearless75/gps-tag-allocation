# Remove Login Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the login requirement entirely so the app is usable with no sign-in step, while keeping the shared academy database's other student data (DOB, height, weight, position, etc.) exactly as protected as it is today.

**Architecture:** Open the app's three own tables (`gps_tags`, `gps_tag_sessions`, `gps_tag_allocations`) to anonymous access; add two narrow `SECURITY DEFINER` Postgres functions that expose only `id`/`name`/`shirt_number` from `public.users` for anonymous callers; replace the authenticated user id used for "who scanned this" attribution with a fixed constant; delete the login/auth UI entirely.

**Tech Stack:** Same as the existing app (React, Vite, TypeScript, Vitest, Testing Library, Supabase). No new dependencies.

## Global Constraints

- No existing RLS policy on `public.users` is loosened or removed — only two new, narrow `SECURITY DEFINER` functions are added, granted to `anon`.
- The existing admin-gated RLS policies on `gps_tags`/`gps_tag_sessions`/`gps_tag_allocations` (from the original migration) are not removed — only additive anon policies are added alongside them.
- No new Supabase Auth account is created. The fixed attribution id is the existing "Admin" account: `ac222db0-f1e6-42fa-b6ce-4c6061e53bac` (`superuser@tranmeretracker.internal`).
- Every task ends with `npm run test` fully green before committing.
- No new npm dependencies.
- Every accessible label/role/text unrelated to auth (button text, table headers, etc.) stays unchanged.

---

## File Structure

```
supabase/migrations/0002_remove_login_anon_access.sql   (new)
src/
  lib/
    operator.ts                    (new)
    api/
      players.ts                    (modified — RPC calls instead of table access)
      players.test.ts               (modified)
  pages/
    ScanPage.tsx                     (modified — OPERATOR_ID instead of auth)
    ScanPage.test.tsx                (modified — auth mocking removed)
    LoginPage.tsx                    (deleted)
    LoginPage.test.tsx               (deleted)
  lib/auth/
    AuthProvider.tsx                  (deleted)
    AuthProvider.test.tsx             (deleted)
    ProtectedRoute.tsx                (deleted)
  components/
    AppShell.tsx                      (modified — no auth gating)
    AppShell.test.tsx                 (modified — simplified)
  App.tsx                             (modified — no AuthProvider/ProtectedRoute/login route)
  App.test.tsx                        (modified — no login redirect test)
```

---

### Task 1: Database migration — anon access

**Files:**
- Create: `supabase/migrations/0002_remove_login_anon_access.sql`

**Interfaces:**
- Produces: anon-accessible policies on the three app tables; RPC functions `gps_list_active_players()` returning `{ id: uuid, name: text, shirt_number: smallint }[]` and `gps_update_shirt_number(target_id uuid, new_shirt_number smallint)` returning void. Consumed by Task 2.

- [ ] **Step 1: Create the migration file**

```sql
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
```

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP `apply_migration` tool with `project_id: "avpdwutgtsurddvfxhmh"`, `name: "remove_login_anon_access"`, and the SQL above as `query`.

- [ ] **Step 3: Verify the policies exist**

Use `execute_sql` with:
```sql
select tablename, policyname, roles from pg_policies
where schemaname = 'public' and policyname like 'anon %';
```
Expected: 3 rows, one per app table, `roles` containing `{anon}`.

- [ ] **Step 4: Verify the functions exist and are SECURITY DEFINER, granted to anon**

```sql
select p.proname, p.prosecdef, has_function_privilege('anon', p.oid, 'execute') as anon_can_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('gps_list_active_players', 'gps_update_shirt_number');
```
Expected: 2 rows, both `prosecdef = true` and `anon_can_execute = true`.

- [ ] **Step 5: Verify the functions actually work for an anonymous caller (not just the service role)**

Get the project's anon/publishable key and URL, then call the RPC directly over HTTP as the `anon` role (this is what the deployed app will do):

```bash
curl -s -X POST 'https://avpdwutgtsurddvfxhmh.supabase.co/rest/v1/rpc/gps_list_active_players' \
  -H "apikey: <publishable key>" \
  -H "Authorization: Bearer <publishable key>" \
  -H "Content-Type: application/json"
```
Expected: a JSON array of `{id, name, shirt_number}` objects (35 students), HTTP 200 — not a 401/403 permission error.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0002_remove_login_anon_access.sql
git commit -m "feat: open app tables to anon access, add narrow player RPCs"
```

---

### Task 2: Players API — switch to RPC calls

**Files:**
- Modify: `src/lib/api/players.ts`
- Modify: `src/lib/api/players.test.ts`

**Interfaces:**
- Consumes: `supabase` (existing), `gps_list_active_players`/`gps_update_shirt_number` RPCs (Task 1).
- Produces: `listActivePlayers(): Promise<Player[]>`, `updateShirtNumber(playerId: string, shirtNumber: number | null): Promise<void>` — same signatures as before, so no consuming code (`RosterPage.tsx`, `ScanPage.tsx`) needs to change.

- [ ] **Step 1: Write the failing tests — `src/lib/api/players.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../supabaseClient', () => ({ supabase: mockSupabase }));

import { listActivePlayers, updateShirtNumber } from './players';

describe('listActivePlayers', () => {
  beforeEach(() => mockSupabase.rpc.mockReset());

  it('returns students mapped to Player shape via the gps_list_active_players RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [
        { id: 'p1', name: 'Alex Jones', shirt_number: 7 },
        { id: 'p2', name: 'Sam Lee', shirt_number: null },
      ],
      error: null,
    });

    const players = await listActivePlayers();

    expect(mockSupabase.rpc).toHaveBeenCalledWith('gps_list_active_players');
    expect(players).toEqual([
      { id: 'p1', name: 'Alex Jones', shirtNumber: 7 },
      { id: 'p2', name: 'Sam Lee', shirtNumber: null },
    ]);
  });

  it('throws when supabase returns an error', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: new Error('boom') });

    await expect(listActivePlayers()).rejects.toThrow('boom');
  });
});

describe('updateShirtNumber', () => {
  it('calls the gps_update_shirt_number RPC with the player id and new number', async () => {
    mockSupabase.rpc.mockResolvedValue({ error: null });

    await updateShirtNumber('p1', 9);

    expect(mockSupabase.rpc).toHaveBeenCalledWith('gps_update_shirt_number', {
      target_id: 'p1',
      new_shirt_number: 9,
    });
  });

  it('throws when supabase returns an error', async () => {
    mockSupabase.rpc.mockResolvedValue({ error: new Error('boom') });

    await expect(updateShirtNumber('p1', 9)).rejects.toThrow('boom');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/api/players.test.ts`
Expected: FAIL — the current implementation calls `.from('users')`, not `.rpc(...)`, so `mockSupabase.rpc` is never called and the assertions fail.

- [ ] **Step 3: Implement**

```ts
// src/lib/api/players.ts
import { supabase } from '../supabaseClient';
import type { Player } from '../types';

export async function listActivePlayers(): Promise<Player[]> {
  const { data, error } = await supabase.rpc('gps_list_active_players');

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    shirtNumber: row.shirt_number,
  }));
}

export async function updateShirtNumber(playerId: string, shirtNumber: number | null): Promise<void> {
  const { error } = await supabase.rpc('gps_update_shirt_number', {
    target_id: playerId,
    new_shirt_number: shirtNumber,
  });
  if (error) throw error;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: all tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/players.ts src/lib/api/players.test.ts
git commit -m "feat: switch players API to narrow RPC calls"
```

---

### Task 3: ScanPage — replace auth with a fixed operator id

**Files:**
- Create: `src/lib/operator.ts`
- Modify: `src/pages/ScanPage.tsx`
- Modify: `src/pages/ScanPage.test.tsx`

**Interfaces:**
- Produces: `OPERATOR_ID: string` constant, consumed by `ScanPage.tsx` (this task) and available for any future task that needs it.
- Consumes: nothing new from other tasks. `AuthProvider`/`useAuth` still exist in the codebase at the start of this task (deleted in Task 4) — this task simply stops using them in `ScanPage.tsx`.

- [ ] **Step 1: Create `src/lib/operator.ts`**

```ts
// With no login, every scan/allocation is attributed to this fixed account — the
// existing "Admin" staff user already present in the shared platform's database
// (superuser@tranmeretracker.internal). No new account is created.
export const OPERATOR_ID = 'ac222db0-f1e6-42fa-b6ce-4c6061e53bac';
```

- [ ] **Step 2: Replace `src/pages/ScanPage.test.tsx`**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OPERATOR_ID } from '../lib/operator';

const listActivePlayersMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue([{ id: 'p1', name: 'Alex Jones', shirtNumber: 7 }])
);
const getOrCreateTagByCodeMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ id: 't1', tagCode: 'TAG-001', label: null, status: 'active' })
);
const createSessionMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ id: 's1', sessionDate: '2026-08-20', sessionType: 'training', notes: null, createdBy: 'staff1' })
);
const listSessionsInRangeMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const createAllocationMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const completeAllocationMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('../lib/api/players', () => ({ listActivePlayers: listActivePlayersMock }));
vi.mock('../lib/api/tags', () => ({ getOrCreateTagByCode: getOrCreateTagByCodeMock }));
vi.mock('../lib/api/sessions', () => ({
  createSession: createSessionMock,
  listSessionsInRange: listSessionsInRangeMock,
}));
vi.mock('../lib/api/allocations', () => ({
  createAllocation: createAllocationMock,
  completeAllocation: completeAllocationMock,
}));
vi.mock('../components/QrScanner', () => ({
  QrScanner: ({ onScan }: { onScan: (code: string) => void }) => (
    <button type="button" onClick={() => onScan('TAG-001')}>Simulate scan</button>
  ),
}));

import { ScanPage } from './ScanPage';

describe('ScanPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-08-20T09:00:00Z'));
    listActivePlayersMock.mockClear();
    getOrCreateTagByCodeMock.mockClear();
    createSessionMock.mockClear();
    createAllocationMock.mockClear();
    completeAllocationMock.mockClear();
    listSessionsInRangeMock.mockReset();
    listSessionsInRangeMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a loading state while checking for an existing session, then the Start Session screen', async () => {
    let resolveCheck!: (sessions: unknown[]) => void;
    listSessionsInRangeMock.mockReset();
    listSessionsInRangeMock.mockReturnValue(
      new Promise((resolve) => {
        resolveCheck = resolve;
      })
    );

    render(<ScanPage />);

    expect(screen.getByText('Checking for an existing session...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start session' })).not.toBeInTheDocument();

    resolveCheck([]);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Start session' })).toBeInTheDocument()
    );
    expect(screen.queryByText('Checking for an existing session...')).not.toBeInTheDocument();
  });

  it('falls through to the Start Session screen (without hanging) if the session check fails', async () => {
    listSessionsInRangeMock.mockReset();
    listSessionsInRangeMock.mockRejectedValue(new Error('network error'));

    render(<ScanPage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Start session' })).toBeInTheDocument()
    );
    expect(screen.queryByText('Checking for an existing session...')).not.toBeInTheDocument();
  });

  it('starts a session, scans a tag out to a player, then scans it back in', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ScanPage />);

    await user.click(await screen.findByRole('button', { name: 'Start session' }));
    await waitFor(() => expect(createSessionMock).toHaveBeenCalledWith('2026-08-20', 'training', OPERATOR_ID));

    await user.click(screen.getByRole('button', { name: 'Simulate scan' }));
    await waitFor(() => expect(getOrCreateTagByCodeMock).toHaveBeenCalledWith('TAG-001'));

    await waitFor(() => expect(screen.getByText('Alex Jones (#7)')).toBeInTheDocument());
    await user.click(screen.getByText('Alex Jones (#7)'));

    await waitFor(() =>
      expect(createAllocationMock).toHaveBeenCalledWith('s1', 't1', 'p1', OPERATOR_ID)
    );

    await user.click(screen.getByRole('button', { name: 'Scan In' }));
    await user.click(screen.getByRole('button', { name: 'Simulate scan' }));

    await waitFor(() => expect(completeAllocationMock).toHaveBeenCalledWith('s1', 't1', OPERATOR_ID));
  });

  it('resumes an existing session for today when its session type matches the selected type', async () => {
    const existingSession = {
      id: 's2',
      sessionDate: '2026-08-20',
      sessionType: 'training',
      notes: null,
      createdBy: 'staff1',
    };
    listSessionsInRangeMock.mockReset();
    listSessionsInRangeMock.mockResolvedValue([existingSession]);

    render(<ScanPage />);

    await waitFor(() => expect(listSessionsInRangeMock).toHaveBeenCalledWith('2026-08-20', '2026-08-20'));
    await waitFor(() => expect(screen.getByText(/training — 2026-08-20/)).toBeInTheDocument());

    expect(screen.queryByRole('button', { name: 'Start session' })).not.toBeInTheDocument();
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it('does NOT auto-resume an existing session for today when its session type does not match the selected type', async () => {
    const existingSession = {
      id: 's2',
      sessionDate: '2026-08-20',
      sessionType: 'match',
      notes: null,
      createdBy: 'staff1',
    };
    listSessionsInRangeMock.mockReset();
    listSessionsInRangeMock.mockResolvedValue([existingSession]);

    render(<ScanPage />);

    await waitFor(() => expect(listSessionsInRangeMock).toHaveBeenCalledWith('2026-08-20', '2026-08-20'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Start session' })).toBeInTheDocument()
    );

    expect(screen.queryByText(/match — 2026-08-20/)).not.toBeInTheDocument();
  });

  it('re-gates the Start session button while re-checking after the session type changes', async () => {
    render(<ScanPage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Start session' })).toBeInTheDocument()
    );

    let resolveSecondCheck!: (sessions: unknown[]) => void;
    listSessionsInRangeMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecondCheck = resolve;
        })
    );

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.selectOptions(screen.getByLabelText('Session type'), 'match');

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Start session' })).not.toBeInTheDocument()
    );
    expect(screen.getByText('Checking for an existing session...')).toBeInTheDocument();

    resolveSecondCheck([]);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Start session' })).toBeInTheDocument()
    );
    expect(screen.queryByText('Checking for an existing session...')).not.toBeInTheDocument();
  });

  it('shows a friendly message when scanning in a tag with no open allocation', async () => {
    const existingSession = {
      id: 's2',
      sessionDate: '2026-08-20',
      sessionType: 'training',
      notes: null,
      createdBy: 'staff1',
    };
    listSessionsInRangeMock.mockReset();
    listSessionsInRangeMock.mockResolvedValue([existingSession]);
    completeAllocationMock.mockResolvedValueOnce(null);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ScanPage />);

    await waitFor(() => expect(screen.getByText(/training — 2026-08-20/)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Scan In' }));
    await user.click(screen.getByRole('button', { name: 'Simulate scan' }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'No open allocation found for tag TAG-001 — was it already checked in, or never checked out?'
      )
    );
  });

  it('surfaces an error instead of crashing when createAllocation fails', async () => {
    const existingSession = {
      id: 's2',
      sessionDate: '2026-08-20',
      sessionType: 'training',
      notes: null,
      createdBy: 'staff1',
    };
    listSessionsInRangeMock.mockReset();
    listSessionsInRangeMock.mockResolvedValue([existingSession]);
    createAllocationMock.mockRejectedValueOnce(new Error('duplicate allocation'));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ScanPage />);

    await waitFor(() => expect(screen.getByText(/training — 2026-08-20/)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Simulate scan' }));
    await waitFor(() => expect(screen.getByText('Alex Jones (#7)')).toBeInTheDocument());
    await user.click(screen.getByText('Alex Jones (#7)'));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Something went wrong — try again.')
    );
  });
});
```

Note: the "does not interrupt an active scan screen when authSession is replaced by a token refresh" test from the previous version is deliberately removed — there is no auth session left to refresh.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/pages/ScanPage.test.tsx`
Expected: FAIL — `ScanPage.tsx` still imports `useAuth` and calls `authSession.user.id`, so `createSessionMock`/`createAllocationMock`/`completeAllocationMock` are called with `undefined` (no `useAuth` mock exists in this test file anymore) instead of `OPERATOR_ID`.

- [ ] **Step 4: Replace `src/pages/ScanPage.tsx`**

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { QrScanner } from '../components/QrScanner';
import { PlayerPicker } from '../components/PlayerPicker';
import { listActivePlayers } from '../lib/api/players';
import { getOrCreateTagByCode } from '../lib/api/tags';
import { createSession, listSessionsInRange } from '../lib/api/sessions';
import { createAllocation, completeAllocation } from '../lib/api/allocations';
import { OPERATOR_ID } from '../lib/operator';
import type { Player, SessionType, TagSession } from '../lib/types';

type ScanMode = 'out' | 'in';

export function ScanPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [tagSession, setTagSession] = useState<TagSession | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>('training');
  const [mode, setMode] = useState<ScanMode>('out');
  const [pendingTagId, setPendingTagId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Mirrors tagSession into a ref (same pattern as handleScanRef below) so the resume-check
  // effect can read the latest value without adding it to its own dependency array — adding
  // it directly would re-run the effect (and re-arm checkingSession) every time a session
  // starts, including as a result of this very effect resuming one.
  const tagSessionRef = useRef(tagSession);
  useEffect(() => {
    tagSessionRef.current = tagSession;
  });

  useEffect(() => {
    listActivePlayers().then(setPlayers);
  }, []);

  useEffect(() => {
    // Once a session is already active there's nothing left to "resume" or protect
    // against duplicating — this check's entire purpose is choosing what to show
    // *before* a session exists. Skip entirely (without touching checkingSession) once
    // one is active.
    if (tagSessionRef.current) {
      return;
    }
    setCheckingSession(true);
    const todayDateString = new Date().toISOString().slice(0, 10);
    listSessionsInRange(todayDateString, todayDateString)
      .then((sessions) => {
        const match = sessions.find((session) => session.sessionType === sessionType);
        if (match) {
          setTagSession(match);
        }
        setCheckingSession(false);
      })
      .catch(() => {
        setCheckingSession(false);
      });
    // Re-runs if the user changes the session type before starting, so switching the
    // dropdown to a type that already has a session today resumes it instead of risking
    // a duplicate create. Once a session is resumed/created the dropdown is no longer
    // shown, so sessionType can't change again and this won't re-trigger — and the
    // tagSessionRef guard above independently no-ops any re-run once a session is active.
  }, [sessionType]);

  async function handleStartSession() {
    try {
      const created = await createSession(new Date().toISOString().slice(0, 10), sessionType, OPERATOR_ID);
      setTagSession(created);
    } catch {
      setStatusMessage('Something went wrong — try again.');
    }
  }

  async function handleScan(code: string) {
    if (!tagSession) return;
    try {
      const tag = await getOrCreateTagByCode(code);

      if (mode === 'out') {
        setPendingTagId(tag.id);
      } else {
        const completed = await completeAllocation(tagSession.id, tag.id, OPERATOR_ID);
        if (completed) {
          setStatusMessage(`Tag ${code} checked back in.`);
        } else {
          setStatusMessage(
            `No open allocation found for tag ${code} — was it already checked in, or never checked out?`
          );
        }
      }
    } catch {
      setStatusMessage('Something went wrong — try again.');
    }
  }

  const handleScanRef = useRef(handleScan);
  useEffect(() => {
    handleScanRef.current = handleScan;
  });
  const stableOnScan = useCallback((code: string) => {
    handleScanRef.current(code);
  }, []);

  async function handlePlayerSelected(player: Player) {
    if (!tagSession || !pendingTagId) return;
    try {
      await createAllocation(tagSession.id, pendingTagId, player.id, OPERATOR_ID);
      setStatusMessage(`Tag allocated to ${player.name}.`);
      setPendingTagId(null);
    } catch {
      setStatusMessage('Something went wrong — try again.');
    }
  }

  if (checkingSession) {
    return (
      <main>
        <p>Checking for an existing session...</p>
      </main>
    );
  }

  if (!tagSession) {
    return (
      <main>
        <div className="card">
          <h1>Start Session</h1>
          <label>
            Session type
            <select value={sessionType} onChange={(e) => setSessionType(e.target.value as SessionType)}>
              <option value="training">Training</option>
              <option value="match">Match</option>
              <option value="gym">Gym</option>
              <option value="other">Other</option>
            </select>
          </label>
          <button type="button" className="action-btn" onClick={handleStartSession}>Start session</button>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="card">
        <h1>{tagSession.sessionType} — {tagSession.sessionDate}</h1>
        <div className="toggle-group" role="group" aria-label="Scan mode">
          <button type="button" onClick={() => setMode('out')} aria-pressed={mode === 'out'}>Scan Out</button>
          <button type="button" onClick={() => setMode('in')} aria-pressed={mode === 'in'}>Scan In</button>
        </div>
        {statusMessage && <p role="status">{statusMessage}</p>}
        {pendingTagId ? (
          <PlayerPicker players={players} onSelect={handlePlayerSelected} />
        ) : (
          <div className="viewfinder">
            <QrScanner onScan={stableOnScan} />
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test`
Expected: all tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/lib/operator.ts src/pages/ScanPage.tsx src/pages/ScanPage.test.tsx
git commit -m "feat: replace auth session with fixed operator id in ScanPage"
```

---

### Task 4: Remove login/auth infrastructure entirely

**Files:**
- Delete: `src/pages/LoginPage.tsx`
- Delete: `src/pages/LoginPage.test.tsx`
- Delete: `src/lib/auth/AuthProvider.tsx`
- Delete: `src/lib/auth/AuthProvider.test.tsx`
- Delete: `src/lib/auth/ProtectedRoute.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/AppShell.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks in this plan (Task 3 already made `ScanPage.tsx` auth-free, so nothing left in the app imports `AuthProvider`/`ProtectedRoute`/`LoginPage` except `App.tsx` itself).
- Produces: `App` with no auth/login route; `AppShell` with an unconditional bottom nav (no `session` prop dependency).

- [ ] **Step 1: Delete the four auth/login files**

```bash
rm src/pages/LoginPage.tsx src/pages/LoginPage.test.tsx src/lib/auth/AuthProvider.tsx src/lib/auth/AuthProvider.test.tsx src/lib/auth/ProtectedRoute.tsx
```

- [ ] **Step 2: Replace `src/components/AppShell.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import crest from '../assets/tranmere-crest.webp';

interface AppShellProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: '/scan', label: 'Scan' },
  { to: '/roster', label: 'Roster' },
  { to: '/report', label: 'Report' },
];

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();

  return (
    <div className="app-shell">
      <header className="app-header">
        <img src={crest} alt="Tranmere Rovers crest" className="app-header-crest" />
        <span className="app-header-title">GPS Tag Allocation</span>
      </header>
      <div className="app-content">{children}</div>
      <nav className="bottom-nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            aria-current={location.pathname === item.to ? 'page' : undefined}
            className={`bottom-nav-item${location.pathname === item.to ? ' active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
```

- [ ] **Step 3: Replace `src/components/AppShell.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('shows the crest, app title, page content, and Scan/Roster/Report bottom nav links', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <p>page content</p>
        </AppShell>
      </MemoryRouter>
    );

    expect(screen.getByAltText('Tranmere Rovers crest')).toBeInTheDocument();
    expect(screen.getByText('GPS Tag Allocation')).toBeInTheDocument();
    expect(screen.getByText('page content')).toBeInTheDocument();
    expect(screen.getByText('Scan')).toBeInTheDocument();
    expect(screen.getByText('Roster')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the AppShell test to verify it passes**

Run: `npx vitest run src/components/AppShell.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Replace `src/App.tsx`**

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ScanPage } from './pages/ScanPage';
import { RosterPage } from './pages/RosterPage';
import { ReportPage } from './pages/ReportPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/roster" element={<RosterPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="*" element={<Navigate to="/scan" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
```

- [ ] **Step 6: Replace `src/App.test.tsx`**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('./lib/api/players', () => ({ listActivePlayers: vi.fn().mockResolvedValue([]) }));
vi.mock('./lib/api/sessions', () => ({
  listSessionsInRange: vi.fn().mockResolvedValue([]),
  createSession: vi.fn(),
}));

import App from './App';

describe('App', () => {
  it('renders the Scan page directly, with no login step', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Start Session')).toBeInTheDocument());
  });
});
```

- [ ] **Step 7: Run the full suite**

Run: `npm run test`
Expected: all tests passing (some test count reduction is expected — `AuthProvider.test.tsx`/`LoginPage.test.tsx` are gone, `ScanPage.test.tsx` lost one test in Task 3 — verify the count matches: previous total minus `AuthProvider.test.tsx`'s 2 tests, minus `LoginPage.test.tsx`'s 2 tests, minus 1 removed ScanPage test).

- [ ] **Step 8: Run `npx tsc -b --noEmit`**

Expected: clean — no dangling imports of the deleted files anywhere.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: remove login/auth entirely — app requires no sign-in"
```

---

## Self-Review Notes

- **Spec coverage:** anon RLS + narrow RPCs (Task 1), players API switch (Task 2), fixed operator id in ScanPage (Task 3), full auth/login removal (Task 4) — all covered.
- **Placeholder scan:** no TBD/TODO; every step has complete code or exact SQL/commands.
- **Type consistency:** `listActivePlayers`/`updateShirtNumber` signatures in Task 2 are unchanged from before, so `RosterPage.tsx` (which already calls them) needs no change. `OPERATOR_ID` (Task 3) is a plain `string`, matching every place it's substituted for `authSession.user.id` (itself a `string`).
- **Ordering check:** Task 3 (ScanPage stops using auth) is deliberately before Task 4 (auth infrastructure deleted) so the app compiles at every commit — `AuthProvider`/`ProtectedRoute`/`LoginPage` exist-but-unused between Tasks 3 and 4, then are removed once nothing references them.
