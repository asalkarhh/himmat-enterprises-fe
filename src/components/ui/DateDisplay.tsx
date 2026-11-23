import React from 'react';
import { formatBusinessDate, formatDateTime } from '../../utils/formatters';
import { cn } from '../../utils/cn';

export interface DateDisplayProps {
  date: string | null | undefined;
  type?: 'businessDate' | 'timestamp';
  fallback?: string;
  className?: string;
}

export const DateDisplay: React.FC<DateDisplayProps> = ({
  date,
  type = 'businessDate',
  fallback = '—',
  className,
}) => {
  const formatted =
    type === 'timestamp' ? formatDateTime(date, fallback) : formatBusinessDate(date, fallback);

  return (
    <span className={cn('text-slate-700', !date && 'text-slate-400 italic', className)}>
      {formatted}
    </span>
  );
};
