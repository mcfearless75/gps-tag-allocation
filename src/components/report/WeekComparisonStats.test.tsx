import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { WeekComparisonStats } from './WeekComparisonStats';

describe('WeekComparisonStats', () => {
  it('renders each stat with its value and a delta label vs last week', () => {
    render(
      <WeekComparisonStats
        delta={{
          allocationsCount: 5,
          anomaliesCount: 1,
          tagsUsedCount: 2,
          deltaAllocations: 2,
          deltaAnomalies: -1,
          deltaTagsUsed: 0,
        }}
      />
    );

    expect(screen.getByTestId('stat-allocations')).toHaveTextContent('5');
    expect(screen.getByTestId('stat-allocations')).toHaveTextContent('+2 vs last week');
    expect(screen.getByTestId('stat-anomalies')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-anomalies')).toHaveTextContent('-1 vs last week');
    expect(screen.getByTestId('stat-tags-used')).toHaveTextContent('2');
    expect(screen.getByTestId('stat-tags-used')).toHaveTextContent('No change vs last week');
  });
});
