import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  Info,
  DollarSign,
  Receipt,
  Layers,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { reportApi } from '../../api/report.api';
import { brandApi, categoryApi } from '../../api/catalog.api';
import { queryKeys } from '../../api/queryKeys';
import { useAuth } from '../../hooks/useAuth';
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

const getDefaultDates = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
};

export const ProfitReportView: React.FC = () => {
  const { isOwner, hasPermission } = useAuth();
  const isAuthorized = isOwner || hasPermission('REPORT:PROFIT');

  const defaultDates = getDefaultDates();
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [brandId, setBrandId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');

  // Fetch Brands and Categories for dropdowns
  const { data: brandsData } = useQuery({
    queryKey: queryKeys.brands.list({ size: 100 }),
    queryFn: ({ signal }) => brandApi.getBrands({ size: 100 }, signal),
    enabled: isAuthorized,
  });

  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.categories.list({ size: 100 }),
    queryFn: ({ signal }) => categoryApi.getCategories({ size: 100 }, signal),
    enabled: isAuthorized,
  });

  // Profit Summary and Product Breakdown Query
  const {
    data: summaryData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.reports.profit({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      brandId: brandId || undefined,
      categoryId: categoryId || undefined,
    }),
    queryFn: ({ signal }) =>
      reportApi.getProfitReport(
        {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          brandId: brandId || undefined,
          categoryId: categoryId || undefined,
        },
        signal
      ),
    enabled: isAuthorized,
  });

  if (!isAuthorized) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-12 w-12 text-amber-600 mb-3" />
        <h3 className="text-lg font-bold text-amber-900">Owner Access Restricted</h3>
        <p className="mt-2 text-sm text-amber-700 max-w-md mx-auto">
          Business profit, margins, and cost-of-goods-sold reports are restricted to Owner credentials.
          Please contact an Owner or log in with an authorized account to access financial margins.
        </p>
      </div>
    );
  }

  const brandOptions = [
    { value: '', label: 'All Brands' },
    ...(brandsData?.data.map((b) => ({ value: String(b.id), label: b.name })) || []),
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...(categoriesData?.data.map((c) => ({ value: String(c.id), label: c.name })) || []),
  ];

  const products = summaryData?.productBreakdown || [];
  const coverageNumber = parseFloat(summaryData?.costCoveragePct || '0');
  const excludedSalesNumber = parseFloat(summaryData?.salesValueExcludedUnknownCost || '0');
  const netProfitNumber = parseFloat(summaryData?.estimatedNetProfit || '0');

  return (
    <div className="space-y-6">
      {/* Policy Disclaimer Banner */}
      <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 text-teal-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-teal-700 mt-0.5 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-teal-900">
              Immutable Purchase Cost Snapshot Accounting:
            </span>{' '}
            Gross margin and COGS calculations are strictly derived from line-item unit purchase cost
            snapshots captured at transaction time. Unconfigured or unknown purchase costs are never
            substituted with zero, but tracked separately to protect margin integrity.
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Badge variant="neutral" className="border-teal-300 text-teal-800 bg-white">
            Owner View Only
          </Badge>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">From Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">To Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Filter Brand</label>
            <Select
              options={brandOptions}
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Filter Category</label>
            <Select
              options={categoryOptions}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full text-sm"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </Card>

      {/* Error state */}
      {isError && (
        <ErrorMessage
          error={error}
          title="Failed to load profit report data"
          onRetry={() => refetch()}
        />
      )}

      {/* Financial Summary KPI Cards */}
      {summaryData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-blue-600 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Known Net Revenue</span>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {formatInr(summaryData.knownNetRevenue)}
            </div>
            <p className="mt-1 text-xs text-slate-500">Period billed net of returns</p>
          </Card>

          <Card className="p-4 border-l-4 border-l-amber-600 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Known COGS</span>
              <Layers className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {formatInr(summaryData.knownCogs)}
            </div>
            <p className="mt-1 text-xs text-slate-500">Cost of goods sold (known purchase cost)</p>
          </Card>

          <Card className="p-4 border-l-4 border-l-teal-600 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Gross Profit & Margin</span>
              <TrendingUp className="h-4 w-4 text-teal-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-teal-700">
              {formatInr(summaryData.knownGrossProfit)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Gross Margin:</span>
              <span className="font-semibold text-teal-700 font-mono">
                {summaryData.knownGrossMarginPct}%
              </span>
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-purple-600 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Est. Net Profit</span>
              <Receipt className="h-4 w-4 text-purple-600" />
            </div>
            <div
              className={`text-2xl font-bold font-mono ${
                netProfitNumber >= 0 ? 'text-purple-700' : 'text-rose-600'
              }`}
            >
              {formatInr(summaryData.estimatedNetProfit)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Operating Expenses:</span>
              <span className="font-mono">{formatInr(summaryData.totalOperatingExpenses)}</span>
            </div>
          </Card>
        </div>
      )}

      {/* Cost Coverage & Missing Cost Alert */}
      {summaryData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4 border border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-800">Purchase Cost Coverage</span>
              <Badge
                variant={
                  coverageNumber >= 90
                    ? 'success'
                    : coverageNumber >= 70
                    ? 'warning'
                    : 'danger'
                }
              >
                {summaryData.costCoveragePct}% Documented
              </Badge>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
              <div
                className={`h-2.5 rounded-full ${
                  coverageNumber >= 90
                    ? 'bg-emerald-600'
                    : coverageNumber >= 70
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, coverageNumber || 0))}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              Percentage of sales revenue backed by an immutable purchase cost baseline. High coverage
              guarantees accurate net profit reports.
            </p>
          </Card>

          <Card
            className={`p-4 border ${
              excludedSalesNumber > 0
                ? 'border-amber-300 bg-amber-50/50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {excludedSalesNumber > 0 ? (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              )}
              <span className="text-sm font-semibold text-slate-800">
                Excluded Sales (Unrecorded Inward Cost)
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900">
              {formatInr(summaryData.salesValueExcludedUnknownCost)}
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {excludedSalesNumber > 0
                ? 'Sales revenue for variants where unit purchase cost was never logged in inward purchases. These items are omitted from COGS to avoid skewing margins.'
                : 'All variant sales in this date window have validated purchase cost records.'}
            </p>
          </Card>
        </div>
      )}

      {/* Product Profit Breakdown Table */}
      <Card className="shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Variant-Level Profit Analysis</h3>
            <p className="text-xs text-slate-500">
              Sales performance, known COGS, and gross margins sorted by product variant
            </p>
          </div>
          <Badge variant="neutral" className="text-xs text-slate-600">
            {products.length} {products.length === 1 ? 'Variant' : 'Variants'} Sold
          </Badge>
        </div>

        {products.length === 0 && !isLoading ? (
          <EmptyState
            title="No product sales recorded"
            description="There were no product sales recorded matching the selected date range and catalog filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">SKU</TableHead>
                  <TableHead>Product Variant</TableHead>
                  <TableHead>Brand & Category</TableHead>
                  <TableHead className="text-right">Qty Sold</TableHead>
                  <TableHead className="text-right">Net Revenue</TableHead>
                  <TableHead className="text-right">Known COGS</TableHead>
                  <TableHead className="text-right">Gross Profit</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                  <TableHead className="text-center">Cost Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton columns={9} rows={8} />
                ) : (
                  products.map((p) => {
                    const grossProfitNum = parseFloat(p.grossProfit || '0');
                    const grossMarginPctNum = parseFloat(p.grossMarginPct || '0');

                    return (
                      <TableRow key={p.variantId}>
                        <TableCell className="font-mono text-xs font-semibold text-slate-900">
                          {p.sku}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {p.productName} {p.sizeLabel ? `(${p.sizeLabel})` : ''}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {p.brandName || '—'} {p.categoryName ? `• ${p.categoryName}` : ''}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {p.netQuantity?.toLocaleString()} pcs
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-slate-900">
                          {formatInr(p.netRevenue)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-slate-600">
                          {p.costAvailable ? formatInr(p.netCogs) : '—'}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono text-xs font-semibold ${
                            !p.costAvailable
                              ? 'text-slate-400'
                              : grossProfitNum >= 0
                              ? 'text-teal-700'
                              : 'text-rose-600'
                          }`}
                        >
                          {p.costAvailable ? formatInr(p.grossProfit) : 'Unknown'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {p.costAvailable ? (
                            <span
                              className={`font-semibold ${
                                grossMarginPctNum >= 20
                                  ? 'text-emerald-700'
                                  : grossMarginPctNum >= 10
                                  ? 'text-amber-700'
                                  : 'text-rose-600'
                              }`}
                            >
                              {p.grossMarginPct}%
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {p.costAvailable ? (
                            <Badge variant="success" size="sm">
                              Known Cost
                            </Badge>
                          ) : (
                            <Badge variant="warning" size="sm">
                              Missing Inward
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};
