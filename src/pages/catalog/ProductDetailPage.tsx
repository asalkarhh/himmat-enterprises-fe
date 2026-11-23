import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Edit2,
  RefreshCw,
  Power,
  Layers,
  AlertTriangle,
  Tag,
  Calculator,
} from 'lucide-react';
import { productApi, variantApi } from '../../api/catalog.api';
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
import { Checkbox } from '../../components/ui/Checkbox';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import { QuantityDisplay } from '../../components/ui/QuantityDisplay';
import {
  ProductVariantDto,
  CreateProductVariantRequest,
  UpdateProductVariantRequest,
  PricingMethod,
} from '../../types/catalog.types';
import { ApiError } from '../../types/api.types';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariantDto | null>(null);
  const [toggleStatusTarget, setToggleStatusTarget] = useState<ProductVariantDto | null>(null);

  // Create variant form state
  const [createSku, setCreateSku] = useState('');
  const [createSizeLabel, setCreateSizeLabel] = useState('');
  const [createPricingMethod, setCreatePricingMethod] = useState<PricingMethod>('MRP_DISCOUNT');
  const [createMrpInclTax, setCreateMrpInclTax] = useState('');
  const [createFixedPriceInclTax, setCreateFixedPriceInclTax] = useState('');
  const [createPurchaseCostExclTax, setCreatePurchaseCostExclTax] = useState('');
  const [createProfitPct, setCreateProfitPct] = useState('');
  const [createGstRatePct, setCreateGstRatePct] = useState('');
  const [createHsnCode, setCreateHsnCode] = useState('');
  const [createLowStockThreshold, setCreateLowStockThreshold] = useState('5');
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit variant form state
  const [editSku, setEditSku] = useState('');
  const [editSizeLabel, setEditSizeLabel] = useState('');
  const [editPricingMethod, setEditPricingMethod] = useState<PricingMethod>('MRP_DISCOUNT');
  const [editMrpInclTax, setEditMrpInclTax] = useState('');
  const [editFixedPriceInclTax, setEditFixedPriceInclTax] = useState('');
  const [editPurchaseCostExclTax, setEditPurchaseCostExclTax] = useState('');
  const [editProfitPct, setEditProfitPct] = useState('');
  const [editGstRatePct, setEditGstRatePct] = useState('');
  const [editHsnCode, setEditHsnCode] = useState('');
  const [editLowStockThreshold, setEditLowStockThreshold] = useState('5');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editOverrideReason, setEditOverrideReason] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Fetch product info
  const {
    data: product,
    isLoading: isProductLoading,
    isError: isProductError,
    error: productError,
    refetch: refetchProduct,
  } = useQuery({
    queryKey: queryKeys.products.detail(id!),
    queryFn: ({ signal }) => productApi.getProductById(id!, signal),
    enabled: !!id,
  });

  // Fetch variants for this product
  const {
    data: variantsData,
    isLoading: isVariantsLoading,
    isError: isVariantsError,
    error: variantsError,
    refetch: refetchVariants,
    isFetching: isVariantsFetching,
  } = useQuery({
    queryKey: queryKeys.variants.list({ productId: id, size: 100 }),
    queryFn: ({ signal }) => variantApi.getVariants({ productId: id, size: 100 }, signal),
    enabled: !!id,
  });

  // Create variant mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateProductVariantRequest) => variantApi.createVariant(payload),
    onSuccess: (newVariant) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.variants.all });
      success(`Variant "${newVariant.sku}" created successfully`);
      setIsCreateModalOpen(false);
      resetCreateForm();
    },
    onError: (err: ApiError) => {
      setCreateError(err.message || 'Failed to create variant. Check fields and try again.');
    },
  });

  // Edit variant mutation
  const updateMutation = useMutation({
    mutationFn: ({ variantId, payload }: { variantId: string; payload: UpdateProductVariantRequest }) =>
      variantApi.updateVariant(variantId, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.variants.all });
      success(`Variant "${updated.sku}" updated successfully`);
      setEditingVariant(null);
      resetEditForm();
    },
    onError: (err: ApiError) => {
      if (err.status === 409) {
        setEditError('Conflict: This variant was modified by another user. Please refresh and retry.');
      } else {
        setEditError(err.message || 'Failed to update variant');
      }
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ variantId, expectedVersion, isActive }: { variantId: string; expectedVersion: number; isActive: boolean }) =>
      variantApi.updateVariant(variantId, { expectedVersion, isActive }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.variants.all });
      success(`Variant "${updated.sku}" is now ${updated.isActive ? 'active' : 'inactive'}`);
      setToggleStatusTarget(null);
    },
    onError: (err: ApiError) => {
      if (err.status === 409) {
        toastError('Conflict: Record was modified by another user. Please refresh and retry.');
      } else {
        toastError(err.message || 'Failed to update variant status');
      }
      setToggleStatusTarget(null);
    },
  });

  const resetCreateForm = () => {
    setCreateSku('');
    setCreateSizeLabel('');
    setCreatePricingMethod('MRP_DISCOUNT');
    setCreateMrpInclTax('');
    setCreateFixedPriceInclTax('');
    setCreatePurchaseCostExclTax('');
    setCreateProfitPct('');
    setCreateGstRatePct('');
    setCreateHsnCode('');
    setCreateLowStockThreshold('5');
    setCreateError(null);
  };

  const resetEditForm = () => {
    setEditSku('');
    setEditSizeLabel('');
    setEditPricingMethod('MRP_DISCOUNT');
    setEditMrpInclTax('');
    setEditFixedPriceInclTax('');
    setEditPurchaseCostExclTax('');
    setEditProfitPct('');
    setEditGstRatePct('');
    setEditHsnCode('');
    setEditLowStockThreshold('5');
    setEditIsActive(true);
    setEditOverrideReason('');
    setEditError(null);
  };

  const handleOpenEdit = (v: ProductVariantDto) => {
    setEditingVariant(v);
    setEditSku(v.sku);
    setEditSizeLabel(v.sizeLabel);
    setEditPricingMethod(v.pricingMethod);
    setEditMrpInclTax(v.mrpInclTax || '');
    setEditFixedPriceInclTax(v.fixedPriceInclTax || '');
    setEditPurchaseCostExclTax(v.purchaseCostExclTax || '');
    setEditProfitPct(v.profitPct || '');
    setEditGstRatePct(v.gstRatePct || '');
    setEditHsnCode(v.hsnCode || '');
    setEditLowStockThreshold(v.lowStockThreshold.toString());
    setEditIsActive(v.isActive);
    setEditOverrideReason('');
    setEditError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!createSku.trim()) {
      setCreateError('SKU identifier is required');
      return;
    }
    if (!createSizeLabel.trim()) {
      setCreateError('Size / Specification label is required');
      return;
    }

    // Method-specific validations
    if (createPricingMethod === 'MRP_DISCOUNT') {
      if (!createMrpInclTax || isNaN(Number(createMrpInclTax)) || Number(createMrpInclTax) < 0) {
        setCreateError('Please enter a valid MRP (₹, Incl. GST)');
        return;
      }
    } else if (createPricingMethod === 'COST_PLUS') {
      if (!createPurchaseCostExclTax || isNaN(Number(createPurchaseCostExclTax)) || Number(createPurchaseCostExclTax) < 0) {
        setCreateError('Purchase Cost (₹, Excl. GST) is required for Cost-Plus pricing');
        return;
      }
      if (!createProfitPct || isNaN(Number(createProfitPct)) || Number(createProfitPct) < 0) {
        setCreateError('Target profit percentage is required for Cost-Plus pricing');
        return;
      }
      if (!createGstRatePct || isNaN(Number(createGstRatePct)) || Number(createGstRatePct) < 0) {
        setCreateError('GST rate percentage is required for Cost-Plus formula calculations');
        return;
      }
    } else if (createPricingMethod === 'FIXED') {
      if (!createFixedPriceInclTax || isNaN(Number(createFixedPriceInclTax)) || Number(createFixedPriceInclTax) < 0) {
        setCreateError('Fixed Selling Price (₹, Incl. GST) is required');
        return;
      }
    }

    const threshold = parseInt(createLowStockThreshold, 10);
    if (isNaN(threshold) || threshold < 0) {
      setCreateError('Low stock threshold must be a whole number 0 or greater');
      return;
    }

    setCreateError(null);
    createMutation.mutate({
      productId: id,
      sku: createSku.trim().toUpperCase(),
      sizeLabel: createSizeLabel.trim(),
      pricingMethod: createPricingMethod,
      mrpInclTax: createPricingMethod === 'MRP_DISCOUNT' ? createMrpInclTax : undefined,
      fixedPriceInclTax: createPricingMethod === 'FIXED' ? createFixedPriceInclTax : undefined,
      purchaseCostExclTax: createPricingMethod === 'COST_PLUS' ? createPurchaseCostExclTax : undefined,
      profitPct: createPricingMethod === 'COST_PLUS' ? createProfitPct : undefined,
      gstRatePct: createGstRatePct.trim() ? createGstRatePct.trim() : undefined,
      hsnCode: createHsnCode.trim() || undefined,
      lowStockThreshold: threshold,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVariant) return;

    if (!editSku.trim()) {
      setEditError('SKU identifier is required');
      return;
    }
    if (!editSizeLabel.trim()) {
      setEditError('Size / Specification label is required');
      return;
    }

    if (editPricingMethod === 'MRP_DISCOUNT') {
      if (!editMrpInclTax || isNaN(Number(editMrpInclTax)) || Number(editMrpInclTax) < 0) {
        setEditError('Please enter a valid MRP (₹, Incl. GST)');
        return;
      }
    } else if (editPricingMethod === 'COST_PLUS') {
      if (!editPurchaseCostExclTax || isNaN(Number(editPurchaseCostExclTax)) || Number(editPurchaseCostExclTax) < 0) {
        setEditError('Purchase Cost (₹, Excl. GST) is required for Cost-Plus pricing');
        return;
      }
      if (!editProfitPct || isNaN(Number(editProfitPct)) || Number(editProfitPct) < 0) {
        setEditError('Target profit percentage is required for Cost-Plus pricing');
        return;
      }
      if (!editGstRatePct || isNaN(Number(editGstRatePct)) || Number(editGstRatePct) < 0) {
        setEditError('GST rate percentage is required for Cost-Plus formula calculations');
        return;
      }
    } else if (editPricingMethod === 'FIXED') {
      if (!editFixedPriceInclTax || isNaN(Number(editFixedPriceInclTax)) || Number(editFixedPriceInclTax) < 0) {
        setEditError('Fixed Selling Price (₹, Incl. GST) is required');
        return;
      }
    }

    const threshold = parseInt(editLowStockThreshold, 10);
    if (isNaN(threshold) || threshold < 0) {
      setEditError('Low stock threshold must be a whole number 0 or greater');
      return;
    }

    setEditError(null);
    updateMutation.mutate({
      variantId: editingVariant.id,
      payload: {
        expectedVersion: editingVariant.version,
        sku: editSku.trim().toUpperCase(),
        sizeLabel: editSizeLabel.trim(),
        pricingMethod: editPricingMethod,
        mrpInclTax: editPricingMethod === 'MRP_DISCOUNT' ? editMrpInclTax : undefined,
        fixedPriceInclTax: editPricingMethod === 'FIXED' ? editFixedPriceInclTax : undefined,
        purchaseCostExclTax: editPricingMethod === 'COST_PLUS' ? editPurchaseCostExclTax : undefined,
        profitPct: editPricingMethod === 'COST_PLUS' ? editProfitPct : undefined,
        gstRatePct: editGstRatePct.trim() ? editGstRatePct.trim() : undefined,
        hsnCode: editHsnCode.trim() || undefined,
        lowStockThreshold: threshold,
        isActive: editIsActive,
        overrideReason: editOverrideReason.trim() || undefined,
      },
    });
  };

  const renderPricingBadge = (method: PricingMethod) => {
    switch (method) {
      case 'MRP_DISCOUNT':
        return <Badge variant="info">MRP Discount</Badge>;
      case 'COST_PLUS':
        return <Badge variant="default">Cost Plus</Badge>;
      case 'FIXED':
        return <Badge variant="warning">Fixed Price</Badge>;
      default:
        return <Badge variant="neutral">{method}</Badge>;
    }
  };

  if (isProductLoading) {
    return (
      <div className="p-8 space-y-4">
        <TableSkeleton columns={4} rows={4} />
      </div>
    );
  }

  if (isProductError || !product) {
    return (
      <div className="p-8">
        <ErrorMessage
          error={productError}
          title="Product not found"
          onRetry={() => navigate('/catalog/products')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        subtitle={`${product.brandName} • ${product.categoryName} / ${product.subcategoryName}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/catalog/products')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              All Products
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchProduct();
                refetchVariants();
              }}
              isLoading={isVariantsFetching}
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
              Add Variant
            </Button>
          </div>
        }
      />

      {/* Product Overview Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Brand</span>
            <span className="text-base font-bold text-slate-800 mt-0.5 block">{product.brandName}</span>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Classification</span>
            <div className="text-sm font-medium text-slate-700 mt-0.5">
              <span>{product.categoryName}</span>
              <span className="text-slate-400 mx-1.5">/</span>
              <span>{product.subcategoryName}</span>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Catalog Status</span>
            <div className="mt-1">
              <Badge variant={product.isActive ? 'success' : 'neutral'}>
                {product.isActive ? 'Active Catalog Item' : 'Deactivated'}
              </Badge>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Record Version</span>
            <span className="text-sm text-slate-600 mt-0.5 block">v{product.version}</span>
          </div>
        </div>

        {product.description && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Description / Specifications
            </span>
            <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
          </div>
        )}
      </div>

      {/* Variants Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-teal-700" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Product Variants & SKUs</h2>
              <p className="text-xs text-slate-500">
                Sizes, packaging specs, pricing configurations, and real-time stock levels
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/catalog/pricing-preview"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
            >
              <Calculator className="w-3.5 h-3.5" />
              Test in Pricing Calculator
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                resetCreateForm();
                setIsCreateModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Variant
            </Button>
          </div>
        </div>

        {isVariantsLoading ? (
          <div className="p-6">
            <TableSkeleton columns={7} rows={4} />
          </div>
        ) : isVariantsError ? (
          <div className="p-6">
            <ErrorMessage
              error={variantsError}
              title="Failed to load product variants"
              onRetry={() => refetchVariants()}
            />
          </div>
        ) : !variantsData || variantsData.data.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Tag className="w-12 h-12 text-slate-300" />}
              title="No variants configured"
              description="This product currently has no sizes or SKUs. Add a variant to specify dimensions, pricing method, and stock tracking."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    resetCreateForm();
                    setIsCreateModalOpen(true);
                  }}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add First Variant
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table ariaLabel="Variants table">
              <TableHeader>
                <TableRow>
                  <TableHead align="left">SKU & Size</TableHead>
                  <TableHead align="left">Pricing Method</TableHead>
                  <TableHead align="right">Price / Cost Structure</TableHead>
                  <TableHead align="left">GST & HSN</TableHead>
                  <TableHead align="right">Stock On Hand</TableHead>
                  <TableHead align="center">Status</TableHead>
                  <TableHead align="right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variantsData.data.map((variant) => {
                  const isLowStock = variant.quantityOnHand <= variant.lowStockThreshold;

                  return (
                    <TableRow key={variant.id}>
                      <TableCell align="left">
                        <div className="font-mono text-xs font-bold text-slate-900">{variant.sku}</div>
                        <div className="text-sm font-medium text-slate-700 mt-0.5">{variant.sizeLabel}</div>
                      </TableCell>

                      <TableCell align="left">
                        <div className="space-y-1">
                          {renderPricingBadge(variant.pricingMethod)}
                        </div>
                      </TableCell>

                      <TableCell align="right">
                        {variant.pricingMethod === 'MRP_DISCOUNT' && (
                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              <MoneyDisplay amount={variant.mrpInclTax || '0'} />
                            </div>
                            <span className="text-[11px] text-teal-700 font-medium">
                              MRP (Incl. GST)
                            </span>
                          </div>
                        )}

                        {variant.pricingMethod === 'COST_PLUS' && (
                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              <MoneyDisplay amount={variant.purchaseCostExclTax || '0'} />
                            </div>
                            <div className="text-[11px] text-slate-500">
                              +{variant.profitPct || '0'}% margin
                            </div>
                          </div>
                        )}

                        {variant.pricingMethod === 'FIXED' && (
                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              <MoneyDisplay amount={variant.fixedPriceInclTax || '0'} />
                            </div>
                            <span className="text-[11px] text-amber-700 font-medium">
                              Fixed (No Discounts)
                            </span>
                          </div>
                        )}
                      </TableCell>

                      <TableCell align="left">
                        <div className="text-xs space-y-0.5">
                          <div>
                            <span className="text-slate-400">GST: </span>
                            <span className="font-medium text-slate-700">
                              {variant.gstRatePct ? `${variant.gstRatePct}%` : 'Unknown'}
                            </span>
                          </div>
                          {variant.hsnCode && (
                            <div>
                              <span className="text-slate-400">HSN: </span>
                              <span className="font-mono text-slate-600">{variant.hsnCode}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell align="right">
                        <div className="inline-flex flex-col items-end">
                          <span className="text-sm font-bold text-slate-900">
                            <QuantityDisplay quantity={variant.quantityOnHand} />
                          </span>
                          {isLowStock ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded mt-0.5 border border-amber-200">
                              <AlertTriangle className="w-3 h-3" />
                              Low (&le; {variant.lowStockThreshold})
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              Min: {variant.lowStockThreshold} pcs
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell align="center">
                        <Badge variant={variant.isActive ? 'success' : 'neutral'}>
                          {variant.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>

                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(variant)}
                            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                            aria-label={`Edit ${variant.sku}`}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setToggleStatusTarget(variant)}
                            leftIcon={<Power className="w-3.5 h-3.5" />}
                            className={variant.isActive ? 'text-amber-600 hover:text-amber-700' : 'text-teal-600 hover:text-teal-700'}
                            aria-label={variant.isActive ? `Deactivate ${variant.sku}` : `Activate ${variant.sku}`}
                          >
                            {variant.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create Variant Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (!createMutation.isPending) {
            setIsCreateModalOpen(false);
          }
        }}
        title={`Add Variant to ${product.name}`}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && <ErrorMessage error={createError} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                SKU Identifier <span className="text-red-500">*</span>
              </label>
              <Input
                value={createSku}
                onChange={(e) => setCreateSku(e.target.value)}
                placeholder="e.g. PVC-PIPE-40MM"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Size / Spec Label <span className="text-red-500">*</span>
              </label>
              <Input
                value={createSizeLabel}
                onChange={(e) => setCreateSizeLabel(e.target.value)}
                placeholder="e.g. 40mm x 3m (Class 3)"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Pricing Method <span className="text-red-500">*</span>
            </label>
            <Select
              value={createPricingMethod}
              onChange={(e) => setCreatePricingMethod(e.target.value as PricingMethod)}
              options={[
                { value: 'MRP_DISCOUNT', label: 'MRP Discount (Branded items with category sales discount)' },
                { value: 'COST_PLUS', label: 'Cost Plus Margin (Base cost + target profit % + GST)' },
                { value: 'FIXED', label: 'Fixed Price (Flat price; strict zero discount policy)' },
              ]}
              required
            />
          </div>

          {/* Conditional Pricing Method Fields */}
          {createPricingMethod === 'MRP_DISCOUNT' && (
            <div className="p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-lg space-y-2">
              <div>
                <label className="block text-xs font-semibold text-teal-900 uppercase tracking-wider mb-1">
                  MRP (₹, Incl. GST) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={createMrpInclTax}
                  onChange={(e) => setCreateMrpInclTax(e.target.value)}
                  placeholder="e.g. 450.00"
                  required
                />
              </div>
              <p className="text-[11px] text-teal-800 leading-snug">
                Category sales discount ({product.categoryName}) applies automatically during billing unless a specific line discount override is provided.
              </p>
            </div>
          )}

          {createPricingMethod === 'COST_PLUS' && (
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 uppercase tracking-wider mb-1">
                    Purchase Cost (₹, Excl. GST) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={createPurchaseCostExclTax}
                    onChange={(e) => setCreatePurchaseCostExclTax(e.target.value)}
                    placeholder="e.g. 280.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-indigo-900 uppercase tracking-wider mb-1">
                    Target Profit Margin % <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={createProfitPct}
                    onChange={(e) => setCreateProfitPct(e.target.value)}
                    placeholder="e.g. 15.00"
                    required
                  />
                </div>
              </div>
              <p className="text-[11px] text-indigo-800 leading-snug">
                Formula: Selling Price = Cost &times; (1 + Margin%) &times; (1 + GST%). Category sales discounts do NOT apply to Cost-Plus variants.
              </p>
            </div>
          )}

          {createPricingMethod === 'FIXED' && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-lg space-y-2">
              <div>
                <label className="block text-xs font-semibold text-amber-900 uppercase tracking-wider mb-1">
                  Fixed Selling Price (₹, Incl. GST) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={createFixedPriceInclTax}
                  onChange={(e) => setCreateFixedPriceInclTax(e.target.value)}
                  placeholder="e.g. 320.00"
                  required
                />
              </div>
              <p className="text-[11px] text-amber-800 leading-snug font-medium">
                Important: Fixed price items strictly prohibit any category discount or line-level discount during billing.
              </p>
            </div>
          )}

          {/* Common GST, HSN & Inventory alert parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                GST Rate % {createPricingMethod === 'COST_PLUS' && <span className="text-red-500">*</span>}
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={createGstRatePct}
                onChange={(e) => setCreateGstRatePct(e.target.value)}
                placeholder="e.g. 18.00"
                required={createPricingMethod === 'COST_PLUS'}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                HSN Code
              </label>
              <Input
                value={createHsnCode}
                onChange={(e) => setCreateHsnCode(e.target.value)}
                placeholder="e.g. 391723"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Low Stock Alert (pcs)
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                value={createLowStockThreshold}
                onChange={(e) => setCreateLowStockThreshold(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            <strong>Stock Notice:</strong> Initial stock balance will be initialized to <strong>0 pcs</strong>. Physical stock counts will be recorded during initial stocktake (FE04).
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
              Create Variant
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Variant Modal */}
      <Modal
        isOpen={!!editingVariant}
        onClose={() => {
          if (!updateMutation.isPending) {
            setEditingVariant(null);
          }
        }}
        title={`Edit Variant: ${editingVariant?.sku || ''}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && <ErrorMessage error={editError} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                SKU Identifier <span className="text-red-500">*</span>
              </label>
              <Input
                value={editSku}
                onChange={(e) => setEditSku(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Size / Spec Label <span className="text-red-500">*</span>
              </label>
              <Input
                value={editSizeLabel}
                onChange={(e) => setEditSizeLabel(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Pricing Method <span className="text-red-500">*</span>
            </label>
            <Select
              value={editPricingMethod}
              onChange={(e) => setEditPricingMethod(e.target.value as PricingMethod)}
              options={[
                { value: 'MRP_DISCOUNT', label: 'MRP Discount (Branded items with category sales discount)' },
                { value: 'COST_PLUS', label: 'Cost Plus Margin (Base cost + target profit % + GST)' },
                { value: 'FIXED', label: 'Fixed Price (Flat price; strict zero discount policy)' },
              ]}
              required
            />
          </div>

          {/* Conditional Pricing Method Fields */}
          {editPricingMethod === 'MRP_DISCOUNT' && (
            <div className="p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-lg space-y-2">
              <div>
                <label className="block text-xs font-semibold text-teal-900 uppercase tracking-wider mb-1">
                  MRP (₹, Incl. GST) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editMrpInclTax}
                  onChange={(e) => setEditMrpInclTax(e.target.value)}
                  required
                />
              </div>
              <p className="text-[11px] text-teal-800 leading-snug">
                Category sales discount ({product.categoryName}) applies automatically during billing unless a specific line discount override is provided.
              </p>
            </div>
          )}

          {editPricingMethod === 'COST_PLUS' && (
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 uppercase tracking-wider mb-1">
                    Purchase Cost (₹, Excl. GST) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPurchaseCostExclTax}
                    onChange={(e) => setEditPurchaseCostExclTax(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-indigo-900 uppercase tracking-wider mb-1">
                    Target Profit Margin % <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editProfitPct}
                    onChange={(e) => setEditProfitPct(e.target.value)}
                    required
                  />
                </div>
              </div>
              <p className="text-[11px] text-indigo-800 leading-snug">
                Formula: Selling Price = Cost &times; (1 + Margin%) &times; (1 + GST%). Category sales discounts do NOT apply to Cost-Plus variants.
              </p>
            </div>
          )}

          {editPricingMethod === 'FIXED' && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-lg space-y-2">
              <div>
                <label className="block text-xs font-semibold text-amber-900 uppercase tracking-wider mb-1">
                  Fixed Selling Price (₹, Incl. GST) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFixedPriceInclTax}
                  onChange={(e) => setEditFixedPriceInclTax(e.target.value)}
                  required
                />
              </div>
              <p className="text-[11px] text-amber-800 leading-snug font-medium">
                Important: Fixed price items strictly prohibit any category discount or line-level discount during billing.
              </p>
            </div>
          )}

          {/* Common GST, HSN & Inventory alert parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                GST Rate % {editPricingMethod === 'COST_PLUS' && <span className="text-red-500">*</span>}
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editGstRatePct}
                onChange={(e) => setEditGstRatePct(e.target.value)}
                required={editPricingMethod === 'COST_PLUS'}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                HSN Code
              </label>
              <Input
                value={editHsnCode}
                onChange={(e) => setEditHsnCode(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Low Stock Alert (pcs)
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                value={editLowStockThreshold}
                onChange={(e) => setEditLowStockThreshold(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Override / Audit Reason <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <Input
              value={editOverrideReason}
              onChange={(e) => setEditOverrideReason(e.target.value)}
              placeholder="e.g. Revised manufacturer list price update"
            />
          </div>

          <div className="pt-2">
            <Checkbox
              id="variant-edit-active"
              label="Active variant (available for pricing, billing, and inventory tracking)"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingVariant(null)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={updateMutation.isPending}
            >
              Save Variant
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Variant Status Toggle */}
      <ConfirmationDialog
        isOpen={!!toggleStatusTarget}
        title={toggleStatusTarget?.isActive ? 'Deactivate Variant' : 'Activate Variant'}
        message={
          toggleStatusTarget?.isActive
            ? `Are you sure you want to deactivate variant "${toggleStatusTarget?.sku}" (${toggleStatusTarget?.sizeLabel})? It will not be selectable in new invoices.`
            : `Are you sure you want to activate variant "${toggleStatusTarget?.sku}" (${toggleStatusTarget?.sizeLabel})?`
        }
        confirmLabel={toggleStatusTarget?.isActive ? 'Deactivate' : 'Activate'}
        isDestructive={toggleStatusTarget?.isActive}
        isLoading={toggleStatusMutation.isPending}
        onConfirm={() => {
          if (toggleStatusTarget) {
            toggleStatusMutation.mutate({
              variantId: toggleStatusTarget.id,
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

export default ProductDetailPage;
