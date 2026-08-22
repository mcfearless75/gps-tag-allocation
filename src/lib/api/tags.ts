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

  const { data: created, error: insertError } = await supabase
    .from('gps_tags')
    .insert({ tag_code: tagCode })
    .select('id, tag_code, label, status')
    .single();

  if (insertError) throw insertError;
  return mapTag(created);
}

export async function listTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('gps_tags')
    .select('id, tag_code, label, status')
    .order('tag_code', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapTag);
}
