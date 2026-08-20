import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('./lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

import App from './App';

describe('App', () => {
  it('redirects a signed-out visitor to the login page', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Staff Login')).toBeInTheDocument());
  });
});
