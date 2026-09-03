import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const startMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const stopMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const pauseMock = vi.hoisted(() => vi.fn());
const resumeMock = vi.hoisted(() => vi.fn());
const Html5QrcodeMock = vi.hoisted(() =>
  vi.fn().mockImplementation(() => ({
    start: startMock,
    stop: stopMock,
    pause: pauseMock,
    resume: resumeMock,
  }))
);

vi.mock('html5-qrcode', () => ({ Html5Qrcode: Html5QrcodeMock }));

import { QrScanner } from './QrScanner';

async function renderAndStart(props: Parameters<typeof QrScanner>[0]) {
  const user = userEvent.setup();
  const utils = render(<QrScanner {...props} />);
  await user.click(screen.getByRole('button', { name: 'Tap to start camera' }));
  return { user, ...utils };
}

describe('QrScanner', () => {
  beforeEach(() => {
    startMock.mockReset().mockResolvedValue(undefined);
    stopMock.mockReset().mockResolvedValue(undefined);
    pauseMock.mockReset();
    resumeMock.mockReset();
  });

  it('renders a "tap to start" prompt and does not touch the camera until it is tapped', () => {
    render(<QrScanner onScan={vi.fn()} />);

    expect(screen.getByTestId('qr-scanner-region')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tap to start camera' })).toBeInTheDocument();
    expect(startMock).not.toHaveBeenCalled();
  });

  it('starts the camera, with the back-facing camera and a high-res constraint, once tapped', async () => {
    await renderAndStart({ onScan: vi.fn() });

    // The first argument to Html5Qrcode.start() must be EXACTLY one key
    // ({facingMode} or {deviceId}) — the library throws if it sees any more,
    // so extra constraints (resolution) belong in the second argument instead.
    expect(startMock).toHaveBeenCalledWith(
      { facingMode: 'environment' },
      expect.objectContaining({
        fps: 10,
        videoConstraints: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      }),
      expect.any(Function),
      expect.any(Function)
    );
    expect(screen.queryByRole('button', { name: 'Tap to start camera' })).not.toBeInTheDocument();
  });

  it('calls onScan with the decoded text when a scan succeeds', async () => {
    const onScan = vi.fn();
    await renderAndStart({ onScan });

    const successCallback = startMock.mock.calls[startMock.mock.calls.length - 1][2];
    successCallback('TAG-001');

    expect(onScan).toHaveBeenCalledWith('TAG-001');
  });

  it('calls onError when the camera fails to start, instead of failing silently', async () => {
    const cameraError = new Error('NotAllowedError: Permission denied');
    startMock.mockRejectedValueOnce(cameraError);
    const onError = vi.fn();

    await renderAndStart({ onScan: vi.fn(), onError });

    await waitFor(() => expect(onError).toHaveBeenCalledWith(cameraError));
  });

  it('does not crash on unmount when the camera never started (regression)', async () => {
    // Html5Qrcode.stop() throws SYNCHRONOUSLY (not a rejected promise) when the scanner
    // never reached the running state. Unmounting the component (e.g. the user navigates
    // away) after a failed start() must not propagate that throw and crash the app.
    startMock.mockRejectedValueOnce('NotAllowedError: Permission denied');
    stopMock.mockImplementation(() => {
      throw 'Cannot stop, scanner is not running or paused.';
    });
    const onError = vi.fn();

    const { unmount } = await renderAndStart({ onScan: vi.fn(), onError });
    await waitFor(() => expect(onError).toHaveBeenCalled());

    expect(() => unmount()).not.toThrow();
    expect(stopMock).not.toHaveBeenCalled();
  });

  it('pauses the already-running camera (rather than tearing it down) when paused becomes true', async () => {
    const { rerender } = await renderAndStart({ onScan: vi.fn(), paused: false });
    await waitFor(() => expect(startMock).toHaveResolved());

    rerender(<QrScanner onScan={vi.fn()} paused />);

    await waitFor(() => expect(pauseMock).toHaveBeenCalledWith(true));
    expect(stopMock).not.toHaveBeenCalled();
    expect(startMock).toHaveBeenCalledTimes(1);
  });

  it('resumes the same camera (no new getUserMedia call) when paused goes back to false', async () => {
    const { rerender } = await renderAndStart({ onScan: vi.fn(), paused: true });
    await waitFor(() => expect(startMock).toHaveResolved());

    rerender(<QrScanner onScan={vi.fn()} paused={false} />);

    await waitFor(() => expect(resumeMock).toHaveBeenCalled());
    expect(startMock).toHaveBeenCalledTimes(1);
  });
});
