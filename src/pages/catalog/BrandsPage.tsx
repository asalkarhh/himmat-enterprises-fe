import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, RefreshCw, Power } from 'lucide-react';
import { brandApi } from '../../api/catalog.api';
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
import { Checkbox } from '../../components/ui/Checkbox';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { DateDisplay } from '../../components/ui/DateDisplay';
import { EmptyState } from '../../components/ui/EmptyState';
import { BrandDto } from '../../types/catalog.types';
import { ApiError } from '../../types/api.types';

export const BrandsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandDto | null>(null);
  const [toggleStatusTarget, setToggleStatusTarget] = useState<BrandDto | null>(null);

  // Form state
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.brands.list({ page, search, isActive: activeFilter }),
    queryFn: ({ signal }) =>
      brandApi.getBrands(
        {
          page,
          size: 15,
          search: search || undefined,
          isActive: activeFilter,
        },
        signal
      ),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => brandApi.createBrand({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
      success('Brand created successfully');
      setIsCreateModalOpen(false);
      setNewName('');
      setCreateError(null);
    },
    onError: (err: ApiError) => {
      setCreateError(err.message || 'Failed to create brand');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name?: string; isActive?: boolean; expectedVersion: number } }) =>
      brandApi.updateBrand(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      success('Brand updated successfully');
      setEditingBrand(null);
      setToggleStatusTarget(null);
    },
    onError: (err: ApiError) => {
      if (editingBrand) {
        setEditError(err.message || 'Failed to update brand');
      } else {
        toastError(err.message || 'Failed to update brand status');
        setToggleStatusTarget(null);
      }
    },
  });

  const handleOpenEdit = (brand: BrandDto) => {
    setEditingBrand(brand);
    setEditName(brand.name);
    setEditIsActive(brand.isActive);
    setEditError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newName.trim()) {
      setCreateError('Brand name is required.');
      return;
    }
    createMutation.mutate(newName.trim());
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand) return;
    setEditError(null);
    if (!editName.trim()) {
      setEditError('Brand name is required.');
      return;
    }
    updateMutation.mutate({
      id: editingBrand.id,
      payload: {
        name: editName.trim(),
        isActive: editIsActive,
        expectedVersion: editingBrand.version,
      },
    });
  };

  const handleConfirmToggleStatus = () => {
    if (!toggleStatusTarget) return;
    updateMutation.mutate({
      id: toggleStatusTarget.id,
      payload: {
        isActive: !toggleStatusTarget.isActive,
        expectedVersion: toggleStatusTarget.version,
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brands"
        subtitle="Manage product manufacturer and vendor brands."
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
              Create Brand
            </Button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-64">
            <Input
              placeholder="Search brands..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="py-1.5 text-xs"
            />
          </div>

          <div className="w-40">
            <Select
              options={[
                { label: 'All Statuses', value: '' },
                { label: 'Active', value: 'true' },
                { label: 'Inactive', value: 'false' },
              ]}
              value={activeFilter === undefined ? '' : String(activeFilter)}
              onChange={(e) => {
                const val = e.target.value;
                setActiveFilter(val === '' ? undefined : val === 'true');
                setPage(0);
              }}
              className="py-1.5 text-xs"
            />
          </div>
        </div>

        <span className="text-xs text-slate-500">
          Showing page {page + 1} of {Math.max(data?.totalPages || 1, 1)}
        </span>
      </div>

      {isError && (
        <ErrorMessage
          error={error}
          title="Failed to load brands"
          onRetry={() => refetch()}
        />
      )}

      {/* Brands Table */}
      <div className="space-y-4">
        <Table ariaLabel="Brands table">
          <TableHeader>
            <TableRow>
              <TableHead align="left">ID</TableHead>
              <TableHead align="left">Brand Name</TableHead>
              <TableHead align="center">Status</TableHead>
              <TableHead align="center">Version</TableHead>
              <TableHead align="left">Created Date</TableHead>
              <TableHead align="right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton columns={6} rows={5} />
            ) : data?.data && data.data.length > 0 ? (
              data.data.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell align="left" className="font-mono text-xs text-slate-500">
                    #{brand.id}
                  </TableCell>
                  <TableCell align="left">
                    <span className="font-semibold text-slate-900">{brand.name}</span>
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant={brand.isActive ? 'success' : 'danger'} size="sm">
                      {brand.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell align="center" className="font-mono text-xs text-slate-500">
                    v{brand.version}
                  </TableCell>
                  <TableCell align="left" className="text-xs text-slate-500">
                    <DateDisplay date={brand.createdAt} type="timestamp" />
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(brand)}
                        leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setToggleStatusTarget(brand)}
                        leftIcon={<Power className="w-3.5 h-3.5" />}
                        className={brand.isActive ? 'text-amber-700 hover:text-amber-900' : 'text-teal-700 hover:text-teal-900'}
                      >
                        {brand.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center p-8">
                  <EmptyState
                    title="No brands found"
                    description="No brands match your current search or status filter."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {data && data.totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            pageSize={data.size}
            onPageChange={setPage}
            isZeroIndexed={true}
          />
        )}
      </div>

      {/* Create Brand Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setNewName('');
          setCreateError(null);
        }}
        title="Create New Brand"
        description="Enter manufacturer or supplier brand name."
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4" noValidate>
          {createError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {createError}
            </div>
          )}

          <Input
            label="Brand Name"
            required
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Finolex, Asian Paints, Havells"
            disabled={createMutation.isPending}
          />

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
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
              disabled={createMutation.isPending}
            >
              Create Brand
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Brand Modal */}
      <Modal
        isOpen={!!editingBrand}
        onClose={() => setEditingBrand(null)}
        title={`Edit Brand: ${editingBrand?.name}`}
        description="Update brand details and active availability."
        size="md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4" noValidate>
          {editError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {editError}
            </div>
          )}

          <Input
            label="Brand Name"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={updateMutation.isPending}
          />

          <div className="pt-2">
            <Checkbox
              label="Brand is Active"
              description="Inactive brands cannot be selected for new products."
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Version {editingBrand?.version}
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setEditingBrand(null)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={updateMutation.isPending}
                disabled={updateMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal for Activation / Deactivation */}
      <ConfirmationDialog
        isOpen={!!toggleStatusTarget}
        onClose={() => setToggleStatusTarget(null)}
        onConfirm={handleConfirmToggleStatus}
        title={toggleStatusTarget?.isActive ? 'Deactivate Brand' : 'Activate Brand'}
        message={
          toggleStatusTarget?.isActive
            ? `Are you sure you want to deactivate "${toggleStatusTarget?.name}"? Inactive brands cannot be selected on new products. Existing products and bills remain intact.`
            : `Activate "${toggleStatusTarget?.name}" so it can be assigned to new products?`
        }
        confirmLabel={toggleStatusTarget?.isActive ? 'Deactivate' : 'Activate'}
        isDestructive={toggleStatusTarget?.isActive}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
};

export default BrandsPage;
