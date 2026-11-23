import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  RefreshCw,
  FilterX,
  FileText,
  Download,
  Eye,
  Clock,
} from 'lucide-react';
import { invoiceApi } from '../../api/billing.api';
import { queryKeys } from '../../api/queryKeys';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { Badge } from '../../components/ui/Badge';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { CustomerSelector } from '../../components/party/CustomerSelector';
import { CustomerSiteSelector } from '../../components/party/CustomerSiteSelector';
import { useToast } from '../../hooks/useToast';
import {
  InvoiceDisplayFormat,
  InvoiceStatus,
  SettlementStatus,
} from '../../types/billing.types';
import { formatInr, formatBusinessDate } from '../../utils/formatters';

export const InvoicesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { error: toastError } = useToast();

  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [status, setStatus] = useState<string>('');
  const [settlementStatus, setSettlementStatus] = useState<string>('');
  const [displayFormat, setDisplayFormat] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(0);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Clear site if customer changes
  const handleCustomerChange = (val: string) => {
    setCustomerId(val);
    setSiteId('');
    setPage(0);
  };

  const handleResetFilters = () => {
    setSearch('');
    setCustomerId('');
    setSiteId('');
    setStatus('');
    setSettlementStatus('');
    setDisplayFormat('');
    setStartDate('');
    setEndDate('');
    setOverdueOnly(false);
    setPage(0);
  };

  const hasActiveFilters = Boolean(
    search ||
      customerId ||
      siteId ||
      status ||
      settlementStatus ||
      displayFormat ||
      startDate ||
      endDate ||
      overdueOnly
  );

  const {
    data: invoicesData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.invoices.list({
      search,
      customerId,
      siteId,
      status,
      settlementStatus,
      displayFormat,
      startDate,
      endDate,
      overdueOnly,
      page,
      size: 20,
    }),
    queryFn: ({ signal }) =>
      invoiceApi.searchInvoices(
        {
          search: search || undefined,
          customerId: customerId || undefined,
          siteId: siteId || undefined,
          status: (status as InvoiceStatus) || undefined,
          settlementStatus: (settlementStatus as SettlementStatus) || undefined,
          displayFormat: (displayFormat as InvoiceDisplayFormat) || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          overdueOnly: overdueOnly ? true : undefined,
          page,
          size: 20,
        },
        signal
      ),
  });

  const handleDownloadPdf = async (invoiceId: string, invoiceNumber: string, format: InvoiceDisplayFormat) => {
    setDownloadingId(invoiceId);
    try {
      const blob = await invoiceApi.downloadInvoicePdf(invoiceId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toastError('Failed to download invoice PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const invoices = invoicesData?.data || [];
  const totalPages = invoicesData?.totalPages || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Invoices"
        subtitle="Manage customer bills, track payment settlement, and review overdue receivables."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              isLoading={isFetching}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/billing/new')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Invoice
            </Button>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Search Invoice / Customer
            </label>
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="e.g. INV-00001 or Name..."
              className="text-xs"
            />
          </div>

          <div>
            <CustomerSelector
              value={customerId}
              onChange={handleCustomerChange}
              label="Customer"
            />
          </div>

          <div>
            <CustomerSiteSelector
              customerId={customerId}
              value={siteId}
              onChange={(val) => {
                setSiteId(val);
                setPage(0);
              }}
              label="Site"
              disabled={!customerId}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Settlement Status
            </label>
            <Select
              value={settlementStatus}
              onChange={(e) => {
                setSettlementStatus(e.target.value);
                setPage(0);
              }}
              options={[
                { label: 'All Settlement States', value: '' },
                { label: 'Unpaid', value: 'UNPAID' },
                { label: 'Partially Paid', value: 'PARTIALLY_PAID' },
                { label: 'Paid in Full', value: 'PAID' },
              ]}
              className="text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Display Format
            </label>
            <Select
              value={displayFormat}
              onChange={(e) => {
                setDisplayFormat(e.target.value);
                setPage(0);
              }}
              options={[
                { label: 'All Formats', value: '' },
                { label: 'Normal Format', value: 'NORMAL' },
                { label: 'GST Format', value: 'GST' },
              ]}
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Invoice Date From
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(0);
              }}
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Invoice Date To
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(0);
              }}
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-5">
            <Checkbox
              id="overdue-only-chk"
              label="Overdue Invoices Only"
              checked={overdueOnly}
              onChange={(e) => {
                setOverdueOnly(e.target.checked);
                setPage(0);
              }}
            />

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-slate-600 hover:text-slate-900"
                leftIcon={<FilterX className="w-3.5 h-3.5" />}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton columns={8} rows={6} />
          </div>
        ) : isError ? (
          <div className="p-6">
            <ErrorMessage
              error={error}
              title="Failed to load invoices"
              onRetry={() => refetch()}
            />
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<FileText className="w-8 h-8 text-slate-300" />}
              title="No Invoices Found"
              description={
                hasActiveFilters
                  ? 'No sales invoices match your active filters. Try resetting the filter criteria.'
                  : 'No customer sales invoices have been posted yet.'
              }
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/billing/new')}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Create New Invoice
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer & Site</TableHead>
                    <TableHead className="text-center">Format</TableHead>
                    <TableHead className="text-right">Total Payable (₹)</TableHead>
                    <TableHead className="text-right">Allocated (₹)</TableHead>
                    <TableHead className="text-right">Outstanding (₹)</TableHead>
                    <TableHead className="text-center">Due / Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => {
                    const outstandingNum = parseFloat(inv.outstandingAmount || '0');
                    return (
                      <TableRow key={inv.id} className="hover:bg-slate-50/70">
                        <TableCell className="font-medium text-slate-900">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {formatBusinessDate(inv.invoiceDate)}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-800">{inv.customerName}</div>
                          {inv.siteName && (
                            <div className="text-[11px] text-slate-400">Site: {inv.siteName}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={inv.displayFormat === 'GST' ? 'info' : 'neutral'}>
                            {inv.displayFormat}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-slate-900">
                          {formatInr(parseFloat(inv.totalPayableAmount))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-teal-700">
                          {formatInr(parseFloat(inv.totalAllocatedAmount))}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          <span className={outstandingNum > 0 ? 'text-rose-700' : 'text-slate-600'}>
                            {formatInr(outstandingNum)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Badge
                              variant={
                                inv.settlementStatus === 'PAID'
                                  ? 'success'
                                  : inv.settlementStatus === 'PARTIALLY_PAID'
                                  ? 'warning'
                                  : 'neutral'
                              }
                            >
                              {inv.settlementStatus}
                            </Badge>
                            {inv.isOverdue && outstandingNum > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                                <Clock className="w-3 h-3" /> Overdue {inv.daysOverdue}d
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/billing/invoices/${inv.id}`)}
                              className="text-xs px-2 py-1 h-7"
                              leftIcon={<Eye className="w-3.5 h-3.5 text-slate-500" />}
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadPdf(inv.id, inv.invoiceNumber, inv.displayFormat)}
                              isLoading={downloadingId === inv.id}
                              className="text-xs px-2 py-1 h-7 text-teal-700 hover:bg-teal-50"
                              leftIcon={<Download className="w-3.5 h-3.5" />}
                            >
                              PDF
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InvoicesListPage;
