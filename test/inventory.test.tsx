import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '../src/api/client';
import { inventoryApi } from '../src/api/inventory.api';
import {
  CreateManualAdjustmentRequest,
  InventoryItemDto,
  StockMovementDto,
} from '../src/types/inventory.types';

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

describe('FE04 Inventory & Stock Movements API Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Inventory List API (GET /api/v1/inventory)', () => {
    it('fetches paginated inventory with filters including search, brand, category, and stockStatus', async () => {
      const mockItem: InventoryItemDto = {
        variantId: '201',
        productId: '101',
        productName: 'Royale Luxury Emulsion',
        brandId: '1',
        brandName: 'Asian Paints',
        categoryId: '2',
        categoryName: 'Paints',
        subcategoryId: '3',
        subcategoryName: 'Emulsion',
        sku: 'ROYALE-1L',
        sizeLabel: '1 Litre',
        pricingMethod: 'MRP_DISCOUNT',
        mrpInclTax: '550.00',
        fixedPriceInclTax: null,
        quantityOnHand: 25,
        lowStockThreshold: 5,
        isLowStock: false,
        openingConfirmed: false,
        version: 3,
        isActive: true,
        updatedAt: '2026-11-23T10:00:00Z',
      };

      const mockResponse = {
        data: {
          data: [mockItem],
          page: 0,
          size: 20,
          totalElements: 1,
          totalPages: 1,
          requestId: 'req-inv-1',
        },
      };

      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await inventoryApi.getInventory({
        search: 'Royale',
        brandId: '1',
        categoryId: '2',
        stockStatus: 'IN_STOCK',
        isActive: true,
        page: 0,
        size: 20,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/inventory', {
        params: {
          search: 'Royale',
          brandId: '1',
          categoryId: '2',
          stockStatus: 'IN_STOCK',
          isActive: true,
          page: 0,
          size: 20,
        },
        signal: undefined,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].variantId).toBe('201');
      expect(typeof result.data[0].variantId).toBe('string');
      expect(result.data[0].quantityOnHand).toBe(25);
      expect(Number.isInteger(result.data[0].quantityOnHand)).toBe(true);
      expect(result.data[0].version).toBe(3);
    });

    it('omits stockStatus filter when stockStatus is ALL', async () => {
      (apiClient.get as any).mockResolvedValue({
        data: { data: [], page: 0, size: 20, totalElements: 0, totalPages: 0 },
      });

      await inventoryApi.getInventory({
        stockStatus: 'ALL',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/inventory', {
        params: {},
        signal: undefined,
      });
    });
  });

  describe('Single Variant Inventory Detail (GET /api/v1/inventory/variants/{id})', () => {
    it('fetches inventory balance and hierarchy for a single variant with expectedVersion', async () => {
      const mockItem: InventoryItemDto = {
        variantId: '202',
        productId: '101',
        productName: 'Royale Luxury Emulsion',
        brandId: '1',
        brandName: 'Asian Paints',
        categoryId: '2',
        categoryName: 'Paints',
        subcategoryId: '3',
        subcategoryName: 'Emulsion',
        sku: 'ROYALE-4L',
        sizeLabel: '4 Litre',
        pricingMethod: 'MRP_DISCOUNT',
        mrpInclTax: '2100.00',
        fixedPriceInclTax: null,
        quantityOnHand: 0,
        lowStockThreshold: 2,
        isLowStock: true,
        openingConfirmed: false,
        version: 1,
        isActive: true,
        updatedAt: '2026-11-23T11:00:00Z',
      };

      (apiClient.get as any).mockResolvedValue({
        data: {
          data: mockItem,
          requestId: 'req-inv-2',
        },
      });

      const result = await inventoryApi.getInventoryByVariantId('202');

      expect(apiClient.get).toHaveBeenCalledWith('/inventory/variants/202', {
        signal: undefined,
      });

      expect(result.variantId).toBe('202');
      expect(result.quantityOnHand).toBe(0);
      expect(result.isLowStock).toBe(true);
      expect(result.version).toBe(1);
    });
  });

  describe('Stock Movements API (GET /api/v1/inventory/movements)', () => {
    it('fetches global stock movements with variant, direction, type, and date range filters', async () => {
      const mockMovement: StockMovementDto = {
        id: '501',
        variantId: '201',
        sku: 'ROYALE-1L',
        sizeLabel: '1 Litre',
        productId: '101',
        productName: 'Royale Luxury Emulsion',
        businessEventId: '1001',
        movementType: 'MANUAL_ADJUSTMENT_IN',
        direction: 'IN',
        quantity: 10,
        quantityBefore: 15,
        quantityAfter: 25,
        sourceEntityType: 'MANUAL_ADJUSTMENT',
        sourceEntityId: '1001',
        reason: 'Physical count reconciliation',
        actorId: '1',
        occurredAt: '2026-11-23T12:00:00Z',
        createdAt: '2026-11-23T12:00:00Z',
      };

      (apiClient.get as any).mockResolvedValue({
        data: {
          data: [mockMovement],
          page: 0,
          size: 25,
          totalElements: 1,
          totalPages: 1,
        },
      });

      const result = await inventoryApi.getMovements({
        variantId: '201',
        direction: 'IN',
        movementType: 'MANUAL_ADJUSTMENT_IN',
        fromDate: '2026-11-01',
        toDate: '2026-11-23',
        page: 0,
        size: 25,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/inventory/movements', {
        params: {
          variantId: '201',
          direction: 'IN',
          movementType: 'MANUAL_ADJUSTMENT_IN',
          fromDate: '2026-11-01',
          toDate: '2026-11-23',
          page: 0,
          size: 25,
        },
        signal: undefined,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('501');
      expect(result.data[0].movementType).toBe('MANUAL_ADJUSTMENT_IN');
      expect(result.data[0].quantity).toBe(10);
      expect(result.data[0].quantityBefore).toBe(15);
      expect(result.data[0].quantityAfter).toBe(25);
    });

    it('fetches variant-scoped movements via /inventory/variants/{id}/movements', async () => {
      (apiClient.get as any).mockResolvedValue({
        data: {
          data: [],
          page: 0,
          size: 10,
          totalElements: 0,
          totalPages: 0,
        },
      });

      await inventoryApi.getVariantMovements('201', { size: 10 });

      expect(apiClient.get).toHaveBeenCalledWith('/inventory/variants/201/movements', {
        params: { size: 10 },
        signal: undefined,
      });
    });
  });

  describe('Manual Stock Adjustments API (POST /api/v1/inventory/adjustments)', () => {
    it('submits multi-line manual adjustment with reason, expectedVersion, and Idempotency-Key header', async () => {
      const request: CreateManualAdjustmentRequest = {
        reason: 'Floor verification discrepancy',
        lines: [
          {
            variantId: '201',
            direction: 'IN',
            quantity: 5,
            expectedVersion: 3,
          },
          {
            variantId: '202',
            direction: 'OUT',
            quantity: 2,
            expectedVersion: 1,
          },
        ],
      };

      const mockResponse = {
        data: {
          data: {
            eventId: '1002',
            eventKey: 'MANUAL_ADJ_KEY_123',
            reason: 'Floor verification discrepancy',
            occurredAt: '2026-11-23T12:30:00Z',
            lines: [
              {
                variantId: '201',
                sku: 'ROYALE-1L',
                productName: 'Royale Luxury Emulsion',
                direction: 'IN',
                quantity: 5,
                previousQuantityOnHand: 25,
                newQuantityOnHand: 30,
                previousVersion: 3,
                newVersion: 4,
                movementId: '502',
              },
              {
                variantId: '202',
                sku: 'ROYALE-4L',
                productName: 'Royale Luxury Emulsion',
                direction: 'OUT',
                quantity: 2,
                previousQuantityOnHand: 2,
                newQuantityOnHand: 0,
                previousVersion: 1,
                newVersion: 2,
                movementId: '503',
              },
            ],
          },
          requestId: 'req-adj-1',
        },
      };

      (apiClient.post as any).mockResolvedValue(mockResponse);

      const idempotencyKey = 'uuid-idem-test-999';
      const result = await inventoryApi.createAdjustment(request, idempotencyKey);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/inventory/adjustments',
        request,
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
          signal: undefined,
        }
      );

      expect(result.eventId).toBe('1002');
      expect(result.lines).toHaveLength(2);
      expect(result.lines[0].newQuantityOnHand).toBe(30);
      expect(result.lines[0].newVersion).toBe(4);
      expect(result.lines[1].newQuantityOnHand).toBe(0);
      expect(result.lines[1].newVersion).toBe(2);
    });

    it('rejects stale version conflict from backend', async () => {
      const conflictError = {
        response: {
          status: 409,
          data: {
            error: {
              code: 'STALE_VERSION',
              message: 'Stale version on variant [201]. Expected: 3, Actual: 4',
            },
            requestId: 'req-err-409',
          },
        },
      };
      (apiClient.post as any).mockRejectedValue(conflictError);

      await expect(
        inventoryApi.createAdjustment(
          {
            reason: 'Stale check',
            lines: [{ variantId: '201', direction: 'IN', quantity: 1, expectedVersion: 3 }],
          },
          'key-123'
        )
      ).rejects.toBeDefined();
    });

    it('rejects insufficient stock error from backend', async () => {
      const unprocessableError = {
        response: {
          status: 422,
          data: {
            error: {
              code: 'INSUFFICIENT_STOCK',
              message: 'Insufficient stock for variant [id=202, sku=ROYALE-4L]. Requested: 5, on hand: 2',
            },
            requestId: 'req-err-422',
          },
        },
      };
      (apiClient.post as any).mockRejectedValue(unprocessableError);

      await expect(
        inventoryApi.createAdjustment(
          {
            reason: 'Deduction test',
            lines: [{ variantId: '202', direction: 'OUT', quantity: 5, expectedVersion: 1 }],
          },
          'key-456'
        )
      ).rejects.toBeDefined();
    });
  });
});
