export interface OwnerProfitSummaryDto {
  netRevenue: string; // Decimal string
  cogs: string;
  grossProfit: string;
  grossMarginPct: string;
  operatingExpenses: string;
  netProfit: string;
  coveragePct: string;
  unknownCostSales: string;
}

export interface DashboardSummaryDto {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD

  // Period Sales
  grossSales: string;
  revisionsDelta: string;
  returnsCredit: string;
  netSales: string;
  invoiceCount: number;

  // Collections
  customerReceipts: string;
  customerRefunds: string;
  netCollections: string;
  receiptCount: number;

  // Customer Dues & Receivables
  totalCustomerOutstanding: string;
  overdueCustomerReceivables: string;
  customersWithDuesCount: number;

  // Period Purchases & Payables
  periodPurchases: string;
  periodPurchaseReturns: string;
  netPurchases: string;
  periodSupplierPayments: string;
  periodSupplierRefunds: string;
  totalSupplierOutstanding: string;
  suppliersWithPayablesCount: number;

  // Period Operating Expenses
  periodOperatingExpenses: string;
  expenseCount: number;

  // Inventory Health
  totalVariantsCount: number;
  zeroStockVariantsCount: number;
  lowStockVariantsCount: number;

  // Profit Metrics (Owner only, null for Manager)
  profitSummary: OwnerProfitSummaryDto | null;
}

export interface DashboardFilterParams {
  startDate?: string;
  endDate?: string;
}
