/**
 * Purchase & Supplier Finance Types matching Himmat BE04B contracts.
 */

import { PageResponse } from './api.types';

export type PriceBasis = 'GST_INCLUSIVE' | 'GST_EXCLUSIVE';

export type PurchaseStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'ONLINE';

export type SupplierLedgerSourceType = 'PURCHASE' | 'PAYMENT' | 'PURCHASE_RETURN' | 'REFUND';

export interface PaymentComponentDto {
  method: PaymentMethod;
  amount: string; // Decimal string
  onlineReference?: string | null;
}

export interface PaymentAllocationRequest {
  purchaseId: string | number;
  amount: string; // Decimal string
}

export interface PaymentAllocationDto {
  id: string; // BIGINT serialized as string
  purchaseId: string;
  purchaseNumber: string;
  allocatedAmount: string;
  createdAt: string;
}

export interface PurchaseLineRequest {
  variantId: string | number;
  quantity: number; // Positive whole integer >= 1
  priceBasis: PriceBasis;
  enteredUnitPrice: string; // Decimal string > 0
  discountPct?: string | null; // Decimal string 0 to 100
  gstRatePct?: string | null; // Decimal string 0 to 100
  updateProductCost?: boolean;
  variantVersion?: number | null;
}

export interface PurchaseLineResponseDto {
  id: string; // BIGINT serialized as string
  variantId: string;
  lineIndex: number;
  productName: string;
  sku: string;
  sizeLabel: string;
  quantity: number;
  returnedQuantity: number;
  remainingQuantity: number;
  priceBasis: PriceBasis;
  enteredUnitPrice: string;
  discountPct: string;
  gstRatePct?: string | null;
  netUnitCost?: string | null;
  grossUnitCost: string;
  lineTotal: string;
  updateProductCost: boolean;
}

export interface CreatePurchaseRequest {
  supplierId: string | number;
  supplierInvoiceNumber?: string | null;
  purchaseDate?: string | null; // YYYY-MM-DD
  notes?: string | null;
  lines: PurchaseLineRequest[];
  paymentComponents?: PaymentComponentDto[] | null;
}

export interface PurchaseResponseDto {
  id: string; // BIGINT serialized as string
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  supplierContact?: string | null;
  supplierGstin?: string | null;
  supplierInvoiceNumber?: string | null;
  purchaseDate: string; // YYYY-MM-DD
  status: PurchaseStatus;
  subtotalExclTax: string;
  totalDiscountAmount: string;
  totalGstAmount: string;
  totalPayableAmount: string;
  totalAllocatedAmount: string;
  outstandingBalance: string;
  notes?: string | null;
  lines: PurchaseLineResponseDto[];
  version: number;
  createdAt: string;
  updatedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface PurchaseFilterParams {
  supplierId?: string | number;
  status?: PurchaseStatus;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface CreateSupplierPaymentRequest {
  paymentDate?: string | null; // YYYY-MM-DD
  totalAmount: string; // Decimal string > 0
  notes?: string | null;
  components: PaymentComponentDto[];
  allocations?: PaymentAllocationRequest[] | null;
}

export interface SupplierPaymentResponseDto {
  id: string; // BIGINT serialized as string
  paymentNumber: string;
  supplierId: string;
  supplierName: string;
  paymentDate: string;
  totalAmount: string;
  unallocatedAmount: string;
  notes?: string | null;
  components: PaymentComponentDto[];
  allocations: PaymentAllocationDto[];
  version: number;
  createdAt: string;
}

export interface AllocationItemRequest {
  paymentId: string | number;
  purchaseId: string | number;
  amount: string; // Decimal string
}

export interface ApplySupplierAllocationRequest {
  allocations: AllocationItemRequest[];
}

export interface PurchaseReturnLineRequest {
  purchaseLineId: string | number;
  quantity: number; // Positive whole integer >= 1
}

export interface CreatePurchaseReturnRequest {
  returnDate?: string | null; // YYYY-MM-DD
  reason: string;
  lines: PurchaseReturnLineRequest[];
}

export interface PurchaseReturnLineResponseDto {
  id: string; // BIGINT serialized as string
  purchaseLineId: string;
  variantId: string;
  productName: string;
  sku: string;
  sizeLabel: string;
  returnedQuantity: number;
  unitCost: string;
  totalAmount: string;
}

export interface PurchaseReturnResponseDto {
  id: string; // BIGINT serialized as string
  returnNumber: string;
  purchaseId: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  returnDate: string;
  totalReturnAmount: string;
  reason: string;
  lines: PurchaseReturnLineResponseDto[];
  version: number;
  createdAt: string;
}

export interface CreateSupplierRefundRequest {
  refundDate?: string | null; // YYYY-MM-DD
  totalAmount: string; // Decimal string > 0
  reason: string;
  components: PaymentComponentDto[];
}

export interface SupplierRefundResponseDto {
  id: string; // BIGINT serialized as string
  refundNumber: string;
  supplierId: string;
  supplierName: string;
  refundDate: string;
  totalAmount: string;
  reason: string;
  components: PaymentComponentDto[];
  version: number;
  createdAt: string;
}

export interface SupplierAccountSummaryDto {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  currentBalance: string; // Positive = Shop owes supplier (Payable), Negative = Supplier holds advance (Credit)
  totalPurchases: string;
  totalPaid: string;
  totalReturned: string;
  totalRefunded: string;
  unallocatedCredit: string;
  outstandingPayable: string;
}

export interface SupplierLedgerEntryDto {
  id: string; // BIGINT serialized as string
  businessEventId?: string | null;
  sourceType: SupplierLedgerSourceType;
  sourceId: string;
  amount: string; // Signed decimal string
  runningBalance: string;
  effectiveDate: string;
  notes?: string | null;
  createdAt: string;
}

export interface SupplierLedgerStatementDto {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  startDate?: string | null;
  endDate?: string | null;
  openingBalance: string;
  closingBalance: string;
  entries: PageResponse<SupplierLedgerEntryDto>;
}
