import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Boxes,
  Plus,
  History,
  RefreshCw,
  FilterX,
  ExternalLink,
} from 'lucide-react';
import { inventoryApi } from '../../api/inventory.api';
import { brandApi, categoryApi, subcategoryApi } from '../../api/catalog.api';
import { queryKeys } from '../../api/queryKeys';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { StockAdjustmentModal } from '../../components/inventory/StockAdjustmentModal';
import { InventoryItemDto, StockStatusFilter } from '../../types/inventory.types';
import { formatQuantity, formatInr } from '../../utils/formatters';

export const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Query state from URL or defaults
  const pageParam = parseInt(searchParams.get('page') || '0', 10);
  const searchParam = searchParams.get('search') || '';
  const brandParam = searchParams.get('brandId') || '';
  const categoryParam = searchParams.get('categoryId') || '';
  const subcategoryParam = searchParams.get('subcategoryId') || '';
  const stockStatusParam = (searchParams.get('stockStatus') as StockStatusFilter) || 'ALL';
  const isActiveParam = searchParams.get('isActive') === 'false' ? false : true;

  const [page, setPage] = useState(isNaN(pageParam) ? 0 : pageParam);
  const [search, setSearch] = useState(searchParam);
  const [selectedBrandId, setSelectedBrandId] = useState<string>(brandParam);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categoryParam);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>(subcategoryParam);
  const [selectedStockStatus, setSelectedStockStatus] = useState<StockStatusFilter>(stockStatusParam);
  const [isActiveOnly, setIsActiveOnly] = useState<boolean>(isActiveParam);

  // Adjustment Modal state
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentTargetItem, setAdjustmentTargetItem] = useState<InventoryItemDto | null>(null);

  // Reference filter data
  const { data: brandsData } = useQuery({
    queryKey: queryKeys.brands.list({ size: 100, isActive: true }),
    queryFn: ({ signal }) => brandApi.getBrands({ size: 100, isActive: true }, signal),
  });

  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.categories.list({ size: 100, isActive: true }),
    queryFn: ({ signal }) => categoryApi.getCategories({ size: 100, isActive: true }, signal),
  });

  const { data: subcategoriesData } = useQuery({
    queryKey: queryKeys.subcategories.list({
      categoryId: selectedCategoryId || undefined,
      size: 100,
      isActive: true,
    }),
    queryFn: ({ signal }) =>
      subcategoryApi.getSubcategories(
        { categoryId: selectedCategoryId || undefined, size: 100, isActive: true },
        signal
      ),
    enabled: true,
  });

  // Inventory data query
  const {
    data: inventoryData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.inventory.list({
      page,
      size: 20,
      search: search || undefined,
      brandId: selectedBrandId || undefined,
      categoryId: selectedCategoryId || undefined,
      subcategoryId: selectedSubcategoryId || undefined,
      stockStatus: selectedStockStatus !== 'ALL' ? selectedStockStatus : undefined,
      isActive: isActiveOnly ? true : undefined,
    }),
    queryFn: ({ signal }) =>
      inventoryApi.getInventory(
        {
          page,
          size: 20,
          search: search || undefined,
          brandId: selectedBrandId || undefined,
          categoryId: selectedCategoryId || undefined,
          subcategoryId: selectedSubcategoryId || undefined,
          stockStatus: selectedStockStatus,
          isActive: isActiveOnly ? true : undefined,
        },
        signal
      ),
  });

  // Sync state to URL search params
  const updateUrlParams = (newParams: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (v === null || v === '' || v === 'ALL') {
        nextParams.delete(k);
      } else {
        nextParams.set(k, v);
      }
    });
    setSearchParams(nextParams, { replace: true });
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(0);
    updateUrlParams({ search: val || null, page: '0' });
  };

  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedBrandId(val);
    setPage(0);
    updateUrlParams({ brandId: val || null, page: '0' });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCategoryId(val);
    setSelectedSubcategoryId('');
    setPage(0);
    updateUrlParams({ categoryId: val || null, subcategoryId: null, page: '0' });
  };

  const handleSubcategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedSubcategoryId(val);
    setPage(0);
    updateUrlParams({ subcategoryId: val || null, page: '0' });
  };

  const handleStockStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as StockStatusFilter;
    setSelectedStockStatus(val);
    setPage(0);
    updateUrlParams({ stockStatus: val === 'ALL' ? null : val, page: '0' });
  };

  const handleActiveToggle = () => {
    const next = !isActiveOnly;
    setIsActiveOnly(next);
    setPage(0);
    updateUrlParams({ isActive: next ? null : 'false', page: '0' });
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedBrandId('');
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
    setSelectedStockStatus('ALL');
    setIsActiveOnly(true);
    setPage(0);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const handleOpenAdjustmentModal = (item?: InventoryItemDto) => {
    setAdjustmentTargetItem(item || null);
    setIsAdjustmentModalOpen(true);
  };

  const items = inventoryData?.data || [];
  const totalElements = inventoryData?.totalElements || 0;
  const totalPages = inventoryData?.totalPages || 0;

  const hasActiveFilters =
    Boolean(search) ||
    Boolean(selectedBrandId) ||
    Boolean(selectedCategoryId) ||
    Boolean(selectedSubcategoryId) ||
    selectedStockStatus !== 'ALL' ||
    !isActiveOnly;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory & Stock"
        subtitle="Monitor sellable product variant stock on hand, review low-stock items, and perform manual adjustments."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/inventory/movements')}
              leftIcon={<History className="w-4 h-4" />}
            >
              Stock Movements
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => handleOpenAdjustmentModal()}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Manual Adjustment
            </Button>
          </div>
        }
      />

      {isError && (
        <ErrorMessage
          error={(error as Error)?.message || 'Failed to load inventory balances. Please retry.'}
        />
      )}

      {/* FILTER TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="lg:col-span-2">
            <Input
              placeholder="Search product name, SKU, or size..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="py-2"
            />
          </div>

          {/* Brand Filter */}
          <div>
            <Select
              value={selectedBrandId}
              onChange={handleBrandChange}
              options={[
                { value: '', label: 'All Brands' },
                ...(brandsData?.data.map((b) => ({ value: b.id, label: b.name })) || []),
              ]}
              className="py-2"
            />
          </div>

          {/* Category Filter */}
          <div>
            <Select
              value={selectedCategoryId}
              onChange={handleCategoryChange}
              options={[
                { value: '', label: 'All Categories' },
                ...(categoriesData?.data.map((c) => ({ value: c.id, label: c.name })) || []),
              ]}
              className="py-2"
            />
          </div>

          {/* Stock Status Filter */}
          <div>
            <Select
              value={selectedStockStatus}
              onChange={handleStockStatusChange}
              options={[
                { value: 'ALL', label: 'All Stock Levels' },
                { value: 'IN_STOCK', label: 'In Stock (> 0 pcs)' },
                { value: 'OUT_OF_STOCK', label: 'Zero Stock (0 pcs)' },
              ]}
              className="py-2"
            />
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Subcategory Filter (dependent on category) */}
            {selectedCategoryId && (
              <div className="w-48">
                <Select
                  value={selectedSubcategoryId}
                  onChange={handleSubcategoryChange}
                  options={[
                    { value: '', label: 'All Subcategories' },
                    ...(subcategoriesData?.data.map((s) => ({ value: s.id, label: s.name })) || []),
                  ]}
                  className="py-1 text-xs"
                />
              </div>
            )}

            {/* Active Toggle Button */}
            <button
              type="button"
              onClick={handleActiveToggle}
              className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                isActiveOnly
                  ? 'bg-slate-50 border-slate-300 text-slate-700'
                  : 'bg-teal-50 border-teal-300 text-teal-800'
              }`}
            >
              {isActiveOnly ? 'Viewing Active Only' : 'Viewing All (Inc. Inactive)'}
            </button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                leftIcon={<FilterX className="w-3.5 h-3.5" />}
                className="text-slate-500 hover:text-slate-800 text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            {isFetching && (
              <span className="flex items-center gap-1 text-teal-600">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Refreshing...
              </span>
            )}
            <span>
              Showing {items.length} of {totalElements} items
            </span>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <TableSkeleton rows={8} columns={7} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Boxes className="w-6 h-6" />}
            title={hasActiveFilters ? 'No inventory balances match filters' : 'No inventory items found'}
            description={
              hasActiveFilters
                ? 'Try broadening your search term, clearing brand or category filters, or showing all stock.'
                : 'Variants created in the product catalog will appear here with initial 0 stock balances.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">Product & SKU</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price (Incl. GST)</TableHead>
                  <TableHead className="text-right">Quantity on Hand</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const isOutOfStock = item.quantityOnHand === 0;
                  const price =
                    item.pricingMethod === 'FIXED' ? item.fixedPriceInclTax : item.mrpInclTax;

                  return (
                    <TableRow key={item.variantId} className="hover:bg-slate-50/60">
                      {/* Product & SKU */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {item.sku}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              {item.sizeLabel}
                            </span>
                          </div>
                          <Link
                            to={`/inventory/variants/${item.variantId}`}
                            className="font-medium text-sm text-teal-700 hover:text-teal-900 hover:underline block truncate max-w-xs"
                            title={item.productName}
                          >
                            {item.productName}
                          </Link>
                        </div>
                      </TableCell>

                      {/* Brand */}
                      <TableCell className="text-slate-700 text-sm font-medium">
                        {item.brandName || '—'}
                      </TableCell>

                      {/* Category & Subcategory */}
                      <TableCell className="text-slate-600 text-sm">
                        <div>{item.categoryName}</div>
                        {item.subcategoryName && (
                          <div className="text-xs text-slate-400">{item.subcategoryName}</div>
                        )}
                      </TableCell>

                      {/* Price */}
                      <TableCell className="text-right text-slate-700 text-sm font-medium">
                        {formatInr(price)}
                      </TableCell>

                      {/* Quantity on Hand */}
                      <TableCell className="text-right">
                        <span
                          className={`text-base font-bold ${
                            isOutOfStock
                              ? 'text-red-700'
                              : item.isLowStock
                              ? 'text-amber-700'
                              : 'text-slate-900'
                          }`}
                        >
                          {formatQuantity(item.quantityOnHand, 'pcs')}
                        </span>
                      </TableCell>

                      {/* Status Badges */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          {isOutOfStock ? (
                            <Badge variant="danger">Zero Stock</Badge>
                          ) : (
                            <Badge variant="success">In Stock</Badge>
                          )}

                          {item.isLowStock && !isOutOfStock && (
                            <Badge variant="warning">Low Stock</Badge>
                          )}

                          {!item.isActive && (
                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenAdjustmentModal(item)}
                            disabled={!item.isActive}
                            title={
                              !item.isActive
                                ? 'Adjustments disabled for inactive variants'
                                : 'Adjust stock for this variant'
                            }
                            className="text-teal-700 hover:text-teal-900 text-xs px-2 py-1"
                          >
                            Adjust
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/inventory/movements?variantId=${item.variantId}`)
                            }
                            title="View stock movement ledger"
                            className="text-slate-600 hover:text-slate-900 text-xs px-2 py-1"
                          >
                            Movements
                          </Button>
                          <Link
                            to={`/inventory/variants/${item.variantId}`}
                            className="text-slate-400 hover:text-slate-700 p-1 rounded"
                            title="View variant stock details"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="p-4 border-t border-slate-200">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalElements={totalElements}
                onPageChange={(newPage) => {
                  setPage(newPage);
                  updateUrlParams({ page: String(newPage) });
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* ADJUSTMENT MODAL */}
      <StockAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => {
          setIsAdjustmentModalOpen(false);
          setAdjustmentTargetItem(null);
        }}
        preselectedItem={adjustmentTargetItem}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
};
