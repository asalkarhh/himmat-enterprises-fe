import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, RefreshCw, Power, Truck, FilterX, MapPin, Phone, Mail, User } from 'lucide-react';
import { supplierApi } from '../../api/party.api';
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
  SupplierDto,
  CreateSupplierRequest,
  UpdateSupplierRequest,
} from '../../types/party.types';
import { ApiError } from '../../types/api.types';

export const SuppliersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDto | null>(null);
  const [toggleStatusTarget, setToggleStatusTarget] = useState<SupplierDto | null>(null);

  // Create form state
  const [createName, setCreateName] = useState('');
  const [createContactPerson, setCreateContactPerson] = useState('');
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

  // Query suppliers
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.suppliers.list({
      page,
      search,
      isActive: activeFilter,
    }),
    queryFn: ({ signal }) =>
      supplierApi.getSuppliers(
        {
          page,
          size: 15,
          search: search || undefined,
          isActive: activeFilter,
        },
        signal
      ),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateSupplierRequest) => supplierApi.createSupplier(payload),
    onSuccess: (newSupp) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      success(`Supplier "${newSupp.name}" (${newSupp.supplierCode}) created successfully`);
      setIsCreateModalOpen(false);
      resetCreateForm();
    },
    onError: (err: ApiError) => {
      setCreateError(err.message || 'Failed to create supplier. Check fields.');
    },
  });

  // Edit mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSupplierRequest }) =>
      supplierApi.updateSupplier(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      success(`Supplier "${updated.name}" updated successfully`);
      setEditingSupplier(null);
      resetEditForm();
    },
    onError: (err: ApiError) => {
      if (err.status === 409) {
        setEditError('Conflict: This supplier was modified by another user. Please refresh and retry.');
      } else {
        setEditError(err.message || 'Failed to update supplier');
      }
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, expectedVersion, isActive }: { id: string; expectedVersion: number; isActive: boolean }) =>
      supplierApi.updateSupplier(id, { expectedVersion, isActive }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      success(`Supplier "${updated.name}" is now ${updated.isActive ? 'active' : 'inactive'}`);
      setToggleStatusTarget(null);
    },
    onError: (err: ApiError) => {
      if (err.status === 409) {
        toastError('Conflict: Record was modified by another user. Please refresh and retry.');
      } else {
        toastError(err.message || 'Failed to update supplier status');
      }
      setToggleStatusTarget(null);
    },
  });

  const resetCreateForm = () => {
    setCreateName('');
    setCreateContactPerson('');
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
    setEditName('');
    setEditContactPerson('');
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

  const handleOpenEdit = (supplier: SupplierDto) => {
    setEditingSupplier(supplier);
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
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      setCreateError('Supplier name is required');
      return;
    }
    if (createEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createEmail.trim())) {
      setCreateError('Please enter a valid email address');
      return;
    }

    setCreateError(null);
    createMutation.mutate({
      name: createName.trim(),
      contactPerson: createContactPerson.trim() || undefined,
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
    if (!editingSupplier) return;

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
      id: editingSupplier.id,
      payload: {
        expectedVersion: editingSupplier.version,
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
      },
    });
  };

  const clearAllFilters = () => {
    setSearch('');
    setActiveFilter(undefined);
    setPage(0);
  };

  const hasActiveFilters = !!(search || activeFilter !== undefined);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        subtitle="Manage vendor and distributor accounts for purchase orders and inventory inward"
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
              Add Supplier
            </Button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Input
            placeholder="Search code, name, phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
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

      {/* Suppliers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton columns={6} rows={8} />
          </div>
        ) : isError ? (
          <div className="p-6">
            <ErrorMessage
              error={error}
              title="Failed to load suppliers"
              onRetry={() => refetch()}
            />
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Truck className="w-12 h-12 text-slate-300" />}
              title="No suppliers found"
              description={
                hasActiveFilters
                  ? 'No suppliers match the active criteria.'
                  : 'Start recording suppliers to prepare for inventory purchase orders.'
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
                    Add Supplier
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table ariaLabel="Suppliers list table">
                <TableHeader>
                  <TableRow>
                    <TableHead align="left">Code</TableHead>
                    <TableHead align="left">Supplier Name</TableHead>
                    <TableHead align="left">Contact Person</TableHead>
                    <TableHead align="left">Phone & Email</TableHead>
                    <TableHead align="left">City</TableHead>
                    <TableHead align="center">Status</TableHead>
                    <TableHead align="right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell align="left" className="font-mono text-xs font-bold text-slate-800">
                        {supplier.supplierCode}
                      </TableCell>

                      <TableCell align="left" className="font-medium text-slate-900">
                        <div>
                          <Link
                            to={`/suppliers/${supplier.id}`}
                            className="text-teal-700 hover:text-teal-800 font-semibold hover:underline"
                          >
                            {supplier.name}
                          </Link>
                          {supplier.gstin && (
                            <span className="text-[11px] font-mono text-slate-500 block">
                              GST: {supplier.gstin}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell align="left">
                        {supplier.contactPerson ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{supplier.contactPerson}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">—</span>
                        )}
                      </TableCell>

                      <TableCell align="left">
                        <div className="text-xs space-y-0.5">
                          {supplier.phone ? (
                            <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{supplier.phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No phone</span>
                          )}
                          {supplier.email && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[150px]">{supplier.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell align="left">
                        {supplier.city ? (
                          <div className="flex items-center gap-1 text-xs text-slate-700">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>
                              {supplier.city}
                              {supplier.state ? `, ${supplier.state}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>

                      <TableCell align="center">
                        <Badge variant={supplier.isActive ? 'success' : 'neutral'}>
                          {supplier.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>

                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/suppliers/${supplier.id}`)}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(supplier)}
                            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                            aria-label={`Edit ${supplier.name}`}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setToggleStatusTarget(supplier)}
                            leftIcon={<Power className="w-3.5 h-3.5" />}
                            className={supplier.isActive ? 'text-amber-600 hover:text-amber-700' : 'text-teal-600 hover:text-teal-700'}
                            aria-label={supplier.isActive ? `Deactivate ${supplier.name}` : `Activate ${supplier.name}`}
                          >
                            {supplier.isActive ? 'Deactivate' : 'Activate'}
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

      {/* Create Supplier Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (!createMutation.isPending) {
            setIsCreateModalOpen(false);
          }
        }}
        title="Add Supplier"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && <ErrorMessage error={createError} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Supplier / Business Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Asian Paints Industrial Depot"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Contact Person Name
              </label>
              <Input
                value={createContactPerson}
                onChange={(e) => setCreateContactPerson(e.target.value)}
                placeholder="e.g. Anand Joshi"
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
                placeholder="e.g. +91 9822001122"
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
                placeholder="vendor@domain.com"
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
                placeholder="Warehouse/Plot no., Industrial estate"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Address Line 2
              </label>
              <Input
                value={createAddress2}
                onChange={(e) => setCreateAddress2(e.target.value)}
                placeholder="MIDC Area, Near Bypass"
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
                placeholder="e.g. Mumbai"
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
                placeholder="e.g. 400001"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Internal Notes
            </label>
            <Textarea
              value={createNotes}
              onChange={(e) => setCreateNotes(e.target.value)}
              placeholder="Payment terms, dispatch lead times, bank details..."
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
              Create Supplier
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Supplier Modal */}
      <Modal
        isOpen={!!editingSupplier}
        onClose={() => {
          if (!updateMutation.isPending) {
            setEditingSupplier(null);
          }
        }}
        title={`Edit Supplier: ${editingSupplier?.name || ''}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && <ErrorMessage error={editError} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Supplier / Business Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Contact Person Name
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
              id="edit-supplier-active"
              label="Active supplier (available for purchase orders and inventory inward)"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingSupplier(null)}
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
            ? `Are you sure you want to deactivate "${toggleStatusTarget?.name}" (${toggleStatusTarget?.supplierCode})? Inactive suppliers cannot be selected on new purchase bills.`
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

export default SuppliersPage;
