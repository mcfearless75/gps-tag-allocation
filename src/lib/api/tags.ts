import { supabase } from '../supabaseClient';
import type { Tag } from '../types';

function mapTag(row: any): Tag {
  return { id: row.id, tagCode: row.tag_code, label: row.label, status: row.status };
}

export async function getOrCreateTagByCode(tagCode: string): Promise<Tag> {
  const { data: existing, error: selectError } = await supabase
    .from('gps_tags')
    .select('id, tag_code, label, status')
    .eq('tag_code', tagCode)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return mapTag(existing);

  // Upsert, not a plain insert: if the same tag gets decoded twice in quick succession (e.g.
  // two frames from the same QR a moment apart, before the scanner's own debounce catches
  // up) both calls can reach this point having both seen "not found" above. A plain insert()
  // would then throw a unique-constraint violation on tag_code for the loser of that race —
  // surfacing as a generic scan failure even though the tag now genuinely exists. Upserting
  // on conflict returns that existing row instead of failing.
  const { data: upserted, error: upsertError } = await supabase
    .from('gps_tags')
    .upsert({ tag_code: tagCode }, { onConflict: 'tag_code' })
    .select('id, tag_code, label, status')
    .single();

  if (upsertError) throw upsertError;
  return mapTag(upserted);
}

export async function listTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('gps_tags')
    .select('id, tag_code, label, status')
    .order('tag_code', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapTag);
}
