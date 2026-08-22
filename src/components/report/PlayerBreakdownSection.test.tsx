import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { PlayerBreakdownSection } from './PlayerBreakdownSection';

describe('PlayerBreakdownSection', () => {
  it('renders a row per player with their entries', () => {
    render(
      <PlayerBreakdownSection
        breakdown={[
          {
            playerId: 'p1',
            name: 'Alex Jones',
            shirtNumber: 7,
            sessionCount: 1,
            hasAnomaly: false,
            entries: [
              {
                date: '2026-08-17',
                sessionType: 'training',
                tagCode: 'TAG-001',
                scannedOutAt: '2026-08-17T09:00:00Z',
                scannedInAt: null,
              },
            ],
          },
          {
            playerId: 'p2',
            name: 'Sam Lee',
            shirtNumber: null,
            sessionCount: 0,
            hasAnomaly: false,
            entries: [],
          },
        ]}
      />
    );

    expect(screen.getByText('Alex Jones (#7)')).toBeInTheDocument();
    expect(screen.getByText(/2026-08-17 — training — tag TAG-001/)).toBeInTheDocument();
    expect(screen.getByText('Sam Lee')).toBeInTheDocument();
    expect(screen.getByText('No sessions this week')).toBeInTheDocument();
    expect(screen.getByText('1 session')).toBeInTheDocument();
  });

  it('shows a pluralized session count for players with more than one session', () => {
    render(
      <PlayerBreakdownSection
        breakdown={[
          {
            playerId: 'p1',
            name: 'Alex Jones',
            shirtNumber: 7,
            sessionCount: 3,
            hasAnomaly: false,
            entries: [],
          },
        ]}
      />
    );

    expect(screen.getByText('3 sessions')).toBeInTheDocument();
  });

  it('shows an anomaly flag when hasAnomaly is true', () => {
    render(
      <PlayerBreakdownSection
        breakdown={[
          { playerId: 'p1', name: 'Alex Jones', shirtNumber: 7, sessionCount: 1, hasAnomaly: true, entries: [] },
        ]}
      />
    );

    expect(screen.getByText('Anomaly')).toBeInTheDocument();
  });
});
