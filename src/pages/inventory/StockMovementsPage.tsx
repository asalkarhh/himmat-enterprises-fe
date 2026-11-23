import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  History,
  FilterX,
  RefreshCw,
  Boxes,
  Plus,
} from 'lucide-react';
import { inventoryApi } from '../../api/inventory.api';
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
import {
  StockMovementDirection,
  StockMovementType,
} from '../../types/inventory.types';
import { formatDateTime, formatQuantity } from '../../utils/formatters';

const MOVEMENT_TYPE_OPTIONS = [
  { value: '', label: 'All Movement Types' },
  { value: 'MANUAL_ADJUSTMENT_IN', label: 'Manual Adjustment (IN)' },
  { value: 'MANUAL_ADJUSTMENT_OUT', label: 'Manual Adjustment (OUT)' },
  { value: 'PURCHASE_RECEIPT', label: 'Purchase Receipt (Inward)' },
  { value: 'PURCHASE_RETURN', label: 'Purchase Return (Outward)' },
  { value: 'SALE', label: 'Immediate POS Sale (Outward)' },
  { value: 'CUSTOMER_RETURN', label: 'Customer Return (Inward)' },
  { value: 'REVERSAL', label: 'Transaction Reversal' },
];

export const StockMovementsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Query params
  const variantIdParam = searchParams.get('variantId') || '';
  const directionParam = (searchParams.get('direction') as StockMovementDirection) || '';
  const movementTypeParam = (searchParams.get('movementType') as StockMovementType) || '';
  const fromDateParam = searchParams.get('fromDate') || '';
  const toDateParam = searchParams.get('toDate') || '';
  const pageParam = parseInt(searchParams.get('page') || '0', 10);

  const [page, setPage] = useState(isNaN(pageParam) ? 0 : pageParam);
  const [variantId, setVariantId] = useState(variantIdParam);
  const [direction, setDirection] = useState<StockMovementDirection | ''>(directionParam);
  const [movementType, setMovementType] = useState<StockMovementType | ''>(movementTypeParam);
  const [fromDate, setFromDate] = useState(fromDateParam);
  const [toDate, setToDate] = useState(toDateParam);

  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  // Fetch variant details if variantId is set (for context banner)
  const { data: scopedVariant } = useQuery({
    queryKey: queryKeys.inventory.detail(variantId || ''),
    queryFn: ({ signal }) => inventoryApi.getInventoryByVariantId(variantId || '', signal),
    enabled: !!variantId,
  });

  // Fetch movements
  const {
    data: movementsData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.inventory.movements({
      variantId: variantId || undefined,
      direction: direction || undefined,
      movementType: movementType || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      page,
      size: 25,
    }),
    queryFn: ({ signal }) =>
      inventoryApi.getMovements(
        {
          variantId: variantId || undefined,
          direction: (direction as StockMovementDirection) || undefined,
          movementType: (movementType as StockMovementType) || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          page,
          size: 25,
        },
        signal
      ),
  });

  const updateUrlParams = (newParams: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (!v) {
        next.delete(k);
      } else {
        next.set(k, v);
      }
    });
    setSearchParams(next, { replace: true });
  };

  const handleDirectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as StockMovementDirection | '';
    setDirection(val);
    setPage(0);
    updateUrlParams({ direction: val || null, page: '0' });
  };

  const handleMovementTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as StockMovementType | '';
    setMovementType(val);
    setPage(0);
    updateUrlParams({ movementType: val || null, page: '0' });
  };

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFromDate(val);
    setPage(0);
    updateUrlParams({ fromDate: val || null, page: '0' });
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setToDate(val);
    setPage(0);
    updateUrlParams({ toDate: val || null, page: '0' });
  };

  const handleClearVariantFilter = () => {
    setVariantId('');
    setPage(0);
    updateUrlParams({ variantId: null, page: '0' });
  };

  const handleResetFilters = () => {
    setVariantId('');
    setDirection('');
    setMovementType('');
    setFromDate('');
    setToDate('');
    setPage(0);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const items = movementsData?.data || [];
  const totalElements = movementsData?.totalElements || 0;
  const totalPages = movementsData?.totalPages || 0;

  const hasActiveFilters =
    Boolean(variantId) ||
    Boolean(direction) ||
    Boolean(movementType) ||
    Boolean(fromDate) ||
    Boolean(toDate);

  // Helper for movement type badge styling
  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case 'MANUAL_ADJUSTMENT_IN':
      case 'MANUAL_ADJUSTMENT_OUT':
        return (
          <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            {type}
          </span>
        );
      case 'PURCHASE_RECEIPT':
        return (
          <span className="font-mono text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
            PURCHASE_RECEIPT
          </span>
        );
      case 'PURCHASE_RETURN':
        return (
          <span className="font-mono text-xs font-semibold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
            PURCHASE_RETURN
          </span>
        );
      case 'SALE':
        return (
          <span className="font-mono text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
            SALE
          </span>
        );
      case 'CUSTOMER_RETURN':
        return (
          <span className="font-mono text-xs font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
            CUSTOMER_RETURN
          </span>
        );
      case 'REVERSAL':
        return (
          <span className="font-mono text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            REVERSAL
          </span>
        );
      default:
        // Readable fallback for unknown future movement types
        return (
          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements"
        subtitle="Immutable audit ledger of all inventory additions, deductions, purchases, sales, returns, and manual adjustments."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/inventory')}
              leftIcon={<Boxes className="w-4 h-4" />}
            >
              Inventory Balances
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsAdjustmentModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Manual Adjustment
            </Button>
          </div>
        }
      />

      {isError && (
        <ErrorMessage
          error={(error as Error)?.message || 'Failed to load stock movements. Please retry.'}
        />
      )}

      {/* SCOPED VARIANT CALLOUT */}
      {scopedVariant && (
        <div className="flex items-center justify-between p-3.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-sm">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-xs bg-teal-200/60 px-2 py-0.5 rounded border border-teal-300">
              {scopedVariant.sku}
            </span>
            <span className="font-medium">
              Filtered for <strong className="text-teal-950">{scopedVariant.productName}</strong> ({scopedVariant.sizeLabel})
            </span>
            <span className="text-teal-700 text-xs">
              • Current On Hand: <strong>{formatQuantity(scopedVariant.quantityOnHand, 'pcs')}</strong>
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearVariantFilter}
            className="text-teal-800 hover:text-teal-950 text-xs"
          >
            Clear Variant Filter
          </Button>
        </div>
      )}

      {/* FILTER TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Movement Type */}
          <div className="lg:col-span-2">
            <Select
              value={movementType}
              onChange={handleMovementTypeChange}
              options={MOVEMENT_TYPE_OPTIONS}
              className="py-2"
            />
          </div>

          {/* Direction */}
          <div>
            <Select
              value={direction}
              onChange={handleDirectionChange}
              options={[
                { value: '', label: 'All Directions (IN & OUT)' },
                { value: 'IN', label: '+ IN (Additions)' },
                { value: 'OUT', label: '- OUT (Deductions)' },
              ]}
              className="py-2"
            />
          </div>

          {/* From Date */}
          <div>
            <Input
              type="date"
              value={fromDate}
              onChange={handleFromDateChange}
              placeholder="From Date"
              className="py-2"
            />
          </div>

          {/* To Date */}
          <div>
            <Input
              type="date"
              value={toDate}
              onChange={handleToDateChange}
              placeholder="To Date"
              className="py-2"
            />
          </div>
        </div>

        {/* Action / Reset row */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                leftIcon={<FilterX className="w-3.5 h-3.5" />}
                className="text-slate-500 hover:text-slate-800 text-xs"
              >
                Reset Filters
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
              Showing {items.length} of {totalElements} movements
            </span>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <TableSkeleton rows={8} columns={8} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<History className="w-6 h-6" />}
            title={hasActiveFilters ? 'No movements match the selected filters' : 'No stock movements recorded yet'}
            description={
              hasActiveFilters
                ? 'Try broadening date boundaries, clearing direction filters, or selecting All Movement Types.'
                : 'Stock transactions from manual adjustments, inward purchases, and billing will populate this ledger.'
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
                  <TableHead className="w-44">Date & Time (IST)</TableHead>
                  <TableHead className="w-60">Product / Variant</TableHead>
                  <TableHead>Movement Type</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Balance Delta</TableHead>
                  <TableHead>Source Reference</TableHead>
                  <TableHead>Reason / Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((m) => (
                  <TableRow key={m.id} className="hover:bg-slate-50/60 text-xs">
                    {/* Timestamp in Asia/Kolkata */}
                    <TableCell className="text-slate-600 font-medium whitespace-nowrap">
                      {formatDateTime(m.occurredAt)}
                    </TableCell>

                    {/* Product & Variant */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-[11px] text-slate-900 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                            {m.sku}
                          </span>
                          {m.sizeLabel && (
                            <span className="text-[11px] text-slate-500">{m.sizeLabel}</span>
                          )}
                        </div>
                        <Link
                          to={`/inventory/variants/${m.variantId}`}
                          className="font-medium text-teal-700 hover:text-teal-900 hover:underline block truncate max-w-xs"
                          title={m.productName}
                        >
                          {m.productName}
                        </Link>
                      </div>
                    </TableCell>

                    {/* Movement Type */}
                    <TableCell>{getMovementTypeBadge(m.movementType)}</TableCell>

                    {/* Direction */}
                    <TableCell>
                      <Badge variant={m.direction === 'IN' ? 'success' : 'warning'}>
                        {m.direction}
                      </Badge>
                    </TableCell>

                    {/* Quantity */}
                    <TableCell className="text-right font-bold text-slate-900">
                      {m.direction === 'IN' ? `+${m.quantity}` : `-${m.quantity}`} pcs
                    </TableCell>

                    {/* Before -> After */}
                    <TableCell className="text-right whitespace-nowrap text-slate-600">
                      <span className="text-slate-400">{m.quantityBefore}</span>
                      <span className="mx-1 text-slate-400">→</span>
                      <span className="font-bold text-slate-900">{m.quantityAfter} pcs</span>
                    </TableCell>

                    {/* Source reference */}
                    <TableCell className="text-slate-700 whitespace-nowrap">
                      {m.sourceEntityType ? (
                        <span className="font-mono text-[11px] text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                          {m.sourceEntityType}
                          {m.businessEventId ? ` #${m.businessEventId}` : ''}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>

                    {/* Reason */}
                    <TableCell className="text-slate-600 max-w-xs truncate" title={m.reason}>
                      {m.reason || '—'}
                    </TableCell>
                  </TableRow>
                ))}
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
        onClose={() => setIsAdjustmentModalOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
};
