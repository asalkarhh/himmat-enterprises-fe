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
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters: Record<string, unknown> = {}) => [...queryKeys.customers.all, 'list', filters] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string | number) => [...queryKeys.customers.all, 'detail', String(id)] as const,
  },
  customerSites: {
    all: ['customerSites'] as const,
    lists: (customerId: string | number) => [...queryKeys.customerSites.all, 'list', String(customerId)] as const,
    list: (customerId: string | number, filters: Record<string, unknown> = {}) =>
      [...queryKeys.customerSites.all, 'list', String(customerId), filters] as const,
    details: () => [...queryKeys.customerSites.all, 'detail'] as const,
    detail: (customerId: string | number, siteId: string | number) =>
      [...queryKeys.customerSites.all, 'detail', String(customerId), String(siteId)] as const,
  },
  suppliers: {
    all: ['suppliers'] as const,
    lists: () => [...queryKeys.suppliers.all, 'list'] as const,
    list: (filters: Record<string, unknown> = {}) => [...queryKeys.suppliers.all, 'list', filters] as const,
    details: () => [...queryKeys.suppliers.all, 'detail'] as const,
    detail: (id: string | number) => [...queryKeys.suppliers.all, 'detail', String(id)] as const,
  },
};
