import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
vi.mock('../lib/auth/AuthProvider', () => {
  // Stable across renders (like the real AuthProvider's useState-backed session), so the
  // ScanPage effect's [authSession, sessionType] dependency only changes when it should.
  const mockAuthSession = { user: { id: 'staff1' } };
  return {
    useAuth: () => ({ session: mockAuthSession, loading: false }),
  };
});
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
    await waitFor(() => expect(createSessionMock).toHaveBeenCalledWith('2026-08-20', 'training', 'staff1'));

    await user.click(screen.getByRole('button', { name: 'Simulate scan' }));
    await waitFor(() => expect(getOrCreateTagByCodeMock).toHaveBeenCalledWith('TAG-001'));

    await waitFor(() => expect(screen.getByText('Alex Jones (#7)')).toBeInTheDocument());
    await user.click(screen.getByText('Alex Jones (#7)'));

    await waitFor(() =>
      expect(createAllocationMock).toHaveBeenCalledWith('s1', 't1', 'p1', 'staff1')
    );

    await user.click(screen.getByRole('button', { name: 'Scan In' }));
    await user.click(screen.getByRole('button', { name: 'Simulate scan' }));

    await waitFor(() => expect(completeAllocationMock).toHaveBeenCalledWith('s1', 't1', 'staff1'));
  });

  it('resumes an existing session for today when its session type matches the selected type', async () => {
    // The default selected sessionType on ScanPage is 'training'.
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
    // Existing session is a 'match' session, but the default selected sessionType is 'training'.
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

    // Initial mount check resolves with no existing session for the default 'training' type.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Start session' })).toBeInTheDocument()
    );

    // Queue a manually-controlled promise for the re-check the sessionType change triggers.
    let resolveSecondCheck!: (sessions: unknown[]) => void;
    listSessionsInRangeMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecondCheck = resolve;
        })
    );

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.selectOptions(screen.getByLabelText('Session type'), 'match');

    // The button must be gated for the full duration of the re-check, not just the initial one.
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
