import { useEffect, useState } from 'react';
import { listActivePlayers, updateShirtNumber } from '../lib/api/players';
import type { Player } from '../lib/types';

export function RosterPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  if (loading) return <main><p>Loading roster...</p></main>;
  if (error) return <main><p role="alert">{error}</p></main>;

  return (
    <main>
      <h1>Squad Roster</h1>
      {saveError && <p role="alert">{saveError}</p>}
      <div className="card">
        {players.map((player) => (
          <div key={player.id} className="roster-row">
            <span>{player.name}</span>
            <span className="roster-row-label">Shirt #</span>
            <input
              type="number"
              aria-label={`Shirt number for ${player.name}`}
              value={player.shirtNumber ?? ''}
              onChange={(event) => handleChange(player.id, event.target.value)}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
