import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  ShoppingBag,
  Info,
} from 'lucide-react';
import { reportApi } from '../../api/report.api';
import { queryKeys } from '../../api/queryKeys';
import { SupplierSelector } from '../party/SupplierSelector';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import { TableSkeleton } from '../ui/LoadingSkeleton';
import { ErrorMessage } from '../ui/ErrorMessage';
import { EmptyState } from '../ui/EmptyState';
import { formatInr, formatBusinessDate } from '../../utils/formatters';

export const PurchaseReportView: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const firstOfMonthStr = `${todayStr.slice(0, 7)}-01`;

  const [startDate, setStartDate] = useState(firstOfMonthStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [supplierId, setSupplierId] = useState<string>('');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.reports.purchases({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      supplierId: supplierId || undefined,
    }),
    queryFn: ({ signal }) =>
      reportApi.getPurchaseReport(
        {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          supplierId: supplierId || undefined,
        },
        signal
      ),
  });

  const resetFilters = () => {
    setStartDate(firstOfMonthStr);
    setEndDate(todayStr);
    setSupplierId('');
  };

  const items = data?.items || [];

  return (
    <div className="space-y-5">
      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Filter Supplier (Optional)
            </label>
            <SupplierSelector
              value={supplierId}
              onChange={(sId) => setSupplierId(sId)}
              placeholder="All suppliers..."
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>
              Inward stock purchases are distinguished from supplier payments and money refunds.
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
          title="Failed to load purchases report"
          onRetry={() => refetch()}
        />
      )}

      {/* Summary KPI Strip */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card className="p-3 border-l-4 border-l-indigo-600">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Gross Purchases
            </span>
            <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
              {formatInr(parseFloat(data.totalGrossPurchases || '0'))}
            </span>
          </Card>

          <Card className="p-3 border-l-4 border-l-amber-500">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Purchase Returns
            </span>
            <span className="text-lg font-bold font-mono text-amber-800 mt-0.5 block">
              -{formatInr(parseFloat(data.totalPurchaseReturns || '0'))}
            </span>
          </Card>

          <Card className="p-3 border-l-4 border-l-teal-600 bg-teal-50/20">
            <span className="text-[10px] font-semibold text-teal-900 uppercase tracking-wider block">
              Net Inward Value
            </span>
            <span className="text-lg font-bold font-mono text-teal-900 mt-0.5 block">
              {formatInr(parseFloat(data.totalNetPurchases || '0'))}
            </span>
          </Card>

          <Card className="p-3 border-l-4 border-l-emerald-600">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Supplier Payments
            </span>
            <span className="text-lg font-bold font-mono text-emerald-800 mt-0.5 block">
              {formatInr(parseFloat(data.totalSupplierPayments || '0'))}
            </span>
          </Card>

          <Card className="p-3 border-l-4 border-l-blue-600">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Supplier Refunds
            </span>
            <span className="text-lg font-bold font-mono text-blue-800 mt-0.5 block">
              {formatInr(parseFloat(data.totalSupplierRefunds || '0'))}
            </span>
          </Card>

          <Card className="p-3 border-l-4 border-l-slate-400">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Taxable Amount
            </span>
            <span className="text-lg font-bold font-mono text-slate-700 mt-0.5 block">
              {formatInr(parseFloat(data.totalTaxableAmount || '0'))}
            </span>
          </Card>

          <Card className="p-3 border-l-4 border-l-slate-400">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Inward GST
            </span>
            <span className="text-lg font-bold font-mono text-slate-700 mt-0.5 block">
              {formatInr(parseFloat(data.totalTaxAmount || '0'))}
            </span>
          </Card>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {items.length === 0 && !isLoading ? (
          <div className="p-8">
            <EmptyState
              icon={<ShoppingBag className="w-12 h-12 text-slate-300" />}
              title="No inward purchases found"
              description="No inward purchase bills or debit note returns match the selected period and supplier filters."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>PO / Document #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Vendor Bill #</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-right">Gross Amount (₹)</TableHead>
                  <TableHead className="text-right">Taxable (₹)</TableHead>
                  <TableHead className="text-right">GST (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton columns={9} rows={6} />
                ) : (
                  items.map((item, idx) => (
                  <TableRow key={`${item.documentNumber}-${idx}`} className="hover:bg-slate-50/70">
                    <TableCell className="text-slate-400 font-mono text-center">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-indigo-800">
                      <Link to={`/purchases`} className="hover:underline">
                        {item.documentNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-600 whitespace-nowrap">
                      {formatBusinessDate(item.documentDate)}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900 max-w-xs truncate" title={item.supplierName}>
                      {item.supplierName}
                    </TableCell>
                    <TableCell className="font-mono text-slate-600">
                      {item.supplierInvoiceNumber || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={item.type === 'PURCHASE' ? 'default' : 'warning'}
                        size="sm"
                        className="text-[10px]"
                      >
                        {item.type === 'PURCHASE' ? 'Purchase Inward' : 'Debit Note Return'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-900">
                      {formatInr(parseFloat(item.grossOrDeltaAmount || '0'))}
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-600">
                      {item.taxableAmount ? formatInr(parseFloat(item.taxableAmount)) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-600">
                      {item.taxAmount ? formatInr(parseFloat(item.taxAmount)) : '—'}
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
