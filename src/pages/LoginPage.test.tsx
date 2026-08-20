// src/pages/LoginPage.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

const signInWithPasswordMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/supabaseClient', () => ({
  supabase: { auth: { signInWithPassword: signInWithPasswordMock } },
}));

import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('signs in with the entered email and password', async () => {
    signInWithPasswordMock.mockResolvedValue({ error: null });
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email'), 'coach@tranmere.test');
    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: 'coach@tranmere.test',
      password: 'secret123',
    });
  });

  it('shows an error message when sign-in fails', async () => {
    signInWithPasswordMock.mockResolvedValue({ error: { message: 'Invalid credentials' } });
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email'), 'coach@tranmere.test');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  });
});
