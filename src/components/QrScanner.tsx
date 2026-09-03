import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { shouldAcceptScan } from '../lib/scanDedupe';

interface QrScannerProps {
  onScan: (code: string) => void;
  onError?: (error: unknown) => void;
}

const ELEMENT_ID = 'qr-scanner-region';

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const lastCodeRef = useRef<string | null>(null);
  const lastScanAtRef = useRef<number | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode(ELEMENT_ID);

    scanner
      .start(
        {
          facingMode: 'environment',
          // Request a high-resolution stream. Without this, getUserMedia falls back to a low
          // default resolution (often ~640x480) on many devices — enough for a human to see
          // the tag label clearly, but not enough fine-grained detail for the decoder to
          // resolve a small/dense printed QR code from normal scanning distance. The video
          // element itself displays whatever the camera provides, so raising the requested
          // resolution costs nothing visually and only helps decoding.
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        { fps: 10, qrbox: 250 },
        (decodedText: string) => {
          const now = Date.now();
          if (shouldAcceptScan(lastCodeRef.current, lastScanAtRef.current, decodedText, now)) {
            lastCodeRef.current = decodedText;
            lastScanAtRef.current = now;
            onScan(decodedText);
          }
        },
        () => {
          /* ignore per-frame decode failures */
        }
      )
      .catch((err: unknown) => {
        console.error('Failed to start QR scanner', err);
        onError?.(err);
      });

    return () => {
      scanner.stop().catch(() => {
        /* already stopped */
      });
    };
  }, [onScan, onError]);

  return <div id={ELEMENT_ID} data-testid={ELEMENT_ID} />;
}
