import { useEffect, useState } from 'react';
import {
  addRosterMember,
  importAllStudents,
  listActivePlayers,
  listAddablePlayers,
  removeRosterMember,
  updateCatapultCode,
  updateShirtNumber,
} from '../lib/api/players';
import type { Player } from '../lib/types';
import { PlayerPicker } from '../components/PlayerPicker';

function byName(a: Player, b: Player) {
  return a.name.localeCompare(b.name);
}

function yearOf(player: Player) {
  return player.yearGroup === 2 ? 2 : 1;
}

export function RosterPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [addablePlayers, setAddablePlayers] = useState<Player[]>([]);
  const [addableLoading, setAddableLoading] = useState(false);
  const [addableError, setAddableError] = useState<string | null>(null);

  useEffect(() => {
    listActivePlayers()
      .then((data) => {
        setPlayers(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Couldn't load the roster. Try reloading.");
        setLoading(false);
      });
  }, []);

  async function handleChange(playerId: string, value: string) {
    const shirtNumber = value === '' ? null : Number(value);
    const player = players.find((p) => p.id === playerId);
    const previousShirtNumber = player?.shirtNumber ?? null;

    setSaveError(null);
    setPlayers((current) =>
      current.map((p) => (p.id === playerId ? { ...p, shirtNumber } : p))
    );

    try {
      await updateShirtNumber(playerId, shirtNumber);
    } catch {
      setPlayers((current) =>
        current.map((p) => (p.id === playerId ? { ...p, shirtNumber: previousShirtNumber } : p))
      );
      setSaveError(`Couldn't save shirt number for ${player?.name ?? 'this player'}. Try again.`);
    }
  }

  async function handleCatapultChange(playerId: string, value: string) {
    const catapultCode = value.trim() === '' ? null : value.trim();
    const player = players.find((p) => p.id === playerId);
    const previous = player?.catapultCode ?? null;

    setSaveError(null);
    setPlayers((current) =>
      current.map((p) => (p.id === playerId ? { ...p, catapultCode } : p))
    );

    try {
      await updateCatapultCode(playerId, catapultCode);
    } catch {
      setPlayers((current) =>
        current.map((p) => (p.id === playerId ? { ...p, catapultCode: previous } : p))
      );
      setSaveError(`Couldn't save Catapult code for ${player?.name ?? 'this player'}. Try again.`);
    }
  }

  async function handleRemove(playerId: string) {
    const player = players.find((p) => p.id === playerId);
    if (!player) return;

    setSaveError(null);
    setPlayers((current) => current.filter((p) => p.id !== playerId));

    try {
      await removeRosterMember(playerId);
      setAddablePlayers((current) => [...current, player].sort(byName));
    } catch {
      setPlayers((current) => [...current, player].sort(byName));
      setSaveError(`Couldn't remove ${player.name} from the roster. Try again.`);
    }
  }

  async function handleOpenAddPanel() {
    setAddPanelOpen(true);
    setAddableLoading(true);
    setAddableError(null);

    try {
      const activeIds = new Set(players.map((p) => p.id));
      const data = await listAddablePlayers();
      setAddablePlayers(data.filter((p) => !activeIds.has(p.id)));
    } catch {
      setAddableError("Couldn't load players to add. Try again.");
    } finally {
      setAddableLoading(false);
    }
  }

  async function handleAdd(player: Player) {
    setSaveError(null);
    setAddablePlayers((current) => current.filter((p) => p.id !== player.id));
    setPlayers((current) => [...current, player].sort(byName));

    try {
      await addRosterMember(player.id);
    } catch {
      setPlayers((current) => current.filter((p) => p.id !== player.id));
      setAddablePlayers((current) => [...current, player].sort(byName));
      setSaveError(`Couldn't add ${player.name} to the roster. Try again.`);
    }
  }

  async function handleImportAll() {
    setImporting(true);
    setSaveError(null);
    try {
      await importAllStudents();
      const data = await listActivePlayers();
      setPlayers(data);
    } catch {
      setSaveError("Couldn't import the academy roster. Run the year-group SQL in Supabase first, then retry.");
    } finally {
      setImporting(false);
    }
  }

  if (loading) return <main><p>Loading roster...</p></main>;
  if (error) return <main><p role="alert">{error}</p></main>;

  const year1 = players.filter((p) => yearOf(p) === 1).sort(byName);
  const year2 = players.filter((p) => yearOf(p) === 2).sort(byName);

  function renderCard(title: string, list: Player[]) {
    return (
      <div className="card roster-year-card">
        <h2>{title}</h2>
        <p className="roster-year-count">{list.length} player{list.length === 1 ? '' : 's'}</p>
        {list.length === 0 && <p className="roster-hint">No players in this year yet.</p>}
        {list.map((player) => (
          <div key={player.id} className="roster-row">
            <span className="roster-row-name">{player.name}</span>
            <span className="roster-row-input">
              <span className="roster-row-label">Kit #</span>
              <input
                type="number"
                aria-label={`Shirt number for ${player.name}`}
                value={player.shirtNumber ?? ''}
                onChange={(event) => handleChange(player.id, event.target.value)}
              />
              <span className="roster-row-label">Catapult</span>
              <input
                type="text"
                aria-label={`Catapult code for ${player.name}`}
                placeholder="optional"
                value={player.catapultCode ?? ''}
                onBlur={(event) => handleCatapultChange(player.id, event.target.value)}
                onChange={(event) =>
                  setPlayers((current) =>
                    current.map((p) =>
                      p.id === player.id ? { ...p, catapultCode: event.target.value } : p
                    )
                  )
                }
              />
              <button
                type="button"
                className="roster-remove-btn"
                aria-label={`Remove ${player.name} from roster`}
                onClick={() => handleRemove(player.id)}
              >
                Remove
              </button>
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <main className="roster-page">
      <h1>Squad Roster</h1>
      <p className="roster-hint">
        Year 1 left, Year 2 right — same groups as Tracker. Kit # is the shirt, not the GPS unit.
      </p>
      {saveError && <p role="alert">{saveError}</p>}
      <div className="roster-actions no-print">
        <button type="button" className="action-btn accent" onClick={handleImportAll} disabled={importing}>
          {importing ? 'Importing…' : 'Import all Y1 + Y2'}
        </button>
      </div>
      <div className="roster-split">
        {renderCard('Year 1', year1)}
        {renderCard('Year 2', year2)}
      </div>

      {!addPanelOpen && (
        <button type="button" className="action-btn" onClick={handleOpenAddPanel}>
          + Add player
        </button>
      )}

      {addPanelOpen && (
        <div className="card">
          <h2>Add player</h2>
          {addableError && <p role="alert">{addableError}</p>}
          {addableLoading ? (
            <p>Loading players...</p>
          ) : (
            <PlayerPicker players={addablePlayers} onSelect={handleAdd} />
          )}
        </div>
      )}
    </main>
  );
}
