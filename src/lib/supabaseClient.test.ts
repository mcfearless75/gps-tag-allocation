import { describe, it, expect, vi, beforeEach } from 'vitest';

const createClientMock = vi.hoisted(() => vi.fn(() => ({ mocked: true })));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

describe('supabaseClient', () => {
  beforeEach(() => {
    createClientMock.mockClear();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key-123');
    vi.resetModules();
  });

  it('creates a client with the configured URL and anon key', async () => {
    const { supabase } = await import('./supabaseClient');
    expect(createClientMock).toHaveBeenCalledWith('https://example.supabase.co', 'anon-key-123');
    expect(supabase).toEqual({ mocked: true });
  });
});
