import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const useAuthMock = vi.hoisted(() => vi.fn());
vi.mock('../lib/auth/AuthProvider', () => ({ useAuth: useAuthMock }));

import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('always shows the crest and app title, signed in or out', () => {
    useAuthMock.mockReturnValue({ session: null, loading: false });
    render(
      <MemoryRouter>
        <AppShell>
          <p>page content</p>
        </AppShell>
      </MemoryRouter>
    );

    expect(screen.getByAltText('Tranmere Rovers crest')).toBeInTheDocument();
    expect(screen.getByText('GPS Tag Allocation')).toBeInTheDocument();
    expect(screen.getByText('page content')).toBeInTheDocument();
  });

  it('hides the bottom nav when signed out', () => {
    useAuthMock.mockReturnValue({ session: null, loading: false });
    render(
      <MemoryRouter>
        <AppShell>
          <p>content</p>
        </AppShell>
      </MemoryRouter>
    );

    expect(screen.queryByText('Scan')).not.toBeInTheDocument();
    expect(screen.queryByText('Roster')).not.toBeInTheDocument();
    expect(screen.queryByText('Report')).not.toBeInTheDocument();
  });

  it('shows Scan/Roster/Report bottom nav links when signed in', () => {
    useAuthMock.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });
    render(
      <MemoryRouter>
        <AppShell>
          <p>content</p>
        </AppShell>
      </MemoryRouter>
    );

    expect(screen.getByText('Scan')).toBeInTheDocument();
    expect(screen.getByText('Roster')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();
  });
});
