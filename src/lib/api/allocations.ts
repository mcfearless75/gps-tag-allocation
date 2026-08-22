import { supabase } from '../supabaseClient';
import type { Allocation } from '../types';

function mapAllocation(row: any): Allocation {
  return {
    id: row.id,
    sessionId: row.session_id,
    tagId: row.tag_id,
    playerId: row.player_id,
    scannedOutBy: row.scanned_out_by,
    scannedOutAt: row.scanned_out_at,
    scannedInBy: row.scanned_in_by,
    scannedInAt: row.scanned_in_at,
  };
}

export async function createAllocation(
  sessionId: string,
  tagId: string,
  playerId: string,
  scannedOutBy: string
): Promise<Allocation> {
  const { data, error } = await supabase
    .from('gps_tag_allocations')
    .insert({ session_id: sessionId, tag_id: tagId, player_id: playerId, scanned_out_by: scannedOutBy })
    .select('id, session_id, tag_id, player_id, scanned_out_by, scanned_out_at, scanned_in_by, scanned_in_at')
    .single();

  if (error) throw error;
  return mapAllocation(data);
}

export async function completeAllocation(
  sessionId: string,
  tagId: string,
  scannedInBy: string
): Promise<Allocation | null> {
  const { data, error } = await supabase
    .from('gps_tag_allocations')
    .update({ scanned_in_by: scannedInBy, scanned_in_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('tag_id', tagId)
    .is('scanned_in_at', null)
    .select('id, session_id, tag_id, player_id, scanned_out_by, scanned_out_at, scanned_in_by, scanned_in_at')
    .maybeSingle();

  if (error) throw error;
  return data ? mapAllocation(data) : null;
}

export async function listAllocationsForSessions(sessionIds: string[]): Promise<Allocation[]> {
  if (sessionIds.length === 0) return [];

  const { data, error } = await supabase
    .from('gps_tag_allocations')
    .select('id, session_id, tag_id, player_id, scanned_out_by, scanned_out_at, scanned_in_by, scanned_in_at')
    .in('session_id', sessionIds);

  if (error) throw error;
  return (data ?? []).map(mapAllocation);
}
