import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('renders link cards to Scan, Roster, and Report', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /Scan/ })).toHaveAttribute('href', '/scan');
    expect(screen.getByRole('link', { name: /Roster/ })).toHaveAttribute('href', '/roster');
    expect(screen.getByRole('link', { name: /Report/ })).toHaveAttribute('href', '/report');
  });
});
