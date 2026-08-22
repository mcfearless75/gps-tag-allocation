import type { SessionGroup } from '../../lib/reportCalculations';

interface SessionLogSectionProps {
  groups: SessionGroup[];
}

export function SessionLogSection({ groups }: SessionLogSectionProps) {
  return (
    <div className="card">
      <h2>Allocation Log</h2>
      {groups.length === 0 && <p>No allocations this week.</p>}
      {groups.map((group) => (
        <div key={group.sessionId} className="session-log-group">
          <h3>{group.date} — {group.sessionType}</h3>
          <table>
            <thead>
              <tr><th>Tag</th><th>Player</th><th>Shirt #</th><th>Out</th><th>In</th></tr>
            </thead>
            <tbody>
              {group.rows.map((row, index) => (
                <tr key={index}>
                  <td>{row.tagCode}</td>
                  <td>{row.playerName}</td>
                  <td>{row.shirtNumber ?? ''}</td>
                  <td>{row.scannedOutAt}</td>
                  <td>{row.scannedInAt ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
