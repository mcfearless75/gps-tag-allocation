import { describe, it, expect } from 'vitest';
import { buildCsv } from './csvExport';

describe('buildCsv', () => {
  it('joins headers and rows with commas and newlines', () => {
    const csv = buildCsv(['Name', 'Number'], [['Alex', 7], ['Sam', 9]]);
    expect(csv).toBe('Name,Number\nAlex,7\nSam,9');
  });

  it('quotes and escapes a cell containing a comma or quote', () => {
    const csv = buildCsv(['Note'], [['has, comma'], ['has "quote"']]);
    expect(csv).toBe('Note\n"has, comma"\n"has ""quote"""');
  });

  it('renders null cells as empty strings', () => {
    const csv = buildCsv(['Value'], [[null]]);
    expect(csv).toBe('Value\n');
  });
});
