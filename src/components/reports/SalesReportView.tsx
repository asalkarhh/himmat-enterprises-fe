import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { reportApi } from '../../api/report.api';
import { queryKeys } from '../../api/queryKeys';
import { CustomerSelector } from '../party/CustomerSelector';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import { TableSkeleton } from '../ui/LoadingSkeleton';
import { ErrorMessage } from '../ui/ErrorMessage';
import { EmptyState } from '../ui/EmptyState';
import { ReportingBasis } from '../../types/report.types';
import { formatInr, formatBusinessDate } from '../../utils/formatters';

const BASIS_OPTIONS = [
  { value: 'ACTIVITY', label: 'Activity Basis (by event posting date)' },
  { value: 'DOCUMENT', label: 'Document Basis (by original invoice date)' },
];

export const SalesReportView: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const firstOfMonthStr = `${todayStr.slice(0, 7)}-01`;

  const [startDate, setStartDate] = useState(firstOfMonthStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [basis, setBasis] = useState<ReportingBasis>('ACTIVITY');
  const [customerId, setCustomerId] = useState<string>('');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.reports.sales({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      basis,
      customerId: customerId || undefined,
    }),
    queryFn: ({ signal }) =>
      reportApi.getSalesReport(
        {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          basis,
          customerId: customerId || undefined,
        },
        signal
      ),
  });

  const resetFilters = () => {
    setStartDate(firstOfMonthStr);
    setEndDate(todayStr);
    setBasis('ACTIVITY');
    setCustomerId('');
  };

  const items = data?.items || [];
  const unknownTaxNum = parseFloat(data?.unknownTaxSales || '0');

  return (
    <div className="space-y-5">
      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Reporting Basis
            </label>
            <Select
              options={BASIS_OPTIONS}
              value={basis}
              onChange={(e) => setBasis(e.target.value as ReportingBasis)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Filter Customer (Optional)
            </label>
            <CustomerSelector
              value={customerId}
              onChange={(cId) => setCustomerId(cId)}
              placeholder="All customers..."
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
              {basis === 'ACTIVITY'
                ? 'Activity basis reflects transactions posted within the selected period (invoices on bill date, revisions on edit date, returns on return date).'
                : 'Document basis reflects current effective bill balances grouped by original invoice date (later corrections affect the original invoice period).'}
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
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {isError && (
        <ErrorMessage
          error={error}
          title="Failed to load sales report"
          onRetry={() => refetch()}
        />
      )}

      {/* Summary KPI Strip */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-3 border-l-4 border-l-teal-600">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Gross Sales
            </span>
            <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
              {formatInr(parseFloat(data.totalGrossSales || '0'))}
            </span>
          </Card>

          <Card className="p-3 border-l-4 border-l-amber-500">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Revisions Delta
            </span>
            <span className="text-lg font-bold font-mono text-slate-800 mt-0.5 block">
              {formatInr(parseFloat(data.totalRevisionsDelta || '0'))}
            </span>
          </Card>

          <Card className="p-3 border-l-4 border-l-blue-500">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Returns Credit
            </span>
            <span className="text-lg font-bold font-mono text-blue-700 mt-0.5 block">
              -{formatInr(parseFloat(data.totalReturnsCredit || '0'))}
            </span>
          </Card>

          <Card className="p-3 border-l-4 border-l-emerald-600 bg-emerald-50/20">
            <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Total Net Sales
            </span>
            <span className="text-lg font-bold font-mono text-emerald-900 mt-0.5 block">
              {formatInr(parseFloat(data.totalNetSales || '0'))}
            </span>
          </Card>

          <Card className="p-3 border-l-4 border-l-slate-400">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Taxable
            </span>
            <span className="text-lg font-bold font-mono text-slate-700 mt-0.5 block">
              {formatInr(parseFloat(data.totalTaxableAmount || '0'))}
            </span>
          </Card>

          <Card className="p-3 border-l-4 border-l-slate-400">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total GST
            </span>
            <span className="text-lg font-bold font-mono text-slate-700 mt-0.5 block">
              {formatInr(parseFloat(data.totalTaxAmount || '0'))}
            </span>
          </Card>
        </div>
      )}

      {/* Unknown Tax Warning Banner */}
      {unknownTaxNum > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Unknown Tax Rate Notice:</strong> Invoices totaling{' '}
              <strong className="font-mono">{formatInr(unknownTaxNum)}</strong> contain products with unconfigured GST slabs and are excluded from taxable/GST sums.
            </span>
          </div>
          <Badge variant="warning" className="text-[10px]">
            Unclassified Tax
          </Badge>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {items.length === 0 && !isLoading ? (
          <div className="p-8">
            <EmptyState
              icon={<TrendingUp className="w-12 h-12 text-slate-300" />}
              title="No sales transactions found"
              description="No sales invoices, revisions, or returns match the selected period and customer filters."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Document #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-center">Event Type</TableHead>
                  <TableHead className="text-right">Gross / Delta (₹)</TableHead>
                  <TableHead className="text-right">Returns (₹)</TableHead>
                  <TableHead className="text-right">Net Amount (₹)</TableHead>
                  <TableHead className="text-right">Taxable (₹)</TableHead>
                  <TableHead className="text-right">GST (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton columns={10} rows={6} />
                ) : (
                  items.map((item, idx) => (
                    <TableRow key={`${item.documentNumber}-${idx}`} className="hover:bg-slate-50/70">
                    <TableCell className="text-slate-400 font-mono text-center">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-teal-800">
                      {item.type === 'INVOICE' || item.type === 'REVISION' ? (
                        <Link
                          to={`/billing/invoices/${item.documentNumber}`}
                          className="hover:underline"
                        >
                          {item.documentNumber}
                        </Link>
                      ) : (
                        item.documentNumber
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 whitespace-nowrap">
                      {formatBusinessDate(item.documentDate)}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900 max-w-xs truncate" title={item.customerName}>
                      {item.customerName}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          item.type === 'INVOICE'
                            ? 'default'
                            : item.type === 'REVISION'
                            ? 'warning'
                            : 'info'
                        }
                        size="sm"
                        className="text-[10px]"
                      >
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-700">
                      {formatInr(parseFloat(item.grossOrDeltaAmount || '0'))}
                    </TableCell>
                    <TableCell className="text-right font-mono text-blue-700">
                      {parseFloat(item.returnsAmount || '0') > 0
                        ? `-${formatInr(parseFloat(item.returnsAmount))}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-900">
                      {formatInr(parseFloat(item.netAmount || '0'))}
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
