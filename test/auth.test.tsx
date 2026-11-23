import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { authStore } from '../src/api/authStore';
import { authApi } from '../src/api/auth.api';
import { UserSummaryDto } from '../src/types/auth.types';

vi.mock('../src/api/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    getCurrentUser: vi.fn(),
    changePassword: vi.fn(),
  },
}));

const mockUser: UserSummaryDto = {
  id: '1',
  username: 'owner',
  displayName: 'Shop Owner',
  role: 'OWNER',
  isActive: true,
  version: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  permissions: ['ALL'],
};

const TestConsumer: React.FC = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'LOGGED_IN' : 'LOGGED_OUT'}</span>
      <span data-testid="username">{user?.username || 'GUEST'}</span>
      <button
        onClick={() =>
          login({ username: 'owner', password: 'OwnerPassword123!' })
        }
      >
        Trigger Login
      </button>
      <button onClick={logout}>Trigger Logout</button>
    </div>
  );
};

const renderWithProviders = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <TestConsumer />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('Authentication & In-Memory Session Lifecycle', () => {
  beforeEach(() => {
    authStore.clearToken();
    vi.clearAllMocks();
  });

  it('initializes as unauthenticated with no stored token', async () => {
    renderWithProviders();
    expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_OUT');
    expect(screen.getByTestId('username')).toHaveTextContent('GUEST');
    expect(authStore.getToken()).toBeNull();
  });

  it('stores access token in-memory and sets user state upon successful login', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      accessToken: 'signed-mock-jwt-token',
      tokenType: 'Bearer',
      expiresIn: 86400,
      user: mockUser,
    });

    renderWithProviders();
    const user = userEvent.setup();

    await user.click(screen.getByText('Trigger Login'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_IN');
      expect(screen.getByTestId('username')).toHaveTextContent('owner');
    });

    // In-memory token verified
    expect(authStore.getToken()).toBe('signed-mock-jwt-token');
  });

  it('clears session and in-memory token on logout', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      accessToken: 'signed-mock-jwt-token',
      tokenType: 'Bearer',
      expiresIn: 86400,
      user: mockUser,
    });

    renderWithProviders();
    const user = userEvent.setup();

    await user.click(screen.getByText('Trigger Login'));
    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_IN'));

    await user.click(screen.getByText('Trigger Logout'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_OUT');
      expect(screen.getByTestId('username')).toHaveTextContent('GUEST');
    });

    expect(authStore.getToken()).toBeNull();
  });

  it('handles unauthorized event broadcast without infinite loops', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      accessToken: 'signed-mock-jwt-token',
      tokenType: 'Bearer',
      expiresIn: 86400,
      user: mockUser,
    });

    renderWithProviders();
    const user = userEvent.setup();

    await user.click(screen.getByText('Trigger Login'));
    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_IN'));

    // Trigger unauthorized 401 broadcast
    act(() => {
      authStore.notifyUnauthorized();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_OUT');
    });
    expect(authStore.getToken()).toBeNull();
  });
});
