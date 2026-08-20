import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { player, tag, session, allocation } = vi.hoisted(() => ({
  player: { id: 'p1', name: 'Alex Jones', shirtNumber: 7 },
  tag: { id: 't1', tagCode: 'TAG-001', label: null, status: 'active' as const },
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
}));

const listActivePlayersMock = vi.hoisted(() => vi.fn().mockResolvedValue([player]));

vi.mock('../lib/api/players', () => ({ listActivePlayers: listActivePlayersMock }));
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
    listActivePlayersMock.mockClear();
    listActivePlayersMock.mockResolvedValue([player]);
  });

  it('shows a loading indicator, then the report once data resolves', async () => {
    render(<ReportPage />);

    expect(screen.getByText('Loading report...')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Alex Jones')).toBeInTheDocument());
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

    await waitFor(() => expect(screen.getByText('Alex Jones')).toBeInTheDocument());
    expect(screen.getAllByText('TAG-001').length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: 'Export Excel' }));

    expect(downloadWorkbookMock).toHaveBeenCalledWith(
      expect.stringContaining('.xlsx'),
      expect.arrayContaining(['Date', 'Session Type', 'Tag', 'Player', 'Shirt #', 'Scanned Out', 'Scanned In']),
      expect.arrayContaining([expect.arrayContaining(['2026-08-17', 'training', 'TAG-001', 'Alex Jones', 7])])
    );
  });
});
