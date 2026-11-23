/**
 * Billing, Sales Invoices, Customer Receipts, Allocations & Dues Types
 * matching Himmat BE05 and BE06 contracts.
 */

import { PageResponse } from './api.types';
import { PricingMethod } from './catalog.types';
import { PaymentComponentDto } from './purchase.types';

export type InvoiceDisplayFormat = 'NORMAL' | 'GST';

export type InvoiceStatus = 'POSTED' | 'CANCELLED';

export type SettlementStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export type CustomerLedgerSourceType = 'INVOICE' | 'RECEIPT' | 'CUSTOMER_RETURN' | 'REFUND';

export interface InvoiceLineRequest {
  variantId: string | number;
  quantity: number; // Positive whole integer >= 1
  unitPriceOverride?: string | number | null; // Optional manual unit price override
  discountPct?: string | number | null; // Overridable discount % (0 to 100)
  overrideReason?: string | null; // Required if unitPriceOverride is provided
  expectedVariantVersion?: number | null;
}

export interface InvoicePreviewLineDto {
  variantId: string;
  sku: string;
  productName: string;
  sizeLabel: string;
  pricingMethod: PricingMethod;
  quantity: number;
  baseUnitPrice: string;
  discountPct: string;
  discountSource: string;
  unitNetPrice: string;
  lineTotal: string;
  gstRatePct: string | null;
  taxableAmount: string | null;
  taxAmount: string | null;
  taxBreakdownAvailable: boolean;
  purchaseCostExclTax?: string | null;
  costAvailable: boolean;
  isPriceOverridden: boolean;
  overrideReason?: string | null;
  variantVersion?: number;
  warnings: string[];
}

export interface InvoicePreviewRequest {
  customerId: string | number;
  siteId?: string | number | null;
  displayFormat?: InvoiceDisplayFormat;
  lines: InvoiceLineRequest[];
}

export interface InvoicePreviewResponseDto {
  customerId: string;
  customerName: string;
  siteId?: string | null;
  siteName?: string | null;
  displayFormat: InvoiceDisplayFormat;
  lines: InvoicePreviewLineDto[];
  grossTotal: string;
  totalDiscountAmount: string;
  totalTaxableAmount: string | null;
  totalTaxAmount: string | null;
  totalPayableAmount: string;
  taxBreakdownAvailable: boolean;
  pricingFingerprint: string;
  warnings: string[];
  gstFormatCompletenessWarning: boolean;
}

export interface CreateInvoiceRequest {
  customerId: string | number;
  siteId?: string | number | null;
  invoiceDate?: string | null; // YYYY-MM-DD (max today)
  displayFormat?: InvoiceDisplayFormat;
  notes?: string | null;
  lines: InvoiceLineRequest[];
  pricingFingerprint?: string | null;
  receiptComponents?: PaymentComponentDto[] | null;
  applyAdvanceAmount?: string | number | null;
}

export interface InvoiceLineDto {
  id: string; // BIGINT serialized as string
  variantId: string;
  lineIndex: number;
  productName: string;
  sku: string;
  sizeLabel: string;
  pricingMethod: PricingMethod;
  quantity: number;
  baseUnitPrice: string;
  discountPct: string;
  discountSource: string;
  unitNetPrice: string;
  lineTotal: string;
  returnedQuantity: number;
  remainingReturnableQuantity: number;
  isActiveInCurrentRevision?: boolean;
  isPriceOverridden: boolean;
  overrideReason?: string | null;
  gstRatePct: string | null;
  taxableAmount: string | null;
  taxAmount: string | null;
  taxBreakdownAvailable: boolean;
  purchaseCostExclTax?: string | null;
  costAvailable: boolean;
}

export interface InvoiceAllocationRequest {
  invoiceId: string | number;
  amount: string | number;
}

export interface ReceiptAllocationDto {
  id: string; // BIGINT serialized as string
  receiptId: string;
  receiptNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  allocatedAmount: string;
  createdAt: string;
}

export interface InvoiceResponseDto {
  id: string; // BIGINT serialized as string
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  customerGstin?: string | null;
  customerAddress?: string | null;
  siteId?: string | null;
  siteName?: string | null;
  siteAddress?: string | null;
  invoiceDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD (original invoiceDate + 30 days)
  displayFormat: InvoiceDisplayFormat;
  status: InvoiceStatus;
  settlementStatus: SettlementStatus;
  subtotalExclTax: string | null;
  totalDiscountAmount: string;
  totalTaxableAmount: string | null;
  totalGstAmount: string | null;
  totalPayableAmount: string;
  originalPayableAmount: string;
  totalReturnedAmount: string;
  effectivePayableAmount: string;
  revisionCount: number;
  totalAllocatedAmount: string;
  outstandingAmount: string;
  taxBreakdownAvailable: boolean;
  pricingFingerprint: string;
  notes?: string | null;
  isOverdue: boolean;
  daysOverdue: number;
  lines: InvoiceLineDto[];
  allocations: ReceiptAllocationDto[];
  businessEventId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface InvoiceFilterParams {
  customerId?: string | number;
  siteId?: string | number;
  status?: InvoiceStatus;
  settlementStatus?: SettlementStatus;
  displayFormat?: InvoiceDisplayFormat;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  overdueOnly?: boolean;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface CreateCustomerReceiptRequest {
  receiptDate?: string | null; // YYYY-MM-DD
  totalAmount: string; // Decimal string > 0
  notes?: string | null;
  components: PaymentComponentDto[];
  allocations?: InvoiceAllocationRequest[] | null;
}

export interface CustomerReceiptResponseDto {
  id: string; // BIGINT serialized as string
  receiptNumber: string;
  customerId: string;
  customerName: string;
  receiptDate: string;
  totalAmount: string;
  unallocatedAmount: string;
  notes?: string | null;
  components: PaymentComponentDto[];
  allocations: ReceiptAllocationDto[];
  version: number;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CustomerReceiptFilterParams {
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

export interface CustomerAllocationItemRequest {
  receiptId: string | number;
  invoiceId: string | number;
  amount: string | number;
}

export interface ApplyCustomerAllocationRequest {
  allocations: CustomerAllocationItemRequest[];
}

export interface CustomerAccountSummaryDto {
  customerId: string;
  customerCode: string;
  customerName: string;

  /**
   * Positive = Customer owes shop (Receivable / Dr)
   * Negative = Shop owes customer or holds advance (Credit / Cr)
   */
  currentBalance: string;

  totalInvoiced: string;
  totalReceipts: string;
  totalReturned: string;
  totalRefunded: string;
  unallocatedCredit: string;
  outstandingDues: string;
}

export interface CustomerLedgerEntryDto {
  id: string; // BIGINT serialized as string
  businessEventId: string;
  sourceType: CustomerLedgerSourceType;
  sourceId: string;

  /**
   * Signed amount:
   * Positive = Customer owes shop (Receivable / Dr)
   * Negative = Shop owes customer or holds advance (Credit / Cr)
   */
  amount: string;
  runningBalance: string;
  effectiveDate: string;
  notes?: string | null;
  createdAt: string;
}

export interface CustomerLedgerStatementDto {
  customerId: string;
  customerCode: string;
  customerName: string;
  startDate?: string | null;
  endDate?: string | null;
  openingBalance: string;
  closingBalance: string;
  entries: PageResponse<CustomerLedgerEntryDto>;
}

export interface DueInvoiceDto {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  siteId?: string | null;
  siteName?: string | null;
  invoiceDate: string;
  dueDate: string;
  totalPayableAmount: string;
  totalAllocatedAmount: string;
  outstandingAmount: string;
  isOverdue: boolean;
  daysOverdue: number;
}

export interface DuesSummaryDto {
  totalOutstandingAmount: string;
  totalOverdueAmount: string;
  outstandingInvoiceCount: number;
  overdueInvoiceCount: number;
}

export interface DueFilterParams {
  customerId?: string | number;
  siteId?: string | number;
  dueStartDate?: string;
  dueEndDate?: string;
  overdueOnly?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}
