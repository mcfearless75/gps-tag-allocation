import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { shouldAcceptScan } from '../lib/scanDedupe';

interface QrScannerProps {
  onScan: (code: string) => void;
}

const ELEMENT_ID = 'qr-scanner-region';

export function QrScanner({ onScan }: QrScannerProps) {
  const lastCodeRef = useRef<string | null>(null);
  const lastScanAtRef = useRef<number | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode(ELEMENT_ID);

    scanner
      .start(
        { facingMode: 'environment' },
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
      });

    return () => {
      scanner.stop().catch(() => {
        /* already stopped */
      });
    };
  }, [onScan]);

  return <div id={ELEMENT_ID} data-testid={ELEMENT_ID} />;
}
