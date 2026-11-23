import { describe, it, expect } from 'vitest';
import {
  formatInr,
  formatQuantity,
  formatBusinessDate,
  formatDateTime,
} from '../src/utils/formatters';

describe('Formatters & Value Serialization', () => {
  describe('formatInr', () => {
    it('formats numbers with Indian currency notation (lakhs & crores)', () => {
      expect(formatInr('1000.00')).toBe('₹1,000.00');
      expect(formatInr('100000.00')).toBe('₹1,00,000.00');
      expect(formatInr('1234567.89')).toBe('₹12,34,567.89');
      expect(formatInr('50')).toBe('₹50.00');
    });

    it('formats negative monetary amounts with negative sign', () => {
      expect(formatInr('-1500.50')).toBe('-₹1,500.50');
      expect(formatInr('-25000.00')).toBe('-₹25,000.00');
    });

    it('returns "Not available" for null, undefined, or empty values without assuming ₹0.00', () => {
      expect(formatInr(null)).toBe('Not available');
      expect(formatInr(undefined)).toBe('Not available');
      expect(formatInr('')).toBe('Not available');
      expect(formatInr(null, 'Unknown')).toBe('Unknown');
    });

    it('handles exact decimal string precision without IEEE-754 precision loss', () => {
      // 0.1 + 0.2 in standard JS float is 0.30000000000000004
      expect(formatInr('0.30')).toBe('₹0.30');
      expect(formatInr('99999999.99')).toBe('₹9,99,99,999.99');
    });
  });

  describe('formatQuantity', () => {
    it('formats whole integer pieces strictly without fractional units', () => {
      expect(formatQuantity(15)).toBe('15 pcs');
      expect(formatQuantity('120', 'units')).toBe('120 units');
      expect(formatQuantity(0)).toBe('0 pcs');
    });

    it('handles null, undefined or empty quantity with fallback', () => {
      expect(formatQuantity(null)).toBe('0');
      expect(formatQuantity(undefined, 'pcs', '—')).toBe('—');
    });
  });

  describe('formatBusinessDate', () => {
    it('preserves literal YYYY-MM-DD business date without UTC shifting', () => {
      // Date must remain exactly Nov 23, 2026 regardless of client machine timezone
      expect(formatBusinessDate('2026-11-23')).toBe('23 Nov 2026');
      expect(formatBusinessDate('2026-01-01')).toBe('1 Jan 2026');
      expect(formatBusinessDate('2026-12-31')).toBe('31 Dec 2026');
    });

    it('returns fallback for empty date strings', () => {
      expect(formatBusinessDate(null)).toBe('—');
      expect(formatBusinessDate('')).toBe('—');
    });
  });

  describe('formatDateTime', () => {
    it('formats ISO timestamp in Asia/Kolkata timezone', () => {
      const formatted = formatDateTime('2026-11-23T05:30:00Z');
      expect(formatted).toContain('Nov');
      expect(formatted).toContain('2026');
    });

    it('returns fallback for invalid or null dates', () => {
      expect(formatDateTime(null)).toBe('—');
      expect(formatDateTime('invalid-date')).toBe('—');
    });
  });
});
