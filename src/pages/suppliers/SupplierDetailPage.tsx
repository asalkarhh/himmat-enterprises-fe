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
} from 'lucide-react';
import { supplierApi } from '../../api/party.api';
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
import { DateDisplay } from '../../components/ui/DateDisplay';
import {
  SupplierDto,
  UpdateSupplierRequest,
} from '../../types/party.types';
import { ApiError } from '../../types/api.types';

export const SupplierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toggleStatusTarget, setToggleStatusTarget] = useState<SupplierDto | null>(null);

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
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.suppliers.detail(id!),
    queryFn: ({ signal }) => supplierApi.getSupplierById(id!, signal),
    enabled: !!id,
  });

  // Edit mutation
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateSupplierRequest) => supplierApi.updateSupplier(id!, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      success(`Supplier "${updated.name}" updated successfully`);
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
      success(`Supplier "${updated.name}" is now ${updated.isActive ? 'active' : 'inactive'}`);
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

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <TableSkeleton columns={4} rows={4} />
      </div>
    );
  }

  if (isError || !supplier) {
    return (
      <div className="p-8">
        <ErrorMessage
          error={error}
          title="Supplier not found"
          onRetry={() => navigate('/suppliers')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.name}
        subtitle={`Supplier Code: ${supplier.supplierCode}`}
        actions={
          <div className="flex items-center gap-2">
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
              onClick={() => refetch()}
              isLoading={isFetching}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenEdit}
              leftIcon={<Edit2 className="w-4 h-4" />}
            >
              Edit Details
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
            <div className="mt-1">
              <Badge variant={supplier.isActive ? 'success' : 'neutral'}>
                {supplier.isActive ? 'Active Supplier' : 'Deactivated'}
              </Badge>
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

        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-400">
          <span>Record version: v{supplier.version}</span>
          <span>
            Created: <DateDisplay date={supplier.createdAt} /> &bull; Updated:{' '}
            <DateDisplay date={supplier.updatedAt} />
          </span>
        </div>
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
    </div>
  );
};

export default SupplierDetailPage;
