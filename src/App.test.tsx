import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('./lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));
vi.mock('./lib/api/players', () => ({ listActivePlayers: vi.fn().mockResolvedValue([]) }));
vi.mock('./lib/api/sessions', () => ({
  listSessionsInRange: vi.fn().mockResolvedValue([]),
  createSession: vi.fn(),
}));

import App from './App';

describe('App', () => {
  it('renders the Home page at the default route, with no login step', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Welcome')).toBeInTheDocument());
    const scanLinks = screen.getAllByRole('link', { name: /Scan/ });
    expect(scanLinks[0]).toHaveAttribute('href', '/scan');
  });
});
