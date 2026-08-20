import { useEffect, useState } from 'react';
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
  const [players, setPlayers] = useState<Player[]>([]);
  const [tagSession, setTagSession] = useState<TagSession | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>('training');
  const [mode, setMode] = useState<ScanMode>('out');
  const [pendingTagId, setPendingTagId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    listActivePlayers().then(setPlayers);
  }, []);

  useEffect(() => {
    if (!authSession) return;
    const todayDateString = new Date().toISOString().slice(0, 10);
    listSessionsInRange(todayDateString, todayDateString).then((sessions) => {
      if (sessions.length > 0) {
        setTagSession(sessions[0]);
      }
    });
  }, [authSession]);

  async function handleStartSession() {
    if (!authSession) return;
    const created = await createSession(new Date().toISOString().slice(0, 10), sessionType, authSession.user.id);
    setTagSession(created);
  }

  async function handleScan(code: string) {
    if (!tagSession || !authSession) return;
    const tag = await getOrCreateTagByCode(code);

    if (mode === 'out') {
      setPendingTagId(tag.id);
    } else {
      await completeAllocation(tagSession.id, tag.id, authSession.user.id);
      setStatusMessage(`Tag ${code} checked back in.`);
    }
  }

  async function handlePlayerSelected(player: Player) {
    if (!tagSession || !authSession || !pendingTagId) return;
    await createAllocation(tagSession.id, pendingTagId, player.id, authSession.user.id);
    setStatusMessage(`Tag allocated to ${player.name}.`);
    setPendingTagId(null);
  }

  if (!tagSession) {
    return (
      <main>
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
        <button type="button" onClick={handleStartSession}>Start session</button>
      </main>
    );
  }

  return (
    <main>
      <h1>{tagSession.sessionType} — {tagSession.sessionDate}</h1>
      <div role="group" aria-label="Scan mode">
        <button type="button" onClick={() => setMode('out')} aria-pressed={mode === 'out'}>Scan Out</button>
        <button type="button" onClick={() => setMode('in')} aria-pressed={mode === 'in'}>Scan In</button>
      </div>
      {statusMessage && <p role="status">{statusMessage}</p>}
      {pendingTagId ? (
        <PlayerPicker players={players} onSelect={handlePlayerSelected} />
      ) : (
        <QrScanner onScan={handleScan} />
      )}
    </main>
  );
}
