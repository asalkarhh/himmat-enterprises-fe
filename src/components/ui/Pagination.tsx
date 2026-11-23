import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  currentPage?: number; // 0-indexed or 1-indexed based on isZeroIndexed
  totalPages?: number;
  totalElements?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  isZeroIndexed?: boolean;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage = 0,
  totalPages = 1,
  totalElements = 0,
  pageSize = 20,
  onPageChange,
  isZeroIndexed = true,
  className = '',
}) => {
  // Normalize to 1-based display for human readability
  const pageDisplay = isZeroIndexed ? currentPage + 1 : currentPage;
  const startItem = totalElements === 0 ? 0 : (pageDisplay - 1) * pageSize + 1;
  const endItem = Math.min(pageDisplay * pageSize, totalElements);

  const hasPrev = isZeroIndexed ? currentPage > 0 : currentPage > 1;
  const hasNext = isZeroIndexed ? currentPage + 1 < totalPages : currentPage < totalPages;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-3 px-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 ${className}`}
    >
      <div>
        Showing <span className="font-semibold text-slate-900">{startItem}</span> to{' '}
        <span className="font-semibold text-slate-900">{endItem}</span> of{' '}
        <span className="font-semibold text-slate-900">{totalElements}</span> results
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrev}
          onClick={() => onPageChange?.(currentPage - 1)}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
          aria-label="Previous page"
        >
          Previous
        </Button>
        <span className="text-xs text-slate-500 px-2 select-none">
          Page {pageDisplay} of {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => onPageChange?.(currentPage + 1)}
          rightIcon={<ChevronRight className="w-4 h-4" />}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </div>
  );
};
