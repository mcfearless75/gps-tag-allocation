import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PlayerPicker } from './PlayerPicker';

const players = [
  { id: 'p1', name: 'Alex Jones', shirtNumber: 7 },
  { id: 'p2', name: 'Sam Lee', shirtNumber: null },
];

describe('PlayerPicker', () => {
  it('filters players by typed name', async () => {
    render(<PlayerPicker players={players} onSelect={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Search players'), 'Sam');

    expect(screen.getByText('Sam Lee')).toBeInTheDocument();
    expect(screen.queryByText(/Alex Jones/)).not.toBeInTheDocument();
  });

  it('calls onSelect with the chosen player', async () => {
    const onSelect = vi.fn();
    render(<PlayerPicker players={players} onSelect={onSelect} />);

    await userEvent.click(screen.getByText('Alex Jones (#7)'));

    expect(onSelect).toHaveBeenCalledWith(players[0]);
  });
});
