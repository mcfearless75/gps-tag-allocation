import { useCallback, useEffect, useRef, useState } from 'react';
import { QrScanner } from '../components/QrScanner';
import { PlayerPicker } from '../components/PlayerPicker';
import { listActivePlayers } from '../lib/api/players';
import { getOrCreateTagByCode } from '../lib/api/tags';
import { createSession, listSessionsInRange } from '../lib/api/sessions';
import { createAllocation, completeAllocation } from '../lib/api/allocations';
import { OPERATOR_ID } from '../lib/operator';
import type { Player, SessionType, TagSession } from '../lib/types';

type ScanMode = 'out' | 'in';

// Postgres unique_violation. gps_tag_allocations has unique(session_id, tag_id) — by design,
// a tag can only ever be allocated once per session (see the migration for why), even after
// being scanned back in. Detecting this specific code lets us show a clear, actionable
// message instead of the generic catch-all for what is actually expected, well-understood
// behavior, not a transient failure worth retrying.
function isDuplicateAllocationError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === '23505';
}

export function ScanPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [tagSession, setTagSession] = useState<TagSession | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>('training');
  const [mode, setMode] = useState<ScanMode>('out');
  const [pendingTagId, setPendingTagId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const processingScanRef = useRef(false);

  // Mirrors tagSession into a ref (same pattern as handleScanRef below) so the resume-check
  // effect can read the latest value without adding it to its own dependency array — adding
  // it directly would re-run the effect (and re-arm checkingSession) every time a session
  // starts, including as a result of this very effect resuming one.
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
    // Once a session is already active there's nothing left to "resume" or protect
    // against duplicating — this check's entire purpose is choosing what to show
    // *before* a session exists. Skip entirely (without touching checkingSession) once
    // one is active.
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
    // Re-runs if the user changes the session type before starting, so switching the
    // dropdown to a type that already has a session today resumes it instead of risking
    // a duplicate create. Once a session is resumed/created the dropdown is no longer
    // shown, so sessionType can't change again and this won't re-trigger — and the
    // tagSessionRef guard above independently no-ops any re-run once a session is active.
  }, [sessionType]);

  async function handleStartSession() {
    try {
      const created = await createSession(new Date().toISOString().slice(0, 10), sessionType, OPERATOR_ID);
      setTagSession(created);
    } catch {
      setStatusMessage('Something went wrong — try again.');
    }
  }

  async function handleScan(code: string) {
    if (!tagSession) return;
    // Guards against overlapping scans being processed concurrently — e.g. the same tag
    // decoded twice a moment apart before the scanner's own debounce/pause catches up.
    // Without this, two concurrent getOrCreateTagByCode calls for the same brand-new code
    // could both proceed at once (belt-and-braces alongside the upsert fix in tags.ts, which
    // covers the same race at the DB layer in case two calls slip through anyway).
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
    // html5-qrcode doesn't consistently throw Error instances — camera failures often come
    // through as plain strings (e.g. "Error getting userMedia, error = NotAllowedError: ...").
    // Stringify whatever we got rather than assuming a shape.
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
    try {
      await createAllocation(tagSession.id, pendingTagId, player.id, OPERATOR_ID);
      setStatusMessage(`Tag allocated to ${player.name}.`);
      setPendingTagId(null);
    } catch (err) {
      if (isDuplicateAllocationError(err)) {
        // Retrying (picking a different player) can't fix this — the block is on this
        // specific tag within this session, not on the player — so send them back to the
        // scanner for a different tag rather than leaving them stuck on the player picker.
        setStatusMessage(
          "That tag has already been used in this session and can't be reissued — scan a different tag."
        );
        setPendingTagId(null);
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
        {/* QrScanner stays mounted for the whole session instead of being torn down and
            recreated between scans (paused, not unmounted, while picking a player) — a fresh
            camera request on every single scan was what forced an extra tap before each one. */}
        <div className="viewfinder" hidden={pendingTagId !== null}>
          <QrScanner onScan={stableOnScan} onError={stableOnError} paused={pendingTagId !== null} />
        </div>
        {pendingTagId && <PlayerPicker players={players} onSelect={handlePlayerSelected} />}
      </div>
    </main>
  );
}
