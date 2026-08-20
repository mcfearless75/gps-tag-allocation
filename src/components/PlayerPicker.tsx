import { useMemo, useState } from 'react';
import type { Player } from '../lib/types';

interface PlayerPickerProps {
  players: Player[];
  onSelect: (player: Player) => void;
}

export function PlayerPicker({ players, onSelect }: PlayerPickerProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return players;
    return players.filter((player) => player.name.toLowerCase().includes(normalized));
  }, [players, query]);

  return (
    <div>
      <input
        aria-label="Search players"
        placeholder="Search player..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <ul>
        {filtered.map((player) => (
          <li key={player.id} className="roster-row">
            <button type="button" onClick={() => onSelect(player)}>
              {player.name}
              {player.shirtNumber !== null ? ` (#${player.shirtNumber})` : ''}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
