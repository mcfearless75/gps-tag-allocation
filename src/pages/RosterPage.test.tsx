import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('shows an error message instead of loading forever when the roster fails to load', async () => {
    listActivePlayersMock.mockRejectedValueOnce(new Error('network error'));

    render(<RosterPage />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load the roster. Try reloading.")
    );
    expect(screen.queryByText('Loading roster...')).not.toBeInTheDocument();
  });

  it('reverts the shirt number and shows an error when saving fails', async () => {
    updateShirtNumberMock.mockRejectedValueOnce(new Error('network error'));

    render(<RosterPage />);

    await waitFor(() => expect(screen.getByText('Alex Jones')).toBeInTheDocument());

    const input = screen.getByLabelText('Shirt number for Alex Jones') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '10' } });

    await waitFor(() => expect(updateShirtNumberMock).toHaveBeenCalledWith('p1', 10));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        "Couldn't save shirt number for Alex Jones. Try again."
      )
    );
    expect(input.value).toBe('7');
  });
});
