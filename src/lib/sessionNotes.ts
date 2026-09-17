import type { SessionSheetMeta } from './types';

export const EMPTY_SHEET_META: SessionSheetMeta = {
  team: 'TR Prem',
  opposition: '',
  firstKick: '',
  firstEnd: '',
  secondKick: '',
  secondEnd: '',
};

export function parseSessionNotes(notes: string | null): SessionSheetMeta {
  if (!notes) return { ...EMPTY_SHEET_META };
  try {
    const parsed = JSON.parse(notes) as Partial<SessionSheetMeta>;
    return {
      team: parsed.team ?? EMPTY_SHEET_META.team,
      opposition: parsed.opposition ?? '',
      firstKick: parsed.firstKick ?? '',
      firstEnd: parsed.firstEnd ?? '',
      secondKick: parsed.secondKick ?? '',
      secondEnd: parsed.secondEnd ?? '',
    };
  } catch {
    return { ...EMPTY_SHEET_META, opposition: notes };
  }
}

export function stringifySessionNotes(meta: SessionSheetMeta): string {
  return JSON.stringify(meta);
}
