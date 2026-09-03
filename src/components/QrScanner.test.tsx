import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const startMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const stopMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const Html5QrcodeMock = vi.hoisted(() =>
  vi.fn().mockImplementation(() => ({ start: startMock, stop: stopMock }))
);

vi.mock('html5-qrcode', () => ({ Html5Qrcode: Html5QrcodeMock }));

import { QrScanner } from './QrScanner';

describe('QrScanner', () => {
  beforeEach(() => {
    startMock.mockReset().mockResolvedValue(undefined);
    stopMock.mockReset().mockResolvedValue(undefined);
  });

  it('renders the scanner region and starts the camera with the back-facing camera', () => {
    render(<QrScanner onScan={vi.fn()} />);

    expect(screen.getByTestId('qr-scanner-region')).toBeInTheDocument();
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
  });

  it('calls onScan with the decoded text when a scan succeeds', () => {
    const onScan = vi.fn();
    render(<QrScanner onScan={onScan} />);

    const successCallback = startMock.mock.calls[startMock.mock.calls.length - 1][2];
    successCallback('TAG-001');

    expect(onScan).toHaveBeenCalledWith('TAG-001');
  });

  it('calls onError when the camera fails to start, instead of failing silently', async () => {
    const cameraError = new Error('NotAllowedError: Permission denied');
    startMock.mockRejectedValueOnce(cameraError);
    const onError = vi.fn();

    render(<QrScanner onScan={vi.fn()} onError={onError} />);

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

    const { unmount } = render(<QrScanner onScan={vi.fn()} onError={onError} />);
    await waitFor(() => expect(onError).toHaveBeenCalled());

    expect(() => unmount()).not.toThrow();
    expect(stopMock).not.toHaveBeenCalled();
  });
});
