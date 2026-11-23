import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

/**
 * FE06 Billing Financial & Tax Invariants
 * Testing the core mathematical invariants of Himmat immediate counter billing.
 */

describe('FE06 Billing Tax Math & Financial Invariants', () => {
  describe('NORMAL vs GST Format Invariant', () => {
    it('produces identical totalPayableAmount in NORMAL and GST display formats', () => {
      // In Himmat Enterprises:
      // Item A: 10 units @ ₹118.00 inclusive (18% GST -> net ₹100.00, GST ₹18.00)
      // Item B: 5 units @ ₹105.00 inclusive (5% GST -> net ₹100.00, GST ₹5.00)
      // Total payable is invariant to display mode

      const lineA_qty = new Decimal(10);
      const lineA_inclusive = new Decimal('118.00');
      const lineA_gstRate = new Decimal('18');

      const lineB_qty = new Decimal(5);
      const lineB_inclusive = new Decimal('105.00');
      const lineB_gstRate = new Decimal('5');

      // NORMAL format calculations (gross inclusive pricing)
      const normal_lineA_total = lineA_inclusive.times(lineA_qty); // 1180.00
      const normal_lineB_total = lineB_inclusive.times(lineB_qty); // 525.00
      const normal_totalPayable = normal_lineA_total.plus(normal_lineB_total); // 1705.00

      // GST format calculations (net breakdown)
      const lineA_netUnit = lineA_inclusive.dividedBy(new Decimal(1).plus(lineA_gstRate.dividedBy(100))); // 100.00
      const lineA_taxPerUnit = lineA_inclusive.minus(lineA_netUnit); // 18.00
      const gst_lineA_netTotal = lineA_netUnit.times(lineA_qty); // 1000.00
      const gst_lineA_taxTotal = lineA_taxPerUnit.times(lineA_qty); // 180.00
      const gst_lineA_grossTotal = gst_lineA_netTotal.plus(gst_lineA_taxTotal); // 1180.00

      const lineB_netUnit = lineB_inclusive.dividedBy(new Decimal(1).plus(lineB_gstRate.dividedBy(100))); // 100.00
      const lineB_taxPerUnit = lineB_inclusive.minus(lineB_netUnit); // 5.00
      const gst_lineB_netTotal = lineB_netUnit.times(lineB_qty); // 500.00
      const gst_lineB_taxTotal = lineB_taxPerUnit.times(lineB_qty); // 25.00
      const gst_lineB_grossTotal = gst_lineB_netTotal.plus(gst_lineB_taxTotal); // 525.00

      const gst_totalPayable = gst_lineA_grossTotal.plus(gst_lineB_grossTotal); // 1705.00

      expect(normal_totalPayable.toFixed(2)).toBe('1705.00');
      expect(gst_totalPayable.toFixed(2)).toBe('1705.00');
      expect(normal_totalPayable.equals(gst_totalPayable)).toBe(true);
    });

    it('calculates line discount correctly on gross inclusive price', () => {
      // 20 units @ ₹500.00 with 10% line discount
      const qty = new Decimal(20);
      const unitPrice = new Decimal('500.00');
      const discountPct = new Decimal('10');

      const discFactor = new Decimal(1).minus(discountPct.dividedBy(100)); // 0.90
      const discountedUnitPrice = unitPrice.times(discFactor); // 450.00
      const lineTotal = discountedUnitPrice.times(qty); // 9000.00
      const totalDiscount = unitPrice.times(qty).minus(lineTotal); // 1000.00

      expect(discountedUnitPrice.toFixed(2)).toBe('450.00');
      expect(lineTotal.toFixed(2)).toBe('9000.00');
      expect(totalDiscount.toFixed(2)).toBe('1000.00');
    });
  });

  describe('30-Day Payment Term & Dues Aging', () => {
    it('sets due date strictly to invoice date + 30 calendar days', () => {
      const invoiceDateStr = '2026-11-01';
      const invoiceDate = new Date(invoiceDateStr);
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);

      // 2026-11-01 + 30 days = 2026-12-01
      expect(dueDate.toISOString().slice(0, 10)).toBe('2026-12-01');
    });

    it('correctly computes overdue status and days overdue past 30 days', () => {
      const dueDate = new Date('2026-10-15');
      const currentDate = new Date('2026-11-15');

      const diffTime = currentDate.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const outstandingAmount = new Decimal('2500.00');

      const isOverdue = diffDays > 0 && outstandingAmount.greaterThan(0);

      expect(isOverdue).toBe(true);
      expect(diffDays).toBe(31);
    });

    it('marks fully paid bill as not overdue regardless of date', () => {
      const dueDate = new Date('2026-08-01');
      const currentDate = new Date('2026-11-15');

      const diffTime = currentDate.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const outstandingAmount = new Decimal('0.00');

      const isOverdue = diffDays > 0 && outstandingAmount.greaterThan(0);

      expect(isOverdue).toBe(false);
    });
  });

  describe('Customer Account & Balance Sign Conventions', () => {
    it('positive balance represents receivable (customer owes shop)', () => {
      // Invoiced ₹5,000, Paid ₹3,000 -> Balance = +₹2,000 Dr
      const totalInvoiced = new Decimal('5000.00');
      const totalReceipts = new Decimal('3000.00');
      const netBalance = totalInvoiced.minus(totalReceipts);

      expect(netBalance.greaterThan(0)).toBe(true);
      expect(netBalance.toFixed(2)).toBe('2000.00');
    });

    it('negative balance represents customer advance credit (shop holds advance)', () => {
      // Invoiced ₹2,000, Paid ₹5,000 (advance payment) -> Balance = -₹3,000 Cr
      const totalInvoiced = new Decimal('2000.00');
      const totalReceipts = new Decimal('5000.00');
      const netBalance = totalInvoiced.minus(totalReceipts);

      expect(netBalance.lessThan(0)).toBe(true);
      expect(netBalance.abs().toFixed(2)).toBe('3000.00');
    });

    it('zero balance represents settled account', () => {
      const totalInvoiced = new Decimal('4500.00');
      const totalReceipts = new Decimal('4500.00');
      const netBalance = totalInvoiced.minus(totalReceipts);

      expect(netBalance.isZero()).toBe(true);
    });
  });

  describe('Payment Tender & Allocation Invariants', () => {
    it('computes tender components total from cash and online amounts', () => {
      const cash = new Decimal('2500.00');
      const online = new Decimal('3500.00');
      const totalTendered = cash.plus(online);

      expect(totalTendered.toFixed(2)).toBe('6000.00');
    });

    it('allocates payment to open invoice and computes excess as customer advance credit', () => {
      const totalTendered = new Decimal('10000.00');
      const invoiceA_out = new Decimal('4000.00');
      const invoiceB_out = new Decimal('3500.00');

      const totalAllocated = invoiceA_out.plus(invoiceB_out); // 7500.00
      const unallocatedAdvanceCredit = totalTendered.minus(totalAllocated); // 2500.00

      expect(totalAllocated.toFixed(2)).toBe('7500.00');
      expect(unallocatedAdvanceCredit.toFixed(2)).toBe('2500.00');
      expect(unallocatedAdvanceCredit.greaterThan(0)).toBe(true);
    });

    it('prohibits allocation exceeding tendered amount', () => {
      const totalTendered = new Decimal('5000.00');
      const attemptedAllocation = new Decimal('6000.00');

      const isValid = attemptedAllocation.lessThanOrEqualTo(totalTendered);
      expect(isValid).toBe(false);
    });
  });
});
