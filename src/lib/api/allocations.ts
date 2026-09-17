import { supabase } from '../supabaseClient';
import type { Allocation } from '../types';

function mapAllocation(row: any): Allocation {
  return {
    id: row.id,
    sessionId: row.session_id,
    tagId: row.tag_id,
    playerId: row.player_id,
    gpsNumber: row.gps_number ?? null,
    scannedOutBy: row.scanned_out_by,
    scannedOutAt: row.scanned_out_at,
    scannedInBy: row.scanned_in_by,
    scannedInAt: row.scanned_in_at,
  };
}

const SELECT_COLS =
  'id, session_id, tag_id, player_id, gps_number, scanned_out_by, scanned_out_at, scanned_in_by, scanned_in_at';

export async function createAllocation(
  sessionId: string,
  tagId: string,
  playerId: string,
  scannedOutBy: string,
  gpsNumber: number | null = null
): Promise<Allocation> {
  const base = {
    session_id: sessionId,
    tag_id: tagId,
    player_id: playerId,
    scanned_out_by: scannedOutBy,
  };
  const withNumber = gpsNumber == null ? base : { ...base, gps_number: gpsNumber };

  const first = await supabase
    .from('gps_tag_allocations')
    .insert(withNumber)
    .select(SELECT_COLS)
    .single();

  if (first.error && gpsNumber != null) {
    const fallback = await supabase
      .from('gps_tag_allocations')
      .insert(base)
      .select('id, session_id, tag_id, player_id, scanned_out_by, scanned_out_at, scanned_in_by, scanned_in_at')
      .single();
    if (fallback.error) throw fallback.error;
    return mapAllocation(fallback.data);
  }

  if (first.error) throw first.error;
  return mapAllocation(first.data);
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
    .select(SELECT_COLS)
    .maybeSingle();

  if (error) throw error;
  return data ? mapAllocation(data) : null;
}

export async function listAllocationsForSessions(sessionIds: string[]): Promise<Allocation[]> {
  if (sessionIds.length === 0) return [];

  const { data, error } = await supabase
    .from('gps_tag_allocations')
    .select(SELECT_COLS)
    .in('session_id', sessionIds);

  if (error) {
    const fallback = await supabase
      .from('gps_tag_allocations')
      .select('id, session_id, tag_id, player_id, scanned_out_by, scanned_out_at, scanned_in_by, scanned_in_at')
      .in('session_id', sessionIds);
    if (fallback.error) throw fallback.error;
    return (fallback.data ?? []).map(mapAllocation);
  }
  return (data ?? []).map(mapAllocation);
}
