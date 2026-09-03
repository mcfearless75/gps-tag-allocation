import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../supabaseClient', () => ({ supabase: mockSupabase }));

import { getOrCreateTagByCode, listTags } from './tags';

describe('getOrCreateTagByCode', () => {
  beforeEach(() => mockSupabase.from.mockReset());

  it('returns the existing tag when tag_code is already registered', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 't1', tag_code: 'C5H1-0056', label: null, status: 'active' },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    mockSupabase.from.mockReturnValue({ select });

    const tag = await getOrCreateTagByCode('C5H1-0056');

    expect(tag).toEqual({ id: 't1', tagCode: 'C5H1-0056', label: null, status: 'active' });
  });

  it('creates a new tag when tag_code has not been seen before', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const selectForLookup = vi.fn().mockReturnValue({ eq });

    const single = vi.fn().mockResolvedValue({
      data: { id: 't2', tag_code: 'NEW-CODE', label: null, status: 'active' },
      error: null,
    });
    const selectForUpsert = vi.fn().mockReturnValue({ single });
    const upsert = vi.fn().mockReturnValue({ select: selectForUpsert });

    mockSupabase.from.mockReturnValue({ select: selectForLookup, upsert });

    const tag = await getOrCreateTagByCode('NEW-CODE');

    expect(upsert).toHaveBeenCalledWith({ tag_code: 'NEW-CODE' }, { onConflict: 'tag_code' });
    expect(tag).toEqual({ id: 't2', tagCode: 'NEW-CODE', label: null, status: 'active' });
  });

  it('returns the winning row instead of throwing when two concurrent scans race to create the same tag', async () => {
    // Both calls' initial select sees "not found" (neither has been created yet), so both
    // fall through to upsert. The real bug this guards against: a plain insert() here would
    // throw a unique-constraint violation for whichever call lost the race, surfacing as a
    // generic scan failure even though the tag now genuinely exists (created by the winner).
    // Upserting on conflict must return that existing row instead of throwing.
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const selectForLookup = vi.fn().mockReturnValue({ eq });

    const single = vi.fn().mockResolvedValue({
      data: { id: 't3', tag_code: 'RACED-CODE', label: null, status: 'active' },
      error: null,
    });
    const selectForUpsert = vi.fn().mockReturnValue({ single });
    const upsert = vi.fn().mockReturnValue({ select: selectForUpsert });

    mockSupabase.from.mockReturnValue({ select: selectForLookup, upsert });

    const tag = await getOrCreateTagByCode('RACED-CODE');

    expect(tag).toEqual({ id: 't3', tagCode: 'RACED-CODE', label: null, status: 'active' });
  });
});

describe('listTags', () => {
  it('returns all tags ordered by tag_code', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: 't1', tag_code: 'A', label: null, status: 'active' }],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ order });
    mockSupabase.from.mockReturnValue({ select });

    const tags = await listTags();

    expect(select).toHaveBeenCalledWith('id, tag_code, label, status');
    expect(order).toHaveBeenCalledWith('tag_code', { ascending: true });
    expect(tags).toEqual([{ id: 't1', tagCode: 'A', label: null, status: 'active' }]);
  });
});
