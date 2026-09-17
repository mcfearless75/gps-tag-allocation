import { useEffect, useMemo, useState } from 'react';
import { listActivePlayers } from '../lib/api/players';
import { listTags } from '../lib/api/tags';
import { listSessionsInRange, updateSessionNotes } from '../lib/api/sessions';
import { listAllocationsForSessions } from '../lib/api/allocations';
import { parseSessionNotes, stringifySessionNotes } from '../lib/sessionNotes';
import type { Allocation, Player, SessionSheetMeta, Tag, TagSession } from '../lib/types';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatUkDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

export function SheetPage() {
  const [sessions, setSessions] = useState<TagSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [meta, setMeta] = useState<SessionSheetMeta>(parseSessionNotes(null));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const day = todayIso();
    Promise.all([listSessionsInRange(day, day), listActivePlayers(), listTags()])
      .then(([sess, plist, tlist]) => {
        setSessions(sess);
        setPlayers(plist);
        setTags(tlist);
        const preferred =
          sess.find((s) => s.sessionType === 'match') ?? sess[sess.length - 1] ?? null;
        setSessionId(preferred?.id ?? null);
        if (preferred) setMeta(parseSessionNotes(preferred.notes));
        setLoading(false);
      })
      .catch(() => {
        setError("Couldn't load today's sessions.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setAllocations([]);
      return;
    }
    const session = sessions.find((s) => s.id === sessionId);
    if (session) setMeta(parseSessionNotes(session.notes));
    listAllocationsForSessions([sessionId])
      .then(setAllocations)
      .catch(() => setError("Couldn't load allocations."));
  }, [sessionId, sessions]);

  const rows = useMemo(() => {
    const playerById = new Map(players.map((p) => [p.id, p]));
    const tagById = new Map(tags.map((t) => [t.id, t]));
    return [...allocations]
      .map((a) => ({
        allocation: a,
        player: playerById.get(a.playerId),
        tag: tagById.get(a.tagId),
      }))
      .sort((a, b) => {
        const an = a.allocation.gpsNumber ?? 999;
        const bn = b.allocation.gpsNumber ?? 999;
        if (an !== bn) return an - bn;
        return (a.player?.name ?? '').localeCompare(b.player?.name ?? '');
      });
  }, [allocations, players, tags]);

  const session = sessions.find((s) => s.id === sessionId) ?? null;

  async function saveMeta(next: SessionSheetMeta) {
    setMeta(next);
    if (!sessionId) return;
    try {
      await updateSessionNotes(sessionId, stringifySessionNotes(next));
    } catch {
      setError("Couldn't save sheet details.");
    }
  }

  if (loading) return <main><p>Loading sheet...</p></main>;
  if (error && sessions.length === 0) return <main><p role="alert">{error}</p></main>;

  if (!session) {
    return (
      <main>
        <h1>Catapult sheet</h1>
        <p className="roster-hint">Start a Scan Out session first. This page reprints the paper GPS template from those allocations.</p>
      </main>
    );
  }

  return (
    <main className="sheet-page">
      <div className="print-only print-header">
        <h1>CATAPULT — GPS TEMPLATE</h1>
      </div>
      <h1 className="no-print">Catapult sheet</h1>
      {error && <p role="alert">{error}</p>}

      {sessions.length > 1 && (
        <label className="no-print">
          Session
          <select value={sessionId ?? ''} onChange={(e) => setSessionId(e.target.value)}>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.sessionType} — {s.sessionDate}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="card sheet-meta">
        <table>
          <tbody>
            <tr><th>DATE</th><td>{formatUkDate(session.sessionDate)}</td></tr>
            <tr>
              <th>TEAM</th>
              <td>
                <input
                  className="sheet-inline"
                  aria-label="Team"
                  value={meta.team}
                  onChange={(e) => saveMeta({ ...meta, team: e.target.value })}
                />
              </td>
            </tr>
            <tr>
              <th>OPPOSITION</th>
              <td>
                <input
                  className="sheet-inline"
                  aria-label="Opposition"
                  value={meta.opposition}
                  onChange={(e) => saveMeta({ ...meta, opposition: e.target.value })}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>GPS NUMBER</th>
              <th>NAME</th>
              <th className="no-print">POD</th>
              <th className="no-print">IN</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4}>No scan-outs yet.</td></tr>
            )}
            {rows.map(({ allocation, player, tag }) => (
              <tr key={allocation.id}>
                <td>{allocation.gpsNumber ?? '—'}</td>
                <td>{player?.name ?? 'Unknown'}</td>
                <td className="no-print">{tag?.label || tag?.tagCode || ''}</td>
                <td className="no-print">{allocation.scannedInAt ? '✓' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <table>
          <tbody>
            <tr>
              <th>1st Half Kick Off</th>
              <td><input aria-label="1st half kick off" className="sheet-inline" value={meta.firstKick} onChange={(e) => saveMeta({ ...meta, firstKick: e.target.value })} /></td>
            </tr>
            <tr>
              <th>1st Half End</th>
              <td><input aria-label="1st half end" className="sheet-inline" value={meta.firstEnd} onChange={(e) => saveMeta({ ...meta, firstEnd: e.target.value })} /></td>
            </tr>
            <tr>
              <th>2nd Half Kick Off</th>
              <td><input aria-label="2nd half kick off" className="sheet-inline" value={meta.secondKick} onChange={(e) => saveMeta({ ...meta, secondKick: e.target.value })} /></td>
            </tr>
            <tr>
              <th>2nd Half End</th>
              <td><input aria-label="2nd half end" className="sheet-inline" value={meta.secondEnd} onChange={(e) => saveMeta({ ...meta, secondEnd: e.target.value })} /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <button type="button" className="action-btn no-print" onClick={() => window.print()}>
        Print sheet
      </button>
    </main>
  );
}
