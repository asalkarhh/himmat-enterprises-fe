/**
 * Centralized React Query Keys Factory.
 */
export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },
  settings: {
    all: ['settings'] as const,
    shop: () => [...queryKeys.settings.all, 'shop'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (filters: Record<string, unknown> = {}) => [...queryKeys.users.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: (params: Record<string, unknown> = {}) => [...queryKeys.dashboard.all, 'summary', params] as const,
  },
};
