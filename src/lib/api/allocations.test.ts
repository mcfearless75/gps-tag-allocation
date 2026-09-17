import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../supabaseClient', () => ({ supabase: mockSupabase }));

import { createAllocation, completeAllocation, listAllocationsForSessions } from './allocations';

const dbRow = {
  id: 'a1',
  session_id: 's1',
  tag_id: 't1',
  player_id: 'p1',
  gps_number: null,
  scanned_out_by: 'staff1',
  scanned_out_at: '2026-08-20T09:00:00Z',
  scanned_in_by: null,
  scanned_in_at: null,
};

const mappedAllocation = {
  id: 'a1',
  sessionId: 's1',
  tagId: 't1',
  playerId: 'p1',
  gpsNumber: null,
  scannedOutBy: 'staff1',
  scannedOutAt: '2026-08-20T09:00:00Z',
  scannedInBy: null,
  scannedInAt: null,
};

describe('createAllocation', () => {
  beforeEach(() => mockSupabase.from.mockReset());

  it('inserts an allocation row and returns it mapped', async () => {
    const single = vi.fn().mockResolvedValue({ data: dbRow, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    mockSupabase.from.mockReturnValue({ insert });

    const allocation = await createAllocation('s1', 't1', 'p1', 'staff1');

    expect(insert).toHaveBeenCalledWith({
      session_id: 's1',
      tag_id: 't1',
      player_id: 'p1',
      scanned_out_by: 'staff1',
    });
    expect(allocation).toEqual(mappedAllocation);
  });
});

describe('completeAllocation', () => {
  beforeEach(() => mockSupabase.from.mockReset());

  it('marks the open allocation for a tag in a session as scanned in', async () => {
    const returnedRow = { ...dbRow, scanned_in_by: 'staff2', scanned_in_at: '2026-08-20T11:00:00Z' };
    const maybeSingle = vi.fn().mockResolvedValue({ data: returnedRow, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const isNull = vi.fn().mockReturnValue({ select });
    const eqTag = vi.fn().mockReturnValue({ is: isNull });
    const eqSession = vi.fn().mockReturnValue({ eq: eqTag });
    const update = vi.fn().mockReturnValue({ eq: eqSession });
    mockSupabase.from.mockReturnValue({ update });

    const allocation = await completeAllocation('s1', 't1', 'staff2');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ scanned_in_by: 'staff2' })
    );
    expect(eqSession).toHaveBeenCalledWith('session_id', 's1');
    expect(eqTag).toHaveBeenCalledWith('tag_id', 't1');
    expect(isNull).toHaveBeenCalledWith('scanned_in_at', null);
    expect(allocation).not.toBeNull();
    expect(allocation?.scannedInBy).toBe('staff2');
  });

  it('resolves to null when there is no open allocation for the tag (routine scan-in of an already-checked-in or never-checked-out tag)', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const isNull = vi.fn().mockReturnValue({ select });
    const eqTag = vi.fn().mockReturnValue({ is: isNull });
    const eqSession = vi.fn().mockReturnValue({ eq: eqTag });
    const update = vi.fn().mockReturnValue({ eq: eqSession });
    mockSupabase.from.mockReturnValue({ update });

    const allocation = await completeAllocation('s1', 't1', 'staff2');

    expect(allocation).toBeNull();
  });
});

describe('listAllocationsForSessions', () => {
  beforeEach(() => mockSupabase.from.mockReset());

  it('returns an empty array without querying when given no session ids', async () => {
    const allocations = await listAllocationsForSessions([]);
    expect(allocations).toEqual([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('queries allocations whose session_id is in the given list', async () => {
    const inFn = vi.fn().mockResolvedValue({ data: [dbRow], error: null });
    const select = vi.fn().mockReturnValue({ in: inFn });
    mockSupabase.from.mockReturnValue({ select });

    const allocations = await listAllocationsForSessions(['s1']);

    expect(inFn).toHaveBeenCalledWith('session_id', ['s1']);
    expect(allocations).toEqual([mappedAllocation]);
  });
});
