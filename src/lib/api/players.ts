import { supabase } from '../supabaseClient';
import type { Player } from '../types';

export async function listActivePlayers(): Promise<Player[]> {
  const { data, error } = await supabase.rpc('gps_list_active_players');

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    shirtNumber: row.shirt_number,
  }));
}

export async function updateShirtNumber(playerId: string, shirtNumber: number | null): Promise<void> {
  const { error } = await supabase.rpc('gps_update_shirt_number', {
    target_id: playerId,
    new_shirt_number: shirtNumber,
  });
  if (error) throw error;
}
