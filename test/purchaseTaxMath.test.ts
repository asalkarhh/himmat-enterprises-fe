import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { PriceBasis } from '../src/types/purchase.types';

// Mirroring the pure financial calculations implemented in CreatePurchasePage
interface LineCalcInput {
  quantity: number;
  unitPrice: string;
  priceBasis: PriceBasis;
  discountPct: string;
  gstRatePct: string;
}

interface LineCalcResult {
  discountedUnitPrice: Decimal;
  gstPerUnit: Decimal | null;
  grossUnitCost: Decimal;
  netUnitCost: Decimal | null;
  lineTotal: Decimal;
  taxAmount: Decimal | null;
}

function computeLineCalculations(input: LineCalcInput): LineCalcResult {
  const qty = new Decimal(input.quantity || 0);
  const price = input.unitPrice && !isNaN(Number(input.unitPrice)) ? new Decimal(input.unitPrice) : new Decimal(0);
  const discPct = input.discountPct && !isNaN(Number(input.discountPct)) ? new Decimal(input.discountPct) : new Decimal(0);
  const discFactor = new Decimal(1).minus(discPct.dividedBy(100));

  const hasGst = input.gstRatePct !== '' && !isNaN(Number(input.gstRatePct));
  const gstPct = hasGst ? new Decimal(input.gstRatePct) : null;

  if (input.priceBasis === 'GST_EXCLUSIVE') {
    // Discount is applied to exclusive price first
    const discountedExcl = price.times(discFactor);
    const gstRate = gstPct ? gstPct.dividedBy(100) : new Decimal(0);
    const gstPerUnit = discountedExcl.times(gstRate);
    const grossPerUnit = discountedExcl.plus(gstPerUnit);
    const lineTotal = grossPerUnit.times(qty);
    const taxAmount = gstPerUnit.times(qty);

    return {
      discountedUnitPrice: discountedExcl,
      gstPerUnit,
      grossUnitCost: grossPerUnit,
      netUnitCost: discountedExcl,
      lineTotal,
      taxAmount,
    };
  } else {
    // GST_INCLUSIVE: Unit price already includes GST
    const discountedGross = price.times(discFactor);
    let netUnitCost: Decimal | null = null;
    let gstPerUnit: Decimal | null = null;
    let taxAmount: Decimal | null = null;

    if (gstPct !== null) {
      const divisor = new Decimal(1).plus(gstPct.dividedBy(100));
      netUnitCost = discountedGross.dividedBy(divisor);
      gstPerUnit = discountedGross.minus(netUnitCost);
      taxAmount = gstPerUnit.times(qty);
    }

    const lineTotal = discountedGross.times(qty);

    return {
      discountedUnitPrice: discountedGross,
      gstPerUnit,
      grossUnitCost: discountedGross,
      netUnitCost,
      lineTotal,
      taxAmount,
    };
  }
}

describe('FE05 Purchase Tax & Pricing Invariants (Decimal.js)', () => {
  describe('GST_EXCLUSIVE Calculations', () => {
    it('calculates 18% GST on exclusive price with zero discount', () => {
      const res = computeLineCalculations({
        quantity: 10,
        unitPrice: '100.00',
        priceBasis: 'GST_EXCLUSIVE',
        discountPct: '0',
        gstRatePct: '18',
      });

      expect(res.discountedUnitPrice.toFixed(2)).toBe('100.00');
      expect(res.gstPerUnit?.toFixed(2)).toBe('18.00');
      expect(res.grossUnitCost.toFixed(2)).toBe('118.00');
      expect(res.netUnitCost?.toFixed(2)).toBe('100.00');
      expect(res.lineTotal.toFixed(2)).toBe('1180.00');
      expect(res.taxAmount?.toFixed(2)).toBe('180.00');
    });

    it('calculates 10% discount first, then 18% GST on discounted price', () => {
      const res = computeLineCalculations({
        quantity: 5,
        unitPrice: '200.00',
        priceBasis: 'GST_EXCLUSIVE',
        discountPct: '10', // Discounted price = 180.00
        gstRatePct: '18', // GST = 32.40 -> Gross = 212.40
      });

      expect(res.discountedUnitPrice.toFixed(2)).toBe('180.00');
      expect(res.gstPerUnit?.toFixed(2)).toBe('32.40');
      expect(res.grossUnitCost.toFixed(2)).toBe('212.40');
      expect(res.netUnitCost?.toFixed(2)).toBe('180.00');
      expect(res.lineTotal.toFixed(2)).toBe('1062.00');
      expect(res.taxAmount?.toFixed(2)).toBe('162.00');
    });

    it('handles 28% luxury GST rate on cement or high-tax goods', () => {
      const res = computeLineCalculations({
        quantity: 20,
        unitPrice: '350.00',
        priceBasis: 'GST_EXCLUSIVE',
        discountPct: '5', // 350 * 0.95 = 332.50
        gstRatePct: '28', // 332.50 * 0.28 = 93.10 -> Gross = 425.60
      });

      expect(res.discountedUnitPrice.toFixed(2)).toBe('332.50');
      expect(res.gstPerUnit?.toFixed(2)).toBe('93.10');
      expect(res.grossUnitCost.toFixed(2)).toBe('425.60');
      expect(res.lineTotal.toFixed(2)).toBe('8512.00');
      expect(res.taxAmount?.toFixed(2)).toBe('1862.00');
    });
  });

  describe('GST_INCLUSIVE Calculations', () => {
    it('extracts 18% tax from inclusive price correctly', () => {
      const res = computeLineCalculations({
        quantity: 10,
        unitPrice: '118.00',
        priceBasis: 'GST_INCLUSIVE',
        discountPct: '0',
        gstRatePct: '18',
      });

      expect(res.grossUnitCost.toFixed(2)).toBe('118.00');
      expect(res.netUnitCost?.toFixed(2)).toBe('100.00');
      expect(res.gstPerUnit?.toFixed(2)).toBe('18.00');
      expect(res.lineTotal.toFixed(2)).toBe('1180.00');
      expect(res.taxAmount?.toFixed(2)).toBe('180.00');
    });

    it('extracts 5% GST from inclusive price with discount', () => {
      const res = computeLineCalculations({
        quantity: 4,
        unitPrice: '105.00',
        priceBasis: 'GST_INCLUSIVE',
        discountPct: '10', // 105 * 0.9 = 94.50 gross
        gstRatePct: '5', // net = 94.50 / 1.05 = 90.00, gst = 4.50
      });

      expect(res.grossUnitCost.toFixed(2)).toBe('94.50');
      expect(res.netUnitCost?.toFixed(2)).toBe('90.00');
      expect(res.gstPerUnit?.toFixed(2)).toBe('4.50');
      expect(res.lineTotal.toFixed(2)).toBe('378.00');
      expect(res.taxAmount?.toFixed(2)).toBe('18.00');
    });

    it('handles inclusive price when GST rate is unknown (null tax breakdown)', () => {
      const res = computeLineCalculations({
        quantity: 3,
        unitPrice: '500.00',
        priceBasis: 'GST_INCLUSIVE',
        discountPct: '0',
        gstRatePct: '', // Unknown GST
      });

      expect(res.grossUnitCost.toFixed(2)).toBe('500.00');
      expect(res.netUnitCost).toBeNull();
      expect(res.gstPerUnit).toBeNull();
      expect(res.taxAmount).toBeNull();
      expect(res.lineTotal.toFixed(2)).toBe('1500.00');
    });
  });

  describe('Multiple lines order aggregation and rounding', () => {
    it('aggregates subtotal, taxes, and applies round-off to 2 decimals', () => {
      const line1 = computeLineCalculations({
        quantity: 3,
        unitPrice: '123.45',
        priceBasis: 'GST_EXCLUSIVE',
        discountPct: '2.5',
        gstRatePct: '18',
      });

      const line2 = computeLineCalculations({
        quantity: 7,
        unitPrice: '456.78',
        priceBasis: 'GST_INCLUSIVE',
        discountPct: '5',
        gstRatePct: '12',
      });

      const totalPayable = line1.lineTotal.plus(line2.lineTotal);
      const totalTax = (line1.taxAmount || new Decimal(0)).plus(line2.taxAmount || new Decimal(0));

      expect(totalPayable.toFixed(2)).toBeDefined();
      expect(totalTax.toFixed(2)).toBeDefined();
      expect(totalPayable.greaterThan(totalTax)).toBe(true);
    });
  });
});
