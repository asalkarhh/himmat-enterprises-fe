import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Edit2,
  RefreshCw,
  Power,
  MapPin,
  CreditCard,
  Layers,
  Download,
  FileText,
  Eye,
  Building2,
  Receipt,
  AlertTriangle,
} from 'lucide-react';
import { customerApi, customerSiteApi } from '../../api/party.api';
import { customerFinanceApi, invoiceApi } from '../../api/billing.api';
import { queryKeys } from '../../api/queryKeys';
import { useToast } from '../../hooks/useToast';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Checkbox } from '../../components/ui/Checkbox';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { DateDisplay } from '../../components/ui/DateDisplay';
import { Pagination } from '../../components/ui/Pagination';
import { CustomerReceiptModal } from '../../components/billing/CustomerReceiptModal';
import { CustomerAllocationModal } from '../../components/billing/CustomerAllocationModal';
import {
  CustomerDto,
  CustomerSiteDto,
  CustomerType,
  UpdateCustomerRequest,
  CreateCustomerSiteRequest,
  UpdateCustomerSiteRequest,
} from '../../types/party.types';
import { ApiError } from '../../types/api.types';
import { formatInr, formatBusinessDate } from '../../utils/formatters';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  // Tab navigation: 'sites' | 'ledger' | 'invoices' | 'receipts'
  const [activeTab, setActiveTab] = useState<'sites' | 'ledger' | 'invoices' | 'receipts'>('sites');

  // Master Modals
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [isCreateSiteOpen, setIsCreateSiteOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<CustomerSiteDto | null>(null);
  const [toggleCustomerStatusTarget, setToggleCustomerStatusTarget] = useState<CustomerDto | null>(null);
  const [toggleSiteStatusTarget, setToggleSiteStatusTarget] = useState<CustomerSiteDto | null>(null);

  // Financial Modals
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);

  // Ledger Filter State
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');
  const [ledgerPage, setLedgerPage] = useState(0);
  const [isDownloadingLedgerPdf, setIsDownloadingLedgerPdf] = useState(false);

  // Invoices Tab State
  const [invoicesPage, setInvoicesPage] = useState(0);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);

  // Receipts Tab State
  const [receiptsPage, setReceiptsPage] = useState(0);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);

  // Edit customer form state
  const [editCustType, setEditCustType] = useState<CustomerType>('RETAIL');
  const [editCustName, setEditCustName] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustEmail, setEditCustEmail] = useState('');
  const [editCustGstin, setEditCustGstin] = useState('');
  const [editCustAddress1, setEditCustAddress1] = useState('');
  const [editCustAddress2, setEditCustAddress2] = useState('');
  const [editCustCity, setEditCustCity] = useState('');
  const [editCustState, setEditCustState] = useState('');
  const [editCustPostalCode, setEditCustPostalCode] = useState('');
  const [editCustNotes, setEditCustNotes] = useState('');
  const [editCustIsActive, setEditCustIsActive] = useState(true);
  const [editCustError, setEditCustError] = useState<string | null>(null);

  // Create site form state
  const [createSiteName, setCreateSiteName] = useState('');
  const [createSiteAddress1, setCreateSiteAddress1] = useState('');
  const [createSiteAddress2, setCreateSiteAddress2] = useState('');
  const [createSiteCity, setCreateSiteCity] = useState('');
  const [createSiteState, setCreateSiteState] = useState('');
  const [createSitePostalCode, setCreateSitePostalCode] = useState('');
  const [createSiteContactPerson, setCreateSiteContactPerson] = useState('');
  const [createSiteContactPhone, setCreateSiteContactPhone] = useState('');
  const [createSiteNotes, setCreateSiteNotes] = useState('');
  const [createSiteError, setCreateSiteError] = useState<string | null>(null);

  // Edit site form state
  const [editSiteName, setEditSiteName] = useState('');
  const [editSiteAddress1, setEditSiteAddress1] = useState('');
  const [editSiteAddress2, setEditSiteAddress2] = useState('');
  const [editSiteCity, setEditSiteCity] = useState('');
  const [editSiteState, setEditSiteState] = useState('');
  const [editSitePostalCode, setEditSitePostalCode] = useState('');
  const [editSiteContactPerson, setEditSiteContactPerson] = useState('');
  const [editSiteContactPhone, setEditSiteContactPhone] = useState('');
  const [editSiteNotes, setEditSiteNotes] = useState('');
  const [editSiteIsActive, setEditSiteIsActive] = useState(true);
  const [editSiteError, setEditSiteError] = useState<string | null>(null);

  // Fetch customer details
  const {
    data: customer,
    isLoading: isCustomerLoading,
    isError: isCustomerError,
    error: customerError,
    refetch: refetchCustomer,
  } = useQuery({
    queryKey: queryKeys.customers.detail(id!),
    queryFn: ({ signal }) => customerApi.getCustomerById(id!, signal),
    enabled: !!id,
  });

  // Fetch customer financial account summary
  const {
    data: accountSummary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: queryKeys.customerFinance.accountSummary(id!),
    queryFn: ({ signal }) => customerFinanceApi.getAccountSummary(id!, signal),
    enabled: !!id,
  });

  // Fetch customer ledger statement
  const {
    data: ledgerStatement,
    isLoading: isLedgerLoading,
    refetch: refetchLedger,
  } = useQuery({
    queryKey: queryKeys.customerFinance.ledger(id!, {
      startDate: ledgerStartDate || undefined,
      endDate: ledgerEndDate || undefined,
      page: ledgerPage,
      size: 20,
    }),
    queryFn: ({ signal }) =>
      customerFinanceApi.getLedgerStatement(
        id!,
        ledgerStartDate || undefined,
        ledgerEndDate || undefined,
        ledgerPage,
        20,
        signal
      ),
    enabled: !!id && activeTab === 'ledger',
  });

  // Fetch customer invoices
  const {
    data: invoicesData,
    isLoading: isInvoicesLoading,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: queryKeys.invoices.list({ customerId: id!, page: invoicesPage, size: 10 }),
    queryFn: ({ signal }) =>
      invoiceApi.searchInvoices({ customerId: id!, page: invoicesPage, size: 10 }, signal),
    enabled: !!id && activeTab === 'invoices',
  });

  // Fetch customer receipts
  const {
    data: receiptsData,
    isLoading: isReceiptsLoading,
    refetch: refetchReceipts,
  } = useQuery({
    queryKey: queryKeys.customerFinance.receipts(id!, { page: receiptsPage, size: 10 }),
    queryFn: ({ signal }) =>
      customerFinanceApi.searchReceipts(id!, { page: receiptsPage, size: 10 }, signal),
    enabled: !!id && activeTab === 'receipts',
  });

  // Fetch sites for this customer
  const {
    data: sitesData,
    isLoading: isSitesLoading,
    isError: isSitesError,
    error: sitesError,
    refetch: refetchSites,
    isFetching: isSitesFetching,
  } = useQuery({
    queryKey: queryKeys.customerSites.list(id!, { size: 100 }),
    queryFn: ({ signal }) => customerSiteApi.getSites(id!, { size: 100 }, signal),
    enabled: !!id,
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: (payload: UpdateCustomerRequest) => customerApi.updateCustomer(id!, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toastSuccess(`Customer "${updated.name}" updated successfully`);
      setIsEditCustomerOpen(false);
    },
    onError: (err: ApiError) => {
      if (err.status === 409) {
        setEditCustError('Conflict: This record was modified by another user. Please refresh and retry.');
      } else {
        setEditCustError(err.message || 'Failed to update customer');
      }
    },
  });

  // Toggle customer status mutation
  const toggleCustomerStatusMutation = useMutation({
    mutationFn: ({ expectedVersion, isActive }: { expectedVersion: number; isActive: boolean }) =>
      customerApi.updateCustomer(id!, { expectedVersion, isActive }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toastSuccess(`Customer "${updated.name}" is now ${updated.isActive ? 'active' : 'inactive'}`);
      setToggleCustomerStatusTarget(null);
    },
    onError: (err: ApiError) => {
      if (err.status === 409) {
        toastError('Conflict: Record was modified by another user. Please refresh and retry.');
      } else {
        toastError(err.message || 'Failed to update status');
      }
      setToggleCustomerStatusTarget(null);
    },
  });

  // Create site mutation
  const createSiteMutation = useMutation({
    mutationFn: (payload: CreateCustomerSiteRequest) => customerSiteApi.createSite(id!, payload),
    onSuccess: (newSite) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customerSites.all });
      toastSuccess(`Site "${newSite.siteName}" added successfully`);
      setIsCreateSiteOpen(false);
      resetCreateSiteForm();
    },
    onError: (err: ApiError) => {
      if (err.status === 409) {
        setCreateSiteError('A delivery site with this name already exists for this customer.');
      } else {
        setCreateSiteError(err.message || 'Failed to create site. Check fields.');
      }
    },
  });

  // Edit site mutation
  const updateSiteMutation = useMutation({
    mutationFn: ({ siteId, payload }: { siteId: string; payload: UpdateCustomerSiteRequest }) =>
      customerSiteApi.updateSite(id!, siteId, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customerSites.all });
      toastSuccess(`Site "${updated.siteName}" updated successfully`);
      setEditingSite(null);
      resetEditSiteForm();
    },
    onError: (err: ApiError) => {
      if (err.status === 409) {
        setEditSiteError('Conflict or duplicate: The site name already exists or was modified by another user.');
      } else {
        setEditSiteError(err.message || 'Failed to update site');
      }
    },
  });

  // Toggle site status mutation
  const toggleSiteStatusMutation = useMutation({
    mutationFn: ({ siteId, expectedVersion, isActive }: { siteId: string; expectedVersion: number; isActive: boolean }) =>
      customerSiteApi.updateSite(id!, siteId, { expectedVersion, isActive }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customerSites.all });
      toastSuccess(`Site "${updated.siteName}" is now ${updated.isActive ? 'active' : 'inactive'}`);
      setToggleSiteStatusTarget(null);
    },
    onError: (err: ApiError) => {
      if (err.status === 409) {
        toastError('Conflict: Site was modified by another user. Please refresh and retry.');
      } else {
        toastError(err.message || 'Failed to update site status');
      }
      setToggleSiteStatusTarget(null);
    },
  });

  const handleOpenEditCustomer = () => {
    if (!customer) return;
    setEditCustType(customer.customerType);
    setEditCustName(customer.name);
    setEditCustPhone(customer.phone || '');
    setEditCustEmail(customer.email || '');
    setEditCustGstin(customer.gstin || '');
    setEditCustAddress1(customer.addressLine1 || '');
    setEditCustAddress2(customer.addressLine2 || '');
    setEditCustCity(customer.city || '');
    setEditCustState(customer.state || '');
    setEditCustPostalCode(customer.postalCode || '');
    setEditCustNotes(customer.notes || '');
    setEditCustIsActive(customer.isActive);
    setEditCustError(null);
    setIsEditCustomerOpen(true);
  };

  const handleEditCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    if (!editCustName.trim()) {
      setEditCustError('Customer name is required');
      return;
    }
    if (editCustEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editCustEmail.trim())) {
      setEditCustError('Please enter a valid email address');
      return;
    }

    setEditCustError(null);
    updateCustomerMutation.mutate({
      expectedVersion: customer.version,
      customerType: editCustType,
      name: editCustName.trim(),
      phone: editCustPhone.trim() || null,
      email: editCustEmail.trim() || null,
      gstin: editCustGstin.trim() ? editCustGstin.trim().toUpperCase() : null,
      addressLine1: editCustAddress1.trim() || null,
      addressLine2: editCustAddress2.trim() || null,
      city: editCustCity.trim() || null,
      state: editCustState.trim() || null,
      postalCode: editCustPostalCode.trim() || null,
      notes: editCustNotes.trim() || null,
      isActive: editCustIsActive,
    });
  };

  const resetCreateSiteForm = () => {
    setCreateSiteName('');
    setCreateSiteAddress1('');
    setCreateSiteAddress2('');
    setCreateSiteCity('');
    setCreateSiteState('');
    setCreateSitePostalCode('');
    setCreateSiteContactPerson('');
    setCreateSiteContactPhone('');
    setCreateSiteNotes('');
    setCreateSiteError(null);
  };

  const resetEditSiteForm = () => {
    setEditSiteName('');
    setEditSiteAddress1('');
    setEditSiteAddress2('');
    setEditSiteCity('');
    setEditSiteState('');
    setEditSitePostalCode('');
    setEditSiteContactPerson('');
    setEditSiteContactPhone('');
    setEditSiteNotes('');
    setEditSiteIsActive(true);
    setEditSiteError(null);
  };

  const handleOpenEditSite = (site: CustomerSiteDto) => {
    setEditingSite(site);
    setEditSiteName(site.siteName);
    setEditSiteAddress1(site.addressLine1 || '');
    setEditSiteAddress2(site.addressLine2 || '');
    setEditSiteCity(site.city || '');
    setEditSiteState(site.state || '');
    setEditSitePostalCode(site.postalCode || '');
    setEditSiteContactPerson(site.contactPerson || '');
    setEditSiteContactPhone(site.contactPhone || '');
    setEditSiteNotes(site.notes || '');
    setEditSiteIsActive(site.isActive);
    setEditSiteError(null);
  };

  const handleCreateSiteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createSiteName.trim()) {
      setCreateSiteError('Site name is required');
      return;
    }

    setCreateSiteError(null);
    createSiteMutation.mutate({
      siteName: createSiteName.trim(),
      addressLine1: createSiteAddress1.trim() || undefined,
      addressLine2: createSiteAddress2.trim() || undefined,
      city: createSiteCity.trim() || undefined,
      state: createSiteState.trim() || undefined,
      postalCode: createSitePostalCode.trim() || undefined,
      contactPerson: createSiteContactPerson.trim() || undefined,
      contactPhone: createSiteContactPhone.trim() || undefined,
      notes: createSiteNotes.trim() || undefined,
    });
  };

  const handleEditSiteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite) return;
    if (!editSiteName.trim()) {
      setEditSiteError('Site name is required');
      return;
    }

    setEditSiteError(null);
    updateSiteMutation.mutate({
      siteId: editingSite.id,
      payload: {
        expectedVersion: editingSite.version,
        siteName: editSiteName.trim(),
        addressLine1: editSiteAddress1.trim() || null,
        addressLine2: editSiteAddress2.trim() || null,
        city: editSiteCity.trim() || null,
        state: editSiteState.trim() || null,
        postalCode: editSitePostalCode.trim() || null,
        contactPerson: editSiteContactPerson.trim() || null,
        contactPhone: editSiteContactPhone.trim() || null,
        notes: editSiteNotes.trim() || null,
        isActive: editSiteIsActive,
      },
    });
  };

  const handleDownloadLedgerPdf = async () => {
    if (!customer) return;
    setIsDownloadingLedgerPdf(true);
    try {
      const blob = await customerFinanceApi.downloadLedgerPdf(
        customer.id,
        ledgerStartDate || undefined,
        ledgerEndDate || undefined
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Customer_Ledger_${customer.customerCode}_${ledgerStartDate || 'all'}_to_${ledgerEndDate || 'current'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toastError('Failed to download customer ledger statement PDF.');
    } finally {
      setIsDownloadingLedgerPdf(false);
    }
  };

  const handleDownloadInvoicePdf = async (invoiceId: string, invoiceNumber: string) => {
    setDownloadingInvoiceId(invoiceId);
    try {
      const blob = await invoiceApi.downloadInvoicePdf(invoiceId);
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
      setDownloadingInvoiceId(null);
    }
  };

  const handleDownloadReceiptPdf = async (receiptId: string, receiptNumber: string) => {
    setDownloadingReceiptId(receiptId);
    try {
      const blob = await customerFinanceApi.downloadReceiptPdf(receiptId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${receiptNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toastError('Failed to download receipt voucher PDF.');
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  const renderTypeBadge = (type: CustomerType) => {
    switch (type) {
      case 'CONTRACTOR':
        return <Badge variant="info">Contractor</Badge>;
      case 'BUILDER':
        return <Badge variant="default">Builder</Badge>;
      case 'RETAIL':
      default:
        return <Badge variant="neutral">Retail</Badge>;
    }
  };

  if (isCustomerLoading) {
    return (
      <div className="p-8 space-y-4">
        <TableSkeleton columns={4} rows={4} />
      </div>
    );
  }

  if (isCustomerError || !customer) {
    return (
      <div className="p-8">
        <ErrorMessage
          error={customerError}
          title="Customer not found"
          onRetry={() => navigate('/customers')}
        />
      </div>
    );
  }

  const currentBalNum = accountSummary ? parseFloat(accountSummary.currentBalance) : 0;
  const unallocatedCreditNum = accountSummary ? parseFloat(accountSummary.unallocatedCredit) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        subtitle={`Customer Code: ${customer.customerCode}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/customers')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              All Customers
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchCustomer();
                refetchSummary();
                refetchSites();
                if (activeTab === 'ledger') refetchLedger();
                if (activeTab === 'invoices') refetchInvoices();
                if (activeTab === 'receipts') refetchReceipts();
              }}
              isLoading={isSitesFetching}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenEditCustomer}
              leftIcon={<Edit2 className="w-4 h-4" />}
            >
              Edit Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetCreateSiteForm();
                setIsCreateSiteOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Site
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/billing/new?customerId=${customer.id}`)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Bill
            </Button>
          </div>
        }
      />

      {/* Customer Master Information Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Code & Type</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-sm font-bold text-slate-900">{customer.customerCode}</span>
              {renderTypeBadge(customer.customerType)}
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Status</span>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={customer.isActive ? 'success' : 'neutral'}>
                {customer.isActive ? 'Active Account' : 'Deactivated'}
              </Badge>
              <button
                type="button"
                onClick={() => setToggleCustomerStatusTarget(customer)}
                className="text-xs text-slate-500 hover:text-slate-800 underline ml-1"
              >
                {customer.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Contact Phone</span>
            <span className="text-sm font-medium text-slate-800 mt-1 block">
              {customer.phone || <span className="text-slate-400 italic">Not specified</span>}
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">GSTIN</span>
            <span className="text-sm font-mono font-medium text-slate-800 mt-1 block">
              {customer.gstin || <span className="text-slate-400 italic">Unregistered / NA</span>}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Primary Address
            </span>
            <p className="text-sm text-slate-700 leading-relaxed">
              {[
                customer.addressLine1,
                customer.addressLine2,
                customer.city,
                customer.state,
                customer.postalCode,
              ]
                .filter(Boolean)
                .join(', ') || <span className="text-slate-400 italic">No address recorded</span>}
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Email Address
            </span>
            <p className="text-sm text-slate-700">
              {customer.email || <span className="text-slate-400 italic">No email recorded</span>}
            </p>
          </div>
        </div>

        {customer.notes && (
          <div className="pt-4 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Remarks / Notes
            </span>
            <p className="text-sm text-slate-600 leading-relaxed">{customer.notes}</p>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-400">
          <span>Record version: v{customer.version}</span>
          <span>
            Created: <DateDisplay date={customer.createdAt} /> &bull; Updated:{' '}
            <DateDisplay date={customer.updatedAt} />
          </span>
        </div>
      </div>

      {/* Customer Financial Account Summary */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Financial Account Summary</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live account balance, lifetime billings, customer receipts, and unallocated advance credit.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReceiptModalOpen(true)}
              leftIcon={<CreditCard className="w-4 h-4 text-teal-600" />}
            >
              Record Receipt
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
          </div>
        </div>

        {isSummaryLoading ? (
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
                  <span className="text-rose-700 font-semibold">Customer Owes Shop</span>
                ) : currentBalNum < 0 ? (
                  <span className="text-teal-700 font-semibold">Customer Advance Credit</span>
                ) : (
                  <span className="text-slate-600">Settled (₹0.00)</span>
                )}
              </span>
            </div>

            {/* Total Invoiced */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Invoiced
              </span>
              <div className="mt-1 text-xl font-bold font-mono text-slate-900">
                {formatInr(accountSummary.totalInvoiced)}
              </div>
              <span className="text-xs text-slate-500 block mt-1">Gross sales billed</span>
            </div>

            {/* Total Receipts */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Receipts
              </span>
              <div className="mt-1 text-xl font-bold font-mono text-teal-700">
                {formatInr(accountSummary.totalReceipts)}
              </div>
              <span className="text-xs text-slate-500 block mt-1">Payments collected</span>
            </div>

            {/* Unallocated Advance Credit */}
            <div
              className={`p-4 rounded-xl border ${
                unallocatedCreditNum > 0
                  ? 'bg-teal-50/30 border-teal-200 text-teal-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wider block">
                Advance Credit
              </span>
              <div className="mt-1 text-xl font-bold font-mono text-teal-800">
                {formatInr(accountSummary.unallocatedCredit)}
              </div>
              <span className="text-xs text-slate-500 block mt-1">Available to allocate</span>
            </div>

            {/* Total Outstanding Dues */}
            <div
              className={`p-4 rounded-xl border ${
                parseFloat(accountSummary.outstandingDues) > 0
                  ? 'bg-amber-50/40 border-amber-200 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wider block">
                Outstanding Dues
              </span>
              <div className="mt-1 text-xl font-bold font-mono text-amber-800">
                {formatInr(accountSummary.outstandingDues)}
              </div>
              <span className="text-xs text-slate-500 block mt-1">Unpaid bill balances</span>
            </div>

            {/* Delivery Sites Count */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Delivery Sites
              </span>
              <div className="mt-1 text-xl font-bold font-mono text-slate-900">
                {sitesData?.data?.length ?? 0}
              </div>
              <span className="text-xs text-slate-500 block mt-1">Registered locations</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Detail Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8" aria-label="Customer Detail Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('sites')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'sites'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Delivery Sites ({sitesData?.data?.length ?? 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'ledger'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            Ledger Statement
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'invoices'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Invoices ({invoicesData?.totalElements ?? '...'})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('receipts')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'receipts'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Receipts ({receiptsData?.totalElements ?? '...'})
          </button>
        </nav>
      </div>

      {/* TAB 1: SITES */}
      {activeTab === 'sites' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-teal-700" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Customer Delivery Sites</h2>
                <p className="text-xs text-slate-500">
                  Delivery locations, site supervisors, and project drop points for invoices
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                resetCreateSiteForm();
                setIsCreateSiteOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Site
            </Button>
          </div>

          {isSitesLoading ? (
            <div className="p-6">
              <TableSkeleton columns={5} rows={4} />
            </div>
          ) : isSitesError ? (
            <div className="p-6">
              <ErrorMessage
                error={sitesError}
                title="Failed to load customer sites"
                onRetry={() => refetchSites()}
              />
            </div>
          ) : !sitesData || sitesData.data.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<MapPin className="w-12 h-12 text-slate-300" />}
                title="No delivery sites added"
                description="This customer currently has no secondary delivery sites. Invoices default to primary shop pickup or counter billing."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      resetCreateSiteForm();
                      setIsCreateSiteOpen(true);
                    }}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Add First Site
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table ariaLabel="Customer sites table">
                <TableHeader>
                  <TableRow>
                    <TableHead align="left">Site Name</TableHead>
                    <TableHead align="left">Delivery Address</TableHead>
                    <TableHead align="left">Site Contact</TableHead>
                    <TableHead align="center">Status</TableHead>
                    <TableHead align="right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sitesData.data.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell align="left">
                        <div className="font-semibold text-slate-900">{site.siteName}</div>
                        {site.notes && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{site.notes}</p>}
                      </TableCell>

                      <TableCell align="left">
                        <div className="text-xs text-slate-700 space-y-0.5">
                          <p>{[site.addressLine1, site.addressLine2].filter(Boolean).join(', ') || 'No street address'}</p>
                          <p className="text-slate-500">
                            {[site.city, site.state, site.postalCode].filter(Boolean).join(', ') || '—'}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell align="left">
                        <div className="text-xs space-y-0.5">
                          {site.contactPerson && (
                            <div className="font-medium text-slate-800">{site.contactPerson}</div>
                          )}
                          {site.contactPhone ? (
                            <div className="text-slate-600 font-mono">{site.contactPhone}</div>
                          ) : (
                            <span className="text-slate-400 italic">No phone</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell align="center">
                        <Badge variant={site.isActive ? 'success' : 'neutral'}>
                          {site.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>

                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditSite(site)}
                            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                            aria-label={`Edit ${site.siteName}`}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setToggleSiteStatusTarget(site)}
                            leftIcon={<Power className="w-3.5 h-3.5" />}
                            className={site.isActive ? 'text-amber-600 hover:text-amber-700' : 'text-teal-600 hover:text-teal-700'}
                            aria-label={site.isActive ? `Deactivate ${site.siteName}` : `Activate ${site.siteName}`}
                          >
                            {site.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LEDGER STATEMENT */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-teal-700" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Customer Statement & Ledger</h2>
                <p className="text-xs text-slate-500">
                  Sequential business events, invoiced debit amounts, receipt credits, and running balance
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadLedgerPdf}
              isLoading={isDownloadingLedgerPdf}
              leftIcon={<Download className="w-4 h-4 text-teal-600" />}
            >
              Download PDF Statement
            </Button>
          </div>

          {/* Date range filter */}
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="ledger-start" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                From:
              </label>
              <Input
                id="ledger-start"
                type="date"
                value={ledgerStartDate}
                onChange={(e) => {
                  setLedgerStartDate(e.target.value);
                  setLedgerPage(0);
                }}
                className="w-40 bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="ledger-end" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                To:
              </label>
              <Input
                id="ledger-end"
                type="date"
                value={ledgerEndDate}
                onChange={(e) => {
                  setLedgerEndDate(e.target.value);
                  setLedgerPage(0);
                }}
                className="w-40 bg-white"
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
              >
                Clear Dates
              </Button>
            )}
          </div>

          {/* Opening and Closing Balance Banner */}
          {ledgerStatement && (
            <div className="mx-4 p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-4 text-sm font-medium">
              <div>
                <span className="text-slate-500 mr-2">Opening Balance:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatInr(Math.abs(parseFloat(ledgerStatement.openingBalance)))}
                  {' '}
                  <span className="text-xs text-slate-500">
                    {parseFloat(ledgerStatement.openingBalance) > 0 ? 'Dr (Receivable)' : parseFloat(ledgerStatement.openingBalance) < 0 ? 'Cr (Advance)' : 'Nil'}
                  </span>
                </span>
              </div>
              <div>
                <span className="text-slate-500 mr-2">Closing Balance:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatInr(Math.abs(parseFloat(ledgerStatement.closingBalance)))}
                  {' '}
                  <span className="text-xs text-slate-500">
                    {parseFloat(ledgerStatement.closingBalance) > 0 ? 'Dr (Receivable)' : parseFloat(ledgerStatement.closingBalance) < 0 ? 'Cr (Advance)' : 'Nil'}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Ledger Table */}
          {isLedgerLoading ? (
            <div className="p-6">
              <TableSkeleton columns={6} rows={5} />
            </div>
          ) : !ledgerStatement || ledgerStatement.entries.data.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<FileText className="w-12 h-12 text-slate-300" />}
                title="No ledger events found"
                description="No transactions or ledger events match the specified date range."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table ariaLabel="Customer ledger entries">
                <TableHeader>
                  <TableRow>
                    <TableHead align="left">Date</TableHead>
                    <TableHead align="left">Type</TableHead>
                    <TableHead align="left">Reference / Notes</TableHead>
                    <TableHead align="right">Debit (Dr)</TableHead>
                    <TableHead align="right">Credit (Cr)</TableHead>
                    <TableHead align="right">Running Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerStatement.entries.data.map((entry) => {
                    const amountNum = parseFloat(entry.amount);
                    const runningBalNum = parseFloat(entry.runningBalance);
                    const isDebit = amountNum > 0;
                    const isCredit = amountNum < 0;

                    return (
                      <TableRow key={entry.id}>
                        <TableCell align="left">
                          <span className="text-xs font-medium text-slate-800">
                            {formatBusinessDate(entry.effectiveDate)}
                          </span>
                        </TableCell>

                        <TableCell align="left">
                          <Badge
                            variant={
                              entry.sourceType === 'INVOICE'
                                ? 'default'
                                : entry.sourceType === 'RECEIPT'
                                ? 'success'
                                : entry.sourceType === 'CUSTOMER_RETURN'
                                ? 'warning'
                                : 'neutral'
                            }
                          >
                            {entry.sourceType.replace('_', ' ')}
                          </Badge>
                        </TableCell>

                        <TableCell align="left">
                          <div className="text-xs">
                            <span className="font-mono text-slate-900 font-semibold block">
                              Ref #{entry.sourceId}
                            </span>
                            {entry.notes && (
                              <span className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">
                                {entry.notes}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell align="right">
                          <span className="font-mono text-xs font-semibold text-slate-900">
                            {isDebit ? formatInr(amountNum) : '—'}
                          </span>
                        </TableCell>

                        <TableCell align="right">
                          <span className="font-mono text-xs font-semibold text-teal-700">
                            {isCredit ? formatInr(Math.abs(amountNum)) : '—'}
                          </span>
                        </TableCell>

                        <TableCell align="right">
                          <div className="font-mono text-xs font-bold text-slate-900">
                            {formatInr(Math.abs(runningBalNum))}
                            <span className="ml-1 text-[10px] font-semibold text-slate-500">
                              {runningBalNum > 0 ? 'Dr' : runningBalNum < 0 ? 'Cr' : ''}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="p-4 border-t border-slate-100">
                <Pagination
                  currentPage={ledgerPage}
                  totalPages={ledgerStatement.entries.totalPages}
                  totalElements={ledgerStatement.entries.totalElements}
                  pageSize={20}
                  onPageChange={setLedgerPage}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CUSTOMER INVOICES */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-teal-700" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Sales Invoices</h2>
                <p className="text-xs text-slate-500">
                  Invoices issued to this customer, settlement status, and balances
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/billing/new?customerId=${customer.id}`)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Bill
            </Button>
          </div>

          {isInvoicesLoading ? (
            <div className="p-6">
              <TableSkeleton columns={8} rows={4} />
            </div>
          ) : !invoicesData || invoicesData.data.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Building2 className="w-12 h-12 text-slate-300" />}
                title="No invoices found"
                description="No sales invoices have been posted for this customer yet."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/billing/new?customerId=${customer.id}`)}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Create First Bill
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table ariaLabel="Customer sales invoices">
                <TableHeader>
                  <TableRow>
                    <TableHead align="left">Invoice #</TableHead>
                    <TableHead align="left">Date</TableHead>
                    <TableHead align="left">Site</TableHead>
                    <TableHead align="left">Format</TableHead>
                    <TableHead align="right">Payable</TableHead>
                    <TableHead align="right">Allocated</TableHead>
                    <TableHead align="right">Outstanding</TableHead>
                    <TableHead align="center">Due Status</TableHead>
                    <TableHead align="right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesData.data.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell align="left">
                        <span className="font-mono font-bold text-teal-700 text-xs">
                          {inv.invoiceNumber}
                        </span>
                      </TableCell>

                      <TableCell align="left">
                        <span className="text-xs text-slate-800">
                          {formatBusinessDate(inv.invoiceDate)}
                        </span>
                      </TableCell>

                      <TableCell align="left">
                        <span className="text-xs text-slate-700 font-medium">
                          {inv.siteName || <span className="text-slate-400 italic">Primary / Counter</span>}
                        </span>
                      </TableCell>

                      <TableCell align="left">
                        <Badge variant={inv.displayFormat === 'GST' ? 'info' : 'neutral'}>
                          {inv.displayFormat}
                        </Badge>
                      </TableCell>

                      <TableCell align="right">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {formatInr(inv.totalPayableAmount)}
                        </span>
                      </TableCell>

                      <TableCell align="right">
                        <span className="font-mono text-xs text-teal-700">
                          {formatInr(inv.totalAllocatedAmount)}
                        </span>
                      </TableCell>

                      <TableCell align="right">
                        <span
                          className={`font-mono text-xs font-bold ${
                            parseFloat(inv.outstandingAmount) > 0 ? 'text-rose-600' : 'text-slate-500'
                          }`}
                        >
                          {formatInr(inv.outstandingAmount)}
                        </span>
                      </TableCell>

                      <TableCell align="center">
                        {inv.isOverdue ? (
                          <Badge variant="danger" className="flex items-center gap-1 mx-auto w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            {inv.daysOverdue}d Overdue
                          </Badge>
                        ) : inv.settlementStatus === 'PAID' ? (
                          <Badge variant="success">Paid</Badge>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Due {formatBusinessDate(inv.dueDate)}
                          </span>
                        )}
                      </TableCell>

                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/billing/invoices/${inv.id}`)}
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadInvoicePdf(inv.id, inv.invoiceNumber)}
                            isLoading={downloadingInvoiceId === inv.id}
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

              <div className="p-4 border-t border-slate-100">
                <Pagination
                  currentPage={invoicesPage}
                  totalPages={invoicesData.totalPages}
                  totalElements={invoicesData.totalElements}
                  pageSize={10}
                  onPageChange={setInvoicesPage}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CUSTOMER RECEIPTS */}
      {activeTab === 'receipts' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Receipt className="w-5 h-5 text-teal-700" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Customer Receipts & Vouchers</h2>
                <p className="text-xs text-slate-500">
                  Payments received from customer, payment mode breakdown, and invoice allocations
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReceiptModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4 text-teal-600" />}
            >
              Record Receipt
            </Button>
          </div>

          {isReceiptsLoading ? (
            <div className="p-6">
              <TableSkeleton columns={7} rows={4} />
            </div>
          ) : !receiptsData || receiptsData.data.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Receipt className="w-12 h-12 text-slate-300" />}
                title="No receipts recorded"
                description="No payments or receipts have been recorded for this customer yet."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsReceiptModalOpen(true)}
                    leftIcon={<Plus className="w-4 h-4 text-teal-600" />}
                  >
                    Record First Receipt
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table ariaLabel="Customer receipts">
                <TableHeader>
                  <TableRow>
                    <TableHead align="left">Receipt #</TableHead>
                    <TableHead align="left">Date</TableHead>
                    <TableHead align="left">Payment Mode</TableHead>
                    <TableHead align="right">Amount</TableHead>
                    <TableHead align="right">Allocated</TableHead>
                    <TableHead align="right">Unallocated Credit</TableHead>
                    <TableHead align="right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receiptsData.data.map((receipt) => {
                    const totalAmt = parseFloat(receipt.totalAmount);
                    const unallocAmt = parseFloat(receipt.unallocatedAmount);
                    const allocAmt = totalAmt - unallocAmt;

                    return (
                      <TableRow key={receipt.id}>
                        <TableCell align="left">
                          <span className="font-mono font-bold text-teal-700 text-xs">
                            {receipt.receiptNumber}
                          </span>
                        </TableCell>

                        <TableCell align="left">
                          <span className="text-xs text-slate-800">
                            {formatBusinessDate(receipt.receiptDate)}
                          </span>
                        </TableCell>

                        <TableCell align="left">
                          <div className="flex flex-wrap gap-1">
                            {receipt.components.map((comp, idx) => (
                              <Badge key={idx} variant={comp.method === 'CASH' ? 'neutral' : 'info'}>
                                {comp.method}: {formatInr(comp.amount)}
                                {comp.onlineReference ? ` (${comp.onlineReference})` : ''}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>

                        <TableCell align="right">
                          <span className="font-mono text-xs font-bold text-teal-800">
                            {formatInr(receipt.totalAmount)}
                          </span>
                        </TableCell>

                        <TableCell align="right">
                          <span className="font-mono text-xs text-slate-700">
                            {formatInr(allocAmt)}
                          </span>
                        </TableCell>

                        <TableCell align="right">
                          <span
                            className={`font-mono text-xs font-semibold ${
                              unallocAmt > 0 ? 'text-teal-700' : 'text-slate-400'
                            }`}
                          >
                            {formatInr(receipt.unallocatedAmount)}
                          </span>
                        </TableCell>

                        <TableCell align="right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadReceiptPdf(receipt.id, receipt.receiptNumber)}
                            isLoading={downloadingReceiptId === receipt.id}
                            leftIcon={<Download className="w-3.5 h-3.5" />}
                          >
                            PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="p-4 border-t border-slate-100">
                <Pagination
                  currentPage={receiptsPage}
                  totalPages={receiptsData.totalPages}
                  totalElements={receiptsData.totalElements}
                  pageSize={10}
                  onPageChange={setReceiptsPage}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Customer Modal */}
      <Modal
        isOpen={isEditCustomerOpen}
        onClose={() => {
          if (!updateCustomerMutation.isPending) {
            setIsEditCustomerOpen(false);
          }
        }}
        title={`Edit Customer: ${customer.name}`}
      >
        <form onSubmit={handleEditCustomerSubmit} className="space-y-4">
          {editCustError && <ErrorMessage error={editCustError} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Customer Type <span className="text-red-500">*</span>
              </label>
              <Select
                value={editCustType}
                onChange={(e) => setEditCustType(e.target.value as CustomerType)}
                options={[
                  { value: 'RETAIL', label: 'Retail Customer' },
                  { value: 'CONTRACTOR', label: 'Contractor' },
                  { value: 'BUILDER', label: 'Builder / Developer' },
                ]}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={editCustName}
                onChange={(e) => setEditCustName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <Input
                value={editCustPhone}
                onChange={(e) => setEditCustPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <Input
                type="email"
                value={editCustEmail}
                onChange={(e) => setEditCustEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                GSTIN
              </label>
              <Input
                value={editCustGstin}
                onChange={(e) => setEditCustGstin(e.target.value.toUpperCase())}
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
                value={editCustAddress1}
                onChange={(e) => setEditCustAddress1(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Address Line 2
              </label>
              <Input
                value={editCustAddress2}
                onChange={(e) => setEditCustAddress2(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                City
              </label>
              <Input
                value={editCustCity}
                onChange={(e) => setEditCustCity(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                State
              </label>
              <Input
                value={editCustState}
                onChange={(e) => setEditCustState(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Postal Code
              </label>
              <Input
                value={editCustPostalCode}
                onChange={(e) => setEditCustPostalCode(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Internal Remarks / Notes
            </label>
            <Textarea
              value={editCustNotes}
              onChange={(e) => setEditCustNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="pt-1">
            <Checkbox
              id="edit-customer-active-detail"
              label="Active customer account"
              checked={editCustIsActive}
              onChange={(e) => setEditCustIsActive(e.target.checked)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditCustomerOpen(false)}
              disabled={updateCustomerMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={updateCustomerMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Site Modal */}
      <Modal
        isOpen={isCreateSiteOpen}
        onClose={() => {
          if (!createSiteMutation.isPending) {
            setIsCreateSiteOpen(false);
          }
        }}
        title="Add Delivery Site"
      >
        <form onSubmit={handleCreateSiteSubmit} className="space-y-4">
          {createSiteError && <ErrorMessage error={createSiteError} />}

          <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-900">
            <strong>Customer:</strong> [{customer.customerCode}] {customer.name} ({customer.customerType})
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Site Name / Identifier <span className="text-red-500">*</span>
            </label>
            <Input
              value={createSiteName}
              onChange={(e) => setCreateSiteName(e.target.value)}
              placeholder="e.g. Greenwood Heights - Wing A"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Site Address Line 1
              </label>
              <Input
                value={createSiteAddress1}
                onChange={(e) => setCreateSiteAddress1(e.target.value)}
                placeholder="Plot/Survey number, Crossroad"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Site Address Line 2
              </label>
              <Input
                value={createSiteAddress2}
                onChange={(e) => setCreateSiteAddress2(e.target.value)}
                placeholder="Nearby landmark, Village"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                City / Taluka
              </label>
              <Input
                value={createSiteCity}
                onChange={(e) => setCreateSiteCity(e.target.value)}
                placeholder="e.g. Pune"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                State
              </label>
              <Input
                value={createSiteState}
                onChange={(e) => setCreateSiteState(e.target.value)}
                placeholder="e.g. Maharashtra"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Postal Code
              </label>
              <Input
                value={createSitePostalCode}
                onChange={(e) => setCreateSitePostalCode(e.target.value)}
                placeholder="e.g. 411057"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                On-Site Contact Person
              </label>
              <Input
                value={createSiteContactPerson}
                onChange={(e) => setCreateSiteContactPerson(e.target.value)}
                placeholder="e.g. Supervisor Patil"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                On-Site Contact Phone
              </label>
              <Input
                value={createSiteContactPhone}
                onChange={(e) => setCreateSiteContactPhone(e.target.value)}
                placeholder="e.g. +91 9988776655"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Site Delivery Instructions
            </label>
            <Textarea
              value={createSiteNotes}
              onChange={(e) => setCreateSiteNotes(e.target.value)}
              placeholder="Unloading instructions, gate entry details..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateSiteOpen(false)}
              disabled={createSiteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createSiteMutation.isPending}
            >
              Add Site
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Site Modal */}
      <Modal
        isOpen={!!editingSite}
        onClose={() => {
          if (!updateSiteMutation.isPending) {
            setEditingSite(null);
          }
        }}
        title={`Edit Site: ${editingSite?.siteName || ''}`}
      >
        <form onSubmit={handleEditSiteSubmit} className="space-y-4">
          {editSiteError && <ErrorMessage error={editSiteError} />}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Site Name / Identifier <span className="text-red-500">*</span>
            </label>
            <Input
              value={editSiteName}
              onChange={(e) => setEditSiteName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Site Address Line 1
              </label>
              <Input
                value={editSiteAddress1}
                onChange={(e) => setEditSiteAddress1(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Site Address Line 2
              </label>
              <Input
                value={editSiteAddress2}
                onChange={(e) => setEditSiteAddress2(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                City / Taluka
              </label>
              <Input
                value={editSiteCity}
                onChange={(e) => setEditSiteCity(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                State
              </label>
              <Input
                value={editSiteState}
                onChange={(e) => setEditSiteState(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Postal Code
              </label>
              <Input
                value={editSitePostalCode}
                onChange={(e) => setEditSitePostalCode(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                On-Site Contact Person
              </label>
              <Input
                value={editSiteContactPerson}
                onChange={(e) => setEditSiteContactPerson(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                On-Site Contact Phone
              </label>
              <Input
                value={editSiteContactPhone}
                onChange={(e) => setEditSiteContactPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Site Delivery Instructions
            </label>
            <Textarea
              value={editSiteNotes}
              onChange={(e) => setEditSiteNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="pt-1">
            <Checkbox
              id="edit-site-active"
              label="Active delivery location (selectable on invoices)"
              checked={editSiteIsActive}
              onChange={(e) => setEditSiteIsActive(e.target.checked)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingSite(null)}
              disabled={updateSiteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={updateSiteMutation.isPending}
            >
              Save Site
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Site Status Toggle */}
      <ConfirmationDialog
        isOpen={!!toggleSiteStatusTarget}
        title={toggleSiteStatusTarget?.isActive ? 'Deactivate Delivery Site' : 'Activate Delivery Site'}
        message={
          toggleSiteStatusTarget?.isActive
            ? `Are you sure you want to deactivate "${toggleSiteStatusTarget?.siteName}"? Inactive sites cannot be selected on new bills. Past invoices remain intact.`
            : `Are you sure you want to activate "${toggleSiteStatusTarget?.siteName}"?`
        }
        confirmLabel={toggleSiteStatusTarget?.isActive ? 'Deactivate' : 'Activate'}
        isDestructive={toggleSiteStatusTarget?.isActive}
        isLoading={toggleSiteStatusMutation.isPending}
        onConfirm={() => {
          if (toggleSiteStatusTarget) {
            toggleSiteStatusMutation.mutate({
              siteId: toggleSiteStatusTarget.id,
              expectedVersion: toggleSiteStatusTarget.version,
              isActive: !toggleSiteStatusTarget.isActive,
            });
          }
        }}
        onClose={() => setToggleSiteStatusTarget(null)}
      />

      {/* Confirmation Dialog for Customer Status Toggle */}
      <ConfirmationDialog
        isOpen={!!toggleCustomerStatusTarget}
        title={toggleCustomerStatusTarget?.isActive ? 'Deactivate Customer' : 'Activate Customer'}
        message={
          toggleCustomerStatusTarget?.isActive
            ? `Are you sure you want to deactivate "${toggleCustomerStatusTarget?.name}"?`
            : `Are you sure you want to activate "${toggleCustomerStatusTarget?.name}"?`
        }
        confirmLabel={toggleCustomerStatusTarget?.isActive ? 'Deactivate' : 'Activate'}
        isDestructive={toggleCustomerStatusTarget?.isActive}
        isLoading={toggleCustomerStatusMutation.isPending}
        onConfirm={() => {
          if (toggleCustomerStatusTarget) {
            toggleCustomerStatusMutation.mutate({
              expectedVersion: toggleCustomerStatusTarget.version,
              isActive: !toggleCustomerStatusTarget.isActive,
            });
          }
        }}
        onClose={() => setToggleCustomerStatusTarget(null)}
      />

      {/* Financial Modals */}
      {isReceiptModalOpen && (
        <CustomerReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          customer={{ id: customer.id, name: customer.name, customerCode: customer.customerCode }}
          onSuccess={() => {
            refetchSummary();
            refetchCustomer();
            if (activeTab === 'ledger') refetchLedger();
            if (activeTab === 'invoices') refetchInvoices();
            if (activeTab === 'receipts') refetchReceipts();
          }}
        />
      )}

      {isAllocationModalOpen && (
        <CustomerAllocationModal
          isOpen={isAllocationModalOpen}
          onClose={() => setIsAllocationModalOpen(false)}
          customer={{ id: customer.id, name: customer.name, customerCode: customer.customerCode }}
          onSuccess={() => {
            refetchSummary();
            refetchCustomer();
            if (activeTab === 'ledger') refetchLedger();
            if (activeTab === 'invoices') refetchInvoices();
            if (activeTab === 'receipts') refetchReceipts();
          }}
        />
      )}
    </div>
  );
};

export default CustomerDetailPage;
