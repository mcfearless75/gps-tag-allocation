# GPS Tag Allocation App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-friendly web app that lets staff scan a GPS tag's QR code, allocate it to a player, and produces a rich weekly report — replacing the handwritten log and spreadsheet described in `docs/superpowers/specs/2026-08-20-gps-tag-allocation-design.md`.

**Architecture:** React + Vite single-page app talking directly to the existing Supabase project `tranmeretracker` (ref `avpdwutgtsurddvfxhmh`) via three new tables plus one new column on the existing `users` table. Business logic (report calculations, CSV/dedupe logic) is factored into pure, unit-tested functions; Supabase access is isolated behind a small `lib/api/*` layer so it can be mocked in tests.

**Tech Stack:** React 18, TypeScript, Vite, React Router, `@supabase/supabase-js`, `html5-qrcode`, `xlsx` (SheetJS), Vitest + Testing Library, deployed to Vercel.

## Global Constraints

- Reuse the existing Supabase project `avpdwutgtsurddvfxhmh` (`tranmeretracker`) — never create a new Supabase project.
- `public.users.role` values are fixed as `'student'` (players, 35 rows today) and `'admin'` (staff, 2 rows today) — do not introduce new role values.
- No offline support and no native mobile app — connectivity at the venue is reliable (per spec).
- Single squad / single team scope — no multi-tenant design.
- Scan-in is optional and must never block or fail the workflow.
- The app must accept whatever string the scanner decodes as `tag_code` and auto-register unseen tags rather than rejecting them.
- Every task must leave `npm run test` green before moving to the next task.

---

## File Structure

```
gps_zapper/
  package.json, tsconfig.json, vite.config.ts, index.html, .env.example
  supabase/migrations/0001_gps_tag_allocation.sql
  src/
    main.tsx, App.tsx, App.css, App.test.tsx
    test/setup.ts
    lib/
      supabaseClient.ts, supabaseClient.test.ts
      types.ts
      scanDedupe.ts, scanDedupe.test.ts
      csvExport.ts, csvExport.test.ts
      excelExport.ts, excelExport.test.ts
      reportCalculations.ts, reportCalculations.test.ts
      api/
        players.ts, players.test.ts
        tags.ts, tags.test.ts
        sessions.ts, sessions.test.ts
        allocations.ts, allocations.test.ts
      auth/
        AuthProvider.tsx, AuthProvider.test.tsx
        ProtectedRoute.tsx
    components/
      QrScanner.tsx, QrScanner.test.tsx
      PlayerPicker.tsx, PlayerPicker.test.tsx
    pages/
      LoginPage.tsx, LoginPage.test.tsx
      RosterPage.tsx, RosterPage.test.tsx
      ScanPage.tsx, ScanPage.test.tsx
      ReportPage.tsx, ReportPage.test.tsx
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/App.css`
- Create: `src/test/setup.ts`
- Create: `src/App.test.tsx`

**Interfaces:**
- Produces: a working Vite+React+TS+Vitest project; `App` default export from `src/App.tsx` (replaced in Task 16).

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "gps-tag-allocation",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.4",
    "html5-qrcode": "^2.3.8",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.0",
    "typescript": "^5.5.4",
    "vite": "^5.4.3",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
});
```

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <title>GPS Tag Allocation</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `src/main.tsx`, `src/App.tsx`, `src/App.css`**

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './App.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

```tsx
// src/App.tsx (placeholder — replaced in Task 16 with routing)
export default function App() {
  return (
    <main>
      <h1>GPS Tag Allocation</h1>
    </main>
  );
}
```

```css
/* src/App.css */
:root {
  color-scheme: light;
  font-family: system-ui, sans-serif;
}
body { margin: 0; padding: 0; }
main { max-width: 480px; margin: 0 auto; padding: 1rem; }
button { font-size: 1rem; padding: 0.6rem 1rem; }
input, select { font-size: 1rem; padding: 0.4rem; }
```

- [ ] **Step 6: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 7: Write the smoke test — `src/App.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText('GPS Tag Allocation')).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Install and run**

Run: `npm install`
Run: `npm run test`
Expected: 1 test file, 1 test, PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite+React+TS project with Vitest"
```

---

### Task 2: Supabase client and shared types

**Files:**
- Create: `.env.example`
- Create: `src/lib/types.ts`
- Create: `src/lib/supabaseClient.ts`
- Test: `src/lib/supabaseClient.test.ts`

**Interfaces:**
- Produces: `Player`, `Tag`, `SessionType`, `TagSession`, `Allocation` types (used by every later task); `supabase` client export.

- [ ] **Step 1: Create `.env.example`**

```
VITE_SUPABASE_URL=https://avpdwutgtsurddvfxhmh.supabase.co
VITE_SUPABASE_ANON_KEY=replace-with-anon-key-from-supabase-dashboard
```

- [ ] **Step 2: Create `src/lib/types.ts`**

```ts
export interface Player {
  id: string;
  name: string;
  shirtNumber: number | null;
}

export interface Tag {
  id: string;
  tagCode: string;
  label: string | null;
  status: 'active' | 'retired' | 'lost';
}

export type SessionType = 'training' | 'match' | 'gym' | 'other';

export interface TagSession {
  id: string;
  sessionDate: string;
  sessionType: SessionType;
  notes: string | null;
  createdBy: string;
}

export interface Allocation {
  id: string;
  sessionId: string;
  tagId: string;
  playerId: string;
  scannedOutBy: string;
  scannedOutAt: string;
  scannedInBy: string | null;
  scannedInAt: string | null;
}
```

- [ ] **Step 3: Write the failing test — `src/lib/supabaseClient.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const createClientMock = vi.hoisted(() => vi.fn(() => ({ mocked: true })));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

describe('supabaseClient', () => {
  beforeEach(() => {
    createClientMock.mockClear();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key-123');
    vi.resetModules();
  });

  it('creates a client with the configured URL and anon key', async () => {
    const { supabase } = await import('./supabaseClient');
    expect(createClientMock).toHaveBeenCalledWith('https://example.supabase.co', 'anon-key-123');
    expect(supabase).toEqual({ mocked: true });
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/lib/supabaseClient.test.ts`
Expected: FAIL — `Cannot find module './supabaseClient'`.

- [ ] **Step 5: Create `src/lib/supabaseClient.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test`
Expected: PASS (2 test files).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add supabase client and shared domain types"
```

---

### Task 3: Database migration

**Files:**
- Create: `supabase/migrations/0001_gps_tag_allocation.sql`

**Interfaces:**
- Produces: tables `gps_tags`, `gps_tag_sessions`, `gps_tag_allocations`; column `users.shirt_number`. Consumed by every `lib/api/*` task.

- [ ] **Step 1: Create the migration file**

```sql
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
```

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP `apply_migration` tool with `project_id: "avpdwutgtsurddvfxhmh"`, `name: "gps_tag_allocation"`, and the SQL above as `query`.

- [ ] **Step 3: Verify**

Use the Supabase MCP `list_tables` tool with `project_id: "avpdwutgtsurddvfxhmh"`.
Expected: `public.gps_tags`, `public.gps_tag_sessions`, `public.gps_tag_allocations` present, each with `rls_enabled: true`.

Then use `execute_sql` with:
```sql
select column_name from information_schema.columns where table_name = 'users' and column_name = 'shirt_number';
```
Expected: one row returned.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add gps tag allocation schema migration"
```

---

### Task 4: Scan dedupe logic (pure, TDD)

**Files:**
- Create: `src/lib/scanDedupe.ts`
- Test: `src/lib/scanDedupe.test.ts`

**Interfaces:**
- Produces: `shouldAcceptScan(lastCode, lastScanAtMs, newCode, nowMs, cooldownMs?): boolean`. Consumed by Task 12 (`QrScanner`).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/scanDedupe.test.ts
import { describe, it, expect } from 'vitest';
import { shouldAcceptScan } from './scanDedupe';

describe('shouldAcceptScan', () => {
  it('accepts the first scan of a code', () => {
    expect(shouldAcceptScan(null, null, 'TAG-001', 1000)).toBe(true);
  });

  it('rejects the same code scanned again within the cooldown window', () => {
    expect(shouldAcceptScan('TAG-001', 1000, 'TAG-001', 1500, 2000)).toBe(false);
  });

  it('accepts the same code scanned again after the cooldown window', () => {
    expect(shouldAcceptScan('TAG-001', 1000, 'TAG-001', 3500, 2000)).toBe(true);
  });

  it('accepts a different code immediately, ignoring the cooldown', () => {
    expect(shouldAcceptScan('TAG-001', 1000, 'TAG-002', 1050, 2000)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/scanDedupe.test.ts`
Expected: FAIL — `Cannot find module './scanDedupe'`.

- [ ] **Step 3: Implement**

```ts
// src/lib/scanDedupe.ts
export function shouldAcceptScan(
  lastCode: string | null,
  lastScanAtMs: number | null,
  newCode: string,
  nowMs: number,
  cooldownMs = 2000
): boolean {
  if (lastCode !== newCode) return true;
  if (lastScanAtMs === null) return true;
  return nowMs - lastScanAtMs > cooldownMs;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add scan dedupe cooldown logic"
```

---

### Task 5: CSV export logic (pure, TDD)

**Files:**
- Create: `src/lib/csvExport.ts`
- Test: `src/lib/csvExport.test.ts`

**Interfaces:**
- Produces: `buildCsv(headers: string[], rows: (string | number | null)[][]): string`. Consumed by Task 15 (`ReportPage`).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/csvExport.test.ts
import { describe, it, expect } from 'vitest';
import { buildCsv } from './csvExport';

describe('buildCsv', () => {
  it('joins headers and rows with commas and newlines', () => {
    const csv = buildCsv(['Name', 'Number'], [['Alex', 7], ['Sam', 9]]);
    expect(csv).toBe('Name,Number\nAlex,7\nSam,9');
  });

  it('quotes and escapes a cell containing a comma or quote', () => {
    const csv = buildCsv(['Note'], [['has, comma'], ['has "quote"']]);
    expect(csv).toBe('Note\n"has, comma"\n"has ""quote"""');
  });

  it('renders null cells as empty strings', () => {
    const csv = buildCsv(['Value'], [[null]]);
    expect(csv).toBe('Value\n');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/csvExport.test.ts`
Expected: FAIL — `Cannot find module './csvExport'`.

- [ ] **Step 3: Implement**

```ts
// src/lib/csvExport.ts
export function buildCsv(headers: string[], rows: (string | number | null)[][]): string {
  const escapeCell = (cell: string | number | null): string => {
    const text = cell === null || cell === undefined ? '' : String(cell);
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','));
  return lines.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add CSV export logic"
```

---

### Task 6: Excel export logic (TDD)

**Files:**
- Create: `src/lib/excelExport.ts`
- Test: `src/lib/excelExport.test.ts`

**Interfaces:**
- Produces: `downloadWorkbook(filename: string, headers: string[], rows: (string | number | null)[][]): void`. Consumed by Task 15 (`ReportPage`).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/excelExport.test.ts
import { describe, it, expect, vi } from 'vitest';

const aoaToSheetMock = vi.hoisted(() => vi.fn().mockReturnValue({ sheet: true }));
const bookNewMock = vi.hoisted(() => vi.fn().mockReturnValue({ book: true }));
const bookAppendSheetMock = vi.hoisted(() => vi.fn());
const writeFileMock = vi.hoisted(() => vi.fn());

vi.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: aoaToSheetMock,
    book_new: bookNewMock,
    book_append_sheet: bookAppendSheetMock,
  },
  writeFile: writeFileMock,
}));

import { downloadWorkbook } from './excelExport';

describe('downloadWorkbook', () => {
  it('builds a workbook from headers and rows and writes it to the given filename', () => {
    downloadWorkbook('report.xlsx', ['A', 'B'], [[1, 2], [3, 4]]);

    expect(aoaToSheetMock).toHaveBeenCalledWith([['A', 'B'], [1, 2], [3, 4]]);
    expect(bookAppendSheetMock).toHaveBeenCalledWith({ book: true }, { sheet: true }, 'Allocations');
    expect(writeFileMock).toHaveBeenCalledWith({ book: true }, 'report.xlsx');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/excelExport.test.ts`
Expected: FAIL — `Cannot find module './excelExport'`.

- [ ] **Step 3: Implement**

```ts
// src/lib/excelExport.ts
import * as XLSX from 'xlsx';

export function downloadWorkbook(
  filename: string,
  headers: string[],
  rows: (string | number | null)[][]
): void {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Allocations');
  XLSX.writeFile(workbook, filename);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Excel export logic"
```

---

### Task 7: Report calculations (pure, TDD)

**Files:**
- Create: `src/lib/reportCalculations.ts`
- Test: `src/lib/reportCalculations.test.ts`

**Interfaces:**
- Consumes: `Allocation`, `Player`, `Tag`, `TagSession` from `src/lib/types.ts` (Task 2).
- Produces: `computeUsualTagPerPlayer(historyAllocations: Allocation[]): Record<string, string>`, `findTagMismatches(weekAllocations: Allocation[], usualTagByPlayer: Record<string,string>): TagMismatch[]`, `findPlayersWithNoAllocations(players: Player[], weekAllocations: Allocation[]): Player[]`, `computeTagUtilization(tags: Tag[], weekAllocations: Allocation[], sessionsById: Record<string, TagSession>, referenceDate: string): TagUtilization[]`. Consumed by Task 15 (`ReportPage`).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/reportCalculations.test.ts
import { describe, it, expect } from 'vitest';
import {
  computeUsualTagPerPlayer,
  findTagMismatches,
  findPlayersWithNoAllocations,
  computeTagUtilization,
} from './reportCalculations';
import type { Allocation, Player, Tag, TagSession } from './types';

function makeAllocation(overrides: Partial<Allocation>): Allocation {
  return {
    id: 'a1',
    sessionId: 's1',
    tagId: 't1',
    playerId: 'p1',
    scannedOutBy: 'staff1',
    scannedOutAt: '2026-08-17T09:00:00Z',
    scannedInBy: null,
    scannedInAt: null,
    ...overrides,
  };
}

describe('computeUsualTagPerPlayer', () => {
  it('picks the most frequently allocated tag per player', () => {
    const history = [
      makeAllocation({ id: 'a1', playerId: 'p1', tagId: 't1' }),
      makeAllocation({ id: 'a2', playerId: 'p1', tagId: 't1' }),
      makeAllocation({ id: 'a3', playerId: 'p1', tagId: 't2' }),
      makeAllocation({ id: 'a4', playerId: 'p2', tagId: 't3' }),
    ];

    expect(computeUsualTagPerPlayer(history)).toEqual({ p1: 't1', p2: 't3' });
  });
});

describe('findTagMismatches', () => {
  it('flags allocations whose tag differs from the player usual tag', () => {
    const weekAllocations = [
      makeAllocation({ id: 'a1', sessionId: 's1', playerId: 'p1', tagId: 't2' }),
      makeAllocation({ id: 'a2', sessionId: 's2', playerId: 'p2', tagId: 't3' }),
    ];
    const usualTagByPlayer = { p1: 't1', p2: 't3' };

    expect(findTagMismatches(weekAllocations, usualTagByPlayer)).toEqual([
      { playerId: 'p1', sessionId: 's1', tagId: 't2', usualTagId: 't1' },
    ]);
  });

  it('ignores players with no known usual tag', () => {
    const weekAllocations = [makeAllocation({ playerId: 'p9', tagId: 't1' })];
    expect(findTagMismatches(weekAllocations, {})).toEqual([]);
  });
});

describe('findPlayersWithNoAllocations', () => {
  it('returns players who have zero allocations in the week', () => {
    const players: Player[] = [
      { id: 'p1', name: 'Alex', shirtNumber: 7 },
      { id: 'p2', name: 'Sam', shirtNumber: 9 },
    ];
    const weekAllocations = [makeAllocation({ playerId: 'p1' })];

    expect(findPlayersWithNoAllocations(players, weekAllocations)).toEqual([
      { id: 'p2', name: 'Sam', shirtNumber: 9 },
    ]);
  });
});

describe('computeTagUtilization', () => {
  it('counts sessions used, last-used date and idle days per tag', () => {
    const tags: Tag[] = [
      { id: 't1', tagCode: 'A', label: null, status: 'active' },
      { id: 't2', tagCode: 'B', label: null, status: 'active' },
    ];
    const sessionsById: Record<string, TagSession> = {
      s1: { id: 's1', sessionDate: '2026-08-17', sessionType: 'training', notes: null, createdBy: 'staff1' },
      s2: { id: 's2', sessionDate: '2026-08-19', sessionType: 'training', notes: null, createdBy: 'staff1' },
    };
    const weekAllocations = [
      makeAllocation({ id: 'a1', tagId: 't1', sessionId: 's1' }),
      makeAllocation({ id: 'a2', tagId: 't1', sessionId: 's2' }),
    ];

    const result = computeTagUtilization(tags, weekAllocations, sessionsById, '2026-08-21');

    expect(result).toEqual([
      { tagId: 't1', sessionsUsed: 2, lastUsedDate: '2026-08-19', idleDays: 2 },
      { tagId: 't2', sessionsUsed: 0, lastUsedDate: null, idleDays: null },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/reportCalculations.test.ts`
Expected: FAIL — `Cannot find module './reportCalculations'`.

- [ ] **Step 3: Implement**

```ts
// src/lib/reportCalculations.ts
import type { Allocation, Tag, Player, TagSession } from './types';

export function computeUsualTagPerPlayer(historyAllocations: Allocation[]): Record<string, string> {
  const countsByPlayer: Record<string, Record<string, number>> = {};

  for (const allocation of historyAllocations) {
    const counts = (countsByPlayer[allocation.playerId] ??= {});
    counts[allocation.tagId] = (counts[allocation.tagId] ?? 0) + 1;
  }

  const usualTagByPlayer: Record<string, string> = {};
  for (const [playerId, counts] of Object.entries(countsByPlayer)) {
    let bestTagId = '';
    let bestCount = -1;
    for (const [tagId, count] of Object.entries(counts)) {
      if (count > bestCount) {
        bestCount = count;
        bestTagId = tagId;
      }
    }
    usualTagByPlayer[playerId] = bestTagId;
  }

  return usualTagByPlayer;
}

export interface TagMismatch {
  playerId: string;
  sessionId: string;
  tagId: string;
  usualTagId: string;
}

export function findTagMismatches(
  weekAllocations: Allocation[],
  usualTagByPlayer: Record<string, string>
): TagMismatch[] {
  const mismatches: TagMismatch[] = [];

  for (const allocation of weekAllocations) {
    const usualTagId = usualTagByPlayer[allocation.playerId];
    if (usualTagId && usualTagId !== allocation.tagId) {
      mismatches.push({
        playerId: allocation.playerId,
        sessionId: allocation.sessionId,
        tagId: allocation.tagId,
        usualTagId,
      });
    }
  }

  return mismatches;
}

export function findPlayersWithNoAllocations(players: Player[], weekAllocations: Allocation[]): Player[] {
  const allocatedPlayerIds = new Set(weekAllocations.map((allocation) => allocation.playerId));
  return players.filter((player) => !allocatedPlayerIds.has(player.id));
}

export interface TagUtilization {
  tagId: string;
  sessionsUsed: number;
  lastUsedDate: string | null;
  idleDays: number | null;
}

export function computeTagUtilization(
  tags: Tag[],
  weekAllocations: Allocation[],
  sessionsById: Record<string, TagSession>,
  referenceDate: string
): TagUtilization[] {
  const reference = new Date(referenceDate).getTime();

  return tags.map((tag) => {
    const tagAllocations = weekAllocations.filter((allocation) => allocation.tagId === tag.id);
    const sessionDates = tagAllocations
      .map((allocation) => sessionsById[allocation.sessionId]?.sessionDate)
      .filter((date): date is string => Boolean(date))
      .sort();

    const lastUsedDate = sessionDates.length > 0 ? sessionDates[sessionDates.length - 1] : null;
    const idleDays = lastUsedDate
      ? Math.floor((reference - new Date(lastUsedDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return { tagId: tag.id, sessionsUsed: tagAllocations.length, lastUsedDate, idleDays };
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add weekly report calculation logic"
```

---

### Task 8: Players API

**Files:**
- Create: `src/lib/api/players.ts`
- Test: `src/lib/api/players.test.ts`

**Interfaces:**
- Consumes: `supabase` (Task 2), `Player` type (Task 2).
- Produces: `listActivePlayers(): Promise<Player[]>`, `updateShirtNumber(playerId: string, shirtNumber: number | null): Promise<void>`. Consumed by Tasks 13, 14, 15.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/api/players.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../supabaseClient', () => ({ supabase: mockSupabase }));

import { listActivePlayers, updateShirtNumber } from './players';

describe('listActivePlayers', () => {
  beforeEach(() => mockSupabase.from.mockReset());

  it('returns students mapped to Player shape, ordered by name', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        { id: 'p1', name: 'Alex Jones', shirt_number: 7 },
        { id: 'p2', name: 'Sam Lee', shirt_number: null },
      ],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    mockSupabase.from.mockReturnValue({ select });

    const players = await listActivePlayers();

    expect(mockSupabase.from).toHaveBeenCalledWith('users');
    expect(select).toHaveBeenCalledWith('id, name, shirt_number');
    expect(eq).toHaveBeenCalledWith('role', 'student');
    expect(order).toHaveBeenCalledWith('name', { ascending: true });
    expect(players).toEqual([
      { id: 'p1', name: 'Alex Jones', shirtNumber: 7 },
      { id: 'p2', name: 'Sam Lee', shirtNumber: null },
    ]);
  });

  it('throws when supabase returns an error', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: new Error('boom') });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    mockSupabase.from.mockReturnValue({ select });

    await expect(listActivePlayers()).rejects.toThrow('boom');
  });
});

describe('updateShirtNumber', () => {
  it('updates the shirt_number column for the given player id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mockSupabase.from.mockReturnValue({ update });

    await updateShirtNumber('p1', 9);

    expect(mockSupabase.from).toHaveBeenCalledWith('users');
    expect(update).toHaveBeenCalledWith({ shirt_number: 9 });
    expect(eq).toHaveBeenCalledWith('id', 'p1');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/api/players.test.ts`
Expected: FAIL — `Cannot find module './players'`.

- [ ] **Step 3: Implement**

```ts
// src/lib/api/players.ts
import { supabase } from '../supabaseClient';
import type { Player } from '../types';

export async function listActivePlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, shirt_number')
    .eq('role', 'student')
    .order('name', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    shirtNumber: row.shirt_number,
  }));
}

export async function updateShirtNumber(playerId: string, shirtNumber: number | null): Promise<void> {
  const { error } = await supabase.from('users').update({ shirt_number: shirtNumber }).eq('id', playerId);
  if (error) throw error;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add players API"
```

---

### Task 9: Tags API

**Files:**
- Create: `src/lib/api/tags.ts`
- Test: `src/lib/api/tags.test.ts`

**Interfaces:**
- Consumes: `supabase` (Task 2), `Tag` type (Task 2).
- Produces: `getOrCreateTagByCode(tagCode: string): Promise<Tag>`, `listTags(): Promise<Tag[]>`. Consumed by Tasks 14, 15.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/api/tags.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../supabaseClient', () => ({ supabase: mockSupabase }));

import { getOrCreateTagByCode, listTags } from './tags';

describe('getOrCreateTagByCode', () => {
  beforeEach(() => mockSupabase.from.mockReset());

  it('returns the existing tag when tag_code is already registered', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 't1', tag_code: 'C5H1-0056', label: null, status: 'active' },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    mockSupabase.from.mockReturnValue({ select });

    const tag = await getOrCreateTagByCode('C5H1-0056');

    expect(tag).toEqual({ id: 't1', tagCode: 'C5H1-0056', label: null, status: 'active' });
  });

  it('creates a new tag when tag_code has not been seen before', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const selectForLookup = vi.fn().mockReturnValue({ eq });

    const single = vi.fn().mockResolvedValue({
      data: { id: 't2', tag_code: 'NEW-CODE', label: null, status: 'active' },
      error: null,
    });
    const selectForInsert = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select: selectForInsert });

    mockSupabase.from.mockReturnValue({ select: selectForLookup, insert });

    const tag = await getOrCreateTagByCode('NEW-CODE');

    expect(insert).toHaveBeenCalledWith({ tag_code: 'NEW-CODE' });
    expect(tag).toEqual({ id: 't2', tagCode: 'NEW-CODE', label: null, status: 'active' });
  });
});

describe('listTags', () => {
  it('returns all tags ordered by tag_code', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: 't1', tag_code: 'A', label: null, status: 'active' }],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ order });
    mockSupabase.from.mockReturnValue({ select });

    const tags = await listTags();

    expect(select).toHaveBeenCalledWith('id, tag_code, label, status');
    expect(order).toHaveBeenCalledWith('tag_code', { ascending: true });
    expect(tags).toEqual([{ id: 't1', tagCode: 'A', label: null, status: 'active' }]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/api/tags.test.ts`
Expected: FAIL — `Cannot find module './tags'`.

- [ ] **Step 3: Implement**

```ts
// src/lib/api/tags.ts
import { supabase } from '../supabaseClient';
import type { Tag } from '../types';

function mapTag(row: any): Tag {
  return { id: row.id, tagCode: row.tag_code, label: row.label, status: row.status };
}

export async function getOrCreateTagByCode(tagCode: string): Promise<Tag> {
  const { data: existing, error: selectError } = await supabase
    .from('gps_tags')
    .select('id, tag_code, label, status')
    .eq('tag_code', tagCode)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return mapTag(existing);

  const { data: created, error: insertError } = await supabase
    .from('gps_tags')
    .insert({ tag_code: tagCode })
    .select('id, tag_code, label, status')
    .single();

  if (insertError) throw insertError;
  return mapTag(created);
}

export async function listTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('gps_tags')
    .select('id, tag_code, label, status')
    .order('tag_code', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapTag);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add tags API"
```

---

### Task 10: Sessions API

**Files:**
- Create: `src/lib/api/sessions.ts`
- Test: `src/lib/api/sessions.test.ts`

**Interfaces:**
- Consumes: `supabase` (Task 2), `SessionType`/`TagSession` types (Task 2).
- Produces: `createSession(sessionDate: string, sessionType: SessionType, createdBy: string, notes?: string | null): Promise<TagSession>`, `listSessionsInRange(startDate: string, endDate: string): Promise<TagSession[]>`. Consumed by Tasks 14, 15.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/api/sessions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../supabaseClient', () => ({ supabase: mockSupabase }));

import { createSession, listSessionsInRange } from './sessions';

describe('createSession', () => {
  beforeEach(() => mockSupabase.from.mockReset());

  it('inserts a session row and returns it mapped to TagSession', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 's1', session_date: '2026-08-20', session_type: 'training', notes: null, created_by: 'staff1' },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    mockSupabase.from.mockReturnValue({ insert });

    const session = await createSession('2026-08-20', 'training', 'staff1');

    expect(insert).toHaveBeenCalledWith({
      session_date: '2026-08-20',
      session_type: 'training',
      created_by: 'staff1',
      notes: null,
    });
    expect(session).toEqual({
      id: 's1',
      sessionDate: '2026-08-20',
      sessionType: 'training',
      notes: null,
      createdBy: 'staff1',
    });
  });
});

describe('listSessionsInRange', () => {
  it('queries sessions between the given dates, ordered by date', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: 's1', session_date: '2026-08-17', session_type: 'training', notes: null, created_by: 'staff1' }],
      error: null,
    });
    const lte = vi.fn().mockReturnValue({ order });
    const gte = vi.fn().mockReturnValue({ lte });
    const select = vi.fn().mockReturnValue({ gte });
    mockSupabase.from.mockReturnValue({ select });

    const sessions = await listSessionsInRange('2026-08-17', '2026-08-23');

    expect(gte).toHaveBeenCalledWith('session_date', '2026-08-17');
    expect(lte).toHaveBeenCalledWith('session_date', '2026-08-23');
    expect(sessions).toEqual([
      { id: 's1', sessionDate: '2026-08-17', sessionType: 'training', notes: null, createdBy: 'staff1' },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/api/sessions.test.ts`
Expected: FAIL — `Cannot find module './sessions'`.

- [ ] **Step 3: Implement**

```ts
// src/lib/api/sessions.ts
import { supabase } from '../supabaseClient';
import type { SessionType, TagSession } from '../types';

function mapSession(row: any): TagSession {
  return {
    id: row.id,
    sessionDate: row.session_date,
    sessionType: row.session_type,
    notes: row.notes,
    createdBy: row.created_by,
  };
}

export async function createSession(
  sessionDate: string,
  sessionType: SessionType,
  createdBy: string,
  notes: string | null = null
): Promise<TagSession> {
  const { data, error } = await supabase
    .from('gps_tag_sessions')
    .insert({ session_date: sessionDate, session_type: sessionType, created_by: createdBy, notes })
    .select('id, session_date, session_type, notes, created_by')
    .single();

  if (error) throw error;
  return mapSession(data);
}

export async function listSessionsInRange(startDate: string, endDate: string): Promise<TagSession[]> {
  const { data, error } = await supabase
    .from('gps_tag_sessions')
    .select('id, session_date, session_type, notes, created_by')
    .gte('session_date', startDate)
    .lte('session_date', endDate)
    .order('session_date', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapSession);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add sessions API"
```

---

### Task 11: Allocations API

**Files:**
- Create: `src/lib/api/allocations.ts`
- Test: `src/lib/api/allocations.test.ts`

**Interfaces:**
- Consumes: `supabase` (Task 2), `Allocation` type (Task 2).
- Produces: `createAllocation(sessionId, tagId, playerId, scannedOutBy): Promise<Allocation>`, `completeAllocation(sessionId, tagId, scannedInBy): Promise<Allocation>`, `listAllocationsForSessions(sessionIds: string[]): Promise<Allocation[]>`. Consumed by Tasks 14, 15.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/api/allocations.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../supabaseClient', () => ({ supabase: mockSupabase }));

import { createAllocation, completeAllocation, listAllocationsForSessions } from './allocations';

const dbRow = {
  id: 'a1',
  session_id: 's1',
  tag_id: 't1',
  player_id: 'p1',
  scanned_out_by: 'staff1',
  scanned_out_at: '2026-08-20T09:00:00Z',
  scanned_in_by: null,
  scanned_in_at: null,
};

const mappedAllocation = {
  id: 'a1',
  sessionId: 's1',
  tagId: 't1',
  playerId: 'p1',
  scannedOutBy: 'staff1',
  scannedOutAt: '2026-08-20T09:00:00Z',
  scannedInBy: null,
  scannedInAt: null,
};

describe('createAllocation', () => {
  beforeEach(() => mockSupabase.from.mockReset());

  it('inserts an allocation row and returns it mapped', async () => {
    const single = vi.fn().mockResolvedValue({ data: dbRow, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    mockSupabase.from.mockReturnValue({ insert });

    const allocation = await createAllocation('s1', 't1', 'p1', 'staff1');

    expect(insert).toHaveBeenCalledWith({
      session_id: 's1',
      tag_id: 't1',
      player_id: 'p1',
      scanned_out_by: 'staff1',
    });
    expect(allocation).toEqual(mappedAllocation);
  });
});

describe('completeAllocation', () => {
  it('marks the open allocation for a tag in a session as scanned in', async () => {
    const returnedRow = { ...dbRow, scanned_in_by: 'staff2', scanned_in_at: '2026-08-20T11:00:00Z' };
    const single = vi.fn().mockResolvedValue({ data: returnedRow, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const isNull = vi.fn().mockReturnValue({ select });
    const eqTag = vi.fn().mockReturnValue({ is: isNull });
    const eqSession = vi.fn().mockReturnValue({ eq: eqTag });
    const update = vi.fn().mockReturnValue({ eq: eqSession });
    mockSupabase.from.mockReturnValue({ update });

    const allocation = await completeAllocation('s1', 't1', 'staff2');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ scanned_in_by: 'staff2' })
    );
    expect(eqSession).toHaveBeenCalledWith('session_id', 's1');
    expect(eqTag).toHaveBeenCalledWith('tag_id', 't1');
    expect(isNull).toHaveBeenCalledWith('scanned_in_at', null);
    expect(allocation.scannedInBy).toBe('staff2');
  });
});

describe('listAllocationsForSessions', () => {
  it('returns an empty array without querying when given no session ids', async () => {
    const allocations = await listAllocationsForSessions([]);
    expect(allocations).toEqual([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('queries allocations whose session_id is in the given list', async () => {
    const inFn = vi.fn().mockResolvedValue({ data: [dbRow], error: null });
    const select = vi.fn().mockReturnValue({ in: inFn });
    mockSupabase.from.mockReturnValue({ select });

    const allocations = await listAllocationsForSessions(['s1']);

    expect(inFn).toHaveBeenCalledWith('session_id', ['s1']);
    expect(allocations).toEqual([mappedAllocation]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/api/allocations.test.ts`
Expected: FAIL — `Cannot find module './allocations'`.

- [ ] **Step 3: Implement**

```ts
// src/lib/api/allocations.ts
import { supabase } from '../supabaseClient';
import type { Allocation } from '../types';

function mapAllocation(row: any): Allocation {
  return {
    id: row.id,
    sessionId: row.session_id,
    tagId: row.tag_id,
    playerId: row.player_id,
    scannedOutBy: row.scanned_out_by,
    scannedOutAt: row.scanned_out_at,
    scannedInBy: row.scanned_in_by,
    scannedInAt: row.scanned_in_at,
  };
}

export async function createAllocation(
  sessionId: string,
  tagId: string,
  playerId: string,
  scannedOutBy: string
): Promise<Allocation> {
  const { data, error } = await supabase
    .from('gps_tag_allocations')
    .insert({ session_id: sessionId, tag_id: tagId, player_id: playerId, scanned_out_by: scannedOutBy })
    .select('id, session_id, tag_id, player_id, scanned_out_by, scanned_out_at, scanned_in_by, scanned_in_at')
    .single();

  if (error) throw error;
  return mapAllocation(data);
}

export async function completeAllocation(
  sessionId: string,
  tagId: string,
  scannedInBy: string
): Promise<Allocation> {
  const { data, error } = await supabase
    .from('gps_tag_allocations')
    .update({ scanned_in_by: scannedInBy, scanned_in_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('tag_id', tagId)
    .is('scanned_in_at', null)
    .select('id, session_id, tag_id, player_id, scanned_out_by, scanned_out_at, scanned_in_by, scanned_in_at')
    .single();

  if (error) throw error;
  return mapAllocation(data);
}

export async function listAllocationsForSessions(sessionIds: string[]): Promise<Allocation[]> {
  if (sessionIds.length === 0) return [];

  const { data, error } = await supabase
    .from('gps_tag_allocations')
    .select('id, session_id, tag_id, player_id, scanned_out_by, scanned_out_at, scanned_in_by, scanned_in_at')
    .in('session_id', sessionIds);

  if (error) throw error;
  return (data ?? []).map(mapAllocation);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add allocations API"
```

---

### Task 12: Auth provider and protected routes

**Files:**
- Create: `src/lib/auth/AuthProvider.tsx`
- Create: `src/lib/auth/ProtectedRoute.tsx`
- Test: `src/lib/auth/AuthProvider.test.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 2).
- Produces: `AuthProvider`, `useAuth(): { session: Session | null; loading: boolean }`, `ProtectedRoute`. Consumed by Task 16 and pages in Tasks 13-15.

- [ ] **Step 1: Write the failing test**

```tsx
// src/lib/auth/AuthProvider.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthProvider';

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

function Consumer() {
  const { session, loading } = useAuth();
  if (loading) return <span>loading</span>;
  return <span>{session ? `signed-in:${session.user.id}` : 'signed-out'}</span>;
}

describe('AuthProvider', () => {
  it('resolves the current session on mount', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('signed-in:u1')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth/AuthProvider.test.tsx`
Expected: FAIL — `Cannot find module './AuthProvider'`.

- [ ] **Step 3: Implement**

```tsx
// src/lib/auth/AuthProvider.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event: string, newSession: Session | null) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
```

```tsx
// src/lib/auth/ProtectedRoute.tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add auth provider and protected route"
```

---

### Task 13: QrScanner component

**Files:**
- Create: `src/components/QrScanner.tsx`
- Test: `src/components/QrScanner.test.tsx`

**Interfaces:**
- Consumes: `shouldAcceptScan` (Task 4), `Html5Qrcode` from `html5-qrcode`.
- Produces: `QrScanner({ onScan: (code: string) => void })`. Consumed by Task 14 (`ScanPage`).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/QrScanner.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const startMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const stopMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const Html5QrcodeMock = vi.hoisted(() =>
  vi.fn().mockImplementation(() => ({ start: startMock, stop: stopMock }))
);

vi.mock('html5-qrcode', () => ({ Html5Qrcode: Html5QrcodeMock }));

import { QrScanner } from './QrScanner';

describe('QrScanner', () => {
  it('renders the scanner region and starts the camera with the back-facing camera', () => {
    render(<QrScanner onScan={vi.fn()} />);

    expect(screen.getByTestId('qr-scanner-region')).toBeInTheDocument();
    expect(startMock).toHaveBeenCalledWith(
      { facingMode: 'environment' },
      expect.objectContaining({ fps: 10 }),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('calls onScan with the decoded text when a scan succeeds', () => {
    const onScan = vi.fn();
    render(<QrScanner onScan={onScan} />);

    const successCallback = startMock.mock.calls[0][2];
    successCallback('TAG-001');

    expect(onScan).toHaveBeenCalledWith('TAG-001');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/QrScanner.test.tsx`
Expected: FAIL — `Cannot find module './QrScanner'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/QrScanner.tsx
import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { shouldAcceptScan } from '../lib/scanDedupe';

interface QrScannerProps {
  onScan: (code: string) => void;
}

const ELEMENT_ID = 'qr-scanner-region';

export function QrScanner({ onScan }: QrScannerProps) {
  const lastCodeRef = useRef<string | null>(null);
  const lastScanAtRef = useRef<number | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode(ELEMENT_ID);

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText: string) => {
          const now = Date.now();
          if (shouldAcceptScan(lastCodeRef.current, lastScanAtRef.current, decodedText, now)) {
            lastCodeRef.current = decodedText;
            lastScanAtRef.current = now;
            onScan(decodedText);
          }
        },
        () => {
          /* ignore per-frame decode failures */
        }
      )
      .catch((err: unknown) => {
        console.error('Failed to start QR scanner', err);
      });

    return () => {
      scanner.stop().catch(() => {
        /* already stopped */
      });
    };
  }, [onScan]);

  return <div id={ELEMENT_ID} data-testid={ELEMENT_ID} />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add QR scanner component"
```

---

### Task 14: Roster page

**Files:**
- Create: `src/pages/RosterPage.tsx`
- Test: `src/pages/RosterPage.test.tsx`

**Interfaces:**
- Consumes: `listActivePlayers`, `updateShirtNumber` (Task 8).
- Produces: `RosterPage`. Consumed by Task 16.

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/RosterPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

const listActivePlayersMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue([{ id: 'p1', name: 'Alex Jones', shirtNumber: 7 }])
);
const updateShirtNumberMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../lib/api/players', () => ({
  listActivePlayers: listActivePlayersMock,
  updateShirtNumber: updateShirtNumberMock,
}));

import { RosterPage } from './RosterPage';

describe('RosterPage', () => {
  it('lists players and saves an edited shirt number', async () => {
    render(<RosterPage />);

    await waitFor(() => expect(screen.getByText('Alex Jones')).toBeInTheDocument());

    const input = screen.getByLabelText('Shirt number for Alex Jones');
    await userEvent.clear(input);
    await userEvent.type(input, '10');

    await waitFor(() => expect(updateShirtNumberMock).toHaveBeenCalledWith('p1', 10));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/RosterPage.test.tsx`
Expected: FAIL — `Cannot find module './RosterPage'`.

- [ ] **Step 3: Implement**

```tsx
// src/pages/RosterPage.tsx
import { useEffect, useState } from 'react';
import { listActivePlayers, updateShirtNumber } from '../lib/api/players';
import type { Player } from '../lib/types';

export function RosterPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listActivePlayers().then((data) => {
      setPlayers(data);
      setLoading(false);
    });
  }, []);

  async function handleChange(playerId: string, value: string) {
    const shirtNumber = value === '' ? null : Number(value);
    setPlayers((current) =>
      current.map((player) => (player.id === playerId ? { ...player, shirtNumber } : player))
    );
    await updateShirtNumber(playerId, shirtNumber);
  }

  if (loading) return <p>Loading roster...</p>;

  return (
    <main>
      <h1>Squad Roster</h1>
      <table>
        <thead>
          <tr><th>Player</th><th>Shirt number</th></tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id}>
              <td>{player.name}</td>
              <td>
                <input
                  type="number"
                  aria-label={`Shirt number for ${player.name}`}
                  value={player.shirtNumber ?? ''}
                  onChange={(event) => handleChange(player.id, event.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add roster page"
```

---

### Task 15: Login page

**Files:**
- Create: `src/pages/LoginPage.tsx`
- Test: `src/pages/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 2).
- Produces: `LoginPage`. Consumed by Task 16.

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/LoginPage.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

const signInWithPasswordMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/supabaseClient', () => ({
  supabase: { auth: { signInWithPassword: signInWithPasswordMock } },
}));

import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('signs in with the entered email and password', async () => {
    signInWithPasswordMock.mockResolvedValue({ error: null });
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email'), 'coach@tranmere.test');
    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: 'coach@tranmere.test',
      password: 'secret123',
    });
  });

  it('shows an error message when sign-in fails', async () => {
    signInWithPasswordMock.mockResolvedValue({ error: { message: 'Invalid credentials' } });
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email'), 'coach@tranmere.test');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/LoginPage.test.tsx`
Expected: FAIL — `Cannot find module './LoginPage'`.

- [ ] **Step 3: Implement**

```tsx
// src/pages/LoginPage.tsx
import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) setError(signInError.message);
  }

  return (
    <main>
      <h1>Staff Login</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add login page"
```

---

### Task 16: PlayerPicker component and Scan page

**Files:**
- Create: `src/components/PlayerPicker.tsx`
- Create: `src/pages/ScanPage.tsx`
- Test: `src/components/PlayerPicker.test.tsx`
- Test: `src/pages/ScanPage.test.tsx`

**Interfaces:**
- Consumes: `Player` type (Task 2), `useAuth` (Task 12), `QrScanner` (Task 13), `listActivePlayers` (Task 8), `getOrCreateTagByCode` (Task 9), `createSession` (Task 10), `createAllocation`/`completeAllocation` (Task 11).
- Produces: `PlayerPicker({ players, onSelect })`, `ScanPage`. Consumed by Task 17.

- [ ] **Step 1: Write the failing test for PlayerPicker**

```tsx
// src/components/PlayerPicker.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PlayerPicker } from './PlayerPicker';

const players = [
  { id: 'p1', name: 'Alex Jones', shirtNumber: 7 },
  { id: 'p2', name: 'Sam Lee', shirtNumber: null },
];

describe('PlayerPicker', () => {
  it('filters players by typed name', async () => {
    render(<PlayerPicker players={players} onSelect={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Search players'), 'Sam');

    expect(screen.getByText('Sam Lee')).toBeInTheDocument();
    expect(screen.queryByText(/Alex Jones/)).not.toBeInTheDocument();
  });

  it('calls onSelect with the chosen player', async () => {
    const onSelect = vi.fn();
    render(<PlayerPicker players={players} onSelect={onSelect} />);

    await userEvent.click(screen.getByText('Alex Jones (#7)'));

    expect(onSelect).toHaveBeenCalledWith(players[0]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/PlayerPicker.test.tsx`
Expected: FAIL — `Cannot find module './PlayerPicker'`.

- [ ] **Step 3: Implement PlayerPicker**

```tsx
// src/components/PlayerPicker.tsx
import { useMemo, useState } from 'react';
import type { Player } from '../lib/types';

interface PlayerPickerProps {
  players: Player[];
  onSelect: (player: Player) => void;
}

export function PlayerPicker({ players, onSelect }: PlayerPickerProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return players;
    return players.filter((player) => player.name.toLowerCase().includes(normalized));
  }, [players, query]);

  return (
    <div>
      <input
        aria-label="Search players"
        placeholder="Search player..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <ul>
        {filtered.map((player) => (
          <li key={player.id}>
            <button type="button" onClick={() => onSelect(player)}>
              {player.name}
              {player.shirtNumber !== null ? ` (#${player.shirtNumber})` : ''}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/PlayerPicker.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the failing test for ScanPage**

```tsx
// src/pages/ScanPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

const listActivePlayersMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue([{ id: 'p1', name: 'Alex Jones', shirtNumber: 7 }])
);
const getOrCreateTagByCodeMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ id: 't1', tagCode: 'TAG-001', label: null, status: 'active' })
);
const createSessionMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ id: 's1', sessionDate: '2026-08-20', sessionType: 'training', notes: null, createdBy: 'staff1' })
);
const createAllocationMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const completeAllocationMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('../lib/api/players', () => ({ listActivePlayers: listActivePlayersMock }));
vi.mock('../lib/api/tags', () => ({ getOrCreateTagByCode: getOrCreateTagByCodeMock }));
vi.mock('../lib/api/sessions', () => ({ createSession: createSessionMock }));
vi.mock('../lib/api/allocations', () => ({
  createAllocation: createAllocationMock,
  completeAllocation: completeAllocationMock,
}));
vi.mock('../lib/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'staff1' } }, loading: false }),
}));
vi.mock('../components/QrScanner', () => ({
  QrScanner: ({ onScan }: { onScan: (code: string) => void }) => (
    <button type="button" onClick={() => onScan('TAG-001')}>Simulate scan</button>
  ),
}));

import { ScanPage } from './ScanPage';

describe('ScanPage', () => {
  it('starts a session, scans a tag out to a player, then scans it back in', async () => {
    render(<ScanPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Start session' }));
    await waitFor(() => expect(createSessionMock).toHaveBeenCalledWith('2026-08-20', 'training', 'staff1'));

    await userEvent.click(screen.getByRole('button', { name: 'Simulate scan' }));
    await waitFor(() => expect(getOrCreateTagByCodeMock).toHaveBeenCalledWith('TAG-001'));

    await waitFor(() => expect(screen.getByText('Alex Jones (#7)')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Alex Jones (#7)'));

    await waitFor(() =>
      expect(createAllocationMock).toHaveBeenCalledWith('s1', 't1', 'p1', 'staff1')
    );

    await userEvent.click(screen.getByRole('button', { name: 'Scan In' }));
    await userEvent.click(screen.getByRole('button', { name: 'Simulate scan' }));

    await waitFor(() => expect(completeAllocationMock).toHaveBeenCalledWith('s1', 't1', 'staff1'));
  });
});
```

Note: this test relies on `new Date().toISOString().slice(0, 10)` equalling `'2026-08-20'` — the plan assumes the implementer runs this on 2026-08-20, or mocks system time with `vi.setSystemTime(new Date('2026-08-20T09:00:00Z'))` in a `beforeEach` if run later. Add that `beforeEach` when the current date has moved on:

```tsx
import { beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-20T09:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/pages/ScanPage.test.tsx`
Expected: FAIL — `Cannot find module './ScanPage'`.

- [ ] **Step 7: Implement ScanPage**

```tsx
// src/pages/ScanPage.tsx
import { useEffect, useState } from 'react';
import { QrScanner } from '../components/QrScanner';
import { PlayerPicker } from '../components/PlayerPicker';
import { listActivePlayers } from '../lib/api/players';
import { getOrCreateTagByCode } from '../lib/api/tags';
import { createSession } from '../lib/api/sessions';
import { createAllocation, completeAllocation } from '../lib/api/allocations';
import { useAuth } from '../lib/auth/AuthProvider';
import type { Player, SessionType, TagSession } from '../lib/types';

type ScanMode = 'out' | 'in';

export function ScanPage() {
  const { session: authSession } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [tagSession, setTagSession] = useState<TagSession | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>('training');
  const [mode, setMode] = useState<ScanMode>('out');
  const [pendingTagId, setPendingTagId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    listActivePlayers().then(setPlayers);
  }, []);

  async function handleStartSession() {
    if (!authSession) return;
    const created = await createSession(new Date().toISOString().slice(0, 10), sessionType, authSession.user.id);
    setTagSession(created);
  }

  async function handleScan(code: string) {
    if (!tagSession || !authSession) return;
    const tag = await getOrCreateTagByCode(code);

    if (mode === 'out') {
      setPendingTagId(tag.id);
    } else {
      await completeAllocation(tagSession.id, tag.id, authSession.user.id);
      setStatusMessage(`Tag ${code} checked back in.`);
    }
  }

  async function handlePlayerSelected(player: Player) {
    if (!tagSession || !authSession || !pendingTagId) return;
    await createAllocation(tagSession.id, pendingTagId, player.id, authSession.user.id);
    setStatusMessage(`Tag allocated to ${player.name}.`);
    setPendingTagId(null);
  }

  if (!tagSession) {
    return (
      <main>
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
        <button type="button" onClick={handleStartSession}>Start session</button>
      </main>
    );
  }

  return (
    <main>
      <h1>{tagSession.sessionType} — {tagSession.sessionDate}</h1>
      <div role="group" aria-label="Scan mode">
        <button type="button" onClick={() => setMode('out')} aria-pressed={mode === 'out'}>Scan Out</button>
        <button type="button" onClick={() => setMode('in')} aria-pressed={mode === 'in'}>Scan In</button>
      </div>
      {statusMessage && <p role="status">{statusMessage}</p>}
      {pendingTagId ? (
        <PlayerPicker players={players} onSelect={handlePlayerSelected} />
      ) : (
        <QrScanner onScan={handleScan} />
      )}
    </main>
  );
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add player picker and scan page"
```

---

### Task 17: Report page

**Files:**
- Create: `src/pages/ReportPage.tsx`
- Test: `src/pages/ReportPage.test.tsx`

**Interfaces:**
- Consumes: `listActivePlayers` (Task 8), `listTags` (Task 9), `listSessionsInRange` (Task 10), `listAllocationsForSessions` (Task 11), `computeUsualTagPerPlayer`/`findTagMismatches`/`findPlayersWithNoAllocations`/`computeTagUtilization` (Task 7), `buildCsv` (Task 5), `downloadWorkbook` (Task 6).
- Produces: `ReportPage`. Consumed by Task 18.

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/ReportPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const player = { id: 'p1', name: 'Alex Jones', shirtNumber: 7 };
const tag = { id: 't1', tagCode: 'TAG-001', label: null, status: 'active' as const };
const session = { id: 's1', sessionDate: '2026-08-17', sessionType: 'training' as const, notes: null, createdBy: 'staff1' };
const allocation = {
  id: 'a1',
  sessionId: 's1',
  tagId: 't1',
  playerId: 'p1',
  scannedOutBy: 'staff1',
  scannedOutAt: '2026-08-17T09:00:00Z',
  scannedInBy: null,
  scannedInAt: null,
};

vi.mock('../lib/api/players', () => ({ listActivePlayers: vi.fn().mockResolvedValue([player]) }));
vi.mock('../lib/api/tags', () => ({ listTags: vi.fn().mockResolvedValue([tag]) }));
vi.mock('../lib/api/sessions', () => ({ listSessionsInRange: vi.fn().mockResolvedValue([session]) }));
vi.mock('../lib/api/allocations', () => ({ listAllocationsForSessions: vi.fn().mockResolvedValue([allocation]) }));

const downloadWorkbookMock = vi.hoisted(() => vi.fn());
vi.mock('../lib/excelExport', () => ({ downloadWorkbook: downloadWorkbookMock }));

import { ReportPage } from './ReportPage';

describe('ReportPage', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
    URL.revokeObjectURL = vi.fn();
  });

  it('renders the allocation log and player row, and triggers an Excel export', async () => {
    render(<ReportPage />);

    await waitFor(() => expect(screen.getByText('Alex Jones')).toBeInTheDocument());
    expect(screen.getByText('TAG-001')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Export Excel' }));

    expect(downloadWorkbookMock).toHaveBeenCalledWith(
      expect.stringContaining('.xlsx'),
      expect.arrayContaining(['Date', 'Session Type', 'Tag', 'Player', 'Shirt #', 'Scanned Out', 'Scanned In']),
      expect.arrayContaining([expect.arrayContaining(['2026-08-17', 'training', 'TAG-001', 'Alex Jones', 7])])
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/ReportPage.test.tsx`
Expected: FAIL — `Cannot find module './ReportPage'`.

- [ ] **Step 3: Implement**

```tsx
// src/pages/ReportPage.tsx
import { useEffect, useState } from 'react';
import { listSessionsInRange } from '../lib/api/sessions';
import { listAllocationsForSessions } from '../lib/api/allocations';
import { listActivePlayers } from '../lib/api/players';
import { listTags } from '../lib/api/tags';
import {
  computeUsualTagPerPlayer,
  findTagMismatches,
  findPlayersWithNoAllocations,
  computeTagUtilization,
} from '../lib/reportCalculations';
import { buildCsv } from '../lib/csvExport';
import { downloadWorkbook } from '../lib/excelExport';
import type { Allocation, Player, Tag, TagSession } from '../lib/types';

function startOfIsoWeek(date: Date): Date {
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function buildExportRows(
  allocations: Allocation[],
  sessionsById: Record<string, TagSession>,
  playersById: Record<string, Player>,
  tagsById: Record<string, Tag>
): (string | number | null)[][] {
  return allocations.map((allocation) => [
    sessionsById[allocation.sessionId]?.sessionDate ?? '',
    sessionsById[allocation.sessionId]?.sessionType ?? '',
    tagsById[allocation.tagId]?.tagCode ?? '',
    playersById[allocation.playerId]?.name ?? '',
    playersById[allocation.playerId]?.shirtNumber ?? null,
    allocation.scannedOutAt,
    allocation.scannedInAt ?? '',
  ]);
}

const EXPORT_HEADERS = ['Date', 'Session Type', 'Tag', 'Player', 'Shirt #', 'Scanned Out', 'Scanned In'];

export function ReportPage() {
  const [weekStart, setWeekStart] = useState(() => toIsoDate(startOfIsoWeek(new Date())));
  const [players, setPlayers] = useState<Player[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [sessions, setSessions] = useState<TagSession[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [historyAllocations, setHistoryAllocations] = useState<Allocation[]>([]);

  useEffect(() => {
    const weekStartDate = new Date(weekStart);
    const weekEnd = toIsoDate(addDays(weekStartDate, 6));
    const historyStart = toIsoDate(addDays(weekStartDate, -28));

    Promise.all([
      listActivePlayers(),
      listTags(),
      listSessionsInRange(weekStart, weekEnd),
      listSessionsInRange(historyStart, weekEnd),
    ]).then(async ([playerRows, tagRows, weekSessions, historySessions]) => {
      setPlayers(playerRows);
      setTags(tagRows);
      setSessions(weekSessions);

      const [weekAllocations, historyAllocationRows] = await Promise.all([
        listAllocationsForSessions(weekSessions.map((s) => s.id)),
        listAllocationsForSessions(historySessions.map((s) => s.id)),
      ]);

      setAllocations(weekAllocations);
      setHistoryAllocations(historyAllocationRows);
    });
  }, [weekStart]);

  const sessionsById = Object.fromEntries(sessions.map((s) => [s.id, s]));
  const playersById = Object.fromEntries(players.map((p) => [p.id, p]));
  const tagsById = Object.fromEntries(tags.map((t) => [t.id, t]));

  const usualTagByPlayer = computeUsualTagPerPlayer(historyAllocations);
  const mismatches = findTagMismatches(allocations, usualTagByPlayer);
  const playersWithNoAllocations = findPlayersWithNoAllocations(players, allocations);
  const utilization = computeTagUtilization(tags, allocations, sessionsById, toIsoDate(addDays(new Date(weekStart), 6)));

  function handleExportCsv() {
    const rows = buildExportRows(allocations, sessionsById, playersById, tagsById);
    const csv = buildCsv(EXPORT_HEADERS, rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `allocation-log-${weekStart}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleExportExcel() {
    const rows = buildExportRows(allocations, sessionsById, playersById, tagsById);
    downloadWorkbook(`allocation-log-${weekStart}.xlsx`, EXPORT_HEADERS, rows);
  }

  return (
    <main>
      <h1>Weekly Report</h1>
      <label>
        Week starting
        <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
      </label>

      <section>
        <h2>Allocation Log</h2>
        <table>
          <thead>
            <tr><th>Date</th><th>Type</th><th>Tag</th><th>Player</th><th>Shirt #</th><th>Out</th><th>In</th></tr>
          </thead>
          <tbody>
            {allocations.map((allocation) => (
              <tr key={allocation.id}>
                <td>{sessionsById[allocation.sessionId]?.sessionDate}</td>
                <td>{sessionsById[allocation.sessionId]?.sessionType}</td>
                <td>{tagsById[allocation.tagId]?.tagCode}</td>
                <td>{playersById[allocation.playerId]?.name}</td>
                <td>{playersById[allocation.playerId]?.shirtNumber ?? ''}</td>
                <td>{allocation.scannedOutAt}</td>
                <td>{allocation.scannedInAt ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Anomalies</h2>
        <h3>Unusual tag/player pairings</h3>
        <ul>
          {mismatches.map((mismatch, index) => (
            <li key={index}>
              {playersById[mismatch.playerId]?.name} used tag {tagsById[mismatch.tagId]?.tagCode} instead of
              usual tag {tagsById[mismatch.usualTagId]?.tagCode}
            </li>
          ))}
        </ul>
        <h3>Players with no allocations this week</h3>
        <ul>
          {playersWithNoAllocations.map((player) => (
            <li key={player.id}>{player.name}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Utilization</h2>
        <table>
          <thead>
            <tr><th>Tag</th><th>Sessions used</th><th>Last used</th><th>Idle days</th></tr>
          </thead>
          <tbody>
            {utilization.map((row) => (
              <tr key={row.tagId}>
                <td>{tagsById[row.tagId]?.tagCode}</td>
                <td>{row.sessionsUsed}</td>
                <td>{row.lastUsedDate ?? '—'}</td>
                <td>{row.idleDays ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <button type="button" onClick={handleExportCsv}>Export CSV</button>
      <button type="button" onClick={handleExportExcel}>Export Excel</button>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add weekly report page"
```

---

### Task 18: App routing and deployment

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `AuthProvider`/`useAuth`/`ProtectedRoute` (Task 12), `LoginPage` (Task 15), `ScanPage` (Task 16), `RosterPage` (Task 14), `ReportPage` (Task 17).

- [ ] **Step 1: Update the test — `src/App.test.tsx`**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('./lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

import App from './App';

describe('App', () => {
  it('redirects a signed-out visitor to the login page', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Staff Login')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — still renders the placeholder "GPS Tag Allocation" heading, not "Staff Login".

- [ ] **Step 3: Implement routing — `src/App.tsx`**

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth/AuthProvider';
import { ProtectedRoute } from './lib/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ScanPage } from './pages/ScanPage';
import { RosterPage } from './pages/RosterPage';
import { ReportPage } from './pages/ReportPage';

function Nav() {
  const { session } = useAuth();
  if (!session) return null;
  return (
    <nav>
      <a href="/scan">Scan</a>
      <a href="/roster">Roster</a>
      <a href="/report">Report</a>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Nav />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/scan" element={<ProtectedRoute><ScanPage /></ProtectedRoute>} />
          <Route path="/roster" element={<ProtectedRoute><RosterPage /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/scan" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS — all test files across the project green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire up app routing with auth-protected pages"
```

- [ ] **Step 6: Deploy to Vercel**

Run:
```bash
npm run build
npx vercel --prod
```

When prompted, link to a new Vercel project. Then set the environment variables (values from the Supabase project's API settings page) so the deployed build can reach the database:

```bash
npx vercel env add VITE_SUPABASE_URL production
npx vercel env add VITE_SUPABASE_ANON_KEY production
```

Redeploy after adding env vars so the build picks them up:
```bash
npx vercel --prod
```

- [ ] **Step 7: Smoke-test the deployed URL**

Open the deployed URL on a phone browser, sign in with an existing admin account, confirm the Scan page loads and the camera permission prompt appears.

---

## Self-Review Notes

- **Spec coverage:** scan-out (Task 16), optional scan-in (Task 16), roster/shirt numbers (Task 14), weekly allocation log/anomalies/utilization/export (Task 17), shared auth/roster via existing `users` table (Tasks 3, 8, 12, 15), Vercel deployment (Task 18) — all covered.
- **Placeholder scan:** no TBD/TODO markers; every step has complete, runnable code.
- **Type consistency:** `Player`, `Tag`, `TagSession`, `Allocation` field names are identical across Tasks 2, 7-11, 14-17. API function names (`listActivePlayers`, `updateShirtNumber`, `getOrCreateTagByCode`, `listTags`, `createSession`, `listSessionsInRange`, `createAllocation`, `completeAllocation`, `listAllocationsForSessions`) match between their defining task and every consuming task.
