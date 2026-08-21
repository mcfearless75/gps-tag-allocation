import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('../lib/api/players', () => ({ listActivePlayers: listActivePlayersMock }));
vi.mock('../lib/api/tags', () => ({ listTags: vi.fn().mockResolvedValue([tag, tag2]) }));
vi.mock('../lib/api/sessions', () => ({ listSessionsInRange: vi.fn().mockResolvedValue([session]) }));
vi.mock('../lib/api/allocations', () => ({
  listAllocationsForSessions: vi.fn().mockResolvedValue([allocation, allocation2, allocation3]),
}));

const downloadWorkbookMock = vi.hoisted(() => vi.fn());
vi.mock('../lib/excelExport', () => ({ downloadWorkbook: downloadWorkbookMock }));

import { ReportPage } from './ReportPage';

describe('ReportPage', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
    URL.revokeObjectURL = vi.fn();
    listActivePlayersMock.mockClear();
    listActivePlayersMock.mockResolvedValue([player]);
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
    expect(screen.getByTestId('stat-allocations')).toHaveTextContent('3');
    // Alex's usual tag is t1 (used twice, vs t2 used once), so allocation2 (t2)
    // is a single mismatch anomaly; no players are missing allocations.
    expect(screen.getByTestId('stat-anomalies')).toHaveTextContent('1');
    // Two distinct tags (t1 and t2) were used this week.
    expect(screen.getByTestId('stat-tags-used')).toHaveTextContent('2');
  });

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
});
