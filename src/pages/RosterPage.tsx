import { useEffect, useState } from 'react';
import { listActivePlayers, updateShirtNumber } from '../lib/api/players';
import type { Player } from '../lib/types';

export function RosterPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listActivePlayers().then((data) => {
      setPlayers(data);
      setLoading(false);
    });
  }, []);

  async function handleChange(playerId: string, value: string) {
    const shirtNumber = value === '' ? null : Number(value);
    setPlayers((current) =>
      current.map((player) => (player.id === playerId ? { ...player, shirtNumber } : player))
    );
    await updateShirtNumber(playerId, shirtNumber);
  }

  if (loading) return <p>Loading roster...</p>;

  return (
    <main>
      <h1>Squad Roster</h1>
      <table>
        <thead>
          <tr><th>Player</th><th>Shirt number</th></tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id}>
              <td>{player.name}</td>
              <td>
                <input
                  type="number"
                  aria-label={`Shirt number for ${player.name}`}
                  value={player.shirtNumber ?? ''}
                  onChange={(event) => handleChange(player.id, event.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
