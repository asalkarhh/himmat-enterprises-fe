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
} from 'lucide-react';
import { customerApi, customerSiteApi } from '../../api/party.api';
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
import {
  CustomerDto,
  CustomerSiteDto,
  CustomerType,
  UpdateCustomerRequest,
  CreateCustomerSiteRequest,
  UpdateCustomerSiteRequest,
} from '../../types/party.types';
import { ApiError } from '../../types/api.types';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  // Modals
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [isCreateSiteOpen, setIsCreateSiteOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<CustomerSiteDto | null>(null);
  const [toggleCustomerStatusTarget, setToggleCustomerStatusTarget] = useState<CustomerDto | null>(null);
  const [toggleSiteStatusTarget, setToggleSiteStatusTarget] = useState<CustomerSiteDto | null>(null);

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
      success(`Customer "${updated.name}" updated successfully`);
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
      success(`Customer "${updated.name}" is now ${updated.isActive ? 'active' : 'inactive'}`);
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
      success(`Site "${newSite.siteName}" added successfully`);
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
      success(`Site "${updated.siteName}" updated successfully`);
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
      success(`Site "${updated.siteName}" is now ${updated.isActive ? 'active' : 'inactive'}`);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        subtitle={`Customer Code: ${customer.customerCode}`}
        actions={
          <div className="flex items-center gap-2">
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
                refetchSites();
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
            <div className="mt-1">
              <Badge variant={customer.isActive ? 'success' : 'neutral'}>
                {customer.isActive ? 'Active Account' : 'Deactivated'}
              </Badge>
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

      {/* Customer Delivery Sites Section */}
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
    </div>
  );
};

export default CustomerDetailPage;
