# Tranmere-Branded Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the already-built GPS tag allocation app with Tranmere Rovers branding (crest, crimson/gold palette), a card-based layout, and a mobile bottom tab bar — no business-logic or schema changes.

**Architecture:** Pure CSS design tokens in `src/App.css` drive a new `AppShell` layout component (branded header + bottom tab bar), and each existing page gets restyled in place by adding/adjusting `className`s and wrapping markup — never by renaming or removing anything the current test suite queries by role, label, or text.

**Tech Stack:** Same as the existing app (React, Vite, TypeScript, Vitest, Testing Library). No new dependencies.

## Global Constraints

- Every existing accessible label, role, and text content that the current 51 tests query for must remain **exactly** unchanged (e.g. button text "Scan Out"/"Scan In"/"Start session"/"Export CSV"/"Export Excel"/"Sign in", `aria-label`s like "Shirt number for {name}" and "Search players", `role="alert"`/`role="status"`/`role="group"`, headings like "Weekly Report"/"Staff Login"/"Squad Roster").
- No changes to `lib/api/*`, `lib/reportCalculations.ts`, `lib/csvExport.ts`, `lib/excelExport.ts`, `lib/auth/*`, or the Supabase schema.
- Every task ends with `npm run test` fully green (51+ tests) before committing.
- No new npm dependencies.

---

## File Structure

```
src/
  assets/
    tranmere-crest.webp       (new — copied from project root)
  App.css                      (rewritten — design tokens + component classes)
  App.tsx                       (modified — uses AppShell instead of inline Nav)
  components/
    AppShell.tsx                (new)
    AppShell.test.tsx            (new)
    PlayerPicker.tsx              (modified — className only)
  pages/
    LoginPage.tsx                  (modified — className only)
    ScanPage.tsx                    (modified — className only)
    RosterPage.tsx                  (modified — table → styled rows)
    ReportPage.tsx                   (modified — cards + new stat tiles)
    ReportPage.test.tsx               (modified — one new test added)
```

---

### Task 1: Design tokens and base styles

**Files:**
- Modify: `src/App.css` (full rewrite)

**Interfaces:**
- Produces: CSS custom properties (`--color-primary`, `--color-accent`, `--color-text`, `--color-text-muted`, `--color-bg`, `--color-surface`, `--color-border`, `--color-warning-bg`, `--color-warning-border`, `--radius`, `--radius-sm`, `--space-1`..`--space-6`) and component classes (`.card`, `.action-btn`, `.action-btn.accent`, `.app-shell`, `.app-header`, `.app-header-crest`, `.app-header-title`, `.app-content`, `.bottom-nav`, `.bottom-nav-item`, `.toggle-group`, `.viewfinder`, `.roster-row`, `.shirt-badge`, `.stat-row`, `.stat-tile`, `.stat-tile-num`, `.stat-tile-label`, `.anomaly-item`) consumed by Tasks 2-6.

This is a pure-CSS change with no business logic — there's no automated visual test, so verification is "the full suite stays green and the production build is clean," not red/green TDD.

- [ ] **Step 1: Replace `src/App.css` with the full design system**

```css
/* src/App.css */

/* ---- Design tokens ---- */
:root {
  color-scheme: light;
  font-family: system-ui, -apple-system, sans-serif;

  --color-primary: #C8102E;
  --color-primary-dark: #96001f;
  --color-accent: #FFD100;
  --color-text: #1a1a1a;
  --color-text-muted: #6b6b6b;
  --color-bg: #F7F5F2;
  --color-surface: #ffffff;
  --color-border: #e8e5e0;
  --color-warning-bg: #FFF7E0;
  --color-warning-border: #FFD100;

  --radius: 14px;
  --radius-sm: 8px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
}

/* ---- Base ---- */
body {
  margin: 0;
  padding: 0;
  background: var(--color-bg);
  color: var(--color-text);
}

main {
  max-width: 480px;
  margin: 0 auto;
  padding: var(--space-4);
  padding-bottom: calc(var(--space-6) + 56px); /* keep content clear of the fixed bottom nav */
}

h1 {
  font-size: 1.25rem;
  margin: 0 0 var(--space-4);
}

h2 {
  font-size: 1rem;
  margin: 0 0 var(--space-2);
}

h3 {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-primary-dark);
  margin: var(--space-3) 0 var(--space-2);
}

button {
  font-size: 1rem;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  border: 2px solid var(--color-primary);
  background: var(--color-surface);
  color: var(--color-primary);
  font-weight: 600;
  cursor: pointer;
}

.action-btn {
  background: var(--color-primary);
  color: #fff;
  width: 100%;
  margin-bottom: var(--space-2);
}

.action-btn.accent {
  background: var(--color-accent);
  color: var(--color-text);
  border-color: var(--color-accent);
}

input, select {
  font-size: 1rem;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

th, td {
  text-align: left;
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

/* ---- App shell ---- */
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: var(--color-primary);
  color: #fff;
  padding: var(--space-3) var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.app-header-crest {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.app-header-title {
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 0.02em;
}

.app-content {
  flex: 1;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
}

.bottom-nav-item {
  flex: 1;
  text-align: center;
  padding: var(--space-3) var(--space-1);
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-decoration: none;
}

.bottom-nav-item.active {
  color: var(--color-primary);
}

/* ---- Cards ---- */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}

/* ---- Scan toggle ---- */
.toggle-group {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.toggle-group button {
  flex: 1;
  border-radius: var(--radius-sm);
}

.toggle-group button[aria-pressed="true"] {
  background: var(--color-primary);
  color: #fff;
}

.toggle-group button[aria-pressed="false"] {
  background: var(--color-surface);
  color: var(--color-primary);
}

/* ---- Viewfinder ---- */
.viewfinder {
  border: 3px dashed var(--color-accent);
  border-radius: var(--radius);
  overflow: hidden;
  background: #111;
  min-height: 160px;
}

/* ---- Roster rows / shirt badge ---- */
.roster-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
}

.roster-row:last-child {
  border-bottom: none;
}

.shirt-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

/* ---- Report stat tiles ---- */
.stat-row {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.stat-tile {
  flex: 1;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2);
  text-align: center;
}

.stat-tile-num {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-primary);
}

.stat-tile-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

/* ---- Anomaly chips ---- */
.anomaly-item {
  background: var(--color-warning-bg);
  border-left: 3px solid var(--color-warning-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-2);
  list-style: none;
}
```

- [ ] **Step 2: Verify the suite is unaffected**

Run: `npm run test`
Expected: 17 test files / 51 tests passing (CSS changes don't affect any query-by-role/text/label assertion).

- [ ] **Step 3: Verify the production build is clean**

Run: `npm run build`
Expected: builds successfully, no CSS syntax errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.css
git commit -m "feat: add Tranmere-branded design tokens and component styles"
```

---

### Task 2: Crest asset and AppShell layout

**Files:**
- Create: `src/assets/tranmere-crest.webp` (copied from the project root)
- Create: `src/components/AppShell.tsx`
- Create: `src/components/AppShell.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAuth` (from `../lib/auth/AuthProvider`, exports `{ session, loading }`), CSS classes from Task 1.
- Produces: `AppShell({ children }): JSX.Element`, rendering a branded header (always) and a bottom tab bar (only when signed in). Consumed by `App.tsx`.

- [ ] **Step 1: Copy the crest image into the source tree**

```bash
mkdir -p src/assets
cp "Tranmere_Rovers_FC_crest.svg.webp" "src/assets/tranmere-crest.webp"
rm "Tranmere_Rovers_FC_crest.svg.webp"
```

- [ ] **Step 2: Write the failing test — `src/components/AppShell.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const useAuthMock = vi.hoisted(() => vi.fn());
vi.mock('../lib/auth/AuthProvider', () => ({ useAuth: useAuthMock }));

import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('always shows the crest and app title, signed in or out', () => {
    useAuthMock.mockReturnValue({ session: null, loading: false });
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
  });

  it('hides the bottom nav when signed out', () => {
    useAuthMock.mockReturnValue({ session: null, loading: false });
    render(
      <MemoryRouter>
        <AppShell>
          <p>content</p>
        </AppShell>
      </MemoryRouter>
    );

    expect(screen.queryByText('Scan')).not.toBeInTheDocument();
    expect(screen.queryByText('Roster')).not.toBeInTheDocument();
    expect(screen.queryByText('Report')).not.toBeInTheDocument();
  });

  it('shows Scan/Roster/Report bottom nav links when signed in', () => {
    useAuthMock.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });
    render(
      <MemoryRouter>
        <AppShell>
          <p>content</p>
        </AppShell>
      </MemoryRouter>
    );

    expect(screen.getByText('Scan')).toBeInTheDocument();
    expect(screen.getByText('Roster')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/AppShell.test.tsx`
Expected: FAIL — `Cannot find module './AppShell'`.

- [ ] **Step 4: Implement `src/components/AppShell.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthProvider';
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
  const { session } = useAuth();
  const location = useLocation();

  return (
    <div className="app-shell">
      <header className="app-header">
        <img src={crest} alt="Tranmere Rovers crest" className="app-header-crest" />
        <span className="app-header-title">GPS Tag Allocation</span>
      </header>
      <div className="app-content">{children}</div>
      {session && (
        <nav className="bottom-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`bottom-nav-item${location.pathname === item.to ? ' active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/AppShell.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Wire `AppShell` into `src/App.tsx`, replacing the inline `Nav`**

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './lib/auth/AuthProvider';
import { ProtectedRoute } from './lib/auth/ProtectedRoute';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { ScanPage } from './pages/ScanPage';
import { RosterPage } from './pages/RosterPage';
import { ReportPage } from './pages/ReportPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/scan" element={<ProtectedRoute><ScanPage /></ProtectedRoute>} />
            <Route path="/roster" element={<ProtectedRoute><RosterPage /></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/scan" replace />} />
          </Routes>
        </AppShell>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 7: Run the full suite to verify no regressions**

Run: `npm run test`
Expected: all test files passing, including the existing `src/App.test.tsx` (`redirects a signed-out visitor to the login page` — unaffected, since `AppShell` only adds a header around the routed content and hides the bottom nav when signed out).

- [ ] **Step 8: Commit**

```bash
git add src/assets/tranmere-crest.webp src/components/AppShell.tsx src/components/AppShell.test.tsx src/App.tsx
git commit -m "feat: add branded AppShell with crest header and bottom tab bar"
```

---

### Task 3: Restyle LoginPage

**Files:**
- Modify: `src/pages/LoginPage.tsx`

**Interfaces:**
- Consumes: `.card` class (Task 1). No prop/behavior changes.

- [ ] **Step 1: Wrap the form in a card, changing nothing else**

```tsx
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
      <div className="card">
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
          <button type="submit" className="action-btn" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Run the LoginPage suite to confirm no regressions**

Run: `npx vitest run src/pages/LoginPage.test.tsx`
Expected: PASS (2 tests, unchanged — same labels, button text, and alert role).

- [ ] **Step 3: Run the full suite**

Run: `npm run test`
Expected: all tests passing.

- [ ] **Step 4: Commit**

```bash
git add src/pages/LoginPage.tsx
git commit -m "style: restyle LoginPage with the card design system"
```

---

### Task 4: Restyle ScanPage and PlayerPicker

**Files:**
- Modify: `src/pages/ScanPage.tsx`
- Modify: `src/components/PlayerPicker.tsx`

**Interfaces:**
- Consumes: `.card`, `.action-btn`, `.toggle-group`, `.viewfinder`, `.roster-row` classes (Task 1). No prop/behavior changes to either component.

- [ ] **Step 1: Add classNames to `src/pages/ScanPage.tsx`, changing no text/roles/behavior**

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { QrScanner } from '../components/QrScanner';
import { PlayerPicker } from '../components/PlayerPicker';
import { listActivePlayers } from '../lib/api/players';
import { getOrCreateTagByCode } from '../lib/api/tags';
import { createSession, listSessionsInRange } from '../lib/api/sessions';
import { createAllocation, completeAllocation } from '../lib/api/allocations';
import { useAuth } from '../lib/auth/AuthProvider';
import type { Player, SessionType, TagSession } from '../lib/types';

type ScanMode = 'out' | 'in';

export function ScanPage() {
  const { session: authSession } = useAuth();
  const authUserId = authSession?.user?.id ?? null;
  const [players, setPlayers] = useState<Player[]>([]);
  const [tagSession, setTagSession] = useState<TagSession | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>('training');
  const [mode, setMode] = useState<ScanMode>('out');
  const [pendingTagId, setPendingTagId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const tagSessionRef = useRef(tagSession);
  useEffect(() => {
    tagSessionRef.current = tagSession;
  });

  useEffect(() => {
    listActivePlayers().then(setPlayers);
  }, []);

  useEffect(() => {
    if (tagSessionRef.current) {
      return;
    }
    setCheckingSession(true);
    if (!authUserId) {
      setCheckingSession(false);
      return;
    }
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
  }, [authUserId, sessionType]);

  async function handleStartSession() {
    if (!authSession) return;
    try {
      const created = await createSession(new Date().toISOString().slice(0, 10), sessionType, authSession.user.id);
      setTagSession(created);
    } catch {
      setStatusMessage('Something went wrong — try again.');
    }
  }

  async function handleScan(code: string) {
    if (!tagSession || !authSession) return;
    try {
      const tag = await getOrCreateTagByCode(code);

      if (mode === 'out') {
        setPendingTagId(tag.id);
      } else {
        const completed = await completeAllocation(tagSession.id, tag.id, authSession.user.id);
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
    if (!tagSession || !authSession || !pendingTagId) return;
    try {
      await createAllocation(tagSession.id, pendingTagId, player.id, authSession.user.id);
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

- [ ] **Step 2: Add a `roster-row` className to each `PlayerPicker` list item, changing no text**

```tsx
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
          <li key={player.id} className="roster-row">
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

- [ ] **Step 3: Run both suites to confirm no regressions**

Run: `npx vitest run src/pages/ScanPage.test.tsx src/components/PlayerPicker.test.tsx`
Expected: PASS (all existing tests, unchanged — same button text, `aria-pressed`, `role="group"`/`role="status"` and player row text).

- [ ] **Step 4: Run the full suite**

Run: `npm run test`
Expected: all tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ScanPage.tsx src/components/PlayerPicker.tsx
git commit -m "style: restyle ScanPage and PlayerPicker with cards, toggle, and viewfinder"
```

---

### Task 5: Restyle RosterPage

**Files:**
- Modify: `src/pages/RosterPage.tsx`

**Interfaces:**
- Consumes: `.card`, `.roster-row` classes (Task 1). No prop/behavior changes. Converts the `<table>` to styled rows — safe because the existing test queries only by text/label, not table semantics.

- [ ] **Step 1: Replace the table with a styled row list**

```tsx
import { useEffect, useState } from 'react';
import { listActivePlayers, updateShirtNumber } from '../lib/api/players';
import type { Player } from '../lib/types';

export function RosterPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    listActivePlayers()
      .then((data) => {
        setPlayers(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Couldn't load the roster. Try reloading.");
        setLoading(false);
      });
  }, []);

  async function handleChange(playerId: string, value: string) {
    const shirtNumber = value === '' ? null : Number(value);
    const player = players.find((p) => p.id === playerId);
    const previousShirtNumber = player?.shirtNumber ?? null;

    setSaveError(null);
    setPlayers((current) =>
      current.map((p) => (p.id === playerId ? { ...p, shirtNumber } : p))
    );

    try {
      await updateShirtNumber(playerId, shirtNumber);
    } catch {
      setPlayers((current) =>
        current.map((p) => (p.id === playerId ? { ...p, shirtNumber: previousShirtNumber } : p))
      );
      setSaveError(`Couldn't save shirt number for ${player?.name ?? 'this player'}. Try again.`);
    }
  }

  if (loading) return <p>Loading roster...</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <main>
      <h1>Squad Roster</h1>
      {saveError && <p role="alert">{saveError}</p>}
      <div className="card">
        {players.map((player) => (
          <div key={player.id} className="roster-row">
            <span>{player.name}</span>
            <input
              type="number"
              aria-label={`Shirt number for ${player.name}`}
              value={player.shirtNumber ?? ''}
              onChange={(event) => handleChange(player.id, event.target.value)}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Run the RosterPage suite to confirm no regressions**

Run: `npx vitest run src/pages/RosterPage.test.tsx`
Expected: PASS (2 tests, unchanged — same player name text, same `aria-label`, same error alert).

- [ ] **Step 3: Run the full suite**

Run: `npm run test`
Expected: all tests passing.

- [ ] **Step 4: Commit**

```bash
git add src/pages/RosterPage.tsx
git commit -m "style: restyle RosterPage as a card with styled rows"
```

---

### Task 6: Restyle ReportPage and add weekly stat tiles

**Files:**
- Modify: `src/pages/ReportPage.tsx`
- Modify: `src/pages/ReportPage.test.tsx`

**Interfaces:**
- Consumes: `.card`, `.stat-row`, `.stat-tile`, `.stat-tile-num`, `.stat-tile-label`, `.anomaly-item`, `.action-btn` classes (Task 1). Stat tile numbers are computed inline from `allocations`, `mismatches`, `playersWithNoAllocations`, and `utilization` — all already present on the page (Task 7/`reportCalculations.ts` in the original plan) — no new `lib` function.

- [ ] **Step 1: Write the new failing test in `src/pages/ReportPage.test.tsx`**

Add this test to the existing `describe('ReportPage', ...)` block (the file's existing mocks — `player`/`tag`/`session`/`allocation` — already produce: 1 allocation, 0 anomalies since the mocked history allocation matches the week allocation's tag exactly, and 1 tag used):

```tsx
  it('shows stat tiles summarizing the week', async () => {
    render(<ReportPage />);
    await waitFor(() => expect(screen.getByText('Alex Jones')).toBeInTheDocument());

    expect(screen.getByTestId('stat-allocations')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-anomalies')).toHaveTextContent('0');
    expect(screen.getByTestId('stat-tags-used')).toHaveTextContent('1');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/ReportPage.test.tsx`
Expected: FAIL — no element with `data-testid="stat-allocations"` exists yet.

- [ ] **Step 3: Implement — add stat tiles and card wrappers to `src/pages/ReportPage.tsx`**

```tsx
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const weekStartDate = new Date(weekStart);
    const weekEnd = toIsoDate(addDays(weekStartDate, 6));
    const historyStart = toIsoDate(addDays(weekStartDate, -28));

    Promise.all([
      listActivePlayers(),
      listTags(),
      listSessionsInRange(weekStart, weekEnd),
      listSessionsInRange(historyStart, weekEnd),
    ])
      .then(async ([playerRows, tagRows, weekSessions, historySessions]) => {
        setPlayers(playerRows);
        setTags(tagRows);
        setSessions(weekSessions);

        const [weekAllocations, historyAllocationRows] = await Promise.all([
          listAllocationsForSessions(weekSessions.map((s) => s.id)),
          listAllocationsForSessions(historySessions.map((s) => s.id)),
        ]);

        setAllocations(weekAllocations);
        setHistoryAllocations(historyAllocationRows);
        setLoading(false);
      })
      .catch(() => {
        setError("Couldn't load the report. Try reloading.");
        setLoading(false);
      });
  }, [weekStart]);

  const sessionsById = Object.fromEntries(sessions.map((s) => [s.id, s]));
  const playersById = Object.fromEntries(players.map((p) => [p.id, p]));
  const tagsById = Object.fromEntries(tags.map((t) => [t.id, t]));

  const usualTagByPlayer = computeUsualTagPerPlayer(historyAllocations);
  const mismatches = findTagMismatches(allocations, usualTagByPlayer);
  const playersWithNoAllocations = findPlayersWithNoAllocations(players, allocations);
  const utilization = computeTagUtilization(tags, allocations, sessionsById, toIsoDate(addDays(new Date(weekStart), 6)));
  const tagsUsedCount = utilization.filter((row) => row.sessionsUsed > 0).length;

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

  if (loading) return <p>Loading report...</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <main>
      <h1>Weekly Report</h1>
      <label>
        Week starting
        <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
      </label>

      <div className="stat-row">
        <div className="stat-tile" data-testid="stat-allocations">
          <div className="stat-tile-num">{allocations.length}</div>
          <div className="stat-tile-label">Allocations</div>
        </div>
        <div className="stat-tile" data-testid="stat-anomalies">
          <div className="stat-tile-num">{mismatches.length + playersWithNoAllocations.length}</div>
          <div className="stat-tile-label">Anomalies</div>
        </div>
        <div className="stat-tile" data-testid="stat-tags-used">
          <div className="stat-tile-num">{tagsUsedCount}</div>
          <div className="stat-tile-label">Tags used</div>
        </div>
      </div>

      <div className="card">
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
      </div>

      <div className="card">
        <h2>Anomalies</h2>
        <h3>Unusual tag/player pairings</h3>
        <ul>
          {mismatches.map((mismatch, index) => (
            <li key={index} className="anomaly-item">
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
      </div>

      <div className="card">
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
      </div>

      <div className="card">
        <button type="button" className="action-btn" onClick={handleExportCsv}>Export CSV</button>
        <button type="button" className="action-btn accent" onClick={handleExportExcel}>Export Excel</button>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/ReportPage.test.tsx`
Expected: PASS (4 tests — the 3 existing plus the new stat-tile test).

- [ ] **Step 5: Run the full suite**

Run: `npm run test`
Expected: all tests passing (52 total).

- [ ] **Step 6: Verify the production build is clean**

Run: `npm run build`
Expected: builds successfully.

- [ ] **Step 7: Commit**

```bash
git add src/pages/ReportPage.tsx src/pages/ReportPage.test.tsx
git commit -m "style: restyle ReportPage with cards and add weekly stat tiles"
```

---

## Self-Review Notes

- **Spec coverage:** login removal (resolved without code, Task list doesn't touch auth), design tokens/crest (Task 1-2), AppShell + bottom nav (Task 2), every page restyle (Tasks 3-6), stat tiles (Task 6) — all covered.
- **Placeholder scan:** no TBD/TODO; every step has complete code.
- **Type consistency:** `AppShell({ children }: { children: ReactNode })` matches its usage in `App.tsx`; stat-tile `data-testid`s in Task 6's implementation match exactly what Task 6's test queries.
- **Hard constraint check:** re-read every modified file's step against the corresponding current file read at planning time — no accessible label, role, or text content differs from what's live today; only `className`s, wrapping elements, and (Task 6) new stat-tile markup were added.
