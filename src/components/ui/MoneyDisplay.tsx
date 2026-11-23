import React from 'react';
import { formatInr } from '../../utils/formatters';
import { cn } from '../../utils/cn';

export interface MoneyDisplayProps {
  amount: string | number | null | undefined;
  fallback?: string;
  colored?: boolean; // Green for positive, Red for negative
  className?: string;
}

export const MoneyDisplay: React.FC<MoneyDisplayProps> = ({
  amount,
  fallback = 'Not available',
  colored = false,
  className,
}) => {
  const formatted = formatInr(amount, fallback);
  const isUnknown = formatted === fallback;
  const isNegative = formatted.startsWith('-');

  const colorClass = colored && !isUnknown
    ? isNegative
      ? 'text-red-700'
      : 'text-emerald-700'
    : '';

  return (
    <span
      className={cn(
        'tabular-nums font-medium',
        isUnknown && 'text-slate-400 font-normal italic',
        colorClass,
        className
      )}
    >
      {formatted}
    </span>
  );
};
