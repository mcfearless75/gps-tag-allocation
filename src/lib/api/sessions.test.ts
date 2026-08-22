import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../supabaseClient', () => ({ supabase: mockSupabase }));

import { createSession, listSessionsInRange } from './sessions';

describe('createSession', () => {
  beforeEach(() => mockSupabase.from.mockReset());

  it('inserts a session row and returns it mapped to TagSession', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 's1', session_date: '2026-08-20', session_type: 'training', notes: null, created_by: 'staff1' },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    mockSupabase.from.mockReturnValue({ insert });

    const session = await createSession('2026-08-20', 'training', 'staff1');

    expect(insert).toHaveBeenCalledWith({
      session_date: '2026-08-20',
      session_type: 'training',
      created_by: 'staff1',
      notes: null,
    });
    expect(session).toEqual({
      id: 's1',
      sessionDate: '2026-08-20',
      sessionType: 'training',
      notes: null,
      createdBy: 'staff1',
    });
  });
});

describe('listSessionsInRange', () => {
  it('queries sessions between the given dates, ordered by date', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: 's1', session_date: '2026-08-17', session_type: 'training', notes: null, created_by: 'staff1' }],
      error: null,
    });
    const lte = vi.fn().mockReturnValue({ order });
    const gte = vi.fn().mockReturnValue({ lte });
    const select = vi.fn().mockReturnValue({ gte });
    mockSupabase.from.mockReturnValue({ select });

    const sessions = await listSessionsInRange('2026-08-17', '2026-08-23');

    expect(gte).toHaveBeenCalledWith('session_date', '2026-08-17');
    expect(lte).toHaveBeenCalledWith('session_date', '2026-08-23');
    expect(sessions).toEqual([
      { id: 's1', sessionDate: '2026-08-17', sessionType: 'training', notes: null, createdBy: 'staff1' },
    ]);
  });
});
