import { useEffect, useState } from 'react';
import { listSessionsInRange } from '../lib/api/sessions';
import { listAllocationsForSessions } from '../lib/api/allocations';
import { listActivePlayers } from '../lib/api/players';
import { listTags } from '../lib/api/tags';
import {
  computeUsualTagPerPlayer,
  findTagMismatches,
  findPlayersWithNoAllocations,
  computeTagUtilization,
} from '../lib/reportCalculations';
import { buildCsv } from '../lib/csvExport';
import { downloadWorkbook } from '../lib/excelExport';
import type { Allocation, Player, Tag, TagSession } from '../lib/types';

function startOfIsoWeek(date: Date): Date {
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function buildExportRows(
  allocations: Allocation[],
  sessionsById: Record<string, TagSession>,
  playersById: Record<string, Player>,
  tagsById: Record<string, Tag>
): (string | number | null)[][] {
  return allocations.map((allocation) => [
    sessionsById[allocation.sessionId]?.sessionDate ?? '',
    sessionsById[allocation.sessionId]?.sessionType ?? '',
    tagsById[allocation.tagId]?.tagCode ?? '',
    playersById[allocation.playerId]?.name ?? '',
    playersById[allocation.playerId]?.shirtNumber ?? null,
    allocation.scannedOutAt,
    allocation.scannedInAt ?? '',
  ]);
}

const EXPORT_HEADERS = ['Date', 'Session Type', 'Tag', 'Player', 'Shirt #', 'Scanned Out', 'Scanned In'];

export function ReportPage() {
  const [weekStart, setWeekStart] = useState(() => toIsoDate(startOfIsoWeek(new Date())));
  const [players, setPlayers] = useState<Player[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [sessions, setSessions] = useState<TagSession[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [historyAllocations, setHistoryAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const weekStartDate = new Date(weekStart);
    const weekEnd = toIsoDate(addDays(weekStartDate, 6));
    const historyStart = toIsoDate(addDays(weekStartDate, -28));

    Promise.all([
      listActivePlayers(),
      listTags(),
      listSessionsInRange(weekStart, weekEnd),
      listSessionsInRange(historyStart, weekEnd),
    ])
      .then(async ([playerRows, tagRows, weekSessions, historySessions]) => {
        setPlayers(playerRows);
        setTags(tagRows);
        setSessions(weekSessions);

        const [weekAllocations, historyAllocationRows] = await Promise.all([
          listAllocationsForSessions(weekSessions.map((s) => s.id)),
          listAllocationsForSessions(historySessions.map((s) => s.id)),
        ]);

        setAllocations(weekAllocations);
        setHistoryAllocations(historyAllocationRows);
        setLoading(false);
      })
      .catch(() => {
        setError("Couldn't load the report. Try reloading.");
        setLoading(false);
      });
  }, [weekStart]);

  const sessionsById = Object.fromEntries(sessions.map((s) => [s.id, s]));
  const playersById = Object.fromEntries(players.map((p) => [p.id, p]));
  const tagsById = Object.fromEntries(tags.map((t) => [t.id, t]));

  const usualTagByPlayer = computeUsualTagPerPlayer(historyAllocations);
  const mismatches = findTagMismatches(allocations, usualTagByPlayer);
  const playersWithNoAllocations = findPlayersWithNoAllocations(players, allocations);
  const utilization = computeTagUtilization(tags, allocations, sessionsById, toIsoDate(addDays(new Date(weekStart), 6)));
  const tagsUsedCount = utilization.filter((row) => row.sessionsUsed > 0).length;

  function handleExportCsv() {
    const rows = buildExportRows(allocations, sessionsById, playersById, tagsById);
    const csv = buildCsv(EXPORT_HEADERS, rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `allocation-log-${weekStart}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleExportExcel() {
    const rows = buildExportRows(allocations, sessionsById, playersById, tagsById);
    downloadWorkbook(`allocation-log-${weekStart}.xlsx`, EXPORT_HEADERS, rows);
  }

  if (loading) return <p>Loading report...</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <main>
      <h1>Weekly Report</h1>
      <label>
        Week starting
        <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
      </label>

      <div className="stat-row">
        <div className="stat-tile" data-testid="stat-allocations">
          <div className="stat-tile-num">{allocations.length}</div>
          <div className="stat-tile-label">Allocations</div>
        </div>
        <div className="stat-tile" data-testid="stat-anomalies">
          <div className="stat-tile-num">{mismatches.length + playersWithNoAllocations.length}</div>
          <div className="stat-tile-label">Anomalies</div>
        </div>
        <div className="stat-tile" data-testid="stat-tags-used">
          <div className="stat-tile-num">{tagsUsedCount}</div>
          <div className="stat-tile-label">Tags used</div>
        </div>
      </div>

      <div className="card">
        <h2>Allocation Log</h2>
        <table>
          <thead>
            <tr><th>Date</th><th>Type</th><th>Tag</th><th>Player</th><th>Shirt #</th><th>Out</th><th>In</th></tr>
          </thead>
          <tbody>
            {allocations.map((allocation) => (
              <tr key={allocation.id}>
                <td>{sessionsById[allocation.sessionId]?.sessionDate}</td>
                <td>{sessionsById[allocation.sessionId]?.sessionType}</td>
                <td>{tagsById[allocation.tagId]?.tagCode}</td>
                <td>{playersById[allocation.playerId]?.name}</td>
                <td>{playersById[allocation.playerId]?.shirtNumber ?? ''}</td>
                <td>{allocation.scannedOutAt}</td>
                <td>{allocation.scannedInAt ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Anomalies</h2>
        <h3>Unusual tag/player pairings</h3>
        <ul>
          {mismatches.map((mismatch, index) => (
            <li key={index} className="anomaly-item">
              {playersById[mismatch.playerId]?.name} used tag {tagsById[mismatch.tagId]?.tagCode} instead of
              usual tag {tagsById[mismatch.usualTagId]?.tagCode}
            </li>
          ))}
        </ul>
        <h3>Players with no allocations this week</h3>
        <ul>
          {playersWithNoAllocations.map((player) => (
            <li key={player.id}>{player.name}</li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Utilization</h2>
        <table>
          <thead>
            <tr><th>Tag</th><th>Sessions used</th><th>Last used</th><th>Idle days</th></tr>
          </thead>
          <tbody>
            {utilization.map((row) => (
              <tr key={row.tagId}>
                <td>{tagsById[row.tagId]?.tagCode}</td>
                <td>{row.sessionsUsed}</td>
                <td>{row.lastUsedDate ?? '—'}</td>
                <td>{row.idleDays ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <button type="button" className="action-btn" onClick={handleExportCsv}>Export CSV</button>
        <button type="button" className="action-btn accent" onClick={handleExportExcel}>Export Excel</button>
      </div>
    </main>
  );
}
