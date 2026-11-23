import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, RefreshCw, Power } from 'lucide-react';
import { subcategoryApi, categoryApi } from '../../api/catalog.api';
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
import { SubcategoryDto } from '../../types/catalog.types';
import { ApiError } from '../../types/api.types';

export const SubcategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<SubcategoryDto | null>(null);
  const [toggleStatusTarget, setToggleStatusTarget] = useState<SubcategoryDto | null>(null);

  // Form state
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);

  // Load parent categories for filtering & create dropdowns
  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.categories.list({ size: 100 }),
    queryFn: ({ signal }) => categoryApi.getCategories({ size: 100 }, signal),
  });

  const categories = categoriesData?.data || [];

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.subcategories.list({
      page,
      search,
      categoryId: selectedCategoryFilter || undefined,
      isActive: activeFilter,
    }),
    queryFn: ({ signal }) =>
      subcategoryApi.getSubcategories(
        {
          page,
          size: 15,
          search: search || undefined,
          categoryId: selectedCategoryFilter || undefined,
          isActive: activeFilter,
        },
        signal
      ),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { categoryId: string | number; name: string }) =>
      subcategoryApi.createSubcategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subcategories.all });
      success('Subcategory created successfully');
      setIsCreateModalOpen(false);
      resetCreateForm();
    },
    onError: (err: ApiError) => {
      setCreateError(err.message || 'Failed to create subcategory');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { name?: string; isActive?: boolean; expectedVersion: number };
    }) => subcategoryApi.updateSubcategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subcategories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      success('Subcategory updated successfully');
      setEditingSubcategory(null);
      setToggleStatusTarget(null);
    },
    onError: (err: ApiError) => {
      if (editingSubcategory) {
        setEditError(err.message || 'Failed to update subcategory');
      } else {
        toastError(err.message || 'Failed to update subcategory status');
        setToggleStatusTarget(null);
      }
    },
  });

  const resetCreateForm = () => {
    setNewCategoryId('');
    setNewName('');
    setCreateError(null);
  };

  const handleOpenEdit = (subcat: SubcategoryDto) => {
    setEditingSubcategory(subcat);
    setEditName(subcat.name);
    setEditIsActive(subcat.isActive);
    setEditError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newCategoryId) {
      setCreateError('Please select a parent category.');
      return;
    }
    if (!newName.trim()) {
      setCreateError('Subcategory name is required.');
      return;
    }
    createMutation.mutate({
      categoryId: newCategoryId,
      name: newName.trim(),
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubcategory) return;
    setEditError(null);
    if (!editName.trim()) {
      setEditError('Subcategory name is required.');
      return;
    }
    updateMutation.mutate({
      id: editingSubcategory.id,
      payload: {
        name: editName.trim(),
        isActive: editIsActive,
        expectedVersion: editingSubcategory.version,
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
        title="Product Subcategories"
        subtitle="Manage product subcategory groupings under parent categories."
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
              Create Subcategory
            </Button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-56">
            <Select
              options={[
                { label: 'All Parent Categories', value: '' },
                ...categories.map((c) => ({
                  label: `${c.name}${!c.isActive ? ' (Inactive)' : ''}`,
                  value: c.id,
                })),
              ]}
              value={selectedCategoryFilter}
              onChange={(e) => {
                setSelectedCategoryFilter(e.target.value);
                setPage(0);
              }}
              className="py-1.5 text-xs"
            />
          </div>

          <div className="w-64">
            <Input
              placeholder="Search subcategories..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="py-1.5 text-xs"
            />
          </div>

          <div className="w-36">
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
          title="Failed to load subcategories"
          onRetry={() => refetch()}
        />
      )}

      {/* Subcategories Table */}
      <div className="space-y-4">
        <Table ariaLabel="Product subcategories table">
          <TableHeader>
            <TableRow>
              <TableHead align="left">ID</TableHead>
              <TableHead align="left">Subcategory Name</TableHead>
              <TableHead align="left">Parent Category</TableHead>
              <TableHead align="center">Status</TableHead>
              <TableHead align="center">Version</TableHead>
              <TableHead align="left">Created Date</TableHead>
              <TableHead align="right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton columns={7} rows={5} />
            ) : data?.data && data.data.length > 0 ? (
              data.data.map((subcat) => (
                <TableRow key={subcat.id}>
                  <TableCell align="left" className="font-mono text-xs text-slate-500">
                    #{subcat.id}
                  </TableCell>
                  <TableCell align="left">
                    <span className="font-semibold text-slate-900">{subcat.name}</span>
                  </TableCell>
                  <TableCell align="left">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {subcat.categoryName}
                    </span>
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant={subcat.isActive ? 'success' : 'danger'} size="sm">
                      {subcat.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell align="center" className="font-mono text-xs text-slate-500">
                    v{subcat.version}
                  </TableCell>
                  <TableCell align="left" className="text-xs text-slate-500">
                    <DateDisplay date={subcat.createdAt} type="timestamp" />
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(subcat)}
                        leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setToggleStatusTarget(subcat)}
                        leftIcon={<Power className="w-3.5 h-3.5" />}
                        className={subcat.isActive ? 'text-amber-700 hover:text-amber-900' : 'text-teal-700 hover:text-teal-900'}
                      >
                        {subcat.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center p-8">
                  <EmptyState
                    title="No subcategories found"
                    description="No subcategories match your current category, search, or status filters."
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

      {/* Create Subcategory Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetCreateForm();
        }}
        title="Create New Subcategory"
        description="Select a parent category and provide subcategory name."
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4" noValidate>
          {createError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {createError}
            </div>
          )}

          <Select
            label="Parent Category"
            required
            options={[
              { label: '-- Select Category --', value: '' },
              ...categories
                .filter((c) => c.isActive)
                .map((c) => ({
                  label: c.name,
                  value: c.id,
                })),
            ]}
            value={newCategoryId}
            onChange={(e) => setNewCategoryId(e.target.value)}
            disabled={createMutation.isPending}
          />

          <Input
            label="Subcategory Name"
            required
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. SWR Pipes, Agricultural Pipes, Enamel Paints"
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
              Create Subcategory
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Subcategory Modal */}
      <Modal
        isOpen={!!editingSubcategory}
        onClose={() => setEditingSubcategory(null)}
        title={`Edit Subcategory: ${editingSubcategory?.name}`}
        description="Update subcategory name and active availability."
        size="md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4" noValidate>
          {editError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {editError}
            </div>
          )}

          <div>
            <span className="text-xs text-slate-500 block mb-1">Parent Category</span>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium">
              {editingSubcategory?.categoryName}
            </div>
          </div>

          <Input
            label="Subcategory Name"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={updateMutation.isPending}
          />

          <div className="pt-2">
            <Checkbox
              label="Subcategory is Active"
              description="Inactive subcategories cannot be assigned to new products."
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Version {editingSubcategory?.version}
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setEditingSubcategory(null)}
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
        title={toggleStatusTarget?.isActive ? 'Deactivate Subcategory' : 'Activate Subcategory'}
        message={
          toggleStatusTarget?.isActive
            ? `Are you sure you want to deactivate "${toggleStatusTarget?.name}"? Inactive subcategories cannot be selected for new products. Existing products remain intact.`
            : `Activate "${toggleStatusTarget?.name}" so it can be assigned to new products?`
        }
        confirmLabel={toggleStatusTarget?.isActive ? 'Deactivate' : 'Activate'}
        isDestructive={toggleStatusTarget?.isActive}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
};

export default SubcategoriesPage;
