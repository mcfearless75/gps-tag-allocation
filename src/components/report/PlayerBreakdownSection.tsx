import type { PlayerBreakdown } from '../../lib/reportCalculations';

interface PlayerBreakdownSectionProps {
  breakdown: PlayerBreakdown[];
}

export function PlayerBreakdownSection({ breakdown }: PlayerBreakdownSectionProps) {
  return (
    <div className="card">
      <h2>Player Breakdown</h2>
      {breakdown.map((player) => (
        <div
          key={player.playerId}
          className={`player-breakdown-row${player.sessionCount === 0 ? ' player-breakdown-row-empty' : ''}`}
        >
          <div className="player-breakdown-header">
            <span className="player-breakdown-name">
              {player.name}
              {player.shirtNumber !== null ? ` (#${player.shirtNumber})` : ''}
            </span>
            {player.hasAnomaly && <span className="player-breakdown-anomaly">Anomaly</span>}
          </div>
          {player.sessionCount === 0 ? (
            <p className="player-breakdown-empty-text">No sessions this week</p>
          ) : (
            <ul className="player-breakdown-entries">
              {player.entries.map((entry, index) => (
                <li key={index}>
                  {entry.date} — {entry.sessionType} — tag {entry.tagCode}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
