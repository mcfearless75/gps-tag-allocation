import { render, screen, waitFor } from '@testing-library/react';
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
      expect.objectContaining({
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      }),
      expect.objectContaining({ fps: 10 }),
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
});
