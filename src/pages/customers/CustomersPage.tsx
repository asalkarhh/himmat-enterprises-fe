import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, RefreshCw, Power, Users2, FilterX, MapPin, Phone, Mail } from 'lucide-react';
import { customerApi } from '../../api/party.api';
import { queryKeys } from '../../api/queryKeys';
import { useToast } from '../../hooks/useToast';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
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
import {
  CustomerDto,
  CustomerType,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from '../../types/party.types';
import { ApiError } from '../../types/api.types';

export const CustomersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<CustomerType | ''>('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDto | null>(null);
  const [toggleStatusTarget, setToggleStatusTarget] = useState<CustomerDto | null>(null);

  // Create form state
  const [createType, setCreateType] = useState<CustomerType>('RETAIL');
  const [createName, setCreateName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createGstin, setCreateGstin] = useState('');
  const [createAddress1, setCreateAddress1] = useState('');
  const [createAddress2, setCreateAddress2] = useState('');
  const [createCity, setCreateCity] = useState('');
  const [createState, setCreateState] = useState('');
  const [createPostalCode, setCreatePostalCode] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit form state
  const [editType, setEditType] = useState<CustomerType>('RETAIL');
  const [editName, setEditName] = useState('');
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

  // Query customers list
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.customers.list({
      page,
      search,
      customerType: selectedType || undefined,
      isActive: activeFilter,
    }),
    queryFn: ({ signal }) =>
      customerApi.getCustomers(
        {
          page,
          size: 15,
          search: search || undefined,
          customerType: selectedType || undefined,
          isActive: activeFilter,
        },
        signal
      ),
  });

  // Create customer mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateCustomerRequest) => customerApi.createCustomer(payload),
    onSuccess: (newCust) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      success(`Customer "${newCust.name}" (${newCust.customerCode}) created successfully`);
      setIsCreateModalOpen(false);
      resetCreateForm();
    },
    onError: (err: ApiError) => {
      setCreateError(err.message || 'Failed to create customer. Check inputs.');
    },
  });

  // Edit customer mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCustomerRequest }) =>
      customerApi.updateCustomer(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      success(`Customer "${updated.name}" updated successfully`);
      setEditingCustomer(null);
      resetEditForm();
    },
    onError: (err: ApiError) => {
      if (err.status === 409) {
        setEditError('Conflict: This customer was modified by another user. Please refresh and retry.');
      } else {
        setEditError(err.message || 'Failed to update customer');
      }
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, expectedVersion, isActive }: { id: string; expectedVersion: number; isActive: boolean }) =>
      customerApi.updateCustomer(id, { expectedVersion, isActive }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      success(`Customer "${updated.name}" is now ${updated.isActive ? 'active' : 'inactive'}`);
      setToggleStatusTarget(null);
    },
    onError: (err: ApiError) => {
      if (err.status === 409) {
        toastError('Conflict: Record was modified by another user. Please refresh and retry.');
      } else {
        toastError(err.message || 'Failed to change customer status');
      }
      setToggleStatusTarget(null);
    },
  });

  const resetCreateForm = () => {
    setCreateType('RETAIL');
    setCreateName('');
    setCreatePhone('');
    setCreateEmail('');
    setCreateGstin('');
    setCreateAddress1('');
    setCreateAddress2('');
    setCreateCity('');
    setCreateState('');
    setCreatePostalCode('');
    setCreateNotes('');
    setCreateError(null);
  };

  const resetEditForm = () => {
    setEditType('RETAIL');
    setEditName('');
    setEditPhone('');
    setEditEmail('');
    setEditGstin('');
    setEditAddress1('');
    setEditAddress2('');
    setEditCity('');
    setEditState('');
    setEditPostalCode('');
    setEditNotes('');
    setEditIsActive(true);
    setEditError(null);
  };

  const handleOpenEdit = (customer: CustomerDto) => {
    setEditingCustomer(customer);
    setEditType(customer.customerType);
    setEditName(customer.name);
    setEditPhone(customer.phone || '');
    setEditEmail(customer.email || '');
    setEditGstin(customer.gstin || '');
    setEditAddress1(customer.addressLine1 || '');
    setEditAddress2(customer.addressLine2 || '');
    setEditCity(customer.city || '');
    setEditState(customer.state || '');
    setEditPostalCode(customer.postalCode || '');
    setEditNotes(customer.notes || '');
    setEditIsActive(customer.isActive);
    setEditError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      setCreateError('Customer name is required');
      return;
    }
    if (createEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createEmail.trim())) {
      setCreateError('Please enter a valid email address');
      return;
    }

    setCreateError(null);
    createMutation.mutate({
      customerType: createType,
      name: createName.trim(),
      phone: createPhone.trim() || undefined,
      email: createEmail.trim() || undefined,
      gstin: createGstin.trim() ? createGstin.trim().toUpperCase() : undefined,
      addressLine1: createAddress1.trim() || undefined,
      addressLine2: createAddress2.trim() || undefined,
      city: createCity.trim() || undefined,
      state: createState.trim() || undefined,
      postalCode: createPostalCode.trim() || undefined,
      notes: createNotes.trim() || undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    if (!editName.trim()) {
      setEditError('Customer name is required');
      return;
    }
    if (editEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim())) {
      setEditError('Please enter a valid email address');
      return;
    }

    setEditError(null);
    updateMutation.mutate({
      id: editingCustomer.id,
      payload: {
        expectedVersion: editingCustomer.version,
        customerType: editType,
        name: editName.trim(),
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
      },
    });
  };

  const clearAllFilters = () => {
    setSearch('');
    setSelectedType('');
    setActiveFilter(undefined);
    setPage(0);
  };

  const hasActiveFilters = !!(search || selectedType || activeFilter !== undefined);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers & Sites"
        subtitle="Manage retail buyers, contractors, builders, and customer delivery site locations"
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
              onClick={() => {
                resetCreateForm();
                setIsCreateModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Customer
            </Button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            placeholder="Search code, name, phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />

          <Select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value as CustomerType | '');
              setPage(0);
            }}
            options={[
              { value: '', label: 'All Customer Types' },
              { value: 'RETAIL', label: 'Retail' },
              { value: 'CONTRACTOR', label: 'Contractor' },
              { value: 'BUILDER', label: 'Builder' },
            ]}
          />

          <Select
            value={activeFilter === undefined ? '' : activeFilter ? 'active' : 'inactive'}
            onChange={(e) => {
              const val = e.target.value;
              setActiveFilter(val === '' ? undefined : val === 'active');
              setPage(0);
            }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'active', label: 'Active Only' },
              { value: 'inactive', label: 'Inactive Only' },
            ]}
          />

          <div className="flex items-center justify-end">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                leftIcon={<FilterX className="w-3.5 h-3.5" />}
                className="text-slate-600 hover:text-slate-900"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton columns={6} rows={8} />
          </div>
        ) : isError ? (
          <div className="p-6">
            <ErrorMessage
              error={error}
              title="Failed to load customers"
              onRetry={() => refetch()}
            />
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Users2 className="w-12 h-12 text-slate-300" />}
              title="No customers found"
              description={
                hasActiveFilters
                  ? 'No customers match the active filters. Try clearing criteria.'
                  : 'Start building party records by adding your first customer.'
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    Clear Filters
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      resetCreateForm();
                      setIsCreateModalOpen(true);
                    }}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Add Customer
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table ariaLabel="Customers table">
                <TableHeader>
                  <TableRow>
                    <TableHead align="left">Code</TableHead>
                    <TableHead align="left">Customer Name</TableHead>
                    <TableHead align="left">Type</TableHead>
                    <TableHead align="left">Contact</TableHead>
                    <TableHead align="left">City / Area</TableHead>
                    <TableHead align="center">Status</TableHead>
                    <TableHead align="right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell align="left" className="font-mono text-xs font-bold text-slate-800">
                        {customer.customerCode}
                      </TableCell>

                      <TableCell align="left" className="font-medium text-slate-900">
                        <div>
                          <Link
                            to={`/customers/${customer.id}`}
                            className="text-teal-700 hover:text-teal-800 font-semibold hover:underline"
                          >
                            {customer.name}
                          </Link>
                          {customer.gstin && (
                            <span className="text-[11px] font-mono text-slate-500 block">
                              GST: {customer.gstin}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell align="left">
                        {renderTypeBadge(customer.customerType)}
                      </TableCell>

                      <TableCell align="left">
                        <div className="text-xs space-y-0.5">
                          {customer.phone ? (
                            <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{customer.phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No phone</span>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[150px]">{customer.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell align="left">
                        {customer.city ? (
                          <div className="flex items-center gap-1 text-xs text-slate-700">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>
                              {customer.city}
                              {customer.state ? `, ${customer.state}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>

                      <TableCell align="center">
                        <Badge variant={customer.isActive ? 'success' : 'neutral'}>
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>

                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/customers/${customer.id}`)}
                            leftIcon={<MapPin className="w-3.5 h-3.5" />}
                          >
                            Sites
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(customer)}
                            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                            aria-label={`Edit ${customer.name}`}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setToggleStatusTarget(customer)}
                            leftIcon={<Power className="w-3.5 h-3.5" />}
                            className={customer.isActive ? 'text-amber-600 hover:text-amber-700' : 'text-teal-600 hover:text-teal-700'}
                            aria-label={customer.isActive ? `Deactivate ${customer.name}` : `Activate ${customer.name}`}
                          >
                            {customer.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-200">
              <Pagination
                currentPage={data.page}
                totalPages={data.totalPages}
                totalElements={data.totalElements}
                pageSize={data.size}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          </>
        )}
      </div>

      {/* Create Customer Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (!createMutation.isPending) {
            setIsCreateModalOpen(false);
          }
        }}
        title="Add Customer"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && <ErrorMessage error={createError} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Customer Type <span className="text-red-500">*</span>
              </label>
              <Select
                value={createType}
                onChange={(e) => setCreateType(e.target.value as CustomerType)}
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
                Customer / Business Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Ramesh Construction"
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
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <Input
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="name@domain.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                GSTIN
              </label>
              <Input
                value={createGstin}
                onChange={(e) => setCreateGstin(e.target.value.toUpperCase())}
                placeholder="27AAAAA0000A1Z5"
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
                value={createAddress1}
                onChange={(e) => setCreateAddress1(e.target.value)}
                placeholder="Shop/Plot no., Street name"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Address Line 2
              </label>
              <Input
                value={createAddress2}
                onChange={(e) => setCreateAddress2(e.target.value)}
                placeholder="Landmark, Area"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                City
              </label>
              <Input
                value={createCity}
                onChange={(e) => setCreateCity(e.target.value)}
                placeholder="e.g. Pune"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                State
              </label>
              <Input
                value={createState}
                onChange={(e) => setCreateState(e.target.value)}
                placeholder="e.g. Maharashtra"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Postal Code
              </label>
              <Input
                value={createPostalCode}
                onChange={(e) => setCreatePostalCode(e.target.value)}
                placeholder="e.g. 411001"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Internal Remarks / Notes
            </label>
            <Textarea
              value={createNotes}
              onChange={(e) => setCreateNotes(e.target.value)}
              placeholder="Credit remarks, preferred contact hours, reference..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending}
            >
              Create Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={!!editingCustomer}
        onClose={() => {
          if (!updateMutation.isPending) {
            setEditingCustomer(null);
          }
        }}
        title={`Edit Customer: ${editingCustomer?.name || ''}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && <ErrorMessage error={editError} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Customer Type <span className="text-red-500">*</span>
              </label>
              <Select
                value={editType}
                onChange={(e) => setEditType(e.target.value as CustomerType)}
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
                Customer / Business Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
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
              Internal Remarks / Notes
            </label>
            <Textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="pt-1">
            <Checkbox
              id="edit-customer-active"
              label="Active customer (available for sales and site deliveries)"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingCustomer(null)}
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
        title={toggleStatusTarget?.isActive ? 'Deactivate Customer' : 'Activate Customer'}
        message={
          toggleStatusTarget?.isActive
            ? `Are you sure you want to deactivate "${toggleStatusTarget?.name}" (${toggleStatusTarget?.customerCode})? Inactive customers cannot be selected on new bills. Customer sites and existing ledger history remain intact.`
            : `Are you sure you want to activate "${toggleStatusTarget?.name}"?`
        }
        confirmLabel={toggleStatusTarget?.isActive ? 'Deactivate' : 'Activate'}
        isDestructive={toggleStatusTarget?.isActive}
        isLoading={toggleStatusMutation.isPending}
        onConfirm={() => {
          if (toggleStatusTarget) {
            toggleStatusMutation.mutate({
              id: toggleStatusTarget.id,
              expectedVersion: toggleStatusTarget.version,
              isActive: !toggleStatusTarget.isActive,
            });
          }
        }}
        onClose={() => setToggleStatusTarget(null)}
      />
    </div>
  );
};

export default CustomersPage;
