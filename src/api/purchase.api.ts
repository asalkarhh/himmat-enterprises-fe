import apiClient from './client';
import { ApiResponse, PageResponse } from '../types/api.types';
import {
  CreatePurchaseRequest,
  PurchaseResponseDto,
  PurchaseFilterParams,
  CreatePurchaseReturnRequest,
  PurchaseReturnResponseDto,
  CreateSupplierPaymentRequest,
  SupplierPaymentResponseDto,
  ApplySupplierAllocationRequest,
  PaymentAllocationDto,
  CreateSupplierRefundRequest,
  SupplierRefundResponseDto,
  SupplierAccountSummaryDto,
  SupplierLedgerStatementDto,
} from '../types/purchase.types';

export const purchaseApi = {
  /**
   * Post a purchase invoice from a supplier, atomically receiving stock and recording ledger entry.
   */
  createPurchase: async (
    request: CreatePurchaseRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<PurchaseResponseDto> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await apiClient.post<ApiResponse<PurchaseResponseDto>>(
      '/purchases',
      request,
      {
        headers,
        signal,
      }
    );
    return response.data.data;
  },

  /**
   * Search and filter purchase invoices.
   */
  getPurchases: async (
    params?: PurchaseFilterParams,
    signal?: AbortSignal
  ): Promise<PageResponse<PurchaseResponseDto>> => {
    const cleanParams: Record<string, unknown> = {};
    if (params) {
      if (params.supplierId !== undefined && params.supplierId !== '') cleanParams.supplierId = params.supplierId;
      if (params.status) cleanParams.status = params.status;
      if (params.startDate) cleanParams.startDate = params.startDate;
      if (params.endDate) cleanParams.endDate = params.endDate;
      if (params.search?.trim()) cleanParams.search = params.search.trim();
      if (params.page !== undefined) cleanParams.page = params.page;
      if (params.size !== undefined) cleanParams.size = params.size;
      if (params.sort) cleanParams.sort = params.sort;
    }

    const response = await apiClient.get<PageResponse<PurchaseResponseDto>>('/purchases', {
      params: cleanParams,
      signal,
    });
    return response.data;
  },

  /**
   * Get purchase by ID with lines and payment allocations.
   */
  getPurchaseById: async (
    id: string | number,
    signal?: AbortSignal
  ): Promise<PurchaseResponseDto> => {
    const response = await apiClient.get<ApiResponse<PurchaseResponseDto>>(
      `/purchases/${id}`,
      { signal }
    );
    return response.data.data;
  },

  /**
   * Download printable purchase bill PDF as Blob.
   */
  downloadPurchasePdf: async (purchaseId: string | number): Promise<Blob> => {
    const response = await apiClient.get(`/purchases/${purchaseId}/pdf`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  /**
   * Create purchase return against an existing purchase invoice.
   */
  createPurchaseReturn: async (
    purchaseId: string | number,
    request: CreatePurchaseReturnRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<PurchaseReturnResponseDto> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await apiClient.post<ApiResponse<PurchaseReturnResponseDto>>(
      `/purchases/${purchaseId}/returns`,
      request,
      {
        headers,
        signal,
      }
    );
    return response.data.data;
  },

  /**
   * List purchase returns for a specific purchase invoice.
   */
  getReturnsForPurchase: async (
    purchaseId: string | number,
    page = 0,
    size = 20,
    signal?: AbortSignal
  ): Promise<PageResponse<PurchaseReturnResponseDto>> => {
    const response = await apiClient.get<PageResponse<PurchaseReturnResponseDto>>(
      `/purchases/${purchaseId}/returns`,
      {
        params: { page, size },
        signal,
      }
    );
    return response.data;
  },

  /**
   * Get purchase return by ID.
   */
  getReturnById: async (
    returnId: string | number,
    signal?: AbortSignal
  ): Promise<PurchaseReturnResponseDto> => {
    const response = await apiClient.get<ApiResponse<PurchaseReturnResponseDto>>(
      `/purchase-returns/${returnId}`,
      { signal }
    );
    return response.data.data;
  },

  /**
   * Download purchase return debit note PDF.
   */
  downloadPurchaseReturnPdf: async (returnId: string | number): Promise<Blob> => {
    const response = await apiClient.get(`/purchases/returns/${returnId}/pdf`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};

export const supplierFinanceApi = {
  /**
   * Record payment to supplier with optional invoice allocations.
   */
  createPayment: async (
    supplierId: string | number,
    request: CreateSupplierPaymentRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<SupplierPaymentResponseDto> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await apiClient.post<ApiResponse<SupplierPaymentResponseDto>>(
      `/suppliers/${supplierId}/payments`,
      request,
      {
        headers,
        signal,
      }
    );
    return response.data.data;
  },

  /**
   * List payments made to a specific supplier.
   */
  getPayments: async (
    supplierId: string | number,
    startDate?: string,
    endDate?: string,
    page = 0,
    size = 20,
    signal?: AbortSignal
  ): Promise<PageResponse<SupplierPaymentResponseDto>> => {
    const cleanParams: Record<string, unknown> = { page, size };
    if (startDate) cleanParams.startDate = startDate;
    if (endDate) cleanParams.endDate = endDate;

    const response = await apiClient.get<PageResponse<SupplierPaymentResponseDto>>(
      `/suppliers/${supplierId}/payments`,
      {
        params: cleanParams,
        signal,
      }
    );
    return response.data;
  },

  /**
   * Download supplier payment voucher PDF.
   */
  downloadPaymentPdf: async (paymentId: string | number): Promise<Blob> => {
    const response = await apiClient.get(`/supplier-payments/${paymentId}/pdf`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  /**
   * Apply unallocated supplier credit to outstanding purchase invoices.
   */
  applyAllocations: async (
    supplierId: string | number,
    request: ApplySupplierAllocationRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<PaymentAllocationDto[]> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await apiClient.post<ApiResponse<PaymentAllocationDto[]>>(
      `/suppliers/${supplierId}/allocations`,
      request,
      {
        headers,
        signal,
      }
    );
    return response.data.data;
  },

  /**
   * Record cash/bank refund received from supplier.
   */
  createRefund: async (
    supplierId: string | number,
    request: CreateSupplierRefundRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<SupplierRefundResponseDto> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await apiClient.post<ApiResponse<SupplierRefundResponseDto>>(
      `/suppliers/${supplierId}/refunds`,
      request,
      {
        headers,
        signal,
      }
    );
    return response.data.data;
  },

  /**
   * Get supplier refund by ID.
   */
  getRefundById: async (
    refundId: string | number,
    signal?: AbortSignal
  ): Promise<SupplierRefundResponseDto> => {
    const response = await apiClient.get<ApiResponse<SupplierRefundResponseDto>>(
      `/suppliers/refunds/${refundId}`,
      { signal }
    );
    return response.data.data;
  },

  /**
   * Download supplier refund receipt PDF.
   */
  downloadRefundPdf: async (refundId: string | number): Promise<Blob> => {
    const response = await apiClient.get(`/supplier-refunds/${refundId}/pdf`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  /**
   * Get supplier account summary (current balance, purchases, paid, returned, refunded, unallocated credit, outstanding).
   */
  getAccountSummary: async (
    supplierId: string | number,
    signal?: AbortSignal
  ): Promise<SupplierAccountSummaryDto> => {
    const response = await apiClient.get<ApiResponse<SupplierAccountSummaryDto>>(
      `/suppliers/${supplierId}/account-summary`,
      { signal }
    );
    return response.data.data;
  },

  /**
   * Get supplier immutable ledger statement.
   */
  getLedgerStatement: async (
    supplierId: string | number,
    startDate?: string,
    endDate?: string,
    page = 0,
    size = 50,
    signal?: AbortSignal
  ): Promise<SupplierLedgerStatementDto> => {
    const cleanParams: Record<string, unknown> = { page, size };
    if (startDate) cleanParams.startDate = startDate;
    if (endDate) cleanParams.endDate = endDate;

    const response = await apiClient.get<ApiResponse<SupplierLedgerStatementDto>>(
      `/suppliers/${supplierId}/ledger`,
      {
        params: cleanParams,
        signal,
      }
    );
    return response.data.data;
  },

  /**
   * Download supplier statement of account PDF for a date range.
   */
  downloadLedgerPdf: async (
    supplierId: string | number,
    startDate?: string,
    endDate?: string
  ): Promise<Blob> => {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await apiClient.get(`/suppliers/${supplierId}/ledger/pdf`, {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};
