import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthProvider';

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

function Consumer() {
  const { session, loading } = useAuth();
  if (loading) return <span>loading</span>;
  return <span>{session ? `signed-in:${session.user.id}` : 'signed-out'}</span>;
}

describe('AuthProvider', () => {
  it('resolves the current session on mount', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('signed-in:u1')).toBeInTheDocument());
  });
});
