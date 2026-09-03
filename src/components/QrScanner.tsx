import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { shouldAcceptScan } from '../lib/scanDedupe';

interface QrScannerProps {
  onScan: (code: string) => void;
  onError?: (error: unknown) => void;
  // When true, the camera keeps running but decoding/rendering is paused (e.g. while the
  // operator is picking a player for a tag that was just scanned). Pausing/resuming reuses
  // the already-open camera stream instead of tearing it down — see the effect below for why
  // that matters.
  paused?: boolean;
}

const ELEMENT_ID = 'qr-scanner-region';

export function QrScanner({ onScan, onError, paused = false }: QrScannerProps) {
  const [started, setStarted] = useState(false);
  const lastCodeRef = useRef<string | null>(null);
  const lastScanAtRef = useRef<number | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasStartedRef = useRef(false);

  // onScan/onError are read via refs rather than effect deps, so this component never needs
  // to restart the camera just because a parent re-render gave it new callback identities.
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  });
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  function handleStart() {
    // Kicking off Html5Qrcode.start() directly inside this click handler — rather than
    // automatically in an effect on mount — guarantees the camera request happens inside a
    // real user gesture. Requesting the camera automatically (no tap) was found to need an
    // extra, inconsistent tap on some mobile browsers before video would actually start.
    setStarted(true);
    const scanner = new Html5Qrcode(ELEMENT_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        // This first argument must be EXACTLY one key — {facingMode} or {deviceId} — or
        // Html5Qrcode.start() throws "'cameraIdOrConfig' object should have exactly 1 key".
        // Extra constraints (resolution etc.) go in the second argument's videoConstraints.
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: 250,
          // Request a high-resolution stream. Without this, getUserMedia falls back to a low
          // default resolution (often ~640x480) on many devices — enough for a human to see
          // the tag label clearly, but not enough fine-grained detail for the decoder to
          // resolve a small/dense printed QR code from normal scanning distance. The video
          // element itself displays whatever the camera provides, so raising the requested
          // resolution costs nothing visually and only helps decoding.
          videoConstraints: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        (decodedText: string) => {
          const now = Date.now();
          if (shouldAcceptScan(lastCodeRef.current, lastScanAtRef.current, decodedText, now)) {
            lastCodeRef.current = decodedText;
            lastScanAtRef.current = now;
            onScanRef.current(decodedText);
          }
        },
        () => {
          /* ignore per-frame decode failures */
        }
      )
      .then(() => {
        hasStartedRef.current = true;
      })
      .catch((err: unknown) => {
        console.error('Failed to start QR scanner', err);
        onErrorRef.current?.(err);
      });
  }

  useEffect(() => {
    // Pause/resume the *same* running camera instead of unmounting this component between
    // scans (the previous ScanPage behaviour). Tearing the camera down and requesting a new
    // one via getUserMedia for every single scan was what forced a fresh tap before every
    // scan — pausing keeps one MediaStream alive for the whole session.
    const scanner = scannerRef.current;
    if (!scanner || !hasStartedRef.current) return;
    try {
      if (paused) {
        scanner.pause(true);
      } else {
        scanner.resume();
      }
    } catch {
      /* already in the requested state */
    }
  }, [paused]);

  useEffect(() => {
    return () => {
      // scanner.stop() throws SYNCHRONOUSLY (not a rejected promise) if the scanner never
      // reached the running state — e.g. start() failed, or was never tapped to begin with.
      // Guard with hasStartedRef *and* try/catch so unmounting never crashes the app.
      const scanner = scannerRef.current;
      if (!scanner || !hasStartedRef.current) return;
      try {
        scanner.stop().catch(() => {
          /* already stopped */
        });
      } catch {
        /* wasn't running */
      }
    };
  }, []);

  return (
    <>
      <div id={ELEMENT_ID} data-testid={ELEMENT_ID} />
      {!started && (
        <button type="button" className="scanner-start-btn" onClick={handleStart}>
          Tap to start camera
        </button>
      )}
    </>
  );
}
