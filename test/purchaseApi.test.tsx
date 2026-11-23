import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '../src/api/client';
import { purchaseApi, supplierFinanceApi } from '../src/api/purchase.api';
import {
  CreatePurchaseRequest,
  PurchaseResponseDto,
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
} from '../src/types/purchase.types';

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

describe('FE05 Purchase & Supplier Financial API Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Purchase Orders API', () => {
    it('creates a purchase with Idempotency-Key header and returns purchase DTO', async () => {
      const mockRequest: CreatePurchaseRequest = {
        supplierId: '10',
        supplierInvoiceNumber: 'INV-2026-999',
        purchaseDate: '2026-11-23',
        notes: 'Urgent inward delivery',
        lines: [
          {
            variantId: '201',
            quantity: 50,
            enteredUnitPrice: '100.00',
            priceBasis: 'GST_EXCLUSIVE',
            discountPct: '0',
            gstRatePct: '18',
            updateProductCost: true,
          },
        ],
      };

      const mockResponseDto: PurchaseResponseDto = {
        id: '1001',
        purchaseNumber: 'PO-2026-0001',
        supplierId: '10',
        supplierName: 'Asian Paints Depot',
        supplierInvoiceNumber: 'INV-2026-999',
        purchaseDate: '2026-11-23',
        subtotalExclTax: '5000.00',
        totalDiscountAmount: '0.00',
        totalGstAmount: '900.00',
        totalPayableAmount: '5900.00',
        totalAllocatedAmount: '0.00',
        outstandingBalance: '5900.00',
        status: 'POSTED',
        notes: 'Urgent inward delivery',
        version: 1,
        lines: [
          {
            id: '5001',
            variantId: '201',
            lineIndex: 0,
            productName: 'Royale Emulsion',
            sku: 'ROY-1L',
            sizeLabel: '1L',
            quantity: 50,
            returnedQuantity: 0,
            remainingQuantity: 50,
            priceBasis: 'GST_EXCLUSIVE',
            enteredUnitPrice: '100.00',
            discountPct: '0',
            gstRatePct: '18',
            netUnitCost: '100.00',
            grossUnitCost: '118.00',
            lineTotal: '5900.00',
            updateProductCost: true,
          },
        ],
        createdAt: '2026-11-23T11:00:00Z',
      };

      (apiClient.post as any).mockResolvedValue({
        data: { data: mockResponseDto, message: 'Purchase created' },
      });

      const res = await purchaseApi.createPurchase(mockRequest, 'test-idemp-key-1');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/purchases',
        mockRequest,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': 'test-idemp-key-1',
          }),
        })
      );
      expect(res.id).toBe('1001');
      expect(res.purchaseNumber).toBe('PO-2026-0001');
      expect(res.totalPayableAmount).toBe('5900.00');
    });

    it('fetches paginated purchases list with supplier and status filters', async () => {
      const mockPageResponse = {
        data: {
          data: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
          requestId: 'req-purchase-list',
        },
      };

      (apiClient.get as any).mockResolvedValue(mockPageResponse);

      const res = await purchaseApi.getPurchases({
        supplierId: '10',
        status: 'POSTED',
        search: 'PO-2026',
        page: 0,
        size: 20,
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/purchases',
        expect.objectContaining({
          params: {
            supplierId: '10',
            status: 'POSTED',
            search: 'PO-2026',
            page: 0,
            size: 20,
          },
        })
      );
      expect(res.data).toEqual([]);
    });

    it('downloads purchase PDF with responseType: blob', async () => {
      const mockBlob = new Blob(['%PDF-1.4 test purchase content'], { type: 'application/pdf' });
      (apiClient.get as any).mockResolvedValue({ data: mockBlob });

      const blob = await purchaseApi.downloadPurchasePdf('1001');

      expect(apiClient.get).toHaveBeenCalledWith('/purchases/1001/pdf', {
        responseType: 'blob',
      });
      expect(blob).toBe(mockBlob);
    });
  });

  describe('Purchase Returns API', () => {
    it('creates purchase return against purchase invoice with Idempotency-Key', async () => {
      const mockReturnReq: CreatePurchaseReturnRequest = {
        returnDate: '2026-11-23',
        reason: 'Damaged tins received from transporter',
        lines: [
          {
            purchaseLineId: '5001',
            quantity: 5,
          },
        ],
      };

      const mockReturnRes: PurchaseReturnResponseDto = {
        id: '2001',
        returnNumber: 'PR-2026-0001',
        purchaseId: '1001',
        purchaseNumber: 'PO-2026-0001',
        supplierId: '10',
        supplierName: 'Asian Paints Depot',
        returnDate: '2026-11-23',
        totalReturnAmount: '590.00',
        reason: 'Damaged tins received from transporter',
        version: 1,
        lines: [
          {
            id: '7001',
            purchaseLineId: '5001',
            variantId: '201',
            productName: 'Royale Emulsion',
            sku: 'ROY-1L',
            sizeLabel: '1L',
            returnedQuantity: 5,
            unitCost: '118.00',
            totalAmount: '590.00',
          },
        ],
        createdAt: '2026-11-23T12:00:00Z',
      };

      (apiClient.post as any).mockResolvedValue({
        data: { data: mockReturnRes },
      });

      const res = await purchaseApi.createPurchaseReturn('1001', mockReturnReq, 'return-idemp-1');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/purchases/1001/returns',
        mockReturnReq,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': 'return-idemp-1',
          }),
        })
      );
      expect(res.returnNumber).toBe('PR-2026-0001');
      expect(res.totalReturnAmount).toBe('590.00');
    });
  });

  describe('Supplier Financials (Payments, Allocations, Refunds, Ledger)', () => {
    it('records a supplier payment with multiple tendered components and Idempotency-Key', async () => {
      const mockPaymentReq: CreateSupplierPaymentRequest = {
        paymentDate: '2026-11-23',
        totalAmount: '5900.00',
        notes: 'Paid partly via cash and partly RTGS',
        components: [
          { method: 'CASH', amount: '2000.00', onlineReference: null },
          { method: 'ONLINE', amount: '3900.00', onlineReference: 'UTR-HDFC-9912' },
        ],
        allocations: [
          { purchaseId: '1001', amount: '5900.00' },
        ],
      };

      const mockPaymentRes: SupplierPaymentResponseDto = {
        id: '3001',
        paymentNumber: 'PMT-2026-0001',
        supplierId: '10',
        supplierName: 'Asian Paints Depot',
        paymentDate: '2026-11-23',
        totalAmount: '5900.00',
        unallocatedAmount: '0.00',
        notes: 'Paid partly via cash and partly RTGS',
        components: [
          { method: 'CASH', amount: '2000.00', onlineReference: null },
          { method: 'ONLINE', amount: '3900.00', onlineReference: 'UTR-HDFC-9912' },
        ],
        allocations: [
          {
            id: '8001',
            purchaseId: '1001',
            purchaseNumber: 'PO-2026-0001',
            allocatedAmount: '5900.00',
            createdAt: '2026-11-23T13:00:00Z',
          },
        ],
        version: 1,
        createdAt: '2026-11-23T13:00:00Z',
      };

      (apiClient.post as any).mockResolvedValue({
        data: { data: mockPaymentRes },
      });

      const res = await supplierFinanceApi.createPayment('10', mockPaymentReq, 'pmt-idemp-1');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/suppliers/10/payments',
        mockPaymentReq,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': 'pmt-idemp-1',
          }),
        })
      );
      expect(res.paymentNumber).toBe('PMT-2026-0001');
      expect(res.totalAmount).toBe('5900.00');
    });

    it('applies unallocated supplier credit to open purchase invoices', async () => {
      const mockAllocReq: ApplySupplierAllocationRequest = {
        allocations: [
          { paymentId: '3001', purchaseId: '1002', amount: '1500.00' },
        ],
      };

      const mockAllocRes: PaymentAllocationDto[] = [
        {
          id: '8002',
          purchaseId: '1002',
          purchaseNumber: 'PO-2026-0002',
          allocatedAmount: '1500.00',
          createdAt: '2026-11-23T14:00:00Z',
        },
      ];

      (apiClient.post as any).mockResolvedValue({
        data: { data: mockAllocRes },
      });

      const res = await supplierFinanceApi.applyAllocations('10', mockAllocReq, 'alloc-idemp-1');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/suppliers/10/allocations',
        mockAllocReq,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': 'alloc-idemp-1',
          }),
        })
      );
      expect(res).toHaveLength(1);
      expect(res[0].allocatedAmount).toBe('1500.00');
    });

    it('records a supplier refund consuming available unallocated credit', async () => {
      const mockRefundReq: CreateSupplierRefundRequest = {
        refundDate: '2026-11-23',
        totalAmount: '500.00',
        reason: 'Cash refund for returned items',
        components: [
          { method: 'CASH', amount: '500.00', onlineReference: null },
        ],
      };

      const mockRefundRes: SupplierRefundResponseDto = {
        id: '4001',
        refundNumber: 'REF-2026-0001',
        supplierId: '10',
        supplierName: 'Asian Paints Depot',
        refundDate: '2026-11-23',
        totalAmount: '500.00',
        reason: 'Cash refund for returned items',
        components: [
          { method: 'CASH', amount: '500.00', onlineReference: null },
        ],
        version: 1,
        createdAt: '2026-11-23T15:00:00Z',
      };

      (apiClient.post as any).mockResolvedValue({
        data: { data: mockRefundRes },
      });

      const res = await supplierFinanceApi.createRefund('10', mockRefundReq, 'ref-idemp-1');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/suppliers/10/refunds',
        mockRefundReq,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': 'ref-idemp-1',
          }),
        })
      );
      expect(res.refundNumber).toBe('REF-2026-0001');
      expect(res.totalAmount).toBe('500.00');
    });

    it('fetches supplier account summary and interprets positive balance as payable', async () => {
      const mockSummary: SupplierAccountSummaryDto = {
        supplierId: '10',
        supplierCode: 'SUP-001',
        supplierName: 'Asian Paints Depot',
        currentBalance: '12500.00', // Positive = Shop owes supplier
        totalPurchases: '50000.00',
        totalPaid: '35000.00',
        totalReturned: '2500.00',
        totalRefunded: '0.00',
        unallocatedCredit: '1000.00',
        outstandingPayable: '13500.00',
      };

      (apiClient.get as any).mockResolvedValue({
        data: { data: mockSummary },
      });

      const res = await supplierFinanceApi.getAccountSummary('10');

      expect(apiClient.get).toHaveBeenCalledWith('/suppliers/10/account-summary', expect.any(Object));
      expect(parseFloat(res.currentBalance)).toBeGreaterThan(0);
      expect(res.supplierCode).toBe('SUP-001');
    });

    it('fetches supplier ledger statement with opening balance and running balances', async () => {
      const mockStatement: SupplierLedgerStatementDto = {
        supplierId: '10',
        supplierCode: 'SUP-001',
        supplierName: 'Asian Paints Depot',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        openingBalance: '0.00',
        closingBalance: '12500.00',
        entries: {
          data: [
            {
              id: '9001',
              businessEventId: '10001',
              sourceType: 'PURCHASE',
              sourceId: '1001',
              amount: '15000.00',
              runningBalance: '15000.00',
              effectiveDate: '2026-11-05',
              notes: 'PO-2026-0001',
              createdAt: '2026-11-05T10:00:00Z',
            },
            {
              id: '9002',
              businessEventId: '10002',
              sourceType: 'PAYMENT',
              sourceId: '3001',
              amount: '-2500.00',
              runningBalance: '12500.00',
              effectiveDate: '2026-11-10',
              notes: 'PMT-2026-0001',
              createdAt: '2026-11-10T10:00:00Z',
            },
          ],
          page: 0,
          size: 20,
          totalElements: 2,
          totalPages: 1,
          requestId: 'req-ledger-statement',
        },
      };

      (apiClient.get as any).mockResolvedValue({
        data: { data: mockStatement },
      });

      const res = await supplierFinanceApi.getLedgerStatement('10', '2026-11-01', '2026-11-30', 0, 20);

      expect(apiClient.get).toHaveBeenCalledWith(
        '/suppliers/10/ledger',
        expect.objectContaining({
          params: expect.objectContaining({
            startDate: '2026-11-01',
            endDate: '2026-11-30',
            page: 0,
            size: 20,
          }),
        })
      );
      expect(res.entries.data).toHaveLength(2);
      expect(res.closingBalance).toBe('12500.00');
    });

    it('downloads supplier ledger statement PDF', async () => {
      const mockBlob = new Blob(['%PDF-1.4 ledger statement'], { type: 'application/pdf' });
      (apiClient.get as any).mockResolvedValue({ data: mockBlob });

      const blob = await supplierFinanceApi.downloadLedgerPdf('10', '2026-11-01', '2026-11-30');

      expect(apiClient.get).toHaveBeenCalledWith(
        '/suppliers/10/ledger/pdf',
        expect.objectContaining({
          params: { startDate: '2026-11-01', endDate: '2026-11-30' },
          responseType: 'blob',
        })
      );
      expect(blob).toBe(mockBlob);
    });
  });
});
