import { supabase } from '../supabaseClient';
import type { SessionType, TagSession } from '../types';

function mapSession(row: any): TagSession {
  return {
    id: row.id,
    sessionDate: row.session_date,
    sessionType: row.session_type,
    notes: row.notes,
    createdBy: row.created_by,
  };
}

export async function createSession(
  sessionDate: string,
  sessionType: SessionType,
  createdBy: string,
  notes: string | null = null
): Promise<TagSession> {
  const { data, error } = await supabase
    .from('gps_tag_sessions')
    .insert({ session_date: sessionDate, session_type: sessionType, created_by: createdBy, notes })
    .select('id, session_date, session_type, notes, created_by')
    .single();

  if (error) throw error;
  return mapSession(data);
}

export async function listSessionsInRange(startDate: string, endDate: string): Promise<TagSession[]> {
  const { data, error } = await supabase
    .from('gps_tag_sessions')
    .select('id, session_date, session_type, notes, created_by')
    .gte('session_date', startDate)
    .lte('session_date', endDate)
    .order('session_date', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapSession);
}
