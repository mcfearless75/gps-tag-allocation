import type { WeekOverWeekDelta } from '../../lib/reportCalculations';

interface WeekComparisonStatsProps {
  delta: WeekOverWeekDelta;
  /** Whether the previous week has any data to compare against. Defaults to true for
   *  backward compatibility with callers that don't yet track this. */
  hasPreviousWeekData?: boolean;
}

function deltaLabel(delta: number): string {
  if (delta > 0) return `+${delta} vs last week`;
  if (delta < 0) return `${delta} vs last week`;
  return 'No change vs last week';
}

export function WeekComparisonStats({ delta, hasPreviousWeekData = true }: WeekComparisonStatsProps) {
  return (
    <div className="stat-row">
      <div className="stat-tile" data-testid="stat-allocations">
        <div className="stat-tile-num">{delta.allocationsCount}</div>
        <div className="stat-tile-label">Allocations</div>
        <div className="stat-tile-delta">
          {hasPreviousWeekData ? deltaLabel(delta.deltaAllocations) : 'No data for last week'}
        </div>
      </div>
      <div className="stat-tile" data-testid="stat-anomalies">
        <div className="stat-tile-num">{delta.anomaliesCount}</div>
        <div className="stat-tile-label">Anomalies</div>
        <div className="stat-tile-delta">
          {hasPreviousWeekData ? deltaLabel(delta.deltaAnomalies) : 'No data for last week'}
        </div>
      </div>
      <div className="stat-tile" data-testid="stat-tags-used">
        <div className="stat-tile-num">{delta.tagsUsedCount}</div>
        <div className="stat-tile-label">Tags used</div>
        <div className="stat-tile-delta">
          {hasPreviousWeekData ? deltaLabel(delta.deltaTagsUsed) : 'No data for last week'}
        </div>
      </div>
    </div>
  );
}
