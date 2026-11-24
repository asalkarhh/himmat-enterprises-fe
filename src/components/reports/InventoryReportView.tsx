import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Boxes,
  RefreshCw,
  Search,
  Info,
} from 'lucide-react';
import { reportApi } from '../../api/report.api';
import { brandApi, categoryApi } from '../../api/catalog.api';
import { queryKeys } from '../../api/queryKeys';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import { TableSkeleton } from '../ui/LoadingSkeleton';
import { ErrorMessage } from '../ui/ErrorMessage';
import { EmptyState } from '../ui/EmptyState';
import { formatInr } from '../../utils/formatters';

export const InventoryReportView: React.FC = () => {
  const [zeroStockOnly, setZeroStockOnly] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [brandId, setBrandId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [search, setSearch] = useState('');

  // Fetch Brands and Categories for dropdowns
  const { data: brandsData } = useQuery({
    queryKey: queryKeys.brands.list({ size: 100 }),
    queryFn: ({ signal }) => brandApi.getBrands({ size: 100 }, signal),
  });

  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.categories.list({ size: 100 }),
    queryFn: ({ signal }) => categoryApi.getCategories({ size: 100 }, signal),
  });

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.reports.inventory({
      zeroStockOnly: zeroStockOnly || undefined,
      lowStockOnly: lowStockOnly || undefined,
      brandId: brandId || undefined,
      categoryId: categoryId || undefined,
      search: search || undefined,
    }),
    queryFn: ({ signal }) =>
      reportApi.getInventoryReport(
        {
          zeroStockOnly: zeroStockOnly || undefined,
          lowStockOnly: lowStockOnly || undefined,
          brandId: brandId || undefined,
          categoryId: categoryId || undefined,
          search: search || undefined,
        },
        signal
      ),
  });

  const resetFilters = () => {
    setZeroStockOnly(false);
    setLowStockOnly(false);
    setBrandId('');
    setCategoryId('');
    setSearch('');
  };

  const brandOptions = [
    { value: '', label: 'All Brands' },
    ...(brandsData?.data.map((b) => ({ value: String(b.id), label: b.name })) || []),
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...(categoriesData?.data.map((c) => ({ value: String(c.id), label: c.name })) || []),
  ];

  const items = data?.items || [];

  return (
    <div className="space-y-5">
      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Search Variant / SKU
            </label>
            <Input
              type="text"
              placeholder="Search SKU or product name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Brand
            </label>
            <Select
              options={brandOptions}
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Category
            </label>
            <Select
              options={categoryOptions}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            />
          </div>

          <div className="flex flex-col justify-end">
            <div className="flex items-center gap-3 py-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={zeroStockOnly}
                  onChange={(e) => {
                    setZeroStockOnly(e.target.checked);
                    if (e.target.checked) setLowStockOnly(false);
                  }}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Zero Stock Only</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => {
                    setLowStockOnly(e.target.checked);
                    if (e.target.checked) setZeroStockOnly(false);
                  }}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Low Stock</span>
              </label>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>
              Valuation reflects current whole pieces on hand multiplied by configured purchase cost excluding tax. Items without purchase costs are not fabricated into valuations.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs">
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              isLoading={isFetching}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {isError && (
        <ErrorMessage
          error={error}
          title="Failed to load inventory report"
          onRetry={() => refetch()}
        />
      )}

      {/* Summary KPI Strip */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="p-3 border-l-4 border-l-teal-600">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Variants
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">
              {data.totalVariants}
            </span>
          </Card>

          <Card className="p-3 border-l-4 border-l-indigo-600">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Stock Quantity
            </span>
            <span className="text-xl font-bold font-mono text-indigo-900 mt-0.5 block">
              {data.totalStockQuantity} pcs
            </span>
          </Card>

          <Card className="p-3 border-l-4 border-l-emerald-600 bg-emerald-50/20">
            <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Est. Stock Valuation
            </span>
            <span className="text-xl font-bold font-mono text-emerald-900 mt-0.5 block">
              {formatInr(parseFloat(data.totalStockValuation || '0'))}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">At Excl-Tax Cost</span>
          </Card>

          <Card className="p-3 border-l-4 border-l-rose-500">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Zero Stock Items
            </span>
            <span className="text-xl font-bold font-mono text-rose-700 mt-0.5 block">
              {data.zeroStockCount}
            </span>
          </Card>

          <Card className="p-3 border-l-4 border-l-amber-500">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Low Stock Items
            </span>
            <span className="text-xl font-bold font-mono text-amber-700 mt-0.5 block">
              {data.lowStockCount}
            </span>
          </Card>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {items.length === 0 && !isLoading ? (
          <div className="p-8">
            <EmptyState
              icon={<Boxes className="w-12 h-12 text-slate-300" />}
              title="No inventory records found"
              description="No catalog variants match the selected stock status and category filters."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>SKU & Variant</TableHead>
                  <TableHead>Brand & Category</TableHead>
                  <TableHead className="text-right">Quantity On Hand</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Unit Cost (Excl Tax)</TableHead>
                  <TableHead className="text-right">Valuation (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton columns={7} rows={6} />
                ) : (
                  items.map((item, idx) => (
                  <TableRow key={item.variantId} className="hover:bg-slate-50/70">
                    <TableCell className="text-slate-400 font-mono text-center">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/inventory/variants/${item.variantId}`}
                        className="font-bold text-teal-800 hover:underline block"
                      >
                        {item.productName}
                      </Link>
                      <span className="font-mono text-xs text-slate-500">
                        {item.sku} &bull; {item.sizeLabel}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      <span className="font-medium text-slate-900 block">{item.brandName}</span>
                      <span className="text-slate-500">
                        {item.categoryName} {item.subcategoryName ? `› ${item.subcategoryName}` : ''}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-900">
                      {item.currentQuantity} pcs
                      {item.reorderLevel !== null && item.reorderLevel !== undefined && (
                        <span className="text-[10px] text-slate-400 block font-normal">
                          Min: {item.reorderLevel}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          item.stockStatus === 'OUT_OF_STOCK'
                            ? 'danger'
                            : item.stockStatus === 'LOW_STOCK'
                            ? 'warning'
                            : 'success'
                        }
                        size="sm"
                        className="text-[10px]"
                      >
                        {item.stockStatus === 'OUT_OF_STOCK'
                          ? 'Out of Stock'
                          : item.stockStatus === 'LOW_STOCK'
                          ? 'Low Stock'
                          : 'In Stock'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-700">
                      {item.costAvailable && item.purchaseCostExclTax
                        ? formatInr(parseFloat(item.purchaseCostExclTax))
                        : <span className="text-slate-400 italic">Unknown</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-900">
                      {item.costAvailable
                        ? formatInr(parseFloat(item.valuationAmount || '0'))
                        : <span className="text-slate-400 italic">—</span>}
                    </TableCell>
                  </TableRow>
                )))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};
