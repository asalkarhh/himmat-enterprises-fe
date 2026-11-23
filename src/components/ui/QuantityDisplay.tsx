import React from 'react';
import { formatQuantity } from '../../utils/formatters';
import { cn } from '../../utils/cn';

export interface QuantityDisplayProps {
  quantity: number | string | null | undefined;
  unit?: string;
  fallback?: string;
  className?: string;
}

export const QuantityDisplay: React.FC<QuantityDisplayProps> = ({
  quantity,
  unit = 'pcs',
  fallback = '0 pcs',
  className,
}) => {
  const formatted = formatQuantity(quantity, unit, fallback);

  return (
    <span className={cn('tabular-nums font-medium text-slate-800', className)}>
      {formatted}
    </span>
  );
};
