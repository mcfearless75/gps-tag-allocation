import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../supabaseClient', () => ({ supabase: mockSupabase }));

import {
  addRosterMember,
  listActivePlayers,
  listAddablePlayers,
  removeRosterMember,
  updateCatapultCode,
  updateShirtNumber,
} from './players';

describe('listActivePlayers', () => {
  beforeEach(() => mockSupabase.rpc.mockReset());

  it('returns students mapped to Player shape via the gps_list_active_players RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [
        { id: 'p1', name: 'Alex Jones', shirt_number: 7, catapult_code: 'Tranmere P7' },
        { id: 'p2', name: 'Sam Lee', shirt_number: null },
      ],
      error: null,
    });

    const players = await listActivePlayers();

    expect(mockSupabase.rpc).toHaveBeenCalledWith('gps_list_active_players');
    expect(players).toEqual([
      { id: 'p1', name: 'Alex Jones', shirtNumber: 7, catapultCode: 'Tranmere P7' },
      { id: 'p2', name: 'Sam Lee', shirtNumber: null, catapultCode: null },
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

describe('updateCatapultCode', () => {
  it('calls the gps_update_catapult_code RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({ error: null });

    await updateCatapultCode('p1', 'Tranmere P27');

    expect(mockSupabase.rpc).toHaveBeenCalledWith('gps_update_catapult_code', {
      target_id: 'p1',
      new_catapult_code: 'Tranmere P27',
    });
  });
});

describe('listAddablePlayers', () => {
  beforeEach(() => mockSupabase.rpc.mockReset());

  it('returns students mapped to Player shape via the gps_list_addable_players RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [{ id: 'p3', name: 'Jo Kim', shirt_number: null }],
      error: null,
    });

    const players = await listAddablePlayers();

    expect(mockSupabase.rpc).toHaveBeenCalledWith('gps_list_addable_players');
    expect(players).toEqual([{ id: 'p3', name: 'Jo Kim', shirtNumber: null, catapultCode: null }]);
  });

  it('throws when supabase returns an error', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: new Error('boom') });

    await expect(listAddablePlayers()).rejects.toThrow('boom');
  });
});

describe('addRosterMember', () => {
  it('calls the gps_add_roster_member RPC with the player id', async () => {
    mockSupabase.rpc.mockResolvedValue({ error: null });

    await addRosterMember('p3');

    expect(mockSupabase.rpc).toHaveBeenCalledWith('gps_add_roster_member', { target_id: 'p3' });
  });

  it('throws when supabase returns an error', async () => {
    mockSupabase.rpc.mockResolvedValue({ error: new Error('boom') });

    await expect(addRosterMember('p3')).rejects.toThrow('boom');
  });
});

describe('removeRosterMember', () => {
  it('calls the gps_remove_roster_member RPC with the player id', async () => {
    mockSupabase.rpc.mockResolvedValue({ error: null });

    await removeRosterMember('p1');

    expect(mockSupabase.rpc).toHaveBeenCalledWith('gps_remove_roster_member', { target_id: 'p1' });
  });

  it('throws when supabase returns an error', async () => {
    mockSupabase.rpc.mockResolvedValue({ error: new Error('boom') });

    await expect(removeRosterMember('p1')).rejects.toThrow('boom');
  });
});
