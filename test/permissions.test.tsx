import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../src/contexts/AuthContext';
import { RoleRoute } from '../src/routes/RoleRoute';
import { ProtectedRoute } from '../src/routes/ProtectedRoute';
import { UserSummaryDto } from '../src/types/auth.types';

const ownerUser: UserSummaryDto = {
  id: '1',
  username: 'owner',
  displayName: 'Admin Owner',
  role: 'OWNER',
  isActive: true,
  version: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  permissions: ['ALL'],
};

const managerUser: UserSummaryDto = {
  id: '2',
  username: 'manager',
  displayName: 'Store Manager',
  role: 'MANAGER',
  isActive: true,
  version: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  permissions: ['INVENTORY:READ', 'BILLING:CREATE'],
};

const createMockAuthContext = (user: UserSummaryDto | null) => ({
  user,
  isAuthenticated: !!user,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUserProfile: vi.fn(),
  changePassword: vi.fn(),
  isOwner: user?.role === 'OWNER',
  isManager: user?.role === 'MANAGER',
  hasPermission: (p: string) => user?.permissions.includes(p) || user?.role === 'OWNER',
});

const renderRouteWithContext = (authValue: any, initialRoute: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/login" element={<div>LOGIN_PAGE</div>} />
            <Route path="/forbidden" element={<div>FORBIDDEN_PAGE</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>DASHBOARD_PAGE</div>} />
              <Route element={<RoleRoute allowedRoles={['OWNER']} />}>
                <Route path="/users" element={<div>USERS_PAGE</div>} />
              </Route>
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

describe('Role-Based Access Control & Route Guarding', () => {
  it('redirects unauthenticated users to /login from protected routes', () => {
    renderRouteWithContext(createMockAuthContext(null), '/dashboard');
    expect(screen.getByText('LOGIN_PAGE')).toBeInTheDocument();
  });

  it('allows Owner to access /users administration', () => {
    renderRouteWithContext(createMockAuthContext(ownerUser), '/users');
    expect(screen.getByText('USERS_PAGE')).toBeInTheDocument();
  });

  it('redirects Manager to /forbidden when attempting to access /users', () => {
    renderRouteWithContext(createMockAuthContext(managerUser), '/users');
    expect(screen.getByText('FORBIDDEN_PAGE')).toBeInTheDocument();
  });

  it('allows both Owner and Manager to access /dashboard', () => {
    const { unmount } = renderRouteWithContext(createMockAuthContext(ownerUser), '/dashboard');
    expect(screen.getByText('DASHBOARD_PAGE')).toBeInTheDocument();
    unmount();

    renderRouteWithContext(createMockAuthContext(managerUser), '/dashboard');
    expect(screen.getByText('DASHBOARD_PAGE')).toBeInTheDocument();
  });
});
