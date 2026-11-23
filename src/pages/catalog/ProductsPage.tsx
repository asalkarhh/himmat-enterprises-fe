import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, RefreshCw, Power, Layers, FilterX } from 'lucide-react';
import { productApi, brandApi, categoryApi, subcategoryApi } from '../../api/catalog.api';
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
import { ProductDto, CreateProductRequest, UpdateProductRequest } from '../../types/catalog.types';
import { ApiError } from '../../types/api.types';

export const ProductsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);
  const [toggleStatusTarget, setToggleStatusTarget] = useState<ProductDto | null>(null);

  // Create form state
  const [createBrandId, setCreateBrandId] = useState<string>('');
  const [createCategoryId, setCreateCategoryId] = useState<string>('');
  const [createSubcategoryId, setCreateSubcategoryId] = useState<string>('');
  const [createName, setCreateName] = useState<string>('');
  const [createDescription, setCreateDescription] = useState<string>('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit form state
  const [editBrandId, setEditBrandId] = useState<string>('');
  const [editCategoryId, setEditCategoryId] = useState<string>('');
  const [editSubcategoryId, setEditSubcategoryId] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editError, setEditError] = useState<string | null>(null);

  // Fetch reference lists for filters and forms
  const { data: brandsData } = useQuery({
    queryKey: queryKeys.brands.list({ size: 100 }),
    queryFn: ({ signal }) => brandApi.getBrands({ size: 100 }, signal),
  });

  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.categories.list({ size: 100 }),
    queryFn: ({ signal }) => categoryApi.getCategories({ size: 100 }, signal),
  });

  // Filter toolbar subcategories
  const { data: filterSubcategoriesData } = useQuery({
    queryKey: queryKeys.subcategories.list({ categoryId: selectedCategoryId || undefined, size: 100 }),
    queryFn: ({ signal }) =>
      subcategoryApi.getSubcategories({ categoryId: selectedCategoryId || undefined, size: 100 }, signal),
    enabled: true,
  });

  // Create form subcategories
  const { data: createSubcategoriesData } = useQuery({
    queryKey: queryKeys.subcategories.list({ categoryId: createCategoryId || undefined, size: 100 }),
    queryFn: ({ signal }) =>
      subcategoryApi.getSubcategories({ categoryId: createCategoryId || undefined, size: 100 }, signal),
    enabled: !!createCategoryId,
  });

  // Edit form subcategories
  const { data: editSubcategoriesData } = useQuery({
    queryKey: queryKeys.subcategories.list({ categoryId: editCategoryId || undefined, size: 100 }),
    queryFn: ({ signal }) =>
      subcategoryApi.getSubcategories({ categoryId: editCategoryId || undefined, size: 100 }, signal),
    enabled: !!editCategoryId,
  });

  // Fetch paginated products
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.products.list({
      page,
      search,
      brandId: selectedBrandId || undefined,
      categoryId: selectedCategoryId || undefined,
      subcategoryId: selectedSubcategoryId || undefined,
      isActive: activeFilter,
    }),
    queryFn: ({ signal }) =>
      productApi.getProducts(
        {
          page,
          size: 15,
          search: search || undefined,
          brandId: selectedBrandId || undefined,
          categoryId: selectedCategoryId || undefined,
          subcategoryId: selectedSubcategoryId || undefined,
          isActive: activeFilter,
        },
        signal
      ),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateProductRequest) => productApi.createProduct(payload),
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      success(`Product "${newProduct.name}" created successfully`);
      setIsCreateModalOpen(false);
      resetCreateForm();
    },
    onError: (err: ApiError) => {
      setCreateError(err.message || 'Failed to create product. Check fields and try again.');
    },
  });

  // Edit mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductRequest }) =>
      productApi.updateProduct(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      success(`Product "${updated.name}" updated successfully`);
      setEditingProduct(null);
      resetEditForm();
    },
    onError: (err: ApiError) => {
      if (err.status === 409) {
        setEditError('Conflict: This product was modified by another user. Please refresh and retry.');
      } else {
        setEditError(err.message || 'Failed to update product');
      }
    },
  });

  // Status toggle mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, expectedVersion, isActive }: { id: string; expectedVersion: number; isActive: boolean }) =>
      productApi.updateProduct(id, { expectedVersion, isActive }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      success(`Product "${updated.name}" is now ${updated.isActive ? 'active' : 'inactive'}`);
      setToggleStatusTarget(null);
    },
    onError: (err: ApiError) => {
      if (err.status === 409) {
        toastError('Conflict: Record was modified by another user. Please refresh and retry.');
      } else {
        toastError(err.message || 'Failed to change product status');
      }
      setToggleStatusTarget(null);
    },
  });

  const resetCreateForm = () => {
    setCreateBrandId('');
    setCreateCategoryId('');
    setCreateSubcategoryId('');
    setCreateName('');
    setCreateDescription('');
    setCreateError(null);
  };

  const resetEditForm = () => {
    setEditBrandId('');
    setEditCategoryId('');
    setEditSubcategoryId('');
    setEditName('');
    setEditDescription('');
    setEditIsActive(true);
    setEditError(null);
  };

  const handleOpenEdit = (product: ProductDto) => {
    setEditingProduct(product);
    setEditBrandId(product.brandId);
    setEditCategoryId(product.categoryId);
    setEditSubcategoryId(product.subcategoryId);
    setEditName(product.name);
    setEditDescription(product.description || '');
    setEditIsActive(product.isActive);
    setEditError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createBrandId) {
      setCreateError('Please select a brand');
      return;
    }
    if (!createCategoryId) {
      setCreateError('Please select a category');
      return;
    }
    if (!createSubcategoryId) {
      setCreateError('Please select a subcategory');
      return;
    }
    if (!createName.trim()) {
      setCreateError('Product name is required');
      return;
    }

    setCreateError(null);
    createMutation.mutate({
      brandId: createBrandId,
      subcategoryId: createSubcategoryId,
      name: createName.trim(),
      description: createDescription.trim() || undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (!editBrandId) {
      setEditError('Please select a brand');
      return;
    }
    if (!editCategoryId) {
      setEditError('Please select a category');
      return;
    }
    if (!editSubcategoryId) {
      setEditError('Please select a subcategory');
      return;
    }
    if (!editName.trim()) {
      setEditError('Product name is required');
      return;
    }

    setEditError(null);
    updateMutation.mutate({
      id: editingProduct.id,
      payload: {
        expectedVersion: editingProduct.version,
        brandId: editBrandId,
        subcategoryId: editSubcategoryId,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        isActive: editIsActive,
      },
    });
  };

  const clearAllFilters = () => {
    setSearch('');
    setSelectedBrandId('');
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
    setActiveFilter(undefined);
    setPage(0);
  };

  const hasActiveFilters = !!(
    search ||
    selectedBrandId ||
    selectedCategoryId ||
    selectedSubcategoryId ||
    activeFilter !== undefined
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        subtitle="Manage master product catalog, brands, categories, and variant items"
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
              Add Product
            </Button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />

          <Select
            value={selectedBrandId}
            onChange={(e) => {
              setSelectedBrandId(e.target.value);
              setPage(0);
            }}
            options={[
              { value: '', label: 'All Brands' },
              ...(brandsData?.data.map((b) => ({ value: b.id, label: b.name })) || []),
            ]}
          />

          <Select
            value={selectedCategoryId}
            onChange={(e) => {
              setSelectedCategoryId(e.target.value);
              setSelectedSubcategoryId(''); // Reset subcategory when category changes
              setPage(0);
            }}
            options={[
              { value: '', label: 'All Categories' },
              ...(categoriesData?.data.map((c) => ({ value: c.id, label: c.name })) || []),
            ]}
          />

          <Select
            value={selectedSubcategoryId}
            onChange={(e) => {
              setSelectedSubcategoryId(e.target.value);
              setPage(0);
            }}
            options={[
              { value: '', label: selectedCategoryId ? 'All Subcategories' : 'Select Category First' },
              ...(filterSubcategoriesData?.data.map((s) => ({ value: s.id, label: s.name })) || []),
            ]}
            disabled={!selectedCategoryId}
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
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Filtering active results</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              leftIcon={<FilterX className="w-3.5 h-3.5" />}
              className="text-slate-600 hover:text-slate-900"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Main Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton columns={5} rows={8} />
          </div>
        ) : isError ? (
          <div className="p-6">
            <ErrorMessage
              error={error}
              title="Failed to load products"
              onRetry={() => refetch()}
            />
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Layers className="w-12 h-12 text-slate-300" />}
              title="No products found"
              description={
                hasActiveFilters
                  ? 'No products match the selected filters. Try clearing some criteria.'
                  : 'Start building the catalog by creating your first product.'
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
                    Add Product
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table ariaLabel="Products list">
                <TableHeader>
                  <TableRow>
                    <TableHead align="left">Product Name</TableHead>
                    <TableHead align="left">Brand</TableHead>
                    <TableHead align="left">Category / Subcategory</TableHead>
                    <TableHead align="center">Status</TableHead>
                    <TableHead align="right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell align="left" className="font-medium text-slate-900">
                        <div>
                          <Link
                            to={`/catalog/products/${product.id}`}
                            className="text-teal-700 hover:text-teal-800 font-semibold hover:underline"
                          >
                            {product.name}
                          </Link>
                          {product.description && (
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{product.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell align="left">
                        <span className="font-medium text-slate-800">{product.brandName}</span>
                      </TableCell>
                      <TableCell align="left">
                        <div className="text-xs">
                          <span className="font-medium text-slate-700">{product.categoryName}</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-slate-600">{product.subcategoryName}</span>
                        </div>
                      </TableCell>
                      <TableCell align="center">
                        <Badge variant={product.isActive ? 'success' : 'neutral'}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/catalog/products/${product.id}`)}
                            leftIcon={<Layers className="w-3.5 h-3.5" />}
                          >
                            Variants
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(product)}
                            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                            aria-label={`Edit ${product.name}`}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setToggleStatusTarget(product)}
                            leftIcon={<Power className="w-3.5 h-3.5" />}
                            className={product.isActive ? 'text-amber-600 hover:text-amber-700' : 'text-teal-600 hover:text-teal-700'}
                            aria-label={product.isActive ? `Deactivate ${product.name}` : `Activate ${product.name}`}
                          >
                            {product.isActive ? 'Deactivate' : 'Activate'}
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

      {/* Create Product Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (!createMutation.isPending) {
            setIsCreateModalOpen(false);
          }
        }}
        title="Add Master Product"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && <ErrorMessage error={createError} />}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Brand <span className="text-red-500">*</span>
            </label>
            <Select
              value={createBrandId}
              onChange={(e) => setCreateBrandId(e.target.value)}
              options={[
                { value: '', label: 'Select a brand...' },
                ...(brandsData?.data.filter((b) => b.isActive).map((b) => ({ value: b.id, label: b.name })) || []),
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <Select
                value={createCategoryId}
                onChange={(e) => {
                  setCreateCategoryId(e.target.value);
                  setCreateSubcategoryId(''); // Reset subcategory when category changes
                }}
                options={[
                  { value: '', label: 'Select category...' },
                  ...(categoriesData?.data
                    .filter((c) => c.isActive)
                    .map((c) => ({ value: c.id, label: c.name })) || []),
                ]}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Subcategory <span className="text-red-500">*</span>
              </label>
              <Select
                value={createSubcategoryId}
                onChange={(e) => setCreateSubcategoryId(e.target.value)}
                options={[
                  { value: '', label: createCategoryId ? 'Select subcategory...' : 'Choose category first' },
                  ...(createSubcategoriesData?.data
                    .filter((s) => s.isActive)
                    .map((s) => ({ value: s.id, label: s.name })) || []),
                ]}
                disabled={!createCategoryId}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. PVC Agricultural Pipe"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <Textarea
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Technical specifications, grade, manufacturer remarks..."
              rows={3}
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
              Create Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={!!editingProduct}
        onClose={() => {
          if (!updateMutation.isPending) {
            setEditingProduct(null);
          }
        }}
        title={`Edit Product: ${editingProduct?.name || ''}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && <ErrorMessage error={editError} />}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Brand <span className="text-red-500">*</span>
            </label>
            <Select
              value={editBrandId}
              onChange={(e) => setEditBrandId(e.target.value)}
              options={[
                { value: '', label: 'Select brand...' },
                ...(brandsData?.data.map((b) => ({
                  value: b.id,
                  label: `${b.name}${!b.isActive ? ' (Inactive)' : ''}`,
                })) || []),
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <Select
                value={editCategoryId}
                onChange={(e) => {
                  setEditCategoryId(e.target.value);
                  setEditSubcategoryId(''); // Reset subcategory when category changes
                }}
                options={[
                  { value: '', label: 'Select category...' },
                  ...(categoriesData?.data.map((c) => ({
                    value: c.id,
                    label: `${c.name}${!c.isActive ? ' (Inactive)' : ''}`,
                  })) || []),
                ]}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Subcategory <span className="text-red-500">*</span>
              </label>
              <Select
                value={editSubcategoryId}
                onChange={(e) => setEditSubcategoryId(e.target.value)}
                options={[
                  { value: '', label: editCategoryId ? 'Select subcategory...' : 'Choose category first' },
                  ...(editSubcategoriesData?.data.map((s) => ({
                    value: s.id,
                    label: `${s.name}${!s.isActive ? ' (Inactive)' : ''}`,
                  })) || []),
                ]}
                disabled={!editCategoryId}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="pt-2">
            <Checkbox
              id="edit-is-active"
              label="Active product (available for variant management and sales)"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingProduct(null)}
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
        title={toggleStatusTarget?.isActive ? 'Deactivate Product' : 'Activate Product'}
        message={
          toggleStatusTarget?.isActive
            ? `Are you sure you want to deactivate "${toggleStatusTarget?.name}"? Its variants will not be selectable in new invoices or purchase orders.`
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

export default ProductsPage;
