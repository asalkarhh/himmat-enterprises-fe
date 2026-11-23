import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trash2,
  AlertTriangle,
  ArrowRight,
  Boxes,
  DollarSign,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { ErrorMessage } from '../ui/ErrorMessage';
import { VariantSelector } from '../inventory/VariantSelector';
import { invoiceRevisionApi } from '../../api/billing.api';
import { queryKeys } from '../../api/queryKeys';
import { useToast } from '../../hooks/useToast';
import { ProductVariantDto } from '../../types/catalog.types';
import {
  InvoiceResponseDto,
  InvoiceRevisionRequest,
  InvoiceRevisionLineRequest,
  InvoiceRevisionPreviewResponseDto,
} from '../../types/billing.types';
import { formatInr } from '../../utils/formatters';
import { generateIdempotencyKey, parseApiError } from '../../api/apiHelpers';

export interface InvoiceRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceResponseDto;
  onSuccess: () => void;
}

interface EditableRevisionLine {
  id: string; // Internal React key
  invoiceLineId?: string | number | null;
  variantId: string;
  sku: string;
  productName: string;
  sizeLabel: string;
  currentQuantity: number;
  returnedQuantity: number;
  newQuantity: string;
  unitNetPrice: string;
  unitPriceOverride: string;
  overrideReason: string;
  discountPct: string;
  expectedVariantVersion?: number | null;
  isExisting: boolean;
}

export const InvoiceRevisionModal: React.FC<InvoiceRevisionModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { success: toastSuccess } = useToast();

  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<EditableRevisionLine[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Initialize lines from invoice active lines
  useEffect(() => {
    if (invoice && invoice.lines) {
      const initial = invoice.lines
        .filter((l) => l.isActiveInCurrentRevision !== false)
        .map((l, idx) => ({
          id: `line-${l.id || idx}`,
          invoiceLineId: l.id,
          variantId: String(l.variantId),
          sku: l.sku,
          productName: l.productName,
          sizeLabel: l.sizeLabel,
          currentQuantity: l.quantity,
          returnedQuantity: l.returnedQuantity || 0,
          newQuantity: String(l.quantity),
          unitNetPrice: l.unitNetPrice,
          unitPriceOverride: l.isPriceOverridden ? l.unitNetPrice : '',
          overrideReason: l.overrideReason || '',
          discountPct: l.discountPct || '',
          isExisting: true,
        }));
      setLines(initial);
      setReason('');
      setFormError(null);
      setIsConfirming(false);
    }
  }, [invoice, isOpen]);

  // Construct request payload lines for preview and submission
  const revisionPayloadLines: InvoiceRevisionLineRequest[] = useMemo(() => {
    return lines
      .filter((l) => l.variantId && l.newQuantity !== '')
      .map((l) => ({
        invoiceLineId: l.invoiceLineId ? Number(l.invoiceLineId) : null,
        variantId: Number(l.variantId),
        quantity: parseInt(l.newQuantity, 10) || 0,
        unitPriceOverride: l.unitPriceOverride ? l.unitPriceOverride : null,
        discountPct: l.discountPct ? l.discountPct : null,
        overrideReason: l.unitPriceOverride ? l.overrideReason.trim() : null,
        expectedVariantVersion: l.expectedVariantVersion,
      }));
  }, [lines]);

  // Debounced lines for preview query
  const [debouncedPayload, setDebouncedPayload] = useState<InvoiceRevisionLineRequest[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPayload(revisionPayloadLines);
    }, 300);
    return () => clearTimeout(timer);
  }, [revisionPayloadLines]);

  // Authoritative Revision Preview Query
  const {
    data: previewData,
    isLoading: isPreviewLoading,
    error: previewQueryError,
  } = useQuery<InvoiceRevisionPreviewResponseDto>({
    queryKey: queryKeys.invoiceRevisions.preview(invoice.id, {
      expectedVersion: invoice.version,
      reason,
      lines: debouncedPayload,
    }),
    queryFn: ({ signal }) =>
      invoiceRevisionApi.previewRevision(
        invoice.id,
        {
          expectedVersion: Number(invoice.version),
          reason: reason.trim() || 'Preview inspection',
          lines: debouncedPayload,
        },
        signal
      ),
    enabled: isOpen && !!invoice.id && debouncedPayload.length > 0,
    staleTime: 5000,
  });

  const previewErrorParsed = previewQueryError ? parseApiError(previewQueryError).message : null;

  // Handlers for modifying lines
  const handleQuantityChange = (index: number, val: string) => {
    if (val === '' || /^[0-9]+$/.test(val)) {
      const next = [...lines];
      const target = next[index];

      // Validate returned quantity lower bound
      if (val !== '' && target.isExisting) {
        const qtyNum = parseInt(val, 10);
        if (qtyNum < target.returnedQuantity) {
          setFormError(
            `Line ${target.sku}: Cannot reduce quantity below ${target.returnedQuantity} already returned.`
          );
          return;
        }
      }

      setFormError(null);
      next[index] = { ...target, newQuantity: val };
      setLines(next);
    }
  };

  const handlePriceOverrideChange = (index: number, val: string) => {
    if (val === '' || /^\d*(\.\d{0,2})?$/.test(val)) {
      const next = [...lines];
      next[index] = { ...next[index], unitPriceOverride: val };
      setLines(next);
    }
  };

  const handleOverrideReasonChange = (index: number, val: string) => {
    const next = [...lines];
    next[index] = { ...next[index], overrideReason: val };
    setLines(next);
  };

  const handleDiscountChange = (index: number, val: string) => {
    if (val === '' || /^\d*(\.\d{0,4})?$/.test(val)) {
      const num = parseFloat(val);
      if (isNaN(num) || (num >= 0 && num <= 100)) {
        const next = [...lines];
        next[index] = { ...next[index], discountPct: val };
        setLines(next);
      }
    }
  };

  const handleAddNewLine = (variant: ProductVariantDto) => {
    // Check if variant already exists in lines
    if (lines.some((l) => String(l.variantId) === String(variant.id))) {
      setFormError(`Item ${variant.sku} is already on this bill. Modify its quantity instead.`);
      return;
    }

    setFormError(null);
    setLines([
      ...lines,
      {
        id: `new-${Date.now()}`,
        invoiceLineId: null,
        variantId: String(variant.id),
        sku: variant.sku,
        productName: variant.productName,
        sizeLabel: variant.sizeLabel,
        currentQuantity: 0,
        returnedQuantity: 0,
        newQuantity: '1',
        unitNetPrice: variant.purchaseCostExclTax || '0.00',
        unitPriceOverride: '',
        overrideReason: '',
        discountPct: '',
        expectedVariantVersion: variant.version,
        isExisting: false,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    const target = lines[index];
    if (target.isExisting) {
      if (target.returnedQuantity > 0) {
        setFormError(
          `Cannot remove line ${target.sku} because ${target.returnedQuantity} pcs have already been returned.`
        );
        return;
      }
      // For existing lines, setting newQuantity to '0' tells the backend to mark it REMOVED
      const next = [...lines];
      next[index] = { ...target, newQuantity: '0' };
      setLines(next);
    } else {
      // Newly added lines can be purged completely
      const next = [...lines];
      next.splice(index, 1);
      setLines(next);
    }
  };

  const handleRestoreLine = (index: number) => {
    const next = [...lines];
    next[index] = { ...next[index], newQuantity: String(next[index].currentQuantity || 1) };
    setLines(next);
  };

  // Revision submission mutation
  const revisionMutation = useMutation({
    mutationFn: (request: InvoiceRevisionRequest) => {
      const idemKey = generateIdempotencyKey();
      return invoiceRevisionApi.createRevision(invoice.id, request, idemKey);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customerFinance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dues.all });

      toastSuccess(
        `Invoice revision #${data.revisionNumber} applied successfully.`
      );
      onSuccess();
      onClose();
    },
    onError: (err) => {
      const parsed = parseApiError(err);
      if (parsed.status === 409) {
        setFormError(
          'Concurrency conflict: The invoice has been modified by another user. Please reload the invoice and recreate your revision.'
        );
      } else {
        setFormError(parsed.message || 'Failed to submit invoice revision.');
      }
      setIsConfirming(false);
    },
  });

  const handleValidateAndReview = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!reason.trim()) {
      setFormError('A valid revision reason is required (e.g. customer returned item, clerical price correction).');
      return;
    }

    // Check active lines
    const activeCount = lines.filter((l) => parseInt(l.newQuantity, 10) > 0).length;
    if (activeCount === 0) {
      setFormError('At least one line item with quantity >= 1 must remain on the invoice.');
      return;
    }

    // Check price overrides have reasons
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.unitPriceOverride && (!l.overrideReason || !l.overrideReason.trim())) {
        setFormError(`Line #${i + 1} (${l.sku}): An authorized override reason is required when manually changing the unit price.`);
        return;
      }
    }

    if (!previewData) {
      setFormError('Authoritative revision preview is pending or returned an error. Please resolve before proceeding.');
      return;
    }

    setIsConfirming(true);
  };

  const handleFinalSubmit = () => {
    revisionMutation.mutate({
      expectedVersion: Number(invoice.version),
      reason: reason.trim(),
      lines: revisionPayloadLines,
    });
  };

  const deltaPayableNum = previewData ? parseFloat(previewData.deltaPayableAmount) : 0;
  const releasedAllocNum = previewData ? parseFloat(previewData.releasedAllocationAmount) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!revisionMutation.isPending) {
          onClose();
        }
      }}
      title={`Revise Bill: ${invoice.invoiceNumber} (Revision #${(invoice.revisionCount || 0) + 1})`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Header Notice Banner */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <span className="font-semibold text-slate-700">Customer:</span>{' '}
            <span className="font-medium text-slate-900">{invoice.customerName}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-700">Invoice Date:</span>{' '}
            <span className="font-medium text-slate-900">{invoice.invoiceDate}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-700">Original Total:</span>{' '}
            <span className="font-mono font-bold text-slate-900">{formatInr(invoice.originalPayableAmount)}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-700">Current Payable:</span>{' '}
            <span className="font-mono font-bold text-teal-800">{formatInr(invoice.totalPayableAmount)}</span>
          </div>
        </div>

        {formError && <ErrorMessage error={formError} />}
        {previewErrorParsed && <ErrorMessage error={previewErrorParsed} title="Revision Preview Warning" />}

        {/* Revision Form */}
        <form onSubmit={handleValidateAndReview} className="space-y-5">
          {/* Reason Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Revision Reason <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Quantity adjusted to 5 pcs after physical return; applied retroactive builder discount"
              rows={2}
              required
            />
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Required for audit trail and sequential business event history.
            </span>
          </div>

          {/* Add Additional Variant Line */}
          <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-teal-900">
              <span className="font-bold">Add Additional Item:</span> Search and append a new variant to this invoice revision.
            </div>
            <div className="w-full sm:w-80">
              <VariantSelector
                value=""
                onChange={(_val, variant) => {
                  if (variant) handleAddNewLine(variant);
                }}
                excludeVariantIds={lines.map((l) => l.variantId)}
                placeholder="Search variant to add..."
              />
            </div>
          </div>

          {/* Revision Lines Table */}
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Line / Variant</th>
                  <th className="px-2 py-2.5 text-center w-28">Quantity</th>
                  <th className="px-2 py-2.5 text-right w-28">Net Price</th>
                  <th className="px-2 py-2.5 text-right w-36">Override Price</th>
                  <th className="px-2 py-2.5 text-right w-20">Disc %</th>
                  <th className="px-2 py-2.5 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line, idx) => {
                  const qtyNum = parseInt(line.newQuantity, 10) || 0;
                  const isRemoved = qtyNum === 0;

                  return (
                    <tr
                      key={line.id}
                      className={`transition-colors ${
                        isRemoved
                          ? 'bg-rose-50/40 text-slate-400 line-through'
                          : !line.isExisting
                          ? 'bg-teal-50/30'
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">{line.productName}</span>
                          <span className="text-slate-500 font-mono text-[11px]">({line.sizeLabel})</span>
                          {!line.isExisting && (
                            <Badge variant="success" className="text-[10px] px-1 py-0">New</Badge>
                          )}
                          {isRemoved && (
                            <Badge variant="danger" className="text-[10px] px-1 py-0">Removed</Badge>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          SKU: {line.sku}
                          {line.returnedQuantity > 0 && (
                            <span className="ml-2 text-amber-700 font-sans font-medium">
                              ({line.returnedQuantity} pcs previously returned)
                            </span>
                          )}
                        </div>
                        {line.unitPriceOverride && (
                          <div className="mt-1">
                            <Input
                              value={line.overrideReason}
                              onChange={(e) => handleOverrideReasonChange(idx, e.target.value)}
                              placeholder="Reason for price override..."
                              className="text-[11px] py-1 bg-white border-amber-300"
                              disabled={isRemoved}
                            />
                          </div>
                        )}
                      </td>

                      <td className="px-2 py-2.5 text-center">
                        {isRemoved ? (
                          <span className="text-rose-600 font-bold">0 pcs</span>
                        ) : (
                          <Input
                            type="text"
                            value={line.newQuantity}
                            onChange={(e) => handleQuantityChange(idx, e.target.value)}
                            className="text-center font-mono py-1 w-20 mx-auto"
                            placeholder="0"
                          />
                        )}
                        {line.isExisting && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Orig: {line.currentQuantity} pcs
                          </span>
                        )}
                      </td>

                      <td className="px-2 py-2.5 text-right font-mono text-slate-700">
                        {formatInr(line.unitNetPrice)}
                      </td>

                      <td className="px-2 py-2.5 text-right">
                        <Input
                          type="text"
                          value={line.unitPriceOverride}
                          onChange={(e) => handlePriceOverrideChange(idx, e.target.value)}
                          placeholder="Override ₹"
                          className="text-right font-mono py-1 text-xs"
                          disabled={isRemoved}
                        />
                      </td>

                      <td className="px-2 py-2.5 text-right">
                        <Input
                          type="text"
                          value={line.discountPct}
                          onChange={(e) => handleDiscountChange(idx, e.target.value)}
                          placeholder="%"
                          className="text-right font-mono py-1 text-xs"
                          disabled={isRemoved}
                        />
                      </td>

                      <td className="px-2 py-2.5 text-center">
                        {isRemoved ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestoreLine(idx)}
                            className="text-[11px] text-teal-600 hover:text-teal-800"
                          >
                            Restore
                          </Button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Remove or zero line"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Authoritative Live Preview Card */}
          {previewData && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-teal-600" />
                  Authoritative Revision Preview
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Diff calculated against revision #{invoice.revisionCount || 0}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Previous Total:</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {formatInr(previewData.previousTotalPayable)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Revised Total Payable:</span>
                  <span className="font-mono font-bold text-teal-700 text-sm">
                    {formatInr(previewData.newTotalPayable)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Delta Payable:</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      deltaPayableNum < 0
                        ? 'text-emerald-700'
                        : deltaPayableNum > 0
                        ? 'text-rose-700'
                        : 'text-slate-600'
                    }`}
                  >
                    {deltaPayableNum > 0 ? `+${formatInr(deltaPayableNum)}` : formatInr(deltaPayableNum)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">New Outstanding:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatInr(previewData.newOutstandingAmount)}
                  </span>
                </div>
              </div>

              {/* Excess Allocation Release Notice */}
              {releasedAllocNum > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <strong>Excess Payment Allocation Released:</strong> The revised bill total is less than previously allocated customer payments.
                    <span className="font-mono font-bold ml-1">{formatInr(releasedAllocNum)}</span> will be atomically returned to the customer's unallocated advance credit balance.
                  </div>
                </div>
              )}

              {/* Stock Movement Preview */}
              <div className="pt-2 border-t border-slate-200 text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <Boxes className="w-3.5 h-3.5 text-slate-500" />
                  Anticipated Inventory Adjustments:
                </span>
                <div className="flex flex-wrap gap-2">
                  {previewData.lines.filter((l) => l.deltaQuantity !== 0).map((l, idx) => (
                    <Badge
                      key={idx}
                      variant={l.deltaQuantity < 0 ? 'success' : 'warning'}
                      className="text-[11px]"
                    >
                      {l.sku}: {l.deltaQuantity > 0 ? `+${l.deltaQuantity} OUT (SALE)` : `${Math.abs(l.deltaQuantity)} IN (REVERSAL)`}
                    </Badge>
                  ))}
                  {previewData.lines.every((l) => l.deltaQuantity === 0) && (
                    <span className="text-slate-500 italic">No stock changes (price or discount correction only).</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={revisionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isPreviewLoading}
              disabled={revisionMutation.isPending || isPreviewLoading || !previewData}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Review & Apply Revision
            </Button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      {isConfirming && previewData && (
        <Modal
          isOpen={isConfirming}
          onClose={() => setIsConfirming(false)}
          title="Confirm Bill Revision"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Permanent Audit Trail Record
              </div>
              <p>
                Applying revision #{(invoice.revisionCount || 0) + 1} will permanently update the effective bill,
                post stock adjustments, and append a delta balance entry to the customer ledger.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-2 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-600">Revision Reason:</span>
                <span className="font-medium text-slate-900 max-w-xs text-right">{reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Previous Total:</span>
                <span className="font-mono text-slate-800">{formatInr(previewData.previousTotalPayable)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-900">New Total Payable:</span>
                <span className="font-mono text-teal-700">{formatInr(previewData.newTotalPayable)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-900">Delta Payable:</span>
                <span className={`font-mono ${deltaPayableNum < 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {deltaPayableNum > 0 ? `+${formatInr(deltaPayableNum)}` : formatInr(deltaPayableNum)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfirming(false)}
                disabled={revisionMutation.isPending}
              >
                Back to Editing
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={revisionMutation.isPending}
                onClick={handleFinalSubmit}
              >
                Apply Revision
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};

export default InvoiceRevisionModal;
