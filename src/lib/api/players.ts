import { supabase } from '../supabaseClient';
import type { Player } from '../types';

export async function listActivePlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, shirt_number')
    .eq('role', 'student')
    .order('name', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    shirtNumber: row.shirt_number,
  }));
}

export async function updateShirtNumber(playerId: string, shirtNumber: number | null): Promise<void> {
  const { error } = await supabase.from('users').update({ shirt_number: shirtNumber }).eq('id', playerId);
  if (error) throw error;
}
