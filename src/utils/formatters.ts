import Decimal from 'decimal.js';

/**
 * Exact INR Currency Formatter using Decimal.js.
 *
 * Rules:
 * 1. Handles null or undefined gracefully as "Not available" / "Unknown" (never ₹0).
 * 2. Formats numbers using the Indian numbering system (e.g. ₹1,23,456.78).
 * 3. Does not use floating point Math calculations that lose IEEE-754 precision.
 */
export function formatInr(
  amount: string | number | null | undefined,
  fallback = 'Not available'
): string {
  if (amount === null || amount === undefined || amount === '') {
    return fallback;
  }

  try {
    const d = new Decimal(amount);
    if (d.isNaN()) {
      return fallback;
    }

    const isNegative = d.isNegative();
    const absD = d.abs();
    // Format to 2 fixed decimal places
    const fixedStr = absD.toFixed(2);
    const [intPart, decPart] = fixedStr.split('.');

    // Format integer part using Indian grouping
    let formattedInt = '';
    if (intPart.length <= 3) {
      formattedInt = intPart;
    } else {
      const lastThree = intPart.substring(intPart.length - 3);
      const remaining = intPart.substring(0, intPart.length - 3);
      const withCommas = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
      formattedInt = `${withCommas},${lastThree}`;
    }

    const sign = isNegative ? '-' : '';
    return `${sign}₹${formattedInt}.${decPart}`;
  } catch {
    return fallback;
  }
}

/**
 * Format quantity as whole pieces.
 * Discrete units: paint and hardware are sold in discrete whole units.
 */
export function formatQuantity(
  qty: number | string | null | undefined,
  unit = 'pcs',
  fallback = '0'
): string {
  if (qty === null || qty === undefined || qty === '') {
    return fallback;
  }

  const num = typeof qty === 'number' ? qty : parseInt(qty, 10);
  if (isNaN(num)) {
    return fallback;
  }

  return `${num.toLocaleString('en-IN')} ${unit}`.trim();
}

/**
 * Format business date string (YYYY-MM-DD).
 *
 * CRITICAL: Keeps business dates as literal YYYY-MM-DD without UTC conversion shifts!
 * Converting "2026-11-23" via new Date("2026-11-23") in UTC or non-IST timezones can shift
 * the displayed date by +/- 1 day.
 */
export function formatBusinessDate(dateStr: string | null | undefined, fallback = '—'): string {
  if (!dateStr) return fallback;

  // If already YYYY-MM-DD, parse parts directly
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (match) {
    const [, year, month, day] = match;
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const monthName = months[parseInt(month, 10) - 1] || month;
    return `${parseInt(day, 10)} ${monthName} ${year}`;
  }

  return dateStr;
}

/**
 * Format ISO-8601 Timestamp in Asia/Kolkata timezone (IST).
 */
export function formatDateTime(isoString: string | null | undefined, fallback = '—'): string {
  if (!isoString) return fallback;

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return fallback;

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return fallback;
  }
}
