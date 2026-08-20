import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthProvider';

const getSessionMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
);

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
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

  it('treats a failed session check as signed-out instead of loading forever', async () => {
    getSessionMock.mockRejectedValueOnce(new Error('network error'));

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('signed-out')).toBeInTheDocument());
  });
});
