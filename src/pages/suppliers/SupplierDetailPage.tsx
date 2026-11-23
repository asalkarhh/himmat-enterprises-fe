import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit2,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  Plus,
  CreditCard,
  Layers,
  ArrowDownLeft,
  Download,
  FileText,
  Eye,
} from 'lucide-react';
import { supplierApi } from '../../api/party.api';
import { supplierFinanceApi, purchaseApi } from '../../api/purchase.api';
import { queryKeys } from '../../api/queryKeys';
import { useToast } from '../../hooks/useToast';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Checkbox } from '../../components/ui/Checkbox';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { SupplierPaymentModal } from '../../components/finance/SupplierPaymentModal';
import { SupplierAllocationModal } from '../../components/finance/SupplierAllocationModal';
import { SupplierRefundModal } from '../../components/finance/SupplierRefundModal';
import { SupplierDto, UpdateSupplierRequest } from '../../types/party.types';
import { ApiError } from '../../types/api.types';
import { formatInr, formatBusinessDate } from '../../utils/formatters';

export const SupplierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'ledger' | 'purchases' | 'payments'>('ledger');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toggleStatusTarget, setToggleStatusTarget] = useState<SupplierDto | null>(null);

  // Financial Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  // Ledger Filter State
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');
  const [ledgerPage, setLedgerPage] = useState(0);
  const [isDownloadingLedgerPdf, setIsDownloadingLedgerPdf] = useState(false);

  // Purchases Tab State
  const [purchasesPage, setPurchasesPage] = useState(0);

  // Payments Tab State
  const [paymentsPage, setPaymentsPage] = useState(0);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editAddress1, setEditAddress1] = useState('');
  const [editAddress2, setEditAddress2] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPostalCode, setEditPostalCode] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);

  // Query supplier details
  const {
    data: supplier,
    isLoading: isLoadingSupplier,
    isError: isSupplierError,
    error: supplierError,
    refetch: refetchSupplier,
    isFetching: isFetchingSupplier,
  } = useQuery({
    queryKey: queryKeys.suppliers.detail(id!),
    queryFn: ({ signal }) => supplierApi.getSupplierById(id!, signal),
    enabled: !!id,
  });

  // Query financial account summary
  const {
    data: accountSummary,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: queryKeys.supplierFinance.accountSummary(id!),
    queryFn: ({ signal }) => supplierFinanceApi.getAccountSummary(id!, signal),
    enabled: !!id,
  });

  // Query ledger statement
  const {
    data: ledgerStatement,
    isLoading: isLoadingLedger,
    refetch: refetchLedger,
  } = useQuery({
    queryKey: queryKeys.supplierFinance.ledger(id!, {
      startDate: ledgerStartDate || undefined,
      endDate: ledgerEndDate || undefined,
      page: ledgerPage,
      size: 20,
    }),
    queryFn: ({ signal }) =>
      supplierFinanceApi.getLedgerStatement(
        id!,
        ledgerStartDate || undefined,
        ledgerEndDate || undefined,
        ledgerPage,
        20,
        signal
      ),
    enabled: !!id && activeTab === 'ledger',
  });

  // Query purchases for this supplier
  const {
    data: purchasesData,
    isLoading: isLoadingPurchases,
  } = useQuery({
    queryKey: queryKeys.purchases.list({ supplierId: id!, page: purchasesPage, size: 10 }),
    queryFn: ({ signal }) =>
      purchaseApi.getPurchases({ supplierId: id!, page: purchasesPage, size: 10 }, signal),
    enabled: !!id && activeTab === 'purchases',
  });

  // Query payments for this supplier
  const {
    data: paymentsData,
    isLoading: isLoadingPayments,
  } = useQuery({
    queryKey: queryKeys.supplierFinance.payments(id!, {
      page: paymentsPage,
      size: 10,
    }),
    queryFn: ({ signal }) =>
      supplierFinanceApi.getPayments(id!, undefined, undefined, paymentsPage, 10, signal),
    enabled: !!id && activeTab === 'payments',
  });

  // Edit mutation
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateSupplierRequest) => supplierApi.updateSupplier(id!, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      toastSuccess(`Supplier "${updated.name}" updated successfully`);
      setIsEditModalOpen(false);
    },
    onError: (err: ApiError) => {
      if (err.status === 409) {
        setEditError('Conflict: This record was modified by another user. Please refresh and retry.');
      } else {
        setEditError(err.message || 'Failed to update supplier');
      }
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ expectedVersion, isActive }: { expectedVersion: number; isActive: boolean }) =>
      supplierApi.updateSupplier(id!, { expectedVersion, isActive }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      toastSuccess(`Supplier "${updated.name}" is now ${updated.isActive ? 'active' : 'inactive'}`);
      setToggleStatusTarget(null);
    },
    onError: (err: ApiError) => {
      if (err.status === 409) {
        toastError('Conflict: Record was modified by another user. Please refresh and retry.');
      } else {
        toastError(err.message || 'Failed to update status');
      }
      setToggleStatusTarget(null);
    },
  });

  const handleOpenEdit = () => {
    if (!supplier) return;
    setEditName(supplier.name);
    setEditContactPerson(supplier.contactPerson || '');
    setEditPhone(supplier.phone || '');
    setEditEmail(supplier.email || '');
    setEditGstin(supplier.gstin || '');
    setEditAddress1(supplier.addressLine1 || '');
    setEditAddress2(supplier.addressLine2 || '');
    setEditCity(supplier.city || '');
    setEditState(supplier.state || '');
    setEditPostalCode(supplier.postalCode || '');
    setEditNotes(supplier.notes || '');
    setEditIsActive(supplier.isActive);
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) return;

    if (!editName.trim()) {
      setEditError('Supplier name is required');
      return;
    }
    if (editEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim())) {
      setEditError('Please enter a valid email address');
      return;
    }

    setEditError(null);
    updateMutation.mutate({
      expectedVersion: supplier.version,
      name: editName.trim(),
      contactPerson: editContactPerson.trim() || null,
      phone: editPhone.trim() || null,
      email: editEmail.trim() || null,
      gstin: editGstin.trim() ? editGstin.trim().toUpperCase() : null,
      addressLine1: editAddress1.trim() || null,
      addressLine2: editAddress2.trim() || null,
      city: editCity.trim() || null,
      state: editState.trim() || null,
      postalCode: editPostalCode.trim() || null,
      notes: editNotes.trim() || null,
      isActive: editIsActive,
    });
  };

  const handleDownloadLedgerPdf = async () => {
    if (!supplier) return;
    setIsDownloadingLedgerPdf(true);
    try {
      const blob = await supplierFinanceApi.downloadLedgerPdf(
        supplier.id,
        ledgerStartDate || undefined,
        ledgerEndDate || undefined
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Ledger_${supplier.supplierCode}_${ledgerStartDate || 'start'}_to_${ledgerEndDate || 'current'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toastError('Failed to download supplier ledger statement PDF.');
    } finally {
      setIsDownloadingLedgerPdf(false);
    }
  };

  const handleDownloadPurchasePdf = async (purchaseId: string, poNumber: string) => {
    try {
      const blob = await purchaseApi.downloadPurchasePdf(purchaseId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${poNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toastError('Failed to download purchase PDF.');
    }
  };

  const handleDownloadPaymentPdf = async (paymentId: string, paymentNumber: string) => {
    try {
      const blob = await supplierFinanceApi.downloadPaymentPdf(paymentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${paymentNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toastError('Failed to download payment voucher PDF.');
    }
  };

  if (isLoadingSupplier) {
    return (
      <div className="p-8 space-y-4">
        <TableSkeleton columns={4} rows={4} />
      </div>
    );
  }

  if (isSupplierError || !supplier) {
    return (
      <div className="p-8">
        <ErrorMessage
          error={supplierError}
          title="Supplier not found"
          onRetry={() => navigate('/suppliers')}
        />
      </div>
    );
  }

  const currentBalNum = accountSummary ? parseFloat(accountSummary.currentBalance) : 0;
  const unallocatedCreditNum = accountSummary ? parseFloat(accountSummary.unallocatedCredit) : 0;
  const outstandingPayableNum = accountSummary ? parseFloat(accountSummary.outstandingPayable) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.name}
        subtitle={`Supplier Code: ${supplier.supplierCode}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/suppliers')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              All Suppliers
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchSupplier();
                refetchSummary();
                if (activeTab === 'ledger') refetchLedger();
              }}
              isLoading={isFetchingSupplier}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenEdit}
              leftIcon={<Edit2 className="w-4 h-4" />}
            >
              Edit Details
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/purchases/new?supplierId=${supplier.id}`)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Purchase
            </Button>
          </div>
        }
      />

      {/* Supplier Identity Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Supplier Code</span>
            <span className="font-mono text-sm font-bold text-slate-900 mt-1 block">{supplier.supplierCode}</span>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Account Status</span>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={supplier.isActive ? 'success' : 'neutral'}>
                {supplier.isActive ? 'Active Supplier' : 'Deactivated'}
              </Badge>
              <button
                type="button"
                onClick={() => setToggleStatusTarget(supplier)}
                className="text-xs text-slate-500 hover:text-slate-800 underline ml-1"
              >
                {supplier.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Primary Contact</span>
            <span className="text-sm font-medium text-slate-800 mt-1 block">
              {supplier.contactPerson || <span className="text-slate-400 italic">Not specified</span>}
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">GSTIN</span>
            <span className="text-sm font-mono font-medium text-slate-800 mt-1 block">
              {supplier.gstin || <span className="text-slate-400 italic">Unregistered / NA</span>}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Phone Number
            </span>
            <div className="flex items-center gap-2 text-sm text-slate-800">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{supplier.phone || <span className="text-slate-400 italic">No phone</span>}</span>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Email Address
            </span>
            <div className="flex items-center gap-2 text-sm text-slate-800">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{supplier.email || <span className="text-slate-400 italic">No email</span>}</span>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Warehouse / Office Address
            </span>
            <div className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p>
                {[
                  supplier.addressLine1,
                  supplier.addressLine2,
                  supplier.city,
                  supplier.state,
                  supplier.postalCode,
                ]
                  .filter(Boolean)
                  .join(', ') || <span className="text-slate-400 italic">No address recorded</span>}
              </p>
            </div>
          </div>
        </div>

        {supplier.notes && (
          <div className="pt-4 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Commercial / Dispatch Notes
            </span>
            <p className="text-sm text-slate-600 leading-relaxed">{supplier.notes}</p>
          </div>
        )}
      </div>

      {/* Account Financial Summary & Settlement Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Financial Account Summary</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Current balance, lifetime purchases, payments, returns, and settlement actions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPaymentModalOpen(true)}
              leftIcon={<CreditCard className="w-4 h-4 text-teal-600" />}
            >
              Record Payment
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAllocationModalOpen(true)}
              disabled={unallocatedCreditNum <= 0}
              leftIcon={<Layers className="w-4 h-4 text-indigo-600" />}
              title={unallocatedCreditNum <= 0 ? 'No unallocated credit available' : 'Apply advance credit'}
            >
              Apply Credit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRefundModalOpen(true)}
              disabled={unallocatedCreditNum <= 0}
              leftIcon={<ArrowDownLeft className="w-4 h-4 text-amber-600" />}
              title={unallocatedCreditNum <= 0 ? 'No unallocated credit available' : 'Record cash/bank refund'}
            >
              Record Refund
            </Button>
          </div>
        </div>

        {isLoadingSummary ? (
          <div className="py-6 text-center text-sm text-slate-500">Loading financial summary...</div>
        ) : accountSummary ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Primary Net Balance Card */}
            <div
              className={`p-4 rounded-xl border col-span-2 sm:col-span-1 ${
                currentBalNum > 0
                  ? 'bg-rose-50/50 border-rose-200 text-rose-900'
                  : currentBalNum < 0
                  ? 'bg-teal-50/50 border-teal-200 text-teal-900'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wider block opacity-75">
                Current Net Balance
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono">
                  {formatInr(Math.abs(currentBalNum))}
                </span>
              </div>
              <span className="text-xs font-medium block mt-1">
                {currentBalNum > 0 ? (
                  <span className="text-rose-700 font-semibold">Shop Owes Supplier</span>
                ) : currentBalNum < 0 ? (
                  <span className="text-teal-700 font-semibold">Supplier Holds Advance</span>
                ) : (
                  <span className="text-slate-600">Settled (₹0.00)</span>
                )}
              </span>
            </div>

            {/* Total Inward Purchases */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Purchases
              </span>
              <span className="text-lg font-bold font-mono text-slate-900 mt-1 block">
                {formatInr(parseFloat(accountSummary.totalPurchases))}
              </span>
              <span className="text-[11px] text-slate-400 block mt-1">Gross inward orders</span>
            </div>

            {/* Total Paid */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Payments
              </span>
              <span className="text-lg font-bold font-mono text-teal-700 mt-1 block">
                {formatInr(parseFloat(accountSummary.totalPaid))}
              </span>
              <span className="text-[11px] text-slate-400 block mt-1">Cash & online disbursements</span>
            </div>

            {/* Total Returns */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Purchase Returns
              </span>
              <span className="text-lg font-bold font-mono text-amber-700 mt-1 block">
                {formatInr(parseFloat(accountSummary.totalReturned))}
              </span>
              <span className="text-[11px] text-slate-400 block mt-1">Stock returned (debit notes)</span>
            </div>

            {/* Unallocated Credit */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Unallocated Credit
              </span>
              <span className="text-lg font-bold font-mono text-indigo-700 mt-1 block">
                {formatInr(unallocatedCreditNum)}
              </span>
              <span className="text-[11px] text-slate-400 block mt-1">Available for allocation</span>
            </div>

            {/* Outstanding Payables */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Outstanding Bills
              </span>
              <span className="text-lg font-bold font-mono text-rose-700 mt-1 block">
                {formatInr(outstandingPayableNum)}
              </span>
              <span className="text-[11px] text-slate-400 block mt-1">Unpaid purchase balance</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Tabs: Ledger Statement | Inward Purchases | Payment Vouchers */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 flex items-center gap-6">
          <button
            type="button"
            className={`py-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'ledger'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab('ledger')}
          >
            Ledger Statement
          </button>
          <button
            type="button"
            className={`py-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'purchases'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab('purchases')}
          >
            Inward Purchases
          </button>
          <button
            type="button"
            className={`py-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'payments'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab('payments')}
          >
            Payment Vouchers
          </button>
        </div>

        {/* Tab 1: Ledger Statement */}
        {activeTab === 'ledger' && (
          <div className="p-6 space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Date Range:</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={ledgerStartDate}
                    onChange={(e) => {
                      setLedgerStartDate(e.target.value);
                      setLedgerPage(0);
                    }}
                    className="text-xs py-1"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <Input
                    type="date"
                    value={ledgerEndDate}
                    onChange={(e) => {
                      setLedgerEndDate(e.target.value);
                      setLedgerPage(0);
                    }}
                    className="text-xs py-1"
                  />
                </div>
                {(ledgerStartDate || ledgerEndDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLedgerStartDate('');
                      setLedgerEndDate('');
                      setLedgerPage(0);
                    }}
                    className="text-xs text-slate-600"
                  >
                    Clear Filter
                  </Button>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadLedgerPdf}
                isLoading={isDownloadingLedgerPdf}
                leftIcon={<Download className="w-4 h-4 text-teal-600" />}
              >
                Download Statement (PDF)
              </Button>
            </div>

            {/* Statement Balances Header */}
            {ledgerStatement && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50/70 border border-slate-200 rounded-lg text-xs">
                <div>
                  <span className="text-slate-500 block uppercase font-medium">Opening Balance:</span>
                  <span className="text-sm font-bold font-mono text-slate-900 mt-0.5 block">
                    {formatInr(Math.abs(parseFloat(ledgerStatement.openingBalance)))}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      {parseFloat(ledgerStatement.openingBalance) > 0
                        ? '(Payable)'
                        : parseFloat(ledgerStatement.openingBalance) < 0
                        ? '(Advance)'
                        : '(Settled)'}
                    </span>
                  </span>
                </div>
                <div className="sm:text-right">
                  <span className="text-slate-500 block uppercase font-medium">Closing Balance:</span>
                  <span className="text-sm font-bold font-mono text-slate-900 mt-0.5 block">
                    {formatInr(Math.abs(parseFloat(ledgerStatement.closingBalance)))}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      {parseFloat(ledgerStatement.closingBalance) > 0
                        ? '(Payable)'
                        : parseFloat(ledgerStatement.closingBalance) < 0
                        ? '(Advance)'
                        : '(Settled)'}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Entries Table */}
            {isLoadingLedger ? (
              <TableSkeleton columns={6} rows={5} />
            ) : !ledgerStatement || !ledgerStatement.entries || ledgerStatement.entries.data.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-8 h-8 text-slate-300" />}
                title="No Ledger Entries"
                description="No transaction entries recorded for the selected period."
              />
            ) : (
              <>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-3.5 py-2.5">Date</th>
                        <th className="px-3.5 py-2.5">Transaction Type</th>
                        <th className="px-3.5 py-2.5">Description / Notes</th>
                        <th className="px-3.5 py-2.5 text-right">Debit (₹)</th>
                        <th className="px-3.5 py-2.5 text-right">Credit (₹)</th>
                        <th className="px-3.5 py-2.5 text-right">Running Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledgerStatement.entries.data.map((entry) => {
                        const amt = parseFloat(entry.amount);
                        const isIncreaseInPayable = amt > 0;
                        const runningBal = parseFloat(entry.runningBalance);

                        return (
                          <tr key={entry.id} className="hover:bg-slate-50/70">
                            <td className="px-3.5 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                              {formatBusinessDate(entry.effectiveDate)}
                            </td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                              <Badge
                                variant={
                                  entry.sourceType === 'PURCHASE'
                                    ? 'neutral'
                                    : entry.sourceType === 'PAYMENT'
                                    ? 'success'
                                    : entry.sourceType === 'PURCHASE_RETURN'
                                    ? 'warning'
                                    : 'info'
                                }
                              >
                                {entry.sourceType}
                              </Badge>
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-600 max-w-xs truncate" title={entry.notes || ''}>
                              {entry.notes || <span className="text-slate-400 italic">—</span>}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono font-medium text-slate-800">
                              {isIncreaseInPayable ? formatInr(amt) : '—'}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono font-medium text-slate-800">
                              {!isIncreaseInPayable ? formatInr(Math.abs(amt)) : '—'}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono font-bold whitespace-nowrap">
                              <span
                                className={
                                  runningBal > 0
                                    ? 'text-rose-700'
                                    : runningBal < 0
                                    ? 'text-teal-700'
                                    : 'text-slate-600'
                                }
                              >
                                {formatInr(Math.abs(runningBal))}{' '}
                                <span className="text-[10px] font-normal">
                                  {runningBal > 0 ? 'Dr' : runningBal < 0 ? 'Cr' : ''}
                                </span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {ledgerStatement.entries.totalPages > 1 && (
                  <div className="pt-2">
                    <Pagination
                      currentPage={ledgerPage}
                      totalPages={ledgerStatement.entries.totalPages}
                      onPageChange={setLedgerPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab 2: Inward Purchases */}
        {activeTab === 'purchases' && (
          <div className="p-6 space-y-4">
            {isLoadingPurchases ? (
              <TableSkeleton columns={7} rows={4} />
            ) : !purchasesData || purchasesData.data.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-8 h-8 text-slate-300" />}
                title="No Purchases Recorded"
                description={`No purchase orders or inward goods recorded for ${supplier.name}.`}
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/purchases/new?supplierId=${supplier.id}`)}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Create First Purchase
                  </Button>
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-3.5 py-2.5">PO #</th>
                        <th className="px-3.5 py-2.5">Date</th>
                        <th className="px-3.5 py-2.5">Vendor Bill #</th>
                        <th className="px-3.5 py-2.5 text-right">Total (₹)</th>
                        <th className="px-3.5 py-2.5 text-right">Allocated (₹)</th>
                        <th className="px-3.5 py-2.5 text-right">Balance (₹)</th>
                        <th className="px-3.5 py-2.5 text-center">Status</th>
                        <th className="px-3.5 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchasesData.data.map((p) => {
                        const bal = parseFloat(p.outstandingBalance);
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/70">
                            <td className="px-3.5 py-2.5 font-medium text-slate-900">{p.purchaseNumber}</td>
                            <td className="px-3.5 py-2.5 text-slate-600">{formatBusinessDate(p.purchaseDate)}</td>
                            <td className="px-3.5 py-2.5 font-mono text-slate-700">{p.supplierInvoiceNumber || '—'}</td>
                            <td className="px-3.5 py-2.5 text-right font-mono text-slate-800">
                              {formatInr(parseFloat(p.totalPayableAmount))}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono text-teal-700">
                              {formatInr(parseFloat(p.totalAllocatedAmount))}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono font-bold">
                              <span className={bal > 0 ? 'text-rose-700' : 'text-slate-600'}>
                                {formatInr(bal)}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              <Badge
                                variant={
                                  p.status === 'POSTED'
                                    ? bal === 0
                                      ? 'success'
                                      : 'warning'
                                    : 'neutral'
                                }
                              >
                                {p.status}
                              </Badge>
                            </td>
                            <td className="px-3.5 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/purchases/${p.id}`)}
                                  className="text-xs px-2 py-1 h-7"
                                  leftIcon={<Eye className="w-3.5 h-3.5 text-slate-500" />}
                                >
                                  View
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadPurchasePdf(p.id, p.purchaseNumber)}
                                  className="text-xs px-2 py-1 h-7 text-teal-700 hover:bg-teal-50"
                                  leftIcon={<Download className="w-3.5 h-3.5" />}
                                >
                                  PDF
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {purchasesData.totalPages > 1 && (
                  <div className="pt-2">
                    <Pagination
                      currentPage={purchasesPage}
                      totalPages={purchasesData.totalPages}
                      onPageChange={setPurchasesPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab 3: Payment Vouchers */}
        {activeTab === 'payments' && (
          <div className="p-6 space-y-4">
            {isLoadingPayments ? (
              <TableSkeleton columns={6} rows={4} />
            ) : !paymentsData || paymentsData.data.length === 0 ? (
              <EmptyState
                icon={<CreditCard className="w-8 h-8 text-slate-300" />}
                title="No Payments Recorded"
                description={`No payment vouchers recorded for ${supplier.name}.`}
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsPaymentModalOpen(true)}
                    leftIcon={<CreditCard className="w-4 h-4" />}
                  >
                    Record Payment
                  </Button>
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-3.5 py-2.5">Voucher #</th>
                        <th className="px-3.5 py-2.5">Date</th>
                        <th className="px-3.5 py-2.5">Method Breakdown</th>
                        <th className="px-3.5 py-2.5 text-right">Total Paid (₹)</th>
                        <th className="px-3.5 py-2.5 text-right">Unallocated Credit (₹)</th>
                        <th className="px-3.5 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paymentsData.data.map((pmt) => {
                        const unalloc = parseFloat(pmt.unallocatedAmount);
                        return (
                          <tr key={pmt.id} className="hover:bg-slate-50/70">
                            <td className="px-3.5 py-2.5 font-medium text-slate-900">{pmt.paymentNumber}</td>
                            <td className="px-3.5 py-2.5 text-slate-600">{formatBusinessDate(pmt.paymentDate)}</td>
                            <td className="px-3.5 py-2.5 text-slate-700">
                              <div className="flex flex-wrap gap-1">
                                {pmt.components.map((c, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]"
                                  >
                                    <strong className="font-semibold">{c.method}:</strong>
                                    {formatInr(parseFloat(c.amount))}
                                    {c.onlineReference && ` (${c.onlineReference})`}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono font-medium text-slate-900">
                              {formatInr(parseFloat(pmt.totalAmount))}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono font-semibold">
                              <span className={unalloc > 0 ? 'text-teal-700' : 'text-slate-500'}>
                                {formatInr(unalloc)}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadPaymentPdf(pmt.id, pmt.paymentNumber)}
                                className="text-xs px-2 py-1 h-7 text-teal-700 hover:bg-teal-50"
                                leftIcon={<Download className="w-3.5 h-3.5" />}
                              >
                                PDF
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {paymentsData.totalPages > 1 && (
                  <div className="pt-2">
                    <Pagination
                      currentPage={paymentsPage}
                      totalPages={paymentsData.totalPages}
                      onPageChange={setPaymentsPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Edit Supplier Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          if (!updateMutation.isPending) {
            setIsEditModalOpen(false);
          }
        }}
        title={`Edit Supplier: ${supplier.name}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && <ErrorMessage error={editError} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Contact Person
              </label>
              <Input
                value={editContactPerson}
                onChange={(e) => setEditContactPerson(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                GSTIN
              </label>
              <Input
                value={editGstin}
                onChange={(e) => setEditGstin(e.target.value.toUpperCase())}
                maxLength={20}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Address Line 1
              </label>
              <Input
                value={editAddress1}
                onChange={(e) => setEditAddress1(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Address Line 2
              </label>
              <Input
                value={editAddress2}
                onChange={(e) => setEditAddress2(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                City
              </label>
              <Input
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                State
              </label>
              <Input
                value={editState}
                onChange={(e) => setEditState(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Postal Code
              </label>
              <Input
                value={editPostalCode}
                onChange={(e) => setEditPostalCode(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Internal Notes
            </label>
            <Textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="pt-1">
            <Checkbox
              id="edit-supplier-active-detail"
              label="Active supplier (available for purchase orders)"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={updateMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Status Toggle */}
      <ConfirmationDialog
        isOpen={!!toggleStatusTarget}
        title={toggleStatusTarget?.isActive ? 'Deactivate Supplier' : 'Activate Supplier'}
        message={
          toggleStatusTarget?.isActive
            ? `Are you sure you want to deactivate "${toggleStatusTarget?.name}"?`
            : `Are you sure you want to activate "${toggleStatusTarget?.name}"?`
        }
        confirmLabel={toggleStatusTarget?.isActive ? 'Deactivate' : 'Activate'}
        isDestructive={toggleStatusTarget?.isActive}
        isLoading={toggleStatusMutation.isPending}
        onConfirm={() => {
          if (toggleStatusTarget) {
            toggleStatusMutation.mutate({
              expectedVersion: toggleStatusTarget.version,
              isActive: !toggleStatusTarget.isActive,
            });
          }
        }}
        onClose={() => setToggleStatusTarget(null)}
      />

      {/* Supplier Payment Modal */}
      {isPaymentModalOpen && (
        <SupplierPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          supplier={supplier}
          onSuccess={() => {
            refetchSummary();
            refetchLedger();
          }}
        />
      )}

      {/* Supplier Allocation Modal */}
      {isAllocationModalOpen && (
        <SupplierAllocationModal
          isOpen={isAllocationModalOpen}
          onClose={() => setIsAllocationModalOpen(false)}
          supplier={supplier}
          onSuccess={() => {
            refetchSummary();
            refetchLedger();
          }}
        />
      )}

      {/* Supplier Refund Modal */}
      {isRefundModalOpen && (
        <SupplierRefundModal
          isOpen={isRefundModalOpen}
          onClose={() => setIsRefundModalOpen(false)}
          supplier={supplier}
          unallocatedCredit={accountSummary?.unallocatedCredit || 0}
          onSuccess={() => {
            refetchSummary();
            refetchLedger();
          }}
        />
      )}
    </div>
  );
};

export default SupplierDetailPage;
