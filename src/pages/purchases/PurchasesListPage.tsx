import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Truck,
  Plus,
  RefreshCw,
  FilterX,
  FileText,
  Download,
} from 'lucide-react';
import { purchaseApi } from '../../api/purchase.api';
import { supplierApi } from '../../api/party.api';
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
import { PurchaseStatus } from '../../types/purchase.types';
import { formatInr, formatBusinessDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const PurchasesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { error: toastError } = useToast();

  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  // URL query params
  const supplierIdParam = searchParams.get('supplierId') || '';
  const statusParam = (searchParams.get('status') as PurchaseStatus) || '';
  const startDateParam = searchParams.get('startDate') || '';
  const endDateParam = searchParams.get('endDate') || '';
  const searchParam = searchParams.get('search') || '';
  const pageParam = parseInt(searchParams.get('page') || '0', 10);

  const [page, setPage] = useState(isNaN(pageParam) ? 0 : pageParam);
  const [supplierId, setSupplierId] = useState(supplierIdParam);
  const [status, setStatus] = useState<PurchaseStatus | ''>(statusParam);
  const [startDate, setStartDate] = useState(startDateParam);
  const [endDate, setEndDate] = useState(endDateParam);
  const [search, setSearch] = useState(searchParam);

  // Fetch active suppliers for dropdown
  const { data: suppliersData } = useQuery({
    queryKey: queryKeys.suppliers.list({ size: 100, isActive: true }),
    queryFn: ({ signal }) => supplierApi.getSuppliers({ size: 100, isActive: true }, signal),
  });

  // Fetch purchases
  const {
    data: purchasesData,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.purchases.list({
      supplierId: supplierId || undefined,
      status: status || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: search || undefined,
      page,
      size: 20,
    }),
    queryFn: ({ signal }) =>
      purchaseApi.getPurchases(
        {
          supplierId: supplierId || undefined,
          status: status || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search: search || undefined,
          page,
          size: 20,
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

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(0);
    updateUrlParams({ search: val || null, page: '0' });
  };

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSupplierId(val);
    setPage(0);
    updateUrlParams({ supplierId: val || null, page: '0' });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as PurchaseStatus | '';
    setStatus(val);
    setPage(0);
    updateUrlParams({ status: val || null, page: '0' });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStartDate(val);
    setPage(0);
    updateUrlParams({ startDate: val || null, page: '0' });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEndDate(val);
    setPage(0);
    updateUrlParams({ endDate: val || null, page: '0' });
  };

  const handleResetFilters = () => {
    setSupplierId('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setPage(0);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  // PDF download handler
  const handleDownloadPdf = async (purchaseId: string, purchaseNumber: string) => {
    setDownloadingPdfId(purchaseId);
    try {
      const blob = await purchaseApi.downloadPurchasePdf(purchaseId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${purchaseNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toastError('Failed to download purchase PDF document.');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const items = purchasesData?.data || [];
  const totalElements = purchasesData?.totalElements || 0;
  const totalPages = purchasesData?.totalPages || 0;

  const hasActiveFilters =
    Boolean(supplierId) ||
    Boolean(status) ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    Boolean(search);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases & Inward Goods"
        subtitle="Manage vendor purchase bills, monitor inward goods, and track supplier payables."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/purchases/new')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Inward Purchase
            </Button>
          </div>
        }
      />

      {isError && (
        <ErrorMessage
          error={(error as Error)?.message || 'Failed to load purchase invoices. Please retry.'}
        />
      )}

      {/* FILTER TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="lg:col-span-2">
            <Input
              placeholder="Search PO # or vendor invoice..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="py-2"
            />
          </div>

          {/* Supplier */}
          <div>
            <Select
              value={supplierId}
              onChange={handleSupplierChange}
              options={[
                { value: '', label: 'All Suppliers' },
                ...(suppliersData?.data.map((s) => ({
                  value: s.id,
                  label: `[${s.supplierCode}] ${s.name}`,
                })) || []),
              ]}
              className="py-2"
            />
          </div>

          {/* Status */}
          <div>
            <Select
              value={status}
              onChange={handleStatusChange}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'POSTED', label: 'Posted' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
              className="py-2"
            />
          </div>

          {/* Date boundaries */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={handleStartDateChange}
              className="py-2 text-xs"
            />
            <Input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={handleEndDateChange}
              className="py-2 text-xs"
            />
          </div>
        </div>

        {/* Action row */}
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
              Showing {items.length} of {totalElements} purchases
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
            icon={<Truck className="w-6 h-6" />}
            title={hasActiveFilters ? 'No purchases match selected filters' : 'No purchase bills recorded yet'}
            description={
              hasActiveFilters
                ? 'Try clearing date ranges, supplier filters, or searching a different invoice reference.'
                : 'Inward goods and purchase bills posted from suppliers will appear here.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => navigate('/purchases/new')}>
                  Create Purchase
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">PO Number</TableHead>
                  <TableHead className="w-32">Vendor Bill #</TableHead>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Total Payable</TableHead>
                  <TableHead className="text-right">Allocated / Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => {
                  const isSettled = parseFloat(p.outstandingBalance) === 0;

                  return (
                    <TableRow key={p.id} className="hover:bg-slate-50/60 text-xs">
                      {/* PO Number */}
                      <TableCell>
                        <Link
                          to={`/purchases/${p.id}`}
                          className="font-mono font-bold text-teal-700 hover:text-teal-900 hover:underline block"
                        >
                          {p.purchaseNumber}
                        </Link>
                      </TableCell>

                      {/* Vendor bill reference */}
                      <TableCell className="font-mono text-slate-600">
                        {p.supplierInvoiceNumber || '—'}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-slate-600 whitespace-nowrap">
                        {formatBusinessDate(p.purchaseDate)}
                      </TableCell>

                      {/* Supplier */}
                      <TableCell>
                        <Link
                          to={`/suppliers/${p.supplierId}`}
                          className="font-medium text-slate-800 hover:text-teal-700 block truncate max-w-xs hover:underline"
                          title={p.supplierName}
                        >
                          {p.supplierName}
                        </Link>
                      </TableCell>

                      {/* Total Payable */}
                      <TableCell className="text-right font-medium text-slate-900">
                        {formatInr(p.totalPayableAmount)}
                      </TableCell>

                      {/* Allocated */}
                      <TableCell className="text-right text-emerald-700 font-medium">
                        {formatInr(p.totalAllocatedAmount)}
                      </TableCell>

                      {/* Outstanding */}
                      <TableCell className="text-right">
                        <span
                          className={`font-bold ${
                            isSettled ? 'text-slate-500' : 'text-red-700'
                          }`}
                        >
                          {formatInr(p.outstandingBalance)}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        <Badge variant={p.status === 'POSTED' ? 'success' : 'danger'}>
                          {p.status}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/purchases/${p.id}`}
                            className="p-1.5 text-slate-500 hover:text-teal-700 rounded transition-colors"
                            title="View purchase detail"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(p.id, p.purchaseNumber)}
                            disabled={downloadingPdfId === p.id}
                            className="p-1.5 text-slate-500 hover:text-slate-800 rounded transition-colors"
                            title="Download PDF"
                          >
                            {downloadingPdfId === p.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
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
    </div>
  );
};
