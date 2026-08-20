import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

const listActivePlayersMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue([{ id: 'p1', name: 'Alex Jones', shirtNumber: 7 }])
);
const updateShirtNumberMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../lib/api/players', () => ({
  listActivePlayers: listActivePlayersMock,
  updateShirtNumber: updateShirtNumberMock,
}));

import { RosterPage } from './RosterPage';

describe('RosterPage', () => {
  it('lists players and saves an edited shirt number', async () => {
    render(<RosterPage />);

    await waitFor(() => expect(screen.getByText('Alex Jones')).toBeInTheDocument());

    const input = screen.getByLabelText('Shirt number for Alex Jones');
    await userEvent.clear(input);
    await userEvent.type(input, '10');

    await waitFor(() => expect(updateShirtNumberMock).toHaveBeenCalledWith('p1', 10));
  });
});
