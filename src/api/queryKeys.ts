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
    detail: (id: string | number) => [...queryKeys.users.all, 'detail', String(id)] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: (params: Record<string, unknown> = {}) => [...queryKeys.dashboard.all, 'summary', params] as const,
  },
  brands: {
    all: ['brands'] as const,
    list: (filters: Record<string, unknown> = {}) => [...queryKeys.brands.all, 'list', filters] as const,
    detail: (id: string | number) => [...queryKeys.brands.all, 'detail', String(id)] as const,
  },
  categories: {
    all: ['categories'] as const,
    list: (filters: Record<string, unknown> = {}) => [...queryKeys.categories.all, 'list', filters] as const,
    detail: (id: string | number) => [...queryKeys.categories.all, 'detail', String(id)] as const,
  },
  subcategories: {
    all: ['subcategories'] as const,
    list: (filters: Record<string, unknown> = {}) => [...queryKeys.subcategories.all, 'list', filters] as const,
    detail: (id: string | number) => [...queryKeys.subcategories.all, 'detail', String(id)] as const,
  },
  products: {
    all: ['products'] as const,
    list: (filters: Record<string, unknown> = {}) => [...queryKeys.products.all, 'list', filters] as const,
    detail: (id: string | number) => [...queryKeys.products.all, 'detail', String(id)] as const,
  },
  variants: {
    all: ['variants'] as const,
    list: (filters: Record<string, unknown> = {}) => [...queryKeys.variants.all, 'list', filters] as const,
    detail: (id: string | number) => [...queryKeys.variants.all, 'detail', String(id)] as const,
  },
  pricing: {
    all: ['pricing'] as const,
    preview: (params: Record<string, unknown> = {}) => [...queryKeys.pricing.all, 'preview', params] as const,
  },
};
