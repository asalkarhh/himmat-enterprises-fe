import React, { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  wrapperClassName?: string;
  ariaLabel?: string;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, wrapperClassName, ariaLabel = 'Data table', ...props }, ref) => (
    <div
      tabIndex={0}
      role="region"
      aria-label={ariaLabel}
      className={cn(
        'relative w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-teal-600',
        wrapperClassName
      )}
    >
      <table
        ref={ref}
        className={cn('w-full caption-bottom text-sm text-left border-collapse', className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn('bg-slate-50 border-b border-slate-200', className)} {...props} />
  )
);
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('divide-y divide-slate-200 bg-white', className)} {...props} />
  )
);
TableBody.displayName = 'TableBody';

export const TableRow = React.forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'transition-colors hover:bg-slate-50/80 data-[state=selected]:bg-slate-100',
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = 'TableRow';

export type ColumnAlign = 'left' | 'center' | 'right';

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  align?: ColumnAlign;
}

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, align = 'left', ...props }, ref) => {
    const alignClasses = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    };

    return (
      <th
        ref={ref}
        className={cn(
          'h-11 px-4 text-xs font-semibold uppercase tracking-wider text-slate-600 align-middle',
          alignClasses[align],
          className
        )}
        {...props}
      />
    );
  }
);
TableHead.displayName = 'TableHead';

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: ColumnAlign;
}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, align = 'left', ...props }, ref) => {
    const alignClasses = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right tabular-nums',
    };

    return (
      <td
        ref={ref}
        className={cn(
          'p-4 align-middle text-slate-700 text-sm font-normal',
          alignClasses[align],
          className
        )}
        {...props}
      />
    );
  }
);
TableCell.displayName = 'TableCell';
