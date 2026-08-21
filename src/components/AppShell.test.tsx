import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('shows the crest, app title, page content, and Scan/Roster/Report bottom nav links', () => {
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
    expect(screen.getByText('Scan')).toBeInTheDocument();
    expect(screen.getByText('Roster')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();
  });
});
