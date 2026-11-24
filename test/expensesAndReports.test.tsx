import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import apiClient from '../src/api/client';
import { expenseApi } from '../src/api/expense.api';
import { reportApi } from '../src/api/report.api';
import { ProfitReportView } from '../src/components/reports/ProfitReportView';
import {
  CreateExpenseRequest,
  ExpenseResponseDto,
  ReverseExpenseRequest,
} from '../src/types/expense.types';
import {
  ProfitReportDto,
  SalesReportDto,
  PurchaseReportDto,
  InventoryReportDto,
  CashMovementReportDto,
} from '../src/types/report.types';
import * as useAuthHook from '../src/hooks/useAuth';

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

describe('FE08 Operational Expenses & Business Reports', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  describe('Operational Expenses API Contracts', () => {
    it('creates an operational expense with Idempotency-Key and multi-tender split', async () => {
      const mockRequest: CreateExpenseRequest = {
        category: 'RENT',
        description: 'Main Shop monthly lease',
        amount: '25000.00',
        expenseDate: '2026-11-23',
        components: [
          { method: 'CASH', amount: '10000.00', onlineReference: '' },
          { method: 'ONLINE', amount: '15000.00', onlineReference: 'UTR-RENT-NOV2026' },
        ],
        externalReference: 'LEASE-AGR-01',
        notes: 'Paid partly in cash and online transfer',
      };

      const mockResponse: ExpenseResponseDto = {
        id: '901',
        expenseNumber: 'EXP-2026-0001',
        category: 'RENT',
        description: 'Main Shop monthly lease',
        amount: '25000.00',
        expenseDate: '2026-11-23',
        status: 'POSTED',
        version: 1,
        externalReference: 'LEASE-AGR-01',
        notes: 'Paid partly in cash and online transfer',
        createdAt: '2026-11-23T10:00:00Z',
        updatedAt: '2026-11-23T10:00:00Z',
        businessEventId: 'evt-exp-01',
        createdBy: 'owner',
        components: [
          { method: 'CASH', amount: '10000.00', onlineReference: '' },
          { method: 'ONLINE', amount: '15000.00', onlineReference: 'UTR-RENT-NOV2026' },
        ],
      };

      (apiClient.post as any).mockResolvedValueOnce({
        data: { data: mockResponse, requestId: 'req-exp-01' },
      });

      const result = await expenseApi.createExpense(mockRequest);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/expenses',
        mockRequest,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': expect.any(String),
          }),
        })
      );
      expect(result.id).toBe('901');
      expect(result.expenseNumber).toBe('EXP-2026-0001');
      expect(result.amount).toBe('25000.00');
      expect(result.status).toBe('POSTED');
      expect(result.components).toHaveLength(2);
    });

    it('reverses an active operational expense voucher with expectedVersion and reason', async () => {
      const reverseRequest: ReverseExpenseRequest = {
        expectedVersion: 1,
        reversalReason: 'Duplicate entry entered accidentally by counter manager',
      };

      const mockReversedResponse: ExpenseResponseDto = {
        id: '901',
        expenseNumber: 'EXP-2026-0001',
        category: 'RENT',
        description: 'Main Shop monthly lease',
        amount: '25000.00',
        expenseDate: '2026-11-23',
        status: 'REVERSED',
        version: 2,
        reversedAt: '2026-11-23T12:00:00Z',
        reversedBy: 'owner',
        reversalReason: 'Duplicate entry entered accidentally by counter manager',
        createdAt: '2026-11-23T10:00:00Z',
        updatedAt: '2026-11-23T10:00:00Z',
        businessEventId: 'evt-exp-01',
        createdBy: 'owner',
        components: [],
      };

      (apiClient.post as any).mockResolvedValueOnce({
        data: { data: mockReversedResponse, requestId: 'req-exp-02' },
      });

      const result = await expenseApi.reverseExpense('901', reverseRequest);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/expenses/901/reversals',
        reverseRequest,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': expect.any(String),
          }),
        })
      );
      expect(result.status).toBe('REVERSED');
      expect(result.reversalReason).toBe('Duplicate entry entered accidentally by counter manager');
      expect(result.version).toBe(2);
    });

    it('downloads expense PDF voucher with blob responseType', async () => {
      const mockBlob = new Blob(['%PDF-1.4 Fake PDF Content'], { type: 'application/pdf' });
      (apiClient.get as any).mockResolvedValueOnce({ data: mockBlob });

      const blob = await expenseApi.downloadExpensePdf('901');

      expect(apiClient.get).toHaveBeenCalledWith('/expenses/901/pdf', {
        responseType: 'blob',
      });
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('Business Reports API Contracts', () => {
    it('fetches Sales Report with ACTIVITY and DOCUMENT reporting basis', async () => {
      const mockReport: SalesReportDto = {
        basis: 'ACTIVITY',
        startDate: '2026-11-01',
        endDate: '2026-11-23',
        totalGrossSales: '150000.00',
        totalRevisionsDelta: '-5000.00',
        totalReturnsCredit: '10000.00',
        totalNetSales: '135000.00',
        totalTaxableAmount: '114406.78',
        totalTaxAmount: '20593.22',
        unknownTaxSales: '0.00',
        items: [],
      };

      (apiClient.get as any).mockResolvedValueOnce({
        data: { data: mockReport, requestId: 'req-sales-rep' },
      });

      const report = await reportApi.getSalesReport({
        basis: 'ACTIVITY',
        startDate: '2026-11-01',
        endDate: '2026-11-23',
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/reports/sales',
        expect.objectContaining({
          params: {
            basis: 'ACTIVITY',
            startDate: '2026-11-01',
            endDate: '2026-11-23',
          },
        })
      );
      expect(report.basis).toBe('ACTIVITY');
      expect(report.totalNetSales).toBe('135000.00');
      expect(report.totalTaxAmount).toBe('20593.22');
    });

    it('fetches Purchase Report with inward purchases and distinct supplier cashflows', async () => {
      const mockReport: PurchaseReportDto = {
        startDate: '2026-11-01',
        endDate: '2026-11-23',
        totalGrossPurchases: '80000.00',
        totalPurchaseReturns: '5000.00',
        totalNetPurchases: '75000.00',
        totalSupplierPayments: '60000.00',
        totalSupplierRefunds: '2000.00',
        totalTaxableAmount: '63559.32',
        totalTaxAmount: '11440.68',
        items: [],
      };

      (apiClient.get as any).mockResolvedValueOnce({
        data: { data: mockReport, requestId: 'req-pur-rep' },
      });

      const report = await reportApi.getPurchaseReport({
        startDate: '2026-11-01',
        endDate: '2026-11-23',
        supplierId: '10',
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/reports/purchases',
        expect.objectContaining({
          params: {
            startDate: '2026-11-01',
            endDate: '2026-11-23',
            supplierId: '10',
          },
        })
      );
      expect(report.totalNetPurchases).toBe('75000.00');
      expect(report.totalSupplierPayments).toBe('60000.00');
      expect(report.totalSupplierRefunds).toBe('2000.00');
    });

    it('fetches Inventory Report with valuation at purchase cost excl tax', async () => {
      const mockReport: InventoryReportDto = {
        totalVariants: 120,
        zeroStockCount: 4,
        lowStockCount: 12,
        totalStockQuantity: 5400,
        totalStockValuation: '350000.00',
        items: [
          {
            variantId: '101',
            productId: '20',
            sku: 'AP-ROY-1L',
            productName: 'Royale Luxury Emulsion 1L',
            sizeLabel: '1 Litre',
            brandName: 'Asian Paints',
            categoryName: 'Interior Emulsions',
            currentQuantity: 45,
            reorderLevel: 10,
            stockStatus: 'IN_STOCK',
            purchaseCostExclTax: '320.00',
            costAvailable: true,
            valuationAmount: '14400.00',
          },
        ],
      };

      (apiClient.get as any).mockResolvedValueOnce({
        data: { data: mockReport, requestId: 'req-inv-rep' },
      });

      const report = await reportApi.getInventoryReport({
        zeroStockOnly: true,
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/reports/inventory',
        expect.objectContaining({
          params: { zeroStockOnly: true },
        })
      );
      expect(report.totalStockQuantity).toBe(5400);
      expect(report.totalStockValuation).toBe('350000.00');
    });

    it('fetches Cash Movements Report with recorded money inflows and outflows', async () => {
      const mockReport: CashMovementReportDto = {
        startDate: '2026-11-01',
        endDate: '2026-11-23',
        totalCashIn: '45000.00',
        totalCashOut: '15000.00',
        netCashMovement: '30000.00',
        totalOnlineIn: '90000.00',
        totalOnlineOut: '40000.00',
        netOnlineMovement: '50000.00',
        grandTotalIn: '135000.00',
        grandTotalOut: '55000.00',
        netCashflow: '80000.00',
        items: [
          {
            date: '2026-11-23',
            sourceType: 'CUSTOMER_RECEIPT',
            movementType: 'IN',
            method: 'CASH',
            amount: '5000.00',
            sourceNumber: 'REC-2026-0012',
            partyName: 'Sharma Builders',
            reference: null,
          },
          {
            date: '2026-11-23',
            sourceType: 'OPERATIONAL_EXPENSE',
            movementType: 'OUT',
            method: 'ONLINE',
            amount: '3500.00',
            sourceNumber: 'EXP-2026-0004',
            partyName: null,
            reference: 'UTR-ELEC-442',
          },
        ],
      };

      (apiClient.get as any).mockResolvedValueOnce({
        data: { data: mockReport, requestId: 'req-cash-rep' },
      });

      const report = await reportApi.getCashMovementReport({
        startDate: '2026-11-01',
        endDate: '2026-11-23',
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/reports/cash-movements',
        expect.objectContaining({
          params: {
            startDate: '2026-11-01',
            endDate: '2026-11-23',
          },
        })
      );
      expect(report.grandTotalIn).toBe('135000.00');
      expect(report.grandTotalOut).toBe('55000.00');
      expect(report.netCashflow).toBe('80000.00');
      expect(report.items).toHaveLength(2);
    });
  });

  describe('Owner Profit Reports Security & Cost Coverage', () => {
    it('blocks non-owner manager from calling profit endpoints and shows restriction message', () => {
      vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
        user: { id: 2, username: 'manager1', role: 'MANAGER', displayName: 'Store Manager' } as any,
        isOwner: false,
        isManager: true,
        hasPermission: vi.fn().mockReturnValue(false),
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <ProfitReportView />
        </QueryClientProvider>
      );

      expect(screen.getByText('Owner Access Restricted')).toBeInTheDocument();
      expect(
        screen.getByText(/Business profit, margins, and cost-of-goods-sold reports are restricted to Owner credentials/i)
      ).toBeInTheDocument();

      // Zero backend calls to /reports/profit made by non-owner
      expect(apiClient.get).not.toHaveBeenCalledWith(
        '/reports/profit',
        expect.anything()
      );
    });

    it('allows owner to view profit reports, renders margin KPIs, coverage % and excluded sales alert', async () => {
      vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
        user: { id: 1, username: 'owner', role: 'OWNER', displayName: 'Himmat Singh' } as any,
        isOwner: true,
        isManager: false,
        hasPermission: vi.fn().mockReturnValue(true),
      } as any);

      const mockProfitData: ProfitReportDto = {
        startDate: '2026-10-24',
        endDate: '2026-11-23',
        knownNetRevenue: '250000.00',
        knownCogs: '175000.00',
        knownGrossProfit: '75000.00',
        knownGrossMarginPct: '30.00',
        salesValueExcludedUnknownCost: '8500.00',
        totalNetSales: '258500.00',
        costCoveragePct: '96.71',
        totalOperatingExpenses: '25000.00',
        estimatedNetProfit: '50000.00',
        productBreakdown: [
          {
            variantId: '301',
            productId: '50',
            sku: 'AP-PREM-10L',
            productName: 'Premium Gloss Enamel 10L',
            sizeLabel: '10 Litres',
            brandName: 'Asian Paints',
            categoryName: 'Enamel Paints',
            quantitySold: 20,
            quantityReturned: 0,
            netQuantity: 20,
            netRevenue: '60000.00',
            netCogs: '42000.00',
            grossProfit: '18000.00',
            grossMarginPct: '30.00',
            costAvailable: true,
          },
          {
            variantId: '302',
            productId: '51',
            sku: 'NOC-MISC-5L',
            productName: 'Specialty Thinning Thinner 5L',
            sizeLabel: '5 Litres',
            brandName: 'Local Chem',
            categoryName: 'Solvents',
            quantitySold: 10,
            quantityReturned: 0,
            netQuantity: 10,
            netRevenue: '8500.00',
            netCogs: '0.00',
            grossProfit: '0.00',
            grossMarginPct: '0.00',
            costAvailable: false,
          },
        ],
      };

      // Mock catalog calls for dropdowns and profit report
      (apiClient.get as any).mockImplementation((url: string) => {
        if (url === '/catalog/brands') {
          return Promise.resolve({ data: { data: [], page: 0, size: 100, totalElements: 0 } });
        }
        if (url === '/catalog/categories') {
          return Promise.resolve({ data: { data: [], page: 0, size: 100, totalElements: 0 } });
        }
        if (url === '/reports/profit') {
          return Promise.resolve({ data: { data: mockProfitData, requestId: 'req-prof-01' } });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ProfitReportView />
        </QueryClientProvider>
      );

      // Verify Owner Disclaimer Banner
      expect(
        screen.getByText(/Immutable Purchase Cost Snapshot Accounting:/i)
      ).toBeInTheDocument();

      // Wait for data to render
      await waitFor(() => {
        expect(screen.getByText('Known Net Revenue')).toBeInTheDocument();
      });

      // Verify KPI values rendered
      expect(screen.getByText('₹2,50,000.00')).toBeInTheDocument(); // knownNetRevenue
      expect(screen.getByText('₹1,75,000.00')).toBeInTheDocument(); // knownCogs
      expect(screen.getByText('₹75,000.00')).toBeInTheDocument(); // knownGrossProfit
      expect(screen.getByText('₹50,000.00')).toBeInTheDocument(); // estimatedNetProfit
      expect(screen.getByText('₹25,000.00')).toBeInTheDocument(); // totalOperatingExpenses
      expect(screen.getByText('96.71% Documented')).toBeInTheDocument(); // costCoveragePct

      // Verify Missing Inward / Excluded Sales Alert
      expect(screen.getByText('Excluded Sales (Unrecorded Inward Cost)')).toBeInTheDocument();
      expect(screen.getAllByText('₹8,500.00')).toHaveLength(2); // salesValueExcludedUnknownCost alert + table item

      // Verify Table Breakdown Items and Badges
      expect(screen.getByText('AP-PREM-10L')).toBeInTheDocument();
      expect(screen.getByText('NOC-MISC-5L')).toBeInTheDocument();
      expect(screen.getByText('Known Cost')).toBeInTheDocument();
      expect(screen.getByText('Missing Inward')).toBeInTheDocument();
    });
  });
});
