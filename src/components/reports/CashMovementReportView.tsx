import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
} from 'lucide-react';
import { reportApi } from '../../api/report.api';
import { queryKeys } from '../../api/queryKeys';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import { TableSkeleton } from '../ui/LoadingSkeleton';
import { ErrorMessage } from '../ui/ErrorMessage';
import { EmptyState } from '../ui/EmptyState';
import { PaymentMethod } from '../../types/purchase.types';
import { formatInr, formatBusinessDate } from '../../utils/formatters';

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'All Tender Modes (Cash & Online)' },
  { value: 'CASH', label: 'Cash Only' },
  { value: 'ONLINE', label: 'Online / Bank Only' },
];

export const CashMovementReportView: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const firstOfMonthStr = `${todayStr.slice(0, 7)}-01`;

  const [startDate, setStartDate] = useState(firstOfMonthStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.reports.cashMovements({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      paymentMethod: (paymentMethod as PaymentMethod) || undefined,
    }),
    queryFn: ({ signal }) =>
      reportApi.getCashMovementReport(
        {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          paymentMethod: (paymentMethod as PaymentMethod) || undefined,
        },
        signal
      ),
  });

  const resetFilters = () => {
    setStartDate(firstOfMonthStr);
    setEndDate(todayStr);
    setPaymentMethod('');
  };

  const items = data?.items || [];
  const netCashflowNum = parseFloat(data?.netCashflow || '0');

  const formatSourceType = (src: string) => {
    switch (src) {
      case 'CUSTOMER_RECEIPT':
        return 'Customer Receipt';
      case 'SUPPLIER_REFUND':
        return 'Supplier Refund';
      case 'SUPPLIER_PAYMENT':
        return 'Supplier Payment';
      case 'CUSTOMER_REFUND':
        return 'Customer Refund';
      case 'OPERATIONAL_EXPENSE':
        return 'Operational Expense';
      default:
        return src;
    }
  };

  return (
    <div className="space-y-5">
      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Payment Mode
            </label>
            <Select
              options={PAYMENT_METHOD_OPTIONS}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
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
              Recorded Money Movements represents actual cash and bank inflows/outflows logged in the shop system. It does not represent a reconciled bank statement.
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
          title="Failed to load cash movement report"
          onRetry={() => refetch()}
        />
      )}

      {/* Summary KPI Strip */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="p-3 border-l-4 border-l-emerald-600 bg-emerald-50/20">
            <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Grand Total Inflow
            </span>
            <span className="text-xl font-bold font-mono text-emerald-900 mt-0.5 block">
              {formatInr(parseFloat(data.grandTotalIn || '0'))}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Cash: {formatInr(parseFloat(data.totalCashIn || '0'))} &bull; Online: {formatInr(parseFloat(data.totalOnlineIn || '0'))}
            </span>
          </Card>

          <Card className="p-3 border-l-4 border-l-rose-600 bg-rose-50/20">
            <span className="text-[10px] font-semibold text-rose-800 uppercase tracking-wider block">
              Grand Total Outflow
            </span>
            <span className="text-xl font-bold font-mono text-rose-900 mt-0.5 block">
              {formatInr(parseFloat(data.grandTotalOut || '0'))}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Cash: {formatInr(parseFloat(data.totalCashOut || '0'))} &bull; Online: {formatInr(parseFloat(data.totalOnlineOut || '0'))}
            </span>
          </Card>

          <Card className={`p-3 border-l-4 ${netCashflowNum >= 0 ? 'border-l-teal-600' : 'border-l-amber-600'}`}>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Net Recorded Cashflow
            </span>
            <span className={`text-xl font-bold font-mono mt-0.5 block ${netCashflowNum >= 0 ? 'text-teal-900' : 'text-amber-800'}`}>
              {netCashflowNum >= 0 ? '+' : ''}{formatInr(netCashflowNum)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Inflow less Outflow</span>
          </Card>

          <Card className="p-3 border-l-4 border-l-slate-400">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Net Physical Cash
            </span>
            <span className="text-lg font-bold font-mono text-slate-800 mt-0.5 block">
              {parseFloat(data.netCashMovement || '0') >= 0 ? '+' : ''}{formatInr(parseFloat(data.netCashMovement || '0'))}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">In drawer movement</span>
          </Card>

          <Card className="p-3 border-l-4 border-l-slate-400">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Net Online / Bank
            </span>
            <span className="text-lg font-bold font-mono text-slate-800 mt-0.5 block">
              {parseFloat(data.netOnlineMovement || '0') >= 0 ? '+' : ''}{formatInr(parseFloat(data.netOnlineMovement || '0'))}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">UPI & Bank transfer</span>
          </Card>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {items.length === 0 && !isLoading ? (
          <div className="p-8">
            <EmptyState
              icon={<DollarSign className="w-12 h-12 text-slate-300" />}
              title="No cash movements recorded"
              description="No receipts, payments, refunds, or expenses match the selected period and payment mode."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Flow</TableHead>
                  <TableHead>Source Type</TableHead>
                  <TableHead>Voucher / Document #</TableHead>
                  <TableHead>Party / Beneficiary</TableHead>
                  <TableHead className="text-center">Tender</TableHead>
                  <TableHead>Reference / UTR</TableHead>
                  <TableHead className="text-right">Amount (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton columns={9} rows={6} />
                ) : (
                  items.map((item, idx) => {
                  const isIn = item.movementType === 'IN';
                  return (
                    <TableRow key={`${item.sourceNumber}-${idx}`} className="hover:bg-slate-50/70">
                      <TableCell className="text-slate-400 font-mono text-center">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="text-slate-600 whitespace-nowrap">
                        {formatBusinessDate(item.date)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full ${
                            isIn
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isIn ? (
                            <ArrowDownLeft className="w-3 h-3 text-emerald-700" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-rose-700" />
                          )}
                          {isIn ? 'INFLOW' : 'OUTFLOW'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral" size="sm" className="text-[10px]">
                          {formatSourceType(item.sourceType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-medium text-slate-900">
                        {item.sourceNumber}
                      </TableCell>
                      <TableCell className="text-slate-800 font-medium max-w-xs truncate" title={item.partyName || ''}>
                        {item.partyName || <span className="text-slate-400 italic">Shop Internal</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={item.method === 'CASH' ? 'neutral' : 'info'}
                          size="sm"
                          className="text-[10px]"
                        >
                          {item.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">
                        {item.reference || '—'}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-bold ${isIn ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {isIn ? '+' : '-'}{formatInr(parseFloat(item.amount || '0'))}
                      </TableCell>
                    </TableRow>
                  );
                }))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};
