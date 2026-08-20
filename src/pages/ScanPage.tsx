import { useCallback, useEffect, useRef, useState } from 'react';
import { QrScanner } from '../components/QrScanner';
import { PlayerPicker } from '../components/PlayerPicker';
import { listActivePlayers } from '../lib/api/players';
import { getOrCreateTagByCode } from '../lib/api/tags';
import { createSession, listSessionsInRange } from '../lib/api/sessions';
import { createAllocation, completeAllocation } from '../lib/api/allocations';
import { useAuth } from '../lib/auth/AuthProvider';
import type { Player, SessionType, TagSession } from '../lib/types';

type ScanMode = 'out' | 'in';

export function ScanPage() {
  const { session: authSession } = useAuth();
  const authUserId = authSession?.user?.id ?? null;
  const [players, setPlayers] = useState<Player[]>([]);
  const [tagSession, setTagSession] = useState<TagSession | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>('training');
  const [mode, setMode] = useState<ScanMode>('out');
  const [pendingTagId, setPendingTagId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const tagSessionRef = useRef(tagSession);
  useEffect(() => {
    tagSessionRef.current = tagSession;
  });

  useEffect(() => {
    listActivePlayers().then(setPlayers);
  }, []);

  useEffect(() => {
    if (tagSessionRef.current) {
      return;
    }
    setCheckingSession(true);
    if (!authUserId) {
      setCheckingSession(false);
      return;
    }
    const todayDateString = new Date().toISOString().slice(0, 10);
    listSessionsInRange(todayDateString, todayDateString)
      .then((sessions) => {
        const match = sessions.find((session) => session.sessionType === sessionType);
        if (match) {
          setTagSession(match);
        }
        setCheckingSession(false);
      })
      .catch(() => {
        setCheckingSession(false);
      });
  }, [authUserId, sessionType]);

  async function handleStartSession() {
    if (!authSession) return;
    try {
      const created = await createSession(new Date().toISOString().slice(0, 10), sessionType, authSession.user.id);
      setTagSession(created);
    } catch {
      setStatusMessage('Something went wrong — try again.');
    }
  }

  async function handleScan(code: string) {
    if (!tagSession || !authSession) return;
    try {
      const tag = await getOrCreateTagByCode(code);

      if (mode === 'out') {
        setPendingTagId(tag.id);
      } else {
        const completed = await completeAllocation(tagSession.id, tag.id, authSession.user.id);
        if (completed) {
          setStatusMessage(`Tag ${code} checked back in.`);
        } else {
          setStatusMessage(
            `No open allocation found for tag ${code} — was it already checked in, or never checked out?`
          );
        }
      }
    } catch {
      setStatusMessage('Something went wrong — try again.');
    }
  }

  const handleScanRef = useRef(handleScan);
  useEffect(() => {
    handleScanRef.current = handleScan;
  });
  const stableOnScan = useCallback((code: string) => {
    handleScanRef.current(code);
  }, []);

  async function handlePlayerSelected(player: Player) {
    if (!tagSession || !authSession || !pendingTagId) return;
    try {
      await createAllocation(tagSession.id, pendingTagId, player.id, authSession.user.id);
      setStatusMessage(`Tag allocated to ${player.name}.`);
      setPendingTagId(null);
    } catch {
      setStatusMessage('Something went wrong — try again.');
    }
  }

  if (checkingSession) {
    return (
      <main>
        <p>Checking for an existing session...</p>
      </main>
    );
  }

  if (!tagSession) {
    return (
      <main>
        <div className="card">
          <h1>Start Session</h1>
          <label>
            Session type
            <select value={sessionType} onChange={(e) => setSessionType(e.target.value as SessionType)}>
              <option value="training">Training</option>
              <option value="match">Match</option>
              <option value="gym">Gym</option>
              <option value="other">Other</option>
            </select>
          </label>
          <button type="button" className="action-btn" onClick={handleStartSession}>Start session</button>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="card">
        <h1>{tagSession.sessionType} — {tagSession.sessionDate}</h1>
        <div className="toggle-group" role="group" aria-label="Scan mode">
          <button type="button" onClick={() => setMode('out')} aria-pressed={mode === 'out'}>Scan Out</button>
          <button type="button" onClick={() => setMode('in')} aria-pressed={mode === 'in'}>Scan In</button>
        </div>
        {statusMessage && <p role="status">{statusMessage}</p>}
        {pendingTagId ? (
          <PlayerPicker players={players} onSelect={handlePlayerSelected} />
        ) : (
          <div className="viewfinder">
            <QrScanner onScan={stableOnScan} />
          </div>
        )}
      </div>
    </main>
  );
}
