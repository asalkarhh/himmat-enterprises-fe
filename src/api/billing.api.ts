import apiClient from './client';
import { ApiResponse, PageResponse } from '../types/api.types';
import {
  InvoicePreviewRequest,
  InvoicePreviewResponseDto,
  CreateInvoiceRequest,
  InvoiceResponseDto,
  InvoiceFilterParams,
  InvoiceDisplayFormat,
  CreateCustomerReceiptRequest,
  CustomerReceiptResponseDto,
  CustomerReceiptFilterParams,
  ApplyCustomerAllocationRequest,
  ReceiptAllocationDto,
  CustomerAccountSummaryDto,
  CustomerLedgerStatementDto,
  DueInvoiceDto,
  DuesSummaryDto,
  DueFilterParams,
  InvoiceRevisionRequest,
  InvoiceRevisionPreviewResponseDto,
  InvoiceRevisionResponseDto,
  CustomerReturnRequest,
  CustomerReturnPreviewResponseDto,
  CustomerReturnResponseDto,
  CustomerReturnFilterParams,
  CreateCustomerRefundRequest,
  CustomerRefundResponseDto,
  CustomerRefundFilterParams,
} from '../types/billing.types';

export const invoiceApi = {
  /**
   * Preview customer invoice lines, authoritative pricing, discounts, GST breakdowns,
   * tax completeness warnings, and deterministic pricing fingerprint.
   */
  previewInvoice: async (
    request: InvoicePreviewRequest,
    signal?: AbortSignal
  ): Promise<InvoicePreviewResponseDto> => {
    const response = await apiClient.post<ApiResponse<InvoicePreviewResponseDto>>(
      '/invoices/preview',
      request,
      { signal }
    );
    return response.data.data;
  },

  /**
   * Post immediate customer sales invoice, atomically reducing stock and appending to customer ledger.
   */
  createInvoice: async (
    request: CreateInvoiceRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<InvoiceResponseDto> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await apiClient.post<ApiResponse<InvoiceResponseDto>>(
      '/invoices',
      request,
      {
        headers,
        signal,
      }
    );
    return response.data.data;
  },

  /**
   * Retrieve sales invoice details by ID.
   */
  getInvoiceById: async (
    id: string | number,
    signal?: AbortSignal
  ): Promise<InvoiceResponseDto> => {
    const response = await apiClient.get<ApiResponse<InvoiceResponseDto>>(
      `/invoices/${id}`,
      { signal }
    );
    return response.data.data;
  },

  /**
   * Search and filter customer invoices.
   */
  searchInvoices: async (
    params?: InvoiceFilterParams,
    signal?: AbortSignal
  ): Promise<PageResponse<InvoiceResponseDto>> => {
    const cleanParams: Record<string, unknown> = {};
    if (params) {
      if (params.customerId !== undefined && params.customerId !== '') cleanParams.customerId = params.customerId;
      if (params.siteId !== undefined && params.siteId !== '') cleanParams.siteId = params.siteId;
      if (params.status) cleanParams.status = params.status;
      if (params.settlementStatus) cleanParams.settlementStatus = params.settlementStatus;
      if (params.displayFormat) cleanParams.displayFormat = params.displayFormat;
      if (params.startDate) cleanParams.startDate = params.startDate;
      if (params.endDate) cleanParams.endDate = params.endDate;
      if (params.overdueOnly !== undefined) cleanParams.overdueOnly = params.overdueOnly;
      if (params.search?.trim()) cleanParams.search = params.search.trim();
      if (params.page !== undefined) cleanParams.page = params.page;
      if (params.size !== undefined) cleanParams.size = params.size;
      if (params.sort) cleanParams.sort = params.sort;
    }

    const response = await apiClient.get<PageResponse<InvoiceResponseDto>>(
      '/invoices',
      {
        params: cleanParams,
        signal,
      }
    );
    return response.data;
  },

  /**
   * Download printable sales invoice PDF in NORMAL or GST format.
   */
  downloadInvoicePdf: async (
    invoiceId: string | number,
    format?: InvoiceDisplayFormat
  ): Promise<Blob> => {
    const cleanParams: Record<string, unknown> = {};
    if (format) cleanParams.format = format;

    const response = await apiClient.get(`/invoices/${invoiceId}/pdf`, {
      params: cleanParams,
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};

export const customerFinanceApi = {
  /**
   * Record customer receipt with cash/online payment components and optional invoice allocation.
   */
  createReceipt: async (
    customerId: string | number,
    request: CreateCustomerReceiptRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<CustomerReceiptResponseDto> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await apiClient.post<ApiResponse<CustomerReceiptResponseDto>>(
      `/customers/${customerId}/receipts`,
      request,
      {
        headers,
        signal,
      }
    );
    return response.data.data;
  },

  /**
   * List receipts for a customer.
   */
  searchReceipts: async (
    customerId: string | number,
    params?: CustomerReceiptFilterParams,
    signal?: AbortSignal
  ): Promise<PageResponse<CustomerReceiptResponseDto>> => {
    const cleanParams: Record<string, unknown> = {};
    if (params) {
      if (params.startDate) cleanParams.startDate = params.startDate;
      if (params.endDate) cleanParams.endDate = params.endDate;
      if (params.page !== undefined) cleanParams.page = params.page;
      if (params.size !== undefined) cleanParams.size = params.size;
    }

    const response = await apiClient.get<PageResponse<CustomerReceiptResponseDto>>(
      `/customers/${customerId}/receipts`,
      {
        params: cleanParams,
        signal,
      }
    );
    return response.data;
  },

  /**
   * Get single receipt by ID.
   */
  getReceiptById: async (
    receiptId: string | number,
    signal?: AbortSignal
  ): Promise<CustomerReceiptResponseDto> => {
    const response = await apiClient.get<ApiResponse<CustomerReceiptResponseDto>>(
      `/customer-receipts/${receiptId}`,
      { signal }
    );
    return response.data.data;
  },

  /**
   * Download printable customer receipt PDF.
   */
  downloadReceiptPdf: async (receiptId: string | number): Promise<Blob> => {
    const response = await apiClient.get(`/customer-receipts/${receiptId}/pdf`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  /**
   * Apply unallocated customer receipt advance credit to outstanding customer invoices.
   */
  applyAllocations: async (
    customerId: string | number,
    request: ApplyCustomerAllocationRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<ReceiptAllocationDto[]> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await apiClient.post<ApiResponse<ReceiptAllocationDto[]>>(
      `/customers/${customerId}/allocations`,
      request,
      {
        headers,
        signal,
      }
    );
    return response.data.data;
  },

  /**
   * Get customer account summary (net balance, total invoiced, total receipts, unallocated credit, dues).
   */
  getAccountSummary: async (
    customerId: string | number,
    signal?: AbortSignal
  ): Promise<CustomerAccountSummaryDto> => {
    const response = await apiClient.get<ApiResponse<CustomerAccountSummaryDto>>(
      `/customers/${customerId}/account-summary`,
      { signal }
    );
    return response.data.data;
  },

  /**
   * Get customer ledger statement with opening balance and running balances.
   */
  getLedgerStatement: async (
    customerId: string | number,
    startDate?: string,
    endDate?: string,
    page = 0,
    size = 20,
    signal?: AbortSignal
  ): Promise<CustomerLedgerStatementDto> => {
    const cleanParams: Record<string, unknown> = { page, size };
    if (startDate) cleanParams.startDate = startDate;
    if (endDate) cleanParams.endDate = endDate;

    const response = await apiClient.get<ApiResponse<CustomerLedgerStatementDto>>(
      `/customers/${customerId}/ledger`,
      {
        params: cleanParams,
        signal,
      }
    );
    return response.data.data;
  },

  /**
   * Download customer ledger statement PDF for a date range.
   */
  downloadLedgerPdf: async (
    customerId: string | number,
    startDate?: string,
    endDate?: string
  ): Promise<Blob> => {
    const cleanParams: Record<string, unknown> = {};
    if (startDate) cleanParams.startDate = startDate;
    if (endDate) cleanParams.endDate = endDate;

    const response = await apiClient.get(`/customers/${customerId}/ledger/pdf`, {
      params: cleanParams,
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};

export const duesApi = {
  /**
   * Search posted invoices with outstanding balances, overdue flags, and days overdue.
   */
  searchDueInvoices: async (
    params?: DueFilterParams,
    signal?: AbortSignal
  ): Promise<PageResponse<DueInvoiceDto>> => {
    const cleanParams: Record<string, unknown> = {};
    if (params) {
      if (params.customerId !== undefined && params.customerId !== '') cleanParams.customerId = params.customerId;
      if (params.siteId !== undefined && params.siteId !== '') cleanParams.siteId = params.siteId;
      if (params.dueStartDate) cleanParams.dueStartDate = params.dueStartDate;
      if (params.dueEndDate) cleanParams.dueEndDate = params.dueEndDate;
      if (params.overdueOnly !== undefined) cleanParams.overdueOnly = params.overdueOnly;
      if (params.page !== undefined) cleanParams.page = params.page;
      if (params.size !== undefined) cleanParams.size = params.size;
      if (params.sort) cleanParams.sort = params.sort;
    }

    const response = await apiClient.get<PageResponse<DueInvoiceDto>>(
      '/dues',
      {
        params: cleanParams,
        signal,
      }
    );
    return response.data;
  },

  /**
   * Get aggregate dues summary (total outstanding, total overdue, invoice counts).
   */
  getDuesSummary: async (
    params?: DueFilterParams,
    signal?: AbortSignal
  ): Promise<DuesSummaryDto> => {
    const cleanParams: Record<string, unknown> = {};
    if (params) {
      if (params.customerId !== undefined && params.customerId !== '') cleanParams.customerId = params.customerId;
      if (params.siteId !== undefined && params.siteId !== '') cleanParams.siteId = params.siteId;
      if (params.dueStartDate) cleanParams.dueStartDate = params.dueStartDate;
      if (params.dueEndDate) cleanParams.dueEndDate = params.dueEndDate;
      if (params.overdueOnly !== undefined) cleanParams.overdueOnly = params.overdueOnly;
    }

    const response = await apiClient.get<ApiResponse<DuesSummaryDto>>(
      '/dues/summary',
      {
        params: cleanParams,
        signal,
      }
    );
    return response.data.data;
  },
};


export const invoiceRevisionApi = {
  /**
   * Preview versioned invoice revision (line diffs, delta payable, released allocation).
   */
  previewRevision: async (
    invoiceId: string | number,
    request: InvoiceRevisionRequest,
    signal?: AbortSignal
  ): Promise<InvoiceRevisionPreviewResponseDto> => {
    const response = await apiClient.post<ApiResponse<InvoiceRevisionPreviewResponseDto>>(
      `/invoices/${invoiceId}/revisions/preview`,
      request,
      { signal }
    );
    return response.data.data;
  },

  /**
   * Apply versioned revision to sales invoice, adjusting stock, ledger, and allocations.
   */
  createRevision: async (
    invoiceId: string | number,
    request: InvoiceRevisionRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<InvoiceRevisionResponseDto> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await apiClient.post<ApiResponse<InvoiceRevisionResponseDto>>(
      `/invoices/${invoiceId}/revisions`,
      request,
      {
        headers,
        signal,
      }
    );
    return response.data.data;
  },

  /**
   * List all historical revision snapshots for a given sales invoice.
   */
  getRevisions: async (
    invoiceId: string | number,
    signal?: AbortSignal
  ): Promise<InvoiceRevisionResponseDto[]> => {
    const response = await apiClient.get<ApiResponse<InvoiceRevisionResponseDto[]>>(
      `/invoices/${invoiceId}/revisions`,
      { signal }
    );
    return response.data.data;
  },

  /**
   * Get specific revision record with line diffs.
   */
  getRevisionById: async (
    invoiceId: string | number,
    revisionId: string | number,
    signal?: AbortSignal
  ): Promise<InvoiceRevisionResponseDto> => {
    const response = await apiClient.get<ApiResponse<InvoiceRevisionResponseDto>>(
      `/invoices/${invoiceId}/revisions/${revisionId}`,
      { signal }
    );
    return response.data.data;
  },

  /**
   * Download printable PDF for sales invoice revision.
   */
  downloadRevisionPdf: async (
    invoiceId: string | number,
    revisionId: string | number
  ): Promise<Blob> => {
    const response = await apiClient.get(
      `/invoices/${invoiceId}/revisions/${revisionId}/pdf`,
      { responseType: 'blob' }
    );
    return response.data as Blob;
  },
};

export const customerReturnApi = {
  /**
   * Preview customer return valuation, line amounts, and released allocation.
   */
  previewReturn: async (
    invoiceId: string | number,
    request: CustomerReturnRequest,
    signal?: AbortSignal
  ): Promise<CustomerReturnPreviewResponseDto> => {
    const response = await apiClient.post<ApiResponse<CustomerReturnPreviewResponseDto>>(
      `/invoices/${invoiceId}/returns/preview`,
      request,
      { signal }
    );
    return response.data.data;
  },

  /**
   * Record customer return against an invoice, restoring stock and updating ledger and allocations.
   */
  createReturn: async (
    invoiceId: string | number,
    request: CustomerReturnRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<CustomerReturnResponseDto> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await apiClient.post<ApiResponse<CustomerReturnResponseDto>>(
      `/invoices/${invoiceId}/returns`,
      request,
      {
        headers,
        signal,
      }
    );
    return response.data.data;
  },

  /**
   * List returns for a specific invoice.
   */
  getReturnsByInvoice: async (
    invoiceId: string | number,
    signal?: AbortSignal
  ): Promise<CustomerReturnResponseDto[]> => {
    const response = await apiClient.get<ApiResponse<CustomerReturnResponseDto[]>>(
      `/invoices/${invoiceId}/returns`,
      { signal }
    );
    return response.data.data;
  },

  /**
   * Get single customer return by ID.
   */
  getReturnById: async (
    returnId: string | number,
    signal?: AbortSignal
  ): Promise<CustomerReturnResponseDto> => {
    const response = await apiClient.get<ApiResponse<CustomerReturnResponseDto>>(
      `/customer-returns/${returnId}`,
      { signal }
    );
    return response.data.data;
  },

  /**
   * Search customer returns across invoices with pagination and filters.
   */
  searchReturns: async (
    params?: CustomerReturnFilterParams,
    signal?: AbortSignal
  ): Promise<PageResponse<CustomerReturnResponseDto>> => {
    const cleanParams: Record<string, unknown> = {};
    if (params) {
      if (params.customerId !== undefined && params.customerId !== '') cleanParams.customerId = params.customerId;
      if (params.invoiceId !== undefined && params.invoiceId !== '') cleanParams.invoiceId = params.invoiceId;
      if (params.startDate) cleanParams.startDate = params.startDate;
      if (params.endDate) cleanParams.endDate = params.endDate;
      if (params.page !== undefined) cleanParams.page = params.page;
      if (params.size !== undefined) cleanParams.size = params.size;
      if (params.sort) cleanParams.sort = params.sort;
    }

    const response = await apiClient.get<ApiResponse<PageResponse<CustomerReturnResponseDto>>>(
      '/customer-returns',
      {
        params: cleanParams,
        signal,
      }
    );
    return response.data.data;
  },

  /**
   * Download printable return credit note PDF.
   */
  downloadReturnPdf: async (returnId: string | number): Promise<Blob> => {
    const response = await apiClient.get(`/customer-returns/${returnId}/pdf`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};

export const customerRefundApi = {
  /**
   * Disburse unallocated customer credit via CASH/ONLINE payment methods.
   */
  createRefund: async (
    customerId: string | number,
    request: CreateCustomerRefundRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<CustomerRefundResponseDto> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await apiClient.post<ApiResponse<CustomerRefundResponseDto>>(
      `/customers/${customerId}/refunds`,
      request,
      {
        headers,
        signal,
      }
    );
    return response.data.data;
  },

  /**
   * List customer refunds for a customer.
   */
  getCustomerRefunds: async (
    customerId: string | number,
    params?: CustomerRefundFilterParams,
    signal?: AbortSignal
  ): Promise<PageResponse<CustomerRefundResponseDto>> => {
    const cleanParams: Record<string, unknown> = {};
    if (params) {
      if (params.startDate) cleanParams.startDate = params.startDate;
      if (params.endDate) cleanParams.endDate = params.endDate;
      if (params.page !== undefined) cleanParams.page = params.page;
      if (params.size !== undefined) cleanParams.size = params.size;
    }

    const response = await apiClient.get<ApiResponse<PageResponse<CustomerRefundResponseDto>>>(
      `/customers/${customerId}/refunds`,
      {
        params: cleanParams,
        signal,
      }
    );
    return response.data.data;
  },

  /**
   * Get single refund record by ID.
   */
  getRefundById: async (
    refundId: string | number,
    signal?: AbortSignal
  ): Promise<CustomerRefundResponseDto> => {
    const response = await apiClient.get<ApiResponse<CustomerRefundResponseDto>>(
      `/customer-refunds/${refundId}`,
      { signal }
    );
    return response.data.data;
  },

  /**
   * Search all customer refunds.
   */
  searchRefunds: async (
    params?: CustomerRefundFilterParams,
    signal?: AbortSignal
  ): Promise<PageResponse<CustomerRefundResponseDto>> => {
    const cleanParams: Record<string, unknown> = {};
    if (params) {
      if (params.customerId !== undefined && params.customerId !== '') cleanParams.customerId = params.customerId;
      if (params.startDate) cleanParams.startDate = params.startDate;
      if (params.endDate) cleanParams.endDate = params.endDate;
      if (params.page !== undefined) cleanParams.page = params.page;
      if (params.size !== undefined) cleanParams.size = params.size;
      if (params.sort) cleanParams.sort = params.sort;
    }

    const response = await apiClient.get<ApiResponse<PageResponse<CustomerRefundResponseDto>>>(
      '/customer-refunds',
      {
        params: cleanParams,
        signal,
      }
    );
    return response.data.data;
  },

  /**
   * Download printable refund voucher PDF.
   */
  downloadRefundPdf: async (refundId: string | number): Promise<Blob> => {
    const response = await apiClient.get(`/customer-refunds/${refundId}/pdf`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};
