import { PricingMethod } from './catalog.types';

export interface PricingPreviewLineRequest {
  variantId: string | number;
  quantity: number;
  unitPriceOverride?: string | null;
  discountPct?: string | null;
  overrideReason?: string | null;
}

export interface PricingPreviewRequest {
  lines: PricingPreviewLineRequest[];
}

export interface PricingPreviewLineResponse {
  variantId: string;
  sku: string;
  productName: string;
  sizeLabel: string;
  pricingMethod: PricingMethod;
  quantity: number;
  baseInclusivePrice: string;
  discountPct: string;
  discountSource: string;
  unitNetInclusive: string;
  lineTotal: string;
  gstRatePct?: string | null;
  taxableAmount?: string | null;
  taxAmount?: string | null;
  taxBreakdownAvailable: boolean;
  costAvailable: boolean;
  profitAmount?: string | null; // Null for Managers, populated for Owners
  variantVersion: number;
  categoryVersion?: number | null;
  warnings?: string[];
}

export interface PricingPreviewResponse {
  lines: PricingPreviewLineResponse[];
  grossTotal: string;
  totalTaxableAmount?: string | null;
  totalTaxAmount?: string | null;
  taxBreakdownAvailable: boolean;
  warnings?: string[];
}
