# Weekly Report Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the weekly report into something detailed enough to hand to peers: a per-player breakdown, a week-over-week comparison, a session-grouped allocation log, and a Print/Save-as-PDF path — all from data the page already fetches.

**Architecture:** Three new pure functions in `reportCalculations.ts` (unit-tested like the existing ones), three new small presentational components under `src/components/report/`, `ReportPage.tsx` wired as the orchestrator (fetch, compute, render), and a `@media print` stylesheet in `App.css` plus a `window.print()` button. No new dependencies, no new API calls — the existing 28-day history fetch already covers last week.

**Tech Stack:** React 18, TypeScript, Vitest + Testing Library (existing stack).

## Global Constraints

- No new npm dependencies (no PDF-generation library — browser print-to-PDF only).
- No new API/Supabase calls — all new data is derived client-side from what `ReportPage` already fetches.
- Comparison is against last week only (not a multi-week trend).
- Player breakdown includes every active roster player, including those with zero allocations this week.
- Keep files under 500 lines; split into focused components rather than growing `ReportPage.tsx` further.

---

### Task 1: Report calculation functions

**Files:**
- Modify: `src/lib/reportCalculations.ts`
- Modify: `src/lib/reportCalculations.test.ts`

**Interfaces:**
- Consumes: existing `Allocation`, `Player`, `Tag`, `TagSession` types from `src/lib/types.ts`; the existing `TagMismatch` interface already exported from this file.
- Produces (used by Task 5):
  - `export interface PlayerBreakdownEntry { date: string; sessionType: SessionType; tagCode: string; scannedOutAt: string; scannedInAt: string | null }`
  - `export interface PlayerBreakdown { playerId: string; name: string; shirtNumber: number | null; sessionCount: number; hasAnomaly: boolean; entries: PlayerBreakdownEntry[] }`
  - `export function buildPlayerBreakdown(players: Player[], weekAllocations: Allocation[], sessionsById: Record<string, TagSession>, tagsById: Record<string, Tag>, mismatches: TagMismatch[]): PlayerBreakdown[]`
  - `export interface SessionLogRow { tagCode: string; playerName: string; shirtNumber: number | null; scannedOutAt: string; scannedInAt: string | null }`
  - `export interface SessionGroup { sessionId: string; date: string; sessionType: SessionType; rows: SessionLogRow[] }`
  - `export function groupAllocationsBySession(allocations: Allocation[], sessionsById: Record<string, TagSession>, playersById: Record<string, Player>, tagsById: Record<string, Tag>): SessionGroup[]`
  - `export interface WeekSummary { allocationsCount: number; anomaliesCount: number; tagsUsedCount: number }`
  - `export interface WeekOverWeekDelta extends WeekSummary { deltaAllocations: number; deltaAnomalies: number; deltaTagsUsed: number }`
  - `export function weekOverWeekDelta(current: WeekSummary, previous: WeekSummary): WeekOverWeekDelta`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/reportCalculations.test.ts` (add these imports to the existing top-of-file import statement — change it to):

```ts
import {
  computeUsualTagPerPlayer,
  findTagMismatches,
  findPlayersWithNoAllocations,
  computeTagUtilization,
  buildPlayerBreakdown,
  groupAllocationsBySession,
  weekOverWeekDelta,
} from './reportCalculations';
```

Then append these `describe` blocks at the end of the file:

```ts
describe('buildPlayerBreakdown', () => {
  it('includes every player, even those with zero allocations', () => {
    const players: Player[] = [
      { id: 'p1', name: 'Alex', shirtNumber: 7 },
      { id: 'p2', name: 'Sam', shirtNumber: null },
    ];
    const sessionsById: Record<string, TagSession> = {
      s1: { id: 's1', sessionDate: '2026-08-17', sessionType: 'training', notes: null, createdBy: 'staff1' },
    };
    const tagsById = { t1: { id: 't1', tagCode: 'A', label: null, status: 'active' as const } };
    const weekAllocations = [makeAllocation({ id: 'a1', playerId: 'p1', sessionId: 's1', tagId: 't1' })];

    const result = buildPlayerBreakdown(players, weekAllocations, sessionsById, tagsById, []);

    expect(result).toEqual([
      {
        playerId: 'p1',
        name: 'Alex',
        shirtNumber: 7,
        sessionCount: 1,
        hasAnomaly: false,
        entries: [
          {
            date: '2026-08-17',
            sessionType: 'training',
            tagCode: 'A',
            scannedOutAt: '2026-08-17T09:00:00Z',
            scannedInAt: null,
          },
        ],
      },
      { playerId: 'p2', name: 'Sam', shirtNumber: null, sessionCount: 0, hasAnomaly: false, entries: [] },
    ]);
  });

  it('flags a player as hasAnomaly when one of their allocations is a mismatch', () => {
    const players: Player[] = [{ id: 'p1', name: 'Alex', shirtNumber: 7 }];
    const sessionsById: Record<string, TagSession> = {
      s1: { id: 's1', sessionDate: '2026-08-17', sessionType: 'training', notes: null, createdBy: 'staff1' },
    };
    const tagsById = { t2: { id: 't2', tagCode: 'B', label: null, status: 'active' as const } };
    const weekAllocations = [makeAllocation({ id: 'a1', playerId: 'p1', sessionId: 's1', tagId: 't2' })];
    const mismatches = [{ playerId: 'p1', sessionId: 's1', tagId: 't2', usualTagId: 't1' }];

    const result = buildPlayerBreakdown(players, weekAllocations, sessionsById, tagsById, mismatches);

    expect(result[0].hasAnomaly).toBe(true);
  });
});

describe('groupAllocationsBySession', () => {
  it('buckets allocations by session and sorts groups by date', () => {
    const sessionsById: Record<string, TagSession> = {
      s1: { id: 's1', sessionDate: '2026-08-19', sessionType: 'match', notes: null, createdBy: 'staff1' },
      s2: { id: 's2', sessionDate: '2026-08-17', sessionType: 'training', notes: null, createdBy: 'staff1' },
    };
    const playersById = { p1: { id: 'p1', name: 'Alex', shirtNumber: 7 } };
    const tagsById = { t1: { id: 't1', tagCode: 'A', label: null, status: 'active' as const } };
    const allocations = [
      makeAllocation({ id: 'a1', sessionId: 's1', playerId: 'p1', tagId: 't1' }),
      makeAllocation({ id: 'a2', sessionId: 's2', playerId: 'p1', tagId: 't1' }),
    ];

    const result = groupAllocationsBySession(allocations, sessionsById, playersById, tagsById);

    expect(result.map((g) => g.sessionId)).toEqual(['s2', 's1']);
    expect(result[0].rows).toEqual([
      { tagCode: 'A', playerName: 'Alex', shirtNumber: 7, scannedOutAt: '2026-08-17T09:00:00Z', scannedInAt: null },
    ]);
  });
});

describe('weekOverWeekDelta', () => {
  it('computes deltas between the current and previous week summaries', () => {
    const result = weekOverWeekDelta(
      { allocationsCount: 5, anomaliesCount: 2, tagsUsedCount: 3 },
      { allocationsCount: 3, anomaliesCount: 3, tagsUsedCount: 3 }
    );

    expect(result).toEqual({
      allocationsCount: 5,
      anomaliesCount: 2,
      tagsUsedCount: 3,
      deltaAllocations: 2,
      deltaAnomalies: -1,
      deltaTagsUsed: 0,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- reportCalculations`
Expected: FAIL — `buildPlayerBreakdown`, `groupAllocationsBySession`, `weekOverWeekDelta` are not exported from `./reportCalculations`.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/reportCalculations.ts` (existing content, including its `import type { Allocation, Tag, Player, TagSession } from './types';` at the top, is unchanged — change only that import line to also bring in `SessionType`):

```ts
import type { Allocation, Tag, Player, TagSession, SessionType } from './types';
```

Then append at the end of the file:

```ts
export interface PlayerBreakdownEntry {
  date: string;
  sessionType: SessionType;
  tagCode: string;
  scannedOutAt: string;
  scannedInAt: string | null;
}

export interface PlayerBreakdown {
  playerId: string;
  name: string;
  shirtNumber: number | null;
  sessionCount: number;
  hasAnomaly: boolean;
  entries: PlayerBreakdownEntry[];
}

export function buildPlayerBreakdown(
  players: Player[],
  weekAllocations: Allocation[],
  sessionsById: Record<string, TagSession>,
  tagsById: Record<string, Tag>,
  mismatches: TagMismatch[]
): PlayerBreakdown[] {
  const mismatchedKeys = new Set(mismatches.map((m) => `${m.playerId}:${m.sessionId}:${m.tagId}`));

  return players.map((player) => {
    const playerAllocations = weekAllocations.filter((a) => a.playerId === player.id);
    const entries: PlayerBreakdownEntry[] = playerAllocations
      .map((allocation) => {
        const session = sessionsById[allocation.sessionId];
        return {
          date: session?.sessionDate ?? '',
          sessionType: session?.sessionType ?? ('other' as SessionType),
          tagCode: tagsById[allocation.tagId]?.tagCode ?? '',
          scannedOutAt: allocation.scannedOutAt,
          scannedInAt: allocation.scannedInAt,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    const hasAnomaly = playerAllocations.some((a) =>
      mismatchedKeys.has(`${a.playerId}:${a.sessionId}:${a.tagId}`)
    );

    return {
      playerId: player.id,
      name: player.name,
      shirtNumber: player.shirtNumber,
      sessionCount: playerAllocations.length,
      hasAnomaly,
      entries,
    };
  });
}

export interface SessionLogRow {
  tagCode: string;
  playerName: string;
  shirtNumber: number | null;
  scannedOutAt: string;
  scannedInAt: string | null;
}

export interface SessionGroup {
  sessionId: string;
  date: string;
  sessionType: SessionType;
  rows: SessionLogRow[];
}

export function groupAllocationsBySession(
  allocations: Allocation[],
  sessionsById: Record<string, TagSession>,
  playersById: Record<string, Player>,
  tagsById: Record<string, Tag>
): SessionGroup[] {
  const groupsBySessionId: Record<string, SessionGroup> = {};

  for (const allocation of allocations) {
    const session = sessionsById[allocation.sessionId];
    if (!session) continue;

    const group = (groupsBySessionId[session.id] ??= {
      sessionId: session.id,
      date: session.sessionDate,
      sessionType: session.sessionType,
      rows: [],
    });

    group.rows.push({
      tagCode: tagsById[allocation.tagId]?.tagCode ?? '',
      playerName: playersById[allocation.playerId]?.name ?? '',
      shirtNumber: playersById[allocation.playerId]?.shirtNumber ?? null,
      scannedOutAt: allocation.scannedOutAt,
      scannedInAt: allocation.scannedInAt,
    });
  }

  return Object.values(groupsBySessionId).sort((a, b) => a.date.localeCompare(b.date));
}

export interface WeekSummary {
  allocationsCount: number;
  anomaliesCount: number;
  tagsUsedCount: number;
}

export interface WeekOverWeekDelta extends WeekSummary {
  deltaAllocations: number;
  deltaAnomalies: number;
  deltaTagsUsed: number;
}

export function weekOverWeekDelta(current: WeekSummary, previous: WeekSummary): WeekOverWeekDelta {
  return {
    allocationsCount: current.allocationsCount,
    anomaliesCount: current.anomaliesCount,
    tagsUsedCount: current.tagsUsedCount,
    deltaAllocations: current.allocationsCount - previous.allocationsCount,
    deltaAnomalies: current.anomaliesCount - previous.anomaliesCount,
    deltaTagsUsed: current.tagsUsedCount - previous.tagsUsedCount,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- reportCalculations`
Expected: PASS (10 tests: 4 existing + 6 new)

- [ ] **Step 5: Commit**

```bash
git add src/lib/reportCalculations.ts src/lib/reportCalculations.test.ts
git commit -m "feat: add player breakdown, session grouping, and week delta calculations"
```

---

### Task 2: `WeekComparisonStats` component

**Files:**
- Create: `src/components/report/WeekComparisonStats.tsx`
- Create: `src/components/report/WeekComparisonStats.test.tsx`
- Modify: `src/App.css`

**Interfaces:**
- Consumes: `WeekOverWeekDelta` from `../../lib/reportCalculations` (Task 1).
- Produces: `export function WeekComparisonStats({ delta }: { delta: WeekOverWeekDelta }): JSX.Element` — renders three `.stat-tile` elements with `data-testid="stat-allocations"` / `"stat-anomalies"` / `"stat-tags-used"` (same test ids `ReportPage.test.tsx` already asserts on).

- [ ] **Step 1: Write the failing test**

Create `src/components/report/WeekComparisonStats.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { WeekComparisonStats } from './WeekComparisonStats';

describe('WeekComparisonStats', () => {
  it('renders each stat with its value and a delta label vs last week', () => {
    render(
      <WeekComparisonStats
        delta={{
          allocationsCount: 5,
          anomaliesCount: 1,
          tagsUsedCount: 2,
          deltaAllocations: 2,
          deltaAnomalies: -1,
          deltaTagsUsed: 0,
        }}
      />
    );

    expect(screen.getByTestId('stat-allocations')).toHaveTextContent('5');
    expect(screen.getByTestId('stat-allocations')).toHaveTextContent('+2 vs last week');
    expect(screen.getByTestId('stat-anomalies')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-anomalies')).toHaveTextContent('-1 vs last week');
    expect(screen.getByTestId('stat-tags-used')).toHaveTextContent('2');
    expect(screen.getByTestId('stat-tags-used')).toHaveTextContent('No change vs last week');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- WeekComparisonStats`
Expected: FAIL — `Failed to resolve import "./WeekComparisonStats"`.

- [ ] **Step 3: Write the implementation**

Create `src/components/report/WeekComparisonStats.tsx`:

```tsx
import type { WeekOverWeekDelta } from '../../lib/reportCalculations';

interface WeekComparisonStatsProps {
  delta: WeekOverWeekDelta;
}

function deltaLabel(delta: number): string {
  if (delta > 0) return `+${delta} vs last week`;
  if (delta < 0) return `${delta} vs last week`;
  return 'No change vs last week';
}

export function WeekComparisonStats({ delta }: WeekComparisonStatsProps) {
  return (
    <div className="stat-row">
      <div className="stat-tile" data-testid="stat-allocations">
        <div className="stat-tile-num">{delta.allocationsCount}</div>
        <div className="stat-tile-label">Allocations</div>
        <div className="stat-tile-delta">{deltaLabel(delta.deltaAllocations)}</div>
      </div>
      <div className="stat-tile" data-testid="stat-anomalies">
        <div className="stat-tile-num">{delta.anomaliesCount}</div>
        <div className="stat-tile-label">Anomalies</div>
        <div className="stat-tile-delta">{deltaLabel(delta.deltaAnomalies)}</div>
      </div>
      <div className="stat-tile" data-testid="stat-tags-used">
        <div className="stat-tile-num">{delta.tagsUsedCount}</div>
        <div className="stat-tile-label">Tags used</div>
        <div className="stat-tile-delta">{deltaLabel(delta.deltaTagsUsed)}</div>
      </div>
    </div>
  );
}
```

Append to `src/App.css` (after the `.stat-tile-label` rule):

```css

.stat-tile-delta {
  font-size: 0.65rem;
  color: var(--color-text-muted);
  margin-top: var(--space-1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- WeekComparisonStats`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/components/report/WeekComparisonStats.tsx src/components/report/WeekComparisonStats.test.tsx src/App.css
git commit -m "feat: add WeekComparisonStats component with week-over-week deltas"
```

---

### Task 3: `SessionLogSection` component

**Files:**
- Create: `src/components/report/SessionLogSection.tsx`
- Create: `src/components/report/SessionLogSection.test.tsx`
- Modify: `src/App.css`

**Interfaces:**
- Consumes: `SessionGroup` from `../../lib/reportCalculations` (Task 1).
- Produces: `export function SessionLogSection({ groups }: { groups: SessionGroup[] }): JSX.Element` — renders a `.card` with heading "Allocation Log", one subheading + table per session group (or "No allocations this week." when `groups` is empty).

- [ ] **Step 1: Write the failing test**

Create `src/components/report/SessionLogSection.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { SessionLogSection } from './SessionLogSection';

describe('SessionLogSection', () => {
  it('renders a subheading and table rows per session group', () => {
    render(
      <SessionLogSection
        groups={[
          {
            sessionId: 's1',
            date: '2026-08-17',
            sessionType: 'training',
            rows: [
              {
                tagCode: 'TAG-001',
                playerName: 'Alex Jones',
                shirtNumber: 7,
                scannedOutAt: '2026-08-17T09:00:00Z',
                scannedInAt: null,
              },
            ],
          },
        ]}
      />
    );

    expect(screen.getByText('2026-08-17 — training')).toBeInTheDocument();
    expect(screen.getByText('TAG-001')).toBeInTheDocument();
    expect(screen.getByText('Alex Jones')).toBeInTheDocument();
  });

  it('shows a message when there are no allocations this week', () => {
    render(<SessionLogSection groups={[]} />);
    expect(screen.getByText('No allocations this week.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- SessionLogSection`
Expected: FAIL — `Failed to resolve import "./SessionLogSection"`.

- [ ] **Step 3: Write the implementation**

Create `src/components/report/SessionLogSection.tsx`:

```tsx
import type { SessionGroup } from '../../lib/reportCalculations';

interface SessionLogSectionProps {
  groups: SessionGroup[];
}

export function SessionLogSection({ groups }: SessionLogSectionProps) {
  return (
    <div className="card">
      <h2>Allocation Log</h2>
      {groups.length === 0 && <p>No allocations this week.</p>}
      {groups.map((group) => (
        <div key={group.sessionId} className="session-log-group">
          <h3>{group.date} — {group.sessionType}</h3>
          <table>
            <thead>
              <tr><th>Tag</th><th>Player</th><th>Shirt #</th><th>Out</th><th>In</th></tr>
            </thead>
            <tbody>
              {group.rows.map((row, index) => (
                <tr key={index}>
                  <td>{row.tagCode}</td>
                  <td>{row.playerName}</td>
                  <td>{row.shirtNumber ?? ''}</td>
                  <td>{row.scannedOutAt}</td>
                  <td>{row.scannedInAt ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
```

Append to `src/App.css` (after the `.stat-tile-delta` rule added in Task 2):

```css

/* ---- Session log groups ---- */
.session-log-group {
  margin-bottom: var(--space-4);
}

.session-log-group:last-child {
  margin-bottom: 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- SessionLogSection`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/report/SessionLogSection.tsx src/components/report/SessionLogSection.test.tsx src/App.css
git commit -m "feat: add SessionLogSection component grouping the allocation log by session"
```

---

### Task 4: `PlayerBreakdownSection` component

**Files:**
- Create: `src/components/report/PlayerBreakdownSection.tsx`
- Create: `src/components/report/PlayerBreakdownSection.test.tsx`
- Modify: `src/App.css`

**Interfaces:**
- Consumes: `PlayerBreakdown` from `../../lib/reportCalculations` (Task 1).
- Produces: `export function PlayerBreakdownSection({ breakdown }: { breakdown: PlayerBreakdown[] }): JSX.Element` — renders a `.card` with heading "Player Breakdown", one row per player (name + shirt number, an "Anomaly" flag when `hasAnomaly`, and either their session entries or "No sessions this week").

- [ ] **Step 1: Write the failing test**

Create `src/components/report/PlayerBreakdownSection.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { PlayerBreakdownSection } from './PlayerBreakdownSection';

describe('PlayerBreakdownSection', () => {
  it('renders a row per player with their entries', () => {
    render(
      <PlayerBreakdownSection
        breakdown={[
          {
            playerId: 'p1',
            name: 'Alex Jones',
            shirtNumber: 7,
            sessionCount: 1,
            hasAnomaly: false,
            entries: [
              {
                date: '2026-08-17',
                sessionType: 'training',
                tagCode: 'TAG-001',
                scannedOutAt: '2026-08-17T09:00:00Z',
                scannedInAt: null,
              },
            ],
          },
          {
            playerId: 'p2',
            name: 'Sam Lee',
            shirtNumber: null,
            sessionCount: 0,
            hasAnomaly: false,
            entries: [],
          },
        ]}
      />
    );

    expect(screen.getByText('Alex Jones (#7)')).toBeInTheDocument();
    expect(screen.getByText(/2026-08-17 — training — tag TAG-001/)).toBeInTheDocument();
    expect(screen.getByText('Sam Lee')).toBeInTheDocument();
    expect(screen.getByText('No sessions this week')).toBeInTheDocument();
  });

  it('shows an anomaly flag when hasAnomaly is true', () => {
    render(
      <PlayerBreakdownSection
        breakdown={[
          { playerId: 'p1', name: 'Alex Jones', shirtNumber: 7, sessionCount: 1, hasAnomaly: true, entries: [] },
        ]}
      />
    );

    expect(screen.getByText('Anomaly')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- PlayerBreakdownSection`
Expected: FAIL — `Failed to resolve import "./PlayerBreakdownSection"`.

- [ ] **Step 3: Write the implementation**

Create `src/components/report/PlayerBreakdownSection.tsx`:

```tsx
import type { PlayerBreakdown } from '../../lib/reportCalculations';

interface PlayerBreakdownSectionProps {
  breakdown: PlayerBreakdown[];
}

export function PlayerBreakdownSection({ breakdown }: PlayerBreakdownSectionProps) {
  return (
    <div className="card">
      <h2>Player Breakdown</h2>
      {breakdown.map((player) => (
        <div
          key={player.playerId}
          className={`player-breakdown-row${player.sessionCount === 0 ? ' player-breakdown-row-empty' : ''}`}
        >
          <div className="player-breakdown-header">
            <span className="player-breakdown-name">
              {player.name}
              {player.shirtNumber !== null ? ` (#${player.shirtNumber})` : ''}
            </span>
            {player.hasAnomaly && <span className="player-breakdown-anomaly">Anomaly</span>}
          </div>
          {player.sessionCount === 0 ? (
            <p className="player-breakdown-empty-text">No sessions this week</p>
          ) : (
            <ul className="player-breakdown-entries">
              {player.entries.map((entry, index) => (
                <li key={index}>
                  {entry.date} — {entry.sessionType} — tag {entry.tagCode}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
```

Append to `src/App.css` (after the `.session-log-group:last-child` rule added in Task 3):

```css

/* ---- Player breakdown ---- */
.player-breakdown-row {
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-border);
}

.player-breakdown-row:last-child {
  border-bottom: none;
}

.player-breakdown-row-empty {
  opacity: 0.6;
}

.player-breakdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
}

.player-breakdown-name {
  font-weight: 700;
}

.player-breakdown-anomaly {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-primary);
  background: var(--color-warning-bg);
  border: 1px solid var(--color-warning-border);
  border-radius: var(--radius-sm);
  padding: 2px var(--space-2);
}

.player-breakdown-empty-text {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin: var(--space-1) 0 0;
}

.player-breakdown-entries {
  margin: var(--space-1) 0 0;
  padding-left: var(--space-4);
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- PlayerBreakdownSection`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/report/PlayerBreakdownSection.tsx src/components/report/PlayerBreakdownSection.test.tsx src/App.css
git commit -m "feat: add PlayerBreakdownSection component"
```

---

### Task 5: Wire it all into `ReportPage`

**Files:**
- Modify: `src/pages/ReportPage.tsx`
- Modify: `src/pages/ReportPage.test.tsx`

**Interfaces:**
- Consumes: `buildPlayerBreakdown`, `groupAllocationsBySession`, `weekOverWeekDelta` (Task 1); `WeekComparisonStats` (Task 2), `SessionLogSection` (Task 3), `PlayerBreakdownSection` (Task 4).
- Produces: `ReportPage` renders the three new sections; existing CSV/Excel export behavior and the `stat-allocations`/`stat-anomalies`/`stat-tags-used` test ids are unchanged from the outside.

- [ ] **Step 1: Write the failing tests**

Append these two tests to the end of the `describe('ReportPage', ...)` block in `src/pages/ReportPage.test.tsx` (before its closing `});`):

```tsx
  it('shows the player breakdown and session-grouped log', async () => {
    render(<ReportPage />);
    await waitFor(() => expect(screen.getAllByText('Alex Jones')[0]).toBeInTheDocument());

    expect(screen.getByText('Player Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Allocation Log')).toBeInTheDocument();
    expect(screen.getByText('2026-08-17 — training')).toBeInTheDocument();
  });

  it('calls window.print when the Print / Save as PDF button is clicked', async () => {
    const printMock = vi.fn();
    window.print = printMock;

    render(<ReportPage />);
    await waitFor(() => expect(screen.getAllByText('Alex Jones')[0]).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Print / Save as PDF' }));

    expect(printMock).toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/pages/ReportPage.test.tsx`
Expected: FAIL — "Player Breakdown" / "Allocation Log" text not found (current page still renders the old flat table and stat-row markup); "Print / Save as PDF" button not found.

- [ ] **Step 3: Write the implementation**

Replace `src/pages/ReportPage.tsx` (full file):

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
  buildPlayerBreakdown,
  groupAllocationsBySession,
  weekOverWeekDelta,
} from '../lib/reportCalculations';
import { buildCsv } from '../lib/csvExport';
import { downloadWorkbook } from '../lib/excelExport';
import { WeekComparisonStats } from '../components/report/WeekComparisonStats';
import { SessionLogSection } from '../components/report/SessionLogSection';
import { PlayerBreakdownSection } from '../components/report/PlayerBreakdownSection';
import crest from '../assets/tranmere-crest.webp';
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
  const [historySessions, setHistorySessions] = useState<TagSession[]>([]);
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
      .then(async ([playerRows, tagRows, weekSessions, historySessionRows]) => {
        setPlayers(playerRows);
        setTags(tagRows);
        setSessions(weekSessions);
        setHistorySessions(historySessionRows);

        const [weekAllocations, historyAllocationRows] = await Promise.all([
          listAllocationsForSessions(weekSessions.map((s) => s.id)),
          listAllocationsForSessions(historySessionRows.map((s) => s.id)),
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

  const weekEndIso = toIsoDate(addDays(new Date(weekStart), 6));
  const prevWeekStart = toIsoDate(addDays(new Date(weekStart), -7));
  const prevWeekEnd = toIsoDate(addDays(new Date(weekStart), -1));

  const sessionsById = Object.fromEntries(sessions.map((s) => [s.id, s]));
  const playersById = Object.fromEntries(players.map((p) => [p.id, p]));
  const tagsById = Object.fromEntries(tags.map((t) => [t.id, t]));

  const usualTagByPlayer = computeUsualTagPerPlayer(historyAllocations);
  const mismatches = findTagMismatches(allocations, usualTagByPlayer);
  const playersWithNoAllocations = findPlayersWithNoAllocations(players, allocations);
  const utilization = computeTagUtilization(tags, allocations, sessionsById, weekEndIso);
  const tagsUsedCount = utilization.filter((row) => row.sessionsUsed > 0).length;

  const prevWeekSessions = historySessions.filter(
    (s) => s.sessionDate >= prevWeekStart && s.sessionDate <= prevWeekEnd
  );
  const prevWeekSessionIds = new Set(prevWeekSessions.map((s) => s.id));
  const prevWeekAllocations = historyAllocations.filter((a) => prevWeekSessionIds.has(a.sessionId));
  const prevSessionsById = Object.fromEntries(prevWeekSessions.map((s) => [s.id, s]));
  const prevMismatches = findTagMismatches(prevWeekAllocations, usualTagByPlayer);
  const prevPlayersWithNoAllocations = findPlayersWithNoAllocations(players, prevWeekAllocations);
  const prevUtilization = computeTagUtilization(tags, prevWeekAllocations, prevSessionsById, prevWeekEnd);
  const prevTagsUsedCount = prevUtilization.filter((row) => row.sessionsUsed > 0).length;

  const delta = weekOverWeekDelta(
    {
      allocationsCount: allocations.length,
      anomaliesCount: mismatches.length + playersWithNoAllocations.length,
      tagsUsedCount,
    },
    {
      allocationsCount: prevWeekAllocations.length,
      anomaliesCount: prevMismatches.length + prevPlayersWithNoAllocations.length,
      tagsUsedCount: prevTagsUsedCount,
    }
  );

  const playerBreakdown = buildPlayerBreakdown(players, allocations, sessionsById, tagsById, mismatches);
  const sessionGroups = groupAllocationsBySession(allocations, sessionsById, playersById, tagsById);

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

  if (loading) return <main><p>Loading report...</p></main>;
  if (error) return <main><p role="alert">{error}</p></main>;

  return (
    <main>
      <div className="print-only print-header">
        <img src={crest} alt="Tranmere Rovers crest" className="print-header-crest" />
        <div>
          <h1>Weekly Report</h1>
          <p>{weekStart} – {weekEndIso}</p>
        </div>
      </div>

      <h1 className="no-print">Weekly Report</h1>
      <label className="no-print">
        Week starting
        <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
      </label>

      <WeekComparisonStats delta={delta} />

      <PlayerBreakdownSection breakdown={playerBreakdown} />

      <SessionLogSection groups={sessionGroups} />

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

      <div className="card no-print">
        <button type="button" className="action-btn" onClick={handleExportCsv}>Export CSV</button>
        <button type="button" className="action-btn accent" onClick={handleExportExcel}>Export Excel</button>
        <button type="button" className="action-btn" onClick={() => window.print()}>Print / Save as PDF</button>
      </div>
    </main>
  );
}
```

Note: `.print-only` and `.no-print` have no CSS rules yet at this point in the plan — that's Task 6. Until Task 6 lands, these classes are inert (no visual effect), which is fine since this task is verified by Testing Library, not visual rendering.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/pages/ReportPage.test.tsx`
Expected: PASS (6 tests: 4 existing + 2 new)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all test files PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ReportPage.tsx src/pages/ReportPage.test.tsx
git commit -m "feat: wire player breakdown, session log, and print button into ReportPage"
```

---

### Task 6: Print stylesheet

**Files:**
- Modify: `src/App.css`

**Interfaces:**
- Consumes: the `.no-print` / `.print-only` classes already applied in `ReportPage.tsx` (Task 5) and the existing `.app-header` / `.bottom-nav` classes in `AppShell.tsx` (unmodified).
- Produces: printing the Report page hides app chrome and shows a branded print header; no other page's on-screen appearance changes (the `@media print` block only affects what's visible when printing, and `.print-only`'s base `display: none` only affects the print header, which doesn't exist outside `ReportPage`).

- [ ] **Step 1: Append the print rules**

There is no meaningful "failing test" for `@media print` CSS — Vitest's jsdom environment does not evaluate print media queries or external stylesheets, so this is verified visually (Step 2) rather than by an automated test, matching how the rest of `App.css`'s visual rules are untested. Append to the end of `src/App.css`:

```css

/* ---- Print header (report only) ---- */
.print-only {
  display: none;
}

.print-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.print-header-crest {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

/* ---- Print stylesheet ---- */
@media print {
  .app-header,
  .bottom-nav,
  .no-print {
    display: none !important;
  }

  .print-only {
    display: flex;
  }

  main {
    max-width: none;
    padding: 0;
    padding-bottom: 0;
  }

  .card {
    box-shadow: none;
    border-radius: 0;
    padding: 0;
    margin-bottom: var(--space-4);
  }

  thead {
    display: table-header-group;
  }

  tr {
    break-inside: avoid;
  }
}
```

- [ ] **Step 2: Verify visually**

Run: `npm run dev`, open the Report page in a browser, open the browser's print preview (Ctrl+P / Cmd+P). Confirm:
- The app header and bottom nav are gone.
- A crest + "Weekly Report" + date range header appears at the top.
- The week-picker input, and the Export/Print buttons, are gone.
- Tables don't split a row across a page break, and column headers repeat if a table spans multiple pages.

Close print preview without printing.

- [ ] **Step 3: Run the full test suite to confirm the CSS-only change broke nothing**

Run: `npm test`
Expected: all test files PASS (CSS has no effect on jsdom-rendered test output).

- [ ] **Step 4: Run the build**

Run: `npm run build`
Expected: builds cleanly.

- [ ] **Step 5: Commit**

```bash
git add src/App.css
git commit -m "feat: add print stylesheet for the weekly report"
```
