import { PaymentMethod } from './purchase.types';

export type ReportingBasis = 'ACTIVITY' | 'DOCUMENT';

// ==========================================
// 1. SALES REPORT
// ==========================================

export interface SalesRowItemDto {
  documentNumber: string;
  documentDate: string; // YYYY-MM-DD
  customerId: string; // BIGINT serialized as string
  customerName: string;
  type: 'INVOICE' | 'REVISION' | 'RETURN' | string;
  grossOrDeltaAmount: string;
  returnsAmount: string;
  netAmount: string;
  taxableAmount: string;
  taxAmount: string;
}

export interface SalesReportDto {
  startDate?: string | null;
  endDate?: string | null;
  basis: ReportingBasis;
  totalGrossSales: string;
  totalRevisionsDelta: string;
  totalReturnsCredit: string;
  totalNetSales: string;
  totalTaxableAmount: string;
  totalTaxAmount: string;
  unknownTaxSales: string;
  items: SalesRowItemDto[];
}

export interface SalesReportFilterParams {
  startDate?: string;
  endDate?: string;
  basis?: ReportingBasis;
  customerId?: string | number;
}

// ==========================================
// 2. PURCHASE REPORT
// ==========================================

export interface PurchaseRowItemDto {
  documentNumber: string;
  documentDate: string; // YYYY-MM-DD
  supplierId: string; // BIGINT serialized as string
  supplierName: string;
  type: 'PURCHASE' | 'PURCHASE_RETURN' | string;
  supplierInvoiceNumber?: string | null;
  grossOrDeltaAmount: string;
  taxableAmount: string;
  taxAmount: string;
}

export interface PurchaseReportDto {
  startDate?: string | null;
  endDate?: string | null;
  totalGrossPurchases: string;
  totalPurchaseReturns: string;
  totalNetPurchases: string;
  totalSupplierPayments: string;
  totalSupplierRefunds: string;
  totalTaxableAmount: string;
  totalTaxAmount: string;
  items: PurchaseRowItemDto[];
}

export interface PurchaseReportFilterParams {
  startDate?: string;
  endDate?: string;
  supplierId?: string | number;
}

// ==========================================
// 3. INVENTORY REPORT
// ==========================================

export interface InventoryReportRowDto {
  variantId: string; // BIGINT serialized as string
  productId: string;
  sku: string;
  productName: string;
  sizeLabel: string;
  brandName: string;
  categoryName: string;
  subcategoryName?: string | null;
  currentQuantity: number;
  reorderLevel?: number | null;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | string;
  purchaseCostExclTax?: string | null;
  costAvailable: boolean;
  valuationAmount: string;
}

export interface InventoryReportDto {
  totalVariants: number;
  totalStockQuantity: number;
  totalStockValuation: string;
  zeroStockCount: number;
  lowStockCount: number;
  items: InventoryReportRowDto[];
}

export interface InventoryReportFilterParams {
  zeroStockOnly?: boolean;
  lowStockOnly?: boolean;
  brandId?: string | number;
  categoryId?: string | number;
  search?: string;
}

// ==========================================
// 4. CASH MOVEMENTS REPORT
// ==========================================

export interface CashMovementItemDto {
  date: string; // YYYY-MM-DD
  movementType: 'IN' | 'OUT' | string;
  sourceType:
    | 'CUSTOMER_RECEIPT'
    | 'SUPPLIER_REFUND'
    | 'SUPPLIER_PAYMENT'
    | 'CUSTOMER_REFUND'
    | 'OPERATIONAL_EXPENSE'
    | string;
  sourceNumber: string;
  partyName?: string | null;
  method: PaymentMethod;
  amount: string;
  reference?: string | null;
}

export interface CashMovementReportDto {
  startDate?: string | null;
  endDate?: string | null;
  totalCashIn: string;
  totalCashOut: string;
  netCashMovement: string;
  totalOnlineIn: string;
  totalOnlineOut: string;
  netOnlineMovement: string;
  grandTotalIn: string;
  grandTotalOut: string;
  netCashflow: string;
  items: CashMovementItemDto[];
}

export interface CashMovementReportFilterParams {
  startDate?: string;
  endDate?: string;
  paymentMethod?: PaymentMethod;
}

// ==========================================
// 5. PROFIT REPORT (OWNER ONLY)
// ==========================================

export interface ProductProfitItemDto {
  variantId: string; // BIGINT serialized as string
  productId: string;
  sku: string;
  productName: string;
  sizeLabel: string;
  brandName: string;
  categoryName: string;
  quantitySold: number;
  quantityReturned: number;
  netQuantity: number;
  netRevenue: string;
  netCogs: string;
  grossProfit: string;
  grossMarginPct: string;
  costAvailable: boolean;
}

export interface ProfitReportDto {
  startDate?: string | null;
  endDate?: string | null;
  knownNetRevenue: string;
  knownCogs: string;
  knownGrossProfit: string;
  knownGrossMarginPct: string;
  salesValueExcludedUnknownCost: string;
  totalNetSales: string;
  costCoveragePct: string;
  totalOperatingExpenses: string;
  estimatedNetProfit: string;
  productBreakdown: ProductProfitItemDto[];
}

export interface ProfitReportFilterParams {
  startDate?: string;
  endDate?: string;
  variantId?: string | number;
  productId?: string | number;
  brandId?: string | number;
  categoryId?: string | number;
}
