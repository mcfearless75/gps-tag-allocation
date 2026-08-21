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
  buildPlayerBreakdown,
  groupAllocationsBySession,
  weekOverWeekDelta,
} from '../lib/reportCalculations';
import { buildCsv } from '../lib/csvExport';
import { downloadWorkbook } from '../lib/excelExport';
import { WeekComparisonStats } from '../components/report/WeekComparisonStats';
import { SessionLogSection } from '../components/report/SessionLogSection';
import { PlayerBreakdownSection } from '../components/report/PlayerBreakdownSection';
import crest from '../assets/tranmere-crest.webp';
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
  const [historySessions, setHistorySessions] = useState<TagSession[]>([]);
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
      .then(async ([playerRows, tagRows, weekSessions, historySessionRows]) => {
        setPlayers(playerRows);
        setTags(tagRows);
        setSessions(weekSessions);
        setHistorySessions(historySessionRows);

        const [weekAllocations, historyAllocationRows] = await Promise.all([
          listAllocationsForSessions(weekSessions.map((s) => s.id)),
          listAllocationsForSessions(historySessionRows.map((s) => s.id)),
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

  const weekEndIso = toIsoDate(addDays(new Date(weekStart), 6));
  const prevWeekStart = toIsoDate(addDays(new Date(weekStart), -7));
  const prevWeekEnd = toIsoDate(addDays(new Date(weekStart), -1));

  const sessionsById = Object.fromEntries(sessions.map((s) => [s.id, s]));
  const playersById = Object.fromEntries(players.map((p) => [p.id, p]));
  const tagsById = Object.fromEntries(tags.map((t) => [t.id, t]));

  const usualTagByPlayer = computeUsualTagPerPlayer(historyAllocations);
  const mismatches = findTagMismatches(allocations, usualTagByPlayer);
  const playersWithNoAllocations = findPlayersWithNoAllocations(players, allocations);
  const utilization = computeTagUtilization(tags, allocations, sessionsById, weekEndIso);
  const tagsUsedCount = utilization.filter((row) => row.sessionsUsed > 0).length;

  const prevWeekSessions = historySessions.filter(
    (s) => s.sessionDate >= prevWeekStart && s.sessionDate <= prevWeekEnd
  );
  const prevWeekSessionIds = new Set(prevWeekSessions.map((s) => s.id));
  const prevWeekAllocations = historyAllocations.filter((a) => prevWeekSessionIds.has(a.sessionId));
  // A session can exist with zero scans (e.g. a session is started but nothing gets
  // scanned), so checking for previous-week sessions alone isn't enough to know whether
  // there's comparable data — check allocations, since those are what the comparison
  // (and the "no allocations" anomaly check below) actually depend on.
  const hasPrevWeekData = prevWeekAllocations.length > 0;
  const prevSessionsById = Object.fromEntries(prevWeekSessions.map((s) => [s.id, s]));
  const prevMismatches = findTagMismatches(prevWeekAllocations, usualTagByPlayer);
  // When last week had no allocations at all, the whole roster would otherwise show up as
  // "no allocations" and be counted as anomalies, producing a misleading delta (see Fix 1).
  // Treat that as "not comparable" instead: leave the previous anomalies count at whatever
  // findTagMismatches alone reports (correctly 0 for an empty week).
  const prevPlayersWithNoAllocations = findPlayersWithNoAllocations(players, prevWeekAllocations);
  const prevUtilization = computeTagUtilization(tags, prevWeekAllocations, prevSessionsById, prevWeekEnd);
  const prevTagsUsedCount = prevUtilization.filter((row) => row.sessionsUsed > 0).length;

  const delta = weekOverWeekDelta(
    {
      allocationsCount: allocations.length,
      anomaliesCount: mismatches.length + playersWithNoAllocations.length,
      tagsUsedCount,
    },
    {
      allocationsCount: prevWeekAllocations.length,
      anomaliesCount: hasPrevWeekData
        ? prevMismatches.length + prevPlayersWithNoAllocations.length
        : prevMismatches.length,
      tagsUsedCount: prevTagsUsedCount,
    }
  );

  const playerBreakdown = buildPlayerBreakdown(players, allocations, sessionsById, tagsById, mismatches);
  const sessionGroups = groupAllocationsBySession(allocations, sessionsById, playersById, tagsById);

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

  if (loading) return <main><p>Loading report...</p></main>;
  if (error) return <main><p role="alert">{error}</p></main>;

  return (
    <main>
      <div className="print-only print-header">
        <img src={crest} alt="Tranmere Rovers crest" className="print-header-crest" />
        <div>
          <h1>Weekly Report</h1>
          <p>{weekStart} – {weekEndIso}</p>
        </div>
      </div>

      <h1 className="no-print">Weekly Report</h1>
      <label className="no-print">
        Week starting
        <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
      </label>

      <WeekComparisonStats delta={delta} hasPreviousWeekData={hasPrevWeekData} />

      <PlayerBreakdownSection breakdown={playerBreakdown} />

      <SessionLogSection groups={sessionGroups} />

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

      <div className="card no-print">
        <button type="button" className="action-btn" onClick={handleExportCsv}>Export CSV</button>
        <button type="button" className="action-btn accent" onClick={handleExportExcel}>Export Excel</button>
        <button type="button" className="action-btn" onClick={() => window.print()}>Print / Save as PDF</button>
      </div>
    </main>
  );
}
