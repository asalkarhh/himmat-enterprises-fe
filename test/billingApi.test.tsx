import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '../src/api/client';
import { invoiceApi, customerFinanceApi, duesApi } from '../src/api/billing.api';
import {
  InvoicePreviewRequest,
  InvoicePreviewResponseDto,
  CreateInvoiceRequest,
  InvoiceResponseDto,
  CreateCustomerReceiptRequest,
  CustomerReceiptResponseDto,
  ApplyCustomerAllocationRequest,
  CustomerAccountSummaryDto,
  CustomerLedgerStatementDto,
  DueInvoiceDto,
  DuesSummaryDto,
} from '../src/types/billing.types';
import { PageResponse } from '../src/types/api.types';

vi.mock('../src/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('FE06 Billing & Customer Financial API Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Invoice Preview API', () => {
    it('calls POST /invoices/preview with lines and returns authoritative pricing preview with fingerprint', async () => {
      const mockRequest: InvoicePreviewRequest = {
        customerId: '101',
        displayFormat: 'NORMAL',
        lines: [
          {
            variantId: '501',
            quantity: 5,
            unitPriceOverride: '250.00',
            overrideReason: 'Promotional discount',
            discountPct: '0',
          },
        ],
      };

      const mockPreviewResponse: InvoicePreviewResponseDto = {
        customerId: '101',
        customerName: 'Shree Builders',
        displayFormat: 'NORMAL',
        lines: [
          {
            variantId: '501',
            productName: 'Asian Paints Apex 20L',
            sku: 'APX-20L-WHT',
            sizeLabel: '20L',
            pricingMethod: 'COST_PLUS',
            quantity: 5,
            baseUnitPrice: '280.00',
            unitNetPrice: '250.00',
            discountPct: '0',
            discountSource: 'NONE',
            isPriceOverridden: true,
            overrideReason: 'Promotional discount',
            gstRatePct: '18',
            taxableAmount: '1059.32',
            taxAmount: '190.68',
            taxBreakdownAvailable: true,
            costAvailable: true,
            lineTotal: '1250.00',
            warnings: [],
          },
        ],
        grossTotal: '1250.00',
        totalDiscountAmount: '0.00',
        totalTaxableAmount: '1059.32',
        totalTaxAmount: '190.68',
        totalPayableAmount: '1250.00',
        taxBreakdownAvailable: true,
        warnings: [],
        gstFormatCompletenessWarning: false,
        pricingFingerprint: 'sha256-abcdef1234567890',
      };

      (apiClient.post as any).mockResolvedValue({
        data: { data: mockPreviewResponse, message: 'Preview generated' },
      });

      const res = await invoiceApi.previewInvoice(mockRequest);

      expect(apiClient.post).toHaveBeenCalledWith('/invoices/preview', mockRequest, { signal: undefined });
      expect(res.pricingFingerprint).toBe('sha256-abcdef1234567890');
      expect(res.totalPayableAmount).toBe('1250.00');
      expect(res.lines).toHaveLength(1);
    });
  });

  describe('Invoice Creation API', () => {
    it('submits invoice with Idempotency-Key and returns posted invoice DTO', async () => {
      const mockCreateRequest: CreateInvoiceRequest = {
        customerId: '101',
        siteId: '201',
        invoiceDate: '2026-11-23',
        displayFormat: 'NORMAL',
        pricingFingerprint: 'sha256-abcdef1234567890',
        notes: 'Immediate shop delivery',
        lines: [
          {
            variantId: '501',
            quantity: 5,
            unitPriceOverride: '250.00',
            overrideReason: 'Promotional discount',
            discountPct: '0',
          },
        ],
        receiptComponents: [{ method: 'CASH', amount: '1250.00' }],
      };

      const mockResponseDto: InvoiceResponseDto = {
        id: '9001',
        invoiceNumber: 'INV-2026-0001',
        customerId: '101',
        customerName: 'Shree Builders',
        siteId: '201',
        siteName: 'Greenwood Site A',
        invoiceDate: '2026-11-23',
        dueDate: '2026-12-23',
        displayFormat: 'NORMAL',
        subtotalExclTax: '1059.32',
        totalTaxableAmount: '1059.32',
        totalGstAmount: '190.68',
        totalDiscountAmount: '0.00',
        totalPayableAmount: '1250.00',
        originalPayableAmount: '1250.00',
        totalReturnedAmount: '0.00',
        effectivePayableAmount: '1250.00',
        revisionCount: 0,
        totalAllocatedAmount: '1250.00',
        outstandingAmount: '0.00',
        taxBreakdownAvailable: true,
        pricingFingerprint: 'sha256-abcdef1234567890',
        status: 'POSTED',
        settlementStatus: 'PAID',
        isOverdue: false,
        daysOverdue: 0,
        notes: 'Immediate shop delivery',
        version: 1,
        businessEventId: 'evt-inv-9001',
        lines: [],
        allocations: [],
        createdAt: '2026-11-23T12:00:00Z',
        updatedAt: '2026-11-23T12:00:00Z',
      };

      (apiClient.post as any).mockResolvedValue({
        data: { data: mockResponseDto, message: 'Invoice created' },
      });

      const res = await invoiceApi.createInvoice(mockCreateRequest, 'idem-key-12345');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/invoices',
        mockCreateRequest,
        expect.objectContaining({
          headers: { 'Idempotency-Key': 'idem-key-12345' },
        })
      );
      expect(res.id).toBe('9001');
      expect(res.invoiceNumber).toBe('INV-2026-0001');
      expect(res.settlementStatus).toBe('PAID');
    });

    it('retrieves invoice by ID', async () => {
      const mockResponseDto: Partial<InvoiceResponseDto> = {
        id: '9001',
        invoiceNumber: 'INV-2026-0001',
        totalPayableAmount: '1250.00',
      };

      (apiClient.get as any).mockResolvedValue({
        data: { data: mockResponseDto },
      });

      const res = await invoiceApi.getInvoiceById('9001');

      expect(apiClient.get).toHaveBeenCalledWith('/invoices/9001', { signal: undefined });
      expect(res.invoiceNumber).toBe('INV-2026-0001');
    });

    it('searches invoices with customer, site, and overdue filters', async () => {
      const mockPage: PageResponse<InvoiceResponseDto> = {
        data: [],
        page: 0,
        size: 20,
        totalElements: 0,
        totalPages: 0,
        requestId: 'req-inv-search',
      };

      (apiClient.get as any).mockResolvedValue({ data: mockPage });

      const res = await invoiceApi.searchInvoices({
        customerId: '101',
        siteId: '201',
        overdueOnly: true,
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/invoices',
        expect.objectContaining({
          params: { customerId: '101', siteId: '201', overdueOnly: true },
        })
      );
      expect(res.totalElements).toBe(0);
    });

    it('downloads invoice PDF as blob', async () => {
      const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' });
      (apiClient.get as any).mockResolvedValue({ data: mockBlob });

      const blob = await invoiceApi.downloadInvoicePdf('9001', 'GST');

      expect(apiClient.get).toHaveBeenCalledWith('/invoices/9001/pdf', {
        params: { format: 'GST' },
        responseType: 'blob',
      });
      expect(blob).toBe(mockBlob);
    });
  });

  describe('Customer Receipts & Finance API', () => {
    it('creates a customer receipt with Idempotency-Key and allocated lines', async () => {
      const mockReceiptRequest: CreateCustomerReceiptRequest = {
        receiptDate: '2026-11-23',
        totalAmount: '5000.00',
        components: [
          { method: 'CASH', amount: '2000.00' },
          { method: 'ONLINE', amount: '3000.00', onlineReference: 'UTR123456789' },
        ],
        allocations: [{ invoiceId: '9001', amount: '3500.00' }],
      };

      const mockReceiptResponse: CustomerReceiptResponseDto = {
        id: '7001',
        receiptNumber: 'REC-2026-0001',
        customerId: '101',
        customerName: 'Shree Builders',
        receiptDate: '2026-11-23',
        totalAmount: '5000.00',
        unallocatedAmount: '1500.00',
        components: [
          { method: 'CASH', amount: '2000.00' },
          { method: 'ONLINE', amount: '3000.00', onlineReference: 'UTR123456789' },
        ],
        allocations: [],
        version: 1,
        createdAt: '2026-11-23T12:00:00Z',
      };

      (apiClient.post as any).mockResolvedValue({
        data: { data: mockReceiptResponse, message: 'Receipt created' },
      });

      const res = await customerFinanceApi.createReceipt('101', mockReceiptRequest, 'idem-rec-777');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/customers/101/receipts',
        mockReceiptRequest,
        expect.objectContaining({
          headers: { 'Idempotency-Key': 'idem-rec-777' },
        })
      );
      expect(res.receiptNumber).toBe('REC-2026-0001');
      expect(res.unallocatedAmount).toBe('1500.00');
    });

    it('applies customer advance credit allocations to invoices', async () => {
      const mockAllocRequest: ApplyCustomerAllocationRequest = {
        allocations: [
          { receiptId: '7001', invoiceId: '9002', amount: '1000.00' },
        ],
      };

      (apiClient.post as any).mockResolvedValue({
        data: { data: [{ id: '1', receiptId: '7001', invoiceId: '9002', allocatedAmount: '1000.00' }] },
      });

      const res = await customerFinanceApi.applyAllocations('101', mockAllocRequest, 'idem-alloc-888');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/customers/101/allocations',
        mockAllocRequest,
        expect.objectContaining({
          headers: { 'Idempotency-Key': 'idem-alloc-888' },
        })
      );
      expect(res).toHaveLength(1);
    });

    it('fetches customer financial account summary', async () => {
      const mockSummary: CustomerAccountSummaryDto = {
        customerId: '101',
        customerCode: 'CUST-001',
        customerName: 'Shree Builders',
        currentBalance: '2500.00',
        totalInvoiced: '15000.00',
        totalReceipts: '12500.00',
        totalReturned: '0.00',
        totalRefunded: '0.00',
        unallocatedCredit: '500.00',
        outstandingDues: '3000.00',
      };

      (apiClient.get as any).mockResolvedValue({
        data: { data: mockSummary },
      });

      const res = await customerFinanceApi.getAccountSummary('101');

      expect(apiClient.get).toHaveBeenCalledWith('/customers/101/account-summary', { signal: undefined });
      expect(res.currentBalance).toBe('2500.00');
      expect(res.unallocatedCredit).toBe('500.00');
    });

    it('fetches customer ledger statement with opening and closing balances', async () => {
      const mockLedger: CustomerLedgerStatementDto = {
        customerId: '101',
        customerCode: 'CUST-001',
        customerName: 'Shree Builders',
        openingBalance: '0.00',
        closingBalance: '2500.00',
        entries: {
          data: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
          requestId: 'req-ledger',
        },
      };

      (apiClient.get as any).mockResolvedValue({
        data: { data: mockLedger },
      });

      const res = await customerFinanceApi.getLedgerStatement('101', '2026-11-01', '2026-11-30', 0, 20);

      expect(apiClient.get).toHaveBeenCalledWith(
        '/customers/101/ledger',
        expect.objectContaining({
          params: { startDate: '2026-11-01', endDate: '2026-11-30', page: 0, size: 20 },
        })
      );
      expect(res.closingBalance).toBe('2500.00');
    });

    it('downloads customer ledger PDF', async () => {
      const mockBlob = new Blob(['pdf-ledger'], { type: 'application/pdf' });
      (apiClient.get as any).mockResolvedValue({ data: mockBlob });

      const blob = await customerFinanceApi.downloadLedgerPdf('101', '2026-11-01', '2026-11-30');

      expect(apiClient.get).toHaveBeenCalledWith('/customers/101/ledger/pdf', {
        params: { startDate: '2026-11-01', endDate: '2026-11-30' },
        responseType: 'blob',
      });
      expect(blob).toBe(mockBlob);
    });
  });

  describe('Customer Dues & Overdue API', () => {
    it('fetches aggregate dues summary', async () => {
      const mockSummary: DuesSummaryDto = {
        totalOutstandingAmount: '45000.00',
        totalOverdueAmount: '12000.00',
        outstandingInvoiceCount: 8,
        overdueInvoiceCount: 2,
      };

      (apiClient.get as any).mockResolvedValue({
        data: { data: mockSummary },
      });

      const res = await duesApi.getDuesSummary({ overdueOnly: true });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/dues/summary',
        expect.objectContaining({
          params: { overdueOnly: true },
        })
      );
      expect(res.totalOutstandingAmount).toBe('45000.00');
      expect(res.overdueInvoiceCount).toBe(2);
    });

    it('searches due invoices with pagination', async () => {
      const mockDues: DueInvoiceDto[] = [
        {
          invoiceId: '9001',
          invoiceNumber: 'INV-2026-0001',
          customerId: '101',
          customerName: 'Shree Builders',
          invoiceDate: '2026-10-15',
          dueDate: '2026-11-14',
          totalPayableAmount: '10000.00',
          totalAllocatedAmount: '2000.00',
          outstandingAmount: '8000.00',
          isOverdue: true,
          daysOverdue: 9,
        },
      ];

      const mockPage: PageResponse<DueInvoiceDto> = {
        data: mockDues,
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        requestId: 'req-dues',
      };

      (apiClient.get as any).mockResolvedValue({ data: mockPage });

      const res = await duesApi.searchDueInvoices({ page: 0, size: 20 });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/dues',
        expect.objectContaining({
          params: { page: 0, size: 20 },
        })
      );
      expect(res.data).toHaveLength(1);
      expect(res.data[0].isOverdue).toBe(true);
      expect(res.data[0].daysOverdue).toBe(9);
    });
  });
});
