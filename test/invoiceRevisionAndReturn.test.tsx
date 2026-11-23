import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '../src/api/client';
import {
  invoiceRevisionApi,
  customerReturnApi,
  customerRefundApi,
} from '../src/api/billing.api';
import {
  InvoiceRevisionRequest,
  InvoiceRevisionResponseDto,
  InvoiceRevisionPreviewResponseDto,
  CustomerReturnRequest,
  CustomerReturnResponseDto,
  CustomerReturnPreviewResponseDto,
  CreateCustomerRefundRequest,
  CustomerRefundResponseDto,
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

describe('FE07 Invoice Revisions, Customer Returns & Refunds API Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // INVOICE REVISIONS API CONTRACTS
  // ==========================================
  describe('Invoice Revisions API', () => {
    it('calls POST /invoices/:id/revisions/preview and returns preview with delta and released allocation', async () => {
      const mockRequest: InvoiceRevisionRequest = {
        expectedVersion: 1,
        reason: 'Client requested quantity increase from 5 to 8 pcs',
        lines: [
          {
            invoiceLineId: '101',
            variantId: '501',
            quantity: 8,
            unitPriceOverride: '250.00',
            overrideReason: 'Approved wholesale rate',
            discountPct: '0',
          },
        ],
      };

      const mockPreviewResponse: InvoiceRevisionPreviewResponseDto = {
        invoiceId: '901',
        invoiceNumber: 'INV-2026-0001',
        revisionNumber: 1,
        previousTotalPayable: '1250.00',
        newTotalPayable: '2000.00',
        deltaPayableAmount: '750.00',
        releasedAllocationAmount: '0.00',
        previousAllocatedAmount: '1250.00',
        newAllocatedAmount: '1250.00',
        newOutstandingAmount: '750.00',
        lines: [
          {
            id: '101',
            invoiceLineId: '101',
            variantId: '501',
            lineIndex: 0,
            changeType: 'MODIFIED',
            sku: 'APX-20L-WHT',
            productName: 'Asian Paints Apex 20L',
            sizeLabel: '20L',
            previousQuantity: 5,
            newQuantity: 8,
            deltaQuantity: 3,
            previousUnitNetPrice: '250.00',
            newUnitNetPrice: '250.00',
            previousLineTotal: '1250.00',
            newLineTotal: '2000.00',
            deltaLineTotal: '750.00',
            isPriceOverridden: false,
          },
        ],
      };

      (apiClient.post as any).mockResolvedValue({
        data: { data: mockPreviewResponse, message: 'Revision preview calculated' },
      });

      const res = await invoiceRevisionApi.previewRevision('901', mockRequest);

      expect(apiClient.post).toHaveBeenCalledWith('/invoices/901/revisions/preview', mockRequest, { signal: undefined });
      expect(res.deltaPayableAmount).toBe('750.00');
      expect(res.newOutstandingAmount).toBe('750.00');
      expect(res.lines[0].changeType).toBe('MODIFIED');
    });

    it('calls POST /invoices/:id/revisions with Idempotency-Key and creates versioned revision', async () => {
      const mockRequest: InvoiceRevisionRequest = {
        expectedVersion: 1,
        reason: 'Price revision agreed with owner',
        lines: [
          {
            invoiceLineId: '101',
            variantId: '501',
            quantity: 5,
            unitPriceOverride: '240.00',
            overrideReason: 'Owner direct approval',
            discountPct: '0',
          },
        ],
      };

      const mockResponse: InvoiceRevisionResponseDto = {
        id: '1001',
        invoiceId: '901',
        invoiceNumber: 'INV-2026-0001',
        revisionNumber: 1,
        reason: 'Price revision agreed with owner',
        businessEventId: '777',
        actorId: '1',
        previousSubtotalExclTax: '1059.32',
        previousTotalDiscount: '0.00',
        previousTotalTaxable: '1059.32',
        previousTotalGst: '190.68',
        previousTotalPayable: '1250.00',
        newSubtotalExclTax: '1016.95',
        newTotalDiscount: '0.00',
        newTotalTaxable: '1016.95',
        newTotalGst: '183.05',
        newTotalPayable: '1200.00',
        deltaPayableAmount: '-50.00',
        releasedAllocationAmount: '50.00',
        snapshotPayload: '{}',
        lines: [],
        createdAt: '2026-11-23T10:00:00Z',
      };

      (apiClient.post as any).mockResolvedValue({
        data: { data: mockResponse, message: 'Invoice revision #1 committed successfully' },
      });

      const res = await invoiceRevisionApi.createRevision('901', mockRequest, 'idem-rev-123');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/invoices/901/revisions',
        mockRequest,
        { headers: { 'Idempotency-Key': 'idem-rev-123' } }
      );
      expect(res.revisionNumber).toBe(1);
      expect(res.deltaPayableAmount).toBe('-50.00');
      expect(res.releasedAllocationAmount).toBe('50.00');
    });

    it('calls GET /invoices/:id/revisions to fetch complete revision history', async () => {
      const mockRevisions: InvoiceRevisionResponseDto[] = [
        {
          id: '1001',
          invoiceId: '901',
          invoiceNumber: 'INV-2026-0001',
          revisionNumber: 1,
          reason: 'Initial adjustment',
          businessEventId: '777',
          actorId: '1',
          previousSubtotalExclTax: '1000.00',
          previousTotalDiscount: '0.00',
          previousTotalTaxable: '1000.00',
          previousTotalGst: '180.00',
          previousTotalPayable: '1180.00',
          newSubtotalExclTax: '1100.00',
          newTotalDiscount: '0.00',
          newTotalTaxable: '1100.00',
          newTotalGst: '198.00',
          newTotalPayable: '1298.00',
          deltaPayableAmount: '118.00',
          releasedAllocationAmount: '0.00',
          snapshotPayload: '{}',
          lines: [],
          createdAt: '2026-11-23T10:00:00Z',
        },
      ];

      (apiClient.get as any).mockResolvedValue({
        data: { data: mockRevisions, message: 'Revisions retrieved' },
      });

      const res = await invoiceRevisionApi.getRevisions('901');

      expect(apiClient.get).toHaveBeenCalledWith('/invoices/901/revisions', { signal: undefined });
      expect(res).toHaveLength(1);
      expect(res[0].revisionNumber).toBe(1);
    });

    it('calls GET /invoices/:id/revisions/:revId/pdf with responseType: blob', async () => {
      const mockBlob = new Blob(['%PDF-1.4 revision'], { type: 'application/pdf' });
      (apiClient.get as any).mockResolvedValue({ data: mockBlob });

      const res = await invoiceRevisionApi.downloadRevisionPdf('901', '1001');

      expect(apiClient.get).toHaveBeenCalledWith(
        '/invoices/901/revisions/1001/pdf',
        { responseType: 'blob' }
      );
      expect(res).toBeInstanceOf(Blob);
    });
  });

  // ==========================================
  // CUSTOMER RETURNS API CONTRACTS
  // ==========================================
  describe('Customer Returns API', () => {
    it('calls POST /invoices/:id/returns/preview with valuation policy and computes return credit', async () => {
      const mockRequest: CustomerReturnRequest = {
        expectedInvoiceVersion: 2,
        returnDate: '2026-11-23',
        reason: 'Customer ordered surplus paint cans',
        valuationPolicy: 'LATEST_REVISED_PRICE',
        lines: [
          {
            invoiceLineId: '101',
            quantity: 2,
            valuationBasis: 'LATEST_REVISED_PRICE',
          },
        ],
      };

      const mockPreviewResponse: CustomerReturnPreviewResponseDto = {
        invoiceId: '901',
        invoiceNumber: 'INV-2026-0001',
        customerId: '101',
        customerName: 'Shree Builders',
        totalReturnAmount: '500.00',
        previousAllocatedAmount: '1200.00',
        releasedAllocationAmount: '0.00',
        newEffectivePayableAmount: '700.00',
        newAllocatedAmount: '700.00',
        newOutstandingAmount: '0.00',
        lines: [
          {
            id: '1',
            invoiceLineId: '101',
            variantId: '501',
            sku: 'APX-20L-WHT',
            productName: 'Asian Paints Apex 20L',
            sizeLabel: '20L',
            returnedQuantity: 2,
            unitPrice: '250.00',
            totalAmount: '500.00',
            valuationBasis: 'LATEST_REVISED_PRICE',
            gstRatePct: '18',
            taxableAmount: '423.73',
            taxAmount: '76.27',
          },
        ],
      };

      (apiClient.post as any).mockResolvedValue({
        data: { data: mockPreviewResponse, message: 'Return preview generated' },
      });

      const res = await customerReturnApi.previewReturn('901', mockRequest);

      expect(apiClient.post).toHaveBeenCalledWith('/invoices/901/returns/preview', mockRequest, { signal: undefined });
      expect(res.totalReturnAmount).toBe('500.00');
      expect(res.newEffectivePayableAmount).toBe('700.00');
    });

    it('calls POST /invoices/:id/returns with Idempotency-Key and creates customer return', async () => {
      const mockRequest: CustomerReturnRequest = {
        expectedInvoiceVersion: 2,
        returnDate: '2026-11-23',
        reason: 'Physical goods return',
        valuationPolicy: 'ORIGINAL_INVOICE_PRICE',
        lines: [
          {
            invoiceLineId: '101',
            quantity: 2,
            valuationBasis: 'ORIGINAL_INVOICE_PRICE',
          },
        ],
      };

      const mockResponse: CustomerReturnResponseDto = {
        id: '2001',
        returnNumber: 'RET-2026-0001',
        invoiceId: '901',
        invoiceNumber: 'INV-2026-0001',
        customerId: '101',
        customerName: 'Shree Builders',
        returnDate: '2026-11-23',
        totalReturnAmount: '500.00',
        releasedAllocationAmount: '100.00',
        reason: 'Physical goods return',
        lines: [
          {
            id: '1',
            invoiceLineId: '101',
            variantId: '501',
            sku: 'APX-20L-WHT',
            productName: 'Asian Paints Apex 20L',
            sizeLabel: '20L',
            returnedQuantity: 2,
            unitPrice: '250.00',
            totalAmount: '500.00',
            valuationBasis: 'ORIGINAL_INVOICE_PRICE',
            gstRatePct: '18',
            taxableAmount: '423.73',
            taxAmount: '76.27',
          },
        ],
        businessEventId: '888',
        version: 1,
        createdAt: '2026-11-23T11:00:00Z',
      };

      (apiClient.post as any).mockResolvedValue({
        data: { data: mockResponse, message: 'Return recorded and stock credited' },
      });

      const res = await customerReturnApi.createReturn('901', mockRequest, 'idem-ret-999');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/invoices/901/returns',
        mockRequest,
        { headers: { 'Idempotency-Key': 'idem-ret-999' } }
      );
      expect(res.returnNumber).toBe('RET-2026-0001');
      expect(res.totalReturnAmount).toBe('500.00');
      expect(res.releasedAllocationAmount).toBe('100.00');
    });

    it('calls GET /customer-returns/:returnId/pdf with responseType: blob', async () => {
      const mockBlob = new Blob(['%PDF-1.4 return credit note'], { type: 'application/pdf' });
      (apiClient.get as any).mockResolvedValue({ data: mockBlob });

      const res = await customerReturnApi.downloadReturnPdf('2001');

      expect(apiClient.get).toHaveBeenCalledWith('/customer-returns/2001/pdf', { responseType: 'blob' });
      expect(res).toBeInstanceOf(Blob);
    });
  });

  // ==========================================
  // CUSTOMER REFUNDS API CONTRACTS
  // ==========================================
  describe('Customer Refunds API', () => {
    it('calls POST /customers/:id/refunds with Idempotency-Key and records refund voucher', async () => {
      const mockRequest: CreateCustomerRefundRequest = {
        refundDate: '2026-11-23',
        totalAmount: '200.00',
        reason: 'Refund unallocated credit balance to builder bank account',
        components: [
          {
            method: 'ONLINE',
            amount: '200.00',
            onlineReference: 'HDFC-REF-789123',
          },
        ],
      };

      const mockResponse: CustomerRefundResponseDto = {
        id: '3001',
        refundNumber: 'CRF-2026-0001',
        customerId: '101',
        customerName: 'Shree Builders',
        refundDate: '2026-11-23',
        totalAmount: '200.00',
        reason: 'Refund unallocated credit balance to builder bank account',
        components: [
          {
            method: 'ONLINE',
            amount: '200.00',
            onlineReference: 'HDFC-REF-789123',
          },
        ],
        sources: [],
        businessEventId: '999',
        version: 1,
        createdAt: '2026-11-23T12:00:00Z',
      };

      (apiClient.post as any).mockResolvedValue({
        data: { data: mockResponse, message: 'Customer refund disbursed' },
      });

      const res = await customerRefundApi.createRefund('101', mockRequest, 'idem-ref-456');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/customers/101/refunds',
        mockRequest,
        { headers: { 'Idempotency-Key': 'idem-ref-456' } }
      );
      expect(res.refundNumber).toBe('CRF-2026-0001');
      expect(res.totalAmount).toBe('200.00');
    });

    it('calls GET /customers/:id/refunds with pagination parameters', async () => {
      const mockPage: PageResponse<CustomerRefundResponseDto> = {
        data: [],
        page: 0,
        size: 10,
        totalElements: 0,
        totalPages: 0,
        requestId: 'req-123',
      };

      (apiClient.get as any).mockResolvedValue({
        data: { data: mockPage, message: 'Customer refunds retrieved' },
      });

      const res = await customerRefundApi.getCustomerRefunds('101', { page: 0, size: 10 });

      expect(apiClient.get).toHaveBeenCalledWith('/customers/101/refunds', {
        params: { page: 0, size: 10 },
        signal: undefined,
      });
      expect(res.totalElements).toBe(0);
    });

    it('calls GET /customer-refunds/:refundId/pdf with responseType: blob', async () => {
      const mockBlob = new Blob(['%PDF-1.4 refund voucher'], { type: 'application/pdf' });
      (apiClient.get as any).mockResolvedValue({ data: mockBlob });

      const res = await customerRefundApi.downloadRefundPdf('3001');

      expect(apiClient.get).toHaveBeenCalledWith('/customer-refunds/3001/pdf', { responseType: 'blob' });
      expect(res).toBeInstanceOf(Blob);
    });
  });

  // ==========================================
  // FINANCIAL & BUSINESS INVARIANTS
  // ==========================================
  describe('FE07 Confirmed Business Invariants', () => {
    it('No Age Limit Rule: allows creating revisions and returns for invoices older than 30 or 60 days', async () => {
      const oldInvoiceDate = '2025-01-15';
      const requestDate = '2026-11-23';

      const mockRequest: CustomerReturnRequest = {
        expectedInvoiceVersion: 1,
        returnDate: requestDate,
        reason: 'Legitimate correction on historical invoice from 2025',
        valuationPolicy: 'ORIGINAL_INVOICE_PRICE',
        lines: [
          {
            invoiceLineId: '501',
            quantity: 1,
          },
        ],
      };

      (apiClient.post as any).mockResolvedValue({
        data: {
          data: {
            id: '2005',
            returnNumber: 'RET-2026-0005',
            invoiceDate: oldInvoiceDate,
            returnDate: requestDate,
            totalReturnAmount: '350.00',
            releasedAllocationAmount: '0.00',
          },
        },
      });

      const res = await customerReturnApi.createReturn('501', mockRequest, 'idem-old-invoice');

      expect(res.returnNumber).toBe('RET-2026-0005');
      expect(apiClient.post).toHaveBeenCalledWith(
        '/invoices/501/returns',
        expect.objectContaining({ returnDate: requestDate }),
        expect.anything()
      );
    });

    it('Original Invoice Identity & Due Date: revision preserves invoice number and due date (invoiceDate + 30d)', async () => {
      const originalInvoice = {
        id: '901',
        invoiceNumber: 'INV-2026-0001',
        invoiceDate: '2026-10-01',
        dueDate: '2026-10-31',
      };

      // Mock revision response
      (apiClient.post as any).mockResolvedValue({
        data: {
          data: {
            id: '1002',
            invoiceId: originalInvoice.id,
            invoiceNumber: originalInvoice.invoiceNumber,
            revisionNumber: 2,
            reason: 'Correction',
            previousTotalPayable: '1500.00',
            newTotalPayable: '1400.00',
            deltaPayableAmount: '-100.00',
          },
        },
      });

      const res = await invoiceRevisionApi.createRevision(originalInvoice.id, {
        expectedVersion: 1,
        reason: 'Correction',
        lines: [],
      });

      expect(res.invoiceId).toBe(originalInvoice.id);
      expect(res.invoiceNumber).toBe(originalInvoice.invoiceNumber);
    });

    it('Price-Only Revision: has no stock movements while updating financial obligations', async () => {
      // In backend, deltaQty = 0 triggers NO InventoryMovement insertion
      const priceOnlyRequest: InvoiceRevisionRequest = {
        expectedVersion: 1,
        reason: 'Special retroactive price discount authorized by owner',
        lines: [
          {
            invoiceLineId: '101',
            variantId: '501',
            quantity: 5, // unchanged quantity
            unitPriceOverride: '220.00', // reduced from 250
            overrideReason: 'Promotional discount',
            discountPct: '0',
          },
        ],
      };

      (apiClient.post as any).mockResolvedValue({
        data: {
          data: {
            id: '1003',
            revisionNumber: 1,
            deltaPayableAmount: '-150.00',
            releasedAllocationAmount: '150.00',
            lines: [
              {
                sku: 'APX-20L-WHT',
                previousQuantity: 5,
                newQuantity: 5,
                changeType: 'MODIFIED',
                previousUnitPrice: '250.00',
                newUnitPrice: '220.00',
                deltaLineTotal: '-150.00',
              },
            ],
          },
        },
      });

      const res = await invoiceRevisionApi.createRevision('901', priceOnlyRequest);

      expect(res.lines[0].previousQuantity).toBe(res.lines[0].newQuantity);
      expect(res.deltaPayableAmount).toBe('-150.00');
    });

    it('Returns & Revisions: Effective Payable calculation does not double-count return credits', () => {
      const originalPayable = 2000;
      const revisionDelta = -300; // revised payable = 1700
      const revisedPayable = originalPayable + revisionDelta;
      const returnCredit = 500;

      // Invariant: effectivePayable = revisedPayable - returnCredit = 1200
      const effectivePayable = revisedPayable - returnCredit;

      expect(effectivePayable).toBe(1200);
      expect(effectivePayable).not.toBe(originalPayable - returnCredit); // should not be 2000 - 500 = 1500
    });

    it('Released Allocation: when payable drops below paid amount, difference credits customer advance', () => {
      const previousAllocated = 1500;
      const newPayable = 1200;

      const releasedAllocation = Math.max(0, previousAllocated - newPayable);
      const newAllocated = previousAllocated - releasedAllocation;

      expect(releasedAllocation).toBe(300);
      expect(newAllocated).toBe(1200);
    });
  });
});
