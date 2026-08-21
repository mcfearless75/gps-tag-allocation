import type { WeekOverWeekDelta } from '../../lib/reportCalculations';

interface WeekComparisonStatsProps {
  delta: WeekOverWeekDelta;
}

function deltaLabel(delta: number): string {
  if (delta > 0) return `+${delta} vs last week`;
  if (delta < 0) return `${delta} vs last week`;
  return 'No change vs last week';
}

export function WeekComparisonStats({ delta }: WeekComparisonStatsProps) {
  return (
    <div className="stat-row">
      <div className="stat-tile" data-testid="stat-allocations">
        <div className="stat-tile-num">{delta.allocationsCount}</div>
        <div className="stat-tile-label">Allocations</div>
        <div className="stat-tile-delta">{deltaLabel(delta.deltaAllocations)}</div>
      </div>
      <div className="stat-tile" data-testid="stat-anomalies">
        <div className="stat-tile-num">{delta.anomaliesCount}</div>
        <div className="stat-tile-label">Anomalies</div>
        <div className="stat-tile-delta">{deltaLabel(delta.deltaAnomalies)}</div>
      </div>
      <div className="stat-tile" data-testid="stat-tags-used">
        <div className="stat-tile-num">{delta.tagsUsedCount}</div>
        <div className="stat-tile-label">Tags used</div>
        <div className="stat-tile-delta">{deltaLabel(delta.deltaTagsUsed)}</div>
      </div>
    </div>
  );
}
