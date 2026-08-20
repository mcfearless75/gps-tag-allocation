export function shouldAcceptScan(
  lastCode: string | null,
  lastScanAtMs: number | null,
  newCode: string,
  nowMs: number,
  cooldownMs = 2000
): boolean {
  if (lastCode !== newCode) return true;
  if (lastScanAtMs === null) return true;
  return nowMs - lastScanAtMs > cooldownMs;
}
