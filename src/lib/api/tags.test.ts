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
    const selectForInsert = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select: selectForInsert });

    mockSupabase.from.mockReturnValue({ select: selectForLookup, insert });

    const tag = await getOrCreateTagByCode('NEW-CODE');

    expect(insert).toHaveBeenCalledWith({ tag_code: 'NEW-CODE' });
    expect(tag).toEqual({ id: 't2', tagCode: 'NEW-CODE', label: null, status: 'active' });
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
