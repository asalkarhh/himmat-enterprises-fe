import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContextType, ChangePasswordRequest, LoginRequest, UserSummaryDto } from '../types/auth.types';
import { authStore } from '../api/authStore';
import { authApi } from '../api/auth.api';

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Clear state and query cache on logout or 401
  const logout = useCallback(() => {
    authStore.clearToken();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Handle unauthorized session expiration broadcast
  useEffect(() => {
    const unsubscribe = authStore.onUnauthorized(() => {
      setUser(null);
      queryClient.clear();
    });
    return unsubscribe;
  }, [queryClient]);

  // Initial session hydration: if in-memory token exists (e.g. during test setup or session reuse)
  useEffect(() => {
    let isMounted = true;
    const hydrateSession = async () => {
      if (!authStore.hasToken()) {
        if (isMounted) setIsLoading(false);
        return;
      }
      try {
        const currentUser = await authApi.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch {
        if (isMounted) {
          authStore.clearToken();
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    hydrateSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(
    async (credentials: LoginRequest): Promise<UserSummaryDto> => {
      // Clear previous query cache before authenticating new user
      queryClient.clear();
      const response = await authApi.login(credentials);
      authStore.setToken(response.accessToken);
      setUser(response.user);
      return response.user;
    },
    [queryClient]
  );

  const refreshUserProfile = useCallback(async (): Promise<UserSummaryDto | null> => {
    if (!authStore.hasToken()) return null;
    try {
      const refreshedUser = await authApi.getCurrentUser();
      setUser(refreshedUser);
      return refreshedUser;
    } catch {
      return null;
    }
  }, []);

  const changePassword = useCallback(
    async (data: ChangePasswordRequest): Promise<void> => {
      await authApi.changePassword(data);
      // Backend invalidates active tokens after password change; log user out cleanly
      logout();
    },
    [logout]
  );

  const isOwner = useMemo(() => user?.role === 'OWNER', [user]);
  const isManager = useMemo(() => user?.role === 'MANAGER', [user]);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      if (user.role === 'OWNER') return true;
      return user.permissions?.includes(permission) ?? false;
    },
    [user]
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user && authStore.hasToken(),
      isLoading,
      login,
      logout,
      refreshUserProfile,
      changePassword,
      isOwner,
      isManager,
      hasPermission,
    }),
    [user, isLoading, login, logout, refreshUserProfile, changePassword, isOwner, isManager, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
