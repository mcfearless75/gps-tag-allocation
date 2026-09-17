import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

const listActivePlayersMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue([{ id: 'p1', name: 'Alex Jones', shirtNumber: 7, catapultCode: null }])
);
const updateShirtNumberMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const updateCatapultCodeMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const listAddablePlayersMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue([{ id: 'p2', name: 'Sam Lee', shirtNumber: null, catapultCode: null }])
);
const addRosterMemberMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const removeRosterMemberMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../lib/api/players', () => ({
  listActivePlayers: listActivePlayersMock,
  updateShirtNumber: updateShirtNumberMock,
  updateCatapultCode: updateCatapultCodeMock,
  listAddablePlayers: listAddablePlayersMock,
  addRosterMember: addRosterMemberMock,
  removeRosterMember: removeRosterMemberMock,
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

  it('saves a Catapult code on blur', async () => {
    render(<RosterPage />);

    await waitFor(() => expect(screen.getByText('Alex Jones')).toBeInTheDocument());

    const input = screen.getByLabelText('Catapult code for Alex Jones');
    fireEvent.change(input, { target: { value: 'Tranmere P27' } });
    fireEvent.blur(input);

    await waitFor(() => expect(updateCatapultCodeMock).toHaveBeenCalledWith('p1', 'Tranmere P27'));
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

  it('removes a player from the roster', async () => {
    render(<RosterPage />);

    await waitFor(() => expect(screen.getByText('Alex Jones')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Remove Alex Jones from roster'));

    expect(removeRosterMemberMock).toHaveBeenCalledWith('p1');
    await waitFor(() => expect(screen.queryByText('Alex Jones')).not.toBeInTheDocument());
  });

  it('reverts and shows an error when removing a player fails', async () => {
    removeRosterMemberMock.mockRejectedValueOnce(new Error('network error'));
    render(<RosterPage />);

    await waitFor(() => expect(screen.getByText('Alex Jones')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Remove Alex Jones from roster'));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        "Couldn't remove Alex Jones from the roster. Try again."
      )
    );
    expect(screen.getByText('Alex Jones')).toBeInTheDocument();
  });

  it('adds a player to the roster from the add panel', async () => {
    render(<RosterPage />);

    await waitFor(() => expect(screen.getByText('Alex Jones')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: '+ Add player' }));

    await waitFor(() => expect(screen.getByText('Sam Lee')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Sam Lee'));

    expect(addRosterMemberMock).toHaveBeenCalledWith('p2');
    await waitFor(() => expect(screen.getAllByText('Sam Lee')).toHaveLength(1));
    expect(screen.getByText('Sam Lee').closest('.roster-row')).not.toBeNull();
  });

  it('reverts and shows an error when adding a player fails', async () => {
    addRosterMemberMock.mockRejectedValueOnce(new Error('network error'));
    render(<RosterPage />);

    await waitFor(() => expect(screen.getByText('Alex Jones')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: '+ Add player' }));
    await waitFor(() => expect(screen.getByText('Sam Lee')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Sam Lee'));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        "Couldn't add Sam Lee to the roster. Try again."
      )
    );
  });
});
