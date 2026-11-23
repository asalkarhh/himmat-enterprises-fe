import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  RefreshCw,
  Eye,
  CreditCard,
  Building2,
  Filter,
  DollarSign,
  Clock,
} from 'lucide-react';
import { duesApi } from '../../api/billing.api';
import { queryKeys } from '../../api/queryKeys';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { CustomerSelector } from '../../components/party/CustomerSelector';
import { CustomerSiteSelector } from '../../components/party/CustomerSiteSelector';
import { CustomerReceiptModal } from '../../components/billing/CustomerReceiptModal';
import { DueInvoiceDto } from '../../types/billing.types';
import { CustomerDto, CustomerSiteDto } from '../../types/party.types';
import { formatInr, formatBusinessDate } from '../../utils/formatters';

export const DuePaymentsPage: React.FC = () => {
  const navigate = useNavigate();

  // Filters state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | undefined>(undefined);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [dueStartDate, setDueStartDate] = useState('');
  const [dueEndDate, setDueEndDate] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(0);

  // Modal state
  const [receiptModalCustomer, setReceiptModalCustomer] = useState<{
    id: string | number;
    name: string;
    customerCode?: string;
  } | null>(null);
  const [preselectedInvoiceId, setPreselectedInvoiceId] = useState<string | null>(null);

  // Fetch dues summary (aggregate KPIs)
  const {
    data: duesSummary,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: queryKeys.dues.summary({
      customerId: selectedCustomerId || undefined,
      siteId: selectedSiteId || undefined,
      dueStartDate: dueStartDate || undefined,
      dueEndDate: dueEndDate || undefined,
      overdueOnly: overdueOnly || undefined,
    }),
    queryFn: ({ signal }) =>
      duesApi.getDuesSummary(
        {
          customerId: selectedCustomerId || undefined,
          siteId: selectedSiteId || undefined,
          dueStartDate: dueStartDate || undefined,
          dueEndDate: dueEndDate || undefined,
          overdueOnly: overdueOnly || undefined,
        },
        signal
      ),
  });

  // Fetch due invoices
  const {
    data: duesData,
    isLoading: isLoadingDues,
    isFetching: isFetchingDues,
    refetch: refetchDues,
  } = useQuery({
    queryKey: queryKeys.dues.list({
      customerId: selectedCustomerId || undefined,
      siteId: selectedSiteId || undefined,
      dueStartDate: dueStartDate || undefined,
      dueEndDate: dueEndDate || undefined,
      overdueOnly: overdueOnly || undefined,
      page,
      size: 20,
    }),
    queryFn: ({ signal }) =>
      duesApi.searchDueInvoices(
        {
          customerId: selectedCustomerId || undefined,
          siteId: selectedSiteId || undefined,
          dueStartDate: dueStartDate || undefined,
          dueEndDate: dueEndDate || undefined,
          overdueOnly: overdueOnly || undefined,
          page,
          size: 20,
        },
        signal
      ),
  });

  const handleCustomerChange = (customerId: string, customer?: CustomerDto) => {
    setSelectedCustomerId(customerId);
    setSelectedCustomer(customer);
    setSelectedSiteId('');
    setPage(0);
  };

  const handleSiteChange = (siteId: string, _site?: CustomerSiteDto) => {
    setSelectedSiteId(siteId);
    setPage(0);
  };

  const handleClearFilters = () => {
    setSelectedCustomerId('');
    setSelectedCustomer(undefined);
    setSelectedSiteId('');
    setDueStartDate('');
    setDueEndDate('');
    setOverdueOnly(false);
    setPage(0);
  };

  const handleOpenReceipt = (invoice: DueInvoiceDto) => {
    setReceiptModalCustomer({
      id: invoice.customerId,
      name: invoice.customerName,
    });
    setPreselectedInvoiceId(invoice.invoiceId);
  };

  const handleCloseReceiptModal = () => {
    setReceiptModalCustomer(null);
    setPreselectedInvoiceId(null);
  };

  const hasActiveFilters =
    Boolean(selectedCustomerId) ||
    Boolean(selectedSiteId) ||
    Boolean(dueStartDate) ||
    Boolean(dueEndDate) ||
    overdueOnly;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outstanding & Overdue Invoices"
        subtitle="Track customer dues, 30-day payment terms, overdue billings, and record immediate receipts"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchSummary();
                refetchDues();
              }}
              isLoading={isFetchingDues}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outstanding Amount */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Outstanding Dues
            </span>
            <div className="p-2 bg-amber-50 rounded-lg">
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold font-mono text-slate-900">
            {isLoadingSummary ? '...' : formatInr(duesSummary?.totalOutstandingAmount ?? 0)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Unsettled balance across all bills</div>
        </div>

        {/* Total Overdue Amount */}
        <div className="bg-white rounded-xl border border-rose-200 shadow-sm p-5 bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Total Overdue Amount
            </span>
            <div className="p-2 bg-rose-100 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold font-mono text-rose-700">
            {isLoadingSummary ? '...' : formatInr(duesSummary?.totalOverdueAmount ?? 0)}
          </div>
          <div className="mt-1 text-xs text-rose-600">Past the 30-day payment term</div>
        </div>

        {/* Outstanding Invoices Count */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Outstanding Invoices
            </span>
            <div className="p-2 bg-slate-100 rounded-lg">
              <Building2 className="w-4 h-4 text-slate-600" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold font-mono text-slate-900">
            {isLoadingSummary ? '...' : duesSummary?.outstandingInvoiceCount ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-500">Partially or fully unpaid bills</div>
        </div>

        {/* Overdue Invoices Count */}
        <div className="bg-white rounded-xl border border-rose-200 shadow-sm p-5 bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Overdue Invoices
            </span>
            <div className="p-2 bg-rose-100 rounded-lg">
              <Clock className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold font-mono text-rose-700">
            {isLoadingSummary ? '...' : duesSummary?.overdueInvoiceCount ?? 0}
          </div>
          <div className="mt-1 text-xs text-rose-600">Bills requiring urgent follow-up</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Filter className="w-4 h-4 text-teal-600" />
            Filter Dues & Overdue Bills
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Reset Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <CustomerSelector
              value={selectedCustomerId}
              onChange={handleCustomerChange}
              placeholder="All Customers"
              initialCustomer={selectedCustomer}
            />
          </div>

          <div>
            <CustomerSiteSelector
              customerId={selectedCustomerId || undefined}
              value={selectedSiteId}
              onChange={handleSiteChange}
              placeholder="All Delivery Sites"
              disabled={!selectedCustomerId}
            />
          </div>

          <div>
            <label htmlFor="due-start-date" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Due Date From
            </label>
            <Input
              id="due-start-date"
              type="date"
              value={dueStartDate}
              onChange={(e) => {
                setDueStartDate(e.target.value);
                setPage(0);
              }}
            />
          </div>

          <div>
            <label htmlFor="due-end-date" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Due Date To
            </label>
            <Input
              id="due-end-date"
              type="date"
              value={dueEndDate}
              onChange={(e) => {
                setDueEndDate(e.target.value);
                setPage(0);
              }}
            />
          </div>
        </div>

        <div className="pt-2 flex items-center gap-6">
          <Checkbox
            id="overdue-only-check"
            label="Show overdue invoices only (exceeded 30 days)"
            checked={overdueOnly}
            onChange={(e) => {
              setOverdueOnly(e.target.checked);
              setPage(0);
            }}
          />
        </div>
      </div>

      {/* Dues Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoadingDues ? (
          <div className="p-6">
            <TableSkeleton columns={8} rows={6} />
          </div>
        ) : !duesData || duesData.data.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Building2 className="w-12 h-12 text-slate-300" />}
              title="No outstanding dues found"
              description={
                hasActiveFilters
                  ? 'No outstanding invoices match your active filter criteria.'
                  : 'All customer invoices are fully settled. There are no unpaid dues.'
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table ariaLabel="Outstanding dues table">
              <TableHeader>
                <TableRow>
                  <TableHead align="left">Invoice #</TableHead>
                  <TableHead align="left">Bill Date</TableHead>
                  <TableHead align="left">Customer</TableHead>
                  <TableHead align="left">Delivery Site</TableHead>
                  <TableHead align="right">Total Payable</TableHead>
                  <TableHead align="right">Allocated</TableHead>
                  <TableHead align="right">Outstanding Due</TableHead>
                  <TableHead align="center">Due Date / Aging</TableHead>
                  <TableHead align="right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duesData.data.map((inv) => (
                  <TableRow key={inv.invoiceId}>
                    <TableCell align="left">
                      <button
                        type="button"
                        onClick={() => navigate(`/billing/invoices/${inv.invoiceId}`)}
                        className="font-mono font-bold text-xs text-teal-700 hover:text-teal-900 hover:underline"
                      >
                        {inv.invoiceNumber}
                      </button>
                    </TableCell>

                    <TableCell align="left">
                      <span className="text-xs text-slate-800">
                        {formatBusinessDate(inv.invoiceDate)}
                      </span>
                    </TableCell>

                    <TableCell align="left">
                      <button
                        type="button"
                        onClick={() => navigate(`/customers/${inv.customerId}`)}
                        className="font-semibold text-xs text-slate-900 hover:text-teal-700 hover:underline block text-left"
                      >
                        {inv.customerName}
                      </button>
                    </TableCell>

                    <TableCell align="left">
                      <span className="text-xs text-slate-600">
                        {inv.siteName || <span className="text-slate-400 italic">Primary / Counter</span>}
                      </span>
                    </TableCell>

                    <TableCell align="right">
                      <span className="font-mono text-xs font-semibold text-slate-800">
                        {formatInr(inv.totalPayableAmount)}
                      </span>
                    </TableCell>

                    <TableCell align="right">
                      <span className="font-mono text-xs text-teal-700">
                        {formatInr(inv.totalAllocatedAmount)}
                      </span>
                    </TableCell>

                    <TableCell align="right">
                      <span className="font-mono text-xs font-bold text-rose-600">
                        {formatInr(inv.outstandingAmount)}
                      </span>
                    </TableCell>

                    <TableCell align="center">
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-slate-700">
                          {formatBusinessDate(inv.dueDate)}
                        </div>
                        {inv.isOverdue ? (
                          <Badge variant="danger" className="flex items-center gap-1 mx-auto w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            {inv.daysOverdue}d Overdue
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="mx-auto w-fit">
                            Due
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell align="right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/billing/invoices/${inv.invoiceId}`)}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReceipt(inv)}
                          leftIcon={<CreditCard className="w-3.5 h-3.5 text-teal-600" />}
                        >
                          Receipt
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="p-4 border-t border-slate-100">
              <Pagination
                currentPage={page}
                totalPages={duesData.totalPages}
                totalElements={duesData.totalElements}
                pageSize={20}
                onPageChange={setPage}
              />
            </div>
          </div>
        )}
      </div>

      {/* Customer Receipt Modal */}
      {receiptModalCustomer && (
        <CustomerReceiptModal
          isOpen={!!receiptModalCustomer}
          onClose={handleCloseReceiptModal}
          customer={receiptModalCustomer}
          preselectedInvoiceId={preselectedInvoiceId || undefined}
          onSuccess={() => {
            handleCloseReceiptModal();
            refetchSummary();
            refetchDues();
          }}
        />
      )}
    </div>
  );
};

export default DuePaymentsPage;
