import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  RefreshCw,
  Search,
  Download,
  Layers,
  Calendar,
  Eye,
} from 'lucide-react';
import { expenseApi } from '../../api/expense.api';
import { queryKeys } from '../../api/queryKeys';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { CreateExpenseModal } from '../../components/expenses/CreateExpenseModal';
import { ExpenseDetailModal } from '../../components/expenses/ExpenseDetailModal';
import {
  ExpenseCategory,
  ExpenseStatus,
  ExpenseResponseDto,
} from '../../types/expense.types';
import { PaymentMethod } from '../../types/purchase.types';
import { formatInr, formatBusinessDate } from '../../utils/formatters';
import { triggerPdfDownload, parseBlobError } from '../../utils/pdfDownloader';
import { useToast } from '../../hooks/useToast';

const CATEGORY_FILTER_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'RENT', label: 'Rent' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'SALARY', label: 'Salary & Wages' },
  { value: 'TRANSPORT', label: 'Transport / Freight' },
  { value: 'SHOP_OPERATIONS', label: 'Shop Operations' },
  { value: 'OTHER', label: 'Other Costs' },
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'POSTED', label: 'Posted Vouchers' },
  { value: 'REVERSED', label: 'Reversed Vouchers' },
];

const METHOD_FILTER_OPTIONS = [
  { value: '', label: 'All Payment Modes' },
  { value: 'CASH', label: 'Cash Only' },
  { value: 'ONLINE', label: 'Online / Bank Only' },
];

export const ExpensesListPage: React.FC = () => {
  const { error: toastError } = useToast();

  // Filters state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseResponseDto | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  // Query expenses
  const {
    data: pagedData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.expenses.list({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      category: (category as ExpenseCategory) || undefined,
      status: (status as ExpenseStatus) || undefined,
      paymentMethod: (paymentMethod as PaymentMethod) || undefined,
      search: search || undefined,
      page,
      size: 15,
    }),
    queryFn: ({ signal }) =>
      expenseApi.searchExpenses(
        {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          category: (category as ExpenseCategory) || undefined,
          status: (status as ExpenseStatus) || undefined,
          paymentMethod: (paymentMethod as PaymentMethod) || undefined,
          search: search || undefined,
          page,
          size: 15,
        },
        signal
      ),
  });

  const handleDownloadPdf = async (expense: ExpenseResponseDto) => {
    setDownloadingPdfId(expense.id);
    try {
      const blob = await expenseApi.downloadExpensePdf(expense.id);
      triggerPdfDownload(blob, `${expense.expenseNumber}-voucher.pdf`);
    } catch (err) {
      const msg = await parseBlobError(err);
      toastError(msg);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setCategory('');
    setStatus('');
    setPaymentMethod('');
    setSearch('');
    setPage(0);
  };

  const expenses = pagedData?.data || [];

  // KPI calculations on visible page
  const totalPostedAmount = expenses
    .filter((e) => e.status === 'POSTED')
    .reduce((acc, e) => acc + parseFloat(e.amount || '0'), 0);

  const totalReversedCount = expenses.filter((e) => e.status === 'REVERSED').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational Expenses"
        subtitle="Record shop utilities, rent, wages, and bookkeeping expense reversals with cash/online tender breakdown."
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
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Record Expense
            </Button>
          </div>
        }
      />

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-teal-600">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Page Posted Total
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {formatInr(totalPostedAmount)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">Active operational costs</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-600">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Results
          </span>
          <span className="text-2xl font-bold font-mono text-blue-800 mt-1 block">
            {pagedData?.totalElements ?? 0}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">Matching expense vouchers</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Active Filter Category
          </span>
          <span className="text-lg font-bold text-slate-800 mt-1 block truncate">
            {category || 'All Categories'}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">Filtered category</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Reversed Vouchers
          </span>
          <span className="text-2xl font-bold font-mono text-rose-700 mt-1 block">
            {totalReversedCount}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">On current page</span>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <Input
              type="text"
              placeholder="Search description or bill #..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div>
            <Select
              options={CATEGORY_FILTER_OPTIONS}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(0);
              }}
            />
          </div>

          <div>
            <Select
              options={STATUS_FILTER_OPTIONS}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
            />
          </div>

          <div>
            <Select
              options={METHOD_FILTER_OPTIONS}
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(0);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="w-full text-xs text-slate-600"
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Date boundary sub-row */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-slate-500 font-medium flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Date Range:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(0);
              }}
              className="text-xs border border-slate-300 rounded px-2 py-1"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(0);
              }}
              className="text-xs border border-slate-300 rounded px-2 py-1"
            />
          </div>
        </div>
      </div>

      {/* Main Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton columns={7} rows={6} />
          </div>
        ) : isError ? (
          <div className="p-6">
            <ErrorMessage
              error={error}
              title="Failed to load operational expenses"
              onRetry={() => refetch()}
            />
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Layers className="w-12 h-12 text-slate-300" />}
              title="No operational expenses found"
              description="No expense vouchers match the selected filter criteria."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Record First Expense
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Voucher #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description & Reference</TableHead>
                  <TableHead>Payment Breakdown</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Amount (₹)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((exp, idx) => (
                  <TableRow key={exp.id} className="hover:bg-slate-50/70">
                    <TableCell className="text-slate-400 font-mono text-center">
                      {page * 15 + idx + 1}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-slate-900">
                      {exp.expenseNumber}
                    </TableCell>
                    <TableCell className="text-slate-600 whitespace-nowrap">
                      {formatBusinessDate(exp.expenseDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral" className="text-[10px]">
                        {exp.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="font-medium text-slate-800 truncate" title={exp.description}>
                        {exp.description}
                      </div>
                      {exp.externalReference && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Ref: {exp.externalReference}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {exp.components.map((c, cIdx) => (
                          <Badge
                            key={cIdx}
                            variant={c.method === 'CASH' ? 'neutral' : 'info'}
                            size="sm"
                            className="text-[10px]"
                          >
                            {c.method}: {formatInr(parseFloat(c.amount))}
                            {c.onlineReference ? ` (${c.onlineReference})` : ''}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={exp.status === 'POSTED' ? 'default' : 'danger'}
                        className="text-[10px]"
                      >
                        {exp.status === 'POSTED' ? 'Posted' : 'Reversed'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-900">
                      <span className={exp.status === 'REVERSED' ? 'line-through text-slate-400' : ''}>
                        {formatInr(parseFloat(exp.amount))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedExpense(exp)}
                          className="text-xs px-2 py-1 h-7 text-slate-700 hover:bg-slate-100"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPdf(exp)}
                          isLoading={downloadingPdfId === exp.id}
                          className="text-xs px-2 py-1 h-7 text-teal-700 hover:bg-teal-50"
                          leftIcon={<Download className="w-3.5 h-3.5" />}
                        >
                          PDF
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination footer */}
            {pagedData && pagedData.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100">
                <Pagination
                  currentPage={page}
                  totalPages={pagedData.totalPages}
                  totalElements={pagedData.totalElements}
                  pageSize={15}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Expense Modal */}
      {isCreateModalOpen && (
        <CreateExpenseModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <ExpenseDetailModal
          isOpen={!!selectedExpense}
          onClose={() => setSelectedExpense(null)}
          expense={selectedExpense}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
};

export default ExpensesListPage;
