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
  inventory: {
    all: ['inventory'] as const,
    lists: () => [...queryKeys.inventory.all, 'list'] as const,
    list: (filters: Record<string, unknown> = {}) => [...queryKeys.inventory.all, 'list', filters] as const,
    details: () => [...queryKeys.inventory.all, 'detail'] as const,
    detail: (variantId: string | number) => [...queryKeys.inventory.all, 'detail', String(variantId)] as const,
    movements: (filters: Record<string, unknown> = {}) => [...queryKeys.inventory.all, 'movements', filters] as const,
    variantMovements: (variantId: string | number, filters: Record<string, unknown> = {}) =>
      [...queryKeys.inventory.all, 'variantMovements', String(variantId), filters] as const,
  },
  purchases: {
    all: ['purchases'] as const,
    lists: () => [...queryKeys.purchases.all, 'list'] as const,
    list: (filters: Record<string, unknown> = {}) => [...queryKeys.purchases.all, 'list', filters] as const,
    details: () => [...queryKeys.purchases.all, 'detail'] as const,
    detail: (id: string | number) => [...queryKeys.purchases.all, 'detail', String(id)] as const,
    returns: (purchaseId: string | number) => [...queryKeys.purchases.all, 'returns', String(purchaseId)] as const,
  },
  supplierFinance: {
    all: ['supplierFinance'] as const,
    accountSummary: (supplierId: string | number) =>
      [...queryKeys.supplierFinance.all, 'accountSummary', String(supplierId)] as const,
    ledger: (supplierId: string | number, filters: Record<string, unknown> = {}) =>
      [...queryKeys.supplierFinance.all, 'ledger', String(supplierId), filters] as const,
    payments: (supplierId: string | number, filters: Record<string, unknown> = {}) =>
      [...queryKeys.supplierFinance.all, 'payments', String(supplierId), filters] as const,
  },
  invoices: {
    all: ['invoices'] as const,
    lists: () => [...queryKeys.invoices.all, 'list'] as const,
    list: (filters: Record<string, unknown> = {}) => [...queryKeys.invoices.all, 'list', filters] as const,
    details: () => [...queryKeys.invoices.all, 'detail'] as const,
    detail: (id: string | number) => [...queryKeys.invoices.all, 'detail', String(id)] as const,
    preview: (payload: Record<string, unknown> = {}) => [...queryKeys.invoices.all, 'preview', payload] as const,
  },
  customerFinance: {
    all: ['customerFinance'] as const,
    accountSummary: (customerId: string | number) =>
      [...queryKeys.customerFinance.all, 'accountSummary', String(customerId)] as const,
    ledger: (customerId: string | number, filters: Record<string, unknown> = {}) =>
      [...queryKeys.customerFinance.all, 'ledger', String(customerId), filters] as const,
    receipts: (customerId: string | number, filters: Record<string, unknown> = {}) =>
      [...queryKeys.customerFinance.all, 'receipts', String(customerId), filters] as const,
    receipt: (receiptId: string | number) =>
      [...queryKeys.customerFinance.all, 'receipt', String(receiptId)] as const,
  },
  dues: {
    all: ['dues'] as const,
    list: (filters: Record<string, unknown> = {}) => [...queryKeys.dues.all, 'list', filters] as const,
    summary: (filters: Record<string, unknown> = {}) => [...queryKeys.dues.all, 'summary', filters] as const,
  },
  invoiceRevisions: {
    all: ['invoiceRevisions'] as const,
    list: (invoiceId: string | number) =>
      [...queryKeys.invoiceRevisions.all, 'list', String(invoiceId)] as const,
    detail: (invoiceId: string | number, revisionId: string | number) =>
      [...queryKeys.invoiceRevisions.all, 'detail', String(invoiceId), String(revisionId)] as const,
    preview: (invoiceId: string | number, payload: Record<string, unknown> = {}) =>
      [...queryKeys.invoiceRevisions.all, 'preview', String(invoiceId), payload] as const,
  },
  customerReturns: {
    all: ['customerReturns'] as const,
    listByInvoice: (invoiceId: string | number) =>
      [...queryKeys.customerReturns.all, 'byInvoice', String(invoiceId)] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.customerReturns.all, 'list', filters] as const,
    detail: (returnId: string | number) =>
      [...queryKeys.customerReturns.all, 'detail', String(returnId)] as const,
    preview: (invoiceId: string | number, payload: Record<string, unknown> = {}) =>
      [...queryKeys.customerReturns.all, 'preview', String(invoiceId), payload] as const,
  },
  customerRefunds: {
    all: ['customerRefunds'] as const,
    listByCustomer: (customerId: string | number, filters: Record<string, unknown> = {}) =>
      [...queryKeys.customerRefunds.all, 'byCustomer', String(customerId), filters] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.customerRefunds.all, 'list', filters] as const,
    detail: (refundId: string | number) =>
      [...queryKeys.customerRefunds.all, 'detail', String(refundId)] as const,
  },
  expenses: {
    all: ['expenses'] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.expenses.all, 'list', filters] as const,
    detail: (id: string | number) =>
      [...queryKeys.expenses.all, 'detail', String(id)] as const,
  },
  reports: {
    all: ['reports'] as const,
    sales: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.reports.all, 'sales', filters] as const,
    purchases: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.reports.all, 'purchases', filters] as const,
    inventory: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.reports.all, 'inventory', filters] as const,
    cashMovements: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.reports.all, 'cashMovements', filters] as const,
    profit: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.reports.all, 'profit', filters] as const,
    productProfit: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.reports.all, 'productProfit', filters] as const,
  },
};
