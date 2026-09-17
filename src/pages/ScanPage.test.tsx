import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OPERATOR_ID } from '../lib/operator';

let qrScannerMountCount = 0;

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
  QrScanner: ({
    onScan,
    onError,
    paused,
  }: {
    onScan: (code: string) => void;
    onError?: (error: unknown) => void;
    paused?: boolean;
  }) => {
    const [mountId] = useState(() => ++qrScannerMountCount);
    return (
      <>
        <div data-testid="qr-scanner-mount-id">{mountId}</div>
        <div data-testid="qr-scanner-paused">{String(!!paused)}</div>
        <button type="button" onClick={() => onScan('TAG-001')}>Simulate scan</button>
        <button type="button" onClick={() => onError?.(new Error('NotAllowedError'))}>
          Simulate camera error
        </button>
        <button
          type="button"
          onClick={() => onError?.('Error getting userMedia, error = NotAllowedError: Permission denied')}
        >
          Simulate camera error (string)
        </button>
      </>
    );
  },
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
    qrScannerMountCount = 0;
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
    await waitFor(() => expect(createSessionMock).toHaveBeenCalledWith('2026-08-20', 'training', OPERATOR_ID, null));

    await user.click(screen.getByRole('button', { name: 'Simulate scan' }));
    await waitFor(() => expect(getOrCreateTagByCodeMock).toHaveBeenCalledWith('TAG-001'));

    await waitFor(() => expect(screen.getByText('Alex Jones (#7)')).toBeInTheDocument());
    await user.click(screen.getByText('Alex Jones (#7)'));

    await waitFor(() =>
      expect(createAllocationMock).toHaveBeenCalledWith('s1', 't1', 'p1', OPERATOR_ID, null)
    );

    await user.click(screen.getByRole('button', { name: 'Scan In' }));
    await user.click(screen.getByRole('button', { name: 'Simulate scan' }));

    await waitFor(() => expect(completeAllocationMock).toHaveBeenCalledWith('s1', 't1', OPERATOR_ID));
  });

  it('keeps QrScanner mounted (pausing, not recreating it) while picking a player for a scanned-out tag', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ScanPage />);

    await user.click(await screen.findByRole('button', { name: 'Start session' }));
    await waitFor(() => expect(createSessionMock).toHaveBeenCalled());

    expect(screen.getByTestId('qr-scanner-paused')).toHaveTextContent('false');
    const mountIdBeforeScan = screen.getByTestId('qr-scanner-mount-id').textContent;

    await user.click(screen.getByRole('button', { name: 'Simulate scan' }));
    await waitFor(() => expect(screen.getByText('Alex Jones (#7)')).toBeInTheDocument());

    expect(screen.getByTestId('qr-scanner-mount-id').textContent).toBe(mountIdBeforeScan);
    expect(screen.getByTestId('qr-scanner-paused')).toHaveTextContent('true');

    await user.click(screen.getByText('Alex Jones (#7)'));
    await waitFor(() => expect(createAllocationMock).toHaveBeenCalled());

    expect(screen.getByTestId('qr-scanner-mount-id').textContent).toBe(mountIdBeforeScan);
    expect(screen.getByTestId('qr-scanner-paused')).toHaveTextContent('false');
  });

  it('ignores a second decode of the same tag that arrives while the first is still being processed', async () => {
    let resolveFirstLookup!: (tag: { id: string; tagCode: string; label: null; status: string }) => void;
    getOrCreateTagByCodeMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirstLookup = resolve;
        })
    );

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ScanPage />);

    await user.click(await screen.findByRole('button', { name: 'Start session' }));

    await user.click(screen.getByRole('button', { name: 'Simulate scan' }));
    await user.click(screen.getByRole('button', { name: 'Simulate scan' }));

    expect(getOrCreateTagByCodeMock).toHaveBeenCalledTimes(1);

    resolveFirstLookup({ id: 't1', tagCode: 'TAG-001', label: null, status: 'active' });
    await waitFor(() => expect(screen.getByText('Alex Jones (#7)')).toBeInTheDocument());

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
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

  it('shows a status message when the player list fails to load', async () => {
    listActivePlayersMock.mockRejectedValueOnce(new Error('permission denied'));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ScanPage />);

    await user.click(await screen.findByRole('button', { name: 'Start session' }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent("Couldn't load the player list. Try reloading.")
    );
  });

  it('shows a helpful status message when the camera fails to start', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ScanPage />);

    await user.click(await screen.findByRole('button', { name: 'Start session' }));
    await user.click(screen.getByRole('button', { name: 'Simulate camera error' }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Camera access was blocked. Allow camera permission for this site in your browser settings, then reload.'
      )
    );
  });

  it('shows the same helpful message when the camera error arrives as a plain string, not an Error', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ScanPage />);

    await user.click(await screen.findByRole('button', { name: 'Start session' }));
    await user.click(screen.getByRole('button', { name: 'Simulate camera error (string)' }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Camera access was blocked. Allow camera permission for this site in your browser settings, then reload.'
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

  it('shows a clear, specific message (and returns to the scanner) when a tag is reissued in the same session', async () => {
    const existingSession = {
      id: 's2',
      sessionDate: '2026-08-20',
      sessionType: 'training',
      notes: null,
      createdBy: 'staff1',
    };
    listSessionsInRangeMock.mockReset();
    listSessionsInRangeMock.mockResolvedValue([existingSession]);
    createAllocationMock.mockRejectedValueOnce({ code: '23505', message: 'duplicate key value' });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ScanPage />);

    await waitFor(() => expect(screen.getByText(/training — 2026-08-20/)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Simulate scan' }));
    await waitFor(() => expect(screen.getByText('Alex Jones (#7)')).toBeInTheDocument());
    await user.click(screen.getByText('Alex Jones (#7)'));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        "That tag has already been used in this session and can't be reissued — scan a different tag."
      )
    );
    expect(screen.queryByText('Alex Jones (#7)')).not.toBeInTheDocument();
  });
});
