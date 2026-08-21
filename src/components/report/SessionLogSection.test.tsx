import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { SessionLogSection } from './SessionLogSection';

describe('SessionLogSection', () => {
  it('renders a subheading and table rows per session group', () => {
    render(
      <SessionLogSection
        groups={[
          {
            sessionId: 's1',
            date: '2026-08-17',
            sessionType: 'training',
            rows: [
              {
                tagCode: 'TAG-001',
                playerName: 'Alex Jones',
                shirtNumber: 7,
                scannedOutAt: '2026-08-17T09:00:00Z',
                scannedInAt: null,
              },
            ],
          },
        ]}
      />
    );

    expect(screen.getByText('2026-08-17 — training')).toBeInTheDocument();
    expect(screen.getByText('TAG-001')).toBeInTheDocument();
    expect(screen.getByText('Alex Jones')).toBeInTheDocument();
  });

  it('shows a message when there are no allocations this week', () => {
    render(<SessionLogSection groups={[]} />);
    expect(screen.getByText('No allocations this week.')).toBeInTheDocument();
  });
});
