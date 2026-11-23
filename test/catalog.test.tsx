import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '../src/api/client';
import {
  brandApi,
  categoryApi,
  subcategoryApi,
  productApi,
  variantApi,
} from '../src/api/catalog.api';
import {
  CreateBrandRequest,
  CreateCategoryRequest,
  CreateProductRequest,
  CreateProductVariantRequest,
} from '../src/types/catalog.types';

vi.mock('../src/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('FE02 Catalog API & Domain Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Brands API', () => {
    it('fetches paginated brands with search and active filters', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: '1', name: 'Supreme', isActive: true, version: 1, createdAt: '', updatedAt: '' },
          ],
          page: 0,
          size: 15,
          totalElements: 1,
          totalPages: 1,
          requestId: 'req-1',
        },
      };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await brandApi.getBrands({ search: 'Sup', isActive: true, page: 0, size: 15 });
      expect(apiClient.get).toHaveBeenCalledWith('/brands', {
        params: { search: 'Sup', isActive: true, page: 0, size: 15 },
        signal: undefined,
      });
      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe('Supreme');
    });

    it('creates brand with Idempotency-Key if provided', async () => {
      const payload: CreateBrandRequest = { name: 'Finolex' };
      (apiClient.post as any).mockResolvedValue({
        data: { data: { id: '2', name: 'Finolex', isActive: true, version: 1 }, requestId: 'req-2' },
      });

      const brand = await brandApi.createBrand(payload, 'idemp-brand-123');
      expect(apiClient.post).toHaveBeenCalledWith('/brands', payload, {
        headers: { 'Idempotency-Key': 'idemp-brand-123' },
        signal: undefined,
      });
      expect(brand.id).toBe('2');
      expect(brand.name).toBe('Finolex');
    });

    it('updates brand with expectedVersion for optimistic locking', async () => {
      (apiClient.patch as any).mockResolvedValue({
        data: { data: { id: '2', name: 'Finolex Pipes', isActive: true, version: 2 }, requestId: 'req-3' },
      });

      const updated = await brandApi.updateBrand('2', {
        expectedVersion: 1,
        name: 'Finolex Pipes',
      });

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/brands/2',
        { expectedVersion: 1, name: 'Finolex Pipes' },
        { headers: undefined, signal: undefined }
      );
      expect(updated.version).toBe(2);
    });
  });

  describe('Categories API & Discount Separation', () => {
    it('maintains separate purchase and sales discount percentages', async () => {
      const payload: CreateCategoryRequest = {
        name: 'PVC Pipes',
        purchaseDiscountPct: '32.50',
        salesDiscountPct: '20.00',
      };
      (apiClient.post as any).mockResolvedValue({
        data: {
          data: {
            id: '10',
            name: 'PVC Pipes',
            purchaseDiscountPct: '32.50',
            salesDiscountPct: '20.00',
            isActive: true,
            version: 1,
          },
          requestId: 'req-4',
        },
      });

      const cat = await categoryApi.createCategory(payload);
      expect(apiClient.post).toHaveBeenCalledWith('/categories', payload, {
        headers: undefined,
        signal: undefined,
      });
      expect(cat.purchaseDiscountPct).toBe('32.50');
      expect(cat.salesDiscountPct).toBe('20.00');
      expect(cat.purchaseDiscountPct).not.toBe(cat.salesDiscountPct);
    });

    it('supports explicit zero percentage discounts', async () => {
      const payload: CreateCategoryRequest = {
        name: 'Special Items',
        purchaseDiscountPct: '0.00',
        salesDiscountPct: '0.00',
      };
      (apiClient.post as any).mockResolvedValue({
        data: {
          data: {
            id: '11',
            name: 'Special Items',
            purchaseDiscountPct: '0.00',
            salesDiscountPct: '0.00',
            isActive: true,
            version: 1,
          },
          requestId: 'req-5',
        },
      });

      const cat = await categoryApi.createCategory(payload);
      expect(cat.purchaseDiscountPct).toBe('0.00');
      expect(cat.salesDiscountPct).toBe('0.00');
    });

    it('requires expectedVersion when updating category rates', async () => {
      (apiClient.patch as any).mockResolvedValue({
        data: {
          data: {
            id: '10',
            name: 'PVC Pipes',
            purchaseDiscountPct: '35.00',
            salesDiscountPct: '22.00',
            isActive: true,
            version: 2,
          },
          requestId: 'req-6',
        },
      });

      const updated = await categoryApi.updateCategory('10', {
        expectedVersion: 1,
        salesDiscountPct: '22.00',
      });

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/categories/10',
        { expectedVersion: 1, salesDiscountPct: '22.00' },
        { headers: undefined, signal: undefined }
      );
      expect(updated.version).toBe(2);
    });
  });

  describe('Subcategories API', () => {
    it('creates subcategory linked to a parent category', async () => {
      (apiClient.post as any).mockResolvedValue({
        data: {
          data: {
            id: '101',
            categoryId: '10',
            categoryName: 'PVC Pipes',
            name: 'Rigid PVC',
            isActive: true,
            version: 1,
          },
          requestId: 'req-7',
        },
      });

      const sub = await subcategoryApi.createSubcategory({ categoryId: '10', name: 'Rigid PVC' });
      expect(apiClient.post).toHaveBeenCalledWith(
        '/subcategories',
        { categoryId: '10', name: 'Rigid PVC' },
        { headers: undefined, signal: undefined }
      );
      expect(sub.categoryId).toBe('10');
      expect(sub.name).toBe('Rigid PVC');
    });
  });

  describe('Products API', () => {
    it('creates product requiring brand and subcategory', async () => {
      const payload: CreateProductRequest = {
        brandId: '1',
        subcategoryId: '101',
        name: 'Agricultural Delivery Pipe',
        description: 'Heavy duty 6kg/cm2 pipe',
      };
      (apiClient.post as any).mockResolvedValue({
        data: {
          data: {
            id: '501',
            brandId: '1',
            brandName: 'Supreme',
            categoryId: '10',
            categoryName: 'PVC Pipes',
            subcategoryId: '101',
            subcategoryName: 'Rigid PVC',
            name: 'Agricultural Delivery Pipe',
            description: 'Heavy duty 6kg/cm2 pipe',
            isActive: true,
            version: 1,
          },
          requestId: 'req-8',
        },
      });

      const prod = await productApi.createProduct(payload);
      expect(apiClient.post).toHaveBeenCalledWith('/products', payload, {
        headers: undefined,
        signal: undefined,
      });
      expect(prod.id).toBe('501');
      expect(prod.subcategoryId).toBe('101');
    });
  });

  describe('Product Variants & Pricing Methods', () => {
    it('creates MRP_DISCOUNT variant with required MRP (Incl. GST)', async () => {
      const payload: CreateProductVariantRequest = {
        productId: '501',
        sku: 'AG-PIPE-40MM',
        sizeLabel: '40mm x 3m',
        pricingMethod: 'MRP_DISCOUNT',
        mrpInclTax: '350.00',
        gstRatePct: '18.00',
        hsnCode: '3917',
        lowStockThreshold: 5,
      };

      (apiClient.post as any).mockResolvedValue({
        data: {
          data: {
            id: '901',
            ...payload,
            quantityOnHand: 0,
            openingConfirmed: false,
            isActive: true,
            version: 1,
          },
          requestId: 'req-9',
        },
      });

      const variant = await variantApi.createVariant(payload);
      expect(apiClient.post).toHaveBeenCalledWith('/variants', payload, {
        headers: undefined,
        signal: undefined,
      });
      expect(variant.pricingMethod).toBe('MRP_DISCOUNT');
      expect(variant.mrpInclTax).toBe('350.00');
      expect(variant.quantityOnHand).toBe(0); // Atomically initialized to 0; no frontend opening stock
    });

    it('creates COST_PLUS variant with purchaseCostExclTax, profitPct, and gstRatePct', async () => {
      const payload: CreateProductVariantRequest = {
        productId: '501',
        sku: 'AG-PIPE-63MM',
        sizeLabel: '63mm x 3m',
        pricingMethod: 'COST_PLUS',
        purchaseCostExclTax: '450.00',
        profitPct: '15.00',
        gstRatePct: '18.00',
        lowStockThreshold: 10,
      };

      (apiClient.post as any).mockResolvedValue({
        data: {
          data: {
            id: '902',
            ...payload,
            quantityOnHand: 0,
            openingConfirmed: false,
            isActive: true,
            version: 1,
          },
          requestId: 'req-10',
        },
      });

      const variant = await variantApi.createVariant(payload);
      expect(variant.pricingMethod).toBe('COST_PLUS');
      expect(variant.purchaseCostExclTax).toBe('450.00');
      expect(variant.profitPct).toBe('15.00');
      expect(variant.gstRatePct).toBe('18.00');
    });

    it('creates FIXED variant with fixedPriceInclTax', async () => {
      const payload: CreateProductVariantRequest = {
        productId: '501',
        sku: 'AG-PIPE-FITTING-T',
        sizeLabel: '1/2 inch Tee',
        pricingMethod: 'FIXED',
        fixedPriceInclTax: '45.00',
        gstRatePct: '18.00',
        lowStockThreshold: 20,
      };

      (apiClient.post as any).mockResolvedValue({
        data: {
          data: {
            id: '903',
            ...payload,
            quantityOnHand: 0,
            openingConfirmed: false,
            isActive: true,
            version: 1,
          },
          requestId: 'req-11',
        },
      });

      const variant = await variantApi.createVariant(payload);
      expect(variant.pricingMethod).toBe('FIXED');
      expect(variant.fixedPriceInclTax).toBe('45.00');
    });

    it('updates variant with expectedVersion and audit override reason', async () => {
      (apiClient.patch as any).mockResolvedValue({
        data: {
          data: {
            id: '901',
            sku: 'AG-PIPE-40MM',
            sizeLabel: '40mm x 3m',
            pricingMethod: 'MRP_DISCOUNT',
            mrpInclTax: '375.00',
            version: 2,
            isActive: true,
          },
          requestId: 'req-12',
        },
      });

      const updated = await variantApi.updateVariant('901', {
        expectedVersion: 1,
        mrpInclTax: '375.00',
        overrideReason: 'Annual manufacturer price revision',
      });

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/variants/901',
        {
          expectedVersion: 1,
          mrpInclTax: '375.00',
          overrideReason: 'Annual manufacturer price revision',
        },
        { headers: undefined, signal: undefined }
      );
      expect(updated.version).toBe(2);
    });
  });
});
