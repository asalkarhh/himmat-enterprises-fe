import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, RefreshCw, Power, Info } from 'lucide-react';
import { categoryApi } from '../../api/catalog.api';
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
import { CategoryDto } from '../../types/catalog.types';
import { ApiError } from '../../types/api.types';

export const CategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);
  const [toggleStatusTarget, setToggleStatusTarget] = useState<CategoryDto | null>(null);

  // Form state
  const [newName, setNewName] = useState('');
  const [newPurchaseDiscount, setNewPurchaseDiscount] = useState('0.00');
  const [newSalesDiscount, setNewSalesDiscount] = useState('0.00');
  const [createError, setCreateError] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [editPurchaseDiscount, setEditPurchaseDiscount] = useState('0.00');
  const [editSalesDiscount, setEditSalesDiscount] = useState('0.00');
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
    queryKey: queryKeys.categories.list({ page, search, isActive: activeFilter }),
    queryFn: ({ signal }) =>
      categoryApi.getCategories(
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
    mutationFn: (payload: { name: string; purchaseDiscountPct?: string; salesDiscountPct?: string }) =>
      categoryApi.createCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      success('Category created successfully');
      setIsCreateModalOpen(false);
      resetCreateForm();
    },
    onError: (err: ApiError) => {
      setCreateError(err.message || 'Failed to create category');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { name?: string; purchaseDiscountPct?: string; salesDiscountPct?: string; isActive?: boolean; expectedVersion: number };
    }) => categoryApi.updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.variants.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing.all });
      success('Category updated successfully');
      setEditingCategory(null);
      setToggleStatusTarget(null);
    },
    onError: (err: ApiError) => {
      if (editingCategory) {
        setEditError(err.message || 'Failed to update category');
      } else {
        toastError(err.message || 'Failed to update category status');
        setToggleStatusTarget(null);
      }
    },
  });

  const resetCreateForm = () => {
    setNewName('');
    setNewPurchaseDiscount('0.00');
    setNewSalesDiscount('0.00');
    setCreateError(null);
  };

  const handleOpenEdit = (category: CategoryDto) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditPurchaseDiscount(category.purchaseDiscountPct || '0.00');
    setEditSalesDiscount(category.salesDiscountPct || '0.00');
    setEditIsActive(category.isActive);
    setEditError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newName.trim()) {
      setCreateError('Category name is required.');
      return;
    }

    const pDisc = parseFloat(newPurchaseDiscount);
    const sDisc = parseFloat(newSalesDiscount);
    if (isNaN(pDisc) || pDisc < 0 || pDisc > 100) {
      setCreateError('Purchase discount must be between 0% and 100%.');
      return;
    }
    if (isNaN(sDisc) || sDisc < 0 || sDisc > 100) {
      setCreateError('Sales discount must be between 0% and 100%.');
      return;
    }

    createMutation.mutate({
      name: newName.trim(),
      purchaseDiscountPct: newPurchaseDiscount,
      salesDiscountPct: newSalesDiscount,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setEditError(null);
    if (!editName.trim()) {
      setEditError('Category name is required.');
      return;
    }

    const pDisc = parseFloat(editPurchaseDiscount);
    const sDisc = parseFloat(editSalesDiscount);
    if (isNaN(pDisc) || pDisc < 0 || pDisc > 100) {
      setEditError('Purchase discount must be between 0% and 100%.');
      return;
    }
    if (isNaN(sDisc) || sDisc < 0 || sDisc > 100) {
      setEditError('Sales discount must be between 0% and 100%.');
      return;
    }

    updateMutation.mutate({
      id: editingCategory.id,
      payload: {
        name: editName.trim(),
        purchaseDiscountPct: editPurchaseDiscount,
        salesDiscountPct: editSalesDiscount,
        isActive: editIsActive,
        expectedVersion: editingCategory.version,
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
        title="Product Categories"
        subtitle="Manage product departments and default category pricing discount policies."
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
              Create Category
            </Button>
          </div>
        }
      />

      {/* Business Policy Callout */}
      <div className="p-4 bg-teal-50/70 border border-teal-200/80 rounded-xl text-xs text-teal-950 flex items-start gap-3">
        <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Category Pricing Policy:</strong> Default purchase and sales discounts apply to <em>future</em> supplier purchases and MRP sales bills. Updating category discounts does not rewrite or alter historical posted invoices.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-64">
            <Input
              placeholder="Search categories..."
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
          title="Failed to load categories"
          onRetry={() => refetch()}
        />
      )}

      {/* Categories Table */}
      <div className="space-y-4">
        <Table ariaLabel="Product categories table">
          <TableHeader>
            <TableRow>
              <TableHead align="left">ID</TableHead>
              <TableHead align="left">Category Name</TableHead>
              <TableHead align="right">Purchase Discount %</TableHead>
              <TableHead align="right">Sales Discount %</TableHead>
              <TableHead align="center">Status</TableHead>
              <TableHead align="center">Version</TableHead>
              <TableHead align="left">Created Date</TableHead>
              <TableHead align="right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton columns={8} rows={5} />
            ) : data?.data && data.data.length > 0 ? (
              data.data.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell align="left" className="font-mono text-xs text-slate-500">
                    #{cat.id}
                  </TableCell>
                  <TableCell align="left">
                    <span className="font-semibold text-slate-900">{cat.name}</span>
                  </TableCell>
                  <TableCell align="right" className="font-mono text-sm text-slate-800">
                    {parseFloat(cat.purchaseDiscountPct || '0').toFixed(2)}%
                  </TableCell>
                  <TableCell align="right" className="font-mono text-sm text-slate-800">
                    {parseFloat(cat.salesDiscountPct || '0').toFixed(2)}%
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant={cat.isActive ? 'success' : 'danger'} size="sm">
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell align="center" className="font-mono text-xs text-slate-500">
                    v{cat.version}
                  </TableCell>
                  <TableCell align="left" className="text-xs text-slate-500">
                    <DateDisplay date={cat.createdAt} type="timestamp" />
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(cat)}
                        leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setToggleStatusTarget(cat)}
                        leftIcon={<Power className="w-3.5 h-3.5" />}
                        className={cat.isActive ? 'text-amber-700 hover:text-amber-900' : 'text-teal-700 hover:text-teal-900'}
                      >
                        {cat.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center p-8">
                  <EmptyState
                    title="No categories found"
                    description="No categories match your current search or status filter."
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

      {/* Create Category Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetCreateForm();
        }}
        title="Create New Category"
        description="Configure department name and default trade discount percentages."
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4" noValidate>
          {createError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {createError}
            </div>
          )}

          <Input
            label="Category Name"
            required
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. PVC Pipes & Fittings, Electrical, Paints"
            disabled={createMutation.isPending}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Purchase Discount %"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={newPurchaseDiscount}
              onChange={(e) => setNewPurchaseDiscount(e.target.value)}
              helperText="Vendor discount off MRP (0–100%)"
              disabled={createMutation.isPending}
            />

            <Input
              label="Sales Discount %"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={newSalesDiscount}
              onChange={(e) => setNewSalesDiscount(e.target.value)}
              helperText="Customer discount off MRP (0–100%)"
              disabled={createMutation.isPending}
            />
          </div>

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
              Create Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        title={`Edit Category: ${editingCategory?.name}`}
        description="Update category name, discount policies, and status."
        size="md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4" noValidate>
          {editError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {editError}
            </div>
          )}

          <Input
            label="Category Name"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={updateMutation.isPending}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Purchase Discount %"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={editPurchaseDiscount}
              onChange={(e) => setEditPurchaseDiscount(e.target.value)}
              helperText="Vendor discount off MRP"
              disabled={updateMutation.isPending}
            />

            <Input
              label="Sales Discount %"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={editSalesDiscount}
              onChange={(e) => setEditSalesDiscount(e.target.value)}
              helperText="Customer discount off MRP"
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="pt-2">
            <Checkbox
              label="Category is Active"
              description="Inactive categories cannot be assigned to new subcategories."
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Version {editingCategory?.version}
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setEditingCategory(null)}
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
        title={toggleStatusTarget?.isActive ? 'Deactivate Category' : 'Activate Category'}
        message={
          toggleStatusTarget?.isActive
            ? `Are you sure you want to deactivate "${toggleStatusTarget?.name}"? Inactive categories cannot be assigned to new subcategories. Existing products and historical records remain intact.`
            : `Activate "${toggleStatusTarget?.name}" so it can be assigned to new subcategories?`
        }
        confirmLabel={toggleStatusTarget?.isActive ? 'Deactivate' : 'Activate'}
        isDestructive={toggleStatusTarget?.isActive}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
};

export default CategoriesPage;
