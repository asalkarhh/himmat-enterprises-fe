import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Boxes,
  ArrowLeft,
  Plus,
  History,
  AlertTriangle,
  Package,
  Tag,
  Clock,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { inventoryApi } from '../../api/inventory.api';
import { queryKeys } from '../../api/queryKeys';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { StockAdjustmentModal } from '../../components/inventory/StockAdjustmentModal';
import { formatQuantity, formatInr, formatDateTime } from '../../utils/formatters';

export const VariantStockDetailPage: React.FC = () => {
  const { variantId } = useParams<{ variantId: string }>();
  const navigate = useNavigate();

  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  // Fetch variant inventory balance
  const {
    data: item,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.inventory.detail(variantId || ''),
    queryFn: ({ signal }) => inventoryApi.getInventoryByVariantId(variantId || '', signal),
    enabled: !!variantId,
  });

  // Fetch recent movements for this variant
  const { data: movementsData } = useQuery({
    queryKey: queryKeys.inventory.variantMovements(variantId || '', { size: 10 }),
    queryFn: ({ signal }) =>
      inventoryApi.getVariantMovements(variantId || '', { size: 10 }, signal),
    enabled: !!variantId,
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <Boxes className="w-8 h-8 animate-pulse text-teal-600 mx-auto mb-2" />
        <p className="text-sm font-medium">Loading variant stock balance...</p>
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/inventory')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Inventory
        </Button>
        <ErrorMessage
          error={
            (error as Error)?.message ||
            'Inventory balance not found for this variant or an integrity issue occurred.'
          }
        />
      </div>
    );
  }

  const isOutOfStock = item.quantityOnHand === 0;
  const recentMovements = movementsData?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${item.sku} — ${item.productName}`}
        subtitle={`Size: ${item.sizeLabel} • Brand: ${item.brandName || '—'} • Category: ${item.categoryName}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate(`/inventory/movements?variantId=${item.variantId}`)}
              leftIcon={<History className="w-4 h-4" />}
            >
              Movement History
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsAdjustmentModalOpen(true)}
              disabled={!item.isActive}
              title={
                !item.isActive
                  ? 'Manual stock adjustment is restricted to active variants'
                  : 'Adjust stock for this variant'
              }
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Adjust Stock
            </Button>
          </div>
        }
      />

      {/* INACTIVE VARIANT BANNER */}
      {!item.isActive && (
        <div className="flex items-start gap-3 p-4 bg-slate-100 border border-slate-300 rounded-xl text-slate-800">
          <AlertTriangle className="w-5 h-5 shrink-0 text-slate-600 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Discontinued / Inactive Variant</p>
            <p className="text-xs text-slate-600 mt-0.5">
              This variant is inactive in the product catalog. Historical stock on hand and past movements remain viewable for audit purposes. New manual operational adjustments are disabled.
            </p>
          </div>
        </div>
      )}

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Quantity on hand */}
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Quantity on Hand</span>
            <Boxes className="w-4 h-4 text-slate-400" />
          </div>
          <div
            className={`text-2xl font-bold ${
              isOutOfStock
                ? 'text-red-700'
                : item.isLowStock
                ? 'text-amber-700'
                : 'text-slate-900'
            }`}
          >
            {formatQuantity(item.quantityOnHand, 'pcs')}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {isOutOfStock ? (
              <Badge variant="danger">Zero Stock</Badge>
            ) : (
              <Badge variant="success">In Stock</Badge>
            )}
            {item.isLowStock && !isOutOfStock && <Badge variant="warning">Low Stock</Badge>}
          </div>
        </Card>

        {/* Pricing / MRP */}
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Selling Price</span>
            <Tag className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatInr(
              item.pricingMethod === 'FIXED' ? item.fixedPriceInclTax : item.mrpInclTax
            )}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Method: <span className="font-semibold text-slate-700">{item.pricingMethod}</span>
          </div>
        </Card>

        {/* Low Stock Threshold */}
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Low Stock Alert Threshold</span>
            <AlertTriangle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {item.lowStockThreshold !== null && item.lowStockThreshold !== undefined
              ? `${item.lowStockThreshold} pcs`
              : 'Not set'}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Triggers warning when stock falls to or below threshold.
          </div>
        </Card>

        {/* Concurrency Version & Audit */}
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Version & Verification</span>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-sm font-semibold text-slate-800">
            Balance Version: <span className="font-mono text-teal-700">v{item.version}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated: {formatDateTime(item.updatedAt)}</span>
          </div>
        </Card>
      </div>

      {/* CATALOG HIERARCHY DETAILS */}
      <Card className="p-6 border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-700" />
            Catalog Hierarchy & Master Reference
          </h3>
          <Link
            to={`/catalog/products/${item.productId}`}
            className="text-xs text-teal-700 hover:text-teal-900 flex items-center gap-1 font-medium hover:underline"
          >
            <span>Open in Catalog</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Product Name</p>
            <p className="font-medium text-slate-900 mt-0.5">{item.productName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Brand</p>
            <p className="font-medium text-slate-900 mt-0.5">{item.brandName || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Category</p>
            <p className="font-medium text-slate-900 mt-0.5">{item.categoryName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Subcategory</p>
            <p className="font-medium text-slate-900 mt-0.5">{item.subcategoryName || '—'}</p>
          </div>
        </div>
      </Card>

      {/* RECENT MOVEMENTS LEDGER */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-teal-700" />
            Recent Stock Movements
          </h3>
          <Link
            to={`/inventory/movements?variantId=${item.variantId}`}
            className="text-xs text-teal-700 hover:text-teal-900 font-semibold hover:underline"
          >
            View Full Movement History →
          </Link>
        </div>

        {recentMovements.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No stock movements recorded yet for this variant.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Movement Type</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Balance (Before → After)</TableHead>
                <TableHead>Reason / Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentMovements.map((m) => (
                <TableRow key={m.id} className="text-xs hover:bg-slate-50/50">
                  <TableCell className="text-slate-600 font-medium whitespace-nowrap">
                    {formatDateTime(m.occurredAt)}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[11px] font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                      {m.movementType}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.direction === 'IN' ? 'success' : 'warning'}>
                      {m.direction}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900">
                    {m.direction === 'IN' ? `+${m.quantity}` : `-${m.quantity}`} pcs
                  </TableCell>
                  <TableCell className="text-right text-slate-600 whitespace-nowrap">
                    <span className="text-slate-400">{m.quantityBefore}</span>
                    <span className="mx-1 text-slate-400">→</span>
                    <span className="font-bold text-slate-900">{m.quantityAfter} pcs</span>
                  </TableCell>
                  <TableCell className="text-slate-700 max-w-xs truncate" title={m.reason}>
                    {m.reason || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ADJUSTMENT MODAL */}
      <StockAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        preselectedItem={item}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
};
