import { describe, it, expect, vi, beforeEach } from 'vitest';

const createClientMock = vi.hoisted(() =>
  vi.fn((..._args: unknown[]) => ({ mocked: true }))
);

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
    expect(createClientMock).toHaveBeenCalledWith('https://example.supabase.co', 'anon-key-123', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    expect(supabase).toEqual({ mocked: true });
  });

  it('never persists or auto-refreshes a session, so the client always transacts as anon', async () => {
    await import('./supabaseClient');
    const options = createClientMock.mock.calls[0][2] as { auth: { persistSession: boolean; autoRefreshToken: boolean } };
    expect(options.auth.persistSession).toBe(false);
    expect(options.auth.autoRefreshToken).toBe(false);
  });
});
