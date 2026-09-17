import { useCallback, useEffect, useRef, useState } from 'react';
import { QrScanner } from '../components/QrScanner';
import { PlayerPicker } from '../components/PlayerPicker';
import { listActivePlayers } from '../lib/api/players';
import { getOrCreateTagByCode } from '../lib/api/tags';
import { createSession, listSessionsInRange } from '../lib/api/sessions';
import { createAllocation, completeAllocation } from '../lib/api/allocations';
import { OPERATOR_ID } from '../lib/operator';
import { stringifySessionNotes } from '../lib/sessionNotes';
import type { Player, SessionType, TagSession } from '../lib/types';

type ScanMode = 'out' | 'in';

function isDuplicateAllocationError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === '23505';
}

export function ScanPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [tagSession, setTagSession] = useState<TagSession | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>('training');
  const [opposition, setOpposition] = useState('');
  const [mode, setMode] = useState<ScanMode>('out');
  const [pendingTagId, setPendingTagId] = useState<string | null>(null);
  const [gpsNumber, setGpsNumber] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const processingScanRef = useRef(false);

  const tagSessionRef = useRef(tagSession);
  useEffect(() => {
    tagSessionRef.current = tagSession;
  });

  useEffect(() => {
    listActivePlayers()
      .then(setPlayers)
      .catch(() => setStatusMessage("Couldn't load the player list. Try reloading."));
  }, []);

  useEffect(() => {
    if (tagSessionRef.current) {
      return;
    }
    setCheckingSession(true);
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
  }, [sessionType]);

  async function handleStartSession() {
    try {
      const notes =
        sessionType === 'match' && opposition.trim()
          ? stringifySessionNotes({
              team: 'TR Prem',
              opposition: opposition.trim(),
              firstKick: '',
              firstEnd: '',
              secondKick: '',
              secondEnd: '',
            })
          : null;
      const created = await createSession(
        new Date().toISOString().slice(0, 10),
        sessionType,
        OPERATOR_ID,
        notes
      );
      setTagSession(created);
    } catch {
      setStatusMessage('Something went wrong — try again.');
    }
  }

  async function handleScan(code: string) {
    if (!tagSession) return;
    if (processingScanRef.current) return;
    processingScanRef.current = true;
    try {
      const tag = await getOrCreateTagByCode(code);

      if (mode === 'out') {
        setPendingTagId(tag.id);
      } else {
        const completed = await completeAllocation(tagSession.id, tag.id, OPERATOR_ID);
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
    } finally {
      processingScanRef.current = false;
    }
  }

  const handleScanRef = useRef(handleScan);
  useEffect(() => {
    handleScanRef.current = handleScan;
  });
  const stableOnScan = useCallback((code: string) => {
    handleScanRef.current(code);
  }, []);

  function handleScanError(error: unknown) {
    const description = error instanceof Error ? error.message : String(error);
    const message = /NotAllowedError|Permission/i.test(description)
      ? "Camera access was blocked. Allow camera permission for this site in your browser settings, then reload."
      : "Couldn't start the camera. Make sure no other app is using it, then reload the page.";
    setStatusMessage(message);
  }

  const handleScanErrorRef = useRef(handleScanError);
  useEffect(() => {
    handleScanErrorRef.current = handleScanError;
  });
  const stableOnError = useCallback((error: unknown) => {
    handleScanErrorRef.current(error);
  }, []);

  async function handlePlayerSelected(player: Player) {
    if (!tagSession || !pendingTagId) return;
    const parsed = gpsNumber.trim() === '' ? null : Number(gpsNumber);
    const number = parsed != null && Number.isFinite(parsed) ? parsed : null;
    try {
      await createAllocation(tagSession.id, pendingTagId, player.id, OPERATOR_ID, number);
      setStatusMessage(
        number != null
          ? `GPS ${number} → ${player.name}. Scan the next pod.`
          : `Tag allocated to ${player.name}.`
      );
      setPendingTagId(null);
      setGpsNumber('');
    } catch (err) {
      if (isDuplicateAllocationError(err)) {
        setStatusMessage(
          "That tag has already been used in this session and can't be reissued — scan a different tag."
        );
        setPendingTagId(null);
        setGpsNumber('');
      } else {
        setStatusMessage('Something went wrong — try again.');
      }
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
          <p className="roster-hint">GPS numbers change every game. Scan out to assign a pod, scan in when you collect it.</p>
          <label>
            Session type
            <select value={sessionType} onChange={(e) => setSessionType(e.target.value as SessionType)}>
              <option value="training">Training</option>
              <option value="match">Match</option>
              <option value="gym">Gym</option>
              <option value="other">Other</option>
            </select>
          </label>
          {sessionType === 'match' && (
            <label>
              Opposition
              <input
                value={opposition}
                onChange={(e) => setOpposition(e.target.value)}
                placeholder="Oldham"
              />
            </label>
          )}
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
        <div className="viewfinder" hidden={pendingTagId !== null}>
          <QrScanner onScan={stableOnScan} onError={stableOnError} paused={pendingTagId !== null} />
        </div>
        {pendingTagId && (
          <>
            <label>
              GPS number this game (16–30)
              <input
                type="number"
                inputMode="numeric"
                aria-label="GPS number this game"
                placeholder="27"
                value={gpsNumber}
                onChange={(e) => setGpsNumber(e.target.value)}
              />
            </label>
            <p className="roster-hint">This number is for today only. Then pick the player.</p>
            <PlayerPicker players={players} onSelect={handlePlayerSelected} />
          </>
        )}
        <a href="/sheet" className="home-link-title">Open Catapult sheet</a>
      </div>
    </main>
  );
}
