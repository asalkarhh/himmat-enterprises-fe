import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, AlertTriangle, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Badge } from '../ui/Badge';
import { VariantSelector } from './VariantSelector';
import { inventoryApi } from '../../api/inventory.api';
import { queryKeys } from '../../api/queryKeys';
import { useToast } from '../../hooks/useToast';
import {
  InventoryItemDto,
  ManualAdjustmentResponse,
  StockMovementDirection,
} from '../../types/inventory.types';
import { ProductVariantDto } from '../../types/catalog.types';
import { formatQuantity, formatDateTime } from '../../utils/formatters';
import { generateIdempotencyKey, parseApiError } from '../../api/apiHelpers';
import { ApiError } from '../../types/api.types';

export interface StockAdjustmentLineForm {
  id: string; // Internal unique line key
  variantId: string;
  variant?: ProductVariantDto | InventoryItemDto;
  direction: StockMovementDirection;
  quantityStr: string;
  currentStock: number | null;
  expectedVersion: number | null;
  isLoadingBalance: boolean;
  balanceError: string | null;
}

export interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedItem?: InventoryItemDto | null;
  onSuccess?: (result: ManualAdjustmentResponse) => void;
}

const createEmptyLine = (item?: InventoryItemDto | null): StockAdjustmentLineForm => {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    variantId: item ? String(item.variantId) : '',
    variant: item || undefined,
    direction: 'IN',
    quantityStr: '',
    currentStock: item ? item.quantityOnHand : null,
    expectedVersion: item ? item.version : null,
    isLoadingBalance: false,
    balanceError: null,
  };
};

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  preselectedItem,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { success: toastSuccess } = useToast();

  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<StockAdjustmentLineForm[]>([]);
  const [isReviewStep, setIsReviewStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isStaleConflict, setIsStaleConflict] = useState(false);
  const [isUncertainNetwork, setIsUncertainNetwork] = useState(false);
  const [successResult, setSuccessResult] = useState<ManualAdjustmentResponse | null>(null);

  // Idempotency state
  const idempotencyKeyRef = useRef<string | null>(null);

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setLines([createEmptyLine(preselectedItem)]);
      setIsReviewStep(false);
      setIsSubmitting(false);
      setSubmitError(null);
      setIsStaleConflict(false);
      setIsUncertainNetwork(false);
      setSuccessResult(null);
      idempotencyKeyRef.current = generateIdempotencyKey();
    }
  }, [isOpen, preselectedItem]);

  // Handle variant selection for a line
  const handleVariantChange = async (lineId: string, variantId: string, variant?: ProductVariantDto) => {
    // If variantId is cleared
    if (!variantId) {
      setLines((prev) =>
        prev.map((l) =>
          l.id === lineId
            ? {
                ...l,
                variantId: '',
                variant: undefined,
                currentStock: null,
                expectedVersion: null,
                isLoadingBalance: false,
                balanceError: null,
              }
            : l
        )
      );
      return;
    }

    // Set loading state for balance
    setLines((prev) =>
      prev.map((l) =>
        l.id === lineId
          ? {
              ...l,
              variantId,
              variant,
              isLoadingBalance: true,
              balanceError: null,
            }
          : l
      )
    );

    try {
      const balance = await inventoryApi.getInventoryByVariantId(variantId);
      // Ensure the line is still asking for this variantId (ignore stale responses)
      setLines((prev) =>
        prev.map((l) => {
          if (l.id === lineId && l.variantId === variantId) {
            return {
              ...l,
              variant: balance,
              currentStock: balance.quantityOnHand,
              expectedVersion: balance.version,
              isLoadingBalance: false,
              balanceError: null,
            };
          }
          return l;
        })
      );
    } catch (err) {
      const parsed = parseApiError(err);
      setLines((prev) =>
        prev.map((l) => {
          if (l.id === lineId && l.variantId === variantId) {
            return {
              ...l,
              isLoadingBalance: false,
              balanceError: parsed.message || 'Failed to load stock balance for this variant.',
              currentStock: null,
              expectedVersion: null,
            };
          }
          return l;
        })
      );
    }
  };

  const handleAddLine = () => {
    if (lines.length >= 100) return;
    setLines((prev) => [...prev, createEmptyLine(null)]);
  };

  const handleRemoveLine = (lineId: string) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  const handleDirectionChange = (lineId: string, direction: StockMovementDirection) => {
    setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, direction } : l)));
  };

  const handleQuantityChange = (lineId: string, value: string) => {
    // Only accept whole integers or empty string
    if (value === '' || /^\d+$/.test(value)) {
      setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, quantityStr: value } : l)));
    }
  };

  // Re-fetch latest balances on 409 conflict
  const handleRefreshVersions = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const refreshedLines = await Promise.all(
        lines.map(async (line) => {
          if (!line.variantId) return line;
          try {
            const balance = await inventoryApi.getInventoryByVariantId(line.variantId);
            return {
              ...line,
              currentStock: balance.quantityOnHand,
              expectedVersion: balance.version,
              balanceError: null,
            };
          } catch {
            return line;
          }
        })
      );
      setLines(refreshedLines);
      setIsStaleConflict(false);
      // New logical submission requires a fresh key
      idempotencyKeyRef.current = generateIdempotencyKey();
    } catch {
      setSubmitError('Failed to refresh stock balances. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validation
  const validateForm = (): string | null => {
    if (!reason || reason.trim().length < 3) {
      return 'Adjustment reason is required (minimum 3 characters).';
    }
    if (reason.trim().length > 500) {
      return 'Adjustment reason cannot exceed 500 characters.';
    }
    if (lines.length === 0) {
      return 'At least one adjustment line is required.';
    }
    if (lines.length > 100) {
      return 'A manual adjustment cannot exceed 100 lines.';
    }

    const seenVariantIds = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      if (!line.variantId) {
        return `Line ${lineNum}: Please select a product variant.`;
      }
      if (seenVariantIds.has(line.variantId)) {
        return `Line ${lineNum}: Variant is duplicated. Each variant can only appear once per adjustment.`;
      }
      seenVariantIds.add(line.variantId);

      if (line.isLoadingBalance) {
        return `Line ${lineNum}: Waiting for variant stock balance to load...`;
      }
      if (line.expectedVersion === null || line.currentStock === null) {
        return `Line ${lineNum}: Unable to verify stock balance. Please re-select the variant.`;
      }

      const qty = parseInt(line.quantityStr, 10);
      if (isNaN(qty) || qty <= 0) {
        return `Line ${lineNum}: Quantity must be a positive whole number greater than 0.`;
      }

      // Safe integer check
      if (qty > Number.MAX_SAFE_INTEGER) {
        return `Line ${lineNum}: Quantity exceeds maximum supported limit.`;
      }

      // Negative stock prevention rule: OUT quantity cannot exceed current stock
      if (line.direction === 'OUT' && qty > line.currentStock) {
        const sku = line.variant?.sku || `Variant #${line.variantId}`;
        return `Line ${lineNum} (${sku}): Cannot deduct ${qty} pcs. Available on hand is only ${line.currentStock} pcs. Negative stock is strictly prohibited.`;
      }
    }

    return null;
  };

  // Advance to review step
  const handleProceedToReview = () => {
    const errorMsg = validateForm();
    if (errorMsg) {
      setSubmitError(errorMsg);
      return;
    }
    setSubmitError(null);
    setIsReviewStep(true);
  };

  // Submit adjustment to backend
  const handleSubmit = async () => {
    const errorMsg = validateForm();
    if (errorMsg) {
      setSubmitError(errorMsg);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setIsStaleConflict(false);
    setIsUncertainNetwork(false);

    const payload = {
      reason: reason.trim(),
      lines: lines.map((l) => ({
        variantId: l.variantId,
        direction: l.direction,
        quantity: parseInt(l.quantityStr, 10),
        expectedVersion: l.expectedVersion as number,
      })),
    };

    try {
      const key = idempotencyKeyRef.current || generateIdempotencyKey();
      const response = await inventoryApi.createAdjustment(payload, key);

      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.variants.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      setSuccessResult(response);
      toastSuccess('Stock adjustment applied successfully!');
      onSuccess?.(response);
    } catch (rawErr) {
      const parsed: ApiError = parseApiError(rawErr);

      if (parsed.status === 409 || parsed.code === 'STALE_VERSION') {
        setIsStaleConflict(true);
        setSubmitError(
          'Stale Version Conflict: The stock balance of one or more variants was modified concurrently by another user. Please refresh and review the updated balance before re-submitting.'
        );
      } else if (parsed.code === 'INSUFFICIENT_STOCK') {
        setSubmitError(
          parsed.message ||
            'Insufficient Stock: The requested OUT adjustment exceeds currently available on-hand stock on the server.'
        );
      } else if (parsed.code === 'DUPLICATE_VARIANT_LINE') {
        setSubmitError(
          'Duplicate Variant Line: Each variant can only appear once in a manual adjustment.'
        );
      } else if (parsed.code === 'INACTIVE_VARIANT') {
        setSubmitError(
          'Inactive Variant: Stock adjustments cannot be performed on inactive or discontinued variants.'
        );
      } else if (parsed.code === 'TIMEOUT' || parsed.code === 'NETWORK_ERROR' || parsed.status === 0) {
        setIsUncertainNetwork(true);
        setSubmitError(
          'Network Connection Issue: The request could not be confirmed. The exact payload and idempotency key are preserved. You may safely retry without risk of duplicate stock adjustments.'
        );
      } else {
        setSubmitError(parsed.message || 'Failed to submit manual stock adjustment.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Retry submission using the exact same idempotency key and payload
  const handleRetryUncertain = () => {
    handleSubmit();
  };

  // If successfully committed, show summary view
  if (successResult) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Stock Adjustment Applied" size="lg">
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
            <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">
                Adjustment committed successfully
              </p>
              <p className="text-sm text-emerald-700">
                Event Reference: <span className="font-mono">{successResult.eventKey || successResult.eventId}</span>
                {' • '}
                {formatDateTime(successResult.occurredAt)}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs uppercase font-semibold text-slate-500 mb-1">Business Reason</p>
            <p className="text-slate-800 text-sm font-medium">{successResult.reason}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2">Affected Variants</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Variant / SKU</th>
                    <th className="py-2.5 px-3">Adjustment</th>
                    <th className="py-2.5 px-3 text-right">Previous Stock</th>
                    <th className="py-2.5 px-3 text-right">New Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {successResult.lines.map((l) => (
                    <tr key={l.variantId} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                          {l.sku}
                        </span>
                        <div className="text-slate-600 text-xs mt-0.5">{l.productName}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={l.direction === 'IN' ? 'success' : 'warning'}>
                          {l.direction === 'IN' ? `+${l.quantity} pcs` : `-${l.quantity} pcs`}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {formatQuantity(l.previousQuantityOnHand, 'pcs')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatQuantity(l.newQuantityOnHand, 'pcs')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Pre-calculate selected variant IDs to exclude from other lines
  const selectedVariantIds = lines.map((l) => l.variantId).filter(Boolean);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isReviewStep ? 'Review Manual Stock Adjustment' : 'Manual Stock Adjustment'}
      size="xl"
    >
      <div className="space-y-6">
        {submitError && <ErrorMessage error={submitError} />}

        {isStaleConflict && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm text-amber-900">
                Stock balance was modified by another operation
              </p>
              <p className="text-xs text-amber-700 mt-1">
                To prevent overwriting concurrent stock changes, please refresh the stock data. Your entered reasons and adjustment quantities will be kept.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshVersions}
                isLoading={isSubmitting}
                className="mt-3 bg-white"
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Refresh Stock Versions
              </Button>
            </div>
          </div>
        )}

        {isUncertainNetwork && (
          <div className="flex items-start gap-3 p-4 bg-sky-50 border border-sky-200 rounded-xl text-sky-800">
            <AlertTriangle className="w-5 h-5 shrink-0 text-sky-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm text-sky-900">
                Network connection dropped during submission
              </p>
              <p className="text-xs text-sky-700 mt-1">
                Your adjustment key is locked. You can safely retry submission without creating double adjustments.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRetryUncertain}
                isLoading={isSubmitting}
                className="mt-3"
              >
                Retry Exact Submission
              </Button>
            </div>
          </div>
        )}

        {/* STEP 1: LINE ITEM EDITING FORM */}
        {!isReviewStep ? (
          <div className="space-y-5">
            <Textarea
              label="Business Reason for Adjustment"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Physical stock count reconciliation, damaged packaging disposal, floor verification"
              rows={2}
              required
              helperText="Mandatory explanation (3–500 characters) for immutable audit records."
            />

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-slate-800">
                  Adjustment Lines ({lines.length}/100)
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLine}
                  disabled={lines.length >= 100 || isSubmitting}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Variant Line
                </Button>
              </div>

              <div className="space-y-3">
                {lines.map((line, index) => {
                  const qty = parseInt(line.quantityStr, 10);
                  const isValidQty = !isNaN(qty) && qty > 0;
                  const currentStock = line.currentStock ?? 0;
                  const resultingStock =
                    line.direction === 'IN'
                      ? currentStock + (isValidQty ? qty : 0)
                      : currentStock - (isValidQty ? qty : 0);
                  const isNegativeOut =
                    line.direction === 'OUT' && isValidQty && line.currentStock !== null && qty > line.currentStock;

                  return (
                    <div
                      key={line.id}
                      className={`p-4 border rounded-xl transition-colors ${
                        isNegativeOut
                          ? 'border-red-300 bg-red-50/40'
                          : 'border-slate-200 bg-white shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Line {index + 1}
                        </span>
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(line.id)}
                            disabled={isSubmitting}
                            className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                            title="Remove line"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                        {/* Variant selector */}
                        <div className="md:col-span-6">
                          <VariantSelector
                            label="Product Variant"
                            value={line.variantId}
                            onChange={(id, v) => handleVariantChange(line.id, id, v)}
                            excludeVariantIds={selectedVariantIds}
                            initialVariant={
                              line.variant && 'hsnCode' in line.variant
                                ? (line.variant as ProductVariantDto)
                                : undefined
                            }
                            required
                            disabled={isSubmitting}
                          />
                          {line.isLoadingBalance && (
                            <p className="text-xs text-teal-600 mt-1 flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Verifying stock balance...
                            </p>
                          )}
                          {line.balanceError && (
                            <p className="text-xs text-red-600 mt-1">{line.balanceError}</p>
                          )}
                        </div>

                        {/* Direction Toggle */}
                        <div className="md:col-span-3">
                          <label className="block text-xs font-medium text-slate-700 mb-1.5">
                            Direction
                          </label>
                          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                            <button
                              type="button"
                              onClick={() => handleDirectionChange(line.id, 'IN')}
                              disabled={isSubmitting}
                              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                                line.direction === 'IN'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              + IN (Add)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDirectionChange(line.id, 'OUT')}
                              disabled={isSubmitting}
                              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                                line.direction === 'OUT'
                                  ? 'bg-amber-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              - OUT (Deduct)
                            </button>
                          </div>
                        </div>

                        {/* Quantity */}
                        <div className="md:col-span-3">
                          <Input
                            label="Quantity (pcs)"
                            type="number"
                            min="1"
                            step="1"
                            value={line.quantityStr}
                            onChange={(e) => handleQuantityChange(line.id, e.target.value)}
                            placeholder="e.g. 5"
                            required
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>

                      {/* Informational Stock Preview */}
                      {line.variantId && line.currentStock !== null && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2 text-slate-600">
                            <span>Current on hand:</span>
                            <span className="font-semibold text-slate-900">
                              {formatQuantity(line.currentStock, 'pcs')}
                            </span>
                            <span className="text-slate-400">→</span>
                            <span>Resulting:</span>
                            <span
                              className={`font-bold ${
                                isNegativeOut
                                  ? 'text-red-700'
                                  : resultingStock === 0
                                  ? 'text-amber-700'
                                  : 'text-slate-900'
                              }`}
                            >
                              {formatQuantity(resultingStock, 'pcs')}
                            </span>
                          </div>

                          {isNegativeOut && (
                            <span className="text-red-700 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Insufficient stock: Cannot reduce below 0
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleProceedToReview}
                disabled={isSubmitting || lines.some((l) => l.isLoadingBalance)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Review Adjustment
              </Button>
            </div>
          </div>
        ) : (
          /* STEP 2: BEFORE/AFTER REVIEW STEP */
          <div className="space-y-5">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-sm">
              <p className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                Please verify the adjustment details before applying
              </p>
              <p className="text-xs text-amber-800 mt-1">
                Stock changes immediately affect live on-hand inventory balances and create permanent, immutable stock movements.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs uppercase font-semibold text-slate-500 mb-1">Reason</p>
              <p className="text-sm font-medium text-slate-800">{reason}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-2">Lines Summary</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-xs">
                    <tr>
                      <th className="py-2.5 px-3">Variant / SKU</th>
                      <th className="py-2.5 px-3">Direction</th>
                      <th className="py-2.5 px-3 text-right">Adjustment</th>
                      <th className="py-2.5 px-3 text-right">Current</th>
                      <th className="py-2.5 px-3 text-right">Expected After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {lines.map((line) => {
                      const qty = parseInt(line.quantityStr, 10);
                      const current = line.currentStock ?? 0;
                      const after = line.direction === 'IN' ? current + qty : current - qty;

                      return (
                        <tr key={line.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-1 py-0.5 rounded">
                              {line.variant?.sku || `ID: ${line.variantId}`}
                            </span>
                            <div className="text-slate-600 mt-0.5">
                              {line.variant?.productName}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant={line.direction === 'IN' ? 'success' : 'warning'}>
                              {line.direction}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">
                            {line.direction === 'IN' ? `+${qty} pcs` : `-${qty} pcs`}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500">
                            {formatQuantity(current, 'pcs')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {formatQuantity(after, 'pcs')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReviewStep(false)}
                disabled={isSubmitting}
              >
                Back to Edit
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmit}
                isLoading={isSubmitting}
              >
                Confirm & Apply Adjustment
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
