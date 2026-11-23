import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Receipt,
  Package,
  CreditCard,
  DollarSign,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { dashboardApi } from '../../api/dashboard.api';
import { queryKeys } from '../../api/queryKeys';
import { useAuth } from '../../hooks/useAuth';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import { QuantityDisplay } from '../../components/ui/QuantityDisplay';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { Input } from '../../components/ui/Input';

export const DashboardPage: React.FC = () => {
  const { isOwner } = useAuth();

  // Date range defaults: current calendar month
  const todayStr = new Date().toISOString().split('T')[0];
  const firstOfMonthStr = `${todayStr.slice(0, 7)}-01`;

  const [startDate, setStartDate] = useState(firstOfMonthStr);
  const [endDate, setEndDate] = useState(todayStr);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.dashboard.summary({ startDate, endDate }),
    queryFn: ({ signal }) =>
      dashboardApi.getSummary(
        {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
        signal
      ),
    staleTime: 30000,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Operational overview, billing activity, dues, and inventory health."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        }
      />

      {/* Date Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 text-slate-700 text-sm font-medium">
          <Calendar className="w-4 h-4 text-teal-700" />
          <span>Activity Period</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">From:</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="py-1.5 px-2.5 text-xs w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">To:</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="py-1.5 px-2.5 text-xs w-36"
            />
          </div>
        </div>
      </div>

      {isError && (
        <ErrorMessage
          error={error}
          title="Failed to load dashboard metrics"
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-white border border-slate-200 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
              <div className="h-8 bg-slate-200 rounded w-1/2 mb-3" />
              <div className="h-3 bg-slate-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Owner-Only Profit Card (Hidden completely for Managers) */}
          {isOwner && data.profitSummary && (
            <Card className="border-teal-200 bg-gradient-to-br from-teal-50/60 to-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-teal-950">Owner Profit & Margins</CardTitle>
                    <p className="text-xs text-teal-700">Calculated from immutable purchase cost snapshots</p>
                  </div>
                </div>
                <Badge variant="default">Owner Confidential</Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-2">
                  <div>
                    <span className="text-xs text-slate-500 block">Net Revenue</span>
                    <MoneyDisplay amount={data.profitSummary.netRevenue} className="text-base font-bold text-slate-900" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">COGS</span>
                    <MoneyDisplay amount={data.profitSummary.cogs} className="text-base font-bold text-slate-900" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Gross Profit</span>
                    <MoneyDisplay amount={data.profitSummary.grossProfit} colored className="text-base font-bold" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Operating Exp.</span>
                    <MoneyDisplay amount={data.profitSummary.operatingExpenses} className="text-base font-bold text-slate-900" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Est. Net Profit</span>
                    <MoneyDisplay amount={data.profitSummary.netProfit} colored className="text-base font-bold" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Margin Coverage</span>
                    <span className="text-base font-bold text-teal-800 tabular-nums">
                      {data.profitSummary.coveragePct}%
                    </span>
                  </div>
                </div>
                {parseFloat(data.profitSummary.unknownCostSales || '0') > 0 && (
                  <div className="mt-4 p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Excluded sales with unknown catalog costs:{' '}
                      <MoneyDisplay amount={data.profitSummary.unknownCostSales} className="font-semibold" />
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Operational KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Sales Activity */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800">Period Sales</CardTitle>
                <TrendingUp className="w-4 h-4 text-teal-600" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-xs text-slate-500 block">Net Sales</span>
                  <MoneyDisplay amount={data.netSales} className="text-2xl font-bold text-slate-900" />
                </div>
                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Gross Sales:</span>
                    <MoneyDisplay amount={data.grossSales} />
                  </div>
                  <div>
                    <span className="text-slate-400 block">Returns Credit:</span>
                    <MoneyDisplay amount={data.returnsCredit} />
                  </div>
                  <div className="col-span-2 text-slate-500">
                    {data.invoiceCount} invoices generated
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Collections & Cash */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800">Collections & Cash</CardTitle>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-xs text-slate-500 block">Net Collections</span>
                  <MoneyDisplay amount={data.netCollections} className="text-2xl font-bold text-slate-900" />
                </div>
                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Customer Receipts:</span>
                    <MoneyDisplay amount={data.customerReceipts} />
                  </div>
                  <div>
                    <span className="text-slate-400 block">Customer Refunds:</span>
                    <MoneyDisplay amount={data.customerRefunds} />
                  </div>
                  <div className="col-span-2 text-slate-500">
                    {data.receiptCount} payment receipts
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Receivables */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800">Customer Receivables</CardTitle>
                <Receipt className="w-4 h-4 text-rose-600" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-xs text-slate-500 block">Total Outstanding Dues</span>
                  <MoneyDisplay amount={data.totalCustomerOutstanding} className="text-2xl font-bold text-rose-700" />
                </div>
                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Overdue (&gt;30d):</span>
                    <MoneyDisplay amount={data.overdueCustomerReceivables} className="text-rose-600 font-semibold" />
                  </div>
                  <div>
                    <span className="text-slate-400 block">Customers with Dues:</span>
                    <span className="font-semibold text-slate-800">{data.customersWithDuesCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Purchases & Payables */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800">Purchases & Payables</CardTitle>
                <CreditCard className="w-4 h-4 text-indigo-600" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-xs text-slate-500 block">Net Purchases</span>
                  <MoneyDisplay amount={data.netPurchases} className="text-2xl font-bold text-slate-900" />
                </div>
                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Supplier Payments:</span>
                    <MoneyDisplay amount={data.periodSupplierPayments} />
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Supplier Dues:</span>
                    <MoneyDisplay amount={data.totalSupplierOutstanding} className="text-amber-700 font-semibold" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Operating Expenses */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800">Operating Expenses</CardTitle>
                <Layers className="w-4 h-4 text-slate-600" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-xs text-slate-500 block">Period Expenses</span>
                  <MoneyDisplay amount={data.periodOperatingExpenses} className="text-2xl font-bold text-slate-900" />
                </div>
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
                  {data.expenseCount} posted operational vouchers
                </div>
              </CardContent>
            </Card>

            {/* Inventory Health */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800">Inventory Health</CardTitle>
                <Package className="w-4 h-4 text-teal-600" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-xs text-slate-500 block">Total Catalog Variants</span>
                  <span className="text-2xl font-bold text-slate-900">{data.totalVariantsCount}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">Zero Stock:</span>
                    <Badge variant={data.zeroStockVariantsCount > 0 ? 'danger' : 'neutral'} size="sm">
                      <QuantityDisplay quantity={data.zeroStockVariantsCount} />
                    </Badge>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Low Stock:</span>
                    <Badge variant={data.lowStockVariantsCount > 0 ? 'warning' : 'neutral'} size="sm">
                      <QuantityDisplay quantity={data.lowStockVariantsCount} />
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DashboardPage;
