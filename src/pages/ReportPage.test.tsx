import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { player, tag, tag2, session, allocation, allocation2, allocation3 } = vi.hoisted(() => ({
  player: { id: 'p1', name: 'Alex Jones', shirtNumber: 7 },
  tag: { id: 't1', tagCode: 'TAG-001', label: null, status: 'active' as const },
  tag2: { id: 't2', tagCode: 'TAG-002', label: null, status: 'active' as const },
  session: {
    id: 's1',
    sessionDate: '2026-08-17',
    sessionType: 'training' as const,
    notes: null,
    createdBy: 'staff1',
  },
  allocation: {
    id: 'a1',
    sessionId: 's1',
    tagId: 't1',
    playerId: 'p1',
    scannedOutBy: 'staff1',
    scannedOutAt: '2026-08-17T09:00:00Z',
    scannedInBy: null,
    scannedInAt: null,
  },
  // Same player, different tag than usual (t1) -> a mismatch anomaly.
  allocation2: {
    id: 'a2',
    sessionId: 's1',
    tagId: 't2',
    playerId: 'p1',
    scannedOutBy: 'staff1',
    scannedOutAt: '2026-08-17T09:05:00Z',
    scannedInBy: null,
    scannedInAt: null,
  },
  // Second use of the usual tag (t1), so t1 is the clear "usual" tag (count 2 vs t2's count 1).
  allocation3: {
    id: 'a3',
    sessionId: 's1',
    tagId: 't1',
    playerId: 'p1',
    scannedOutBy: 'staff1',
    scannedOutAt: '2026-08-17T09:10:00Z',
    scannedInBy: null,
    scannedInAt: null,
  },
}));

const listActivePlayersMock = vi.hoisted(() => vi.fn().mockResolvedValue([player]));
const listSessionsInRangeMock = vi.hoisted(() => vi.fn());
const listAllocationsForSessionsMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/api/players', () => ({ listActivePlayers: listActivePlayersMock }));
vi.mock('../lib/api/tags', () => ({ listTags: vi.fn().mockResolvedValue([tag, tag2]) }));
vi.mock('../lib/api/sessions', () => ({ listSessionsInRange: listSessionsInRangeMock }));
vi.mock('../lib/api/allocations', () => ({
  listAllocationsForSessions: listAllocationsForSessionsMock,
}));

const downloadWorkbookMock = vi.hoisted(() => vi.fn());
vi.mock('../lib/excelExport', () => ({ downloadWorkbook: downloadWorkbookMock }));

import { ReportPage } from './ReportPage';

describe('ReportPage', () => {
  beforeEach(() => {
    // Freeze "today" so weekStart (and therefore the previous-week window) is deterministic
    // regardless of when the suite actually runs — several tests below rely on a session
    // falling inside or outside a specific previous-week date range.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-08-21'));

    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
    URL.revokeObjectURL = vi.fn();
    listActivePlayersMock.mockClear();
    listActivePlayersMock.mockResolvedValue([player]);
    listSessionsInRangeMock.mockReset();
    listSessionsInRangeMock.mockResolvedValue([session]);
    listAllocationsForSessionsMock.mockReset();
    listAllocationsForSessionsMock.mockResolvedValue([allocation, allocation2, allocation3]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a loading indicator, then the report once data resolves', async () => {
    render(<ReportPage />);

    expect(screen.getByText('Loading report...')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Alex Jones')[0]).toBeInTheDocument());
    expect(screen.queryByText('Loading report...')).not.toBeInTheDocument();
  });

  it('shows an error message instead of empty tables when the report fails to load', async () => {
    listActivePlayersMock.mockRejectedValueOnce(new Error('network error'));

    render(<ReportPage />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load the report. Try reloading.")
    );
    expect(screen.queryByText('Loading report...')).not.toBeInTheDocument();
  });

  it('renders the allocation log and player row, and triggers an Excel export', async () => {
    render(<ReportPage />);

    await waitFor(() => expect(screen.getAllByText('Alex Jones')[0]).toBeInTheDocument());
    expect(screen.getAllByText('TAG-001').length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: 'Export Excel' }));

    expect(downloadWorkbookMock).toHaveBeenCalledWith(
      expect.stringContaining('.xlsx'),
      expect.arrayContaining(['Date', 'Session Type', 'Tag', 'Player', 'Shirt #', 'Scanned Out', 'Scanned In']),
      expect.arrayContaining([expect.arrayContaining(['2026-08-17', 'training', 'TAG-001', 'Alex Jones', 7])])
    );
  });

  it('shows stat tiles summarizing the week', async () => {
    render(<ReportPage />);
    await waitFor(() => expect(screen.getAllByText('Alex Jones')[0]).toBeInTheDocument());

    // Three allocations total (allocation, allocation2, allocation3).
    expect(
      within(screen.getByTestId('stat-allocations')).getByText('3', { selector: '.stat-tile-num' })
    ).toBeInTheDocument();
    // Alex's usual tag is t1 (used twice, vs t2 used once), so allocation2 (t2)
    // is a single mismatch anomaly; no players are missing allocations.
    expect(
      within(screen.getByTestId('stat-anomalies')).getByText('1', { selector: '.stat-tile-num' })
    ).toBeInTheDocument();
    // Two distinct tags (t1 and t2) were used this week.
    expect(
      within(screen.getByTestId('stat-tags-used')).getByText('2', { selector: '.stat-tile-num' })
    ).toBeInTheDocument();
  });

  it('shows "No data for last week" instead of a misleading delta when the previous week has no sessions', async () => {
    // With "today" frozen at 2026-08-21, weekStart is Monday 2026-08-17 and the previous
    // week is 2026-08-10..2026-08-16. The mocked history call returns the same single
    // session used for the current week (dated 2026-08-17), which falls outside that
    // previous-week range — i.e. an empty previous week, same as pre-season or a break.
    // Anomalies must read as "not comparable", not as "every current-week player is an
    // improvement over the whole (zero-data) roster".
    render(<ReportPage />);
    await waitFor(() => expect(screen.getAllByText('Alex Jones')[0]).toBeInTheDocument());

    expect(screen.getByTestId('stat-anomalies')).toHaveTextContent('No data for last week');
    expect(screen.getByTestId('stat-allocations')).toHaveTextContent('No data for last week');
    expect(screen.getByTestId('stat-tags-used')).toHaveTextContent('No data for last week');
  });

  it('shows "No data for last week" when the previous week has a session but zero allocations', async () => {
    // A session can exist with no scans at all (e.g. createSession was called but the
    // operator never scanned a tag, or every scan failed). listSessionsInRange still
    // returns that session, so a guard that only checks for previous-week *sessions*
    // would wrongly treat this as comparable data and mark the entire current-week
    // roster as "anomalies" vs. an empty previous week.
    const prevWeekSessionNoAllocations = {
      id: 's2',
      sessionDate: '2026-08-12', // Within the previous week (2026-08-10..2026-08-16).
      sessionType: 'training' as const,
      notes: null,
      createdBy: 'staff1',
    };

    // First call is the current-week fetch, second is the history fetch (see ReportPage's
    // Promise.all call order) — the history call additionally returns the empty-allocation
    // previous-week session. listAllocationsForSessionsMock keeps its default resolved
    // value of [allocation, allocation2, allocation3], all of which belong to session s1,
    // so no allocation ever references s2 — exactly "session exists, zero allocations".
    listSessionsInRangeMock
      .mockReset()
      .mockResolvedValueOnce([session])
      .mockResolvedValueOnce([session, prevWeekSessionNoAllocations]);

    render(<ReportPage />);
    await waitFor(() => expect(screen.getAllByText('Alex Jones')[0]).toBeInTheDocument());

    expect(screen.getByTestId('stat-anomalies')).toHaveTextContent('No data for last week');
    expect(screen.getByTestId('stat-allocations')).toHaveTextContent('No data for last week');
    expect(screen.getByTestId('stat-tags-used')).toHaveTextContent('No data for last week');
  });

  it('shows the player breakdown and session-grouped log', async () => {
    render(<ReportPage />);
    await waitFor(() => expect(screen.getAllByText('Alex Jones')[0]).toBeInTheDocument());

    expect(screen.getByText('Player Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Allocation Log')).toBeInTheDocument();
    expect(screen.getByText('2026-08-17 — training')).toBeInTheDocument();
  });

  it('calls window.print when the Print / Save as PDF button is clicked', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    render(<ReportPage />);
    await waitFor(() => expect(screen.getAllByText('Alex Jones')[0]).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Print / Save as PDF' }));

    expect(printSpy).toHaveBeenCalled();

    printSpy.mockRestore();
  });
});
