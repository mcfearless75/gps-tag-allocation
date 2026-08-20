import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../supabaseClient', () => ({ supabase: mockSupabase }));

import { listActivePlayers, updateShirtNumber } from './players';

describe('listActivePlayers', () => {
  beforeEach(() => mockSupabase.from.mockReset());

  it('returns students mapped to Player shape, ordered by name', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        { id: 'p1', name: 'Alex Jones', shirt_number: 7 },
        { id: 'p2', name: 'Sam Lee', shirt_number: null },
      ],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    mockSupabase.from.mockReturnValue({ select });

    const players = await listActivePlayers();

    expect(mockSupabase.from).toHaveBeenCalledWith('users');
    expect(select).toHaveBeenCalledWith('id, name, shirt_number');
    expect(eq).toHaveBeenCalledWith('role', 'student');
    expect(order).toHaveBeenCalledWith('name', { ascending: true });
    expect(players).toEqual([
      { id: 'p1', name: 'Alex Jones', shirtNumber: 7 },
      { id: 'p2', name: 'Sam Lee', shirtNumber: null },
    ]);
  });

  it('throws when supabase returns an error', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: new Error('boom') });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    mockSupabase.from.mockReturnValue({ select });

    await expect(listActivePlayers()).rejects.toThrow('boom');
  });
});

describe('updateShirtNumber', () => {
  it('updates the shirt_number column for the given player id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mockSupabase.from.mockReturnValue({ update });

    await updateShirtNumber('p1', 9);

    expect(mockSupabase.from).toHaveBeenCalledWith('users');
    expect(update).toHaveBeenCalledWith({ shirt_number: 9 });
    expect(eq).toHaveBeenCalledWith('id', 'p1');
  });
});
