import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '../src/api/client';
import { pricingApi } from '../src/api/pricing.api';
import { PricingPreviewRequest, PricingPreviewResponse } from '../src/types/pricing.types';

vi.mock('../src/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('FE02 Pricing Preview API & Calculations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts line items to /pricing/preview and returns calculations', async () => {
    const requestPayload: PricingPreviewRequest = {
      lines: [
        {
          variantId: '901',
          quantity: 2,
        },
      ],
    };

    const mockResponse: { data: { success: boolean; data: PricingPreviewResponse } } = {
      data: {
        success: true,
        data: {
          lines: [
            {
              variantId: '901',
              sku: 'AG-PIPE-40MM',
              productName: 'Agricultural Delivery Pipe',
              sizeLabel: '40mm x 3m',
              pricingMethod: 'MRP_DISCOUNT',
              quantity: 2,
              baseInclusivePrice: '350.00',
              discountPct: '20.00',
              discountSource: 'CATEGORY_SALES_DISCOUNT',
              unitNetInclusive: '280.00',
              lineTotal: '560.00',
              gstRatePct: '18.00',
              taxableAmount: '474.58',
              taxAmount: '85.42',
              taxBreakdownAvailable: true,
              costAvailable: true,
              profitAmount: '60.00', // Returned for OWNER
              variantVersion: 1,
              categoryVersion: 1,
              warnings: [],
            },
          ],
          grossTotal: '560.00',
          totalTaxableAmount: '474.58',
          totalTaxAmount: '85.42',
          taxBreakdownAvailable: true,
          warnings: [],
        },
      },
    };

    (apiClient.post as any).mockResolvedValue(mockResponse);

    const result = await pricingApi.calculatePreview(requestPayload);

    expect(apiClient.post).toHaveBeenCalledWith('/pricing/preview', requestPayload, { signal: undefined });
    expect(result.grossTotal).toBe('560.00');
    expect(result.lines.length).toBe(1);

    const line = result.lines[0];
    expect(line.discountSource).toBe('CATEGORY_SALES_DISCOUNT');
    expect(line.unitNetInclusive).toBe('280.00');
    expect(line.lineTotal).toBe('560.00');
    expect(line.taxBreakdownAvailable).toBe(true);
    expect(line.profitAmount).toBe('60.00');
  });

  it('correctly handles line discount override in calculation response', async () => {
    const requestPayload: PricingPreviewRequest = {
      lines: [
        {
          variantId: '901',
          quantity: 5,
          discountPct: '25.00',
          overrideReason: 'Bulk clearance sale',
        },
      ],
    };

    const mockResponse = {
      data: {
        success: true,
        data: {
          lines: [
            {
              variantId: '901',
              sku: 'AG-PIPE-40MM',
              productName: 'Agricultural Delivery Pipe',
              sizeLabel: '40mm x 3m',
              pricingMethod: 'MRP_DISCOUNT',
              quantity: 5,
              baseInclusivePrice: '350.00',
              discountPct: '25.00',
              discountSource: 'EXPLICIT_LINE_OVERRIDE',
              unitNetInclusive: '262.50',
              lineTotal: '1312.50',
              gstRatePct: '18.00',
              taxableAmount: '1112.29',
              taxAmount: '200.21',
              taxBreakdownAvailable: true,
              costAvailable: true,
              profitAmount: null, // MANAGER viewing (profit hidden)
              variantVersion: 1,
              categoryVersion: 1,
            },
          ],
          grossTotal: '1312.50',
          totalTaxableAmount: '1112.29',
          totalTaxAmount: '200.21',
          taxBreakdownAvailable: true,
        },
      },
    };

    (apiClient.post as any).mockResolvedValue(mockResponse);

    const result = await pricingApi.calculatePreview(requestPayload);
    expect(result.lines[0].discountSource).toBe('EXPLICIT_LINE_OVERRIDE');
    expect(result.lines[0].discountPct).toBe('25.00');
    expect(result.lines[0].profitAmount).toBeNull(); // Verifies null for manager
  });

  it('surfaces tax breakdown warning when GST rate is missing/null', async () => {
    const requestPayload: PricingPreviewRequest = {
      lines: [
        {
          variantId: '905',
          quantity: 1,
        },
      ],
    };

    const mockResponse = {
      data: {
        success: true,
        data: {
          lines: [
            {
              variantId: '905',
              sku: 'UNKNOWN-TAX-ITEM',
              productName: 'Custom Fitting',
              sizeLabel: 'Special',
              pricingMethod: 'FIXED',
              quantity: 1,
              baseInclusivePrice: '100.00',
              discountPct: '0.00',
              discountSource: 'NONE',
              unitNetInclusive: '100.00',
              lineTotal: '100.00',
              gstRatePct: null,
              taxableAmount: null,
              taxAmount: null,
              taxBreakdownAvailable: false,
              costAvailable: false,
              variantVersion: 1,
              warnings: ['Tax breakdown is unavailable because GST rate is null'],
            },
          ],
          grossTotal: '100.00',
          totalTaxableAmount: null,
          totalTaxAmount: null,
          taxBreakdownAvailable: false,
          warnings: ['Tax breakdown is unavailable for 1 or more items missing GST rates'],
        },
      },
    };

    (apiClient.post as any).mockResolvedValue(mockResponse);

    const result = await pricingApi.calculatePreview(requestPayload);
    expect(result.taxBreakdownAvailable).toBe(false);
    expect(result.totalTaxableAmount).toBeNull();
    expect(result.totalTaxAmount).toBeNull();
    expect(result.warnings?.length).toBe(1);
  });
});
