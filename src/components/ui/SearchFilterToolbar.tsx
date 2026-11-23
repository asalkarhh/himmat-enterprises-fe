import React from 'react';
import { Search } from 'lucide-react';
import { Input } from './Input';

export interface SearchFilterToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const SearchFilterToolbar: React.FC<SearchFilterToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  actions,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm ${className}`}
    >
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {onSearchChange && (
          <div className="w-full sm:w-72">
            <Input
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              leftIcon={<Search className="w-4 h-4" />}
              className="py-2"
            />
          </div>
        )}
        {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};
