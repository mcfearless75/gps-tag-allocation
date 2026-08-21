import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../supabaseClient', () => ({ supabase: mockSupabase }));

import { listActivePlayers, updateShirtNumber } from './players';

describe('listActivePlayers', () => {
  beforeEach(() => mockSupabase.rpc.mockReset());

  it('returns students mapped to Player shape via the gps_list_active_players RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [
        { id: 'p1', name: 'Alex Jones', shirt_number: 7 },
        { id: 'p2', name: 'Sam Lee', shirt_number: null },
      ],
      error: null,
    });

    const players = await listActivePlayers();

    expect(mockSupabase.rpc).toHaveBeenCalledWith('gps_list_active_players');
    expect(players).toEqual([
      { id: 'p1', name: 'Alex Jones', shirtNumber: 7 },
      { id: 'p2', name: 'Sam Lee', shirtNumber: null },
    ]);
  });

  it('throws when supabase returns an error', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: new Error('boom') });

    await expect(listActivePlayers()).rejects.toThrow('boom');
  });
});

describe('updateShirtNumber', () => {
  it('calls the gps_update_shirt_number RPC with the player id and new number', async () => {
    mockSupabase.rpc.mockResolvedValue({ error: null });

    await updateShirtNumber('p1', 9);

    expect(mockSupabase.rpc).toHaveBeenCalledWith('gps_update_shirt_number', {
      target_id: 'p1',
      new_shirt_number: 9,
    });
  });

  it('throws when supabase returns an error', async () => {
    mockSupabase.rpc.mockResolvedValue({ error: new Error('boom') });

    await expect(updateShirtNumber('p1', 9)).rejects.toThrow('boom');
  });
});
