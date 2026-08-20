import { describe, it, expect } from 'vitest';
import { shouldAcceptScan } from './scanDedupe';

describe('shouldAcceptScan', () => {
  it('accepts the first scan of a code', () => {
    expect(shouldAcceptScan(null, null, 'TAG-001', 1000)).toBe(true);
  });

  it('rejects the same code scanned again within the cooldown window', () => {
    expect(shouldAcceptScan('TAG-001', 1000, 'TAG-001', 1500, 2000)).toBe(false);
  });

  it('accepts the same code scanned again after the cooldown window', () => {
    expect(shouldAcceptScan('TAG-001', 1000, 'TAG-001', 3500, 2000)).toBe(true);
  });

  it('accepts a different code immediately, ignoring the cooldown', () => {
    expect(shouldAcceptScan('TAG-001', 1000, 'TAG-002', 1050, 2000)).toBe(true);
  });
});
